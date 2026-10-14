import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { industrialMaterials } from './industrial-materials.js';

// A coherent enclosed machining cell, informed by the UMC enclosure / trunnion layout.
// All moving modules remain opaque; retirement is translation, never alpha animation.
export function createMachine(){
  const root=new THREE.Group();root.name='enclosed-five-axis-cell';
  const modules={};
  for(const name of ['left','right','roof','rear','base','fixture','head']){const g=new THREE.Group();g.name=name;modules[name]=g;root.add(g);}
  const {painted,graphite,steel,bright,liner}=industrialMaterials();
  const black=new THREE.MeshStandardMaterial({color:0x080c11,metalness:.2,roughness:.65});
  const orange=new THREE.MeshStandardMaterial({color:0xc7592b,metalness:.3,roughness:.38});
  const led=new THREE.MeshStandardMaterial({color:0xe2efff,emissive:0xd1e4ff,emissiveIntensity:3});
  const screwGeometry=new THREE.CylinderGeometry(.044,.044,.024,12);
  const rounded=new Map();
  function mesh(g,material,parent,name){const o=new THREE.Mesh(g,material);o.name=name;o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function box(parent,position,size,mat=graphite,r=.04,name='machined-panel'){
    r=Math.min(r,.035);const key=size.join('/')+'/'+r;if(!rounded.has(key))rounded.set(key,new RoundedBoxGeometry(...size,2,r));
    const o=mesh(rounded.get(key),mat,parent,name);o.position.set(...position);return o;
  }
  function cylinder(parent,position,radius,height,mat=steel,name='turned-cylinder',bottom=radius){const o=mesh(new THREE.CylinderGeometry(radius,bottom,height,64),mat,parent,name);o.position.set(...position);return o;}
  function bolt(parent,x,y,z,axis='z'){
    const o=mesh(screwGeometry,steel,parent,'socket-fastener');o.position.set(x,y,z);if(axis==='z')o.rotation.x=Math.PI/2;
    const socket=mesh(new THREE.CylinderGeometry(.024,.024,.025,6),black,parent,'hex-socket');socket.position.set(x,y+(axis==='y'?.008:0),z+(axis==='z'?.008:0));if(axis==='z')socket.rotation.x=Math.PI/2;
  }
  function plateTexture(draw,w=1024,h=512){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d'),w,h);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
  function decal(parent,position,size,texture,name){const o=mesh(new THREE.PlaneGeometry(...size),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}),parent,name);o.position.set(...position);o.castShadow=false;return o;}

  const {left,right,roof,rear,base,fixture,head}=modules;
  // Box enclosure with a properly framed glazed operator door and separate internal table.
  box(base,[0,-2.8,-.15],[8.8,1.25,5.9],graphite,.13,'base-casting');
  box(base,[0,-2.05,-.25],[7.5,.24,5.3],steel,.03,'sloping-chip-pan');
  for(const x of [-3.5,3.5])for(const z of [-2.1,2.1]){
    cylinder(base,[x,-3.5,z],.36,.2,black,'leveling-foot');cylinder(base,[x,-3.29,z],.14,.27,steel,'leveling-screw');
  }
  function enclosureCheek(parent,side){
    const shape=new THREE.Shape();const points=[[2.905,-2.22],[4.555,-2.22],[4.555,5.24],[4.11,5.68],[2.905,5.68]];
    points.forEach(([x,y],i)=>i?shape.lineTo(side*x,y):shape.moveTo(side*x,y));shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:5.65,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.012,bevelThickness:.012});
    const panel=mesh(geometry,painted,parent,'folded-enclosure-cheek');panel.position.z=-2.975;
  }
  enclosureCheek(left,-1);enclosureCheek(right,1);
  box(left,[-3.32,1.6,2.70],[.60,7.55,.14],graphite,.035,'left-door-jamb');
  box(right,[3.32,1.6,2.70],[.60,7.55,.14],graphite,.035,'right-door-jamb');
  box(roof,[0,5.42,-.16],[9.0,.7,5.7],graphite,.10,'roof');
  box(roof,[0,5.73,-1.2],[3.9,.45,2.5],black,.08,'roof-drive-cover');
  box(roof,[0,5.0,2.70],[6.1,.23,.18],steel,.025,'door-upper-track');
  box(rear,[0,1.52,-2.98],[6.2,7.25,.2],liner,.035,'stainless-rear-wall');
  for(const x of [-2.98,2.98])box(rear,[x,1.5,-.1],[.1,6.8,5.5],liner,.02,'interior-liner');
  for(const x of [-2.7,2.7])for(const y of [-1.55,.3,2.2,4.4])bolt(rear,x,y,-2.855);
  for(const x of [-1.4,1.4])box(rear,[x,1.6,-2.77],[.028,6.0,.015],black,.003,'liner-seam');
  for(const x of [-.78,.78]){
    box(rear,[x,2.6,-2.53],[.14,4.4,.10],bright,.006,'linear-guide');
    box(rear,[x,2.65,-2.42],[.30,.65,.20],steel,.018,'linear-bearing-block');
    for(let y=.8;y<4.7;y+=.42)bolt(rear,x,y,-2.467);
  }
  for(let y=3.7;y<4.82;y+=.075)box(rear,[0,y,-2.36],[1.4,.033,.14],graphite,.003,'concertina-way-cover');
  for(const x of [-2.78,2.78]){
    box(rear,[x,-1.38,-.16],[.18,.12,5.15],steel,.008,'liner-folded-drain-edge');
    for(let z=-2.25;z<2.15;z+=.68){const boltHead=mesh(screwGeometry,steel,rear,'liner-side-fastener');boltHead.rotation.z=Math.PI/2;boltHead.position.set(x-Math.sign(x)*.10,.9,z);}
  }
  for(let i=0;i<10;i++)box(right,[4.57,-1.2+i*.105,.0],[.018,.035,1.4],black,.008,'cabinet-vent');
  for(let i=0;i<7;i++)box(left,[-3.75,-1.3+i*.095,2.697],[.76,.03,.018],black,.007,'intake-vent');
  // Recessed service panel and folded sheet-metal seams add scale to the exterior.
  box(right,[4.566,1.1,-.25],[.021,4.7,3.7],graphite,.03,'service-panel-seam');
  box(right,[4.584,1.1,-.25],[.022,4.58,3.57],painted,.025,'service-access-panel');
  box(right,[4.62,1.4,.9],[.08,.45,.08],graphite,.02,'service-latch');
  for(const y of [-.55,2.75])box(right,[4.64,y,-1.66],[.085,.35,.16],steel,.009,'service-panel-hinge');
  for(let y=2.8;y<4.55;y+=.11)box(right,[4.601,y,-.55],[.024,.041,2.05],graphite,.003,'upper-side-louvre');
  for(const z of [-2.67,2.42])box(right,[4.60,1.55,z],[.018,7.15,.024],black,.002,'folded-panel-joint');
  for(const y of [-1.06,3.26])for(const z of [-1.9,1.4]){const o=mesh(screwGeometry,graphite,right,'service-screw');o.rotation.z=Math.PI/2;o.position.set(4.611,y,z);}
  // Two fully solid frames with real window material. Door motion is separate from retreat.
  const doorLeft=new THREE.Group(),doorRight=new THREE.Group();left.add(doorLeft);right.add(doorRight);
  const glass=new THREE.MeshPhysicalMaterial({color:0x7c8b96,metalness:.08,roughness:.12,transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide});
  for(const [g,x] of [[doorLeft,-1.52],[doorRight,1.52]]){
    const pane=box(g,[x,1.45,2.75],[2.97,6.45,.07],glass,.015,'safety-glazing');pane.castShadow=false;
    for(const side of [-1,1])box(g,[x+side*1.45,1.45,2.8],[.09,6.5,.1],graphite,.016,'door-vertical-frame');
    for(const y of [-1.79,4.69])box(g,[x,y,2.8],[2.99,.10,.1],graphite,.015,'door-horizontal-frame');
    const sign=Math.sign(x);box(g,[sign*.22,1.6,2.95],[.06,1.3,.10],orange,.028,'door-handle');
  }
  // Front machine identification, fasteners and status light.
  const label=plateTexture((c,w,h)=>{c.fillStyle='#282e36';c.fillRect(0,0,w,h);c.fillStyle='#e8edf2';c.font='500 95px sans-serif';c.fillText('XUANHENG',65,165);c.fillStyle='#a3afbc';c.font='44px monospace';c.fillText('PRECISION  /  CELL 01',65,282);c.fillStyle='#e4794b';c.fillRect(65,363,140,9);},1024,512);
  decal(left,[-3.75,3.7,2.70],[1.15,.575],label,'manufacturer-label');
  for(const x of [-4.3,-3.18,3.18,4.3])for(const y of [-2.2,4.8])bolt(x<0?left:right,x,y,2.705);
  cylinder(roof,[3.65,6.05,1.5],.095,.45,graphite,'signal-light-post');
  cylinder(roof,[3.65,6.34,1.5],.13,.18,new THREE.MeshStandardMaterial({color:0xf07c30,emissive:0xba4e10,emissiveIntensity:.5,roughness:.25}),'amber-status-lamp');
  cylinder(roof,[3.65,6.45,1.5],.135,.045,graphite,'lamp-cap');
  // Control console: screen, key matrix, handwheel and emergency stop have physical depth.
  const controlStart=right.children.length;
  box(right,[4.80,1.68,2.48],[1.77,3.02,.34],graphite,.10,'operator-control');
  const screen=plateTexture((c,w,h)=>{
    c.fillStyle='#0d1620';c.fillRect(0,0,w,h);c.fillStyle='#314151';c.fillRect(0,0,w,48);c.fillStyle='#cbd6e3';c.font='24px monospace';c.fillText('XH CONTROL  /  AUTO',26,33);
    c.strokeStyle='#223241';c.lineWidth=1;for(let x=30;x<w;x+=52){c.beginPath();c.moveTo(x,75);c.lineTo(x,h-80);c.stroke();}for(let y=80;y<h-60;y+=45){c.beginPath();c.moveTo(20,y);c.lineTo(w-20,y);c.stroke();}
    c.strokeStyle='#8bafbd';c.lineWidth=3;c.beginPath();c.ellipse(280,255,165,95,0,0,Math.PI*2);c.stroke();c.beginPath();c.ellipse(280,255,53,32,0,0,Math.PI*2);c.stroke();
    c.fillStyle='#d3dde7';c.font='22px monospace';['X  +00.000','Y  +00.000','Z  +00.000','READY'].forEach((t,i)=>c.fillText(t,550,155+i*58));c.fillStyle='#d17a52';c.fillRect(26,h-47,140,6);
  });
  decal(right,[4.80,2.27,2.655],[1.48,.91],screen,'control-screen');
  for(let row=0;row<5;row++)for(let col=0;col<8;col++)box(right,[4.16+col*.18,1.56-row*.145,2.685],[.115,.085,.03],row===0?steel:painted,.008,'control-key');
  const stop=cylinder(right,[4.22,.44,2.76],.12,.10,new THREE.MeshStandardMaterial({color:0xa62b22,roughness:.4}),'emergency-stop');stop.rotation.x=Math.PI/2;
  const handwheel=cylinder(right,[5.28,.45,2.77],.20,.08,black,'manual-pulse-wheel');handwheel.rotation.x=Math.PI/2;
  for(let i=0;i<12;i++){const a=i*Math.PI/6;bolt(right,5.28+Math.cos(a)*.15,.45+Math.sin(a)*.15,2.83);}
  const consoleGroup=new THREE.Group();consoleGroup.name='control-console';
  right.children.slice(controlStart).forEach(o=>consoleGroup.add(o));consoleGroup.position.z=.52;right.add(consoleGroup);
  const loom=new THREE.CatmullRomCurve3([new THREE.Vector3(5.12,.2,3.17),new THREE.Vector3(5.15,-.6,3.07),new THREE.Vector3(4.79,-1.38,2.78),new THREE.Vector3(4.58,-1.52,2.0)]);
  mesh(new THREE.TubeGeometry(loom,48,.035,8,false),black,right,'console-armoured-cable');
  const warning=plateTexture((c,w,h)=>{c.fillStyle='#c4aa67';c.fillRect(0,0,w,h);c.fillStyle='#22282b';c.beginPath();c.moveTo(80,36);c.lineTo(24,133);c.lineTo(136,133);c.closePath();c.fill();c.fillStyle='#c4aa67';c.font='bold 68px sans-serif';c.fillText('!',69,119);c.fillStyle='#22282b';c.font='bold 25px sans-serif';c.fillText('AUTOMATIC MACHINE',170,65);c.font='20px sans-serif';c.fillText('KEEP DOOR CLOSED',170,103);},512,168);
  decal(left,[-3.74,-.45,2.70],[.94,.31],warning,'operator-warning-plate');
  box(base,[0,-2.4,2.812],[8.1,.025,.018],black,.002,'base-panel-seam');
  for(const x of [-3.8,-2.4,2.4,3.8])bolt(base,x,-2.64,2.815);

  // The work table is supported by a trunnion cradle; no floating workholding parts.
  box(fixture,[0,-1.59,-.30],[4.9,.50,3.6],graphite,.12,'table-bed');
  for(const x of [-2.12,2.12]){
    box(fixture,[x,-.91,-.25],[.6,1.4,2.0],steel,.18,'trunnion-cheek');
    const pivot=cylinder(fixture,[x+Math.sign(x)*.34,-.53,-.25],.54,.20,graphite,'trunnion-pivot');pivot.rotation.z=Math.PI/2;
  }
  const rotary=new THREE.Group();rotary.name='C-axis-table';fixture.add(rotary);
  cylinder(rotary,[0,-.70,0],1.72,.40,graphite,'rotary-housing');
  cylinder(rotary,[0,-.46,0],1.66,.11,bright,'rotary-table-rim');
  cylinder(rotary,[0,-.365,0],1.59,.08,steel,'table-face');
  for(let i=0;i<4;i++){const g=new THREE.TorusGeometry(1.725,.008,5,96),m=mesh(g,steel,rotary,'housing-turning-groove');m.rotation.x=Math.PI/2;m.position.y=-.82+i*.075;}
  for(let i=-2;i<=2;i++)box(rotary,[i*.49,-.319,0],[.035,.008,Math.sqrt(1.5**2-(i*.49)**2)*2],black,.003,'table-T-slot');
  for(let i=0;i<12;i++){const a=i*Math.PI/6;bolt(rotary,Math.cos(a)*1.39,-.306,Math.sin(a)*1.39,'y');}
  cylinder(rotary,[0,-.225,0],.52,.19,steel,'rear-register-fixture');
  const jaws=[];
  for(let i=0;i<3;i++){
    const g=new THREE.Group();g.rotation.y=i*Math.PI*2/3;rotary.add(g);
    const jaw=new THREE.Group();jaw.position.z=1.05;g.add(jaw);jaws.push(jaw);
    box(jaw,[0,-.12,0],[.36,.32,.44],graphite,.022,'fixture-jaw');
    box(jaw,[0,.02,-.19],[.30,.09,.16],steel,.008,'jaw-contact');bolt(jaw,0,.053,.03,'y');
  }
  // One cutting spindle. Spare tools stay in a rack, away from the cutting envelope.
  const carriage=new THREE.Group();carriage.name='spindle-carriage';head.add(carriage);
  box(head,[0,3.70,-1.40],[4.0,1.0,.60],steel,.04,'X-axis-cross-slide');
  box(head,[0,3.65,-1.76],[4.7,1.45,.30],graphite,.04,'guideway-bellows');
  for(let x=-2.2;x<2.25;x+=.1)box(head,[x,3.62,-1.585],[.033,1.31,.038],steel,.002,'cross-slide-bellows-fold');
  box(carriage,[0,2.65,-.19],[1.25,2.3,1.10],graphite,.1,'spindle-axis-cover');
  box(carriage,[0,2.08,.38],[1.07,.82,.1],painted,.035,'spindle-nose-cover');
  cylinder(carriage,[0,1.40,0],.39,.72,steel,'motor-spindle');
  cylinder(carriage,[0,.94,0],.30,.24,bright,'spindle-register');
  cylinder(carriage,[0,.73,0],.24,.18,graphite,'toolholder');
  cylinder(carriage,[0,.57,0],.15,.14,steel,'collet-nut');
  const cutter=new THREE.Group();cutter.name='rotating-endmill';carriage.add(cutter);
  cylinder(cutter,[0,.27,0],.052,.52,bright,'endmill-shank');
  class Flute extends THREE.Curve{constructor(offset){super();this.offset=offset;}getPoint(t,v=new THREE.Vector3()){const a=t*Math.PI*2+this.offset;return v.set(Math.cos(a)*.055,.018+t*.24,Math.sin(a)*.055);}}
  for(let i=0;i<3;i++)mesh(new THREE.TubeGeometry(new Flute(i*Math.PI*2/3),32,.009,4,false),graphite,cutter,'helical-flute');
  const hosePoints=[new THREE.Vector3(.40,1.4,0),new THREE.Vector3(.55,1.05,.18),new THREE.Vector3(.40,.55,.25),new THREE.Vector3(.18,.27,.14)];
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hosePoints),24,.035,8,false),graphite,carriage,'coolant-hose');
  const nozzle=box(carriage,[.18,.29,.14],[.055,.14,.055],orange,.012,'coolant-nozzle');nozzle.rotation.z=-.6;
  box(rear,[-2.10,1.34,-1.65],[1.45,.12,.6],graphite,.025,'tool-rack');
  for(let i=0;i<4;i++){
    cylinder(rear,[-2.65+i*.36,1.64,-1.65],.12,.44,steel,'parked-toolholder');
    cylinder(rear,[-2.65+i*.36,1.22,-1.65],.03,.35,bright,'parked-tool');
  }
  box(roof,[0,4.95,.30],[3.3,.055,.17],led,.008,'work-light');
  const inside=new THREE.PointLight(0xfff4e6,9,11,2);inside.position.set(-1.3,4.25,.2);roof.add(inside);
  // Batch only static siblings. Door, spindle, cutter and jaw pivots remain independently movable.
  function batchStatic(group){
    const buckets=new Map();for(const o of [...group.children]){
      if(!o.isMesh||o.material.transparent)continue;
      const key=o.material.uuid;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);
    }
    for(const objects of buckets.values())if(objects.length>1){
      const copies=objects.map(o=>{o.updateMatrix();const g=o.geometry.clone().applyMatrix4(o.matrix);return g.index?g.toNonIndexed():g;});
      const merged=mergeGeometries(copies,false);copies.forEach(g=>g.dispose());if(!merged)continue;
      objects.forEach(o=>group.remove(o));mesh(merged,objects[0].material,group,'batched-machined-surfaces');
    }
  }
  [consoleGroup,doorLeft,doorRight,rotary,carriage,cutter,...jaws,...Object.values(modules)].forEach(batchStatic);
  const bases={};Object.entries(modules).forEach(([k,g])=>bases[k]=g.position.clone());
  return {root,modules,carriage,cutter,rotary,jaws,doorLeft,doorRight,bases};
}
