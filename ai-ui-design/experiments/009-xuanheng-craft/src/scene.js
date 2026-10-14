import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { createAssembly } from './assembly.js';
import { createMachine } from './machine.js';
import { clamp, smooth, phase, manufacturingPose } from './timeline.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export async function mountScene(container,onReady,onError){
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch(error){onError(error);return {update(){},dispose(){}};}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0x0d0f12,0);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.82;renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;container.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.035,160);
  const environment=new THREE.Scene();environment.background=new THREE.Color(0x262a30);
  function softbox(position,size,color,intensity){const material=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide});const box=new THREE.Mesh(new THREE.PlaneGeometry(...size),material);box.position.set(...position);box.lookAt(0,0,0);environment.add(box);}
  softbox([-4,5,5],[5,8],0xffffff,5);softbox([5,1,2],[2,9],0xe8edff,3);softbox([0,7,-4],[7,3],0xffffff,5);softbox([-6,-3,1],[3,6],0xdce6ff,1.5);softbox([0,1,9],[9,5],0xffffff,1.2);
  const pmrem=new THREE.PMREMGenerator(renderer),envTarget=pmrem.fromScene(environment,.025);scene.environment=envTarget.texture;
  environment.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});pmrem.dispose();
  let photographicEnvironment;
  try{const hdr=await new HDRLoader().loadAsync(`${import.meta.env.BASE_URL}environments/studio_small_09_2k.hdr`);const generator=new THREE.PMREMGenerator(renderer);photographicEnvironment=generator.fromEquirectangular(hdr);scene.environment=photographicEnvironment.texture;scene.environmentRotation.y=-.65;scene.environmentIntensity=.4;hdr.dispose();generator.dispose();}catch(error){console.warn('Studio environment unavailable; using built-in lighting.',error.message);}
  RectAreaLightUniformsLib.init();
  const key=new THREE.RectAreaLight(0xffffff,4,7,10);key.position.set(-5,7,7);key.lookAt(0,0,0);scene.add(key);
  const rim=new THREE.RectAreaLight(0xd7e1ff,5,4,8);rim.position.set(6,3,-3);rim.lookAt(0,0,0);scene.add(rim);
  const fill=new THREE.RectAreaLight(0xe1eaff,.5,5,6);fill.position.set(0,2,9);fill.lookAt(0,0,0);scene.add(fill);
  const machiningLight=new THREE.RectAreaLight(0xfff3df,3,1.3,3);machiningLight.position.set(-1,3,1.4);machiningLight.lookAt(0,0,0);scene.add(machiningLight);
  const sun=new THREE.DirectionalLight(0xfff1e2,1.8);sun.position.set(-4,9,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.radius=5;sun.shadow.blurSamples=8;Object.assign(sun.shadow.camera,{left:-9,right:9,top:10,bottom:-8,near:.1,far:38});sun.shadow.bias=-.00015;sun.shadow.normalBias=.012;scene.add(sun);
  const {assembly}=createAssembly(renderer);assembly.scale.setScalar(.42);assembly.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(assembly);
  const machine=createMachine();scene.add(machine.root);
  const floorCanvas=document.createElement('canvas');floorCanvas.width=floorCanvas.height=512;const fc=floorCanvas.getContext('2d');
  const fade=fc.createRadialGradient(256,256,10,256,256,252);fade.addColorStop(0,'white');fade.addColorStop(.28,'white');fade.addColorStop(.8,'black');fc.fillStyle=fade;fc.fillRect(0,0,512,512);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:0x030406,roughness:.88,metalness:.1,transparent:true,alphaMap:new THREE.CanvasTexture(floorCanvas),depthWrite:false}));floor.name='studio-floor';floor.rotation.x=-Math.PI/2;floor.position.y=-3.62;floor.receiveShadow=true;machine.modules.base.add(floor);
  class IndustrialAO extends GTAOPass{
    _overrideVisibility(){super._overrideVisibility();this.scene.traverse(o=>{if(o.isMesh&&o.visible&&o.material.transparent&&o.material.opacity<.9){o.visible=false;this._visibilityCache.push(o);}});}
  }
  const targetBuffer=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});const composer=new EffectComposer(renderer,targetBuffer);
  const renderPass=new RenderPass(scene,camera),ao=new IndustrialAO(scene,camera,1,1,undefined,{radius:.6,thickness:.8,distanceFallOff:1,scale:1,samples:16},{radius:5,samples:16});ao.blendIntensity=1.3;
  composer.addPass(renderPass);composer.addPass(ao);composer.addPass(new OutputPass());
  renderer.info.autoReset=false;
  function render(){renderer.info.reset();composer.render();}
  let mobile=false,visible=true,current=0,target=0,raf=0,last=0,dirty=true,ready=false,contextLost=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const look=new THREE.Vector3(),working=new THREE.Quaternion(),hero=new THREE.Quaternion(),spin=new THREE.Quaternion();let pose=manufacturingPose(0);
  // A conservative radial envelope follows this flange more closely than a world-aligned box.
  const productFramePoints=[[2.10,-.283],[2.10,.018],[1.34,.05],[.78,.855],[.88,-.55]].flatMap(([r,z])=>Array.from({length:128},(_,i)=>new THREE.Vector3(Math.cos(i*Math.PI/64)*r,Math.sin(i*Math.PI/64)*r,z)));
  const projectedCorner=new THREE.Vector3();let productScreenRight=1;
  const desktopShots=[
    {p:0,cam:[15,5.5,27],look:[-3.1,1.1,0]},
    {p:.085,cam:[14.3,5.3,25],look:[-3.0,1.1,0]},
    {p:.235,cam:[2.15,1.85,2.45],look:[-.35,.55,0]},
    {p:.300,cam:[1.95,1.65,2.35],look:[-.25,.45,0]},
    {p:.395,cam:[-2.2,1.5,2.40],look:[.24,.36,0]},
    {p:.470,cam:[-.5,2.8,2.45],look:[.18,.22,0]},
    {p:.530,cam:[2.4,1.7,4.6],look:[-.25,.3,0]},
    {p:.620,cam:[2.0,1.5,5.3],look:[-.48,.36,0]},
    {p:.720,cam:[1.7,1.25,4.7],look:[-.50,.40,0]},
    {p:.800,cam:[-1.25,1.05,2.45],look:[.57,.59,.10]},
    {p:.855,cam:[-1.3,.8,3.1],look:[.53,.56,.12]},
    {p:.905,cam:[1.25,.50,-2.9],look:[-.40,.50,.02]},
    {p:.970,cam:[2.0,1.4,4.6],look:[-.60,.47,0]},
    {p:1,cam:[2.0,1.4,4.6],look:[-.60,.47,0]},
  ];
  const mobileShots=[
    {p:0,cam:[19.5,11,33],look:[0,5.4,0]},
    {p:.085,cam:[18,10,31],look:[0,5.4,0]},
    {p:.235,cam:[1.95,3.1,2.4],look:[0,1.1,0]},
    {p:.300,cam:[1.85,2.8,2.40],look:[0,1.0,0]},
    {p:.395,cam:[-2.2,2.5,2.40],look:[0,1.0,0]},
    {p:.470,cam:[-.5,3.6,2.40],look:[0,1.0,0]},
    {p:.530,cam:[2.5,2.4,6.0],look:[0,1.8,0]},
    {p:.620,cam:[2.1,2.2,6.5],look:[0,1.05,0]},
    {p:.720,cam:[1.8,1.8,5.8],look:[0,1.18,0]},
    {p:.800,cam:[-1.0,1.45,3.7],look:[0,1.35,0]},
    {p:.855,cam:[-.8,1.2,3.4],look:[0,1.32,.12]},
    {p:.905,cam:[1.25,1.1,-3.9],look:[0,1.4,.02]},
    {p:.970,cam:[2.0,2.0,5.6],look:[0,1.65,0]},
    {p:1,cam:[2.0,2.0,5.6],look:[0,1.65,0]},
  ];
  function applyPose(p){
    pose=manufacturingPose(p);const {modules,carriage,cutter,rotary}=machine;
    modules.left.position.set(-pose.enclosure*23,0,0);modules.right.position.set(pose.enclosure*23,0,0);
    modules.roof.position.set(0,pose.enclosure*20,0);modules.rear.position.set(0,pose.enclosure*23,-pose.enclosure*16);
    modules.base.position.set(0,-pose.fixture*22,0);modules.fixture.position.set(0,-pose.fixture*19,0);modules.head.position.set(0,pose.head*21,0);
    // Cull the fully departed set only after its solid exit, so later orbit views cannot see it again.
    machine.root.visible=p<.76;
    carriage.position.set(pose.toolX,pose.tip,pose.toolZ);cutter.rotation.y=pose.cutterRotation;rotary.rotation.y=pose.index;
    // Open the jaws before withdrawing the table; no opacity changes or residual copies.
    machine.jaws.forEach(jaw=>jaw.position.z=1.05+pose.release*.26);
    machine.doorLeft.position.x=-phase(p,.105,.15)*3.05;machine.doorRight.position.x=phase(p,.105,.15)*3.05;
    // Doors return closed before machining, while the virtual camera is already inside.
    const close=phase(p,.16,.205);machine.doorLeft.position.x*=1-close;machine.doorRight.position.x*=1-close;
    working.setFromEuler(new THREE.Euler(-Math.PI/2,pose.index,0,'YXZ'));
    hero.setFromEuler(new THREE.Euler(-.16,.2,-.30));assembly.quaternion.copy(working).slerp(hero,pose.presentation);
    const productTurn=phase(p,.74,.94)*.28;spin.setFromAxisAngle(new THREE.Vector3(0,1,0),productTurn);assembly.quaternion.premultiply(spin);
    assembly.position.set(0,.12+pose.presentation*.40,0);
    const shots=mobile?mobileShots:desktopShots;let i=0;while(i<shots.length-2&&p>shots[i+1].p)i++;
    const a=shots[i],b=shots[i+1],t=smooth((p-a.p)/(b.p-a.p));
    for(let j=0;j<3;j++){const axis=['x','y','z'][j];camera.position[axis]=THREE.MathUtils.lerp(a.cam[j],b.cam[j],t);look[axis]=THREE.MathUtils.lerp(a.look[j],b.look[j],t);}
    // Travel around the part for front/back inspection instead of crossing its centre.
    if(a.p>=.855){
      const startAngle=Math.atan2(a.cam[0],a.cam[2]);let endAngle=Math.atan2(b.cam[0],b.cam[2]);
      while(endAngle>startAngle)endAngle-=Math.PI*2;
      const angle=THREE.MathUtils.lerp(startAngle,endAngle,t);
      const radius=THREE.MathUtils.lerp(Math.hypot(a.cam[0],a.cam[2]),Math.hypot(b.cam[0],b.cam[2]),t);
      camera.position.x=Math.sin(angle)*radius;camera.position.z=Math.cos(angle)*radius;
      if(!mobile){const offset=THREE.MathUtils.lerp(.53,-.6,phase(p,.93,.97));look.set(Math.cos(angle)*offset,.52,-Math.sin(angle)*offset);}
    }
    const closeLens=phase(p,.13,.23)*(1-phase(p,.48,.55));camera.fov=mobile?42+closeLens*23:32+closeLens*14;camera.updateProjectionMatrix();
    camera.lookAt(look);camera.updateMatrixWorld();
    // Keep the complete projected bounds out of the editorial column, including in-between angles.
    if(!mobile){
      const reserve=phase(p,.685,.72)*(1-phase(p,.945,.975));
      assembly.updateWorldMatrix(true,true);let right=-Infinity;
      for(const point of productFramePoints){
        projectedCorner.copy(point).applyMatrix4(assembly.matrixWorld).project(camera);right=Math.max(right,projectedCorner.x);
      }
      const shift=Math.max(0,right-.20)*reserve;
      camera.projectionMatrix.elements[8]+=shift;camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      productScreenRight=(right-shift+1)/2;
    }
  }
  function request(){if(!raf&&visible&&!document.hidden&&!contextLost)raf=requestAnimationFrame(draw);}
  function resize(){const w=container.clientWidth,h=container.clientHeight;mobile=w<981;camera.aspect=w/h;camera.fov=mobile?42:32;camera.updateProjectionMatrix();renderer.setSize(w,h);composer.setSize(w,h);dirty=true;request();}
  function draw(now){raf=0;const dt=last?Math.min((now-last)/1000,.08):.016;last=now;current=reduced.matches?target:THREE.MathUtils.lerp(current,target,1-Math.exp(-dt*9));if(Math.abs(current-target)<.00005)current=target;applyPose(current);render();dirty=false;if(!ready){ready=true;onReady();}if(current!==target)request();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);
  const visibilityObserver=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible){dirty=true;request();}},{rootMargin:'100px'});visibilityObserver.observe(container);
  const visibility=()=>{if(!document.hidden){last=0;request();}};document.addEventListener('visibilitychange',visibility);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;cancelAnimationFrame(raf);raf=0;onError(new Error('WebGL context lost'));});
  resize();
  return {
    update(p){target=clamp(p);if(dirty||Math.abs(target-current)>.00001)request();},
    capturePoster(){const saved=current;applyPose(0);render();const image=renderer.domElement.toDataURL('image/png');applyPose(saved);render();return image;},
    getState(){return {progress:current,target,camera:camera.position.toArray(),look:look.toArray(),productScreenRight,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,machineVisible:machine.root.visible,manufacturing:{...pose},productPosition:assembly.position.toArray(),modules:Object.fromEntries(Object.entries(machine.modules).map(([k,g])=>[k,g.position.toArray()])),retreatStyle:'solid-translation',freeCamera:false};},
    dispose(){cancelAnimationFrame(raf);resizeObserver.disconnect();visibilityObserver.disconnect();document.removeEventListener('visibilitychange',visibility);envTarget.dispose();photographicEnvironment?.dispose();composer.passes.forEach(p=>p.dispose?.());composer.dispose();const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{materials.add(m);Object.values(m).forEach(v=>{if(v?.isTexture)textures.add(v);});});}});geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());renderer.dispose();}
  };
}
