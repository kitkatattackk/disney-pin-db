import fs from 'node:fs';
import path from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {MAX_REQUESTS,COST_PER_REQUEST,reserveRequests,stableId,resultToPin,queryJobs} from './pinandpop-core.mjs';

for (const name of ['BRAVE_API_KEY','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY']) { if (!process.env[name]) throw new Error(`${name} is missing.`); }
const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'.imports'); fs.mkdirSync(dir,{recursive:true});
const statePath=path.join(dir,'pinandpop-state.json');
const lockPath=path.join(dir,'pinandpop.lock');
let lock;
try {lock=fs.openSync(lockPath,'wx');fs.writeFileSync(lock,String(process.pid));}
catch {throw new Error('Another importer may be running. Inspect .imports/pinandpop.lock before resuming.');}
const save=()=>{fs.writeFileSync(statePath+'.tmp',JSON.stringify(state));fs.renameSync(statePath+'.tmp',statePath);};
let state=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath)): {version:1,budgetUsd:5,costPerRequestUsd:COST_PER_REQUEST,maxRequests:MAX_REQUESTS,requestsUsed:0,createdAt:new Date().toISOString(),queries:[],pins:{},images:{},failures:[]};
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const apiKey=process.env.BRAVE_API_KEY;
if(!apiKey)throw new Error('BRAVE_API_KEY is missing.');
const jobs=queryJobs();
let pendingPins=new Map(),pendingImages=new Map();
let stopping=Boolean(state.haltStatus);
process.on('SIGTERM',()=>{stopping=true;});process.on('SIGINT',()=>{stopping=true;});
const jobKey=j=>`${j.kind||'web'}:${j.query}:${j.offset||0}`;
const seenJobs=new Set(state.queries.map(jobKey));
function ingest(data,kind){
 let newPins=0;
 const results=kind==='images' ? data.results||[] : data.web?.results||[];
 for(const result of results){
  const pin=resultToPin(result,kind);if(!pin)continue;
  const previous=state.pins[pin.sourceId];
  if(!previous || pin.quality>previous.quality){state.pins[pin.sourceId]={...pin,hasImage:previous?.hasImage || false};pendingPins.set(pin.row.id,pin.row);if(!previous)newPins++;}
  if(pin.image){
   const imageId=stableId(`${pin.sourceId}:${pin.image}`);
   if(!state.images[imageId]){
    const hasImage=!!state.pins[pin.sourceId].hasImage;
    const row={id:imageId,pin_id:pin.row.id,storage_url:pin.image,is_primary:!hasImage};
    state.pins[pin.sourceId].hasImage=true;state.images[imageId]=row;pendingImages.set(imageId,row);
   }
  }
 }
 return {results:results.length,newPins};
}
async function upsert(table,rows){
 for(let i=0;i<rows.length;i+=200){
  let lastError;
  for(let attempt=0;attempt<3;attempt++){
   const {error}=await db.from(table).upsert(rows.slice(i,i+200),{onConflict:'id'});
   if(!error){lastError=null;break;}lastError=error;await new Promise(r=>setTimeout(r,1000*(attempt+1)));
  }
  if(lastError)throw new Error(`${table}: ${lastError.message}`);
 }
}
function report(status){
 const data={source:'Pin & Pop',status,updatedAt:new Date().toISOString(),requestsUsed:state.requestsUsed,maxRequests:MAX_REQUESTS,estimatedCostUsd:Number((state.requestsUsed*COST_PER_REQUEST).toFixed(3)),budgetUsd:5,pins:Object.keys(state.pins).length,images:Object.keys(state.images).length,pinsWithImages:Object.values(state.pins).filter(p=>p.hasImage).length,failedRequests:state.failures.length,stopReason:state.haltStatus ? `Brave returned HTTP ${state.haltStatus}; no further requests will be sent.` : null,imageStorage:'Original image URLs; files remain on the source CDN.'};
 fs.writeFileSync(path.join(root,'lib/pinandpop-import.json'),JSON.stringify(data,null,2)+'\n');
 console.log(JSON.stringify(data));
}
async function flush(){
 await upsert('pins',[...pendingPins.values()]);await upsert('pin_images',[...pendingImages.values()]);pendingPins.clear();pendingImages.clear();save();report('running');
}
async function search(job){
 const record={...job,file:`response-${String(state.queries.length+1).padStart(4,'0')}.json`,status:'reserved'};
 reserveRequests(state,1);state.queries.push(record);seenJobs.add(jobKey(job));save();
 try{
  const url=new URL(`https://api.search.brave.com/res/v1/${job.kind==='images'?'images':'web'}/search`);
  url.search=new URLSearchParams({q:job.query,count:job.kind==='images'?'200':'20',...(job.kind==='web'?{offset:String(job.offset),extra_snippets:'true'}:{})});
  const res=await fetch(url,{headers:{'X-Subscription-Token':apiKey,Accept:'application/json'},signal:AbortSignal.timeout(30000)});
  record.status=res.status;
  if(!res.ok){state.failures.push({query:job.query,status:res.status});if([401,402,403,429].includes(res.status)){stopping=true;state.haltStatus=res.status;}return;}
  const data=await res.json();fs.writeFileSync(path.join(dir,record.file),JSON.stringify(data));Object.assign(record,ingest(data,job.kind));
 }catch(error){record.status='error';state.failures.push({query:job.query,error:error.message});}
}
try{
 // Replay every cached response so an interrupted database flush never loses records.
 for(const record of state.queries){if(fs.existsSync(path.join(dir,record.file)))ingest(JSON.parse(fs.readFileSync(path.join(dir,record.file))),record.kind||'web');}
 // Reconcile deterministic IDs with Supabase on every resume, regardless of checkpoint timing.
 pendingPins=new Map(Object.values(state.pins).map(p=>[p.row.id,p.row]));pendingImages=new Map(Object.values(state.images).map(r=>[r.id,r]));
 await flush();
 const batchLimit=Number(process.env.IMPORT_BATCH_LIMIT||Infinity);let batches=0;
 while(!stopping && state.requestsUsed<MAX_REQUESTS && batches<batchLimit){
  const batch=jobs.filter(j=>!seenJobs.has(jobKey(j))).slice(0,Math.min(5,MAX_REQUESTS-state.requestsUsed));
  if(!batch.length)break;
  const results=await Promise.allSettled(batch.map(async (job,index)=>{await new Promise(r=>setTimeout(r,index*120));if(!stopping)await search(job);}));
  const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
  await flush();batches++;
  await new Promise(r=>setTimeout(r,250));
 }
 state.finishedAt=new Date().toISOString();save();report(state.haltStatus===402?'credit_exhausted':stopping?'paused':state.requestsUsed===MAX_REQUESTS?'complete':'paused');
}catch(error){save();report('failed');console.error(error);process.exitCode=1;}
finally{fs.closeSync(lock);fs.unlinkSync(lockPath);}
