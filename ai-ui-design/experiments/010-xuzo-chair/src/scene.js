import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {gsap} from 'gsap';

const names=['back','seat','arm_left','arm_right','mechanism','base'];
export const chapterStops=[0,.225,.385,.555,.715,.975];
export const chapterBounds=[0,.145,.30,.465,.63,.81,1.03];

function weave(){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.clearRect(0,0,128,128);
 const g=x.createLinearGradient(0,0,0,76);g.addColorStop(0,'#404b46');g.addColorStop(.36,'#9ba59d');g.addColorStop(.65,'#737e75');g.addColorStop(1,'#414c47');x.fillStyle=g;x.fillRect(0,0,128,76);
 const v=x.createLinearGradient(0,0,40,0);v.addColorStop(0,'#3c4841');v.addColorStop(.45,'#9ca79e');v.addColorStop(1,'#414e46');x.fillStyle=v;x.fillRect(0,0,40,128);
 x.strokeStyle='#d4d8cd55';x.lineWidth=1;for(let i=3;i<40;i+=4){x.beginPath();x.moveTo(i,76);x.lineTo(i,128);x.stroke();}for(let i=4;i<76;i+=5){x.beginPath();x.moveTo(40,i);x.lineTo(128,i);x.stroke();}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(74,88);t.anisotropy=16;return t;
}
export async function mountScene(container){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.setClearColor(0xedf0ec,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.info.autoReset=false;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;container.appendChild(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xedf0ec);const camera=new THREE.PerspectiveCamera(32,1,.025,60);
 const [gltf,hdr]=await Promise.all([new GLTFLoader().loadAsync('/models/contour-01.glb'),new HDRLoader().loadAsync('/environments/studio_small_09_2k.hdr').catch(()=>null)]);
 let env;
 if(hdr){const pmrem=new THREE.PMREMGenerator(renderer);env=pmrem.fromEquirectangular(hdr);scene.environment=env.texture;scene.environmentIntensity=.62;scene.environmentRotation.y=.7;hdr.dispose();pmrem.dispose();}
 scene.add(new THREE.HemisphereLight(0xffffff,0x9ba797,.9));RectAreaLightUniformsLib.init();
 const key=new THREE.RectAreaLight(0xfffaf0,5,3,4);key.position.set(-2,3,3);key.lookAt(0,.6,0);scene.add(key);
 const rim=new THREE.RectAreaLight(0xf1f6ff,6,2,3);rim.position.set(2.5,2,-2);rim.lookAt(0,.7,0);scene.add(rim);
 const sun=new THREE.DirectionalLight(0xfff9ef,2);sun.position.set(-2,4,2.5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-2,right:2,top:2,bottom:-2,near:.1,far:12});sun.shadow.bias=-.0002;sun.shadow.normalBias=.002;sun.shadow.radius=4;scene.add(sun);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xe3e7e0,roughness:1,metalness:0}));floor.rotation.x=-Math.PI/2;floor.position.y=-.003;floor.receiveShadow=true;scene.add(floor);
 const model=gltf.scene;model.name='Contour_01';scene.add(model);const parts=Object.fromEntries(names.map(n=>[n,model.getObjectByName(n)]));if(Object.values(parts).some(p=>!p))throw new Error('Chair assembly missing');
 const weaveTex=weave();
 model.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;const m=o.material;m.envMapIntensity=.7;
  if(m.name.includes('Woven')){const t=weaveTex.clone();t.repeat.set(...(o.name.startsWith('seat')?[122,122]:[118,138]));o.material=new THREE.MeshStandardMaterial({color:0x343c36,map:t,transparent:true,depthWrite:false,side:THREE.DoubleSide,roughness:.95,metalness:0,envMapIntensity:.2});o.castShadow=false;}
  if(m.name.includes('Graphite')){m.color.setHex(0x24292c);m.roughness=.61;m.metalness=0;}
  if(m.name.includes('Soft')){m.color.setHex(0x262b2e);m.roughness=.86;m.metalness=0;}
  if(m.name.includes('Brushed')){m.roughness=.28;m.metalness=.92;}
 });
 // Broad soft footprint complements the physical shadows at the caster contacts.
 const sc=document.createElement('canvas');sc.width=sc.height=128;const sx=sc.getContext('2d'),sg=sx.createRadialGradient(64,64,2,64,64,62);sg.addColorStop(0,'rgba(34,47,35,.24)');sg.addColorStop(.5,'rgba(34,47,35,.10)');sg.addColorStop(1,'rgba(34,47,35,0)');sx.fillStyle=sg;sx.fillRect(0,0,128,128);
 const contact=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.9),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc),transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=.0005;scene.add(contact);
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});const composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));composer.addPass(new OutputPass());
 const zero={back:[0,0,0],seat:[0,0,0],arm_left:[0,0,0],arm_right:[0,0,0],mechanism:[0,0,0],base:[0,0,0]};
 const exploded={back:[0,.40,-.18],seat:[0,.25,.30],arm_left:[-.25,.30,.04],arm_right:[.25,.30,.04],mechanism:[0,.07,0],base:[0,0,0]};
 const detailPose={...exploded,back:[0,.40,-.18],seat:[0,.25,.46],arm_left:[-.36,.3,.03],arm_right:[.36,.3,.03]};
 const backPose={...detailPose,seat:[-3,.25,.46],arm_left:[-3,.3,.03],arm_right:[3,.3,.03],mechanism:[-3,.07,0],base:[-3,0,0]};
 const seatPose={...detailPose,back:[-3,.4,-.18],arm_left:[-3,.3,.03],arm_right:[3,.3,.03],mechanism:[-3,.07,0],base:[-3,0,0]};
 const armPose={...detailPose,back:[-3,.4,-.18],seat:[-3,.25,.46],arm_left:[-3,.3,.03],mechanism:[-3,.07,0],base:[-3,0,0]};
 const shots=[
  {p:0,tx:0,ty:.55,tz:0,az:.54,el:.53,dist:2.8,shift:.37,parts:zero},
  {p:.09,tx:0,ty:.55,tz:0,az:.42,el:.53,dist:2.8,shift:.37,parts:zero},
  {p:.21,tx:0,ty:.80,tz:.02,az:.30,el:.55,dist:3.85,shift:.38,parts:exploded},
  {p:.265,tx:0,ty:.80,tz:.02,az:.25,el:.55,dist:3.85,shift:.38,parts:exploded},
  {p:.365,tx:0,ty:1.19,tz:-.425,az:-.25,el:.14,dist:1.65,shift:.43,parts:backPose},
  {p:.43,tx:0,ty:1.185,tz:-.425,az:.06,el:.13,dist:1.65,shift:.43,parts:backPose},
  {p:.535,tx:0,ty:.74,tz:.495,az:.42,el:.68,dist:1.4,shift:.42,parts:seatPose},
  {p:.595,tx:0,ty:.74,tz:.495,az:.14,el:.70,dist:1.4,shift:.42,parts:seatPose},
  {p:.70,tx:.629,ty:.983,tz:.03,az:.78,el:.36,dist:.90,shift:.40,parts:armPose},
  {p:.765,tx:.629,ty:.983,tz:.03,az:.52,el:.32,dist:.90,shift:.40,parts:armPose},
  {p:.85,tx:0,ty:.80,tz:.02,az:.30,el:.55,dist:3.85,shift:.38,parts:exploded},
  {p:.965,tx:0,ty:.55,tz:0,az:.54,el:.53,dist:2.8,shift:.37,parts:zero},
  {p:1,tx:0,ty:.55,tz:0,az:.54,el:.53,dist:2.8,shift:.37,parts:zero}
 ];
 const state={};function values(s){const v={tx:s.tx,ty:s.ty,tz:s.tz,az:s.az,el:s.el,dist:s.dist,shift:s.shift};for(const n of names)for(let i=0;i<3;i++)v[n+i]=s.parts[n][i];return v;}Object.assign(state,values(shots[0]));
 const timeline=gsap.timeline({paused:true});for(let i=1;i<shots.length;i++){const a=shots[i-1],b=shots[i];timeline.to(state,{...values(b),duration:(b.p-a.p)*100,ease:'power2.inOut'},a.p*100);}
 const look=new THREE.Vector3(),projected=new THREE.Vector3();let progress=0;
 const anchors={back:new THREE.Vector3(.19,.91,-.28),seat:new THREE.Vector3(.2,.51,.18),arm_right:new THREE.Vector3(.28,.754,.04)};
 function render(p=progress){progress=p;timeline.progress(p);for(const n of names)parts[n].position.set(state[n+0],state[n+1],state[n+2]);
  look.set(state.tx,state.ty,state.tz);camera.position.set(state.tx+Math.sin(state.az)*state.dist,state.ty+state.el,state.tz+Math.cos(state.az)*state.dist);camera.lookAt(look);camera.updateProjectionMatrix();camera.projectionMatrix.elements[8]-=state.shift;camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();camera.updateMatrixWorld();model.updateMatrixWorld(true);renderer.info.reset();composer.render();
 }
 function resize(){const w=container.clientWidth,h=container.clientHeight;camera.aspect=w/h;renderer.setSize(w,h);composer.setSize(w,h);render();}
 const ro=new ResizeObserver(resize);ro.observe(container);resize();renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();container.dispatchEvent(new CustomEvent('renderfailure',{detail:'WebGL context lost'}));});
 return {render,poster(){render(0);return renderer.domElement.toDataURL('image/png');},getLabel(index){const n=index===2?'back':index===3?'seat':index===4?'arm_right':null;if(!n)return null;projected.copy(anchors[n]).add(parts[n].position).project(camera);return {x:(projected.x+1)/2,y:(1-projected.y)/2};},getState(){const focus=progress>=.30&&progress<.465?'back':progress>=.465&&progress<.63?'seat':progress>=.63&&progress<.81?'arm_right':null;let focusBounds=null;if(focus){const b=new THREE.Box3().setFromObject(parts[focus]);const points=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const v=new THREE.Vector3(x,y,z).project(camera);points.push([(v.x+1)/2,(1-v.y)/2]);}focusBounds={left:Math.min(...points.map(p=>p[0])),right:Math.max(...points.map(p=>p[0])),top:Math.min(...points.map(p=>p[1])),bottom:Math.max(...points.map(p=>p[1]))};}return {progress,focusBounds,parts:Object.fromEntries(names.map(n=>[n,parts[n].position.toArray()])),camera:camera.position.toArray(),target:look.toArray(),freeCamera:false,meshCount:30,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls};},dispose(){ro.disconnect();timeline.kill();env?.dispose();composer.dispose();renderer.dispose();}};
}
