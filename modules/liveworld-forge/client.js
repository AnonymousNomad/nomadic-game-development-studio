(() => {
  'use strict';
  const qs = s => document.querySelector(s);
  const out = qs('#output'), overlay = qs('#overlay'), root = qs('#viewport');
  const note = (message, good=false) => { out.textContent = String(message); out.className = good ? 'ok' : ''; };
  let current = null, asset = null, assembled = [], orbit = { radius: 15, azimuth: .6, elevation: .35 }, drag = null;
  if (!window.THREE || !window.SightlineGlb) { note('RENDERER_OR_GLTF_READER_NOT_LOADED'); return; }
  let renderer, scene, camera;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference:'low-power' });
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    root.prepend(renderer.domElement);
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x8daeb8);
    scene.fog = new THREE.FogExp2(0x8daeb8, .006);
    camera = new THREE.PerspectiveCamera(58,1,.1,2000);
    scene.add(new THREE.HemisphereLight(0xe3f5ff,0x40533c,2));
    const sun = new THREE.DirectionalLight(0xffebc0, 2.0); sun.position.set(9,17,5); scene.add(sun);
    const terrain = new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({color:0x54745d,roughness:1}));
    terrain.rotation.x=-Math.PI/2; terrain.name='demo-ground'; terrain.userData.sightlineId='demo/ground'; scene.add(terrain);
    const grid = new THREE.GridHelper(28,28,0x527a67,0x486954);grid.position.y=.012;scene.add(grid);
  } catch (error) { note('WEBGL_INITIALIZATION_FAILED: ' + error.message); return; }
  window.addEventListener('error',e=>note('CLIENT_ERROR '+e.message));
  function updateOrbitFromCamera() {
    const target = new THREE.Vector3(...current.camera.target);
    const delta = camera.position.clone().sub(target);
    orbit.radius = Math.max(2,Math.min(100,delta.length()));
    orbit.azimuth = Math.atan2(delta.x,delta.z);
    orbit.elevation = Math.asin(Math.max(-.98,Math.min(.98,delta.y/orbit.radius)));
  }
  function applyOrbit() {
    if(!current) return;
    const t=current.camera.target, c=orbit;
    camera.position.set(t[0]+Math.sin(c.azimuth)*Math.cos(c.elevation)*c.radius,
       t[1]+Math.sin(c.elevation)*c.radius,t[2]+Math.cos(c.azimuth)*Math.cos(c.elevation)*c.radius);
    camera.lookAt(t[0],t[1],t[2]);
  }
  const geometry = {
    box:()=>new THREE.BoxGeometry(1,1,1),sphere:()=>new THREE.SphereGeometry(.5,18,12),
    cone:()=>new THREE.ConeGeometry(.5,1,12),cylinder:()=>new THREE.CylinderGeometry(.5,.5,1,12)
  };
  function clearObjects() {
    for(const obj of assembled){scene.remove(obj);if(obj.userData.disposable){obj.traverse(c=>{if(c.isMesh){c.geometry.dispose();c.material.dispose();}});}}
    assembled=[];
  }
  function rebuild(state) {
    clearObjects();current=state;
    for(const item of state.objects){
      let o;
      if(item.kind==='asset'&&item.asset==='aframe.glb'&&asset){
        o=asset.clone(true);o.name=item.id;
        o.traverse(child=>{if(child.isMesh) child.userData.sightlineId = item.id + '/' + (child.userData.forgeStableId || child.name);});
        o.userData.disposable=false;
      } else if (item.kind==='asset') { continue; }
      else if (geometry[item.kind]) {
        o=new THREE.Mesh(geometry[item.kind](),new THREE.MeshStandardMaterial({color:item.color,roughness:.8}));
        o.name=item.id;o.userData.sightlineId='object/'+item.id;o.userData.disposable=true;
      } else {note('UNSUPPORTED_OBJECT_KIND '+item.kind);continue;}
      o.position.fromArray(item.position);o.rotation.set(...item.rotation);o.scale.fromArray(item.scale);
      scene.add(o);assembled.push(o);
    }
    camera.position.fromArray(state.camera.position);camera.lookAt(...state.camera.target);
    updateOrbitFromCamera();
    overlay.textContent='rev '+state.revision+' Â· '+state.objects.length+' objects Â· '+(asset?'Forge GLB loaded':'GLB pending')+' Â· '+renderer.info.render.triangles+' triangles';
  }
  async function loadScene() {
    const r=await fetch('/api/scene',{cache:'no-store'});if(!r.ok)throw Error('SCENE_HTTP_'+r.status);
    const s=await r.json();rebuild(s);
  }
  async function cmd(command) {
    if(!current)throw Error('SCENE_NOT_READY');
    const token=qs('#token').value;
    const r=await fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json','x-liveworld-token':token},
      body:JSON.stringify({expectedRevision:current.revision,command})});
    const result=await r.json(); if(!r.ok) throw Error(result.code);
    note(JSON.stringify(result,null,2),true);await loadScene();return result;
  }
  async function run(fn) {try{await fn();}catch(e){note('ERROR: '+e.message);}}
  qs('#apply').onclick=()=>run(()=>cmd(JSON.parse(qs('#command').value)));
  qs('#undo').onclick=()=>run(()=>cmd({type:'undo'}));
  // The camera's own target is what the viewport is actually looking at. The
  // saved target used to be the scene's previous one, so saving the camera
  // after moving it saved a position with the old look-at point.
  qs('#save-camera').onclick=()=>run(()=>{const direction=new THREE.Vector3();camera.getWorldDirection(direction);
    const target=camera.position.clone().add(direction.multiplyScalar(10));
    return cmd({type:'camera',position:camera.position.toArray(),target:target.toArray()});});
  qs('#add').onclick=()=>run(async()=>{
    const id='prop-'+Math.floor(Date.now()/1000).toString(36);
    await cmd({type:'add',id,kind:'sphere',position:[3+Math.random()*2,1,-2],rotation:[0,0,0],scale:[1.4,1.4,1.4],color:'#b8a0e1'});
  });
  qs('#recolor').onclick=()=>run(()=>cmd({type:'recolor',id:'marker',color:'#7ab9ca'}));
  qs('#inspect').onclick=()=>run(async()=>note(JSON.stringify(current,null,2),true));
  qs('#capture').onclick=()=>run(async()=>{
    if(!current)throw Error('SCENE_NOT_READY');
    renderer.render(scene,camera);
    const data=renderer.domElement.toDataURL('image/png').split(',')[1];
    const r=await fetch('/api/capture',{method:'POST',headers:{'Content-Type':'application/json','x-liveworld-token':qs('#token').value},
      body:JSON.stringify({revision:current.revision,pngBase64:data})});
    const body=await r.json();if(!r.ok)throw Error(body.code);
    note(JSON.stringify(body,null,2),true);
  });
  const canvas=renderer.domElement;
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{
    if(!drag)return;
    orbit.azimuth-=(e.clientX-drag.x)*.006;
    orbit.elevation=Math.max(-1.25,Math.min(1.25,orbit.elevation+(e.clientY-drag.y)*.006));
    drag={x:e.clientX,y:e.clientY};applyOrbit();
  });
  canvas.addEventListener('pointerup',()=>drag=null);
  canvas.addEventListener('wheel',e=>{orbit.radius=Math.max(2,Math.min(80,orbit.radius*(e.deltaY>0?1.08:.92)));applyOrbit();e.preventDefault();},{passive:false});
  // The size is only applied when it changes. Calling setSize every frame
  // reallocates the drawing buffer sixty times a second for a window that
  // does not move.
  let lastW=0,lastH=0;
  function resize(){
    const w=Math.max(1,root.clientWidth),h=Math.max(1,root.clientHeight);
    if(w===lastW&&h===lastH)return;
    lastW=w;lastH=h;renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  window.addEventListener('resize',resize);
  let frames=0;const animate=()=>{requestAnimationFrame(animate);resize();renderer.render(scene,camera);frames++;
    if(current&&frames%120===0)overlay.textContent='rev '+current.revision+' Â· '+current.objects.length+' objects Â· '+(asset?'Forge GLB loaded':'GLB pending')+' Â· '+renderer.info.render.triangles+' tris';
  };
  window.__LIVEWORLD__ = {getState:()=>structuredClone(current),getCaptureContext:()=>({renderer,scene,camera}),capturePng:()=>renderer.domElement.toDataURL('image/png')};
  async function start(){
    try{
      await new Promise((resolve,reject)=>window.SightlineGlb.loadGlb('/assets/aframe.glb',result=>{asset=result.group;resolve();},reject));
      await loadScene();resize();animate();
      const events=new EventSource('/api/events');
      events.addEventListener('revision',()=>loadScene().catch(e=>note('SCENE_SYNC_ERROR: '+e.message)));
      events.onerror=()=>note('LIVE_UPDATE_CONNECTION_LOST; reconnecting');
      note('Connected. Scene Forge GLB verified by the browser reader. Revision '+current.revision+'.',true);
    }catch(e){note('STARTUP_FAILED: '+e.message);}
  }
  start();
})();