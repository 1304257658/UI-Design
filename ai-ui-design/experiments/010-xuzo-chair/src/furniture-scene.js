import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {gsap} from 'gsap';
import {brand} from './brand.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

// Small woven fibres, stable between renders; shared by upholstery and chair mesh.
function textile(mesh=false){
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
 x.fillStyle=mesh?'#a29f94':'#b9b2a1';x.fillRect(0,0,256,256);
 let seed=37;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 for(let y=0;y<256;y+=4)for(let a=0;a<256;a+=4){const n=140+rand()*70;x.fillStyle=`rgb(${n+12},${n+8},${n})`;x.fillRect(a,y,3,3);x.fillStyle='#ece8dc80';x.fillRect(a,y,1,3);}
 if(mesh){x.fillStyle='#33382f';for(let y=0;y<256;y+=8)for(let a=0;a<256;a+=8)x.fillRect(a+4,y+4,2,2);}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(mesh?12:5,mesh?15:5);t.anisotropy=8;return t;
}
function softBox(w,h,d,r,material){const o=new T.Mesh(new RoundedBoxGeometry(w,h,d,5,r),material);o.castShadow=true;o.receiveShadow=true;return o;}
function oakTexture(){const c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d');x.fillStyle='#a48660';x.fillRect(0,0,1024,256);for(let y=0;y<256;y++){x.beginPath();x.strokeStyle=`rgba(${y%3?65:219},${y%3?48:198},${y%3?31:163},${.08+Math.sin(y*37)**2*.18})`;for(let a=0;a<=1024;a+=8){const yy=y+Math.sin(a*.006+y*.025)*2+Math.sin(a*.024+y*.1)*.7;if(a===0)x.moveTo(a,yy);else x.lineTo(a,yy);}x.stroke();}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;return t;}
function place(g,o,x,y,z){o.position.set(x,y,z);g.add(o);return o;}
function seam(g,w,h,y,z,mat){
 const r=.055,pts=[];for(let i=0;i<=80;i++){const a=i/80*Math.PI*2;const cx=Math.cos(a),sy=Math.sin(a);pts.push(new T.Vector3(Math.sign(cx)*(w/2-r)+r*cx,y+Math.sign(sy)*(h/2-r)+r*sy,z));}
 const curve=new T.CatmullRomCurve3(pts,true);g.add(new T.Mesh(new T.TubeGeometry(curve,100,.003,5,true),mat));
}
function makeSofa(){
 const g=new T.Group(),weave=textile(),cloth=new T.MeshPhysicalMaterial({color:0xe9e3d6,map:weave,roughness:.96,sheen:.65,sheenColor:new T.Color(0xece7de),sheenRoughness:.9,bumpMap:weave,bumpScale:.004});
 const stitch=new T.MeshStandardMaterial({color:0xafa58f,roughness:1}),woodMap=oakTexture(),wood=new T.MeshStandardMaterial({color:0xf0e5d1,map:woodMap,bumpMap:woodMap,bumpScale:.002,roughness:.57});
 place(g,softBox(2.5,.18,.88,.035,wood),0,-.49,0);
 // Continuous upholstered back avoids a distracting seam through the reading area.
 place(g,softBox(2.30,.67,.22,.10,cloth),0,.02,-.29);
 seam(g,2.14,.53,.02,-.171,stitch);
 for(const s of [-1,1]){
  place(g,softBox(1.11,.20,.69,.08,cloth),s*.568,-.35,.085);
  place(g,softBox(.18,.51,.9,.075,cloth),s*1.23,-.15,.01);
  const pillow=place(g,softBox(.32,.39,.13,.065,new T.MeshPhysicalMaterial({color:0x899078,map:weave,roughness:1,sheen:.6,bumpMap:weave,bumpScale:.003})),s*.96,-.10,-.04);pillow.rotation.z=-s*.14;
  for(const z of [-.29,.30]){const leg=new T.Mesh(new T.CylinderGeometry(.026,.016,.30,24),wood);place(g,leg,s*1.07,-.69,z);leg.rotation.z=-s*.07;}
 }
 return g;
}
function makeLamp(){const g=new T.Group(),metal=new T.MeshStandardMaterial({color:brand.olive,roughness:.42,metalness:.28}),cream=new T.MeshStandardMaterial({color:0xe5ddc9,roughness:.75,side:T.DoubleSide});place(g,new T.Mesh(new T.CylinderGeometry(.38,.40,.06,48),metal),0,-1,0);place(g,new T.Mesh(new T.CylinderGeometry(.019,.019,1.75,16),metal),0,-.10,0);place(g,new T.Mesh(new T.CylinderGeometry(.21,.51,.38,64,1,true),cream),0,.84,0);place(g,new T.Mesh(new T.SphereGeometry(.12,24,16),new T.MeshStandardMaterial({color:0xffefd3,emissive:0xffedc8,emissiveIntensity:.2})),0,.70,0);return g;}

export async function mountFurniture(container){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor(brand.paper,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;container.appendChild(renderer.domElement);
 const scene=new T.Scene();const camera=new T.OrthographicCamera(-7,7,4,-4,.1,100);camera.position.set(0,0,20);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const loader=new GLTFLoader();
 const [tableAsset,chairAsset,hdr]=await Promise.all([loader.loadAsync('/models/modern-table/modern-table.gltf'),loader.loadAsync('/models/contour-01.glb'),new HDRLoader().loadAsync('/environments/studio_small_09_2k.hdr').catch(()=>null)]);
 if(hdr){const pmrem=new T.PMREMGenerator(renderer);const env=pmrem.fromEquirectangular(hdr);scene.environment=env.texture;scene.environmentIntensity=.65;scene.environmentRotation.y=.7;hdr.dispose();pmrem.dispose();}
 scene.add(new T.HemisphereLight(0xffffff,0xa79d84,.65));RectAreaLightUniformsLib.init();
 for(const [x,y,z,intensity,w,h] of [[-5,6,8,4,7,8],[6,2,5,1.1,5,6]]){const l=new T.RectAreaLight(0xfff7e9,intensity,w,h);l.position.set(x,y,z);l.lookAt(0,0,0);scene.add(l);}
 const key=new T.DirectionalLight(0xfff9ef,2.8);key.position.set(-4,7,9);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-13,right:13,top:12,bottom:-12,near:.1,far:40});key.shadow.normalBias=.012;key.shadow.bias=-.00008;key.shadow.radius=4;scene.add(key);
 const table=new T.Group();const tableInner=tableAsset.scene;tableInner.rotation.y=Math.PI/2;tableInner.position.y=-.39;table.add(tableInner);scene.add(table);
 tableInner.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material.envMapIntensity=.5;for(const k of ['map','normalMap','roughnessMap'])if(o.material[k])o.material[k].anisotropy=8;}});
 const chair=new T.Group();chairAsset.scene.position.y=-.79;chair.add(chairAsset.scene);scene.add(chair);const meshTex=textile(true);
 chairAsset.scene.traverse(o=>{if(!o.isMesh)return;const m=o.material;m.envMapIntensity=.55;o.castShadow=true;o.receiveShadow=true;
  if(m.name.includes('Soft')){o.geometry.deleteAttribute('normal');o.geometry=mergeVertices(o.geometry);o.geometry.computeVertexNormals();}
  if(m.name.includes('Woven')){o.material=new T.MeshPhysicalMaterial({color:0xd9d7cc,map:meshTex,roughness:.94,bumpMap:meshTex,bumpScale:.0008,side:T.DoubleSide,sheen:.25,sheenRoughness:.9});}
  else if(m.name.includes('Graphite')){m.color.setHex(0x61675c);m.roughness=.64;m.metalness=0;}
  else if(m.name.includes('Soft')){m.color.setHex(0x6f7468);m.roughness=.88;m.metalness=0;}
  else if(m.name.includes('Brushed')){m.color.setHex(0x94988f);m.roughness=.32;m.metalness=.88;}
 });
 const sofa=makeSofa();scene.add(sofa);const lamp=makeLamp();scene.add(lamp);
 // Positions are in screen-height units; the camera never orbits or changes zoom.
 const hero={table:[-4,-1.75,0,.43,.30,-.25,3.2],chair:[4,-.10,1,.10,-.40,.08,3.8],sofa:[-4.9,1.40,-1,.30,.45,-.13,1.9],lamp:[4.8,2.10,-2,.10,0,-.23,.85]};
 const desk={table:[0,0,0,Math.PI/2,0,0,8.3],chair:[10,-1,1,.1,-.7,.25,4.3],sofa:[-12,4,-1,.3,.5,-.4,1.9],lamp:[10,8,-2,.1,0,-.5,1.15]};
 const desk2={...desk,table:[0,0,0,Math.PI/2,0,0,8.65]};
 const seating={table:[-15,2,-1,1.3,.1,-.18,8.3],chair:[0,-.20,1,0,0,0,9.3],sofa:[-12,4,-1,.3,.5,-.4,1.9],lamp:desk.lamp};
 const vision={table:seating.table,chair:[13,-2,1,0,.5,.18,8],sofa:[0,-.15,0,0,0,0,4.0],lamp:[-10,1.1,-2,0,0,0,1.65]};
 const poses=[{p:0,v:hero},{p:.065,v:hero},{p:.22,v:desk},{p:.32,v:desk},{p:.385,v:desk2},{p:.445,v:desk2},{p:.575,v:seating},{p:.705,v:seating},{p:.84,v:vision},{p:1,v:vision}];
 const groups={table,chair,sofa,lamp},state={},fields=['x','y','z','rx','ry','rz','s'];
 function flatten(pose){const v={};for(const [name,arr]of Object.entries(pose))fields.forEach((f,i)=>v[name+f]=arr[i]);return v;}
 Object.assign(state,flatten(hero));const timeline=gsap.timeline({paused:true});for(let i=1;i<poses.length;i++)timeline.to(state,{...flatten(poses[i].v),duration:poses[i].p-poses[i-1].p,ease:'power2.inOut'},poses[i-1].p);
 let progress=0,width=1,height=1,fit=1;const ray=new T.Raycaster();const point=new T.Vector2();const anchor=new T.Vector3();
 function render(p=progress){progress=p;timeline.progress(p);for(const [name,g]of Object.entries(groups)){g.position.set(state[name+'x']*fit,state[name+'y'],state[name+'z']);g.rotation.set(state[name+'rx'],state[name+'ry'],state[name+'rz']);g.scale.setScalar(state[name+'s']*Math.min(1,fit));}scene.updateMatrixWorld(true);renderer.render(scene,camera);}
 function resize(){width=container.clientWidth;height=container.clientHeight;const ratio=width/height;camera.left=-4*ratio;camera.right=4*ratio;camera.top=4;camera.bottom=-4;camera.updateProjectionMatrix();fit=Math.min(1.25,ratio/1.6);renderer.setSize(width,height);render();}
 const ro=new ResizeObserver(resize);ro.observe(container);resize();
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();container.dispatchEvent(new CustomEvent('renderfailure'));});
 return {render,hitChair(x,y){if(progress>.065)return false;const r=container.getBoundingClientRect();point.set((x-r.left)/width*2-1,-(y-r.top)/height*2+1);ray.setFromCamera(point,camera);return ray.intersectObject(chair,true).length>0;},anchor(){anchor.set(.22,-.05,.2);chair.localToWorld(anchor);anchor.project(camera);return{x:(anchor.x+1)*width/2,y:(1-anchor.y)*height/2};},getState(){const n=new T.Vector3(0,1,0).applyEuler(table.rotation);return{camera:camera.position.toArray(),cameraRotation:camera.rotation.toArray(),freeCamera:false,tableNormal:n.toArray(),furniture:Object.fromEntries(Object.entries(groups).map(([n,g])=>[n,{position:g.position.toArray(),rotation:g.rotation.toArray(),scale:g.scale.x}])),triangles:renderer.info.render.triangles,calls:renderer.info.render.calls};}};
}
