import {Timeline} from './mini-engine.js';
const $ = selector => document.querySelector(selector);
const layers = [...document.querySelectorAll('.layer')];
const seek = $('#seek');
const play = $('#play');
const status = $('#play-state');
const tracks = [
  {key:'spread',start:0,end:3000,from:0,to:60,ease:'inOutCubic'},
  {key:'rotation',start:1000,end:5000,from:0,to:55,ease:'inOutCubic'},
  {key:'opacity',start:3500,end:5500,from:0,to:1,ease:'linear'},
];
let timeline;
timeline = new Timeline({duration:6000,tracks,render(values,time){
  layers.forEach((layer,index) => {
    const n = index - 1.5;
    layer.style.transform = `translate(${n*values.spread}px,${n*values.spread*.32}px) rotateY(${-values.rotation}deg) rotateZ(${-values.rotation*.15}deg)`;
    layer.style.zIndex = 4-index;
  });
  $('.annotation').style.opacity = values.opacity;
  seek.value = time;
  $('#frame-time').value = `${Math.round(time)} ms`;
  $('#percent').value = `${Math.round(time/60)}%`;
  $('#spread-value').value = `${values.spread.toFixed(1)} px`;
  $('#rotation-value').value = `${values.rotation.toFixed(1)}°`;
  $('#opacity-value').value = values.opacity.toFixed(2);
  for (const [key,max] of [['spread',60],['rotation',55],['opacity',1]]) $(`#${key}-fill`).style.transform = `scaleX(${values[key]/max})`;
  const atEnd = timeline && ((timeline.speed > 0 && time === 6000) || (timeline.speed < 0 && time === 0));
  play.textContent = timeline?.playing && !atEnd ? '暂停' : '播放';
  if(atEnd){status.textContent=time===6000?'已到终点。可以倒放，或拖回任意时刻。':'已归零。可以播放或拖动进度。';}
}});
play.addEventListener('click',()=>{
  if(timeline.playing){timeline.pause();play.textContent='播放';status.textContent='已暂停，所有轨道停在同一帧。';return;}
  timeline.setSpeed(Number($('#speed').value));
  if(timeline.time===6000) timeline.seek(0);
  timeline.play();play.textContent='暂停';status.textContent='正在播放。';
});
$('#reverse').addEventListener('click',()=>{
  timeline.setSpeed(-Number($('#speed').value));
  if(timeline.time===0) timeline.seek(6000);
  timeline.play();play.textContent='暂停';status.textContent='正在倒放，使用同一条时间轴。';
});
$('#reset').addEventListener('click',()=>{timeline.pause().seek(0);play.textContent='播放';});
seek.addEventListener('input',()=>{timeline.pause().seek(Number(seek.value));play.textContent='播放';status.textContent='手动定位。位置直接由时间求值。';});
$('#speed').addEventListener('change',event=>timeline.setSpeed(Math.sign(timeline.speed)*Number(event.target.value)));
$('#ease').addEventListener('change',event=>{timeline.tracks[0].ease=event.target.value;timeline.seek(timeline.time);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){timeline.pause();play.textContent='播放';status.textContent='页面进入后台，已暂停。';}});
window.addEventListener('pagehide',()=>timeline.pause());
// No autoplay, including under prefers-reduced-motion; motion is user initiated.
