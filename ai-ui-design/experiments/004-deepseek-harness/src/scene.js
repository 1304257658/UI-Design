import { sample, smooth, modules } from './story.js';
import { createWorkbench } from './workbench.js';

const layout={gateway:[415,163],loop:[415,315],context:[35,315],session:[35,484],tools:[795,315],llm:[415,484],model:[415,641]};
const summaries={
 gateway:['接收 prompt，管理会话；通过 follow 订阅实时事件。','Web UI → 会话入口'],
 loop:['开启 turn；准备请求、调用模型、处理工具结果，按需继续下一步。','一次 turn，可有多个 step'],
 context:['组装系统提示、运行上下文，以及本轮可见的工具定义。','SystemPrompt → AgentLoop'],
 session:['追加事件日志，重建模型历史；记录用户消息、工具结果和回答。','Session ↔ AgentLoop'],
 tools:['检查策略与守卫，再执行文件、Shell 或搜索工具。','AgentLoop → ToolRuntime'],
 llm:['绑定 DeepSeek Adapter，准备模型请求并接收响应流。','AgentLoop → LlmRuntime'],
 model:['生成文本，或提出 tool_calls。模型服务位于 Harness 之外。','外部服务 · 非模型内部结构'],
};
export function createScene(host,labels,{question,answer,select}){
 host.innerHTML=`<div class="flow-scene"><div class="flow-pan"><div class="flow-board">
 <button class="workbench-seam" data-select="ui" aria-label="折叠的工作台，查看界面职责" aria-pressed="false"><span class="sr-only">折叠的工作台</span></button>
 <div class="host-boundary"><span>HARNESS HOST <b>Cordis 插件宿主</b><em>服务 · 依赖 · 事件 · 生命周期</em></span></div>
 <svg class="flow-lines" viewBox="0 0 1100 770" aria-hidden="true"><defs><marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="context-stroke" stroke-width="1.6"/></marker></defs>
 <g class="request-links"><path d="M550 73V163"/><path d="M550 269V315"/><path d="M550 441V484"/><path d="M550 590V641"/></g>
 <g class="support-links"><path d="M305 367H415"/><path d="M305 537H353V415H415"/></g>
 <g class="tool-links"><path d="M685 365H795"/><path d="M930 441V612H170V590"/></g>
 <g class="response-links"><path d="M685 697H720V537H685"/><path d="M685 515H735V408H685"/></g><path class="return-link" d="M685 697H1080V73H750"/>
 <g class="edge-text"><text x="568" y="151">prompt / 输入</text><text x="568" y="297">领取输入 · 开启 turn</text><text x="567" y="469">请求 + 历史</text><text x="568" y="625">模型 API</text><text x="316" y="354">提示 / 工具定义</text><text x="320" y="473">历史</text><text x="701" y="350">工具调用</text><text x="794" y="600">结果写入会话 → 下一步请求</text><text x="745" y="554">文本 / tool_calls</text><text x="1096" y="205" transform="rotate(90 1096 205)">响应经运行时与会话事件返回 UI</text></g>
 <circle class="flow-pulse" r="4"/><g class="return-bits">${Array.from({length:18},(_,i)=>`<text>${i%2}</text>`).join('')}</g>
 </svg>
 ${Object.entries(layout).map(([id,[x,y]])=>{const m=modules.find(m=>m.id===id);return `<button class="flow-node node-${id}" data-node="${id}" data-select="${id}" style="left:${x}px;top:${y}px" aria-label="查看${m.name}的作用" aria-pressed="false"><span class="node-heading"><small>${m.n}</small><strong>${m.name}</strong><span class="node-more" aria-hidden="true">↗</span></span><span class="node-en">${m.en}</span><p>${summaries[id][0]}</p><span class="node-relation">${summaries[id][1]}</span></button>`;}).join('')}
 <button class="cordis-note" data-select="cordis" aria-label="查看插件底座的作用" aria-pressed="false">Cordis 是组织底座，并非请求必须依次经过的一层。<span>查看源码说明 ↗</span></button>
 </div></div><div class="panel-stage"></div></div>`;
 const stage=host.querySelector('.flow-scene'),board=host.querySelector('.flow-board'),pan=host.querySelector('.flow-pan'),panelStage=host.querySelector('.panel-stage');
 const panel=createWorkbench();panelStage.append(panel);
 const nodes=[...host.querySelectorAll('[data-select]')];
 nodes.forEach(el=>el.addEventListener('click',()=>select(el.dataset.select)));
 let current=0,disposed=false,boardScale=1,panelScale=1,foldedWidth=400;
 const seam=host.querySelector('.workbench-seam'),viewer=host.closest('.viewer');
 function highlight(id){nodes.forEach(el=>{el.classList.toggle('selected',el.dataset.select===id);el.setAttribute('aria-pressed',String(el.dataset.select===id));});}
 function update(p){if(disposed)return;current=p;const s=sample(p),visible=s.open>.98;
  stage.classList.toggle('diagram-visible',visible);stage.classList.toggle('returned',p>=.81);stage.classList.toggle('tools-active',p>=.49&&p<.68);stage.classList.toggle('return-active',s.returnFlow>.05);
  const flowOpacity=smooth(p,.30,.36)*(1-smooth(p,.83,.89));
  board.style.setProperty('--flow-opacity',String(flowOpacity));
  const environment=smooth(p,.285,.36)*(1-smooth(p,.84,.91));
  viewer.style.setProperty('--environment',`${environment*100}%`);viewer.dataset.environment=environment>.99?'architecture':environment<.01?'workspace':'transition';
  nodes.filter(el=>el!==seam).forEach((el,i)=>{const shown=smooth(p,.30+i*.015,.36+i*.015)*flowOpacity;el.style.opacity=String(shown);el.inert=shown<.9;});
  seam.style.opacity=String(smooth(s.open,.99,1));seam.inert=s.open<.99;
  pan.inert=!visible;panelStage.style.opacity=String(1-smooth(s.open,.97,1));panelStage.style.visibility=s.open>=1?'hidden':'visible';
  const mobile=host.clientWidth<700;
  const lineX=mobile?550-pan.scrollLeft:host.clientWidth/2,lineY=38+73*boardScale;
  panelStage.style.transform=`translate(${(lineX-host.clientWidth/2)*s.open}px,${(lineY-host.clientHeight/2)*s.open}px)`;
  const foldedScale=foldedWidth*boardScale/(780*panelScale);
  panel.style.transform=`rotateX(${-90*s.open}deg) scale(${1+(foldedScale-1)*s.open})`;
  panel.querySelector('.workbench-welcome').hidden=p>=.108;panel.querySelector('.query-compose').hidden=p>=.108;
  panel.querySelector('.question-draft').textContent=question.slice(0,Math.round(question.length*s.sent));
  panel.querySelector('.message-query').hidden=p<.108;panel.querySelector('.message-query').textContent=question;
  panel.querySelector('.message-answer').hidden=s.response===0;panel.querySelector('.answer-text').textContent=answer.slice(0,Math.round(answer.length*s.response));
  panel.querySelector('.answer-caret').hidden=s.response>=1;panel.querySelector('.panel-status').textContent=p>=1?'已完成':p>.108?'正在理解项目…':'等待提问';
  const pulse=host.querySelector('.flow-pulse');pulse.setAttribute('cx','550');pulse.setAttribute('cy',String(73+Math.max(0,Math.min(1,(p-.29)/.20))*613));pulse.style.opacity=p>.29&&p<.49?'1':'0';
  const path=host.querySelector('.return-link'),length=path.getTotalLength();path.style.strokeDasharray=String(length);path.style.strokeDashoffset=String(length*(1-smooth(p,.68,.81)));
  host.querySelectorAll('.return-bits text').forEach((el,i)=>{const t=((p-.68)/.16)*1.3-i/36;el.style.opacity=t>0&&t<1?String(s.returnFlow):'0';const pt=path.getPointAtLength(Math.max(0,Math.min(1,t))*length);el.setAttribute('x',String(pt.x+(i%3-1)*7));el.setAttribute('y',String(pt.y));});
 }
 function resize(){const mobile=host.clientWidth<700;boardScale=mobile?1:Math.min(1,(host.clientWidth-32)/1100);panelScale=Math.min(1,(host.clientWidth-48)/780);foldedWidth=mobile?Math.min(400,host.clientWidth-48):400;board.style.setProperty('--seam-width',`${foldedWidth}px`);host.querySelector('.return-link').setAttribute('d',`M685 697H1080V73H${550+foldedWidth/2}`);stage.style.setProperty('--board-scale',String(boardScale));stage.style.setProperty('--panel-scale',String(panelScale));if(mobile&&!viewer.classList.contains('static-mode'))pan.scrollLeft=550-host.clientWidth/2;update(current);}
 pan.addEventListener('scroll',()=>update(current),{passive:true});
 function dispose(){disposed=true;host.replaceChildren();labels.replaceChildren();}
 resize();return{update,resize,highlight,dispose};
}
