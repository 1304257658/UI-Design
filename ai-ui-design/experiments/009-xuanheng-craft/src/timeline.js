export const chapterStops=[0,.24,.40,.63,.82,.98];
export const chapterBoundaries=[0,.16,.31,.50,.72,.93,1.08];
export const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
export const phase=(p,a,b)=>smooth((p-a)/(b-a));

// Everything derives from scroll progress, including spindle rotation. No free-running clock.
export function manufacturingPose(progress){
  const p=clamp(progress);
  const index=phase(p,.345,.390)*.68;
  let tip=1.25;
  if(p>=.18&&p<.255)tip=1.25*(1-phase(p,.18,.255));
  else if(p>=.255&&p<.315)tip=-.009;
  else if(p>=.315&&p<.345)tip=-.009+.78*phase(p,.315,.345);
  else if(p>=.345&&p<.400)tip=.771;
  else if(p>=.400&&p<.445)tip=.771-.780*phase(p,.400,.445);
  else if(p>=.445&&p<.470)tip=-.009;
  else if(p>=.470)tip=-.009+1.9*phase(p,.470,.535);
  const toolAngle=Math.PI/2+phase(p,.345,.4)*Math.PI*2/5;
  const hx=Math.cos(toolAngle)*1.72*.42,hz=-Math.sin(toolAngle)*1.72*.42;
  return {
    p,index,tip,
    cutterRotation:clamp((p-.22)/.26)*Math.PI*48,
    toolX:hx*Math.cos(index)+hz*Math.sin(index),
    toolZ:-hx*Math.sin(index)+hz*Math.cos(index),
    release:phase(p,.535,.59),
    enclosure:phase(p,.55,.71),
    fixture:phase(p,.59,.725),
    head:phase(p,.54,.68),
    presentation:phase(p,.60,.75),
    cutting:(p>=.255&&p<.315)||(p>=.445&&p<.470),
  };
}
