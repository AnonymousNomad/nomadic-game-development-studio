import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENE_ID,validateCommand,validateSnapshot,validateResult} from './protocol.mjs';
const base={scene_id:SCENE_ID,expected_revision:0};
test('accepts bounded exact scene and numeric position',()=>{
  assert.equal(validateCommand({...base,action:'set_position',target:'cabin',value:[0,2,-4]}).ok,true);
});
test('rejects outside-scene and cross-scene commands',()=>{
  assert.equal(validateCommand({...base,scene_id:'stillwater/real',action:'undo'}).reason,'SCENE_ID_MISMATCH');
  assert.equal(validateCommand({...base,action:'delete_project',target:'cabin'}).reason,'ACTION_NOT_ALLOWED');
});
test('rejects JS, shell, network and unknown authority',()=>{
  assert.equal(validateCommand({...base,action:'set_color',target:'ground',value:'#123456',eval:'process.exit()'}).reason,'UNKNOWN_COMMAND_FIELD');
  assert.equal(validateCommand({...base,action:'run_js',value:'eval(1)'}).ok,false);
  assert.equal(validateCommand({...base,action:'set_color',target:'http://evil',value:'#123456'}).ok,false);
});
test('requires color syntax, fixed target, intensity bounds',()=>{
  assert.equal(validateCommand({...base,action:'set_color',target:'ground',value:'url(x)'}).reason,'COLOR_INVALID');
  assert.equal(validateCommand({...base,action:'set_light_intensity',target:'cabin',value:1}).reason,'TARGET_NOT_ALLOWED');
  assert.equal(validateCommand({...base,action:'set_light_intensity',target:'sun',value:6}).reason,'LIGHT_OUT_OF_BOUNDS');
});
test('rejects invalid coordinates and non-finite values',()=>{
  assert.equal(validateCommand({...base,action:'set_position',target:'cabin',value:[Infinity,0,0]}).ok,false);
  assert.equal(validateCommand({...base,action:'set_position',target:'cabin',value:[0,51,0]}).ok,false);
  assert.equal(validateCommand({...base,action:'set_position',target:'cabin',value:[0,'1',0]}).ok,false);
});
test('undo must be argument-free and revision-bound',()=>{
  assert.equal(validateCommand({...base,action:'undo'}).ok,true);
  assert.equal(validateCommand({...base,action:'undo',target:'cabin'}).reason,'ACTION_HAS_ARGUMENTS');
  assert.equal(validateCommand({...base,action:'capture_frame'}).ok,true);
  assert.equal(validateCommand({...base,action:'capture_frame',value:'unsafe'}).reason,'ACTION_HAS_ARGUMENTS');
  assert.equal(validateCommand({...base,expected_revision:-1,action:'undo'}).ok,false);
});
test('snapshot validates genuine bounded objects',()=>{
  const data={scene_id:SCENE_ID,revision:0,renderer:'WebGL',
    objects:[{id:'cabin',position:[0,0,0],color:'#ffffff',intensity:null}]};
  assert.equal(validateSnapshot(data).ok,true);
  assert.equal(validateSnapshot({...data,objects:[...data.objects,...data.objects]}).reason,'OBJECT_IDS_INVALID');
  assert.equal(validateSnapshot({...data,objects:[{...data.objects[0],id:'arbitrary'}]}).reason,'OBJECT_IDS_INVALID');
});
test('result cannot lie about revision or id shape',()=>{
  assert.equal(validateResult({id:1,ok:true,reason:'APPLIED',revision:1}).ok,true);
  assert.equal(validateResult({id:'1',ok:true,reason:'APPLIED',revision:1}).ok,false);
});
