import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { sample, smooth, clamp, modules } from './story.js';

export function createScene(host,labels,{question,answer,select}) {
 const scene=new THREE.Scene(),cssScene=new THREE.Scene();scene.background=new THREE.Color(0x282d35);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x171a1f,1);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
 host.append(renderer.domElement);
 const css=new CSS3DRenderer();css.domElement.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden';host.append(css.domElement);
 const camera=new THREE.OrthographicCamera(-6,6,4,-4,.1,100);camera.position.set(0,0,20);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xc6e6ff,0x10121c,.7));
 const sun=new THREE.DirectionalLight(0xffeed8,2.4);sun.position.set(-4,8,10);scene.add(sun);
 const fill=new THREE.DirectionalLight(0x619de3,1.2);fill.position.set(5,-2,4);scene.add(fill);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
 const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});target.samples=2;
 const composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));
 const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.28,.35,1.3);composer.addPass(bloom);composer.addPass(new OutputPass());
 const allMaterials=[],allGeometries=[],textures=[];
 const geom=g=>(allGeometries.push(g),g);
 const mat=m=>(allMaterials.push(m),m);
 const basic=(color,opacity=1)=>mat(new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false}));
 const metal=color=>mat(new THREE.MeshPhysicalMaterial({color,metalness:.88,roughness:.27,clearcoat:.4,clearcoatRoughness:.24,envMapIntensity:.75,transparent:true}));
 const glow=(color=0x4ba5ee,intensity=2.3)=>mat(new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:intensity,roughness:.25,metalness:.4,transparent:true}));
 function box(w,h,d,color,r=.035){return new THREE.Mesh(geom(new RoundedBoxGeometry(w,h,d,2,r)),metal(color));}
 function line(points,color=0xa2b7b5,opacity=.5){const g=geom(new THREE.BufferGeometry().setFromPoints(points.map(v=>new THREE.Vector3(...v))));const material=mat(new THREE.LineBasicMaterial({color,transparent:true,opacity}));const l=new THREE.Line(g,material);scene.add(l);return l;}
 const panelEl=document.createElement('div');panelEl.className='workbench';panelEl.setAttribute('aria-hidden','true');
 panelEl.innerHTML=`<div class="workbench-top"><span class="window-dots"><i></i><i></i><i></i></span><span>DeepSeek Harness</span><span>local workspace</span></div><div class="workbench-body"><div class="workbench-side"><strong>deepseek <span style="color:#6b9bb0">harness</span></strong><div class="side-row">新建会话</div><div class="side-title">WORKSPACE</div><div class="side-row current">ui-design</div><div class="side-row">启动流程分析</div><div class="side-title">CAPABILITIES</div><div class="side-row">Files & Terminal</div><div class="side-row">Skills & Tools</div><div class="side-row">Model settings</div></div><div class="workbench-content"><div class="workbench-breadcrumb"><span>ui-design / architecture</span><span>standard</span></div><div class="workbench-welcome"><div class="welcome-kicker">EVERYTHING IS A PLUGIN</div><h3>从一个问题开始。</h3><p>理解项目，然后一起完成工作。</p></div><div class="query-compose"><span class="question-draft"></span><div class="compose-bottom"><span>DeepSeek · standard preset</span><span class="send-mark">发送 ↑</span></div></div><div class="message-query" hidden></div><div class="message-answer" hidden><div class="answer-author">DEEPSEEK HARNESS</div><span class="answer-text"></span><span class="answer-caret"></span></div><div class="workbench-foot"><span>WEB PROFILE / STANDARD PRESET</span><span class="panel-status">等待提问</span></div></div></div>`;
 const panel=new CSS3DObject(panelEl);cssScene.add(panel);
 const panelBack=box(780,470,6,0x233b44,4);scene.add(panelBack);
 const group=new THREE.Group();scene.add(group);
 const pieces=[],labelItems=[];
 function addLabel(id,anchor,caption){const data=modules.find(m=>m.id===id),el=document.createElement('button');el.className='layer-label';el.dataset.select=id;el.setAttribute('aria-label',`查看${data.name}的作用`);el.setAttribute('aria-pressed','false');el.innerHTML=`<small>${data.n}</small>${caption||data.en}`;el.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')select(id);});el.addEventListener('focus',()=>select(id));el.addEventListener('click',()=>select(id));labels.append(el);labelItems.push({id,el,anchor});return el;}
 function roundedShape(w,h,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
 function frame(w,h,z=.12){const s=roundedShape(w,h,.12);s.holes.push(new THREE.Path(roundedShape(w-.18,h-.18,.06).getPoints(12).reverse()));return new THREE.Mesh(geom(new THREE.ExtrudeGeometry(s,{depth:z,bevelEnabled:true,bevelThickness:.018,bevelSize:.018,bevelSegments:3,steps:1})),metal(0x68747e));}
 function ring(parent,r,t,x,y,z,color=0x667b8a,emissive=false){const m=new THREE.Mesh(geom(new THREE.TorusGeometry(r,t,10,64)),emissive?glow(color):metal(color));m.position.set(x,y,z);parent.add(m);return m;}
 function plate(id,w,h,x,y,order){
  const g=new THREE.Group(),carrier=box(w,h,.13,0x111c29,.075);g.add(carrier);
  const rim=frame(w,h);rim.position.z=.08;g.add(rim);
  const inset=box(w-.23,h-.23,.07,0x202f40,.06);inset.position.z=.095;g.add(inset);
  if(['context','session','tools'].includes(id)){carrier.visible=false;rim.visible=false;inset.visible=false;}
  const lightStrip=new THREE.Mesh(geom(new THREE.BoxGeometry(w-.35,.018,.018)),glow(id==='context'?0x65cdbb:0x3688dc,1.5));lightStrip.position.set(0,-h/2+.11,.15);g.add(lightStrip);lightStrip.visible=!['context','session','tools'].includes(id);
  if(id==='loop'){
    for(let i=0;i<4;i++)ring(g,.39+i*.065,i===0?.033:.018,0,0,.24+i*.014,i===0?0x52a7ee:0x708da2,i===0);
    const heartDisc=new THREE.Mesh(geom(new THREE.CylinderGeometry(.33,.33,.1,64)),metal(0x3c5b7c));heartDisc.rotation.x=Math.PI/2;heartDisc.position.z=.23;g.add(heartDisc);
    for(let i=0;i<48;i++){const angle=i/48*Math.PI*2;const tick=box(.012,.053,.025,i%4?0x6e8695:0xbedbea,.004);tick.position.set(Math.cos(angle)*.59,Math.sin(angle)*.59,.2);tick.rotation.z=angle-Math.PI/2;g.add(tick);}
    for(const sx of [-1,1])for(let i=0;i<9;i++){const fin=box(.055,.67,.16,0x536674,.014);fin.position.set(sx*(.92+i*.089),0,.23);g.add(fin);}
  }else if(id==='gateway'){
    for(let i=0;i<5;i++){const socket=frame(.43,.66,.06);socket.position.set(-1.1+i*.55,0,.16);g.add(socket);const slot=box(.29,.45,.09,0x050b13);slot.position.copy(socket.position);slot.position.z=.18;g.add(slot);for(let j=0;j<3;j++){const pin=new THREE.Mesh(geom(new THREE.BoxGeometry(.026,.23,.025)),glow(0x6faada,.7));pin.position.set(socket.position.x+(j-1)*.06,0,.26);g.add(pin);}}
  }else if(id==='llm'){
    for(let i=0;i<22;i++){const fin=box(.065,.68,.18,0x6e7f90,.015);fin.position.set(-1.31+i*.125,0,.25);fin.rotation.z=-.2;g.add(fin);}
    const cap=box(1.02,.3,.14,0x162a43);cap.position.set(0,0,.42);g.add(cap);for(let i=0;i<5;i++){const pin=new THREE.Mesh(geom(new THREE.BoxGeometry(.1,.018,.024)),glow(0x66b0ef,1.7));pin.position.set((i-2)*.16,0,.5);g.add(pin);}
  }else if(id==='context'){
    for(let i=0;i<4;i++){const page=box(1.25,.8,.055,0x537d82,.05);page.position.set((i-1.5)*.07,(i-1.5)*.045,.2+i*.082);g.add(page);for(let j=0;j<3;j++){const etch=new THREE.Mesh(geom(new THREE.BoxGeometry(.5-j*.08,.012,.01)),basic(0x9ad7cf,.7));etch.position.set(page.position.x-.06,page.position.y+(j-1)*.105,page.position.z+.03);g.add(etch);}}
  }else if(id==='session'){
    for(let i=0;i<6;i++){const disk=new THREE.Mesh(geom(new THREE.CylinderGeometry(.57,.57,.072,64)),metal(i%2?0x637786:0x263e54));disk.rotation.x=Math.PI/2;disk.position.set(0,i*.028-.1,.18+i*.072);g.add(disk);ring(g,.52,.012,0,disk.position.y,disk.position.z+.029,0x4b8ead,i===5);}ring(g,.105,.015,0,.04,.60,0xafd2ea,true);
  }else if(id==='tools'){
    for(const x of [-.34,.34]){const nut=new THREE.Mesh(geom(new THREE.CylinderGeometry(.37,.37,.25,6)),metal(0x7c8990));nut.rotation.x=Math.PI/2;nut.position.set(x,0,.3);g.add(nut);ring(g,.18,.037,x,0,.43,0x1d3144);ring(g,.115,.015,x,0,.45,0x58a7db,true);}
  }
  if(!['context','session','tools'].includes(id))for(const sx of [-1,1])for(const sy of [-1,1]){const screw=new THREE.Mesh(geom(new THREE.CylinderGeometry(.038,.038,.04,12)),metal(0xb0c2cc));screw.rotation.x=Math.PI/2;screw.position.set(sx*(w/2-.115),sy*(h/2-.115),.22);g.add(screw);const slot=new THREE.Mesh(geom(new THREE.BoxGeometry(.049,.01,.005)),basic(0x1c2a30));slot.position.copy(screw.position);slot.position.z+=.024;g.add(slot);}
  group.add(g);const item={id,g,x,y,order,w,h,rim,materials:[]};g.traverse(o=>{if(o.material)item.materials.push({material:o.material,opacity:o.material.opacity});});pieces.push(item);
  addLabel(id,()=>new THREE.Vector3(g.position.x,g.position.y-.52,g.position.z+.12));return item;
 }
 plate('gateway',4.15,1.23,0,1.72,0,0xe2eae7);
 plate('loop',4.15,1.55,0,.12,1,0xcbdcdb);
 plate('llm',3.7,1.2,0,-1.47,2,0xd3e1e8);
 plate('context',1.65,1.15,-3.27,.93,1.3,0xe6ece2);
 plate('session',1.65,1.2,-3.27,-.95,2,0xe3e9df);
 plate('tools',1.75,1.4,3.22,.10,1.7,0xd6e0e3);
 const core=new THREE.Group();group.add(core);core.position.set(0,-2.94,0);
 const cradle=new THREE.Group();cradle.rotation.x=-.5;core.add(cradle);
 for(let i=0;i<3;i++){const disc=new THREE.Mesh(geom(new THREE.CylinderGeometry(.9-i*.08,.9-i*.08,.12,64)),metal(0x3d5266));disc.rotation.x=Math.PI/2;disc.position.z=i*.13;cradle.add(disc);ring(cradle,.82-i*.075,.018,0,0,i*.13+.075,i===2?0x3389df:0x7295ad,i===2);}
 const heart=new THREE.Mesh(geom(new THREE.IcosahedronGeometry(.34,2)),mat(new THREE.MeshPhysicalMaterial({color:0x578bd7,emissive:0x3b9fda,emissiveIntensity:.9,metalness:.75,roughness:.17,clearcoat:1,transparent:true})));heart.position.set(0,.17,.72);core.add(heart);
 const shell=new THREE.Group();shell.position.copy(heart.position);core.add(shell);
 for(let i=0;i<3;i++){const tor=ring(shell,.53+i*.052,.013,0,0,0,0x5fabf2,true);tor.rotation.set(i*.72,i*.86,0);}
 addLabel('model',()=>new THREE.Vector3(0,core.position.y-.53,.3));
 addLabel('ui',()=>new THREE.Vector3(0,3.4,0),'Web UI');
 addLabel('cordis',()=>new THREE.Vector3(-3.28,-2.86,0),'Cordis / plugins');
 const routes=[];
 function route(points,id,color=0x7a989e){const l=line(points,color,.45);group.add(l);routes.push({l,id});return points;}
 const mainRoute=route([[0,2.97,0],[0,1.72,0],[0,.12,0],[0,-1.47,0],[0,-2.94,0]],'main');
 route([[-3.27,.93,0],[-2.45,.93,0],[-2.45,.12,0],[0,.12,0]],'context');
 route([[-3.27,-.95,0],[-2.45,-.95,0],[-2.45,-.22,0],[0,-.22,0]],'session');
 route([[0,.12,0],[2.35,.12,0],[3.22,.12,0]],'tools');
 route([[3.22,-.38,0],[2.4,-.38,0],[2.4,-1.98,0],[-3.27,-1.98,0],[-3.27,-.95,0]],'tools-return');
 const framework=line([[-4.45,2.25,-.6],[-4.45,-2.45,-.6],[4.45,-2.45,-.6],[4.45,2.25,-.6]],0xa8b9b3,.32);group.add(framework);
 for(const yy of [1.75,.12,-1.47])route([[-4.45,yy,-.6],[4.45,yy,-.6]],'framework',0xc0ccc5);
 const pulse=new THREE.Mesh(geom(new THREE.SphereGeometry(.064,12,12)),basic(0x448bbb));scene.add(pulse);
 const pulseHalo=new THREE.Mesh(geom(new THREE.SphereGeometry(.11,12,12)),basic(0x65bcff,.17));pulse.add(pulseHalo);
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-2.8,.8),new THREE.Vector3(.7,-1.8,.8),new THREE.Vector3(-.28,-.1,1),new THREE.Vector3(.34,1.4,.8),new THREE.Vector3(0,2.94,.4)]);
 function digitTexture(digit){const c=document.createElement('canvas');c.width=32;c.height=48;const ctx=c.getContext('2d');ctx.fillStyle='#a9dafa';ctx.font='bold 34px monospace';ctx.textAlign='center';ctx.fillText(digit,16,36);const t=new THREE.CanvasTexture(c);textures.push(t);return t;}
 const digits=[digitTexture('0'),digitTexture('1')];
 const particles=[];for(let i=0;i<150;i++){const material=mat(new THREE.SpriteMaterial({map:digits[i%2],transparent:true,depthWrite:false,depthTest:false,opacity:0,color:new THREE.Color(.65,1.6,2.8),toneMapped:false}));const sprite=new THREE.Sprite(material);sprite.scale.set(.115,.18,1);sprite.renderOrder=9;scene.add(sprite);particles.push({sprite,seed:((i*137.508)%997)/997,offset:(i%7-3)*.085});}
 let current=0,selected='ui',width=1,height=1,narrow=false,disposed=false;
 const temp=new THREE.Vector3();
 function project(v){temp.copy(v).project(camera);return{x:(temp.x*.5+.5)*width,y:(-.5*temp.y+.5)*height};}
 function draw(){composer.render();css.render(cssScene,camera);}
 function update(p){if(disposed)return;current=p;const s=sample(p);const panelScale=THREE.MathUtils.lerp(narrow?.0093:Math.min(.0135,(camera.right-camera.left)*.86/780),.0055,s.open);
  panel.scale.setScalar(panelScale);panel.position.set(0,THREE.MathUtils.lerp(.08,2.96,s.open),2.4*(1-s.open));panel.rotation.set(-1.515*s.open,0,-.018*s.open);
  panelBack.scale.copy(panel.scale);panelBack.position.copy(panel.position);panelBack.position.z-=.07;panelBack.rotation.copy(panel.rotation);
  panelEl.querySelector('.workbench-welcome').style.display=p<.108?'block':'none';panelEl.querySelector('.query-compose').style.display=p<.108?'block':'none';panelEl.querySelector('.question-draft').textContent=question.slice(0,Math.round(question.length*s.sent));
  const query=panelEl.querySelector('.message-query');query.hidden=p<.108;query.textContent=question;
  const output=panelEl.querySelector('.message-answer');output.hidden=s.response===0;panelEl.querySelector('.answer-text').textContent=answer.slice(0,Math.round(answer.length*s.response));panelEl.querySelector('.answer-caret').style.display=s.response>=1?'none':'inline-block';panelEl.querySelector('.panel-status').textContent=p>=1?'已完成':p>.108?'正在理解项目…':'等待提问';
  // Exact edge-on text is concealed; the matching physical panel remains visible.
  panelEl.style.opacity=String(1-smooth(s.open,.88,.99));
  pieces.forEach(item=>{const local=smooth(p,.265+item.order*.024,.35+item.order*.038)*(1-smooth(p,.825+item.order*.009,.905));item.g.visible=local>.001;item.g.position.set(item.x*(narrow?.86:1),THREE.MathUtils.lerp(2.5,item.y,local),0);item.g.rotation.set(-.68*local,.18*local,-.045*local);item.g.scale.set(local*(narrow&&Math.abs(item.x)>2?.9:1),local,local);item.materials.forEach(({material,opacity})=>material.opacity=opacity*local);item.rim.material.color.set(item.id===selected?0x9ebbd3:0x68747e);});
  const r=s.reveal;core.visible=r>.01;core.scale.setScalar(r);heart.rotation.set(.15+p*.9,p*2,.2);shell.rotation.set(.1,-p*1.5,.2);heart.material.emissiveIntensity=.65+1.4*s.returnFlow;
  framework.visible=r>.01;framework.scale.x=narrow?.86:1;framework.material.opacity=.10*r;
  routes.forEach(({l,id})=>{l.visible=r>.01;l.material.opacity=(id==='framework'?.055:.24)*r;l.scale.x=narrow?.86:1;l.material.color.set(id.startsWith('tools')&&p>.49&&p<.66?0x3b91bc:id==='main'&&s.returnFlow>0?0x79b8da:0x99afaf);});
  pulse.visible=p>.295&&p<.663;
  if(p<.49){const t=clamp((p-.295)/.195);pulse.position.set(0,2.85-t*5.63,.55);}else{const sx=narrow?.86:1;const toolPath=[[0,-2.8],[0,.12],[3.22,.12],[3.22,-.38],[2.4,-.38],[2.4,-1.98],[-3.27,-1.98],[-3.27,-.95],[-2.45,-.95],[-2.45,-.22],[0,-.22],[0,-1.47],[0,-2.8]].map(([x,y])=>new THREE.Vector3(x*sx,y,.6));const t=clamp((p-.49)/.173)*(toolPath.length-1),idx=Math.min(toolPath.length-2,Math.floor(t));pulse.position.lerpVectors(toolPath[idx],toolPath[idx+1],t-idx);}
  const flowT=(p-.68)/.16;
  particles.forEach(({sprite,seed,offset},i)=>{const t=flowT*1.55-seed*.55;sprite.visible=t>=0&&t<=1&&s.returnFlow>.001;if(sprite.visible){curve.getPoint(clamp(t),sprite.position);sprite.position.x+=Math.sin(seed*17+t*9)*.13+offset;sprite.position.z+=seed*.24;sprite.material.opacity=(.7+.3*seed)*s.returnFlow;}});
  labelItems.forEach(({id,el,anchor})=>{let visible=r>.3;if(id==='ui')visible=s.open>.8&&p<.9;if(id==='cordis')visible=r>.6;const piece=pieces.find(item=>item.id===id);if(piece)visible=piece.g.visible&&piece.g.scale.y>.7;el.hidden=!visible;if(visible){const point=project(anchor());const half=el.offsetWidth/2;el.style.left=`${clamp(point.x,half+8,width-half-8)}px`;el.style.top=`${point.y}px`;el.setAttribute('aria-pressed',String(id===selected));}});
  draw();
 }
 function resize(){if(disposed)return;width=host.clientWidth;height=host.clientHeight;if(!width||!height)return;narrow=width<520;const aspect=width/height;const viewWidth=Math.max(narrow?8.4:10.1,aspect*8.3),viewHeight=viewWidth/aspect;camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix();renderer.setSize(width,height);composer.setSize(width,height);css.setSize(width,height);update(current);}
 function highlight(id){selected=id;update(current);}
 function dispose(){disposed=true;allGeometries.forEach(g=>g.dispose());allMaterials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());composer.passes.forEach(pass=>pass.dispose?.());composer.dispose();environment.dispose();renderer.dispose();renderer.domElement.remove();css.domElement.remove();labels.replaceChildren();}
 resize();update(0);return{update,resize,highlight,dispose};
}
