const fs=require('node:fs');
const path=require('node:path');
const M=require('./model.js');
const file=name=>path.join(__dirname,name);
const holdout=process.argv.includes('--2024');
const inputs=holdout?['nyc.csv','nyc2024.csv']:['nyc.csv'];
const rows=inputs.flatMap(input=>fs.readFileSync(file(input),'utf8').trim().split(/\r?\n/).slice(1)).map(line=>{
  const [date,site,poc,v]=line.split(',');
  return {date,site,v:Number(v)};
});
const index=new Map(rows.map(r=>[r.site+r.date,r.v]));
const cases=[],summary=[];
for(const lag of M.lags){
  const lastFor=r=>index.get(r.site+M.prior(r.date,lag));
  const calibration=rows.filter(r=>r.date<'2023-06-01' && Number.isFinite(lastFor(r)));
  const q=M.margin(calibration.map(r=>r.v-lastFor(r)));
  const test=rows.filter(r=>r.date>=(holdout?'2024-01-01':'2023-06-01')).map(r=>{
    const last=lastFor(r)??null;
    const peers=rows.filter(p=>p.date===r.date && p.site!==r.site);
    const peerMax=peers.length?Math.max(...peers.map(p=>p.v)):null;
    const status=M.decide(last,q);
    const guarded=M.guard(status,peerMax);
    return {...r,lag,last,q,status,peerMax,guarded};
  });
  cases.push(...test);
  const paired=test.filter(r=>r.last!==null);
  for(const method of ['persistence','marginOnly','peersOnly','FireBlind']){
    function state(r){
      if (method==='FireBlind') return r.guarded;
      if (method==='marginOnly') return r.status;
      const base=M.decide(r.last,0);
      return method==='peersOnly'?M.guard(base,r.peerMax):base;
    }
    const lows=paired.filter(r=>state(r)==='low');
    const high=paired.filter(r=>r.v>=M.threshold);
    summary.push({lag,method,calibration:calibration.length,q,test:test.length,paired:paired.length,missingHistory:test.length-paired.length,actualHigh:high.length,low:lows.length,falseLow:lows.filter(r=>r.v>=M.threshold).length,unknown:paired.filter(r=>state(r)==='unknown').length,falseHigh:paired.filter(r=>state(r)==='high'&&r.v<M.threshold).length,upperMiss:paired.filter(r=>r.v>r.last+q).length});
  }
}
fs.writeFileSync(file(holdout?'summary2024.json':'summary.json'),JSON.stringify(summary,null,2)+'\n');
if (!holdout) fs.writeFileSync(file('replay.js'),'const cases = '+JSON.stringify(cases)+';\n');
console.table(summary);
