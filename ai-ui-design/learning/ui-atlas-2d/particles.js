// Points have real 3D coordinates; Canvas draws their perspective projection.
// This avoids multiple WebGL contexts for a gallery of small previews.
const TAU=Math.PI*2;
const seeded=(i)=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export class ParticleView{
  constructor(canvas,kind,{interactive=false,motion=true,count=600}={}){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.kind=kind;this.count=count;this.motion=motion;this.speed=.6;this.yaw=.2;this.pitch=kind==='galaxy'?.75:kind==='wave'?.6:.13;this.time=0;this.last=0;this.frame=0;this.dead=false;this.drag=null;this.cleanup=[];
    this.observer=new ResizeObserver(()=>this.draw());this.observer.observe(canvas);
    if(interactive){canvas.tabIndex=0;const on=(name,fn)=>{canvas.addEventListener(name,fn);this.cleanup.push(()=>canvas.removeEventListener(name,fn));};
      on('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')this.yaw-=.15;if(e.key==='ArrowRight')this.yaw+=.15;if(e.key==='ArrowUp')this.pitch=Math.max(-1.3,this.pitch-.15);if(e.key==='ArrowDown')this.pitch=Math.min(1.3,this.pitch+.15);this.draw();}});
      on('pointerdown',e=>{this.drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
      on('pointermove',e=>{if(!this.drag)return;this.yaw+=(e.clientX-this.drag[0])*.008;this.pitch=Math.max(-1.3,Math.min(1.3,this.pitch+(e.clientY-this.drag[1])*.008));this.drag=[e.clientX,e.clientY];this.draw();});
      on('pointerup',()=>this.drag=null);on('pointercancel',()=>this.drag=null);
    }
    this.draw();if(motion)this.play();
  }
  play(){this.motion=true;if(this.frame||this.dead)return;this.last=performance.now();const tick=now=>{this.frame=0;if(this.dead||!this.motion)return;this.time+=Math.min(.05,(now-this.last)/1000)*this.speed;this.last=now;this.draw();this.frame=requestAnimationFrame(tick);};this.frame=requestAnimationFrame(tick);}
  pause(){this.motion=false;cancelAnimationFrame(this.frame);this.frame=0;}
  draw(){if(this.dead)return;const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;const dpr=Math.min(devicePixelRatio,2),w=r.width,h=r.height;if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(h*dpr)){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}const c=this.ctx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);const pts=[],n=this.kind==='network'?Math.min(this.count,100):this.count,t=this.time,scale=Math.min(w,h)*.0032;
    for(let i=0;i<n;i++){
      let x,y,z,hue=190;const a=i*2.3999632297,rnd=seeded(i+5);
      if(this.kind==='sphere'){const v=1-2*(i+.5)/n,s=Math.sqrt(1-v*v);x=Math.cos(a)*s*115;y=v*115;z=Math.sin(a)*s*115;hue=175+v*35;}
      if(this.kind==='wave'){const row=Math.ceil(Math.sqrt(n));x=(i%row-row/2)*260/row;z=(Math.floor(i/row)-row/2)*260/row;y=Math.sin(x*.035+t*2)*20+Math.cos(z*.03+t*1.4)*18;hue=200+y*.7;}
      if(this.kind==='galaxy'){const radius=Math.sqrt((i+.5)/n)*145,arm=i%3,angle=arm*TAU/3+radius*.026+(rnd-.5)*.5;x=Math.cos(angle)*radius;z=Math.sin(angle)*radius;y=(seeded(i+71)-.5)*15;hue=radius<40?35:250+radius*.12;}
      if(this.kind==='network'){const v=1-2*(i+.5)/n,s=Math.sqrt(1-v*v),radius=80+seeded(i+13)*40;x=Math.cos(a+t*.1)*s*radius;y=v*radius;z=Math.sin(a+t*.1)*s*radius;hue=193;}
      if(this.kind==='flow'){const path=i%20,u=Math.floor(i/20)/Math.ceil(n/20)*TAU+t*.45;x=(u%TAU-3.14)*45;y=Math.sin(u*1.2+path*.18+t*.25)*43+(path-10)*5;z=Math.cos(u+path*.3)*38;hue=175+path*3;}
      if(this.kind==='orbit'){const ring=i%3,angle=i/n*TAU*3,radius=95+ring*18;x=Math.cos(angle)*radius;y=Math.sin(angle)*radius;z=0;const tilt=[.3,1.1,-.85][ring];z=y*Math.sin(tilt);y*=Math.cos(tilt);const rot=ring*1.05;const nx=x*Math.cos(rot)-y*Math.sin(rot);y=x*Math.sin(rot)+y*Math.cos(rot);x=nx;hue=[190,268,35][ring];}
      const yaw=this.yaw+(this.kind==='wave'||this.kind==='flow'?0:t*.19),cy=Math.cos(yaw),sy=Math.sin(yaw);const nx=x*cy+z*sy,nz=-x*sy+z*cy,cp=Math.cos(this.pitch),sp=Math.sin(this.pitch);const ny=y*cp-nz*sp,depth=y*sp+nz*cp,perspective=390/(390+depth);pts.push({x:w/2+nx*scale*perspective,y:h/2+ny*scale*perspective,z:depth,size:Math.max(.5,1.6*perspective),alpha:Math.max(.2,Math.min(.95,.65-depth/290)),hue});
    }
    pts.sort((a,b)=>b.z-a.z);
    if(this.kind==='network'){c.lineWidth=.55;for(let i=0;i<pts.length;i++){for(let j=i+1;j<pts.length;j++){const p=pts[i],q=pts[j],dist=Math.hypot(p.x-q.x,p.y-q.y);if(dist<Math.min(w,h)*.19&&Math.abs(p.z-q.z)<65){c.strokeStyle=`rgba(116,190,216,${.21*(1-dist/(Math.min(w,h)*.2))})`;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();}}}}
    for(const p of pts){c.fillStyle=`hsla(${p.hue},65%,75%,${p.alpha})`;c.beginPath();c.arc(p.x,p.y,p.size,0,TAU);c.fill();}
  }
  dispose(){this.dead=true;this.pause();this.observer.disconnect();this.cleanup.forEach(f=>f());}
}
