import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EXHIBITS, ROOMS, canOccupy} from './collection.js';

const asset=(name)=>`/assets/${name}`;
function canvasMap(w,h,paint){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;paint(canvas.getContext('2d'),w,h);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;return map;}
function wrap(ctx,text,x,y,maxWidth,lineHeight){let line='';for(const c of text){if(c==='\n'){ctx.fillText(line,x,y);line='';y+=lineHeight;continue;}if(ctx.measureText(line+c).width>maxWidth){ctx.fillText(line,x,y);line=c;y+=lineHeight;}else line+=c;}ctx.fillText(line,x,y);return y;}
function specimenMap(ex,photo){return canvasMap(640,1000,(c,w,h)=>{
  const dark=ex.skin==='cyber',glass=ex.skin==='glass',brutal=ex.skin==='brutal',editorial=ex.skin==='editorial';
  c.clearRect(0,0,w,h);c.fillStyle=glass?'rgba(245,248,248,.2)':dark?'#132027':brutal?'#f1cf36':editorial?'#f2ebdf':ex.skin==='soft'?'#dde1e0':'#f9f6ef';c.fillRect(0,0,w,h);
  const ink=dark?'#a9e5ce':editorial?'#713f37':'#292b29';c.fillStyle=ink;c.font='25px Georgia, serif';c.fillText(ex.room===0?'Serene / study':'Studio / interact',44,62);c.font='20px Georgia';c.fillText('0'+(EXHIBITS.indexOf(ex)%6+1),550,62);
  c.strokeStyle=brutal?'#21221e':dark?'#70b79f':'rgba(50,45,40,.2)';c.lineWidth=brutal?5:1;c.beginPath();c.moveTo(44,85);c.lineTo(596,85);c.stroke();
  c.fillStyle=ink;c.font=`${brutal?'bold ':''}${brutal?75:64}px ${editorial?'Georgia,':'"Songti SC", "SimSun",'} serif`;wrap(c,ex.title,44,175,555,86);
  if(photo){c.save();c.beginPath();c.roundRect(44,480,552,240,glass?18:0);c.clip();c.globalAlpha=glass?.55:1;c.drawImage(photo,300,100,1200,500,44,480,552,240);c.restore();}
  c.fillStyle=ink;c.font='24px "Microsoft YaHei",sans-serif';c.fillText(ex.name,44,770);c.font='19px "Microsoft YaHei",sans-serif';c.globalAlpha=.72;wrap(c,ex.short,44,814,550,32);c.globalAlpha=1;
  c.fillStyle=dark?'#90cfb9':brutal?'#282a22':editorial?'#754339':'#f9f8f0';c.beginPath();c.roundRect(44,894,552,61,brutal?0:11);c.fill();c.fillStyle=dark?'#152321':brutal||editorial?'#fff':'#35362e';c.font='23px "Microsoft YaHei",sans-serif';c.fillText(ex.kind==='style'?'观察这种风格':'体验这个交互',75,934);c.fillText('→',537,934);
});}
function plaqueMap(title,sub){return canvasMap(1024,220,(c,w)=>{c.textAlign='center';c.fillStyle='#423b30';c.font='45px "Songti SC", "SimSun", serif';c.fillText(title,w/2,90);c.font='18px Georgia,serif';c.fillText(sub,w/2,145);});}

export class MuseumWorld{
  constructor(container,callbacks){
    this.container=container;this.cb=callbacks;this.disposed=false;this.keys=new Set();this.paused=false;this.walking=false;this.mouseDown=false;this.touchVector={x:0,z:0};this.yaw=0;this.pitch=0;this.lastRoom=-1;this.lastNearest='';this.lookPointer=new THREE.Vector2(0,0);this.picking=[];this.exhibitObjects=new Map();this.reflections=[];this.disposables=[];this.listeners=[];this.tick=0;this.running=true;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#d6e1df');this.scene.fog=new THREE.Fog('#e9e5d9',65,150);
    this.camera=new THREE.PerspectiveCamera(57,1,.08,190);this.camera.position.set(0,1.85,8.8);this.camera.rotation.order='YXZ';
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.03;this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.canvas=this.renderer.domElement;this.canvas.className='world-canvas';this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label','3D 展厅。WASD 移动，拖动鼠标转头，E 体验附近展品。');container.appendChild(this.canvas);
    this.scene.add(new THREE.HemisphereLight(0xe5eeef,0xb8a386,2.35));
    this.sun=new THREE.DirectionalLight(0xffe2b7,3.3);this.sun.position.set(-12,17,9);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:1,far:65});this.sun.shadow.normalBias=.05;this.sun.shadow.bias=-.00015;this.scene.add(this.sun,this.sun.target);
    const pmrem=new THREE.PMREMGenerator(this.renderer),env=new RoomEnvironment();this.envTarget=pmrem.fromScene(env,.045);this.scene.environment=this.envTarget.texture;this.scene.environmentIntensity=.25;env.dispose();pmrem.dispose();
    this.addEvents();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();this.lastTime=performance.now();this.animate=this.animate.bind(this);this.frame=requestAnimationFrame(this.animate);this.load();
  }
  on(target,name,fn,opts){target.addEventListener(name,fn,opts);this.listeners.push(()=>target.removeEventListener(name,fn,opts));}
  async load(){
    try{
      const loader=new THREE.TextureLoader();let completed=0;const loaded=()=>this.cb.onProgress(++completed/2);
      const [stone,landscape]=await Promise.all([loader.loadAsync(asset('travertine.png')).then(t=>{loaded();return t;}),loader.loadAsync(asset('landscape.png')).then(t=>{loaded();return t;})]);
      if(this.disposed){stone.dispose();landscape.dispose();return;}
      stone.colorSpace=landscape.colorSpace=THREE.SRGBColorSpace;stone.wrapS=stone.wrapT=THREE.RepeatWrapping;stone.anisotropy=Math.min(this.renderer.capabilities.getMaxAnisotropy(),8);this.stone=stone;this.landscape=landscape;
      this.stoneMat=new THREE.MeshStandardMaterial({map:stone,color:0xf6efdf,roughness:.75});this.woodMat=new THREE.MeshStandardMaterial({color:0x8d7151,roughness:.66});this.trimMat=new THREE.MeshStandardMaterial({color:0x715f45,metalness:.4,roughness:.45});
      const panorama=new THREE.Mesh(new THREE.CylinderGeometry(82,82,48,64,1,true),new THREE.MeshBasicMaterial({map:landscape,side:THREE.BackSide,fog:false}));panorama.position.set(0,13,-14);panorama.rotation.y=Math.PI/2;this.scene.add(panorama);
      this.box(190,.15,190,0,-.35,-14,new THREE.MeshStandardMaterial({color:0x9da58d,roughness:1}),false);
      ROOMS.forEach(room=>this.buildRoom(room));this.buildCorridor();EXHIBITS.forEach(ex=>this.buildExhibit(ex));
      this.cb.onReady();
    }catch(error){if(!this.disposed)this.cb.onError('展厅材质暂时未能加载。可以重试，或打开目录阅读展品。');console.error(error);}
  }
  box(w,h,d,x,y,z,mat=this.stoneMat,shadow=true){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;this.scene.add(m);return m;}
  buildRoom(room){
    const z=room.center;
    const floorMap=this.stone.clone();floorMap.repeat.set(7,8);floorMap.needsUpdate=true;const floorMat=new THREE.MeshStandardMaterial({map:floorMap,color:0xf4ead7,roughness:.32,metalness:.03});this.box(20,.22,24,0,-.12,z,floorMat,false);
    const reflect=new Reflector(new THREE.PlaneGeometry(19.9,23.9),{textureWidth:512,textureHeight:512,color:0xada38f,multisample:0});reflect.rotation.x=-Math.PI/2;reflect.position.set(0,.008,z);reflect.material.transparent=true;reflect.material.depthWrite=false;reflect.material.fragmentShader=reflect.material.fragmentShader.replace('vec4( blendOverlay( base.rgb, color ), 1.0 )','vec4( blendOverlay( base.rgb, color ), 0.12 )');this.scene.add(reflect);this.reflections.push(reflect);
    // Travertine floor joints are actual inlaid geometry, not a painted perspective background.
    const jointMat=new THREE.MeshStandardMaterial({color:0xc7bda9,roughness:.8});for(let x=-8;x<=8;x+=4)this.box(.012,.006,24,x,.018,z,jointMat,false);for(let dz=-10;dz<=10;dz+=4)this.box(20,.006,.012,0,.018,z+dz,jointMat,false);
    for(const x of [-10,10]){
      this.box(.5,.6,24,x,.3,z);this.box(.55,1.05,24,x,6.15,z);
      for(let dz=-12;dz<=12;dz+=4){this.box(.65,5.8,.65,x,3.2,z+dz);this.box(.12,5.2,.1,x-.2*Math.sign(x),3.1,z+dz+2,this.trimMat);}
    }
    // The back opens into the next gallery through a real walkable central passage.
    for(const x of [-6.3,6.3]){this.box(7.4,.6,.4,x,.3,z-12);this.box(7.4,.9,.55,x,6.2,z-12);for(const dx of [-3.5,0,3.5])this.box(.45,5.8,.6,x+dx,3.1,z-12);}
    this.box(4.8,2,.7,0,5.7,z-12);this.box(.6,4.7,.7,-2.6,2.35,z-12);this.box(.6,4.7,.7,2.6,2.35,z-12);
    if(room.id===0){this.box(20,6.8,.45,0,3.4,z+12);this.box(8,.06,1.25,0,.43,z+10,this.woodMat);}
    else {for(const x of [-6.3,6.3])this.box(7.4,6.8,.45,x,3.4,z+12);this.box(4.8,2,.5,0,5.7,z+12);}
    // A wide circular skylight with a substantial curved stone rim.
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(7.5,7.5,1.0,96,1,true),this.stoneMat);rim.position.set(0,6.15,z);rim.material=this.stoneMat.clone();rim.material.side=THREE.DoubleSide;rim.receiveShadow=true;rim.castShadow=true;this.scene.add(rim);
    const ceiling=new THREE.Mesh(new THREE.RingGeometry(7.5,16,96),this.stoneMat);ceiling.rotation.x=Math.PI/2;ceiling.position.set(0,6.7,z);ceiling.material=this.stoneMat.clone();ceiling.material.side=THREE.DoubleSide;ceiling.receiveShadow=true;ceiling.castShadow=true;this.scene.add(ceiling);
    const skylightRing=new THREE.Mesh(new THREE.TorusGeometry(7.5,.06,8,96),this.trimMat);skylightRing.rotation.x=Math.PI/2;skylightRing.position.set(0,6.73,z);this.scene.add(skylightRing);
    for(let i=0;i<8;i++){const a=i*Math.PI/4,beam=this.box(15,.075,.06,0,6.85,z,this.trimMat);beam.rotation.y=a;}
    const roomTitle=new THREE.Mesh(new THREE.PlaneGeometry(3.7,.8),new THREE.MeshBasicMaterial({map:plaqueMap(room.id===0?'交互与回应  /  02':'材质与风格  /  01','THE NEXT GALLERY'),transparent:true,depthWrite:false}));roomTitle.position.set(0,5.35,room.id===0?z-11.6:z+11.6);if(room.id===1)roomTitle.rotation.y=Math.PI;this.scene.add(roomTitle);
    // A low lateral bench helps make the room feel inhabited without crowding circulation.
    for(const x of [-8.5,8.5]){this.box(.85,.14,4,x,.65,z+3,this.woodMat);this.box(.5,.58,.4,x,.29,z+1.5);this.box(.5,.58,.4,x,.29,z+4.5);}
    if(room.id===0){const text=new THREE.Mesh(new THREE.PlaneGeometry(4.4,1),new THREE.MeshBasicMaterial({map:plaqueMap('好的界面，让生活更美好','A COLLECTION OF LITTLE DISCOVERIES'),transparent:true}));text.position.set(0,3.4,z+11.74);text.rotation.y=Math.PI;this.scene.add(text);}
  }
  buildCorridor(){this.box(5,.22,4,0,-.12,-14);this.box(.5,5,4,-2.55,2.5,-14);this.box(.5,5,4,2.55,2.5,-14);this.box(5.5,.2,4,0,5,-14);}
  buildExhibit(ex){
    const base=this.box(2.7,.82,1.25,ex.x,.41,ex.z);base.userData.exhibit=ex.id;this.picking.push(base);
    this.box(2.78,.09,1.31,ex.x,.865,ex.z,this.stoneMat);
    const glass=ex.skin==='glass',dark=ex.skin==='cyber',brutal=ex.skin==='brutal';
    const glassMat=new THREE.MeshPhysicalMaterial({color:0xf4fcff,metalness:0,roughness:.18,transmission:.66,thickness:.25,ior:1.25,transparent:true,opacity:1,clearcoat:1,envMapIntensity:.65});
    const mat=glass?glassMat:new THREE.MeshStandardMaterial({color:dark?0x182932:brutal?0xe4c641:0xf0eee8,roughness:ex.skin==='soft'?.9:.5});
    const body=new THREE.Mesh(new RoundedBoxGeometry(1.94,3.02,.14,3,brutal?.015:.11),mat);body.position.set(ex.x,2.46,ex.z);body.castShadow=true;body.receiveShadow=true;body.userData.exhibit=ex.id;this.scene.add(body);this.picking.push(body);
    if(brutal){const backing=this.box(2.04,3.1,.1,ex.x+.055,2.405,ex.z-.09,new THREE.MeshStandardMaterial({color:0x242421,roughness:.7}));backing.userData.exhibit=ex.id;this.picking.push(backing);}
    const front=new THREE.Mesh(new THREE.PlaneGeometry(1.81,2.83),new THREE.MeshBasicMaterial({map:specimenMap(ex,this.landscape.image),transparent:true,depthWrite:false,toneMapped:false}));front.position.set(ex.x,2.46,ex.z+.078);front.userData.exhibit=ex.id;this.scene.add(front);this.picking.push(front);
    const plaque=new THREE.Mesh(new THREE.PlaneGeometry(2.5,.54),new THREE.MeshBasicMaterial({map:plaqueMap(ex.name,ex.en),transparent:true,depthWrite:false}));plaque.position.set(ex.x,.45,ex.z+.631);this.scene.add(plaque);
    this.exhibitObjects.set(ex.id,{body,front,ex});
  }
  addEvents(){
    this.on(window,'keydown',e=>{if(this.paused||!this.walking||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();this.keys.add(e.code);}if(e.code==='KeyE'&&!e.repeat&&this.nearest)this.cb.onSelect(this.nearest.id);if(e.code==='KeyM'&&!e.repeat)this.cb.onDirectory();});
    this.on(window,'keyup',e=>this.keys.delete(e.code));this.on(window,'blur',()=>this.clearInput());this.on(document,'visibilitychange',()=>{if(document.hidden)this.clearInput();});
    this.on(this.canvas,'pointerdown',e=>{if(this.paused)return;this.canvas.focus({preventScroll:true});this.mouseDown=true;this.downPoint={x:e.clientX,y:e.clientY};this.lastPointer={x:e.clientX,y:e.clientY};this.canvas.setPointerCapture(e.pointerId);});
    this.on(this.canvas,'pointermove',e=>{if(this.paused)return;if(document.pointerLockElement===this.canvas){this.turn(-e.movementX*.002,-e.movementY*.002);return;}if(this.mouseDown){this.turn(-(e.clientX-this.lastPointer.x)*.003,-(e.clientY-this.lastPointer.y)*.003);this.lastPointer={x:e.clientX,y:e.clientY};}const r=this.canvas.getBoundingClientRect();this.lookPointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);});
    this.on(this.canvas,'pointerup',e=>{if(this.paused)return;const moved=this.downPoint?Math.hypot(e.clientX-this.downPoint.x,e.clientY-this.downPoint.y):100;this.mouseDown=false;if(moved<6){const ray=new THREE.Raycaster();ray.setFromCamera(document.pointerLockElement===this.canvas?new THREE.Vector2(0,0):this.lookPointer,this.camera);const hit=ray.intersectObjects(this.picking)[0];if(hit){const ex=EXHIBITS.find(x=>x.id===hit.object.userData.exhibit);if(ex&&Math.hypot(ex.x-this.camera.position.x,ex.z-this.camera.position.z)<5.4)this.cb.onSelect(ex.id);else this.cb.onNotice('再走近一点，或从展厅目录直接前往。');}}});
    this.on(this.canvas,'pointercancel',()=>this.clearInput());this.on(document,'pointerlockchange',()=>{this.clearInput();this.cb.onLockChange(document.pointerLockElement===this.canvas);});
    this.on(this.canvas,'webglcontextlost',e=>{e.preventDefault();this.running=false;this.clearInput();this.cb.onError('3D 画面暂时中断，请刷新重试；展厅目录仍可阅读。');});
  }
  turn(dx,dy){this.yaw+=dx;this.pitch=THREE.MathUtils.clamp(this.pitch+dy,-.65,.65);}
  clearInput(){this.keys.clear();this.mouseDown=false;this.touchVector={x:0,z:0};}
  setPaused(value){this.paused=value;this.clearInput();if(value&&document.pointerLockElement===this.canvas)document.exitPointerLock();}
  start(){this.walking=true;this.canvas.focus({preventScroll:true});}
  async lock(){try{await this.canvas.requestPointerLock();this.start();}catch{this.cb.onNotice('当前浏览器未锁定鼠标，可按住画面拖动转头。');}}
  visit(id){const ex=EXHIBITS.find(x=>x.id===id);if(!ex)return;this.camera.position.set(ex.x,1.85,ex.z+3.5);this.yaw=0;this.pitch=.11;this.clearInput();}
  goRoom(id){this.camera.position.set(0,1.85,ROOMS[id].center+8.8);this.yaw=0;this.pitch=0;this.clearInput();}
  reset(){this.goRoom(0);}
  resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.fov=w/h<.8?72:57;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);}
  animate(time){
    if(this.disposed)return;this.frame=requestAnimationFrame(this.animate);if(!this.running)return;
    const dt=Math.min((time-this.lastTime)/1000,.045);this.lastTime=time;
    if(this.walking&&!this.paused){
      const forward=(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)-(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-this.touchVector.z;
      const side=(this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0)+this.touchVector.x;
      if(this.keys.has('ArrowLeft'))this.yaw+=dt*1.35;if(this.keys.has('ArrowRight'))this.yaw-=dt*1.35;
      const v=new THREE.Vector2(side,forward);if(v.length()>1)v.normalize();const speed=(this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')?4.2:2.6)*dt;
      const dx=(v.x*Math.cos(this.yaw)-v.y*Math.sin(this.yaw))*speed,dz=(-v.x*Math.sin(this.yaw)-v.y*Math.cos(this.yaw))*speed;
      const pos=this.camera.position;if(canOccupy(pos.x+dx,pos.z))pos.x+=dx;if(canOccupy(pos.x,pos.z+dz))pos.z+=dz;
    }
    this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');
    if(time-this.tick>120){this.tick=time;const pos=this.camera.position,room=pos.z<-14?1:0;const nearest=EXHIBITS.filter(ex=>ex.room===room).map(ex=>({ex,d:Math.hypot(ex.x-pos.x,ex.z-pos.z)})).sort((a,b)=>a.d-b.d)[0];this.nearest=nearest?.d<5.4?nearest.ex:null;const key=this.nearest?.id||'';if(key!==this.lastNearest){this.lastNearest=key;this.cb.onNear(this.nearest);}if(room!==this.lastRoom){this.lastRoom=room;this.cb.onRoom(room);this.sun.position.set(-12,17,ROOMS[room].center+9);this.sun.target.position.set(0,0,ROOMS[room].center);}
      this.canvas.dataset.worldX=pos.x.toFixed(2);this.canvas.dataset.worldZ=pos.z.toFixed(2);this.canvas.dataset.yaw=this.yaw.toFixed(2);this.canvas.dataset.room=String(room);
      this.reflections.forEach((r,i)=>r.visible=i===room);
    }
    this.renderer.render(this.scene,this.camera);
  }
  dispose(){this.disposed=true;cancelAnimationFrame(this.frame);this.listeners.forEach(fn=>fn());this.resizeObserver.disconnect();if(document.pointerLockElement===this.canvas)document.exitPointerLock();this.reflections.forEach(x=>x.dispose());const textures=new Set();this.scene.traverse(obj=>{obj.geometry?.dispose();const mats=obj.material?(Array.isArray(obj.material)?obj.material:[obj.material]):[];for(const m of mats){for(const val of Object.values(m))if(val?.isTexture)textures.add(val);m.dispose();}});textures.forEach(t=>t.dispose());this.envTarget.dispose();this.renderer.dispose();this.canvas.remove();}
}
