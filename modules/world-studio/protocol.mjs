/**
 * Nomadic AI World Studio — narrow typed agent command contract.
 * Never evaluate arbitrary source, JS, shaders, paths, network URLs or shell.
 * This file is shared only with the trusted local loopback server and tests.
 */
export const SCENE_ID = 'nomadic-world-studio-fixture-v1';
export const MAX_JOURNAL = 24;
export const COMMANDS = Object.freeze([
  'set_position', 'set_color', 'set_light_intensity', 'undo', 'capture_frame'
]);
const POS_TARGETS = new Set(['cabin', 'spruce-1', 'spruce-2', 'stone']);
const COLOR_TARGETS = new Set(['cabin', 'spruce-1', 'spruce-2', 'stone', 'ground']);
const LIGHT_TARGETS = new Set(['sun']);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const isHex = value => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
const isRecord = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const fail = reason => ({ ok:false, reason });

/** Reject unknown fields instead of ignoring unintended authority. */
function exactKeys(obj, allowed) {
  return Object.keys(obj).every(k => allowed.includes(k));
}
export function validateCommand(raw) {
  if (!isRecord(raw)) return fail('INVALID_COMMAND');
  if (!exactKeys(raw, ['action','target','value','expected_revision','scene_id']))
    return fail('UNKNOWN_COMMAND_FIELD');
  if (raw.scene_id !== SCENE_ID) return fail('SCENE_ID_MISMATCH');
  if (!Number.isSafeInteger(raw.expected_revision) || raw.expected_revision < 0)
    return fail('REVISION_INVALID');
  if (!COMMANDS.includes(raw.action)) return fail('ACTION_NOT_ALLOWED');
  if (raw.action === 'undo' || raw.action === 'capture_frame') {
    if (raw.target !== undefined || raw.value !== undefined) return fail('ACTION_HAS_ARGUMENTS');
    return {ok:true, command:{action:raw.action,scene_id:SCENE_ID,expected_revision:raw.expected_revision}};
  }
  if (typeof raw.target !== 'string') return fail('TARGET_INVALID');
  switch (raw.action) {
    case 'set_position':
      if (!POS_TARGETS.has(raw.target)) return fail('TARGET_NOT_ALLOWED');
      if (!Array.isArray(raw.value) || raw.value.length !== 3
        || !raw.value.every(x => finite(x) && Math.abs(x) <= 50))
        return fail('POSITION_OUT_OF_BOUNDS');
      break;
    case 'set_color':
      if (!COLOR_TARGETS.has(raw.target)) return fail('TARGET_NOT_ALLOWED');
      if (!isHex(raw.value)) return fail('COLOR_INVALID');
      break;
    case 'set_light_intensity':
      if (!LIGHT_TARGETS.has(raw.target)) return fail('TARGET_NOT_ALLOWED');
      if (!finite(raw.value) || raw.value < 0 || raw.value > 5)
        return fail('LIGHT_OUT_OF_BOUNDS');
      break;
    default: return fail('ACTION_NOT_ALLOWED');
  }
  return {ok:true, command:{
    action:raw.action,target:raw.target,value:raw.value,
    expected_revision:raw.expected_revision,scene_id:SCENE_ID
  }};
}
export function validateSnapshot(raw) {
  if (!isRecord(raw) || raw.scene_id !== SCENE_ID) return fail('SCENE_ID_MISMATCH');
  if (!Number.isSafeInteger(raw.revision) || raw.revision < 0 || raw.revision > 100_000)
    return fail('SNAPSHOT_REVISION_INVALID');
  if (!Array.isArray(raw.objects) || raw.objects.length > 32) return fail('OBJECTS_INVALID');
  if (typeof raw.renderer !== 'string' || raw.renderer.length > 200) return fail('RENDERER_INVALID');
  if (!raw.objects.every(o => isRecord(o) && typeof o.id==='string'
    && o.id.length <= 32 && Array.isArray(o.position) && o.position.length === 3
    && o.position.every(finite) && typeof o.color === 'string' && isHex(o.color)
    && (o.intensity === null || (finite(o.intensity) && o.intensity >= 0 && o.intensity <= 5))))
    return fail('OBJECT_DATA_INVALID');
  const known=new Set([...POS_TARGETS,...COLOR_TARGETS,...LIGHT_TARGETS]);
  if (!raw.objects.every(o => known.has(o.id)) || new Set(raw.objects.map(o=>o.id)).size!==raw.objects.length)
    return fail('OBJECT_IDS_INVALID');
  return {ok:true, snapshot:{
    scene_id:SCENE_ID,revision:raw.revision,renderer:raw.renderer,
    objects:raw.objects.map(o=>({id:o.id, position:[...o.position],color:o.color,intensity:o.intensity}))
  }};
}
export function validateResult(raw) {
  if (!isRecord(raw) || !Number.isSafeInteger(raw.id) || raw.id < 1)
    return fail('RESULT_ID_INVALID');
  if (typeof raw.ok !== 'boolean' || typeof raw.reason !== 'string' || raw.reason.length>140)
    return fail('RESULT_SHAPE_INVALID');
  if (!Number.isSafeInteger(raw.revision) || raw.revision<0) return fail('RESULT_REVISION_INVALID');
  return {ok:true,result:{id:raw.id,ok:raw.ok,reason:raw.reason,revision:raw.revision}};
}
