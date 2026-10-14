import './style.css';
import { chapterStops, chapterBoundaries, manufacturingPose } from './timeline.js';

const story=document.querySelector('.story');
const stage=document.querySelector('.stage');
const chapters=[...document.querySelectorAll('.chapter')];
const rail=[...document.querySelectorAll('.rail-item')];
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
const anchors=chapterStops;
let scene,frame=0,progress=0,isFallback=false;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
function chapterWeight(p,index){
  const enter=chapterBoundaries[index],exit=chapterBoundaries[index+1];
  return Math.min(index===0?1:clamp((p-enter)/.025),clamp((exit+.025-p)/.025));
}
function refresh(){
  frame=0;const rect=story.getBoundingClientRect();const distance=story.offsetHeight-stage.offsetHeight;
  progress=isFallback?0:clamp(-rect.top/Math.max(1,distance));scene?.update(progress);
  let active=0,max=-1;
  chapters.forEach((el,i)=>{
    const weight=chapterWeight(progress,i);
    if(weight>max){max=weight;active=i;}
    el.classList.toggle('is-active',weight>0);el.style.opacity=weight;el.setAttribute('aria-hidden',String(weight<.5));
    el.inert=weight<.5;
    const offset=reduceMotion.matches?0:(1-weight)*14;
    el.style.transform=innerWidth<=980?`translateY(${offset}px)`:`translateY(calc(-49% + ${offset}px))`;
  });
  rail.forEach((el,i)=>{el.classList.toggle('is-active',i===active);el.setAttribute('aria-current',i===active?'step':'false');el.style.setProperty('--fill',clamp((progress-chapterBoundaries[i])/(chapterBoundaries[i+1]-chapterBoundaries[i])));});
  document.querySelector('.stage-counter').innerHTML=`0${active+1} <span>/ 06</span>`;
  document.body.dataset.stage=String(active);
  const pose=manufacturingPose(progress);
  document.querySelector('.operation-state').textContent=progress<.16?'ENCLOSED MACHINING CELL':progress<.50?(pose.cutting?'FINISHING / 精加工':'POSITIONING / 定位与换位'):progress<.72?'COMPLETE / 制作完成':'MACHINED ALUMINUM / 成品观察';
  document.querySelector('.scroll-cue').style.opacity=progress>.15?0:1;
  document.querySelector('.stage-topline').style.opacity=progress>.15&&progress<.94?0:1;
  document.querySelector('.header').classList.toggle('is-scrolled',scrollY>30);
  document.querySelector('.specimen-caption').style.opacity=active===0||active===5?1:0;
}
function schedule(){if(!frame)frame=requestAnimationFrame(refresh);}
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);
rail.forEach((el,i)=>el.addEventListener('click',()=>{const top=story.getBoundingClientRect().top+scrollY;scrollTo({top:top+anchors[i]*(story.offsetHeight-stage.offsetHeight),behavior:reduceMotion.matches?'instant':'smooth'});}));
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target);}}),{threshold:.12});document.querySelectorAll('.reveal').forEach(e=>observer.observe(e));
const menu=document.querySelector('.menu-toggle'),mobileNav=document.querySelector('.mobile-nav');
function closeMenu(){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','打开导航');mobileNav.hidden=true;}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'关闭导航':'打开导航');mobileNav.hidden=!open;});
mobileNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
const dialog=document.querySelector('#contact-dialog');
document.querySelector('#open-contact').addEventListener('click',()=>dialog.showModal());
document.querySelectorAll('.service-inquiry').forEach(button=>button.addEventListener('click',()=>{
  document.querySelector('#brief-form [name="scope"]').value=button.dataset.scope;
  dialog.showModal();
}));
document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
document.querySelector('#brief-form').addEventListener('submit',e=>{
  e.preventDefault();const data=new FormData(e.target);const text=`自动化方案咨询资料\n\n咨询业务：${data.get('scope')}\n\n项目与应用需求：\n${data.get('problem')}\n\n应用目标：\n${data.get('expectation')||'待进一步沟通'}\n\n可附资料：产品图纸、现场照片、工艺说明。\n`;
  const url=URL.createObjectURL(new Blob(['\ufeff',text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='自动化方案咨询资料.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);document.querySelector('#form-status').textContent='咨询资料已生成并下载。当前页面不会自动发送资料。';
});
function finishLoading(){document.querySelector('.loading').classList.add('is-done');document.documentElement.dataset.sceneReady='true';}
function fallback(error){console.warn('3D presentation unavailable:',error.message);isFallback=true;story.classList.add('is-fallback');document.querySelector('#scene-fallback').hidden=false;document.querySelector('#scene').style.display='none';finishLoading();document.documentElement.dataset.sceneReady='fallback';refresh();}
import('./scene.js').then(async({mountScene})=>{scene=await mountScene(document.querySelector('#scene'),finishLoading,fallback);refresh();}).catch(fallback);
refresh();
// Read-only diagnostics for local acceptance; no camera or object controls are exposed.
window.__craftDiagnostics=()=>({progress,scene:scene?.getState?.(),activeChapter:chapters.findIndex(el=>el.getAttribute('aria-hidden')==='false'),ready:document.documentElement.dataset.sceneReady});
if(import.meta.env.DEV)window.__craftPoster=()=>scene?.capturePoster();
