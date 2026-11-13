const assert=require('node:assert/strict');
const M=require('./model.js');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
assert.equal(M.prior('2024-03-01',1),'2024-02-29');
assert.equal(M.margin([]),null);
assert.equal(M.margin(Array.from({length:20},(_,i)=>i+1)),19);
assert.equal(M.decide(null,3),'unknown');
assert.equal(M.decide(30,5),'unknown');
assert.equal(M.decide(35,5),'high');
assert.equal(M.guard('low',null),'unknown');
assert.equal(M.guard('low',35),'unknown');
assert.equal(M.guard('low',0),'low');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const data=vm.runInNewContext(read('replay.js')+';cases');
const csv=read('nyc.csv').trim().split(/\r?\n/).slice(1).map(x=>x.split(','));
const idx=new Map(csv.map(([d,s,p,v])=>[s+d,+v]));
assert.equal(idx.size,csv.length);
for(const r of data){
 assert.equal(r.v,idx.get(r.site+r.date));
 assert.equal(r.last,idx.get(r.site+M.prior(r.date,r.lag))??null);
 const peers=csv.filter(([d,s])=>d===r.date&&s!==r.site).map(x=>+x[3]);
 assert.equal(r.peerMax,peers.length?Math.max(...peers):null);
 assert.equal(r.guarded,M.guard(M.decide(r.last,r.q),r.peerMax));
}
console.log('Passed boundary, missing-data, date, uniqueness and replay checks for',data.length,'cases');
