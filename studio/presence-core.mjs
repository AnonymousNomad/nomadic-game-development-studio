/**
 * NGDS "Inside World" Presence pilot v0.1.
 * Engine-neutral verification of read/steer/capture evidence. NO LLM and NO GPU capture inside this module.
 * All transport and independent provenance trust must be provided by qualified adapters/hosts.
 */
import {createHash} from 'node:crypto';
const HASH=/^[a-f0-9]{64}$/i;
const MAX_FRAME=12*1024*1024;
const BAD=code=>Object.assign(new Error(code),{code});
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const vec=x=>Array.isArray(x)&&x.length===3&&x.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=100000);
const hash=b=>createHash('sha256').update(b).digest('hex');
function isPNG(bytes){
 const png=Buffer.from('89504e470d0a1a0a','hex');
 return bytes?.length>=24&&bytes.subarray(0,8).equals(png);
}
function dimensions(bytes){return [bytes.readUInt32BE(16),bytes.readUInt32BE(20)];}
function exactVec(a,b){return a.every((x,i)=>x===b[i]);}

/** Provenance validation DOES NOT attest a native renderer: independent verifier is separate. */
export function inspectFrame({scene,capture,bytes,expected,independentVerification}={}){
 if(!obj(scene)||!Number.isSafeInteger(scene.revision)||scene.revision<0)throw BAD('INVALID_SCENE');
 if(!obj(scene.camera)||!vec(scene.camera.position)||!vec(scene.camera.target))throw BAD('INVALID_CAMERA_STATE');
 if(!obj(expected)||!Number.isSafeInteger(expected.revision)||!vec(expected.position)||!vec(expected.target))throw BAD('INVALID_EXPECTATION');
 if(scene.revision!==expected.revision)throw BAD('SCENE_REVISION_CHANGED');
 if(!exactVec(scene.camera.position,expected.position)||!exactVec(scene.camera.target,expected.target))throw BAD('CAMERA_MISMATCH');
 if(!Buffer.isBuffer(bytes)||bytes.length>MAX_FRAME||!isPNG(bytes))throw BAD('INVALID_PNG_BYTES');
 const [width,height]=dimensions(bytes);
 if(width<1||height<1||width>8192||height>8192)throw BAD('INVALID_FRAME_DIMENSIONS');
 if(!obj(capture)||capture.revision!==scene.revision||capture.width!==width||capture.height!==height||
    !HASH.test(capture.sha256||'')||capture.sha256.toLowerCase()!==hash(bytes))throw BAD('CAPTURE_NOT_BOUND');
 const h=hash(bytes);
 // A caller-supplied JSON "attestation" is forgeable. This P0 module deliberately NEVER
 // upgrades client screenshots to native-GPU evidence. A future trusted host must independently
 // verify a signature from a pinned capture worker before a higher assurance level can exist.
 if(independentVerification!==null)throw BAD('TRUSTED_CAPTURE_ATTESTATION_NOT_IMPLEMENTED');
 return {schema:'ngds.presence-observation/1',status:'UNVERIFIED_CLIENT_CAPTURE',
  sceneRevision:scene.revision,camera:structuredClone(scene.camera),imageSha256:h,width,height,
  rendererBackend:'UNVERIFIED',verifiedNative:false,
  limits:['Capture bytes match metadata but independent native-GPU verification is absent.']};
}

/** A bounded spectator goal. This MAY write scene state on fixture adapters; approval is mandatory. */
export function validateCameraGoal(goal){
 if(!obj(goal)||!vec(goal.position)||!vec(goal.target))return ['INVALID_CAMERA_GOAL'];
 const dx=goal.target[0]-goal.position[0],dy=goal.target[1]-goal.position[1],dz=goal.target[2]-goal.position[2];
 if(Math.hypot(dx,dy,dz)<0.01)return ['DEGENERATE_CAMERA_DIRECTION'];
 return [];
}

export function compareObservations(before,after){
 if(!obj(before)||!obj(after)||!HASH.test(before.imageSha256||'')||!HASH.test(after.imageSha256||''))throw BAD('INVALID_OBSERVATION_PAIR');
 if(before.width!==after.width||before.height!==after.height)throw BAD('FRAME_RESOLUTION_CHANGED');
 return {changed:before.imageSha256!==after.imageSha256,
  comparableNative:before.verifiedNative===true&&after.verifiedNative===true,
  notice:'Pixel hash inequality proves different bytes, NOT improved artistic quality.'};
}

export function createWorldPresence({transport,projectRevision,approvalCheck}={}){
 if(!obj(transport)||!['readScene','readCapture','moveCamera','undo'].every(k=>typeof transport[k]==='function'))
   throw BAD('INCOMPLETE_TRANSPORT');
 if(!HASH.test(projectRevision||''))throw BAD('INVALID_PROJECT_REVISION_HASH');
 if(typeof approvalCheck!=='function')throw BAD('APPROVAL_GATE_REQUIRED');
 let moves=0,started=false,closed=false;
 const ensure=()=>{if(closed)throw BAD('SESSION_CLOSED');};
 return {
  async observe({independentVerification=null,includePixels=false}={}){
   ensure();
   if(typeof includePixels!=='boolean')throw BAD('INVALID_CAPTURE_OPTION');
   const scene=await transport.readScene();
   const cap=await transport.readCapture();
   const expected={revision:scene.revision,position:scene.camera?.position,target:scene.camera?.target,projectRevision};
   const result=inspectFrame({scene,capture:cap.metadata,bytes:cap.bytes,expected,independentVerification});
   started=true;
   // Raw image bytes can be forwarded only to an explicitly authorized future vision-model adapter.
   // Never log or display private game renders to owners who requested a surprise.
   return includePixels?{...result,imagePng:Buffer.from(cap.bytes)}:result;
  },
  async inspect(){
   ensure(); const s=await transport.readScene();
   if(!Number.isSafeInteger(s?.revision)||!vec(s.camera?.position)||!vec(s.camera?.target))throw BAD('INVALID_SCENE');
   return {revision:s.revision,camera:structuredClone(s.camera),objects:Array.isArray(s.objects)?s.objects.map(x=>({id:x.id,kind:x.kind})):[]};
  },
  async steer(goal,grant){
   ensure();const errs=validateCameraGoal(goal);if(errs.length)throw BAD(errs[0]);
   const s=await transport.readScene();
   if(!Number.isSafeInteger(s?.revision))throw BAD('INVALID_SCENE');
   if(!approvalCheck({effect:'mutation',method:'spectator.camera',revision:s.revision,grant,goal,projectRevision}))throw BAD('SPECTATOR_AUTHORIZATION_REQUIRED');
   const r=await transport.moveCamera({position:goal.position,target:goal.target,expectedRevision:s.revision});
   if(!Number.isSafeInteger(r?.revision)||r.revision!==s.revision+1)throw BAD('CAMERA_REVISION_UNVERIFIED');
   moves++;
   return {revision:r.revision,previousCamera:s.camera,action:'SPECTATOR_MOVED',scope:'fixture_only'};
  },
  async undo(grant){
   ensure();if(!moves)throw BAD('NO_SESSION_MOVE');
   const s=await transport.readScene();
   if(!approvalCheck({effect:'mutation',method:'spectator.undo',revision:s.revision,grant,projectRevision}))throw BAD('SPECTATOR_UNDO_AUTH_REQUIRED');
   const r=await transport.undo({expectedRevision:s.revision});
   if(!Number.isSafeInteger(r?.revision)||r.revision!==s.revision+1)throw BAD('UNDO_REVISION_UNVERIFIED');
   moves--;
   return {revision:r.revision,action:'UNDO_CONFIRMED'};
  },
  close(){closed=true;return {closed:true,observed:started,movesRemaining:moves};}
 };
}
