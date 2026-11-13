const fs=require('node:fs');
const path=require('node:path');
const M=require('./model.js');
const rows=fs.readFileSync(path.join(__dirname,'la.csv'),'utf8').trim().split(/\r?\n/).slice(1).map(line=>{
  const [date,site,poc,mean]=line.split(',');
  return {date,site,value:Number(mean)};
});
const index=new Map(rows.map(r=>[r.site+r.date,r.value]));
const methods=['baseline','margin','peers','FireBlind'];
const counts=Object.fromEntries(methods.map(m=>[m,{falseLow:0,unknown:0,falseHigh:0,trueHigh:0}]));
let paired=0,high=0;
const dates=new Set(), examples=[];
for(const r of rows){
  const last=index.get(r.site+M.prior(r.date,3));
  if(last===undefined)continue;
  paired++;
  const others=rows.filter(p=>p.site!==r.site&&p.date===r.date);
  const peer=others.length?Math.max(...others.map(p=>p.value)):null;
  const baseline=M.decide(last,0),margin=M.decide(last,6.5875);
  const decisions={baseline,margin,peers:M.guard(baseline,peer),FireBlind:M.guard(margin,peer)};
  const elevated=r.value>=M.threshold;
  if(elevated){high++;dates.add(r.date);examples.push({...r,last,peer,...decisions});}
  for(const m of methods){
    const d=decisions[m],c=counts[m];
    if(d==='unknown')c.unknown++;
    if(d==='low'&&elevated)c.falseLow++;
    if(d==='high')c[elevated?'trueHigh':'falseHigh']++;
  }
}
const report={total:rows.length,paired,missing:rows.length-paired,high,dates:dates.size,counts,examples};
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(report,null,2));
console.log({...report,examples:examples.slice(0,2)});
