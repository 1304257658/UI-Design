"use strict";
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const styles = [
  {id:"glass",name:"玻璃风格",en:"Glassmorphism",def:"像隔着一片磨砂玻璃看背景：半透明的面板，让背后的颜色透出来，同时变得模糊。",tags:["半透明","背景模糊","细亮边框"],use:"适合有层次、有背景图或色块的卡片与浮层。",say:"卡片采用玻璃风格：半透明白底、背景模糊、细亮边框；背景放彩色色块，正文保持清晰可读。",warn:"只有透明不等于磨砂玻璃。背景模糊也不是把卡片里的文字一起模糊。"},
  {id:"minimal",name:"极简风格",en:"Minimalism",def:"用少量颜色和装饰，把注意力交给内容。重点看留白、对齐和文字大小的关系。",tags:["克制配色","充足留白","清晰层级"],use:"适合阅读、工具、产品介绍等希望内容成为主角的界面。",say:"采用极简风格：暖白底、深色文字、充足留白；用字号和间距区分主次，装饰保持克制。",warn:"极简不等于删除必要信息；看不懂的图标和过浅的文字都不是极简的目标。"},
  {id:"brutal",name:"新粗野风格",en:"Neubrutalism",def:"粗黑边框、硬朗的偏移阴影、直接的鲜亮色块，看起来像一张大胆的平面海报。",tags:["粗描边","硬阴影","大胆色块"],use:"适合创意工具、活动页或有鲜明个性的品牌。",say:"采用新粗野风格：粗黑描边、无模糊的偏移阴影、黄绿色与淡紫色块，按钮要有明确的按压反馈。",warn:"Brutalism 与 Neubrutalism 有关联，但不是完全相同的标签；最好把描边、阴影和配色也说出来。"},
  {id:"soft",name:"新拟物风格",en:"Neumorphism / Soft UI",def:"卡片与背景接近同色，借一明一暗两道柔和阴影，制造从表面凸起或凹下去的感觉。",tags:["同色表面","双向柔影","浮雕质感"],use:"适合少量控制面板、开关或装饰性卡片。",say:"采用新拟物风格：浅灰同色背景和卡片，左上亮、右下暗的柔和阴影，像从表面轻轻凸起。",warn:"容易把按钮边界做得太弱。新拟物也不同于模仿皮革、木纹等真实材料的传统拟物。"},
  {id:"editorial",name:"杂志编辑风",en:"Editorial Design",def:"像杂志内页一样，通过有性格的大标题、分隔线和精心安排的留白建立阅读节奏。",tags:["大标题","编辑式排版","阅读节奏"],use:"适合品牌故事、内容网站、作品集。",say:"采用杂志编辑风：米白底、衬线标题、深红点缀、细分隔线；标题醒目，正文保持舒适行距。",warn:"衬线字体只是常见选择之一，单独换字体并不会自动形成杂志风。"},
  {id:"cyber",name:"赛博科技风",en:"Cyberpunk / Futuristic UI",def:"用深色基底、荧光点缀、网格与细线构成带有数字空间感的界面。这里展示的是一种常见科技感变体。",tags:["深色基底","荧光点缀","网格细线"],use:"适合游戏、科技主题展示与概念页面。",say:"采用克制的赛博科技风：深蓝黑背景、青绿色荧光边框、轻微发光和网格纹理，正文不发光。",warn:"深色模式不等于赛博风。整页发光、闪烁会影响阅读；不必为了科技感添加无用数字。"}
];
const layouts = [
  {id:"bento",name:"便当盒布局",en:"Bento Grid",def:"把内容装进大小不一、彼此对齐的格子里。主内容占大块，次要内容占小块。",tags:["大小错落","模块分区","边缘对齐"],use:"适合产品能力介绍、个人主页、摘要信息。",say:"采用便当盒布局：主模块占较大面积，辅助模块用小卡片，保持统一间距；手机端改为单列。",warn:"Bento 说的是布局。它可以搭配玻璃、极简等不同视觉风格。"},
  {id:"grid",name:"等分卡片网格",en:"Card Grid",def:"内容排进等宽的列中，每张卡片的地位比较接近，适合逐项比较和浏览。",tags:["等宽分列","重复结构","便于比较"],use:"适合课程目录、商品列表、模板选择。",say:"课程列表采用等分卡片网格：桌面两列、手机一列，卡片间距一致，标题和按钮对齐。",warn:"网格不等于瀑布流。瀑布流通常允许不同高度的卡片错落堆叠。"},
  {id:"sidebar",name:"侧栏布局",en:"Sidebar Layout",def:"把导航放在一侧，主要内容放在另一侧。侧栏是页面结构的一部分，不是点击后才滑出的抽屉。",tags:["侧边导航","主内容区","稳定入口"],use:"适合后台、工作台和多模块工具。",say:"采用左侧导航加右侧内容的侧栏布局，当前栏目高亮；手机端将导航收起到抽屉。",warn:"侧栏可以常驻，抽屉是按需打开的面板；两者可以在响应式设计中互相转换。"},
  {id:"split",name:"分屏布局",en:"Split-screen Layout",def:"把首屏分成两个主要区域，例如左边介绍文字，右边展示产品。重点是两侧内容的配合。",tags:["左右分区","图文并置","首屏聚焦"],use:"适合产品首页、登录页、作品介绍。",say:"首屏采用左右分屏：左侧标题与行动按钮，右侧产品视觉；手机端改为上下排列。",warn:"首屏 Hero 是页面的开场区域，不是一种固定布局；Hero 也可以居中排版。"}
];
const components = [
  {id:"drawer",name:"抽屉",en:"Drawer",def:"一个从页面边缘滑入的面板，常用来查看详情或编辑内容，关闭后仍留在原页面。",tags:["边缘滑入","保留页面上下文","详情 / 编辑"],use:"试试右侧出现的面板。这里演示的是带遮罩的模态抽屉。",say:"点击编辑后，从右侧打开抽屉，宽约 400px，背景加遮罩；支持关闭按钮和 Esc，关闭后回到原页面。",warn:"Drawer 不一定从右边来，也不一定阻止背景操作；方向与模态性要单独说明。"},
  {id:"modal",name:"模态弹窗",en:"Modal Dialog",def:"浮在页面上的对话框；打开时，需要先处理或关闭它，才能继续操作背景页面。",tags:["集中注意","阻止背景操作","确认 / 短任务"],use:"试着打开后按 Tab：焦点留在弹窗里。按 Esc 关闭。",say:"点击后打开居中的模态弹窗，背景加遮罩并禁止操作，提供明确的确认与关闭入口，支持 Esc。",warn:"“模态”描述是否阻止背景交互，并不规定居中。右侧抽屉也可以是模态的。"},
  {id:"sheet",name:"底部面板",en:"Bottom Sheet",def:"从底部出现的一块面板，在手机界面里经常用于操作选择、分享或补充信息。",tags:["底部出现","顶部圆角","适合触屏"],use:"点击打开底部面板，看看它与右侧抽屉的空间感。",say:"手机端使用底部面板，圆角位于顶部，从下向上进入，背景有遮罩，并提供关闭按钮。",warn:"本例只演示点击开关，不支持手势拖拽；底部面板并不天然具备拖动能力。"},
  {id:"popover",name:"气泡卡片",en:"Popover",def:"贴着触发按钮出现的小浮层，可以放解释，也可以包含按钮等操作。",tags:["靠近触发点","局部补充","可含操作"],use:"点一下“查看说明”，然后试试气泡里的按钮。",say:"点击信息按钮后，在它下方打开 Popover，放一段说明和一个操作按钮；点击外部或按 Esc 关闭。",warn:"Popover 通常不需要锁住整个页面。它与只能放简短说明的 Tooltip 不同。"},
  {id:"tooltip",name:"文字提示",en:"Tooltip",def:"鼠标悬停或键盘聚焦时出现的简短说明，通常用来补充一个控件的含义。",tags:["简短说明","悬停 / 聚焦","不放操作按钮"],use:"把鼠标移到问号按钮上，或用 Tab 聚焦它。触屏也可点击体验。",say:"给图标加 Tooltip：悬停或键盘聚焦时出现一行解释，不在提示里面放按钮，支持 Esc 隐藏。",warn:"重要信息不能只藏在悬停提示里；触屏用户没有鼠标悬停。"},
  {id:"toast",name:"轻提示",en:"Toast / Message",def:"操作之后短暂出现的反馈，例如“已保存”。通常自动消失，不要求你先关闭才能继续操作。",tags:["操作反馈","短暂出现","不打断流程"],use:"点击模拟保存，留意页面底部的提示。此处没有真正保存数据。",say:"保存后在底部显示成功 Toast，约 3 秒后自动消失，不遮挡主要操作。",warn:"Toast、Message、Snackbar 在不同系统中的叫法和细节不完全一致。必须处理的错误应持续显示。"},
  {id:"accordion",name:"折叠面板",en:"Accordion / Disclosure",def:"点击标题后，在原位置展开或收起内容。页面中的其他内容会随之上下移动。",tags:["原位展开","渐进展示","可重复收起"],use:"展开下面两个问题。这个示例允许同时展开多项。",say:"常见问题使用折叠面板，点击标题原位展开答案，允许多项同时展开，再点一次收起。",warn:"它不覆盖页面，通常会改变页面高度。本例用原生 details 展示，展开没有动画。"},
  {id:"tabs",name:"标签页",en:"Tabs",def:"在同一块区域切换不同内容面板，一次显示一个，常用于几个并列主题。",tags:["同区域切换","一次一页","并列内容"],use:"点击“概览 / 目录”；键盘左右箭头也可以切换。",say:"在卡片内加入概览和目录两个 Tabs，高亮当前项，切换内容时保留页面位置。",warn:"Tabs 是内容面板切换；如果是在一组商品里选筛选条件，应明确说“筛选”。"}
];
const states = [
  {id:"loading",name:"骨架屏",en:"Skeleton / Loading",def:"内容还没到时，先用灰色占位块提示将来的结构。这里用轻微明暗变化表示等待。",tags:["加载中","内容占位","结构预告"],use:"点击“模拟加载完成”，占位块会变成内容。",say:"加载课程时先显示骨架屏，保留标题和摘要的位置；加载完成后替换为真实内容。",warn:"骨架屏不代表已经加载成功，也不能无限等待而不给错误反馈。"},
  {id:"empty",name:"空状态",en:"Empty State",def:"界面运行正常，但暂时没有内容。需要告诉用户这里为什么为空，以及接下来能做什么。",tags:["无数据","原因说明","下一步入口"],use:"点击“添加示例”，观察空状态如何变为有内容。",say:"收藏为空时展示空状态，说明“还没有收藏”，并提供添加入口。",warn:"“没有内容”和“加载失败”不是同一件事，不要共用一句“暂无数据”掩盖错误。"},
  {id:"error",name:"错误状态",en:"Error State",def:"任务未完成，需要明确告诉用户失败了，并提供可行的恢复操作。",tags:["失败说明","可恢复","持续可见"],use:"点击“重新尝试”会模拟恢复成功，不会真的访问网络。",say:"加载失败时持续展示错误说明和重试按钮，保留页面结构，不只弹一条马上消失的提示。",warn:"颜色之外还应有文字或图标；不能只靠“变红了”传达错误。"},
  {id:"hover",name:"悬停与按压反馈",en:"Hover / Active / Focus",def:"鼠标移入、按下、键盘聚焦是不同状态。通过小幅位移、颜色或轮廓，让用户感觉到控件会回应。",tags:["悬停 Hover","按压 Active","聚焦 Focus"],use:"鼠标移到按钮上，再按住；用 Tab 则能看到焦点轮廓。",say:"按钮悬停时轻微上浮，按下时回落；键盘聚焦有清晰轮廓，过渡约 200ms，尊重减少动态效果设置。",warn:"动效不等于越多越好；触屏没有稳定的 Hover，操作入口不能只在悬停时出现。"}
];
const chapters = {styles:["01 / APPEARANCE","风格，是界面的视觉性格。","同一份内容，换六套外观。点选标签，观察配色、边框和阴影。"],layouts:["02 / STRUCTURE","布局，决定内容怎么摆。","观察同一组内容如何分区。布局词可以与风格词组合使用。"],components:["03 / INTERACTION","组件，是可以操作的界面零件。","不要只看名字，亲手打开它。先试抽屉，再试模态弹窗。"],states:["04 / FEEDBACK","状态，让界面给你回应。","等待、没内容、失败、按下按钮，应该各有各的样子。"],compose:["05 / YOUR DESIGN BRIEF","现在，把你的意思说清楚。","选择你想要的效果，生成一段描述。具体特征比一个“高级感”更容易对齐。"]};
let chapter = "styles", selected = {styles:"glass",layouts:"bento",components:"drawer",states:"loading"}, toastTimer;
function notify(text){const el=$("#toast");clearTimeout(toastTimer);el.textContent=text;el.classList.add("visible");toastTimer=setTimeout(()=>el.classList.remove("visible"),3200);}
function notes(item){return `<aside class="lesson-notes"><span class="en">${item.en}</span><h3>${item.name}</h3><p class="definition">${item.def}</p><div class="tags">${item.tags.map(t=>`<span>${t}</span>`).join("")}</div><span class="note-label">什么时候用 / 怎么体验</span><p class="usage">${item.use}</p><span class="note-label">你可以这样对 AI 说</span><div class="say-box">“${item.say}”</div><p class="caution">留意：${item.warn}</p></aside>`;}
function render(){
  $$("[data-chapter]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.chapter===chapter));
  const head=chapters[chapter];$("#chapter-kicker").textContent=head[0];$("#chapter-title").textContent=head[1];$("#chapter-description").textContent=head[2];
  if(chapter==="compose"){renderCompose();return;}
  const list={styles,layouts,components,states}[chapter],item=list.find(x=>x.id===selected[chapter]);
  $("#lesson").innerHTML=`<div class="picker" aria-label="${head[1]}">${list.map(x=>`<button data-item="${x.id}" aria-pressed="${x.id===item.id}">${x.name}</button>`).join("")}</div><div class="lab-grid"><div class="preview-wrap" id="preview"></div>${notes(item)}</div>`;
  $$("[data-item]").forEach(b=>b.addEventListener("click",()=>{selected[chapter]=b.dataset.item;render();$(`[data-item="${b.dataset.item}"]`).focus({preventScroll:true});}));
  ({styles:renderStyle,layouts:renderLayout,components:renderComponent,states:renderState}[chapter])(item);
}
function renderStyle(item){
  $("#preview").innerHTML=`<div class="stage style-${item.id}"><span class="stage-label">STYLE STUDY / ${item.en.split(" /")[0]}</span><span class="orb"></span><span class="orb second"></span><article class="specimen"><div class="mini-label"><span>STUDIO NOTES / 01</span><span class="small-icon" aria-hidden="true">✳</span></div><h3>让灵感，有处安放。</h3><p>收集喜欢的界面，记录一个好想法。<br>从今天开始，建立你的设计笔记。</p><button id="sample-action">收藏这个灵感 <span aria-hidden="true">↗</span></button></article><span class="stage-footer">同一张卡片 · 只改变视觉表达</span></div>${item.id==="glass"?`<div class="controls"><label>背景模糊<input id="blur" type="range" min="0" max="30" value="16"><output id="blur-value">16px</output></label><label>白底不透明度<input id="opacity" type="range" min="10" max="95" value="40"><output id="opacity-value">40%</output></label></div>`:""}`;
  $("#sample-action").onclick=()=>notify("已体验按钮反馈 · 本演示不会保存收藏");
  if(item.id==="glass"){$("#blur").oninput=e=>{$(".specimen").style.setProperty("--blur",e.target.value+"px");$("#blur-value").textContent=e.target.value+"px";};$("#opacity").oninput=e=>{$(".specimen").style.setProperty("--opacity",e.target.value/100);$("#opacity-value").textContent=e.target.value+"%";};}
}
function renderLayout(item){
  const blocks=item.id==="sidebar"?["导航栏","内容概览","最近笔记","灵感收藏"]:["主打内容","设计笔记","灵感收藏","本周推荐"];
  $("#preview").innerHTML=`<div class="stage layout-stage"><span class="stage-label">LAYOUT STUDY / ${item.en}</span><div class="mini-page"><div class="mini-nav"><b>灵感空间</b><span>首页 · 关于</span></div><div class="layout-demo layout-${item.id}">${blocks.map((x,i)=>`<div class="layout-item"><b>${x}</b>${i===0?'<span class="layout-art" aria-hidden="true">✳</span>':''}<small>${i===0?'优先被看到':'补充信息'}</small></div>`).join("")}</div></div><span class="stage-footer">结构示意 · 色块用于区分内容区域</span></div>`;
}
const dialog=$("#demo-dialog");
function openDialog(kind){
  const data={drawer:["DRAWER / 抽屉","编辑设计笔记","从右侧滑入，原来的页面仍在后面。这适合处理与当前页面相关的小任务。"],modal:["MODAL DIALOG / 模态弹窗","收藏这条灵感？","这里是居中的模态弹窗。背景页面暂时不能操作，注意力集中到当前任务。"],sheet:["BOTTOM SHEET / 底部面板","选择下一步","从底部出现，适合在手机上提供操作或补充内容。"]}[kind];
  dialog.className=kind==="modal"?"":kind;$("#dialog-kind").textContent=data[0];$("#dialog-title").textContent=data[1];
  $("#dialog-body").innerHTML=`<p>${data[2]}</p>${kind==="drawer"?'<label class="dialog-input">笔记标题<input value="我的第一份 UI 灵感" aria-label="笔记标题"></label>':''}<div class="dialog-info">观察三个细节：出现的位置、背景遮罩、关闭后回到哪里。<br>这个演示不会提交或保存内容。</div>`;
  document.body.style.overflow="hidden";dialog.showModal();
}
$("#close-dialog").onclick=()=>dialog.close();$("#dialog-done").onclick=()=>dialog.close();dialog.addEventListener("close",()=>document.body.style.overflow="");
dialog.addEventListener("keydown",e=>{if(e.key!=="Tab")return;const focusable=$$('button:not([disabled]), input:not([disabled]), [tabindex="0"]',dialog),first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
dialog.addEventListener("click",e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
function renderComponent(item){
  const buttons={drawer:"打开右侧抽屉",modal:"打开模态弹窗",sheet:"打开底部面板",popover:"查看说明",tooltip:"这个问号是什么意思？",toast:"模拟保存"};
  let content=`<h3>我的设计笔记</h3><p>试一试这个控件，留意内容在哪里出现、是否遮挡背景。</p>`;
  if(["drawer","modal","sheet","toast"].includes(item.id))content+=`<button class="primary" id="demo-action">${buttons[item.id]}</button>`;
  if(item.id==="popover")content+='<div class="action-row"><button class="primary" id="popover-trigger" aria-expanded="false" aria-controls="popover-panel">查看说明</button><div id="popover-panel" class="popover-box" hidden><b>Popover 可以包含操作</b><p>我贴着按钮出现，页面其他地方仍然能操作。</p><button id="popover-done">明白了，收起气泡</button></div></div>';
  if(item.id==="tooltip")content+='<span class="tooltip-wrap"><button id="tooltip-trigger" aria-label="查看文字提示" aria-describedby="tooltip-text">? 这个图标是什么意思</button><span class="tooltip-bubble" role="tooltip" id="tooltip-text" hidden>收藏后，可在灵感列表中找到。</span></span>';
  if(item.id==="accordion")content+='<details class="demo-accordion"><summary>玻璃风格可以用在抽屉上吗？</summary><p>可以。玻璃描述外观，抽屉描述出现方式；它们是两个维度。</p></details><details class="demo-accordion"><summary>为什么不能只说“高级一点”？</summary><p>可以先说感觉，再补充留白、配色、边框与参考图，让意思更具体。</p></details>';
  if(item.id==="tabs")content+='<div class="tab-strip" role="tablist" aria-label="设计笔记内容"><button role="tab" id="tab-overview" aria-selected="true" aria-controls="tab-panel" data-demo-tab="overview">概览</button><button role="tab" id="tab-outline" aria-selected="false" aria-controls="tab-panel" tabindex="-1" data-demo-tab="outline">目录</button></div><div id="tab-panel" role="tabpanel" tabindex="0" aria-labelledby="tab-overview">这份笔记收集了常用 UI 风格和交互形式。</div>';
  $("#preview").innerHTML=`<div class="stage component-stage"><span class="stage-label">TRY IT / ${item.en.split(" /")[0]}</span><div class="demo-card">${content}</div><span class="stage-footer">真实可操作 · 仅演示界面行为</span></div>`;
  if(["drawer","modal","sheet"].includes(item.id))$("#demo-action").onclick=()=>openDialog(item.id);
  if(item.id==="toast")$("#demo-action").onclick=()=>notify("✓ 已模拟保存成功 · 这就是 Toast 轻提示");
  if(item.id==="popover"){$("#popover-trigger").onclick=()=>togglePopover($("#popover-panel").hidden);$("#popover-done").onclick=()=>{togglePopover(false);$("#popover-trigger").focus();};}
  if(item.id==="tooltip"){const t=$("#tooltip-trigger"),tip=$("#tooltip-text");t.onmouseenter=t.onfocus=()=>tip.hidden=false;t.onmouseleave=t.onblur=()=>tip.hidden=true;t.onclick=()=>tip.hidden=false;}
  if(item.id==="tabs"){$$("[data-demo-tab]").forEach((b,i,all)=>{b.onclick=()=>activateTab(b);b.onkeydown=e=>{let n;if(e.key==="ArrowRight")n=(i+1)%2;if(e.key==="ArrowLeft")n=(i+1)%2;if(e.key==="Home")n=0;if(e.key==="End")n=1;if(n!==undefined){e.preventDefault();activateTab(all[n]);all[n].focus();}};});}
}
function togglePopover(open){const panel=$("#popover-panel");if(!panel)return;panel.hidden=!open;$("#popover-trigger").setAttribute("aria-expanded",String(open));}
function activateTab(b){$$("[data-demo-tab]").forEach(x=>{x.setAttribute("aria-selected",String(x===b));x.tabIndex=x===b?0:-1;});$("#tab-panel").setAttribute("aria-labelledby",b.id);$("#tab-panel").textContent=b.dataset.demoTab==="overview"?"这份笔记收集了常用 UI 风格和交互形式。":"第一章：视觉风格。第二章：页面布局。第三章：交互组件。";}
document.addEventListener("click",e=>{if($("#popover-panel")&&!e.target.closest(".action-row"))togglePopover(false);});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){const p=$("#popover-panel");if(p&&!p.hidden){togglePopover(false);$("#popover-trigger").focus();}const tip=$("#tooltip-text");if(tip)tip.hidden=true;}});
function renderState(item){
  const content={loading:'<div aria-label="正在加载内容" role="status"><div class="skeleton-line big"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div><p>正在加载设计笔记…</p><button class="primary" id="state-action">模拟加载完成</button>',empty:'<div class="state-symbol" aria-hidden="true">＋</div><h3>还没有收藏</h3><p>从一条喜欢的设计开始吧。</p><button class="primary" id="state-action">添加示例</button>',error:'<div class="state-symbol error-text" aria-hidden="true">!</div><h3>笔记暂时加载失败</h3><p class="error-text">这是演示错误，可以尝试重新加载。</p><button class="primary" id="state-action">重新尝试</button>',hover:'<h3>一个有回应的按钮</h3><p>悬停时上浮，按下时回落。<br>用 Tab 聚焦可以看到外轮廓。</p><button class="primary hover-button" id="state-action">移入、按下，感受一下 ↗</button>'}[item.id];
  $("#preview").innerHTML=`<div class="stage state-stage"><span class="stage-label">STATE STUDY / ${item.en}</span><div class="demo-card" id="state-card">${content}</div><span class="stage-footer">状态模拟 · 不发送网络请求</span></div>`;
  $("#state-action").onclick=()=>{if(item.id==="hover"){notify("点击已响应 · 鼠标、触屏和键盘都能触发");return;}$("#state-card").innerHTML='<div role="status"><div class="state-symbol">✓</div><h3>设计笔记已就绪</h3><p>从玻璃风格到抽屉交互，你已经有了第一份灵感。</p></div><button class="primary" id="state-reset">再体验一次</button>';$("#state-reset").onclick=()=>{renderState(item);$("#state-action").focus({preventScroll:true});};$("#state-reset").focus({preventScroll:true});};
}
function renderCompose(){
  $("#lesson").innerHTML=`<div class="compose-grid"><div class="compose-controls"><label>做什么页面<input id="brief-page" value="个人灵感收藏页" maxlength="80"></label><label>① 外观风格<select id="brief-style">${styles.map(s=>`<option value="${s.id}">${s.name} · ${s.en}</option>`).join("")}</select></label><label>② 内容布局<select id="brief-layout">${layouts.map(s=>`<option value="${s.id}">${s.name}</option>`).join("")}</select></label><label>③ 打开详情的方式<select id="brief-component"><option value="drawer">右侧抽屉 Drawer</option><option value="modal">居中模态弹窗 Modal Dialog</option><option value="sheet">底部面板 Bottom Sheet</option></select></label></div><div class="prompt-card"><span class="eyebrow">你已经能这样描述一个界面了</span><label for="brief-output" class="note-label">可编辑的设计需求</label><textarea id="brief-output" spellcheck="false"></textarea><button class="primary" id="copy-brief">复制这段描述 ↗</button><p id="copy-status" role="status">先修改左侧选项，再按自己的想法编辑这段话。</p></div></div><div class="quiz"><span class="note-label">一个小练习 · 帮你分清概念</span><h3>“点击编辑后，从右边滑出一个磨砂玻璃面板。”这句话包含了什么？</h3><button data-answer="wrong">只有一种视觉风格</button><button data-answer="right">玻璃风格 + 抽屉交互</button><button data-answer="layout">一种卡片网格布局</button><p class="quiz-feedback" id="quiz-feedback" role="status"></p></div>`;
  $("#brief-style").value=selected.styles;$("#brief-layout").value=selected.layouts;if(["drawer","modal","sheet"].includes(selected.components))$("#brief-component").value=selected.components;
  ["#brief-page","#brief-style","#brief-layout","#brief-component"].forEach(s=>$(s).addEventListener("input",updateBrief));updateBrief();
  $("#copy-brief").onclick=async()=>{try{await navigator.clipboard.writeText($("#brief-output").value);$("#copy-status").textContent="已复制，可以粘贴给 AI，也可以继续修改。";}catch{$("#brief-output").focus();$("#brief-output").select();$("#copy-status").textContent="浏览器未允许自动复制，已选中文本，请按 Ctrl+C（Mac：⌘C）复制。";}};
  $$("[data-answer]").forEach(b=>b.onclick=()=>{$("#quiz-feedback").textContent=b.dataset.answer==="right"?"答对了！“磨砂玻璃”说外观，“从右边滑出”说抽屉的出现方式。":"再看两个线索：“磨砂玻璃”描述外观，“从右边滑出”描述交互。它们可以组合。";});
}
function updateBrief(){const s=styles.find(x=>x.id===$("#brief-style").value),l=layouts.find(x=>x.id===$("#brief-layout").value),c=components.find(x=>x.id===$("#brief-component").value);$("#brief-output").value=`请设计一个${$("#brief-page").value.trim()||"灵感收藏页"}。\n\n视觉：${s.say}\n\n布局：${l.say}\n\n交互：${c.say}\n\n反馈：保存后给出简短成功提示；没有内容时显示空状态和添加入口，加载失败时提供持续可见的错误说明和重试。\n\n请兼顾手机端、文字对比度和键盘操作。`;$("#copy-status").textContent="描述已根据选项更新，可继续编辑后复制。";}
$$("[data-chapter]").forEach(b=>b.onclick=()=>{chapter=b.dataset.chapter;render();});
render();
