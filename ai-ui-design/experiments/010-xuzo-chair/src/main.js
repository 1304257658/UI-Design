import './style.css';
import {mountScene,chapterStops,chapterBounds} from './chair-sequence.js';
const story=document.querySelector('.story'),stage=document.querySelector('.stage'),chapters=[...document.querySelectorAll('.chapter')],reduced=matchMedia('(prefers-reduced-motion:reduce)');
let scene,ready=false,progress=0,target=0,raf=0,last=0,visible=true,fallback=false;
const clamp=v=>Math.max(0,Math.min(1,v));
function go(i){if(fallback){document.querySelector(i===0?'#top':'#design').scrollIntoView({behavior:reduced.matches?'instant':'smooth'});return;}const top=story.getBoundingClientRect().top+scrollY;scrollTo({top:top+chapterStops[i]*(story.offsetHeight-stage.offsetHeight),behavior:reduced.matches?'instant':'smooth'});}
document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();go(+b.dataset.step);}));
function measure(){target=fallback?0:clamp(-story.getBoundingClientRect().top/(story.offsetHeight-stage.offsetHeight));document.querySelector('header').classList.toggle('scrolled',scrollY>25);request();}
function request(){if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(draw);}
function draw(now){raf=0;const dt=last?Math.min((now-last)/1000,.08):.016;last=now;progress=reduced.matches?target:progress+(target-progress)*(1-Math.exp(-dt*11));if(Math.abs(target-progress)<.00002)progress=target;
 scene?.render(progress);if(fallback)updateText(0);
 if(ready&&progress!==target)request();
}
function updateText(progress){let active=0;
 chapters.forEach((c,i)=>{const start=chapterBounds[i],end=chapterBounds[i+1];let opacity=1;if(progress<start||progress>end)opacity=0;else opacity=Math.min(i===0?1:clamp((progress-start)/.025),i===5?1:clamp((end-progress)/.022));c.style.opacity=opacity;c.style.transform=`translateY(calc(-45% + ${(1-opacity)*12}px))`;c.classList.toggle('active',opacity>0);c.setAttribute('aria-hidden',opacity<.5?'true':'false');c.inert=opacity<.5;if(progress>=start)active=i;});
 document.body.dataset.chapter=active;
}
addEventListener('scroll',measure,{passive:true});addEventListener('resize',measure);document.addEventListener('visibilitychange',()=>{last=0;if(!document.hidden)request();});new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible){last=0;request();}},{rootMargin:'100px'}).observe(story);
function fail(e){console.warn(e);fallback=true;story.classList.add('fallback');document.querySelector('#scene').style.display='none';const poster=document.querySelector('#poster');poster.src='/products/contour-sage/poster.webp';poster.hidden=false;document.querySelector('.loading').classList.add('done');document.documentElement.dataset.ready='fallback';target=0;request();}
document.querySelector('#scene').addEventListener('renderfailure',event=>fail(new Error(event.detail||'Chair sequence unavailable')));
mountScene(document.querySelector('#scene'),{onFrame:updateText}).then(s=>{scene=s;ready=true;document.querySelector('.loading').classList.add('done');document.documentElement.dataset.ready='true';measure();}).catch(fail);
window.__chairDiagnostics=()=>({ready,progress,target,activeChapter:+document.body.dataset.chapter,scene:scene?.getState()});
if(import.meta.env.DEV)window.__chairPoster=()=>scene?.poster();
measure();
