export const pointerItems=[
  {id:'eye-follow',cat:'motion',name:'视线跟随',en:'Cursor-following Eyes',tags:['小狗','眼睛','鼠标跟随','Eye tracking','吉祥物'],description:'眼白和脸保持不动，只让瞳孔朝指针方向偏移一点。两个眼睛分别计算自己的中心，就会产生小狗在看你的感觉。这里的 Eye tracking 是装饰动画，不是摄像头追踪用户眼球。',observe:'在画面里移动鼠标，或点四个方向。打开原理辅助线，观察眼睛中心到目标点的方向；调大移动上限，看瞳孔仍被限制在眼白内。手机可轻点画面。',avoid:'一张合并好的小狗图片不能直接单独移动瞳孔。需要将脸、眼白、瞳孔分层，或者用 SVG / CSS 绘制可独立控制的部分。简单卡通不需要 3D 建模。',prompt:'制作一只亲切的大眼睛小狗作为网页吉祥物。使用分层 SVG 或 CSS 画出脸、眼白和瞳孔；瞳孔根据鼠标位置移动，限制在眼白内部，使用平滑缓动。离开区域时回正，支持触屏点击和减少动态效果，不遮挡主要操作。'},
  {id:'magnetic',cat:'motion',name:'磁吸交互',en:'Magnetic Interaction',tags:['磁吸按钮','吸附','鼠标跟随','Magnetic button','邻近感应'],description:'当指针进入物体附近，物体向指针方向移动一小段；离开感应范围后回到原位。这里只是用距离计算模拟吸引，不需要真正的物理引擎。',observe:'从远处慢慢靠近中心圆块。虚线圆代表感应范围，十字是固定原点。调整吸引强度，再比较直接跟随和带滞后的平滑跟随。',avoid:'磁吸通常有距离范围和位移上限；鼠标跟随可以一直跟着走，视差则常让多个图层以不同幅度移动。计算距离应使用固定原点，避免移动后的物体反过来改变判断基准。',prompt:'给装饰圆块添加磁吸交互：指针进入附近时轻微向指针靠近，距离边缘越近吸引越弱，离开后平滑归位。以不移动的外层容器测量距离，仅对内层应用 transform，限制位移，不影响点击、键盘和触屏操作，尊重减少动态效果设置。'},
];
const dog=()=>`<span class="puppy" aria-hidden="true"><i class="puppy-ear left"></i><i class="puppy-ear right"></i><span class="puppy-face"><i class="puppy-patch"></i><span class="puppy-eye left"><i class="puppy-pupil"><b></b></i></span><span class="puppy-eye right"><i class="puppy-pupil"><b></b></i></span><span class="puppy-muzzle"><i class="puppy-nose"></i><i class="puppy-mouth"></i></span><i class="puppy-cheek left"></i><i class="puppy-cheek right"></i></span><span class="puppy-collar"><b>豆</b></span></span>`;
export function pointerPreview(item){return item.id==='eye-follow'?`<span class="puppy-mini">${dog()}</span><span class="pointer-preview-label">HELLO, HUMAN.</span>`:'<span class="magnet-mini"><i class="magnet-halo"></i><span class="magnet-orb">come<br>closer ↗</span><i class="magnet-cursor">↖</i></span>';}
export function mountPointer(item,host,controls,{motion,notify}){
  const eye=item.id==='eye-follow',cleanups=[];
  const on=(el,type,fn)=>{el.addEventListener(type,fn);cleanups.push(()=>el.removeEventListener(type,fn));};
  host.className=`live-demo pointer-demo ${eye?'eye-stage':'magnetic-stage'}`;
  host.innerHTML=`<div class="pointer-playground" tabindex="0" role="group" aria-label="${eye?'小狗视线':'磁吸'}演示，移动鼠标、轻点或用方向键操作"><svg class="pointer-guides" aria-hidden="true"><line/><line/><circle r="4"/></svg><span class="pointer-origin" aria-hidden="true">+</span>${eye?dog():'<span class="magnet-range" aria-hidden="true"></span><button class="magnet-orb" aria-label="点击磁吸圆块">come<br>closer ↗</button>'}<span class="pointer-stage-label">${eye?'HELLO, HUMAN.':'A LITTLE ATTRACTION.'}</span></div>`;
  const area=host.firstElementChild,subjects=[...area.querySelectorAll(eye?'.puppy-pupil':'.magnet-orb')];
  const state=subjects.map(()=>({x:0,y:0,tx:0,ty:0}));let amount=eye?12:45,smooth=true,guides=!eye,point=null,raf=0,last=0,disposed=false;
  controls.innerHTML=`<label for="pointer-strength">${eye?'瞳孔移动上限':'吸引强度'}<output id="pointer-strength-value">${amount}${eye?'px':'%'}</output><input id="pointer-strength" type="range" min="0" max="${eye?16:90}" value="${amount}"></label><div class="pointer-switches"><button class="secondary" data-smooth aria-pressed="true">平滑跟随</button><button class="secondary" data-guides aria-pressed="${guides}">原理辅助线</button></div><div class="pointer-directions" aria-label="无需鼠标也能试"><button data-direction="left" aria-label="目标移到左侧">←</button><button data-direction="up" aria-label="目标移到上方">↑</button><button data-direction="down" aria-label="目标移到下方">↓</button><button data-direction="right" aria-label="目标移到右侧">→</button><button data-direction="reset">回到中心</button></div><p class="pointer-explanation">${eye?'固定眼白 → 计算方向 → 限制瞳孔位移':'固定原点 → 判断距离 → 移动内层 → 离开归位'}</p><p class="pointer-reading">移动鼠标，或点击方向按钮。</p>`;
  const reading=controls.querySelector('.pointer-reading');
  function paint(){subjects.forEach((el,i)=>el.style.transform=`translate(${state[i].x.toFixed(2)}px,${state[i].y.toFixed(2)}px)`);}
  function tick(time){raf=0;if(disposed)return;const dt=last?Math.min(time-last,50):16.7;last=time;const alpha=1-Math.exp(-dt/85);let pending=false;for(const s of state){s.x+=(s.tx-s.x)*alpha;s.y+=(s.ty-s.y)*alpha;if(Math.hypot(s.tx-s.x,s.ty-s.y)>.03)pending=true;else{s.x=s.tx;s.y=s.ty;}}paint();if(pending)raf=requestAnimationFrame(tick);else last=0;}
  function animate(manual=false){if(!smooth||!motion()||manual){cancelAnimationFrame(raf);raf=0;last=0;state.forEach(s=>{s.x=s.tx;s.y=s.ty;});paint();}else if(!raf)raf=requestAnimationFrame(tick);}
  function update(manual=false){
    const rect=area.getBoundingClientRect(),cx=rect.width/2,cy=rect.height/2,radius=Math.min(rect.width,rect.height)*.42;
    area.style.setProperty('--magnet-radius',radius+'px');area.classList.toggle('show-guides',guides);
    const lines=area.querySelectorAll('line'),dot=area.querySelector('circle');dot.setAttribute('cx',point?.x??cx);dot.setAttribute('cy',point?.y??cy);
    let distance=0;
    subjects.forEach((el,i)=>{let x=cx,y=cy;if(eye){const r=el.parentElement.getBoundingClientRect();x=r.left-rect.left+r.width/2;y=r.top-rect.top+r.height/2;}const dx=point?point.x-x:0,dy=point?point.y-y:0,d=Math.hypot(dx,dy);distance=d;let factor;
      if(eye){const max=Math.min(amount,(el.parentElement.clientWidth-el.clientWidth)/2-3);factor=d?Math.min(d*.10,max)/d:0;}
      else{const falloff=Math.max(0,1-d/radius);factor=(amount/100)*falloff*1.8;}
      state[i].tx=dx*factor;state[i].ty=dy*factor;
      const line=lines[i];line.setAttribute('x1',x);line.setAttribute('y1',y);line.setAttribute('x2',point?.x??x);line.setAttribute('y2',point?.y??y);
    });
    reading.textContent=point?(eye?`瞳孔目标偏移约 ${Math.hypot(state[0].tx,state[0].ty).toFixed(1)}px，方向来自指针位置。`:`距原点 ${Math.round(distance)}px / 感应半径 ${Math.round(radius)}px · ${distance<radius?'进入吸引范围':'范围外，回到原位'}`):'已回正。移动鼠标，或点击方向按钮。';animate(manual);
  }
  function target(e){if(!motion()&&e.pointerType!=='touch')return;const r=area.getBoundingClientRect();point={x:e.clientX-r.left,y:e.clientY-r.top};update(e.pointerType==='touch');}
  on(area,'pointermove',e=>{if(e.pointerType!=='touch')target(e);});on(area,'pointerdown',target);
  const reset=()=>{point=null;update();};on(area,'pointerleave',e=>{if(e.pointerType!=='touch')reset();});on(area,'pointercancel',reset);
  function direction(value){const r=area.getBoundingClientRect();point=value==='reset'?null:{x:r.width/2+({left:-1,right:1}[value]||0)*r.width*.23,y:r.height/2+({up:-1,down:1}[value]||0)*r.height*.23};update(!motion());}
  on(controls.querySelector('.pointer-directions'),'click',e=>{const b=e.target.closest('[data-direction]');if(b)direction(b.dataset.direction);});
  on(area,'keydown',e=>{const key={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',Home:'reset'}[e.key];if(key){e.preventDefault();direction(key);}});
  on(controls.querySelector('[data-smooth]'),'click',e=>{smooth=!smooth;e.currentTarget.setAttribute('aria-pressed',String(smooth));update();});on(controls.querySelector('[data-guides]'),'click',e=>{guides=!guides;e.currentTarget.setAttribute('aria-pressed',String(guides));update();});
  on(controls.querySelector('input'),'input',e=>{amount=Number(e.target.value);controls.querySelector('output').textContent=amount+(eye?'px':'%');update();});
  if(!eye)on(subjects[0],'click',()=>notify('圆块可以正常点击。磁吸只改变外观位置。'));
  on(window,'resize',reset);on(window,'scroll',reset);on(document.querySelector('#detail'),'scroll',reset);on(document,'visibilitychange',()=>{if(document.hidden){point=null;update(true);}});
  update(true);if(!motion())reading.textContent='动效已暂停。方向按钮或触屏轻点仍可静态观察位置。';
  return ()=>{disposed=true;cancelAnimationFrame(raf);cleanups.forEach(fn=>fn());};
}

