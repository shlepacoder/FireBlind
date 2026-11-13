// node extract.mjs path/to/daily_88101_2023.csv
import fs from 'node:fs';
import readline from 'node:readline';
const rows = new Map();
const counties = new Set(['037']);
function fields(line) {
  return Array.from(line.matchAll(/(?:^|,)("(?:""|[^"])*"|[^,]*)/g), m => m[1].replace(/^"|"$/g,'').replace(/""/g,'"'));
}
for await (const line of readline.createInterface({input:fs.createReadStream(process.argv[2]),crlfDelay:Infinity})) {
  if (!line.startsWith('"06",')) continue;
  const [state,county,site,param,poc,lat,lon,datum,name,duration,standard,date,unit,event,count,pct,mean] = fields(line);
  if (!counties.has(county) || param!=='88101' || duration!=='1 HOUR' || !['None','Events Included'].includes(event) || +pct<75 || !mean || !Number.isFinite(+mean) || unit!=='Micrograms/cubic meter (LC)') continue;
  const id=[state,county,site].join('-'), key=id+date;
  const old=rows.get(key);
  if (!old || +poc<old.poc) rows.set(key,{id,date,poc:+poc,mean:+mean});
  else if (+poc===old.poc && +mean!==old.mean) throw Error('Conflicting daily means '+key);
}
const sorted=[...rows.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
if (!sorted.length) throw Error('Empty extract');
fs.writeFileSync(new URL(process.argv[3] || 'la.csv',import.meta.url),'date,site,poc,pm25\n'+sorted.map(r=>[r.date,r.id,r.poc,r.mean].join(',')).join('\n')+'\n');
console.log(sorted.length,'site-days',new Set(sorted.map(r=>r.id)).size,'sites');

