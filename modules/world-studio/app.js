/* Nomadic World Studio Pilot — disposable Three.js scene adapter.
   No arbitrary JS execution, filesystem writes, or production game access.
   The browser alone owns scene instances; the server offers typed commands. */
(() => {
  'use strict';
  const sceneId='nomadic-world-studio-fixture-v1';
  const panel=document.getElementById('viewport');
  const status=document.getElementById('status');
  const inspector=document.getElementById('inspector');
  const history=document.getElementById('history');
  const sceneList=document.getElementById('objects');
  const stats=document.getElementById('stats');
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#98b7c9');
  scene.fog=new THREE.Fog('#98b7c9',24,58);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(1); // bounded RGBA capture; visual QA records exact pixels
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.1;
  panel.appendChild(renderer.domElement);
  const camera=new THREE.PerspectiveCamera(60,1,0.1,100);
  let yaw=0.55,pitch=0.42,distance=18;
  const cameraTarget=new THREE.Vector3(0,1.6,0);
  function updateCamera(){
    const c=Math.cos(pitch);
    camera.position.set(cameraTarget.x+distance*c*Math.sin(yaw),
      cameraTarget.y+distance*Math.sin(pitch),cameraTarget.z+distance*c*Math.cos(yaw));
    camera.lookAt(cameraTarget);
  }
  updateCamera();
  const hemi=new THREE.HemisphereLight('#d5e9ff','#3c463b',1.05);
  scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff0d7',2.3);
  sun.name='sun';
  sun.position.set(8,14,7);
  sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:0.5,far:70});
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);
  const registry=new Map();
  const material=(color,roughness=0.88)=>new THREE.MeshStandardMaterial({color,roughness});
  const groundMat=material('#5f7952');
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(80,80),groundMat);
  ground.name='ground';ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  registry.set('ground',{object:ground,material:groundMat});
  const grid=new THREE.GridHelper(80,40,'#799085','#799085');
  grid.position.y=0.012;grid.material.opacity=0.26;grid.material.transparent=true;scene.add(grid);
  const cabin=new THREE.Group();cabin.name='cabin';cabin.position.set(-1.4,0,0.1);
  const siding=material('#b78d66');
  const body=new THREE.Mesh(new THREE.BoxGeometry(5.2,3,4.4),siding);
  body.position.y=1.6;body.castShadow=true;body.receiveShadow=true;cabin.add(body);
  const roofMat=material('#3e4e4e',0.74);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(4.65,3.8,4,1),roofMat);
  roof.rotation.y=Math.PI/4;roof.position.y=4.88;roof.castShadow=true;cabin.add(roof);
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.15,2.15,0.055),material('#4c362a'));
  door.position.set(0,1.12,2.23);cabin.add(door);
  scene.add(cabin);registry.set('cabin',{object:cabin,material:siding});
  const pineMatA=material('#3c684d'),pineMatB=material('#658658');
  function makeSpruce(name,loc,treeMat){
    const tree=new THREE.Group();tree.name=name;tree.position.set(...loc);
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.34,3,8),material('#574535'));
    trunk.position.y=1.5;trunk.castShadow=true;tree.add(trunk);
    const crown=new THREE.Mesh(new THREE.ConeGeometry(1.45,4.4,9),treeMat);
    crown.position.y=4.2;crown.castShadow=true;tree.add(crown);
    scene.add(tree);registry.set(name,{object:tree,material:treeMat});
  }
  makeSpruce('spruce-1',[5.4,0,1],pineMatA);
  makeSpruce('spruce-2',[-7,0,-4.3],pineMatB);
  const rockMat=material('#a0a3a0');
  const stone=new THREE.Mesh(new THREE.DodecahedronGeometry(1.18,0),rockMat);
  stone.position.set(4.1,0.75,-4.5);
  stone.name='stone';stone.castShadow=true;stone.receiveShadow=true;
  scene.add(stone);registry.set('stone',{object:stone,material:rockMat});
  registry.set('sun',{object:sun,material:null});

  let revision=0, bridgeToken=null, selected='cabin';
  const journal=[];
  const trace=[];
  function text(el,value){el.textContent=String(value);}
  function asColor(mat){return mat ? '#'+mat.color.getHexString():'#ffffff';}
  function captureState(){
    const objects=[];
    for(const [id,entry] of registry) {
      const p=entry.object.position;
      objects.push({id,position:[p.x,p.y,p.z].map(x=>Number(x.toFixed(4))),
        color:asColor(entry.material),intensity:id==='sun'?Number(sun.intensity.toFixed(4)):null});
    }
    let rendererName='WebGL (renderer not identified)';
    try {
      const gl=renderer.getContext();
      const d=gl.getExtension('WEBGL_debug_renderer_info');
      rendererName=String(d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)).slice(0,200);
    } catch {}
    return {scene_id:sceneId,revision,objects,renderer:rendererName};
  }
  function renderInspector(){
    text(inspector,'');
    const e=registry.get(selected);
    if(!e) return;
    const pos=e.object.position;
    const lines=['Object: '+selected,'Position: '+[pos.x,pos.y,pos.z].map(x=>x.toFixed(2)).join(', '),
      'Material: '+(e.material?asColor(e.material):'(light)'),
      'Light intensity: '+(selected==='sun'?sun.intensity.toFixed(2):'—'),
      'Revision: '+revision,
      'Undo steps: '+journal.length];
    text(inspector,lines.join('\n'));
    const fragment=document.createDocumentFragment();
    for(const [id] of registry){
      const b=document.createElement('button');
      b.type='button';b.className=id===selected?'selected':'';
      b.textContent=id;b.addEventListener('click',()=>{selected=id;renderInspector();});
      fragment.appendChild(b);
    }
    sceneList.replaceChildren(fragment);
    text(history,trace.slice(-6).join('\n')||'No agent edits yet');
  }
  function log(line){trace.push(line);if(trace.length>50)trace.shift();renderInspector();}
  function execute(command){
    if(command.scene_id!==sceneId||command.expected_revision!==revision)
      return {ok:false,reason:'REVISION_OR_SCENE_MISMATCH'};
    let undo=null;
    try {
      if(command.action==='undo'){
        if(!journal.length) return {ok:false,reason:'JOURNAL_EMPTY'};
        undo=journal.pop();undo();
      } else {
        const entry=registry.get(command.target);
        if(!entry) return {ok:false,reason:'OBJECT_NOT_FOUND'};
        switch(command.action) {
          case 'set_position': {
            const old=entry.object.position.clone();
            entry.object.position.set(...command.value);
            undo=()=>entry.object.position.copy(old);break;
          }
          case 'set_color': {
            if(!entry.material) return {ok:false,reason:'NO_MATERIAL'};
            const old=entry.material.color.clone();
            entry.material.color.set(command.value);
            undo=()=>entry.material.color.copy(old);break;
          }
          case 'set_light_intensity': {
            if(command.target!=='sun')return {ok:false,reason:'NO_LIGHT'};
            const old=sun.intensity;sun.intensity=command.value;
            undo=()=>{sun.intensity=old;};break;
          }
          default:return {ok:false,reason:'ACTION_NOT_SUPPORTED'};
        }
        journal.push(undo);if(journal.length>24)journal.shift();
      }
      revision++;
      log('#'+revision+' '+command.action+' '+(command.target||''));
      return {ok:true,reason:'APPLIED'};
    } catch {return {ok:false,reason:'SCENE_EDIT_FAILED'};}
  }
  let polling=false;
  async function bridgeCall(url,method='GET',body=null) {
    const response=await fetch(url,{method,headers:{
      'X-Studio-Bridge':bridgeToken,...(body?{'Content-Type':'application/json'}:{})},
      body:body?JSON.stringify(body):undefined,cache:'no-store'});
    if(!response.ok)throw new Error(url+' HTTP '+response.status);
    return response.json();
  }
  async function publish(){await bridgeCall('/api/snapshot','POST',captureState());}
  async function poll(){
    if(polling||!bridgeToken)return;
    polling=true;
    try{
      const next=await bridgeCall('/api/next');
      if(next.command){
        let result;
        if(next.command.action==='capture_frame') {
          if(next.command.expected_revision!==revision || next.command.scene_id!==sceneId){
            result={ok:false,reason:'REVISION_OR_SCENE_MISMATCH'};
          } else {
            try {
              renderer.render(scene,camera);
              const encoded=renderer.domElement.toDataURL('image/png').split(',')[1];
              const receipt=await bridgeCall('/api/frame','POST',{revision,png_base64:encoded});
              result={ok:receipt.ok===true,reason:receipt.ok?'FRAME_CAPTURED':'FRAME_INVALID'};
              if(result.ok)log('Frame '+receipt.sha256.slice(0,12)+' @ r'+revision);
            } catch {result={ok:false,reason:'FRAME_CAPTURE_FAILED'};}
          }
        } else result=execute(next.command);
        await bridgeCall('/api/report','POST',{
          id:next.command.id,ok:result.ok,reason:result.reason,revision
        });
        await publish();
      }
      text(status,'LIVE · r'+revision+' · loopback');
    }catch(err){text(status,'BRIDGE ERROR · '+String(err.message).slice(0,90));}
    finally{polling=false;}
  }
  function resize(){
    const w=panel.clientWidth,h=panel.clientHeight;
    if(!w||!h)return;
    const cw=Math.min(w,1500),ch=Math.min(h,1000);
    renderer.setSize(cw,ch,false);camera.aspect=cw/ch;camera.updateProjectionMatrix();
  }
  const ro=new ResizeObserver(resize);ro.observe(panel);resize();
  const pointer={down:false,x:0,y:0,moved:0};
  renderer.domElement.addEventListener('pointerdown',e=>{
    pointer.down=true;pointer.x=e.clientX;pointer.y=e.clientY;pointer.moved=0;
    renderer.domElement.setPointerCapture(e.pointerId);
  });
  renderer.domElement.addEventListener('pointermove',e=>{
    if(!pointer.down)return;
    const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
    pointer.moved+=Math.abs(dx)+Math.abs(dy);
    yaw+=dx*0.005;pitch=Math.max(-0.12,Math.min(1.3,pitch+dy*0.005));
    pointer.x=e.clientX;pointer.y=e.clientY;updateCamera();
  });
  renderer.domElement.addEventListener('pointerup',e=>{
    pointer.down=false;
    if(pointer.moved>6)return;
    const rect=renderer.domElement.getBoundingClientRect();
    const mouse=new THREE.Vector2(
      (e.clientX-rect.left)/rect.width*2-1,
      -((e.clientY-rect.top)/rect.height)*2+1);
    const ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);
    const hit=ray.intersectObjects(scene.children,true).find(h=>{
      let obj=h.object;
      while(obj && !registry.has(obj.name))obj=obj.parent;
      return obj && registry.has(obj.name);
    });
    if(hit){let obj=hit.object;
      while(obj&&!registry.has(obj.name))obj=obj.parent;
      if(obj){selected=obj.name;renderInspector();}
    }
  });
  renderer.domElement.addEventListener('wheel',e=>{
    e.preventDefault();distance=Math.max(5,Math.min(45,distance+e.deltaY*0.012));updateCamera();
  },{passive:false});
  function animate(){
    requestAnimationFrame(animate);
    renderer.render(scene,camera);
    text(stats,'Draw calls '+renderer.info.render.calls+' · Triangles '+renderer.info.render.triangles);
  }
  renderInspector();animate();
  (async()=>{
    try {
      const response=await fetch('/api/bootstrap',{cache:'no-store'});
      if(!response.ok)throw new Error('BOOTSTRAP_FAILED');
      const handshake=await response.json();
      if(handshake.scene_id!==sceneId)throw new Error('SCENE_ID_MISMATCH');
      bridgeToken=handshake.bridge_token;
      await publish();
      text(status,'LIVE · r0 · loopback');
      setInterval(poll,400);
    }catch(err){text(status,'BRIDGE NOT READY · '+String(err.message).slice(0,80));}
  })();
})();
