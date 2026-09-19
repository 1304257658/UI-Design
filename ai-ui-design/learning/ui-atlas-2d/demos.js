import {ParticleView} from './particles.js';
import {pointerPreview,mountPointer} from './pointer-demos.js';
const lineMini='<svg viewBox="0 0 180 110" aria-hidden="true"><path d="M12 85H169M12 60H169M12 35H169" fill="none" stroke="#edf0f5"/><path d="M14 83L39 65L65 73L91 41L116 49L141 23L168 33" fill="none" stroke="#819bc0" stroke-width="2.7"/><circle cx="141" cy="23" r="4" fill="#819bc0"/></svg>';
const miniWindow=(inside)=>`<span class="mini-window"><span class="mini-chrome"><i></i><i></i><i></i></span>${inside}</span>`;
const lines='<span class="mini-lines"><i></i><i></i><i></i></span>';
export function preview(item){
  if(['eye-follow','magnetic'].includes(item.id))return pointerPreview(item);
  const content={
    glass:'<span class="glass-panel"><small>STUDIO / 01</small><b>Clarity.</b><span>透过表面，看见层次 <span>↗</span></span></span>',
    soft:'<span class="soft-object"><span>a</span></span>',clay:'<span class="clay-object">c.</span>',metal:'<span class="metal-object"><span>m.</span></span>',
    paper:'<span class="paper-object"><small>THE QUIET EDITION</small><b>A little<br>slower.</b><span>THOUGHTS ON PAPER / 01</span></span>',
    minimal:'<span class="minimal-object"><small>ESSENTIAL / 01</small><b>Less,<br>but better.</b><span>余下的，都是重要的。</span></span>',
    brutal:'<span class="brutal-object"><b>MAKE<br>IT BOLD.</b><span>NO. 07 &nbsp; ↗</span></span>',gradient:'<span class="gradient-object"></span><span class="gradient-word">Softly.</span>',
    drawer:miniWindow(lines+'<span class="mini-drawer"><i></i><i></i><i></i></span>'),modal:miniWindow(lines+'<span class="mini-modal-shade"><span class="mini-modal"><i></i><span></span></span></span>'),
    popover:miniWindow(lines+'<span class="mini-bubble">分享这个想法 ↗</span>'),tooltip:miniWindow('<span class="mini-star">☆</span><span class="mini-tooltip">留住这份灵感</span>'),tabs:miniWindow('<span class="mini-tabs"><span>概览</span><span>目录</span></span>'+lines),accordion:miniWindow('<span class="mini-accordion"><span>什么是设计语言？ −</span><i></i><span>从哪里开始？ +</span></span>'),
    spring:'<span class="motion-object"><span class="spring-track"></span><span class="spring-dot"></span></span>',press:'<span class="preview-press">Press me ↗</span>',flip:'<span class="preview-flip">A.</span>',stagger:'<span class="preview-stagger"><i></i><i></i><i></i></span>',skeleton:'<span class="preview-skeleton"><i></i><i></i><i></i></span>',toast:'<span class="preview-toast"><b>✓</b> 灵感已保存</span>',
    bar:`<span class="preview-chart">${[38,60,47,88,70].map(h=>`<i style="height:${h}%"></i>`).join('')}</span>`,line:`<span class="preview-chart preview-line">${lineMini}</span>`,donut:'<span class="preview-donut"></span>',
    scatter:`<span class="preview-scatter">${Array.from({length:17},(_,i)=>`<i style="left:${9+(i*37)%81}%;bottom:${10+(i*37)%64+Math.sin(i)*12}%"></i>`).join('')}</span>`,
    heatmap:`<span class="preview-heatmap">${Array.from({length:28},(_,i)=>`<i style="opacity:${.15+((i*7+3)%11)/13}"></i>`).join('')}</span>`,table:'<span class="preview-table"><span>渠道 <b>访问量 ↓</b></span><span>自然搜索 <b>2,480</b></span><span>社交媒体 <b>1,860</b></span><span>直接访问 <b>1,240</b></span></span>',kpi:'<span class="preview-kpi"><small>本周访问量</small><b>12,840</b><span>↗ 12.8% 较上周</span></span>',status:'<span class="preview-status"><span><b>✓</b> 已完成</span><span><b>◷</b> 进行中</span><span><b>!</b> 需要重试</span></span>',
  };
  if(item.cat==='particles')return `<canvas class="particle-canvas" aria-hidden="true"></canvas><span class="particle-caption">${item.en.toUpperCase()}</span>`;
  return content[item.id]||'';
}
export const swatchClass=item=>item.cat==='material'?`swatch-${item.id}`:item.cat==='particles'?'swatch-particles':`swatch-${item.cat}`;
const range=(id,label,min,max,value,unit='')=>`<label for="${id}">${label}<output id="${id}-value">${value}${unit}</output><input id="${id}" type="range" min="${min}" max="${max}" value="${value}" data-unit="${unit}"></label>`;
const button=(id,label)=>`<button class="secondary" id="${id}">${label}</button>`;
export function mountDemo(item,host,controls,{notify,motion}){
  let cleanups=[],timers=[],animations=[];const on=(el,event,fn)=>{el?.addEventListener(event,fn);cleanups.push(()=>el?.removeEventListener(event,fn));};
  const later=(fn,ms)=>{const id=setTimeout(fn,ms);timers.push(id);};
  const bindRange=(id,fn)=>{const input=controls.querySelector('#'+id);on(input,'input',()=>{controls.querySelector('#'+id+'-value').textContent=input.value+input.dataset.unit;fn(Number(input.value));});};
  host.className=`live-demo ${swatchClass(item)}`;host.innerHTML=preview(item);controls.innerHTML='';
  if(['eye-follow','magnetic'].includes(item.id))return mountPointer(item,host,controls,{notify,motion});
  if(item.cat==='particles'){
    host.querySelector('canvas').setAttribute('aria-label',`${item.name}示例，拖动可以改变观察角度`);host.querySelector('canvas').removeAttribute('aria-hidden');
    const view=new ParticleView(host.querySelector('canvas'),item.id,{interactive:true,motion:motion(),count:620});
    controls.innerHTML=range('density','粒子数量',100,1000,620)+range('speed','运动速度',0,100,60)+button('pause-particles',motion()?'暂停':'播放');
    bindRange('density',n=>{view.count=n;view.draw();});bindRange('speed',n=>view.speed=n/100);
    on(controls.querySelector('#pause-particles'),'click',e=>{if(view.motion){view.pause();e.currentTarget.textContent='播放';}else if(motion()){view.play();e.currentTarget.textContent='暂停';}else notify('先打开页面右上角的动效开关，即可播放。');});
    cleanups.push(()=>view.dispose());
  }else if(item.cat==='material'){
    if(item.id==='glass'){controls.innerHTML=range('blur','背景模糊',0,28,9,'px')+range('opacity','白底不透明度',10,85,25,'%');bindRange('blur',n=>host.style.setProperty('--blur',n+'px'));bindRange('opacity',n=>host.style.setProperty('--glass-opacity',n/100));}
    if(item.id==='soft'){controls.innerHTML=button('toggle-soft','切换为凹陷');on(controls.querySelector('button'),'click',e=>{const inset=host.querySelector('.soft-object').classList.toggle('inset');e.currentTarget.textContent=inset?'切换为凸起':'切换为凹陷';e.currentTarget.setAttribute('aria-pressed',String(inset));});}
    if(item.id==='clay'){controls.innerHTML=range('round','圆角大小',5,65,33,'px');bindRange('round',n=>host.style.setProperty('--round',n+'px'));}
    if(item.id==='metal'){controls.innerHTML='<span class="control-tip">在方块上移动指针或拖动，改变高光方向。</span>';on(host,'pointermove',e=>{const r=host.getBoundingClientRect();host.style.setProperty('--angle',(e.clientX-r.left)/r.width*360+'deg');});}
    if(item.id==='paper'){controls.innerHTML=range('grain','纹理强度',0,100,18,'%');bindRange('grain',n=>host.style.setProperty('--grain',n/100));}
    if(item.id==='minimal'){controls.innerHTML=range('space','内部留白',12,45,20,'px');bindRange('space',n=>host.style.setProperty('--space',n+'px'));}
    if(item.id==='brutal'){controls.innerHTML=range('shadow','阴影偏移',0,14,6,'px');bindRange('shadow',n=>host.style.setProperty('--offset',n+'px'));const original=host.querySelector('.brutal-object');const b=document.createElement('button');b.className='brutal-object';b.innerHTML=original.innerHTML;b.setAttribute('aria-label','按压新粗野风格按钮');original.replaceWith(b);on(b,'click',()=>notify('按下时，按钮向硬阴影的方向回落。'));}
    if(item.id==='gradient'){controls.innerHTML=range('hue','色相旋转',0,360,0,'°');bindRange('hue',n=>host.style.setProperty('--hue',n+'deg'));}
  }else if(item.cat==='interaction'){
    host.innerHTML='<div class="demo-app"><div class="demo-app-header"><span>小小灵感簿</span><span>LOCAL DEMO</span></div><div class="demo-app-body"><h4>今天，有什么好想法？</h4><p>给喜欢的界面留一句笔记。</p><div class="interaction-body"></div></div></div>';
    const app=host.querySelector('.demo-app'),body=host.querySelector('.demo-app-body'),target=host.querySelector('.interaction-body');
    if(item.id==='drawer'||item.id==='modal'){
      target.innerHTML=`<button class="primary" id="open-layer">${item.id==='drawer'?'编辑笔记':'打开确认弹窗'}</button>`;
      const trigger=target.querySelector('button');let cover=null;
      const close=()=>{cover?.remove();cover=null;body.inert=false;trigger.focus();};
      on(trigger,'click',()=>{
        body.inert=true;cover=document.createElement('div');cover.className='demo-cover';cover.innerHTML=`<section class="demo-layer ${item.id==='drawer'?'demo-drawer':'demo-modal'}" role="dialog" aria-label="${item.id==='drawer'?'笔记编辑抽屉':'收藏确认弹窗'}"><button class="close-button" aria-label="关闭示例弹层">×</button><h4>${item.id==='drawer'?'编辑笔记':'收藏这条灵感？'}</h4>${item.id==='drawer'?'<label>笔记标题<input value="给日常多一点灵感" aria-label="笔记标题"></label>':'<p>这是一个确认操作的演示，不会向外部提交数据。</p>'}<div class="actions"><button class="secondary" data-cancel>取消</button><button class="primary" data-confirm>${item.id==='drawer'?'保存':'确认收藏'}</button></div></section>`;app.appendChild(cover);
        const layer=cover.querySelector('.demo-layer');layer.querySelector('button').focus();
        on(cover,'click',e=>{if(e.target===cover||e.target.closest('[data-cancel],.close-button'))close();else if(e.target.closest('[data-confirm]')){const title=cover.querySelector('input')?.value;close();if(title)body.querySelector('h4').textContent=title;notify('操作完成。这是本地交互演示。');}});
        on(layer,'keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}if(e.key==='Tab'){e.stopPropagation();const nodes=[...layer.querySelectorAll('button,input')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
      });
    }
    if(item.id==='popover'){
      target.innerHTML='<div class="popover-anchor"><button class="primary" aria-expanded="false" aria-controls="share-popover">分享这个想法 ↗</button><div class="popover-content" id="share-popover" hidden><button>复制示例链接</button><button>生成分享说明</button></div></div>';
      const trigger=target.querySelector('.primary'),popup=target.querySelector('.popover-content');const close=()=>{popup.hidden=true;trigger.setAttribute('aria-expanded','false');};
      on(trigger,'click',()=>{popup.hidden=!popup.hidden;trigger.setAttribute('aria-expanded',String(!popup.hidden));if(!popup.hidden)popup.querySelector('button').focus();});
      on(popup,'click',e=>{if(e.target.tagName==='BUTTON'){notify('已演示分享操作，没有创建或发布外部链接。');close();trigger.focus();}});
      on(document,'click',e=>{if(!target.contains(e.target))close();});on(target,'keydown',e=>{if(e.key==='Escape'&&!popup.hidden){e.stopPropagation();e.preventDefault();close();trigger.focus();}});
    }
    if(item.id==='tooltip'){
      target.innerHTML='<div class="tooltip-anchor"><button class="star-button" aria-label="收藏灵感" aria-pressed="false" aria-describedby="star-tip">☆</button><span class="tooltip-content" role="tooltip" id="star-tip" hidden>把这份灵感留住</span></div>';
      const b=target.querySelector('button'),tip=target.querySelector('[role=tooltip]');on(b,'pointerenter',()=>tip.hidden=false);on(b,'pointerleave',()=>{if(document.activeElement!==b)tip.hidden=true;});on(b,'focus',()=>tip.hidden=false);on(b,'blur',()=>tip.hidden=true);on(b,'click',()=>{const v=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(v));b.textContent=v?'★':'☆';tip.textContent=v?'已收藏，再点一下取消':'把这份灵感留住';});on(b,'keydown',e=>{if(e.key==='Escape'&&!tip.hidden){e.preventDefault();e.stopPropagation();tip.hidden=true;}});
    }
    if(item.id==='tabs'){
      target.innerHTML='<div class="demo-tabs" role="tablist" aria-label="笔记内容"><button role="tab" id="note-overview" aria-controls="note-panel" aria-selected="true">概览</button><button role="tab" id="note-index" aria-controls="note-panel" aria-selected="false" tabindex="-1">目录</button></div><div class="demo-tab-content" id="note-panel" role="tabpanel" aria-labelledby="note-overview">收藏日常里的好设计，找到自己的表达方式。</div>';
      const bs=[...target.querySelectorAll('[role=tab]')],p=target.querySelector('[role=tabpanel]');const select=i=>{bs.forEach((b,j)=>{b.setAttribute('aria-selected',String(i===j));b.tabIndex=i===j?0:-1;});p.textContent=i===0?'收藏日常里的好设计，找到自己的表达方式。':'01 材质与风格 / 02 交互模式 / 03 粒子与空间';p.setAttribute('aria-labelledby',bs[i].id);};bs.forEach((b,i)=>{on(b,'click',()=>select(i));on(b,'keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();select(1-i);bs[1-i].focus();}});});
    }
    if(item.id==='accordion')target.innerHTML='<div class="demo-details"><details><summary>玻璃风格可以用在抽屉上吗？</summary><p>可以。玻璃描述外观，抽屉描述出现方式。</p></details><details><summary>怎样让 AI 更理解我？</summary><p>同时说明颜色、材质、布局与操作行为。</p></details></div>';
  }else if(item.cat==='motion'){
    if(item.id==='spring'){
      host.innerHTML='<div class="spring-stage"><div class="spring-block"></div></div>';controls.innerHTML=button('spring-go','切换位置')+range('elastic','回弹程度',0,100,35,'%');let side=false,elastic=.35;bindRange('elastic',n=>elastic=n/100);
      on(controls.querySelector('#spring-go'),'click',()=>{side=!side;const block=host.querySelector('.spring-block'),width=host.querySelector('.spring-stage').clientWidth-65,end=side?width:0,start=side?0:width;animations.forEach(a=>a.cancel());if(!motion()){block.style.transform=`translateX(${end}px)`;return;}const frames=Array.from({length:51},(_,i)=>{const t=i/50,progress=elastic===0?1-Math.pow(1-t,3):1-Math.exp(-7*t)*Math.cos((7+elastic*7)*t);return {transform:`translateX(${start+(end-start)*(i===50?1:progress)}px)`};});animations.push(block.animate(frames,{duration:750,fill:'forwards'}));});
    }
    if(item.id==='press'){host.innerHTML='<button class="press-button">按一下，感受回应 ↗</button>';on(host.querySelector('button'),'click',()=>notify('按钮已响应。也可以用 Tab 和空格操作。'));}
    if(item.id==='flip'){host.innerHTML='<button class="flip-card" aria-label="翻转卡片查看背面" aria-pressed="false"><span class="flip-inner"><span class="flip-face"><b>A.</b><small>点击，看看另一面</small></span><span class="flip-face back"><b>B.</b><small>一个想法，两种视角</small></span></span></button>';on(host.querySelector('button'),'click',e=>{const b=e.currentTarget,v=b.classList.toggle('flipped');b.setAttribute('aria-pressed',String(v));b.setAttribute('aria-label',v?'翻转卡片返回正面':'翻转卡片查看背面');});}
    if(item.id==='stagger'){
      host.innerHTML='<div class="stagger-list"><div><b>01</b> 先看见一种感觉</div><div><b>02</b> 再认识它的名字</div><div><b>03</b> 把想法说清楚</div></div>';controls.innerHTML=button('replay','重播入场')+range('interval','间隔',0,250,90,'ms');let delay=90;bindRange('interval',n=>delay=n);const replay=()=>{animations.forEach(a=>a.cancel());if(!motion())return;host.querySelectorAll('.stagger-list>div').forEach((el,i)=>animations.push(el.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:350,delay:i*delay,fill:'both',easing:'ease-out'})));};on(controls.querySelector('#replay'),'click',replay);replay();
    }
    if(item.id==='skeleton'){
      const loading=()=>'<div class="skeleton-card" aria-label="正在加载" role="status"><div class="skeleton-block image"></div><div class="skeleton-block"></div><div class="skeleton-block short"></div></div>';host.innerHTML=loading();controls.innerHTML=button('load','模拟加载内容');on(controls.querySelector('button'),'click',e=>{const b=e.currentTarget;b.disabled=true;b.textContent='加载中…';host.innerHTML=loading();later(()=>{host.innerHTML='<div class="skeleton-card" role="status"><div class="loaded-card-image">A quiet moment.</div><h4>内容已准备好</h4><p>用相似结构替换占位，减少布局跳动。</p></div>';b.disabled=false;b.textContent='重新体验加载';},1200);});
    }
    if(item.id==='toast'){host.innerHTML='<div class="demo-app"><div class="demo-app-header">灵感笔记 / SAVED MOMENTS</div><div class="demo-app-body"><h4>今天的灵感，留住了。</h4><p>保存完成时，给一条简短反馈。</p><button class="primary">模拟保存</button></div></div>';on(host.querySelector('button'),'click',()=>notify('已模拟保存成功。这就是一条轻提示。'));}
  }else if(item.cat==='data')mountData(item,host,controls,on,notify);
  return ()=>{cleanups.forEach(f=>f());timers.forEach(clearTimeout);animations.forEach(a=>a.cancel());host.removeAttribute('style');};
}

function mountData(item,host,controls,on,notify){
  host.innerHTML='<div class="chart-demo"></div>';const chart=host.firstElementChild;
  if(item.id==='bar'){
    let month=0,selected=0;const names=['搜索','社交','直接','邮件'],sets=[[248,186,124,89],[282,151,170,112]];
    controls.innerHTML=button('month','切换至 8 月');const draw=()=>{chart.innerHTML=`<div class="chart-title">${month?'8':'7'} 月 · 渠道访问量<small>单位：次 / 轴从 0 开始</small></div><div class="bar-chart">${sets[month].map((v,i)=>`<button style="height:${v/320*100}%" data-i="${i}" aria-label="${names[i]} ${v} 次" class="${i===selected?'selected':''}"><b>${v}</b><span>${names[i]}</span></button>`).join('')}</div><p class="chart-reading">${names[selected]} · ${sets[month][selected]} 次</p>`;};draw();on(chart,'click',e=>{const b=e.target.closest('[data-i]');if(b){selected=+b.dataset.i;draw();chart.querySelector(`[data-i="${selected}"]`).focus();}});on(controls.querySelector('button'),'click',e=>{month=1-month;e.currentTarget.textContent=`切换至 ${month?'7':'8'} 月`;draw();});
  }
  if(item.id==='line'){
    let series=0,selected=0;const sets=[[120,170,145,245,215,290,260],[90,125,156,130,202,236,212]],names=['访问量','阅读量'];controls.innerHTML=button('series','切换为阅读量');const draw=()=>{const data=sets[series],xs=data.map((_,i)=>28+i*44),ys=data.map(v=>165-v/320*140);chart.innerHTML=`<div class="chart-title">一周${names[series]}<small>单位：次</small></div><div class="line-chart"><svg viewBox="0 0 320 200" role="img" aria-label="一周${names[series]}趋势；下方日期按钮提供具体数值"><path d="M28 25V165H292M28 95H292M28 25H292" fill="none" stroke="#d9e2ef"/><text x="3" y="169" font-size="9" fill="#8c9cb6">0</text><text x="0" y="29" font-size="9" fill="#8c9cb6">320</text><polyline points="${xs.map((x,i)=>`${x},${ys[i]}`).join(' ')}" stroke="#7391bd" stroke-width="2.4" fill="none"/>${xs.map((x,i)=>`<circle cx="${x}" cy="${ys[i]}" r="${i===selected?5:3}" fill="${i===selected?'#3f608c':'#8ca6cb'}"/>`).join('')}</svg></div><div class="chart-points">${data.map((v,i)=>`<button data-i="${i}" aria-pressed="${i===selected}" aria-label="9 月 ${i+1} 日 ${v} 次">9/${i+1}</button>`).join('')}</div><p class="chart-reading">9 月 ${selected+1} 日 · ${data[selected]} 次</p>`;};draw();on(chart,'click',e=>{const b=e.target.closest('[data-i]');if(b){selected=+b.dataset.i;draw();chart.querySelector(`[data-i="${selected}"]`).focus();}});on(controls.querySelector('button'),'click',e=>{series=1-series;e.currentTarget.textContent=`切换为${names[1-series]}`;draw();});
  }
  if(item.id==='donut'){
    const names=['搜索','社交','直接'],values=[45,32,23],colors=['#819cc3','#b2c4dd','#d8e1ee'];let selected=-1;const draw=()=>{const c=colors.map((v,i)=>selected<0||i===selected?v:'#e3e8ef');chart.innerHTML=`<div class="chart-title">访问来源构成<small>同一整体 · 共 1,000 次</small></div><div class="donut-area"><div class="donut-chart" style="background:conic-gradient(${c[0]} 0 45%,${c[1]} 45% 77%,${c[2]} 77%)"><div class="donut-hole">${selected<0?'1,000':values[selected]+'%'}<small>${selected<0?'总访问量':names[selected]}</small></div></div><div class="chart-legend">${names.map((n,i)=>`<button data-i="${i}" aria-pressed="${selected===i}"><i style="background:${colors[i]}"></i>${n} ${values[i]}%</button>`).join('')}</div></div>`;};draw();on(chart,'click',e=>{const b=e.target.closest('[data-i]');if(b){const clicked=+b.dataset.i;selected=selected===clicked?-1:clicked;draw();chart.querySelector(`[data-i="${clicked}"]`).focus();}});
  }
  if(item.id==='scatter'){
    const pts=[[400,2],[650,3.8],[900,3.1],[1200,5.3],[1500,4.5],[1900,7.4],[2300,6.3],[2600,9]];let selected=0;const draw=()=>{chart.innerHTML=`<div class="chart-title">文章长度与阅读时长<small>示例数据</small></div><div class="scatter-chart"><svg viewBox="0 0 320 210" role="img" aria-label="散点分布；下方按钮可读取各文章数值"><path d="M32 15V175H303" stroke="#bccde0" fill="none"/><text x="6" y="18" font-size="9" fill="#889cb6">分钟</text><text x="258" y="199" font-size="9" fill="#889cb6">字数 →</text><text x="15" y="178" font-size="9" fill="#889cb6">0</text>${pts.map(([x,y],i)=>`<circle cx="${32+x/3000*270}" cy="${175-y/10*155}" r="${i===selected?7:4}" fill="${i===selected?'#4f6d9b':'#a0b6d4'}"/>`).join('')}</svg></div><div class="chart-points">${pts.map((_,i)=>`<button data-i="${i}" aria-label="文章 ${i+1}" aria-pressed="${i===selected}">${i+1}</button>`).join('')}</div><p class="chart-reading">文章 ${selected+1} · ${pts[selected][0]} 字 · ${pts[selected][1]} 分钟</p>`;};draw();on(chart,'click',e=>{const b=e.target.closest('[data-i]');if(b){selected=+b.dataset.i;draw();chart.querySelector(`[data-i="${selected}"]`).focus();}});
  }
  if(item.id==='heatmap'){
    const values=Array.from({length:28},(_,i)=>(i*7+3)%11),colors=['#e0e7f1','#c6d5e7','#a4bad5','#7e9ec5','#537bad'];let selected=0;const draw=()=>{chart.innerHTML=`<div class="chart-title">9 月活动记录<small>每格一天</small></div><div class="heatmap-grid">${values.map((v,i)=>`<button data-i="${i}" style="--cell:${colors[Math.min(4,Math.floor(v/2.5))]}" class="${i===selected?'selected':''}" aria-label="9 月 ${i+1} 日，${v} 次活动"></button>`).join('')}</div><div class="heatmap-key">0 ${colors.map(c=>`<i style="--cell:${c}"></i>`).join('')} 10 次</div><p class="chart-reading">9 月 ${selected+1} 日 · ${values[selected]} 次活动</p>`;};draw();on(chart,'click',e=>{const b=e.target.closest('[data-i]');if(b){selected=+b.dataset.i;draw();chart.querySelector(`[data-i="${selected}"]`).focus();}});
  }
  if(item.id==='table'){
    const rows=[['自然搜索',2480,'3.8%'],['社交媒体',1860,'2.4%'],['直接访问',1240,'5.1%'],['邮件',890,'4.6%']];let asc=false,q='';chart.innerHTML='<div class="chart-title">渠道表现<small>本月 / 示例数据</small></div><input class="table-search" aria-label="筛选渠道" placeholder="输入渠道名称筛选…"><div class="data-table-wrap"></div><p class="chart-reading" aria-live="polite"></p>';const draw=()=>{const filtered=rows.filter(r=>r[0].includes(q)).sort((a,b)=>asc?a[1]-b[1]:b[1]-a[1]);chart.querySelector('.data-table-wrap').innerHTML=`<table class="data-table"><thead><tr><th scope="col">渠道</th><th scope="col" aria-sort="${asc?'ascending':'descending'}"><button data-sort>访问量 ${asc?'↑':'↓'}</button></th><th scope="col">转化率</th></tr></thead><tbody>${filtered.map(r=>`<tr><td>${r[0]}</td><td>${r[1].toLocaleString()}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table>`;chart.querySelector('.chart-reading').textContent=filtered.length?`${filtered.length} 条记录 · 访问量${asc?'升序':'降序'}`:'没有匹配的渠道，请修改关键词。';};draw();on(chart,'click',e=>{if(e.target.closest('[data-sort]')){asc=!asc;draw();chart.querySelector('[data-sort]').focus();}});on(chart.querySelector('input'),'input',e=>{q=e.target.value;draw();});
  }
  if(item.id==='kpi'){let month=false;const draw=()=>{host.innerHTML=`<div class="kpi-card"><span>${month?'本月':'本周'}访问量</span><b>${month?'48,620':'12,840'}<small>次</small></b><p>↗ ${month?'8.4':'12.8'}% · 较${month?'上月':'上周'}</p><div>${month?'9 月 1–30 日 vs 8 月 1–31 日':'9 月 8–14 日 vs 9 月 1–7 日'} · 示例数据</div></div>`;};controls.innerHTML=button('period','切换为本月');draw();on(controls.querySelector('button'),'click',e=>{month=!month;e.currentTarget.textContent=month?'切换为本周':'切换为本月';draw();});}
  if(item.id==='status'){let state=0;const names=['进行中','已完成','失败'],glyphs=['◷','✓','!'],notes=['正在整理数据，请稍候。','数据整理完成，可以继续查看。','数据未能加载，请重试。'];const draw=()=>{host.innerHTML=`<div class="status-card" role="status"><div><b>${glyphs[state]}</b>${names[state]}</div><p>${notes[state]}</p>${state===2?'<button class="secondary" data-retry>重试</button>':''}</div>`;};controls.innerHTML=names.map((n,i)=>`<button class="secondary" data-state="${i}" aria-pressed="${i===0}">${n}</button>`).join('');draw();on(controls,'click',e=>{const b=e.target.closest('[data-state]');if(b){state=+b.dataset.state;controls.querySelectorAll('button').forEach((el,i)=>el.setAttribute('aria-pressed',String(i===state)));draw();}});on(host,'click',e=>{if(e.target.closest('[data-retry]')){state=1;controls.querySelectorAll('button').forEach((el,i)=>el.setAttribute('aria-pressed',String(i===state)));draw();notify('已模拟重试成功。');}});}
}

