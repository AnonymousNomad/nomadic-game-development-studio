/* NGDS Alaska Offshore: independent Three.js browser visual-quality benchmark.
   Original procedural scene; no external fetches; NOT STILLWATER. */
(()=>{'use strict';
const T=window.THREE,S=window.NGDS_BOAT_SHADERS;
const error=document.getElementById('error');
if(!T||!S){error.hidden=false;error.textContent='Local Three.js or GLSL dependency was not loaded.';return;}
const root=document.getElementById('viewport'),rad=Math.PI/180,PI=Math.PI;
const state={revision:1,t:25,paused:false,sea:3,exposure:.65,inertia:4,clear:false,mode:'chase',azimuth:.39,elevation:.16,distance:35};
const vec=(x,y,z)=>new T.Vector3(x,y,z);
const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(Math.max(320,innerWidth),Math.max(240,innerHeight));
renderer.outputColorSpace=T.SRGBColorSpace||renderer.outputColorSpace;
if(T.ACESFilmicToneMapping!==undefined)renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.13;root.appendChild(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x101921);scene.fog=new T.FogExp2(0x1a2630,.0018);
const camera=new T.PerspectiveCamera(54,innerWidth/Math.max(240,innerHeight),.07,1250);
camera.position.set(15,12,34);
const moonDir=vec(-.39,.47,-.795).normalize();
scene.add(new T.HemisphereLight(0x8bacc3,0x02050a,1.25));
const moon=new T.DirectionalLight(0xf7e4c7,1.22);moon.position.copy(moonDir.clone().multiplyScalar(150));scene.add(moon);
const rim=new T.DirectionalLight(0x9bced9,.46);rim.position.set(-65,44,85);scene.add(rim);
const finish=(c,m=.1,r=.75,emissive=0x000000,intensity=0)=>new T.MeshStandardMaterial({color:c,metalness:m,roughness:r,emissive,emissiveIntensity:intensity});
const darkSteel=finish(0x223138,.64,.44),lowerHull=finish(0x432e2b,.58,.63),rubber=finish(0x0e1519,.3,.8);
const rimSteel=finish(0x839392,.83,.3),deck=finish(0x303c42,.67,.47),cabin=finish(0x677471,.38,.64);
for(const m of [darkSteel,lowerHull,rubber])m.side=T.DoubleSide;
const glass=finish(0x182b36,.63,.24,0x664e31,.24),glow=finish(0xd5a35c,.15,.32,0x9e713b,.5);
const rust=finish(0x674535,.46,.6),rope=finish(0x88785f,.04,.95),cream=finish(0xb8b7a8,.20,.5);
const skyUniform={time:{value:0},cloud:{value:1},exposure:{value:.99},moon:{value:moonDir}};
const sky=new T.Mesh(new T.SphereGeometry(700,36,20),new T.ShaderMaterial({uniforms:skyUniform,vertexShader:S.skyVertex,fragmentShader:S.skyFragment,side:T.BackSide,depthWrite:false}));
sky.frustumCulled=false;scene.add(sky);
function h(x,z,t,amp=1){
 return amp*(.52*Math.sin(x*.33+z*.48+t*.56)+.21*Math.sin(x*.96-z*.37+t*.88)+.17*Math.cos(x*.21-z*.67-t*.52)+.06*Math.sin(x*.98+z*.82+t*.98));
}
const waterUniform={time:{value:0},amp:{value:1},moon:{value:moonDir},exposure:{value:state.exposure}};
const seaGeo=new T.PlaneGeometry(700,700,360,360);seaGeo.rotateX(-PI/2);
const sea=new T.Mesh(seaGeo,new T.ShaderMaterial({uniforms:waterUniform,vertexShader:S.oceanVertex,fragmentShader:S.oceanFragment,side:T.DoubleSide,depthWrite:true}));
sea.name='ocean-surface';sea.frustumCulled=false;scene.add(sea);
// Three independently shaped jagged coastal formations for the Alaska fjord silhouette.
function coast(x1,x2,z,width,height,seed){
 const nx=84,nz=11,p=[],col=[],idx=[];let rng=seed;
 const rnd=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
  const u=i/nx,q=j/nz,xx=x1+(x2-x1)*u,zz=z-width*q;
  const edge=Math.min(1,Math.min(u,1-u)*7);
  const ridges=.65+.18*Math.sin(u*7+seed)+.14*Math.cos(u*15-seed)+.045*Math.sin(u*36);
  const peak=height*(.16+.84*edge)*Math.max(.17,ridges)*(1-q*.42);
  const y=-2+peak+Math.sin(u*38+q*12)*.28+(rnd()-.5)*.18;
  p.push(xx,y,zz);const base=.65+rnd()*.31+Math.max(0,y)*.0016;
  const c=new T.Color(0x1a252d);c.multiplyScalar(base);col.push(c.r,c.g,c.b);
 }
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const k=j*(nx+1)+i;idx.push(k,k+nx+1,k+1,k+1,k+nx+1,k+nx+2);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
 const m=new T.Mesh(g,new T.MeshStandardMaterial({color:0x687579,vertexColors:true,side:T.DoubleSide,roughness:1}));m.name='rock-coast';scene.add(m);
}
coast(-260,-20,-165,115,34,307);coast(38,280,-143,105,72,791);coast(-31,50,-320,70,33,547);coast(-230,-77,-108,64,16,118);
// Lofted 23m displacement hull and top deck (all real 3D geometry).
const ship=new T.Group();ship.name='23m-alaska-shrimp-workboat';scene.add(ship);
const boat=new T.Group();boat.name='vessel-geometry';ship.add(boat);
const stations=[[-12,.10,2.4,-.15],[-11,1.0,2.47,-.82],[-9,1.9,2.52,-1.0],[-6,2.5,2.51,-1.26],[-2,2.7,2.46,-1.42],[3,2.8,2.37,-1.45],[7.3,2.77,2.29,-1.3],[10.6,2.35,2.30,-.95],[11.75,1.16,2.32,-.45],[12,.10,2.34,-.17]];
const ring=s=>[[-s[1],s[2]],[-s[1]*.97,.98],[-s[1]*.85,-.55],[0,s[3]],[s[1]*.85,-.55],[s[1]*.97,.98],[s[1],s[2]]];
for(let band=0;band<6;band++){
 const pos=[],ids=[];
 for(const s of stations){const points=ring(s);for(const i of [band,band+1])pos.push(points[i][0],points[i][1],s[0]);}
 for(let i=0;i<stations.length-1;i++){const k=i*2;ids.push(k,k+1,k+2,k+2,k+1,k+3);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(ids);g.computeVertexNormals();
 const mat=band===0||band===5?darkSteel:band===1||band===4?rubber:lowerHull;
 const m=new T.Mesh(g,mat);m.name='displacement-hull-band-'+band;boat.add(m);
}
{
 const p=[],idx=[];for(const s of stations)p.push(-s[1]*.94,s[2]-.13,s[0],s[1]*.94,s[2]-.13,s[0]);
 for(let i=0;i<stations.length-1;i++){let k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();
 const m=new T.Mesh(g,new T.MeshStandardMaterial({color:0x424a49,metalness:.62,roughness:.48,side:T.DoubleSide}));m.name='working-deck';boat.add(m);
}
function box(w,hh,l,m,x,y,z,name){
 const o=new T.Mesh(new T.BoxGeometry(w,hh,l),m);o.position.set(x,y,z);if(name)o.name=name;boat.add(o);return o;
}
function tube(p,q,rr=.042,m=rimSteel,name){
 const a=vec(...p),b=vec(...q),delta=b.clone().sub(a);
 const o=new T.Mesh(new T.CylinderGeometry(rr,rr,delta.length(),7),m);
 o.position.copy(a.add(b).multiplyScalar(.5));o.quaternion.setFromUnitVectors(vec(0,1,0),delta.normalize());
 if(name)o.name=name;boat.add(o);return o;
}
function rig(points,m=rope,rr=.025){const c=new T.CatmullRomCurve3(points.map(x=>vec(...x))),o=new T.Mesh(new T.TubeGeometry(c,17,rr,4,false),m);boat.add(o);}
// Railings, rubbing strake, and fenders.
for(const sign of [-1,1]){
 for(let i=0;i<stations.length-1;i++){
  const a=stations[i],b=stations[i+1];
  tube([sign*a[1],a[2],a[0]],[sign*b[1],b[2],b[0]],.075,rimSteel,'gunwale');
  tube([sign*a[1]*.94,a[2]+1.08,a[0]],[sign*b[1]*.94,b[2]+1.08,b[0]],.035,rimSteel,'rail-top');
 }
 for(let z=-10;z<11;z+=1.45){
  let k=stations.findIndex((s,i)=>i<stations.length-1&&s[0]<=z&&stations[i+1][0]>=z);k=Math.max(k,0);
  const s=stations[k],n=stations[Math.min(k+1,stations.length-1)],t=(z-s[0])/Math.max(.01,n[0]-s[0]),b=s[1]+(n[1]-s[1])*t,y=s[2]+(n[2]-s[2])*t;
  tube([sign*b*.94,y+.01,z],[sign*b*.94,y+1.08,z],.032,rimSteel,'safety-post');
 }
 for(const z of [2.4,5.2,8.4])box(.29,.40,.75,rubber,sign*2.3,2.36,z,'rubber-fender');
}
// Dense utilitarian cabin and broken-up wheelhouse glazing.
box(4,.32,6,rubber,0,2.45,-3.90,'cabin-base');
box(3.67,2.72,4.65,cabin,0,3.95,-3.82,'wheelhouse');
box(4.35,.26,5.35,darkSteel,0,5.45,-3.82,'cabin-roof');
box(3.9,.10,4.86,deck,0,5.62,-3.82);
for(const side of [-1,1]){
 for(const z of [-5.2,-3.93,-2.65]){
  box(.08,.89,.95,glass,side*1.87,4.49,z,'wheelhouse-glass');
  box(.08,.045,.95,rimSteel,side*1.90,4.0,z);
 }
 box(.10,1.07,.72,darkSteel,side*1.88,3.28,-1.94,'cabin-door');
 box(.1,.055,.11,rimSteel,side*1.94,3.27,-1.76);
}
for(const x of [-1.1,0,1.1]){
 box(.94,.90,.065,glass,x,4.55,-6.18,'front-windshield');
 box(.085,1.12,.12,darkSteel,x+.49,4.52,-6.18);
}
box(3.33,.48,.16,darkSteel,0,5.19,-6.24,'windshield-sun-visor');
box(3.34,.77,.09,glass,0,4.57,-1.46,'aft-wheelhouse-glass');
for(const x of [-1.15,1.15])box(.12,1,.12,darkSteel,x,4.45,-1.45);
const inner=new T.PointLight(0xffc487,15,14,2);inner.position.set(0,4.3,-3.83);boat.add(inner);
const head=new T.PointLight(0xffdfa1,6,11,2);head.position.set(0,5.25,1.5);boat.add(head);
// Radar mast, exhaust pipe, signal/navigation and mast tension cables.
tube([0,5.6,-3.7],[0,10.7,-3.7],.105,rimSteel,'signal-mast');
tube([-1.42,8.10,-3.7],[1.42,8.10,-3.7],.065,rimSteel,'mast-crossbar');
tube([0,10.6,-3.7],[0,12.3,-3.7],.024,rimSteel,'radio-antenna');
box(1.50,.26,.5,cabin,0,6.12,-3.7,'radar-scanner');
box(.56,.32,.49,darkSteel,0,5.98,-3.7,'radar-base');
tube([1.27,5.59,-2.5],[1.27,7.0,-2.5],.13,rubber,'diesel-exhaust');
const exhaustCap=new T.Mesh(new T.ConeGeometry(.23,.23,8),darkSteel);exhaustCap.position.set(1.27,7.06,-2.5);boat.add(exhaustCap);
for(const sign of [-1,1]){
 rig([[0,10.4,-3.7],[sign*.88,7.2,-3.7],[sign*2.37,2.45,-8.15]],rimSteel,.017);
 rig([[0,8.08,-3.7],[sign*3.1,3.2,5.9]],rope,.017);
 const color=sign===-1?0xf24c39:0x49dbaa;
 const m=new T.Mesh(new T.SphereGeometry(.095,9,7),new T.MeshBasicMaterial({color}));m.position.set(sign*1.8,5.65,-5.35);boat.add(m);
 const light=new T.PointLight(color,1.2,6,2);light.position.copy(m.position);boat.add(light);
}
const anchor=new T.Mesh(new T.SphereGeometry(.12,12,9),new T.MeshBasicMaterial({color:0xffe3a3}));anchor.position.set(0,11.45,-3.7);boat.add(anchor);
// Winches, wheel guards, shrimp cage stacks, net booms and cleats.
for(const z of [3.6,6.2]){
 box(1.83,.38,.74,darkSteel,0,2.57,z,'hydraulic-hauling-winch');
 tube([-1.25,2.92,z],[1.25,2.92,z],.22,rubber,'winch-drum');
 for(const x of [-1.11,1.11])box(.12,.62,.71,rust,x,2.77,z,'winch-cheek');
}
for(const side of [-1,1]){
 tube([side*1.75,2.82,2.65],[side*6.2,6.63,6.1],.12,rimSteel,'shrimp-net-outrigger');
 tube([side*1.75,2.5,2.65],[side*1.75,4.1,2.65],.12,darkSteel,'outrigger-pivot');
 rig([[0,8.1,-3.7],[side*3.2,7.55,1.25],[side*6.2,6.63,6.1]],rope,.028);
 rig([[side*6.2,6.63,6.1],[side*6,3.8,8.1],[side*5.4,1.95,10.2]],rope,.016);
 const buoy=new T.Mesh(new T.SphereGeometry(.23,11,8),finish(0xa05425,.24,.5));buoy.position.set(side*1.8,2.87,9.65);boat.add(buoy);
 for(const z of [-9.6,10.5])box(.49,.11,.19,rimSteel,side*1.75,2.51,z,'mooring-cleat');
}
function cage(x,z){
 box(1.0,.065,.75,rust,x,2.66,z,'shrimp-pot-bottom');
 for(const dx of [-.48,.48])for(const dz of [-.35,.35])tube([x+dx,2.69,z+dz],[x+dx,3.2,z+dz],.017,rimSteel,'pot-frame');
 for(const y of [2.7,3.22]){
  for(const dz of [-.35,.35])tube([x-.48,y,z+dz],[x+.48,y,z+dz],.019,rimSteel);
  for(const dx of [-.48,.48])tube([x+dx,y,z-.35],[x+dx,y,z+.35],.019,rimSteel);
 }
}
for(const z of [7.1,8.4,9.7])cage(-1.1,z);
for(const z of [7.4,8.7])cage(1.08,z);
for(const side of [-1,1]){
 const coil=new T.Mesh(new T.TorusGeometry(.45,.064,8,21),rope);coil.rotation.x=PI/2;coil.position.set(side*1.62,2.68,10.15);boat.add(coil);
}
const lifebelt=new T.Mesh(new T.TorusGeometry(.34,.095,8,25),finish(0xa34437,.15,.43));lifebelt.rotation.y=PI/2;lifebelt.position.set(-1.96,3.91,-2.2);boat.add(lifebelt);
box(1.16,.32,.83,rust,0,2.55,9.4,'working-gear-box');
for(const side of [-1,1]){
 const spot=new T.SpotLight(0xffdea3,11,20,.62,.83,2);spot.position.set(side*1.86,5.42,-1.36);spot.target.position.set(side,2.3,6.2);boat.add(spot,spot.target);
 const lamp=new T.Mesh(new T.CylinderGeometry(.16,.18,.20,9),finish(0xbca280,.3,.38,0xffb85e,.08));lamp.rotation.x=PI/2;lamp.position.set(side*1.86,5.42,-1.36);boat.add(lamp);
}
// Deliberately subtle, cheap ship wake; real CFD, buoyancy forces and foam simulation are not claimed.
const wake=[];const foamFinish=new T.MeshBasicMaterial({color:0xc1ceca,transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide});
for(let i=0;i<28;i++){
 const o=new T.Mesh(new T.PlaneGeometry(.07+i*.018,1.1+i*.035),foamFinish.clone());
 o.rotation.x=-PI/2;o.rotation.z=i%2?.07:-.07;o.position.set((i%2?-1:1)*(1.8+i*.11),0,11+i*1.3);scene.add(o);wake.push(o);
}
let last=performance.now(),elapsed=0,frameCount=0,frames=[],aim=vec(0,3,0),pointer=null;
function updateMotion(){
 const t=state.t,amp=state.sea/3*1.05;
 const target=h(0,0,t,amp)*.72,pitch=Math.atan2(h(0,8,t,amp)-h(0,-6,t,amp),14),roll=Math.atan2(h(-3,2,t,amp)-h(3,2,t,amp),6.6);
 const rate=.024+.07*(6-state.inertia)/5,weight=(6-state.inertia)/5;
 ship.position.y=T.MathUtils.lerp(ship.position.y,target,rate);
 boat.rotation.x=T.MathUtils.lerp(boat.rotation.x,pitch*weight*.76,rate);
 boat.rotation.z=T.MathUtils.lerp(boat.rotation.z,roll*weight*.67,rate);
 boat.rotation.y=Math.sin(t*.045)*.014;
 for(let i=0;i<wake.length;i++){
  const o=wake[i];o.position.y=h(o.position.x,o.position.z,t,amp)+.04;o.material.opacity=(.04+.08*(.5+.5*Math.sin(t*1.14+i)))*(1-i/wake.length);
 }
}
function updateCamera(dt){
 const bridge=state.mode==='bridge';
 const target=bridge?vec(0,4.4+ship.position.y,-70):vec(0,3.3+ship.position.y,-1.5);
 const r=state.distance,a=state.azimuth,e=state.elevation;
 const dest=bridge?vec(0,4.65+ship.position.y,-6.25):target.clone().add(vec(Math.sin(a)*Math.cos(e)*r,Math.sin(e)*r,Math.cos(a)*Math.cos(e)*r));
 const n=1-Math.exp(-Math.min(dt,.07)*5.5);
 camera.position.lerp(dest,n);aim.lerp(target,n);camera.lookAt(aim);
}
function mode(name){
 if(!['chase','orbit','bridge'].includes(name))return false;
 state.mode=name;
 if(name==='chase'){state.azimuth=.39;state.elevation=.16;state.distance=35;}
 if(name==='orbit'){state.azimuth=-1.8;state.elevation=.21;state.distance=25;}
 if(name==='bridge'){state.azimuth=.04;state.elevation=.11;state.distance=10;}
 for(const b of document.querySelectorAll('button[id^="camera-"]'))b.classList.toggle('active',b.id==='camera-'+name);
 state.revision++;return true;
}
renderer.domElement.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointer={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!pointer)return;state.azimuth-=(e.clientX-pointer.x)*.006;state.elevation=T.MathUtils.clamp(state.elevation+(e.clientY-pointer.y)*.004,-.1,1.2);pointer.x=e.clientX;pointer.y=e.clientY;});
for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,()=>pointer=null);
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();state.distance=T.MathUtils.clamp(state.distance+e.deltaY*.02,6,80);},{passive:false});
window.addEventListener('resize',()=>{const w=Math.max(320,innerWidth),hh=Math.max(240,innerHeight);renderer.setSize(w,hh);camera.aspect=w/hh;camera.updateProjectionMatrix();state.revision++;});
function button(id,fn){document.getElementById(id).addEventListener('click',fn);}
for(const key of ['chase','orbit','bridge'])button('camera-'+key,()=>mode(key));
function bind(id,fmt,fn){const x=document.getElementById(id);x.addEventListener('input',()=>{const n=Number(x.value);document.getElementById(id+'-n').textContent=fmt(n);fn(n);state.revision++;});}
bind('wave',n=>String(n),n=>state.sea=n);
bind('exposure',n=>n+'%',n=>state.exposure=n/100);
bind('boat-weight',n=>n>=4?'HEAVY':n===3?'MEDIUM':'LIGHT',n=>state.inertia=n);
button('toggle-weather',()=>{state.clear=!state.clear;document.getElementById('toggle-weather').textContent=state.clear?'STORM CLOUDS':'CLEARER SKY';state.revision++;});
button('toggle-freeze',()=>{state.paused=!state.paused;document.getElementById('toggle-freeze').textContent=state.paused?'RESUME':'PAUSE';state.revision++;});
button('hide-ui',()=>{const n=document.getElementById('control-body');n.style.display=n.style.display==='none'?'':'none';document.getElementById('hide-ui').textContent=n.style.display==='none'?'+':'−';});
button('capture',()=>{try{renderer.render(scene,camera);const a=document.createElement('a');a.href=renderer.domElement.toDataURL('image/png');a.download='alaska-offshore-frame-'+Math.round(state.t*10)+'.png';a.click();}catch(e){console.warn('Capture unavailable:',e);}});
let recording=false;
button('record',()=>{
 if(recording)return;
 const btn=document.getElementById('record');
 if(typeof MediaRecorder==='undefined'||typeof renderer.domElement.captureStream!=='function'){btn.textContent='RECORDING UNSUPPORTED';return;}
 const choices=['video/mp4;codecs=avc1.42E01E','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
 const mime=choices.find(x=>MediaRecorder.isTypeSupported(x));
 if(!mime){btn.textContent='VIDEO CODEC UNAVAILABLE';return;}
 const stream=renderer.domElement.captureStream(24);
 const previous=state.mode,parts=[];
 try{
  const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4200000});
  recording=true;btn.disabled=true;btn.textContent='RECORDING CINEMATIC TOUR…';
  rec.ondataavailable=e=>{if(e.data&&e.data.size>0)parts.push(e.data);};
  rec.onerror=e=>{console.warn('MediaRecorder error',e);};
  rec.onstop=()=>{
   for(const tr of stream.getTracks())tr.stop();
   recording=false;btn.disabled=false;btn.textContent='RECORD 12s CINEMATIC TOUR';
   mode(previous);
   if(!parts.length)return;
   const blob=new Blob(parts,{type:mime});
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='NGDS-Alaska-Offshore-12s.'+(mime.startsWith('video/mp4')?'mp4':'webm');a.click();
   setTimeout(()=>URL.revokeObjectURL(url),10000);
  };
  mode('chase');rec.start(300);
  setTimeout(()=>{if(rec.state==='recording')mode('orbit');},4000);
  setTimeout(()=>{if(rec.state==='recording')mode('bridge');},8000);
  setTimeout(()=>{if(rec.state==='recording')rec.stop();},12000);
 }catch(e){for(const tr of stream.getTracks())tr.stop();recording=false;btn.disabled=false;btn.textContent='RECORDING UNAVAILABLE';console.warn(e);}
});

function gpuInfo(){try{const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {type:gl instanceof WebGL2RenderingContext?'WebGL2':'WebGL1',renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'masked',note:'CLIENT-REPORTED, NOT INDEPENDENTLY VERIFIED'};}catch(e){return {type:'unknown',renderer:'unknown',note:'UNVERIFIED'};}}
const gpu=gpuInfo();document.getElementById('renderer').textContent=gpu.type+' · '+(gpu.renderer.includes('NVIDIA')?'NVIDIA':gpu.renderer.includes('SwiftShader')?'SOFTWARE':'CHECK GPU');
function pct(a,p){if(!a.length)return null;const sorted=a.slice().sort((x,y)=>x-y);return Math.round(sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]*100)/100;}
/** Test-only deterministic frame lock; does not change native game files.
 * Avoid comparing animation at different times or camera interpolation residuals.
 */
function lockFrame(t,name){
 if(!Number.isFinite(t)||t<0||t>100000||!['chase','orbit','bridge'].includes(name))return false;
 state.paused=true;state.t=t;mode(name);
 const amp=state.sea/3*1.05,weight=(6-state.inertia)/5;
 ship.position.y=h(0,0,t,amp)*.72;
 boat.rotation.x=Math.atan2(h(0,8,t,amp)-h(0,-6,t,amp),14)*weight*.76;
 boat.rotation.z=Math.atan2(h(-3,2,t,amp)-h(3,2,t,amp),6.6)*weight*.67;
 boat.rotation.y=Math.sin(t*.045)*.014;
 const bridge=name==='bridge';
 const target=bridge?vec(0,4.4+ship.position.y,-70):vec(0,3.3+ship.position.y,-1.5);
 const r=state.distance,a=state.azimuth,e=state.elevation;
 const dest=bridge?vec(0,4.65+ship.position.y,-6.25):target.clone().add(vec(Math.sin(a)*Math.cos(e)*r,Math.sin(e)*r,Math.cos(a)*Math.cos(e)*r));
 camera.position.copy(dest);aim.copy(target);camera.lookAt(aim);
 document.getElementById('toggle-freeze').textContent='RESUME';
 state.revision++;
 return {revision:state.revision,sceneTime:state.t,preset:name,camera:{position:camera.position.toArray(),target:aim.toArray(),fov:camera.fov}};
}
window.__NGDS_BOAT_LAB__=Object.freeze({
 inspect:()=>({schema:'ngds.boat-lab/1',revision:state.revision,scene:'alaska-offshore',engine:'threejs',state:{t:state.t,paused:state.paused,sea:state.sea,inertia:state.inertia,exposure:state.exposure,mode:state.mode},camera:{position:camera.position.toArray(),target:aim.toArray(),fov:camera.fov},objects:['23m-alaska-shrimp-workboat','ocean-surface','rock-coast','wheelhouse','front-windshield','working-deck','shrimp-net-outrigger','radar-scanner','diesel-exhaust'],gpu,frameMs:{p50:pct(frames,.5),p90:pct(frames,.9),p99:pct(frames,.99)},trust:'PAGE_DATA_ONLY_NOT_INDEPENDENT_EVIDENCE'}),
 preset:mode,
 lockFrame,
 setSea(n){if(!Number.isInteger(n)||n<1||n>5)return false;state.sea=n;document.getElementById('wave').value=n;document.getElementById('wave-n').textContent=n;state.revision++;return true;},
 pause(n){if(typeof n!=='boolean')return false;state.paused=n;state.revision++;return true;}
});
function loop(now){
 requestAnimationFrame(loop);const dt=Math.min(.07,(now-last)/1000);last=now;
 if(!state.paused)state.t+=dt;
 waterUniform.time.value=state.t;waterUniform.amp.value=state.sea/3*1.05;waterUniform.exposure.value=state.exposure;
 skyUniform.time.value=state.t;skyUniform.cloud.value=state.clear?.30:1;skyUniform.exposure.value=.86+state.exposure*.30;
 updateMotion();updateCamera(dt);sky.position.copy(camera.position);renderer.render(scene,camera);
 if(dt>.001){frames.push(dt*1000);if(frames.length>180)frames.shift();}
 elapsed+=dt;frameCount++;if(elapsed>=1){document.getElementById('fps').textContent=Math.round(frameCount/elapsed)+' FPS';frameCount=0;elapsed=0;}
}
requestAnimationFrame(loop);
setTimeout(()=>document.getElementById('loading').classList.add('hidden'),850);
window.addEventListener('error',e=>{error.hidden=false;error.textContent='3D scene error: '+(e.message||'unknown');});
})();