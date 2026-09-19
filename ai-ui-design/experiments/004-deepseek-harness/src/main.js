import './style.css';
import './flow.css';
import './environment.css';
import { chapters, modules, COMMIT, source, question, answer, sample, clamp } from './story.js';
import { createScene } from './scene.js';

const root=document.querySelector('#root');
root.innerHTML=`
<header class="site-header"><a class="identity" href="#"><span class="identity-mark">ds<span>h</span></span><span>HARNESS<br><small>ANATOMY SERIES / 001</small></span></a><nav><a href="#architecture">架构索引</a><a href="${source('docs/architecture.md')}" target="_blank" rel="noreferrer">官方源码 <span aria-hidden="true">↗</span></a></nav></header>
<main>
 <section class="intro"><div><div class="eyebrow"><span class="status-dot"></span> INSIDE DEEPSEEK HARNESS</div><h1>一个问题，<span>如何成为答案。</span></h1></div><p class="intro-copy">沿一次请求，读懂 Agent 的工作方式。<br>看清职责、消息，以及工具调用的循环。</p></section>
 <section class="viewer" id="experience" aria-label="DeepSeek Harness 交互架构展示">
  <div class="viewer-top"><div><span class="status-dot"></span><strong>DEEPSEEK HARNESS</strong><span class="muted version">master / ddefc45</span></div><div class="view-actions"><button id="notes" aria-expanded="false" aria-controls="module-notes">模块说明</button><button id="mode" aria-pressed="false">静态阅读</button><button id="fullscreen">全屏</button></div></div>
  <div class="viewer-body">
   <div class="scene-wrap"><div class="scene-heading"><span id="chapter-kicker">01 / THE INTERFACE</span><span class="scroll-hint">在画面内滚动探索 ↓</span></div>
    <div class="scrollport" tabindex="0" aria-label="滚动探索架构；可使用方向键或下方进度滑块"><div class="scroll-track"><div class="scene-sticky"><div id="render-surface"></div><div id="label-layer"></div><div id="scene-fallback" hidden>流程图显示暂不可用。你仍可以使用章节与下方架构索引阅读全部内容。</div></div></div></div>
    <div class="scene-caption"><span id="scene-context">WORKSPACE / READY</span><span>源码驱动的流程演示</span></div>
   </div>
   <aside class="inspector"><div class="story-copy"><span class="section-label">THE JOURNEY <span id="chapter-number">01 / 06</span></span><h2 id="chapter-title"></h2><p id="chapter-description"></p></div>
    <div class="module-detail" id="module-notes" hidden><div class="detail-heading"><span class="section-label">MODULE NOTES</span><span id="module-number">01</span><button id="close-notes" aria-label="关闭模块说明">×</button></div><h3 id="module-title"></h3><div id="module-en"></div><p id="module-description"></p><code id="module-event"></code><a id="module-source" target="_blank" rel="noreferrer">查看对应源码 ↗</a><p class="module-disclaimer" id="module-disclaimer"></p></div>
    <div id="readable-answer" hidden><span class="section-label">RESPONSE / 回放中的回答</span><p></p></div><p class="interaction-tip">展开后，悬停或点选模块查看作用。</p>
   </aside>
  </div>
  <div class="transport"><button id="play" aria-label="自动播放完整演示">播放</button><div class="scrubber"><label class="sr-only" for="progress">动画进度</label><input id="progress" type="range" min="0" max="1000" value="0" step="1" aria-valuetext="0% 提出问题"><div class="chapter-ticks">${chapters.map((c,i)=>`<button data-chapter="${i}" title="跳到${c.title}">${String(i+1).padStart(2,'0')}<span>${c.title}</span></button>`).join('')}</div></div><output id="percent" for="progress">000%</output><button id="reset" aria-label="从头开始">重播</button></div>
 </section>
 <div class="below-viewer"><span><span class="tiny-line"></span> 淡蓝路径表示响应返回</span><span>滚动控制时间 · 停下即可阅读 · 支持反向回放</span><span>01 — 06 / INTERACTIVE ESSAY</span></div>
 <section class="architecture" id="architecture"><div class="section-intro"><div><span class="eyebrow">THE SYSTEM, UNPACKED</span><h2>每一层，都可以追溯。</h2></div><p>这是模块的视觉分组，而非固定流水线。<br>Cordis 连接它们，AgentLoop 让它们协作。</p></div><div class="module-index">${modules.map(m=>`<button class="index-item" data-module="${m.id}"><span>${m.n}</span><div><strong>${m.en}</strong><small>${m.name}</small></div><span class="index-arrow" aria-hidden="true">↗</span></button>`).join('')}</div></section>
 <section class="reading"><div><span class="eyebrow">READ THE REAL THING</span><h2>从画面，走回代码。</h2><p>这里展示一次预设的教学流程。真实系统可能多次调用工具，回答也可以边生成边显示。工作台为教学重绘；流程图表达模块职责和调用关系，动态连线表达消息流。</p></div><div class="source-card"><span class="section-label">VERIFIED SOURCE SNAPSHOT</span><a href="https://github.com/deepseek-ai/deepseek-harness/commit/${COMMIT}" target="_blank" rel="noreferrer">deepseek-ai / deepseek-harness ↗</a><code>master · ddefc45 · 0.1.6-alpha.2</code><p>核实日期 2026.09.18 · 静态源码核对<br>演示不连接模型，不发送你的数据。</p></div></section>
</main><footer><span>INSIDE THE HARNESS</span><span>一个关于 AI 界面的设计研究。</span><a href="#">回到顶部 ↑</a></footer>`;

const $=s=>document.querySelector(s);
$('.viewer').append($('#module-notes'),$('#readable-answer'));
const port=$('.scrollport'), slider=$('#progress');
let progress=0, selected='ui', chapter=-1, playing=false, autoFrame=0, lastTime=0, staticMode=true;
let scene;
function notes(on){$('#module-notes').hidden=!on;$('#notes').setAttribute('aria-expanded',String(on));}
$('#notes').addEventListener('click',()=>{notes($('#module-notes').hidden);if(!$('#module-notes').hidden)$('#module-notes').scrollIntoView({behavior:'instant',block:'nearest'});});
$('#close-notes').addEventListener('click',()=>notes(false));
function showModule(id) {
 const m=modules.find(m=>m.id===id); if(!m)return;
 selected=id;
 $('#module-number').textContent=m.n; $('#module-title').textContent=m.name; $('#module-en').textContent=m.en;
 $('#module-description').textContent=m.description; $('#module-event').textContent=m.event; $('#module-source').href=source(m.path); $('#module-disclaimer').textContent=m.detail;
 document.querySelectorAll('[data-select]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.select===id)));
 scene?.highlight(id);
}
function render(p) {
 progress=clamp(p); const s=sample(progress);
 if(s.chapter!==chapter){chapter=s.chapter;const c=chapters[chapter];$('#chapter-title').textContent=c.headline;$('#chapter-description').textContent=c.description;$('#chapter-number').textContent=`${String(chapter+1).padStart(2,'0')} / 06`;$('#chapter-kicker').textContent=`${String(chapter+1).padStart(2,'0')} / ${c.en}`;showModule(c.selected);}
 document.querySelectorAll('[data-chapter]').forEach((el,i)=>{el.classList.toggle('active',i===chapter);el.setAttribute('aria-current',i===chapter?'step':'false');});
 slider.value=String(Math.round(progress*1000));slider.style.setProperty('--progress',`${progress*100}%`);slider.setAttribute('aria-valuetext',`${Math.round(progress*100)}% ${chapters[chapter].title}`);
 $('#percent').textContent=`${String(Math.round(progress*100)).padStart(3,'0')}%`;
 $('#scene-context').textContent=['WORKSPACE / READY','CONNECTING TO HOST','PLUGIN COMPOSITION','MODEL → TOOL → MODEL','STREAMING RESPONSE','WORKSPACE / RESPONSE'][chapter];
 $('#readable-answer').hidden=s.response===0;$('#readable-answer p').textContent=answer.slice(0,Math.round(answer.length*s.response));
 scene?.update(progress);root.dataset.progress=progress.toFixed(5);root.dataset.sceneChapter=String(chapter);
}
function seek(p){progress=clamp(p);port.scrollTop=progress*(port.scrollHeight-port.clientHeight);render(progress);}
function pause(){playing=false;cancelAnimationFrame(autoFrame);$('#play').textContent='播放';$('#play').setAttribute('aria-label','自动播放完整演示');lastTime=0;}
function tick(t){if(!playing)return;const delta=lastTime?Math.min(t-lastTime,80):0;lastTime=t;seek(progress+delta/58000);if(progress>=1){pause();return;}autoFrame=requestAnimationFrame(tick);}
port.addEventListener('scroll',()=>{if(!staticMode)render(port.scrollTop/Math.max(1,port.scrollHeight-port.clientHeight));},{passive:true});
port.addEventListener('wheel',pause,{passive:true});port.addEventListener('touchstart',pause,{passive:true});
port.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(e.key)){pause();if(staticMode)return;e.preventDefault();seek(e.key==='Home'?0:e.key==='End'?1:progress+({'ArrowDown':.015,'ArrowUp':-.015,'PageDown':.1,'PageUp':-.1}[e.key]));}});
slider.addEventListener('input',()=>{const target=Number(slider.value)/1000;pause();if(staticMode)setStatic(false);seek(target);});
$('#play').addEventListener('click',()=>{if(playing){pause();return;}if(staticMode){setStatic(false);seek(0);}if(progress>=.999)seek(0);playing=true;$('#play').textContent='暂停';$('#play').setAttribute('aria-label','暂停演示');autoFrame=requestAnimationFrame(tick);});
$('#reset').addEventListener('click',()=>{pause();if(staticMode)setStatic(false);seek(0);showModule('ui');});
document.querySelectorAll('[data-chapter]').forEach(el=>el.addEventListener('click',()=>{pause();if(staticMode)setStatic(false);seek(chapters[Number(el.dataset.chapter)].at);}));
function setStatic(on){pause();staticMode=on;$('.viewer').classList.toggle('static-mode',on);$('#mode').setAttribute('aria-pressed',String(on));$('#mode').textContent=on?'滚动演示':'阅读全图';$('.scroll-hint').textContent=on?'职责直接阅读 · 点选查看源码':'在画面内滚动探索 ↓';if(on){seek(.48);notes(false);}else seek(progress);}
$('#mode').addEventListener('click',()=>{const wasStatic=staticMode;setStatic(!staticMode);if(wasStatic)seek(0);});
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('.viewer').requestFullscreen();}catch{$('.viewer').classList.toggle('expanded');$('#fullscreen').textContent=$('.viewer').classList.contains('expanded')?'退出全屏':'全屏';}});
document.addEventListener('fullscreenchange',()=>{$('#fullscreen').textContent=document.fullscreenElement?'退出全屏':'全屏';});
document.addEventListener('keydown',e=>{if(e.key==='Escape')notes(false);if(e.key==='Escape'&&$('.viewer').classList.contains('expanded')){$('.viewer').classList.remove('expanded');$('#fullscreen').textContent='全屏';}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
document.querySelectorAll('[data-module]').forEach(el=>el.addEventListener('click',()=>{setStatic(true);showModule(el.dataset.module);notes(true);$('.viewer').scrollIntoView({behavior:'instant',block:'start'});}));
try {scene=createScene($('#render-surface'),$('#label-layer'),{question,answer,select:id=>{pause();showModule(id);notes(true);$('#module-notes').scrollIntoView({behavior:'instant',block:'nearest'});}});} catch(e) {console.error(e);$('#scene-fallback').hidden=false;}
const resize=new ResizeObserver(()=>{const h=$('.scene-wrap').clientHeight;$('.scene-sticky').style.height=`${h}px`;scene?.resize();port.scrollTop=progress*(port.scrollHeight-port.clientHeight);scene?.update(progress);});resize.observe($('.scene-wrap'));
render(0);showModule('ui');if(staticMode)setStatic(true);
window.addEventListener('pagehide',()=>{pause();resize.disconnect();scene?.dispose();},{once:true});
