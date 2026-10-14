import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

// Visual reconstruction of ROD's photographed five-hole aluminum hub.
// Proportions estimated from photographs, not manufacturing dimensions.
export function createAssembly(renderer) {
  const assembly = new THREE.Group();
  assembly.name = 'five-hole-keyed-aluminum-hub';
  const maps = machiningTextures(renderer);
  const aluminum = new THREE.MeshStandardMaterial({color:0xc9cdd2,metalness:1,roughness:.4,normalMap:maps.normal,normalScale:new THREE.Vector2(.045,.045),roughnessMap:maps.roughness});
  const turned = new THREE.MeshPhysicalMaterial({color:0xbec4ca,metalness:1,roughness:.41,roughnessMap:maps.roughness,normalMap:maps.normal,normalScale:new THREE.Vector2(.012,.012),anisotropy:.3});
  const edge = new THREE.MeshStandardMaterial({color:0xd3d6da,metalness:1,roughness:.22});
  const threadMaterial = new THREE.MeshStandardMaterial({color:0x9299a1,metalness:1,roughness:.31});
  function add(geometry,material,name){const mesh=new THREE.Mesh(geometry,material);mesh.name=name;assembly.add(mesh);return mesh;}
  function keyedBore(){
    const r=.45,w=.10,top=.59,a=Math.acos(w/r);
    const p=new THREE.Path();p.absarc(0,0,r,a,Math.PI-a,true);
    p.lineTo(-w,top);p.lineTo(w,top);p.closePath();return p;
  }
  const shape=new THREE.Shape();shape.absarc(0,0,2.08,0,Math.PI*2,false);shape.holes.push(keyedBore());
  const holes=Array.from({length:5},(_,i)=>{const a=Math.PI/2+i*Math.PI*2/5;return {x:Math.cos(a)*1.72,y:Math.sin(a)*1.72};});
  for(const h of holes){const p=new THREE.Path();p.absarc(h.x,h.y,.18,0,Math.PI*2,true);shape.holes.push(p);}
  const flange=new THREE.ExtrudeGeometry(shape,{depth:.245,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.018,bevelThickness:.018,curveSegments:96});
  const pos=flange.attributes.position,uv=flange.attributes.uv;
  for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getX(i)/4.16+.5,pos.getY(i)/4.16+.5);
  function finishedNormals(geometry){
    const g=toCreasedNormals(geometry,Math.PI*.3),p=g.attributes.position,n=g.attributes.normal;
    // Large machined planar faces must stay exactly planar. Averaging their normals
    // with chamfers creates false triangular reflection patches across the surface.
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3();
    for(let i=0;i<p.count;i+=3){
      if(Math.abs(p.getZ(i)-p.getZ(i+1))<1e-6&&Math.abs(p.getZ(i)-p.getZ(i+2))<1e-6){
        a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);normal.crossVectors(b.sub(a),c.sub(a)).normalize();
        for(let j=0;j<3;j++)n.setXYZ(i+j,normal.x,normal.y,normal.z);
      }
    }return g;
  }
  const flangeGeometry=finishedNormals(flange);
  // Analytical cylinder/chamfer normals eliminate triangle-dependent side highlights.
  const fp=flangeGeometry.attributes.position,fn=flangeGeometry.attributes.normal;
  for(let i=flangeGeometry.groups[1].start;i<fp.count;i++){
    const x=fp.getX(i),y=fp.getY(i),z=fp.getZ(i);let dx=x,dy=y,sign=1;
    if(Math.hypot(x,y)<2){
      const h=holes.find(h=>Math.hypot(x-h.x,y-h.y)<.22);
      if(!h)continue;dx=x-h.x;dy=y-h.y;sign=-1;
    }
    const radius=Math.hypot(dx,dy),nz=z>.245?Math.min(1,(z-.245)/.018):z<0?-Math.min(1,-z/.018):0,k=Math.sqrt(1-nz*nz);
    fn.setXYZ(i,sign*dx/radius*k,sign*dy/radius*k,nz);
  }
  const face=add(flangeGeometry,[aluminum,turned],'five-threaded-hole-flange');face.position.z=-.265;
  // Closed radial cross-section with a real through-bore and negative keyway.
  function keyedLathe(profile,name,material){
    const segments=384,positions=[],uvs=[],indices=[];
    for(let j=0;j<profile.length;j++)for(let i=0;i<=segments;i++){
      const a=i/segments*Math.PI*2,c=Math.cos(a),s=Math.sin(a),[radius,z,isBore]=profile[j];let r=radius;
      if(isBore&&s>0)r=Math.max(radius,Math.min(.10/Math.max(Math.abs(c),.00001),.59/s));
      positions.push(r*c,r*s,z);uvs.push(r*c/4.16+.5,r*s/4.16+.5);
      if(j<profile.length-1&&i<segments){const n=j*(segments+1)+i,k=n+segments+1;indices.push(n,n+1,k,n+1,k+1,k);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();
    return add(finishedNormals(g),material,name);
  }
  keyedLathe([[1.335,-.02],[1.335,.045],[1.325,.07],[.777,.815],[.757,.835],[.477,.835,true],[.45,.808,true],[.45,-.26,true],[1.335,-.26],[1.335,-.02]],'tapered-keyed-hub',turned);
  keyedLathe([[.87,-.275],[.87,-.52],[.847,-.54],[.45,-.54,true],[.45,-.275,true],[.87,-.275]].reverse(),'rear-register',turned);
  function line(radius,z,tube=.002){const m=add(new THREE.TorusGeometry(radius,tube,6,192),edge,'machined-edge');m.position.z=z;}
  line(1.337,.008,.004);line(2.082,-.031,.002);line(2.082,-.246,.002);
  class Thread extends THREE.Curve{
    constructor(x,y){super();this.x=x;this.y=y;}
    getPoint(t,target=new THREE.Vector3()){const a=t*Math.PI*2*5.5;return target.set(this.x+Math.cos(a)*.155,this.y+Math.sin(a)*.155,-.248+t*.22);}
  }
  for(const [i,h] of holes.entries())add(new THREE.TubeGeometry(new Thread(h.x,h.y),220,.010,3,false),threadMaterial,`internal-helical-thread-${i+1}`);
  return {assembly,components:[face]};
}
function machiningTextures(renderer){
  const size=1024,normalData=new Uint8Array(size*size*4),roughData=new Uint8Array(size*size*4);
  let seed=17;const noise=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=x-size/2,dy=y-size/2,r=Math.hypot(dx,dy)||1,n=noise(),i=(y*size+x)*4,g=Math.sin(r*1.85)*.24;
    normalData[i]=128+g*dx/r*40+(n-.5)*28;normalData[i+1]=128+g*dy/r*40+(noise()-.5)*28;normalData[i+2]=253;normalData[i+3]=255;
    const v=215+(n-.5)*34+Math.sin(r*1.85)*8;roughData[i]=roughData[i+1]=roughData[i+2]=v;roughData[i+3]=255;
  }
  function texture(data){const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.needsUpdate=true;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
  return {normal:texture(normalData),roughness:texture(roughData)};
}
