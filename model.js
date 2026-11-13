// Pure functions shared by the offline demo and experiment (Node or browser).
const FireBlind = (() => {
  const threshold = 35; // experimental daily threshold, µg/m³
  const lags = [1,3,7];
  function prior(date,lag) {
    return new Date(Date.parse(date+'T00:00:00Z')-lag*86400000).toISOString().slice(0,10);
  }
  function margin(errors) {
    const rank=Math.ceil((errors.length+1)*0.90);
    if (errors.length<20 || rank>errors.length) return null;
    return Math.max(0,[...errors].sort((a,b)=>a-b)[rank-1]);
  }
  function decide(last,q) {
    if (!Number.isFinite(last)) return 'unknown';
    if (last>=threshold) return 'high';
    return Number.isFinite(q) && last+q<threshold ? 'low' : 'unknown';
  }
  function guard(status,peerMax) {
    if (status==='low' && (!Number.isFinite(peerMax) || peerMax>=threshold)) return 'unknown';
    return status;
  }
  return {threshold,lags,prior,margin,decide,guard};
})();
if (typeof module!=='undefined') module.exports=FireBlind;
