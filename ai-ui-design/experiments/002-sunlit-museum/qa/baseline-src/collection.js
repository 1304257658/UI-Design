export const ROOMS = [
  {id:0, name:'材质与风格', en:'MATERIAL & CHARACTER', center:0, subtitle:'从一种感觉，认识一种设计语言。'},
  {id:1, name:'交互与回应', en:'INTERACTION & RESPONSE', center:-28, subtitle:'亲手打开、按下、切换，看看界面如何回应。'},
];
export const EXHIBITS = [
  {id:'glass',room:0,name:'玻璃风格',en:'GLASSMORPHISM',short:'半透明 · 背景模糊 · 细亮边框',kind:'style',x:0,z:0,skin:'glass',title:'让灵感，\n在这里停留',description:'像隔着一片磨砂玻璃看背景。半透明让颜色透过来，背景模糊让后面的细节变柔和。',tip:'改变模糊与不透明度，观察背景与正文的区别。',prompt:'卡片采用玻璃风格：半透明白底、背景模糊和细亮边框，正文保持清晰。',caution:'模糊的是卡片背后的画面，不是正文。'},
  {id:'minimal',room:0,name:'极简风格',en:'MINIMALISM',short:'留白 · 克制配色 · 清晰层级',kind:'style',x:-5,z:-2,skin:'minimal',title:'少，\n但更好。',description:'用留白、对齐和文字大小来安排注意力。重要内容清楚，装饰保持克制。',tip:'切换留白大小，感受同一内容的节奏。',prompt:'采用极简风格，暖白底、深色文字和充足留白，用字号与间距建立层级。',caution:'极简仍然需要清晰的操作入口。'},
  {id:'brutal',room:0,name:'新粗野风格',en:'NEUBRUTALISM',short:'粗描边 · 硬阴影 · 大胆色块',kind:'style',x:5,z:-2,skin:'brutal',title:'MAKE\nIDEAS\nREAL.',description:'粗黑描边、鲜亮色块和没有模糊的偏移阴影，像大胆的平面海报。',tip:'调整阴影偏移，再按下按钮。',prompt:'采用新粗野风格：粗黑描边、黄色块、硬偏移阴影，按钮按下时回落。',caution:'风格标签并非严格标准，具体特征要一起说。'},
  {id:'editorial',room:0,name:'杂志编辑风',en:'EDITORIAL DESIGN',short:'衬线标题 · 阅读节奏 · 分隔线',kind:'style',x:-5,z:-8,skin:'editorial',title:'The art\nof slowing\ndown.',description:'借鉴杂志的编排方式，以有性格的标题、图片和留白形成阅读节奏。',tip:'切换标题字体，观察气质变化。',prompt:'采用杂志编辑风：米白底、深红点缀、衬线大标题与细分隔线，正文易读。',caution:'换成衬线字体只是一个手段，编排同样重要。'},
  {id:'soft',room:0,name:'新拟物风格',en:'NEUMORPHISM',short:'同色表面 · 双向柔影 · 浮雕感',kind:'style',x:5,z:-8,skin:'soft',title:'柔和，\n触手可及。',description:'表面与背景接近同色，一明一暗的柔影制造凸起和凹下去的感觉。',tip:'切换凸起和凹陷，留意阴影方向。',prompt:'使用浅灰同色表面与双向柔和阴影，表现轻微凸起，保持按钮边界和文字清晰。',caution:'过低的对比会使控件难以辨认。'},
  {id:'cyber',room:0,name:'赛博科技风',en:'FUTURISTIC UI',short:'深色基底 · 荧光点缀 · 细线',kind:'style',x:0,z:-8,skin:'cyber',title:'Beyond\nthe ordinary.',description:'深色背景与克制的荧光边缘，构成一种数字空间感。',tip:'开关边缘光，观察强调效果。',prompt:'深蓝黑基底，青色细线与克制边缘光，正文不发光，保持可读。',caution:'深色模式本身不等于赛博风。'},
  {id:'drawer',room:1,name:'抽屉',en:'DRAWER',short:'从边缘滑入 · 保留上下文',kind:'interaction',x:0,z:-28,skin:'glass',title:'让信息，\n自然展开。',description:'从页面边缘进入的面板，常用来查看详情或编辑。关闭后仍在原页面。',tip:'点击“编辑笔记”，体验从右侧打开的抽屉。',prompt:'点击编辑后从右侧打开抽屉，背景加遮罩，支持关闭按钮和 Esc。',caution:'“抽屉”说出现方式，“模态”说是否阻止背景操作。'},
  {id:'modal',room:1,name:'模态弹窗',en:'MODAL DIALOG',short:'集中注意 · 暂停背景操作',kind:'interaction',x:-5,z:-30,skin:'minimal',title:'停一下，\n确认此刻。',description:'打开时必须先处理或关闭它，再继续操作背景。常用于短任务和确认。',tip:'打开弹窗，再试试背景按钮和 Esc。',prompt:'居中打开模态弹窗，背景不可操作，提供确认与关闭，支持 Esc 和键盘焦点循环。',caution:'模态并不规定居中；抽屉也可以是模态。'},
  {id:'toast',room:1,name:'轻提示',en:'TOAST / MESSAGE',short:'短暂反馈 · 不打断操作',kind:'interaction',x:5,z:-30,skin:'editorial',title:'已保存。\n继续灵感。',description:'操作后短暂出现的反馈，随后自动消失，通常不会打断原来的任务。',tip:'模拟保存，看提示出现与消失。',prompt:'保存成功后显示短暂 Toast，约 3 秒消失，不遮挡主要操作。',caution:'需要处理的错误应持续显示，不能转瞬即逝。'},
  {id:'tabs',room:1,name:'标签页',en:'TABS',short:'同一区域 · 并列内容切换',kind:'interaction',x:-5,z:-36,skin:'soft',title:'不同视角，\n同一处灵感。',description:'在同一个区域切换几个并列内容面板，一次显示一个。',tip:'切换概览和目录，键盘左右键也能操作。',prompt:'设置概览和目录两个 Tabs，选中项高亮，切换时保留页面位置。',caution:'标签页和列表筛选是不同用途。'},
  {id:'accordion',room:1,name:'折叠面板',en:'ACCORDION',short:'原位展开 · 按需阅读',kind:'interaction',x:5,z:-36,skin:'minimal',title:'把细节，\n慢慢展开。',description:'点击标题后在原处展开内容，再次点击收起，其他内容会随之移动。',tip:'点开两个问题，观察页面空间的变化。',prompt:'常见问题采用折叠面板，点击标题原位展开，允许多项同时展开。',caution:'它通常影响布局，不像弹窗覆盖在原内容之上。'},
  {id:'loading',room:1,name:'加载与空状态',en:'LOADING & EMPTY',short:'告诉用户 · 现在发生了什么',kind:'interaction',x:0,z:-36,skin:'glass',title:'等待，\n也有回应。',description:'加载时用占位结构解释等待；没有内容时解释原因，并给出下一步。',tip:'切换加载、空内容和失败，尝试恢复。',prompt:'加载时显示骨架屏，空内容提供添加入口，失败时提供明确说明和重试。',caution:'无内容和加载失败不能混为“暂无数据”。'},
];

export const EXHIBIT_MAP = Object.fromEntries(EXHIBITS.map(x=>[x.id,x]));
// A walkable union of two rooms and a connecting corridor. Radius includes the viewer body.
export function canOccupy(x,z,obstacles=EXHIBITS,radius=.32){
  const inRoom=(Math.abs(x)<9.5-radius&&((z>-11.7+radius&&z<11.5-radius)||(z>-39.5+radius&&z<-16.3-radius)));
  const inPassage=Math.abs(x)<2.25-radius&&z>-17&&z<-11;
  if(!inRoom&&!inPassage)return false;
  return !obstacles.some(o=>Math.abs(x-o.x)<1.4+radius&&Math.abs(z-o.z)<.68+radius);
}
