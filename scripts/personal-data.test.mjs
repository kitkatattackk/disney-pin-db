import test from 'node:test';import assert from 'node:assert/strict';
import {parsePersonalData} from '../lib/personal-data.ts';
const id='00000000-0000-5000-a000-000000000001';
const pin={id,name:'Mickey',notes:'Source: https://pinandpop.com/pins/1/mickey',release_year:null,price_tier:null,pin_images:[{storage_url:'https://example.com/pin.jpg',is_primary:true}]};
const entry={pin,status:'owned',addedAt:'2026-10-17'};
test('round trips owned pins and history',()=>{const b={version:1,saved:{[id]:entry},history:[{pin,date:'2026-10-17'}]};assert.deepEqual(parsePersonalData(JSON.parse(JSON.stringify(b))),{saved:b.saved,history:b.history});});
test('rejects broken records instead of crashing the catalog later',()=>{assert.throws(()=>parsePersonalData({version:1,saved:{[id]:{...entry,pin:{...pin,notes:null}}}}));});
test('rejects unsafe image URLs and mismatched pin IDs',()=>{assert.throws(()=>parsePersonalData({version:1,saved:{[id]:{...entry,pin:{...pin,pin_images:[{storage_url:'javascript:alert(1)',is_primary:true}]}}}}));assert.throws(()=>parsePersonalData({version:1,saved:{other:entry}}));});
test('bounds restored history',()=>{const b=parsePersonalData({version:1,saved:{},history:Array.from({length:120},()=>({pin,date:'2026-10-17'}))});assert.equal(b.history.length,100);});
