/**
 * Nomadic Game Studio universal adapter contract v1.
 * PURE planning/validation — NO editor execution, model inference, filesystem mutation or grants.
 */
import crypto from 'node:crypto';
import path from 'node:path';
export const PROJECT_SCHEMA='ngds.project-context/1';
export const ADAPTER_SCHEMA='ngds.engine-adapter/1';
export const OP_SCHEMA='ngds.operation/1';
export const RECEIPT_SCHEMA='ngds.operation-receipt/1';
export const EFFECTS=Object.freeze({'scene.inspect':'read','scene.preview':'preview','scene.commit':'mutation','scene.rollback':'mutation','asset.inspect':'read','asset.import':'mutation','render.capture':'read','project.playtest':'execution','project.build':'execution'});
const ID=/^[a-z][a-z0-9_.-]{1,63}$/;
const SHA=/^[0-9a-f]{64}$/i,REV=/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;
const REF=/^[A-Za-z0-9][A-Za-z0-9._:/-]{2,239}$/;
const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const blocked=(...reasonCodes)=>({decision:'BLOCKED',reasonCodes});
export function validateProject(p){
 if(!obj(p)||p.schema!==PROJECT_SCHEMA)return ['INVALID_PROJECT_SCHEMA'];
 const e=[];
 if(typeof p.projectId!=='string'||!ID.test(p.projectId))e.push('INVALID_PROJECT_ID');
 if(typeof p.engine!=='string'||!ID.test(p.engine))e.push('INVALID_ENGINE_ID');
 if(typeof p.revision!=='string'||!REV.test(p.revision))e.push('INVALID_REVISION');
 if(typeof p.root!=='string'||p.root.includes('..')||p.root.includes('\0')||(!path.win32.isAbsolute(p.root)&&!path.posix.isAbsolute(p.root)))e.push('INVALID_PROJECT_ROOT');
 return e;
}
export function validateAdapter(a){
 if(!obj(a)||a.schema!==ADAPTER_SCHEMA)return ['INVALID_ADAPTER_SCHEMA'];
 const e=[];
 if(typeof a.id!=='string'||!ID.test(a.id))e.push('INVALID_ADAPTER_ID');
 if(typeof a.engine!=='string'||!ID.test(a.engine))e.push('INVALID_ADAPTER_ENGINE');
 if(!['RESEARCH_ONLY','IMPLEMENTED_UNVERIFIED','QUALIFIED'].includes(a.status))e.push('INVALID_STATUS');
 if(typeof a.sourceSha256!=='string'||!SHA.test(a.sourceSha256))e.push('INVALID_SOURCE_SHA');
 if(!Array.isArray(a.evidenceRefs)||!a.evidenceRefs.every(x=>typeof x==='string'&&REF.test(x)))e.push('INVALID_EVIDENCE_REFS');
 if(!Array.isArray(a.capabilities)||new Set(a.capabilities.map(c=>c?.name)).size!==a.capabilities.length)e.push('INVALID_CAPABILITIES');
 else for(const c of a.capabilities)if(!obj(c)||!Object.hasOwn(EFFECTS,c.name)||c.effect!==EFFECTS[c.name]||typeof c.verified!=='boolean')e.push('INVALID_CAPABILITY_ENTRY');
 if(a.status==='QUALIFIED'&&(!a.evidenceRefs?.length||!a.capabilities?.some(x=>x.verified)))e.push('UNSUBSTANTIATED_QUALIFICATION');
 return [...new Set(e)];
}
export function intentSha256(p,a,o){
 return crypto.createHash('sha256').update(JSON.stringify({project:p.projectId,revision:p.revision,engine:p.engine,adapter:a.id,adapterSha:a.sourceSha256,operation:o.method})).digest('hex');
}
/** External attestation must be supplied by a trusted supervisor; model-supplied JSON is untrusted. */
export function assessOperation({project,adapter,operation,externalAttestation,authorization,now=Date.now()}={}){
 const pe=validateProject(project);if(pe.length)return blocked(...pe);
 const ae=validateAdapter(adapter);if(ae.length)return blocked(...ae);
 if(!obj(operation)||operation.schema!==OP_SCHEMA||!Object.hasOwn(EFFECTS,operation.method))return blocked('INVALID_OPERATION');
 if(adapter.engine!==project.engine)return blocked('ENGINE_MISMATCH');
 if(!adapter.capabilities.some(c=>c.name===operation.method&&c.verified))return blocked('CAPABILITY_NOT_QUALIFIED');
 if(adapter.status!=='QUALIFIED')return blocked('ADAPTER_NOT_QUALIFIED');
 const digest=intentSha256(project,adapter,operation);
 if(!obj(externalAttestation)||externalAttestation.approved!==true||externalAttestation.intentSha256!==digest||externalAttestation.adapterSourceSha256!==adapter.sourceSha256||!SHA.test(externalAttestation.trustedVerifierSha256||''))return blocked('EXTERNAL_ATTESTATION_REQUIRED');
 if(EFFECTS[operation.method]!=='read'){
   if(!obj(authorization)||authorization.approved!==true||authorization.intentSha256!==digest||!Number.isSafeInteger(authorization.expiresUnixMs)||authorization.expiresUnixMs<=now)return blocked('EXPLICIT_OPERATION_AUTHORIZATION_REQUIRED');
 }
 return {decision:'ADMISSIBLE_FOR_EXTERNAL_AUTHORITY',effect:EFFECTS[operation.method],intentSha256:digest,reasonCodes:[],notice:'No execution or grant occurred. External Authority and Resource Admission remain mandatory.'};
}
export function validateOutcomeReceipt(r,expectedIntent){
 if(!obj(r)||r.schema!==RECEIPT_SCHEMA)return ['INVALID_RECEIPT_SCHEMA'];
 const e=[];
 if(!SHA.test(expectedIntent||'')||r.intentSha256!==expectedIntent)e.push('INTENT_NOT_BOUND');
 if(!['NATIVE_RUNTIME','INDEPENDENT_INTEGRATION'].includes(r.evidenceType))e.push('NON_NATIVE_OR_SYNTHETIC_EVIDENCE');
 if(r.verified!==true)e.push('UNVERIFIED_RESULT');
 for(const k of ['sourceBeforeSha256','sourceAfterSha256','evidenceSha256'])if(!SHA.test(r[k]||''))e.push('INVALID_'+k);
 if(r.perceptualAcceptance===true&&(!Array.isArray(r.referenceHashes)||!r.referenceHashes.length||!r.referenceHashes.every(h=>typeof h==='string'&&SHA.test(h))))e.push('REFERENCE_NOT_BOUND');
 return e;
}
