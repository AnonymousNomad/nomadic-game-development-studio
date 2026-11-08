/**
 * MiniMax (and any vision-model) visual TRIAGE contract for NGDS.
 * Pure validation. Model-generated labels are never Authority, source patches, or visual acceptance.
 */
const HASH=/^[0-9a-f]{64}$/i;
const ID=/^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,127}$/;
const obj=x=>x!==null && typeof x==='object' && !Array.isArray(x);
const isString=(s,max=300)=>typeof s==='string'&&s.length>0&&s.length<=max&&!/[\u0000-\u001f]/.test(s);
export const VISION_SCHEMA='ngds.vision-triage/1';
export const DEFECT_CODES=Object.freeze(['MISSING_ASSET','INVISIBLE_GEOMETRY','REVERSED_NORMALS',
 'SCALE_OR_TRANSFORM','MATERIAL_PBR','SHADOW_OR_CONTACT','TERRAIN_LOD','ATMOSPHERE',
 'WATER_REFLECTION','FOILAGE_OR_TREE','TEMPORAL_ARTIFACT','OTHER_VISUAL']);
const failures=(...codes)=>({ok:false,reasonCodes:codes});

/** Never treat model self-assessed confidence or a matching hash as independently verified visual truth. */
export function validateVisionTriage({report,observation,sceneObjects=[]}={}){
 if(!obj(observation)||typeof observation.imageSha256!=='string'||!HASH.test(observation.imageSha256)||
    !Number.isSafeInteger(observation.sceneRevision)||observation.sceneRevision<0||
    !Number.isSafeInteger(observation.width)||!Number.isSafeInteger(observation.height)||
    observation.width<1||observation.height<1)return failures('INVALID_OBSERVATION');
 if(!Array.isArray(sceneObjects)||sceneObjects.length>20000||
    !sceneObjects.every(x=>obj(x)&&typeof x.id==='string'&&ID.test(x.id)))return failures('INVALID_SCENE_OBJECTS');
 if(!obj(report)||report.schema!==VISION_SCHEMA)return failures('INVALID_REPORT_SCHEMA');
 const errors=[];
 if(report.frameSha256!==observation.imageSha256)errors.push('FRAME_MISMATCH');
 if(report.sceneRevision!==observation.sceneRevision)errors.push('SCENE_REVISION_MISMATCH');
 if(report.width!==observation.width||report.height!==observation.height)errors.push('VIEWPORT_MISMATCH');
 if(!isString(report.modelName,100))errors.push('INVALID_MODEL_NAME');
 if(!Array.isArray(report.defects)||report.defects.length>12)errors.push('INVALID_DEFECTS');
 else {
  const ids=new Set(sceneObjects.map(x=>x.id));
  for(const [index,defect] of report.defects.entries()){
   if(!obj(defect)||!DEFECT_CODES.includes(defect.code)||!isString(defect.observation,300)||
       !isString(defect.hypothesis,300)||!Number.isFinite(defect.confidence)||
       defect.confidence<0||defect.confidence>1||!Array.isArray(defect.region)||
       defect.region.length!==4||!defect.region.every(x=>Number.isFinite(x)&&x>=0&&x<=1)||
       defect.region[0]>=defect.region[2]||defect.region[1]>=defect.region[3]||
       !(defect.objectId===null||(typeof defect.objectId==='string'&&ids.has(defect.objectId)))){
    errors.push('INVALID_DEFECT_'+index);
   }
  }
 }
 if(report.claimsVisualAcceptance===true)errors.push('MODEL_CANNOT_SELF_ACCEPT');
 if(report.requestsCodeExecution===true)errors.push('UNTRUSTED_EXECUTION_REQUEST');
 if(errors.length)return failures(...errors);
 return {ok:true,status:'TRIAGE_ONLY',frameSha256:observation.imageSha256,
  sceneRevision:observation.sceneRevision,defectCount:report.defects.length,
  requiresIndependentPixelReview:true,requiresNativeCaptureQualification:observation.verifiedNative!==true,
  note:'This validates the structure and evidence identity, NOT the truth of the model diagnosis. No changes were authorized.'};
}
export function makeVisionTask({observation,sceneObjects=[],referenceDescription=''}={}){
 if(!obj(observation)||!HASH.test(observation.imageSha256||'')||!Number.isSafeInteger(observation.sceneRevision))
  throw Error('INVALID_OBSERVATION');
 if(!Array.isArray(sceneObjects)||sceneObjects.length>200||
    !sceneObjects.every(x=>obj(x)&&typeof x.id==='string'&&ID.test(x.id)))throw Error('INVALID_SCENE_OBJECTS');
 if(typeof referenceDescription!=='string'||referenceDescription.length>600)throw Error('INVALID_REFERENCE_TEXT');
 const ids=sceneObjects.map(x=>x.id);
 return [
  'You are visually examining ONE attached, genuinely supplied game-frame image.',
  'Never claim you saw a different camera, viewpoint, clip, renderer, engine, or object than is shown.',
  'If the image is too ambiguous, return an empty defects array rather than inventing a defect.',
  'Return ONLY JSON conforming to schema '+VISION_SCHEMA+'. No code, shell, API keys, URLs, or modifications.',
  'Frame SHA-256: '+observation.imageSha256,
  'Scene revision: '+observation.sceneRevision,
  'Image dimensions: '+observation.width+'x'+observation.height,
  'Allowed object identities from engine: '+JSON.stringify(ids),
  'Allowed defect codes: '+DEFECT_CODES.join(', '),
  'Reference target (owner/approved): '+(referenceDescription||'NO_APPROVED_REFERENCE; classify only obvious rendering defects'),
  'Report: {schema,frameSha256,sceneRevision,width,height,modelName,defects:[{code,observation,hypothesis,confidence,region:[x0,y0,x1,y1],objectId:null_or_known_id}]}',
  'Region coordinates are normalized 0..1 and must have x0 < x1, y0 < y1.',
  'This triage is NOT itself approval to change source or proof of photographic quality.'
 ].join('\n');
}
