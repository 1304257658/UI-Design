import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {EXHIBIT_MAP} from './collection.js';
import {STUDY_EXHIBITS,POND} from './study-layout.js';

const serif='"Noto Serif SC","Songti SC",SimSun,serif';
function mapFrom(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
function round(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
function text(c,s,x,y,size,color='#24221f',font=serif){c.fillStyle=color;c.font=`${size}px ${font}`;c.fillText(s,x,y);}

// Each exhibit uses an authored UI composition, then its corresponding live HTML example.
function specimen(id,photo){return mapFrom(900,1420,c=>{
  if(id==='glass'){
    c.clearRect(0,0,900,1420);
    text(c,'Serene',75,115,43,'#ffffff','Georgia,serif');
    c.strokeStyle='#fff';c.lineWidth=5;c.beginPath();c.arc(804,86,18,0,Math.PI*2);c.moveTo(818,100);c.lineTo(833,117);c.stroke();
    c.fillStyle='rgba(242,246,249,.12)';round(c,40,177,820,1196,45);c.fill();c.strokeStyle='rgba(255,255,255,.48)';c.lineWidth=2;c.stroke();
    text(c,'让灵感',90,315,73,'#fff');text(c,'在这里停留',90,420,73,'#fff');
    text(c,'发现 · 收藏 · 创造',92,515,27,'#ffffffdb');
    const cards=[['光影','在细节中看见美'],['色彩','捕捉自然的灵感'],['布局','构建有秩序的美']];
    cards.forEach(([title,sub],i)=>{const y=620+i*239;
      c.fillStyle='rgba(249,249,241,.35)';round(c,80,y,740,205,28);c.fill();c.strokeStyle='#ffffffa0';c.stroke();
      c.save();round(c,108,y+28,142,147,18);c.clip();c.drawImage(photo,260+i*230,200,700,500,108,y+28,142,147);c.restore();
      text(c,title,290,y+79,38,'#292d2c');text(c,sub,290,y+132,24,'#3e4644');text(c,'›',746,y+120,54,'#fff','Georgia');
    });
  }else if(id==='minimal'){
    c.fillStyle='#faf9f4';c.fillRect(0,0,900,1420);text(c,'Quiet',69,100,42,'#262423','Georgia');text(c,'≡',782,103,40,'#292723','Arial');
    text(c,'少，',88,398,93);text(c,'但更好。',88,540,93);text(c,'专注于重要的事',90,630,31,'#5b5853');
    c.save();c.beginPath();c.rect(0,770,900,650);c.clip();c.filter='grayscale(1)';c.drawImage(photo,660,50,1300,640,-60,760,1060,660);c.restore();
    c.fillStyle='#faf8ef';c.beginPath();c.arc(786,1297,64,0,Math.PI*2);c.fill();text(c,'→',745,1319,56,'#393b33','Arial');
  }else{
    c.fillStyle='#11130f';c.fillRect(0,0,900,1420);c.fillStyle='#efc71d';round(c,32,35,836,686,12);c.fill();
    const font='900 128px Impact,"Arial Black",sans-serif';c.font=font;c.fillStyle='#12150f';['MAKE','IDEAS','REAL.'].forEach((s,i)=>c.fillText(s,74,228+i*147));
    c.fillStyle='#10140e';c.fillRect(724,87,103,124);text(c,'↗',738,183,86,'#edc61c','Arial');
    ['Work','Play','Explore','···'].forEach((s,i)=>{const y=771+i*152;c.fillStyle='#e4b919';c.fillRect(32,y,836,145);text(c,s,70,y+99,65,'#181a10','Arial');});
  }
});}

function plaque(name,en){return mapFrom(1200,310,(c,w)=>{c.textAlign='center';text(c,name,w/2,123,70,'#30291f');c.strokeStyle='#4f4434';c.lineWidth=2;c.beginPath();c.moveTo(w/2-28,165);c.lineTo(w/2+28,165);c.stroke();c.font='23px Georgia';c.fillStyle='#4b3e2c';c.fillText(en,w/2,226);});}

export async function buildStudy(world){
  const {scene,renderer}=world,loader=new THREE.TextureLoader();
  const [stone,landscape]=await Promise.all(['travertine.png','landscape.png'].map(async (name)=>loader.loadAsync(`/assets/${name}`)));
  if(world.disposed){stone.dispose();landscape.dispose();return;}
  stone.colorSpace=landscape.colorSpace=THREE.SRGBColorSpace;stone.wrapS=stone.wrapT=THREE.RepeatWrapping;stone.anisotropy=renderer.capabilities.getMaxAnisotropy();landscape.anisotropy=8;
  const relief=stone.clone();relief.colorSpace=THREE.NoColorSpace;relief.needsUpdate=true;
  const limestone=new THREE.MeshStandardMaterial({map:stone,bumpMap:relief,bumpScale:.065,color:0xbca58a,roughness:.72});
  const bronze=new THREE.MeshStandardMaterial({color:0x574b39,roughness:.42,metalness:.65});
  const wood=new THREE.MeshStandardMaterial({map:stone,color:0x765139,roughness:.65});
  const add=(g,m,x=0,y=0,z=0,shadow=true)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=true;scene.add(o);return o;};
  const box=(w,h,d,x,y,z,m=limestone)=>{
    const g=new THREE.BoxGeometry(w,h,d);const uv=g.attributes.uv;
    // Six faces get a consistent physical texture scale rather than stretching one tile per object.
    for(let f=0;f<6;f++){const sx=(f<2?d:w)/2,sy=(f===2||f===3?d:h)/2;for(let k=0;k<4;k++){const i=f*4+k;uv.setXY(i,uv.getX(i)*sx,uv.getY(i)*sy);}}
    return add(g,m,x,y,z);
  };
  const arc=(r,h,thickness,a0,span,mat,y)=>{
    const shape=new THREE.Shape(),n=Math.ceil(span*30);
    for(let i=0;i<=n;i++){const a=a0+span*i/n,x=Math.sin(a)*(r+thickness),z=Math.cos(a)*(r+thickness);i?shape.lineTo(x,z):shape.moveTo(x,z);}
    for(let i=n;i>=0;i--){const a=a0+span*i/n;shape.lineTo(Math.sin(a)*r,Math.cos(a)*r);}shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,steps:1});g.rotateX(-Math.PI/2);
    const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2,uv.getY(i)/2);
    return add(g,mat,0,y,0);
  };

  // Deep blue sky is visible through the skylight, with a separate distant landscape.
  scene.background=new THREE.Color('#afc3d1');scene.fog=new THREE.FogExp2('#d0c4af',.0025);
  const pano=add(new THREE.CylinderGeometry(75,75,39,96,1,true),new THREE.MeshBasicMaterial({map:landscape,side:THREE.BackSide,color:0xd9c8ae,fog:false}),0,13,-15,false);pano.rotation.y=2.4;
  box(160,.1,160,0,-.5,0,new THREE.MeshStandardMaterial({color:0x8a8b64,roughness:1}));

  const floorTexture=stone.clone();floorTexture.repeat.set(6,6);floorTexture.needsUpdate=true;
  const floorRelief=relief.clone();floorRelief.repeat.set(6,6);floorRelief.needsUpdate=true;
  const floorMat=new THREE.MeshStandardMaterial({map:floorTexture,bumpMap:floorRelief,bumpScale:.045,color:0xb9afa0,roughness:.3,metalness:.08});
  const floor=add(new THREE.CircleGeometry(12,128),floorMat,0,-.012,0,false);floor.rotation.x=-Math.PI/2;
  const reflection=new Reflector(new THREE.CircleGeometry(11.96,128),{textureWidth:1024,textureHeight:1024,color:0xb5aa96,clipBias:.003,multisample:0});reflection.rotation.x=-Math.PI/2;reflection.position.y=.002;
  reflection.material.transparent=true;reflection.material.depthWrite=false;
  reflection.material.fragmentShader=reflection.material.fragmentShader.replace('vec4( blendOverlay( base.rgb, color ), 1.0 )','vec4( blendOverlay( base.rgb, color ), 0.20 )');scene.add(reflection);world.reflections.push(reflection);
  const joint=new THREE.MeshStandardMaterial({color:0x8a8377,roughness:.7});
  for(let n=-10;n<=10;n+=2.4){const span=Math.sqrt(144-n*n)*2;box(.013,.005,span,n,.009,0,joint);box(span,.005,.013,0,.009,n,joint);}

  // Curved limestone envelope, open at the back to a planted landscape.
  arc(11.7,6.3,.48,-.23,1.04,limestone,0);arc(11.7,6.3,.48,4.43,1.62,limestone,0);
  arc(11.7,.65,.5,.81,3.62,limestone,0);arc(11.7,.85,.5,.81,3.62,limestone,5.45);
  for(let a=.84;a<4.46;a+=.37){const r=11.68;const pillar=box(.095,5.1,.15,Math.sin(a)*r,3.1,-Math.cos(a)*r,bronze);pillar.rotation.y=-a;}
  // Freestanding stone piers frame the view and create believable depth.
  for(const [x,z] of [[-7.4,-6.2],[7.1,-6.5],[-10.1,.2],[10.1,.2]])box(.66,6.2,.75,x,3.1,z);
  // A substantial annular roof: the aperture is open, supported by radial metal beams.
  arc(7.6,1.1,4.65,0,Math.PI*2,limestone,5.85);
  const roof=add(new THREE.RingGeometry(7.6,12.35,128),limestone,0,5.84,0);roof.rotation.x=Math.PI/2;roof.material=limestone.clone();roof.material.side=THREE.DoubleSide;
  const rim=add(new THREE.TorusGeometry(7.6,.055,8,160),bronze,0,6.97,0);rim.rotation.x=Math.PI/2;
  for(let i=0;i<6;i++){const beam=box(15.2,.07,.055,0,7.02,0,bronze);beam.rotation.y=i*Math.PI/6;}
  // Timber reveals and a curved sitting bench at the side.
  for(const [x,z] of [[-8.5,-4.1],[8.5,-4.1]])box(.36,5.65,.7,x,2.82,z,wood);
  box(1.4,.22,5.4,9.3,.66,2,wood);box(.85,.55,4.4,9.3,.275,2);

  // Dark reflective foreground pool, recessed within a stone rim.
  const pond=add(new THREE.CircleGeometry(POND.radius,96),new THREE.MeshPhysicalMaterial({color:0x242c27,roughness:.12,metalness:.5,clearcoat:1}),POND.x,.031,POND.z,false);pond.rotation.x=-Math.PI/2;
  const water=new Reflector(new THREE.CircleGeometry(POND.radius-.05,96),{textureWidth:768,textureHeight:768,color:0x525954,multisample:0});water.position.set(POND.x,.035,POND.z);water.rotation.x=-Math.PI/2;world.reflections.push(water);scene.add(water);
  // Reflectors hide each other to avoid recursively rendering a second reflection.
  for(const [r,other] of [[reflection,water],[water,reflection]]){const render=r.onBeforeRender;r.onBeforeRender=function(...args){const v=other.visible;other.visible=false;render.apply(this,args);other.visible=v;};}
  const poolLip=add(new THREE.TorusGeometry(POND.radius,.07,8,128),bronze,POND.x,.06,POND.z);poolLip.rotation.x=-Math.PI/2;
  const rockMaterial=new THREE.MeshStandardMaterial({map:stone,bumpMap:relief,bumpScale:.13,color:0x424744,roughness:.97});
  for(const [x,z,s] of [[-7.5,7.3,1.1],[-9.2,5.7,.8],[-6.8,8.1,.45]]){const rock=add(new THREE.DodecahedronGeometry(s,1),rockMaterial,x,.25,z);rock.scale.set(1.25,.85,1);rock.rotation.set(.2,x,1.1);}

  const wallWords=mapFrom(640,1000,c=>{['好的界面','也可以像艺术品一样','让生活更美好'].forEach((s,i)=>text(c,s,52,240+i*95,49,'#473b2b'));text(c,'INTERFACES',52,658,24,'#473b2b','Georgia');text(c,'A KINDER WORLD',52,708,24,'#473b2b','Georgia');});
  const lettering=add(new THREE.PlaneGeometry(2.4,3.75),new THREE.MeshBasicMaterial({map:wallWords,transparent:true,depthWrite:false}),-8.25,3.5,-3.7,false);lettering.rotation.y=.45;
  const wordsSupport=box(3.5,6,.25,-8.35,3,-3.95);wordsSupport.rotation.y=.45;

  for(const layout of STUDY_EXHIBITS){
    const ex=EXHIBIT_MAP[layout.id],{x,z,width,depth,height,panelWidth:pw,panelHeight:ph}=layout;
    const base=box(width,height,depth,x,height/2,z);base.userData.exhibit=ex.id;world.picking.push(base);
    box(width+.025,.045,depth+.02,x,height+.022,z);
    const isGlass=ex.id==='glass',isBrutal=ex.id==='brutal';
    const material=isGlass?new THREE.MeshPhysicalMaterial({color:0xedf4f5,roughness:.37,transmission:.96,thickness:.32,ior:1.42,metalness:0,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:1.2}):new THREE.MeshStandardMaterial({color:isBrutal?0x161b13:0xf0eee6,roughness:.43});
    const body=add(new RoundedBoxGeometry(pw,ph,.19,5,isGlass?.16:.024),material,x,height+.05+ph/2,z);
    body.userData.exhibit=ex.id;world.picking.push(body);
    if(isGlass){const edging=add(new RoundedBoxGeometry(pw+.025,ph+.025,.085,4,.16),new THREE.MeshPhysicalMaterial({color:0xf8f8e9,roughness:.25,metalness:.25,transparent:true,opacity:.53,emissive:0xffead0,emissiveIntensity:.1}),x,height+.05+ph/2,z-.07);edging.castShadow=false;}
    const front=add(new THREE.PlaneGeometry(pw-.12,ph-.14),new THREE.MeshBasicMaterial({map:specimen(ex.id,landscape.image),transparent:true,depthWrite:false,toneMapped:false}),x,height+.05+ph/2,z+.101,false);
    front.userData.exhibit=ex.id;world.picking.push(front);
    const tag=add(new THREE.PlaneGeometry(width*.85,height*.88),new THREE.MeshBasicMaterial({map:plaque(ex.id==='minimal'?'极简':ex.id==='brutal'?'新粗野':'玻璃风格',ex.en),transparent:true,depthWrite:false}),x,height*.51,z+depth/2+.008,false);
    tag.renderOrder=1;
  }
  world.textures.push(stone,landscape,relief);
  // Tree textures are loaded separately so the room remains inspectable while an asset arrives.
  world.loadTrees=()=>loadTrees(world,loader,add,stone);
  await world.loadTrees();
}

async function loadTrees(world,loader,add,stone){
  let tree;try{tree=await loader.loadAsync('/assets/olive-tree.png');}catch{return;}
  if(world.disposed){tree.dispose();return;}tree.colorSpace=THREE.SRGBColorSpace;tree.anisotropy=8;world.textures.push(tree);
  const mat=new THREE.MeshBasicMaterial({map:tree,side:THREE.DoubleSide,transparent:true,alphaTest:.04,depthWrite:true,color:0xefe6cb});
  // Black is only an asset extraction background, never part of the visible scene.
  mat.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    float keyValue = max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b));
    diffuseColor.a *= smoothstep(0.018,0.075,keyValue);`);};
  for(const [x,z,h,yaw] of [[-9,-9,9,.1],[8,-10,9,-.3],[-15,-16,12,.6],[16,-19,14,-.5],[-3,-21,10,.2],[4,-26,14,-.3]]){const o=add(new THREE.PlaneGeometry(h*.68,h),mat,x,h/2-.3,z,false);o.rotation.y=yaw;}
  // The same foliage silhouette casts a dappled shadow through the skylight.
  const shadowMat=new THREE.MeshStandardMaterial({map:tree,side:THREE.DoubleSide,transparent:true,alphaTest:.04,color:0x56623b});shadowMat.onBeforeCompile=mat.onBeforeCompile;
  const canopy=add(new THREE.PlaneGeometry(7,10),shadowMat,-10,7.5,4);canopy.rotation.set(-.4,.55,-.4);
  canopy.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:tree,alphaTest:.04,side:THREE.DoubleSide});canopy.customDepthMaterial.onBeforeCompile=mat.onBeforeCompile;
}
