import './home.css';
import {mountFurniture} from './furniture-scene.js';
import {chapterStops} from './brand.js';
import './home-contact.js';
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const story=document.querySelector('.space-story'),stage=document.querySelector('.space-stage'),copies=[...document.querySelectorAll('.space-copy')],controls=[...document.querySelectorAll('[data-chapter]')],hotspot=document.querySelector('.chair-hotspot'),host=document.querySelector('#room-canvas');
const hashes=['#top','#about','#approach','#belief','#vision'];
const windows=[[0,.068],[.22,.32],[.385,.445],[.575,.705],[.84,1]];
const captions=['向下滚动，让舒适缓缓展开。','一张桌，连接人与空间。','从真实生活中，找到设计的答案。','照顾身体，也关照感受。','每一种日常，都值得被温柔以待。'];
let progress=0,target=0,active=0,room,frame=0,ready=false,failed=false;
const clamp=v=>Math.max(0,Math.min(1,v));
function showCopy(p){let closest=0;chapterStops.forEach((s,i)=>{if(p>=(i? (s+chapterStops[i-1])/2:0))closest=i;});active=closest;
 copies.forEach((e,i)=>{const [a,b]=windows[i];const fade=.018;const opacity=Math.min(a===0?1:clamp((p-a)/fade),b===1?1:clamp((b-p)/fade));const visible=failed||opacity>0;e.style.opacity=opacity;e.style.visibility=visible?'visible':'hidden';e.style.transform=`translateY(${(1-opacity)*9}px)`;e.inert=!visible;e.setAttribute('aria-hidden',String(!visible));});
 controls.forEach(e=>{const yes=Number(e.dataset.chapter)===active;e.classList.toggle('active',yes);if(e.tagName==='BUTTON')e.setAttribute('aria-pressed',String(yes));});
 document.querySelector('#scene-caption').textContent=captions[active];document.querySelector('#space-counter').textContent=`0${active+1} / 05`;
 const clickReady=ready&&!failed&&p<=.065;hotspot.hidden=!clickReady;if(clickReady){const pos=room.anchor();hotspot.style.left=`${pos.x}px`;hotspot.style.top=`${pos.y}px`;}
 stage.dataset.chapter=active;
}
function draw(){frame=0;if(failed){showCopy(0);return;}progress=reduced?target:progress+(target-progress)*.16;if(Math.abs(target-progress)<.00008)progress=target;let sceneProgress=progress;if(reduced)sceneProgress=chapterStops.reduce((a,b)=>Math.abs(b-progress)<Math.abs(a-progress)?b:a);room?.render(sceneProgress);showCopy(reduced?sceneProgress:progress);document.querySelector('.story-progress i').style.transform=`scaleX(${progress})`;if(progress!==target)frame=requestAnimationFrame(draw);}
function update(){target=clamp((scrollY-story.offsetTop)/(story.offsetHeight-innerHeight));if(!frame)frame=requestAnimationFrame(draw);}
controls.forEach(e=>e.addEventListener('click',event=>{event.preventDefault();const i=Number(e.dataset.chapter);scrollTo({top:story.offsetTop+chapterStops[i]*(story.offsetHeight-innerHeight),behavior:reduced?'instant':'smooth'});history.replaceState(null,'',hashes[i]);}));
host.addEventListener('pointermove',e=>{const hit=room?.hitChair(e.clientX,e.clientY);host.style.cursor=hit?'pointer':'default';hotspot.classList.toggle('hovered',!!hit);});
host.addEventListener('pointerleave',()=>hotspot.classList.remove('hovered'));
host.addEventListener('click',e=>{if(room?.hitChair(e.clientX,e.clientY))location.href='/products/contour-01/';});
function fail(){failed=true;document.querySelector('.room-loader').classList.add('done');document.querySelector('.room-failure').hidden=false;document.body.classList.add('scene-failed');hotspot.hidden=true;update();}
document.querySelector('#retry-room').addEventListener('click',()=>location.reload());host.addEventListener('renderfailure',fail);
addEventListener('scroll',update,{passive:true});addEventListener('resize',update);update();
mountFurniture(host).then(r=>{room=r;ready=true;r.render(progress);document.querySelector('.room-loader').classList.add('done');update();}).catch(error=>{console.error('Furniture scene load failed',error);fail();});
function restore(){const i=hashes.indexOf(location.hash);if(i>=0)scrollTo({top:story.offsetTop+chapterStops[i]*(story.offsetHeight-innerHeight),behavior:'instant'});update();}addEventListener('load',restore);document.fonts.ready.then(update);
window.__homeDiagnostics=()=>({ready,failed,active,progress,target,overflow:document.documentElement.scrollWidth>innerWidth,scene:room?.getState(),reduced});
