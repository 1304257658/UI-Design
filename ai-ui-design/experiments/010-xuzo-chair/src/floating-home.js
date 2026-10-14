import './floating-home.css';
import './home-contact.js';
document.documentElement.classList.add('js');
const story=document.querySelector('.story'),opening=document.querySelector('.opening'),company=document.querySelector('.company'),chair=document.querySelector('.chair-entry');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=t=>t*t*(3-2*t);
const paths={desk:[-.58,-.56,-18],cabinet:[.58,-.66,15],lamp:[-.42,-.12,-14],sofa:[-.66,.36,-12],coffee:[.2,.65,20],chair:[.55,.21,16]};
const items=[...document.querySelectorAll('[data-furniture]')];
let target=0,progress=0,raf=0,beliefIndex=-1,loaded=0,failed=[];
function paint(){
  const travel=ease(clamp((progress-.025)/.54));
  for(const el of items){const [x,y,r]=paths[el.dataset.furniture];el.style.transform=`translate3d(${x*innerWidth*travel}px,${y*innerHeight*travel}px,0) rotate(${r*travel}deg)`;el.classList.toggle('is-retired',travel===1);}
  const a=1-ease(clamp((progress-.1)/.16)),b=ease(clamp((progress-.24)/.18));
  opening.style.opacity=a;opening.style.visibility=a>0?'visible':'hidden';opening.setAttribute('aria-hidden',String(a<.5));
  company.style.opacity=b;company.style.visibility=b>0?'visible':'hidden';company.style.clipPath='none';company.style.transform=`translateY(${(1-b)*24}px)`;company.inert=b<.98;company.setAttribute('aria-hidden',String(b<.98));
  chair.inert=progress>.08;chair.setAttribute('aria-hidden',String(progress>.08));chair.style.pointerEvents=progress>.08?'none':'';
  document.body.classList.toggle('floating-paused',progress>=.62||document.hidden);
}
function tick(){raf=0;progress=reduced.matches?target:progress+(target-progress)*.17;if(Math.abs(progress-target)<.0001)progress=target;paint();if(progress!==target)raf=requestAnimationFrame(tick);}
function go(p){scrollTo({top:story.offsetTop+p*(story.offsetHeight-innerHeight),behavior:reduced.matches?'instant':'smooth'});}
const beliefStory=document.querySelector('.belief-story');
function updateBelief(){const p=clamp((scrollY-beliefStory.offsetTop)/Math.max(1,beliefStory.offsetHeight-innerHeight));const index=Math.min(2,Math.floor(p*3));if(index===beliefIndex)return;beliefIndex=index;document.querySelectorAll('[data-belief]').forEach((el,i)=>{el.classList.toggle('active',i===index);el.inert=i!==index;el.setAttribute('aria-hidden',String(i!==index));});document.querySelectorAll('[data-belief-image]').forEach((el,i)=>{el.classList.toggle('active',i===index);el.setAttribute('aria-hidden',String(i!==index));});}
function update(){target=clamp((scrollY-story.offsetTop)/Math.max(1,story.offsetHeight-innerHeight));updateBelief();if(!raf)raf=requestAnimationFrame(tick);}
addEventListener('scroll',update,{passive:true});addEventListener('resize',update);document.addEventListener('visibilitychange',paint);reduced.addEventListener('change',update);
document.querySelectorAll('[data-about]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();go(.8);}));
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');observer.unobserve(e.target);}}),{threshold:.12});document.querySelectorAll('[data-reveal]').forEach(el=>observer.observe(el));
for(const el of items){const img=el.querySelector('img');img.decode().then(()=>loaded++).catch(()=>{failed.push(el.dataset.furniture);if(el.dataset.furniture==='chair'){el.classList.add('chair-unavailable');chair.textContent='Contour 01 人体工学椅';}else el.classList.add('asset-error');document.querySelector('.fallback').hidden=false;});}
update();if(location.hash==='#about')requestAnimationFrame(()=>go(.8));
window.__floatingHome=()=>({progress,target,loaded,failed,reduced:reduced.matches,beliefIndex,hovered:chair.matches(':hover'),furniture:items.map(el=>({name:el.dataset.furniture,retired:el.classList.contains('is-retired'),transform:el.style.transform})),overflow:document.documentElement.scrollWidth>innerWidth});
