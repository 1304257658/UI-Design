import {categories,items} from './data.js';
import {preview,swatchClass,mountDemo} from './demos.js';
import {ParticleView} from './particles.js';

const $=id=>document.getElementById(id),tabs=$('categories'),gallery=$('gallery'),dialog=$('detail'),search=$('search');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let activeCategory='material',visibleItems=[],current=null,currentList=[],opener=null,destroyDemo=()=>{},previewViews=[],motionEnabled=!reduced.matches,toastTimer;
const categoryOf=item=>categories.find(c=>c.id===item.cat);
const demoOptions={notify,motion:()=>motionEnabled};
function notify(text){const toast=$('toast');clearTimeout(toastTimer);toast.textContent=text;toast.showPopover();toastTimer=setTimeout(()=>toast.hidePopover(),3100);}
function setMotion(value){motionEnabled=value;document.body.classList.toggle('motion-off',!value);$('motion-toggle').setAttribute('aria-pressed',String(value));$('motion-toggle').textContent=value?'动效已开启':'动效已暂停';if(!value)previewViews.forEach(view=>view.pause());if(current&&dialog.open){destroyDemo();destroyDemo=mountDemo(current,$('live-demo'),$('demo-controls'),demoOptions);}}
setMotion(motionEnabled);$('motion-toggle').addEventListener('click',()=>setMotion(!motionEnabled));reduced.addEventListener('change',e=>setMotion(!e.matches));

function drawTabs(){tabs.innerHTML=categories.map(c=>`<button id="tab-${c.id}" role="tab" data-category="${c.id}" aria-selected="${activeCategory===c.id}" aria-controls="collection-panel" tabindex="${activeCategory===c.id?0:-1}">${c.name}<span>${items.filter(i=>i.cat===c.id).length.toString().padStart(2,'0')}</span></button>`).join('');}
function selectCategory(id,{focus=false}={}){activeCategory=id;search.value='';drawTabs();renderGallery();if(focus){const tab=$('tab-'+id);tab.focus();tab.scrollIntoView({block:'nearest',inline:'nearest'});}}
tabs.addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b)selectCategory(b.dataset.category);});
tabs.addEventListener('keydown',e=>{if(!e.target.matches('[role=tab]'))return;const index=categories.findIndex(c=>c.id===e.target.dataset.category);let next;if(e.key==='ArrowRight')next=(index+1)%categories.length;if(e.key==='ArrowLeft')next=(index+categories.length-1)%categories.length;if(e.key==='Home')next=0;if(e.key==='End')next=categories.length-1;if(next!==undefined){e.preventDefault();selectCategory(categories[next].id,{focus:true});}});

function renderGallery(){
  previewViews.forEach(v=>v.dispose());previewViews=[];const query=search.value.trim().toLowerCase(),category=categories.find(c=>c.id===activeCategory);
  visibleItems=items.filter(i=>(query||i.cat===activeCategory)&&(!query||`${i.name} ${i.en} ${i.tags.join(' ')} ${categoryOf(i).name}`.toLowerCase().includes(query)));
  $('category-title').textContent=query?'搜索结果':category.name;$('category-description').textContent=query?'在所有分类中寻找。点开方块，开始一次小实验。':category.description;$('result-count').textContent=`${visibleItems.length.toString().padStart(2,'0')} 个样本`;
  $('collection-panel').setAttribute('aria-labelledby',query?'category-title':'tab-'+activeCategory);$('empty').hidden=visibleItems.length!==0;gallery.hidden=visibleItems.length===0;
  gallery.innerHTML=visibleItems.map(i=>`<button class="tile" data-item="${i.id}" aria-label="了解${i.name} · ${i.en}"><span class="tile-preview ${swatchClass(i)}" aria-hidden="true"><span class="preview-id">${String(items.indexOf(i)+1).padStart(2,'0')}</span>${preview(i)}<span class="preview-hint">点击探索 ↗</span></span><span class="tile-info"><span class="tile-name-row"><span class="tile-name">${i.name}</span><span class="tile-arrow" aria-hidden="true">↗</span></span><span class="tile-en">${i.en}</span></span></button>`).join('');
  gallery.querySelectorAll('canvas').forEach(canvas=>{const tile=canvas.closest('.tile'),view=new ParticleView(canvas,tile.dataset.item,{motion:false,count:420});previewViews.push(view);const start=()=>{if(motionEnabled)view.play();},stop=()=>view.pause();tile.addEventListener('pointerenter',start);tile.addEventListener('pointerleave',stop);tile.addEventListener('focus',start);tile.addEventListener('blur',stop);});
}
gallery.addEventListener('click',e=>{const b=e.target.closest('[data-item]');if(b){opener=b;currentList=[...visibleItems];openItem(b.dataset.item);}});
search.addEventListener('input',renderGallery);$('reset-search').addEventListener('click',()=>{search.value='';renderGallery();search.focus();});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!dialog.open&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)){e.preventDefault();search.focus();}});

function openItem(id){
  destroyDemo();current=items.find(i=>i.id===id);if(!current)return;const cat=categoryOf(current);
  $('detail-category').textContent=`${cat.name} / ${cat.en}`;$('detail-title').textContent=current.name;$('detail-english').textContent=current.en;$('detail-number').textContent='NO. '+String(items.indexOf(current)+1).padStart(2,'0');
  $('detail-tags').innerHTML=current.tags.map(t=>`<span>${t}</span>`).join('');$('detail-description').textContent=current.description;$('detail-observe').textContent=current.observe;$('detail-avoid').textContent=current.avoid;$('detail-prompt').value=current.prompt;
  $('demo-caption').textContent=current.cat==='particles'?'拖动改变角度 · Canvas 三维投影演示':current.cat==='data'?'示例数据 · 可直接操作':'真实网页示例 · 放心动手试';
  const index=currentList.findIndex(i=>i.id===id);$('detail-position').textContent=`${index+1} / ${currentList.length}`;$('previous-item').disabled=index<=0;$('next-item').disabled=index>=currentList.length-1;
  if(!dialog.open){dialog.showModal();document.body.style.overflow='hidden';}
  destroyDemo=mountDemo(current,$('live-demo'),$('demo-controls'),demoOptions);dialog.scrollTop=0;$('close-detail').focus();
}
function close(){destroyDemo();destroyDemo=()=>{};current=null;dialog.close();document.body.style.overflow='';if(opener?.isConnected)opener.focus();}
$('close-detail').addEventListener('click',close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const focusables=[...dialog.querySelectorAll('button:not([disabled]),input,textarea,select,a[href],summary,[tabindex="0"]')].filter(el=>el.getClientRects().length&&!el.closest('[inert]'));const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
$('previous-item').addEventListener('click',()=>{const index=currentList.indexOf(current);if(index>0)openItem(currentList[index-1].id);});$('next-item').addEventListener('click',()=>{const index=currentList.indexOf(current);if(index<currentList.length-1)openItem(currentList[index+1].id);});
$('copy-prompt').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('detail-prompt').value);notify('描述已复制，可以直接发给 AI。');}catch{$('detail-prompt').focus();$('detail-prompt').select();notify('浏览器未允许自动复制，文本已选中，可手动复制。');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)previewViews.forEach(v=>v.pause());});
$('total-count').textContent=`${items.length} SAMPLES / ${categories.length} CHAPTERS`;drawTabs();renderGallery();


