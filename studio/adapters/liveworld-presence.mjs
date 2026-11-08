/**
 * Experimental adapter to the bundled LiveWorld Forge demo HTTP API.
 * NEVER aim this at a production game. Camera edits persist in isolated fixture scene.json.
 * The returned PNG is explicitly CLIENT_SUBMITTED and not independently rendered/attested.
 */
const BAD=code=>Object.assign(new Error(code),{code});
export function createLiveWorldPresenceTransport({baseUrl,token,timeoutMs=3000}={}){
 let base;
 try{base=new URL(baseUrl);}catch{throw BAD('INVALID_BASE_URL');}
 if(base.protocol!=='http:'||base.hostname!=='127.0.0.1'||!base.port||
   base.pathname!=='/'||base.search||base.hash||base.username||base.password)throw BAD('LOCAL_LOOPBACK_REQUIRED');
 if(typeof token!=='string'||token.length<20)throw BAD('TOKEN_REQUIRED');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>20000)throw BAD('INVALID_TIMEOUT');
 const get=async(path,binary=false)=>{
  const res=await fetch(new URL(path,base),{method:'GET',signal:AbortSignal.timeout(timeoutMs),redirect:'error',cache:'no-store'});
  if(!res.ok)throw BAD('READ_FAILED_'+res.status);
  return binary?Buffer.from(await res.arrayBuffer()):res.json();
 };
 const post=async(path,body)=>{
  const res=await fetch(new URL(path,base),{method:'POST',signal:AbortSignal.timeout(timeoutMs),redirect:'error',
   headers:{'x-liveworld-token':token,'content-type':'application/json','origin':base.origin},body:JSON.stringify(body)});
  if(!res.ok)throw BAD('COMMAND_REJECTED_'+res.status);
  return res.json();
 };
 return Object.freeze({
  async readScene(){return get('/api/scene');},
  async readCapture(){
   // Read metadata before and after bytes to reject obvious capture replacement races.
   const first=await get('/api/capture/latest');
   const bytes=await get('/api/capture/latest.png',true);
   const second=await get('/api/capture/latest');
   if(first.revision!==second.revision||first.sha256!==second.sha256)throw BAD('CAPTURE_CHANGED_DURING_READ');
   if(first.trust!=='CLIENT_SUBMITTED_NOT_INDEPENDENTLY_VERIFIED')throw BAD('UNSUPPORTED_CAPTURE_TRUST');
   return {metadata:second,bytes};
  },
  async moveCamera({position,target,expectedRevision}){return post('/api/command',{expectedRevision,command:{type:'camera',position,target}});},
  async undo({expectedRevision}){return post('/api/command',{expectedRevision,command:{type:'undo'}});}
 });
}
