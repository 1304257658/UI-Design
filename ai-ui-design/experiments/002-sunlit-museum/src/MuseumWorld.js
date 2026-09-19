import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {EXHIBIT_MAP} from './collection.js';
import {buildStudy} from './StudyScene.js';
import {STUDY_EXHIBITS,ENTRY,canWalkStudy} from './study-layout.js';

export class MuseumWorld{
  constructor(container,callbacks){
    this.container=container;this.cb=callbacks;this.disposed=false;this.keys=new Set();this.paused=false;this.walking=false;this.mouseDown=false;this.touchVector={x:0,z:0};this.yaw=ENTRY.yaw;this.pitch=ENTRY.pitch;this.lastNearest='';this.lookPointer=new THREE.Vector2();this.picking=[];this.reflections=[];this.textures=[];this.listeners=[];this.tick=0;this.running=true;
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(48,1,.08,160);this.camera.position.set(ENTRY.x,ENTRY.y,ENTRY.z);this.camera.rotation.order='YXZ';
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.canvas=this.renderer.domElement;this.canvas.className='world-canvas';this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label','3D 展厅。WASD 移动，拖动鼠标转头，E 体验附近展品。');container.appendChild(this.canvas);
    this.scene.add(new THREE.HemisphereLight(0xc9d7e7,0x9c7f58,.85));
    const fill=new THREE.DirectionalLight(0xdbe6fa,.65);fill.position.set(1,7,-12);this.scene.add(fill);
    this.sun=new THREE.DirectionalLight(0xffddaa,4.4);this.sun.position.set(-9,13,5);this.sun.target.position.set(1,0,-2);this.sun.castShadow=true;this.sun.shadow.mapSize.set(4096,4096);Object.assign(this.sun.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:1,far:50});this.sun.shadow.normalBias=.025;this.sun.shadow.bias=-.00006;this.sun.shadow.radius=3;this.scene.add(this.sun,this.sun.target);
    const pmrem=new THREE.PMREMGenerator(this.renderer),env=new RoomEnvironment();this.envTarget=pmrem.fromScene(env,0);this.scene.environment=this.envTarget.texture;this.scene.environmentIntensity=.32;env.dispose();pmrem.dispose();
    this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.ao=new SSAOPass(this.scene,this.camera,800,600,16);this.ao.kernelRadius=.8;this.ao.minDistance=.002;this.ao.maxDistance=.12;this.composer.addPass(this.ao);this.composer.addPass(new OutputPass());
    this.addEvents();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();this.lastTime=performance.now();this.animate=this.animate.bind(this);this.frame=requestAnimationFrame(this.animate);this.load();
  }
  on(target,name,fn,opts){target.addEventListener(name,fn,opts);this.listeners.push(()=>target.removeEventListener(name,fn,opts));}
  async load(){try{await document.fonts.ready;if(this.disposed)return;this.cb.onProgress(.15);await buildStudy(this);if(!this.disposed){this.cb.onProgress(1);this.cb.onReady();this.cb.onRoom(0);}}catch(error){if(!this.disposed)this.cb.onError('展厅材质暂时未能加载。可以重试，或打开目录阅读展品。');console.error(error);}}
  addEvents(){
    this.on(window,'keydown',e=>{if(this.paused||!this.walking||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();this.keys.add(e.code);}if(e.code==='KeyE'&&!e.repeat&&this.nearest)this.cb.onSelect(this.nearest.id);if(e.code==='KeyM'&&!e.repeat)this.cb.onDirectory();});
    this.on(window,'keyup',e=>this.keys.delete(e.code));this.on(window,'blur',()=>this.clearInput());this.on(document,'visibilitychange',()=>{if(document.hidden)this.clearInput();});
    this.on(this.canvas,'pointerdown',e=>{if(this.paused)return;this.canvas.focus({preventScroll:true});this.mouseDown=true;this.downPoint={x:e.clientX,y:e.clientY};this.lastPointer={...this.downPoint};this.canvas.setPointerCapture(e.pointerId);this.updatePointer(e);});
    this.on(this.canvas,'pointermove',e=>{if(this.paused)return;if(document.pointerLockElement===this.canvas){this.turn(-e.movementX*.002,-e.movementY*.002);return;}if(this.mouseDown){this.turn(-(e.clientX-this.lastPointer.x)*.003,-(e.clientY-this.lastPointer.y)*.003);this.lastPointer={x:e.clientX,y:e.clientY};}this.updatePointer(e);});
    this.on(this.canvas,'pointerup',e=>{if(this.paused)return;const moved=this.downPoint?Math.hypot(e.clientX-this.downPoint.x,e.clientY-this.downPoint.y):100;this.mouseDown=false;if(moved<6){this.updatePointer(e);const ray=new THREE.Raycaster();ray.setFromCamera(document.pointerLockElement===this.canvas?new THREE.Vector2():this.lookPointer,this.camera);const hit=ray.intersectObjects(this.picking)[0];if(hit){const layout=STUDY_EXHIBITS.find(x=>x.id===hit.object.userData.exhibit);if(layout&&Math.hypot(layout.x-this.camera.position.x,layout.z-this.camera.position.z)<5.7)this.cb.onSelect(layout.id);else this.cb.onNotice('再走近一点，或点击右下方的“前往”。');}}});
    this.on(this.canvas,'pointercancel',()=>this.clearInput());this.on(document,'pointerlockchange',()=>{this.clearInput();this.cb.onLockChange(document.pointerLockElement===this.canvas);});
    this.on(this.canvas,'webglcontextlost',e=>{e.preventDefault();this.running=false;this.clearInput();this.cb.onError('3D 画面暂时中断，请刷新重试；展厅目录仍可阅读。');});
  }
  updatePointer(e){const r=this.canvas.getBoundingClientRect();this.lookPointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);}
  turn(dx,dy){this.yaw+=dx;this.pitch=THREE.MathUtils.clamp(this.pitch+dy,-.65,.65);}
  clearInput(){this.keys.clear();this.mouseDown=false;this.touchVector={x:0,z:0};}
  setPaused(value){this.paused=value;this.clearInput();if(value&&document.pointerLockElement===this.canvas)document.exitPointerLock();}
  start(){this.walking=true;this.canvas.focus({preventScroll:true});}
  async lock(){try{await this.canvas.requestPointerLock();this.start();}catch{this.cb.onNotice('当前浏览器未锁定鼠标，可按住画面拖动转头。');}}
  visit(id){const ex=STUDY_EXHIBITS.find(x=>x.id===id);if(!ex)return;this.camera.position.set(ex.x,ENTRY.y,ex.z+4.5);this.yaw=0;this.pitch=.04;this.clearInput();}
  goRoom(){this.reset();}
  reset(){this.camera.position.set(ENTRY.x,ENTRY.y,ENTRY.z);this.yaw=ENTRY.yaw;this.pitch=ENTRY.pitch;this.clearInput();}
  resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.fov=w/h<.8?72:48;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);this.composer.setSize(w,h);this.ao.enabled=w>650;}
  animate(time){
    if(this.disposed)return;this.frame=requestAnimationFrame(this.animate);if(!this.running)return;const dt=Math.min((time-this.lastTime)/1000,.06);this.lastTime=time;
    if(this.walking&&!this.paused){
      const forward=(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)-(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-this.touchVector.z;
      const side=(this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0)+this.touchVector.x;
      if(this.keys.has('ArrowLeft'))this.yaw+=dt*1.1;if(this.keys.has('ArrowRight'))this.yaw-=dt*1.1;
      const v=new THREE.Vector2(side,forward);if(v.length()>1)v.normalize();const speed=(this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')?3.4:2.2)*dt;
      const dx=(v.x*Math.cos(this.yaw)-v.y*Math.sin(this.yaw))*speed,dz=(-v.x*Math.sin(this.yaw)-v.y*Math.cos(this.yaw))*speed;
      const pos=this.camera.position;if(canWalkStudy(pos.x+dx,pos.z))pos.x+=dx;if(canWalkStudy(pos.x,pos.z+dz))pos.z+=dz;
    }
    this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');
    if(time-this.tick>150){this.tick=time;const p=this.camera.position,nearest=STUDY_EXHIBITS.map(ex=>({ex,d:Math.hypot(ex.x-p.x,ex.z-p.z)})).sort((a,b)=>a.d-b.d)[0];this.nearest=nearest?.d<5.7?EXHIBIT_MAP[nearest.ex.id]:null;const key=this.nearest?.id||'';if(key!==this.lastNearest){this.lastNearest=key;this.cb.onNear(this.nearest);}this.canvas.dataset.worldX=p.x.toFixed(2);this.canvas.dataset.worldZ=p.z.toFixed(2);this.canvas.dataset.yaw=this.yaw.toFixed(2);this.canvas.dataset.room='0';}
    this.composer.render();
  }
  dispose(){this.disposed=true;cancelAnimationFrame(this.frame);this.listeners.forEach(fn=>fn());this.resizeObserver.disconnect();if(document.pointerLockElement===this.canvas)document.exitPointerLock();this.reflections.forEach(x=>x.dispose());const textures=new Set(this.textures);this.scene.traverse(obj=>{obj.geometry?.dispose();const mats=obj.material?(Array.isArray(obj.material)?obj.material:[obj.material]):[];for(const m of mats){for(const val of Object.values(m))if(val?.isTexture)textures.add(val);m.dispose();}obj.customDepthMaterial?.dispose();});textures.forEach(t=>t.dispose());this.envTarget.dispose();for(const pass of this.composer.passes)pass.dispose?.();this.composer.dispose();this.renderer.dispose();this.canvas.remove();}
}
