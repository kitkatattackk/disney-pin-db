import { createHash } from 'node:crypto';
export const MAX_REQUESTS = 1000;
export const COST_PER_REQUEST = 0.005;
export function reserveRequests(state, count) {
  if (!Number.isInteger(state.requestsUsed) || state.requestsUsed < 0) throw new Error('Invalid budget checkpoint.');
  if (!Number.isInteger(count) || count < 1 || state.requestsUsed + count > MAX_REQUESTS) throw new Error('The $5 Brave request budget is exhausted.');
  state.requestsUsed += count;
}
export function stableId(value) {
  const hex = createHash('sha256').update(`pinandpop:${value}`).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}
export function plain(value = '') {
  return value.replace(/<[^>]*>/g, '').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1),16) : Number(n))).replace(/&(amp|quot|apos|lt|gt|nbsp);/g, (_, n) => ({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '})[n]).trim();
}
export function sourcePin(value) {
  try {
    const url = new URL(value);
    if (!['pinandpop.com','www.pinandpop.com'].includes(url.hostname) || !['https:','http:'].includes(url.protocol)) return null;
    const match = url.pathname.match(/^\/pins\/(\d+)(?:\/([^/]+))?\/?$/);
    if (!match) return null;
    return {sourceId: match[1], url:`https://pinandpop.com/pins/${match[1]}${match[2] ? '/'+match[2] : ''}`};
  } catch { return null; }
}
export function originalImage(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.digitaloceanspaces.com') || !/^\/disney-pins\//.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}
export function resultToPin(result, kind) {
  const source = sourcePin(result.url);
  if (!source) return null;
  const name = plain(result.title).replace(/\s*\|\s*(?:PIN\s*\d+|Pin\s*&\s*Pop).*$/i,'').replace(/^['"]|['"]$/g,'').trim();
  if (!name) return null;
  const description = kind === 'web' ? [...new Set([result.description,...(result.extra_snippets||[])].filter(Boolean).map(plain))].join('\n') : '';
  const year = description.match(/^(19\d{2}|20\d{2})\b/);
  const edition = description.match(/\b(Open Edition|Limited Edition|Limited Release)\b/i);
  const id = stableId(source.sourceId);
  return {
    sourceId:source.sourceId, sourceUrl:source.url, quality:kind === 'web' ? 2 : 1,
    row:{id,name,release_year:year ? Number(year[1]) : null,price_tier:edition?.[1] || null,notes:`Source: ${source.url}\nPin & Pop ID: ${source.sourceId}${description ? '\n'+description : ''}`},
    image:originalImage(kind === 'web' ? result.thumbnail?.original : result.properties?.url),
  };
}
export const TOPICS = [
'Disney','Mickey Mouse','Minnie Mouse','Stitch','Haunted Mansion','Winnie the Pooh','Donald Duck','Goofy','Pluto','Daisy Duck','Chip Dale','Tinker Bell','Figment','Dumbo','Bambi','Thumper','Cinderella','Belle','Ariel','Aurora','Snow White','Rapunzel','Merida','Tiana','Jasmine','Mulan','Pocahontas','Moana','Elsa','Anna','Olaf','Sven','Frozen','Beauty and the Beast','The Little Mermaid','Aladdin','Sleeping Beauty','Tangled','Peter Pan','Captain Hook','Alice Wonderland','Cheshire Cat','Mad Hatter','Queen Hearts','White Rabbit','Maleficent','Ursula','Cruella','Jafar','Hades','Evil Queen','Villains','Jack Skellington','Sally','Oogie Boogie','Zero','Nightmare Christmas','Jack Sparrow','Pirates Caribbean','Toy Story','Woody','Buzz Lightyear','Jessie','Alien','Rex','Lotso','Pixar','Up','Russell','Dug','Kevin','Carl Ellie','Inside Out','Joy Sadness','Monsters Inc','Mike Sulley','Finding Nemo','Dory','Incredibles','Cars','Lightning McQueen','Ratatouille','Remy','WALL-E','EVE','Coco','Miguel','Luca','Turning Red','Soul','Elemental','Brave','Loungefly','BoxLunch','Hot Topic','WDI','Imagineering','D23','DSSH','DSF','Disney Employee Center','DEC','Cast Member','Hidden Mickey','Hidden Disney','Disneyland','Walt Disney World','Epcot','Magic Kingdom','Hollywood Studios','Animal Kingdom','Disneyland Paris','Hong Kong Disneyland','Shanghai Disney','Tokyo Disney','Disney Cruise','Aulani','Star Wars','Darth Vader','Yoda','Grogu','Mandalorian','Boba Fett','R2-D2','C-3PO','Chewbacca','Leia','Luke Skywalker','Ahsoka','Marvel','Spider Man','Iron Man','Captain America','Thor','Loki','Avengers','Guardians Galaxy','Groot','Rocket','Black Panther','Deadpool','X-Men','Lion King','Simba','Nala','Scar','Timon Pumbaa','Lilo','Angel','Scrump','Aristocats','Marie','Duchess','Oliver Company','Fox Hound','Jungle Book','Baloo','Robin Hood','Maid Marian','Zootopia','Nick Wilde','Judy Hopps','Encanto','Mirabel','Bruno','Isabela','Hercules','Megara','Tarzan','Atlantis','Treasure Planet','Emperor New Groove','Kuzco','Yzma','Kronk','Hunchback Notre Dame','Esmeralda','Quasimodo','Rescuers','Bernard Bianca','Great Mouse Detective','Basil','Muppets','Kermit','Miss Piggy','Gonzo','Wreck It Ralph','Vanellope','Big Hero 6','Baymax','Oswald','Steamboat Willie','Sorcerer Mickey','Fantasia','Sorcerers Hat','Orange Bird','Country Bears','Tiki Room','Jungle Cruise','Space Mountain','Splash Mountain','Thunder Mountain','Small World','Disney Railroad','Main Street','Dole Whip','Popcorn','Food','Snack','Christmas','Halloween','Easter','Valentines','New Year','Anniversary','Birthday','Limited Edition','Limited Release','Open Edition','Mystery','Booster','Jumbo','Chaser','AP','Artist Proof','Fantasy','Princess','Prince','Castle','Attraction','Resort','Hotel','runDisney','Passholder','Annual Pass','Vacation Club','DVC','Adventures Disney','Trading Night','Pin Trading Event','PTN','Cast Lanyard','Cast Exclusive','Charming Characters','aDorbs','Cursive Cuties','Cuties','Wish','Asha','Disney100','Disney50','Disneyland70','Disneyland60','Disneyland50','Club 33','Duffy','ShellieMay','Gelatoni','StellaLou','LinaBell','Olu Mel','CookieAnn','Tsum Tsum','Vinylmation','Nemo Submarine','Jessica Rabbit','Roger Rabbit','Tron','Mary Poppins','Bert','Giselle','Enchanted','Descendants','High School Musical','Hannah Montana','Disney Channel','Phineas Ferb','Gravity Falls','DuckTales','Scrooge McDuck','Huey Dewey Louie','Darkwing Duck','Gargoyles','Kim Possible','Proud Family','Bluey','Disney Afternoon',
...Array.from({length:47},(_,i)=>String(1980+i)),
];
export function queryJobs() {
 const jobs=[];
 for(const topic of TOPICS) jobs.push({kind:'images',query:`site:pinandpop.com/pins/ ${topic}`,offset:0});
 for(const topic of TOPICS) jobs.push({kind:'web',query:`site:pinandpop.com/pins/ ${topic}`,offset:0});
 for(const qualifier of ['limited edition','mystery','Disneyland','Walt Disney World']) for(const topic of TOPICS.slice(0,200)) jobs.push({kind:'images',query:`site:pinandpop.com/pins/ ${topic} ${qualifier}`,offset:0});
 return jobs;
}
