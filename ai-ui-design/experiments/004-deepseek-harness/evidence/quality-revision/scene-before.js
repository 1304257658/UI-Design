import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { sample, smooth, clamp, modules } from './story.js';

export function createScene(host,labels,{question,answer,select}) {
 const scene=new THREE.Scene(),cssScene=new THREE.Scene();
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 host.append(renderer.domElement);
 const css=new CSS3DRenderer();css.domElement.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden';host.append(css.domElement);
 const camera=new THREE.OrthographicCamera(-6,6,4,-4,.1,100);camera.position.set(0,0,20);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xffffff,0x617a78,2.6));
 const sun=new THREE.DirectionalLight(0xffffff,3.5);sun.position.set(-4,8,10);scene.add(sun);
 const fill=new THREE.DirectionalLight(0xa4d8ff,1.8);fill.position.set(5,-2,4);scene.add(fill);
 const allMaterials=[],allGeometries=[],textures=[];
 const geom=g=>(allGeometries.push(g),g);
 const mat=m=>(allMaterials.push(m),m);
 const basic=(color,opacity=1)=>mat(new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false}));
 const metal=color=>mat(new THREE.MeshStandardMaterial({color,metalness:.38,roughness:.45,transparent:true}));
 function box(w,h,d,color,r=.035){return new THREE.Mesh(geom(new RoundedBoxGeometry(w,h,d,2,r)),metal(color));}
 function line(points,color=0xa2b7b5,opacity=.5){const g=geom(new THREE.BufferGeometry().setFromPoints(points.map(v=>new THREE.Vector3(...v))));const material=mat(new THREE.LineBasicMaterial({color,transparent:true,opacity}));const l=new THREE.Line(g,material);scene.add(l);return l;}
 const panelEl=document.createElement('div');panelEl.className='workbench';panelEl.setAttribute('aria-hidden','true');
 panelEl.innerHTML=`<div class="workbench-top"><span class="window-dots"><i></i><i></i><i></i></span><span>DeepSeek Harness</span><span>local workspace</span></div><div class="workbench-body"><div class="workbench-side"><strong>deepseek <span style="color:#6b9bb0">harness</span></strong><div class="side-row">新建会话</div><div class="side-title">WORKSPACE</div><div class="side-row current">ui-design</div><div class="side-row">启动流程分析</div><div class="side-title">CAPABILITIES</div><div class="side-row">Files & Terminal</div><div class="side-row">Skills & Tools</div><div class="side-row">Model settings</div></div><div class="workbench-content"><div class="workbench-breadcrumb"><span>ui-design / architecture</span><span>standard</span></div><div class="workbench-welcome"><div class="welcome-kicker">EVERYTHING IS A PLUGIN</div><h3>从一个问题开始。</h3><p>理解项目，然后一起完成工作。</p></div><div class="query-compose"><span class="question-draft"></span><div class="compose-bottom"><span>DeepSeek · standard preset</span><span class="send-mark">发送 ↑</span></div></div><div class="message-query" hidden></div><div class="message-answer" hidden><div class="answer-author">DEEPSEEK HARNESS</div><span class="answer-text"></span><span class="answer-caret"></span></div><div class="workbench-foot"><span>WEB PROFILE / STANDARD PRESET</span><span class="panel-status">等待提问</span></div></div></div>`;
 const panel=new CSS3DObject(panelEl);cssScene.add(panel);
 const panelBack=box(780,470,6,0x233b44,4);scene.add(panelBack);
 const group=new THREE.Group();scene.add(group);
 const pieces=[],labelItems=[];
 function addLabel(id,anchor,caption){const data=modules.find(m=>m.id===id),el=document.createElement('button');el.className='layer-label';el.dataset.select=id;el.setAttribute('aria-label',`查看${data.name}的作用`);el.setAttribute('aria-pressed','false');el.innerHTML=`<small>${data.n}</small>${caption||data.en}`;el.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')select(id);});el.addEventListener('focus',()=>select(id));el.addEventListener('click',()=>select(id));labels.append(el);labelItems.push({id,el,anchor});return el;}
 function plate(id,w,h,x,y,order,color=0xe9f0ec){
  const g=new THREE.Group();const shell=box(w,h,.105,0x556d76);g.add(shell);const top=box(w-.035,h-.035,.028,color);top.position.z=.067;g.add(top);
  const rim=new THREE.LineSegments(geom(new THREE.EdgesGeometry(new THREE.BoxGeometry(w,h,.105))),mat(new THREE.LineBasicMaterial({color:0x8fa9b4,transparent:true,opacity:.7})));g.add(rim);
  // Abstract circuit routing identifies software modules without implying real hardware.
  const traces=[];
  for(let i=0;i<5;i++){const yy=-h*.34+i*h*.17;traces.push(new THREE.Vector3(-w*.42,yy,.09),new THREE.Vector3(-w*.2,yy,.09),new THREE.Vector3(-w*.2,yy,.09),new THREE.Vector3(-w*.09,yy+.11,.09));}
  g.add(new THREE.LineSegments(geom(new THREE.BufferGeometry().setFromPoints(traces)),mat(new THREE.LineBasicMaterial({color:0x91a6a6,transparent:true,opacity:.6}))));
  for(let i=0;i<3;i++){const chip=box(w*.17,h*.45,.075,i===1?0x536b74:0xb1c2c5);chip.position.set(w*(-.12+i*.23),.01,.13);g.add(chip);const pinGeo=geom(new THREE.BoxGeometry(.035,h*.68,.025));for(let k=0;k<3;k++){const pin=new THREE.Mesh(pinGeo,basic(0x718891));pin.position.set(chip.position.x+(k-1)*w*.035,0,.1);g.add(pin);}}
  for(const sx of [-1,1])for(const sy of [-1,1]){const screw=new THREE.Mesh(geom(new THREE.CylinderGeometry(.025,.025,.03,8)),metal(0x9eaead));screw.rotation.x=Math.PI/2;screw.position.set(sx*(w/2-.085),sy*(h/2-.085),.1);g.add(screw);}
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
 const coreBase=box(2.05,.7,1.2,0x314c60,.09);coreBase.rotation.x=.22;core.add(coreBase);
 const heart=new THREE.Mesh(geom(new THREE.IcosahedronGeometry(.45,1)),mat(new THREE.MeshStandardMaterial({color:0x9ddcf5,emissive:0x3b9fda,emissiveIntensity:.22,metalness:.6,roughness:.23,transparent:true})));heart.position.set(0,.29,.71);core.add(heart);
 const shell=new THREE.LineSegments(geom(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(.61,1))),mat(new THREE.LineBasicMaterial({color:0x71b9da,transparent:true,opacity:.8})));shell.position.copy(heart.position);core.add(shell);
 for(let i=0;i<14;i++){const pin=box(.045,.15,.08,0x9dc4cf,.01);pin.position.set(-.8+i*.12,-.37,.45);core.add(pin);}
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
 const particles=[];for(let i=0;i<150;i++){const material=mat(new THREE.SpriteMaterial({map:digits[i%2],transparent:true,depthWrite:false,depthTest:false,opacity:0,color:0x318acb}));const sprite=new THREE.Sprite(material);sprite.scale.set(.10,.155,1);sprite.renderOrder=9;scene.add(sprite);particles.push({sprite,seed:((i*137.508)%997)/997,offset:(i%7-3)*.085});}
 let current=0,selected='ui',width=1,height=1,narrow=false,disposed=false;
 const temp=new THREE.Vector3();
 function project(v){temp.copy(v).project(camera);return{x:(temp.x*.5+.5)*width,y:(-.5*temp.y+.5)*height};}
 function draw(){renderer.render(scene,camera);css.render(cssScene,camera);}
 function update(p){if(disposed)return;current=p;const s=sample(p);const panelScale=THREE.MathUtils.lerp(narrow?.0093:.0105,.0055,s.open);
  panel.scale.setScalar(panelScale);panel.position.set(0,THREE.MathUtils.lerp(.08,2.96,s.open),2.4*(1-s.open));panel.rotation.set(-1.515*s.open,0,-.018*s.open);
  panelBack.scale.copy(panel.scale);panelBack.position.copy(panel.position);panelBack.position.z-=.07;panelBack.rotation.copy(panel.rotation);
  panelEl.querySelector('.workbench-welcome').style.display=p<.108?'block':'none';panelEl.querySelector('.query-compose').style.display=p<.108?'block':'none';panelEl.querySelector('.question-draft').textContent=question.slice(0,Math.round(question.length*s.sent));
  const query=panelEl.querySelector('.message-query');query.hidden=p<.108;query.textContent=question;
  const output=panelEl.querySelector('.message-answer');output.hidden=s.response===0;panelEl.querySelector('.answer-text').textContent=answer.slice(0,Math.round(answer.length*s.response));panelEl.querySelector('.answer-caret').style.display=s.response>=1?'none':'inline-block';panelEl.querySelector('.panel-status').textContent=p>=1?'已完成':p>.108?'正在理解项目…':'等待提问';
  // Exact edge-on text is concealed; the matching physical panel remains visible.
  panelEl.style.opacity=String(1-smooth(s.open,.88,.99));
  pieces.forEach(item=>{const local=smooth(p,.265+item.order*.024,.35+item.order*.038)*(1-smooth(p,.825+item.order*.009,.905));item.g.visible=local>.001;item.g.position.set(item.x*(narrow?.86:1),THREE.MathUtils.lerp(2.5,item.y,local),0);item.g.rotation.set(-.86*local,0,-.075*local);item.g.scale.set(local*(narrow&&Math.abs(item.x)>2?.9:1),local,local);item.materials.forEach(({material,opacity})=>material.opacity=opacity*local);item.rim.material.color.set(item.id===selected?0x267fa9:0x8fa9b4);});
  const r=s.reveal;core.visible=r>.01;core.scale.setScalar(r);heart.rotation.set(.15+p*.9,p*2,.2);shell.rotation.set(.1,-p*1.5,.2);heart.material.emissiveIntensity=.2+.6*s.returnFlow;
  framework.visible=r>.01;framework.material.opacity=.32*r;
  routes.forEach(({l,id})=>{l.visible=r>.01;l.material.opacity=(id==='framework'?.18:.48)*r;l.scale.x=narrow?.86:1;l.material.color.set(id.startsWith('tools')&&p>.49&&p<.66?0x3b91bc:id==='main'&&s.returnFlow>0?0x79b8da:0x99afaf);});
  pulse.visible=p>.295&&p<.663;
  if(p<.49){const t=clamp((p-.295)/.195);pulse.position.set(0,2.85-t*5.63,.55);}else{const sx=narrow?.86:1;const toolPath=[[0,-2.8],[0,.12],[3.22,.12],[3.22,-.38],[2.4,-.38],[2.4,-1.98],[-3.27,-1.98],[-3.27,-.95],[-2.45,-.95],[-2.45,-.22],[0,-.22],[0,-1.47],[0,-2.8]].map(([x,y])=>new THREE.Vector3(x*sx,y,.6));const t=clamp((p-.49)/.173)*(toolPath.length-1),idx=Math.min(toolPath.length-2,Math.floor(t));pulse.position.lerpVectors(toolPath[idx],toolPath[idx+1],t-idx);}
  const flowT=(p-.68)/.16;
  particles.forEach(({sprite,seed,offset},i)=>{const t=flowT*1.55-seed*.55;sprite.visible=t>=0&&t<=1&&s.returnFlow>.001;if(sprite.visible){curve.getPoint(clamp(t),sprite.position);sprite.position.x+=Math.sin(seed*17+t*9)*.13+offset;sprite.position.z+=seed*.24;sprite.material.opacity=(.45+.45*seed)*s.returnFlow;}});
  labelItems.forEach(({id,el,anchor})=>{let visible=r>.3;if(id==='ui')visible=s.open>.8&&p<.9;if(id==='cordis')visible=r>.6;const piece=pieces.find(item=>item.id===id);if(piece)visible=piece.g.visible&&piece.g.scale.y>.7;el.hidden=!visible;if(visible){const point=project(anchor());const half=el.offsetWidth/2;el.style.left=`${clamp(point.x,half+8,width-half-8)}px`;el.style.top=`${point.y}px`;el.setAttribute('aria-pressed',String(id===selected));}});
  draw();
 }
 function resize(){if(disposed)return;width=host.clientWidth;height=host.clientHeight;if(!width||!height)return;narrow=width<520;const aspect=width/height;const viewWidth=Math.max(narrow?8.4:10.1,aspect*8.3),viewHeight=viewWidth/aspect;camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix();renderer.setSize(width,height);css.setSize(width,height);update(current);}
 function highlight(id){selected=id;update(current);}
 function dispose(){disposed=true;allGeometries.forEach(g=>g.dispose());allMaterials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();css.domElement.remove();labels.replaceChildren();}
 resize();update(0);return{update,resize,highlight,dispose};
}
