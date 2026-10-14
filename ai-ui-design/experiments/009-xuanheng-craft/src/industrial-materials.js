import * as THREE from 'three';

// Small deterministic surface variations, at the scale of paint and machining rather than damage.
export function industrialMaterials(){
  const size=512;let seed=781;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  function texture(kind){
    const data=new Uint8Array(size*size*4),rows=Array.from({length:size},()=>random());
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const i=(y*size+x)*4,n=random(),line=rows[y],v=kind==='paint'?220+(n-.5)*14:212+(line-.5)*24+(n-.5)*8;
      data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;
    }
    const t=new THREE.DataTexture(data,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.anisotropy=8;t.needsUpdate=true;return t;
  }
  const paintGrain=texture('paint'),brushing=texture('metal');
  const painted=new THREE.MeshPhysicalMaterial({color:0x777d7d,metalness:.08,roughness:.58,roughnessMap:paintGrain,bumpMap:paintGrain,bumpScale:.003,clearcoat:.05,clearcoatRoughness:.48});
  const graphite=new THREE.MeshStandardMaterial({color:0x11191e,metalness:.32,roughness:.55,roughnessMap:paintGrain,bumpMap:paintGrain,bumpScale:.003});
  const steel=new THREE.MeshPhysicalMaterial({color:0x9aa4ac,metalness:1,roughness:.39,roughnessMap:brushing,bumpMap:brushing,bumpScale:.003,anisotropy:.45});
  const bright=new THREE.MeshPhysicalMaterial({color:0xc4cbd0,metalness:1,roughness:.26,roughnessMap:brushing,bumpMap:brushing,bumpScale:.0018,anisotropy:.35});
  const liner=new THREE.MeshPhysicalMaterial({color:0x707b81,metalness:1,roughness:.49,roughnessMap:brushing,bumpMap:brushing,bumpScale:.003,anisotropy:.55});
  return {painted,graphite,steel,bright,liner};
}
