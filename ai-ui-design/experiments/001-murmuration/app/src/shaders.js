import { formationGLSL } from './formation.js';
export const cloudVertex = `${formationGLSL}
uniform float uTime, uDpr, uThickness, uReveal;
attribute vec4 aSeed;
attribute float aInfected;
varying float vOpacity, vInfected;
void main() {
  vec3 p = formation(aSeed, uTime, uThickness);
  vec4 view = modelViewMatrix * vec4(p, 1.0);
  vInfected = smoothstep(aInfected, aInfected + 0.55, uTime);
  float size = mix(0.86, 2.05, pow(aSeed.w, 2.4)) + smoothstep(0.976, 1.0, aSeed.w)*1.2;
  size = mix(size, max(size, 2.15), vInfected);
  gl_PointSize = min(size*uDpr*mix(8.0/max(-view.z, 0.1), 1.0, 0.28), 5.0*uDpr);
  float revealStart = fract(aSeed.x*17.13+aSeed.w*7.41)*0.7;
  vOpacity = mix(0.57,0.88,1.0-smoothstep(6.1,11.0,-view.z))*mix(0.74,1.0,aSeed.w)*smoothstep(revealStart,1.0,uReveal);
  gl_Position = projectionMatrix * view;
}`;
export const cloudFragment = `
varying float vOpacity, vInfected;
void main() {
  float r = length(gl_PointCoord-0.5);
  float edge = clamp(fwidth(r), 0.08, 0.5);
  float alpha = (1.0-smoothstep(0.5-edge,0.5,r))*vOpacity;
  if(alpha<0.01) discard;
  gl_FragColor=vec4(mix(vec3(1.0),vec3(1.0,0.009,0.04),vInfected),alpha);
}`;
export const arcVertex = `
uniform vec3 uFrom, uTo;
uniform vec2 uResolution;
uniform float uHead, uBend;
attribute float aAlong, aSide;
varying float vAlong, vSide;
void main() {
  vec3 start = (modelViewMatrix*vec4(uFrom,1.0)).xyz;
  vec3 end = (modelViewMatrix*vec4(uTo,1.0)).xyz;
  vec2 chord = end.xy-start.xy;
  vec2 normal = normalize(vec2(-chord.y,chord.x)+vec2(0.00001));
  vec3 control = (start+end)*0.5;
  control.xy += normal*length(chord)*uBend;
  float t = aAlong*uHead;
  vec3 ab = mix(start,control,t), bc = mix(control,end,t);
  vec3 p = mix(ab,bc,t);
  vec4 clip = projectionMatrix*vec4(p,1.0);
  vec4 ahead = projectionMatrix*vec4(p+normalize(bc-ab+vec3(0.00001))*0.01,1.0);
  vec2 tangent = normalize((ahead.xy/ahead.w-clip.xy/clip.w)*uResolution);
  vec2 perpendicular = vec2(-tangent.y,tangent.x);
  clip.xy += perpendicular*aSide*1.6*2.0/uResolution*clip.w;
  gl_Position=clip;
  vAlong=aAlong; vSide=aSide;
}`;
export const arcFragment = `
uniform float uOpacity, uFade;
varying float vAlong, vSide;
void main(){
  float edge=1.0-smoothstep(0.5,1.0,abs(vSide));
  float head=0.74+0.26*exp(-pow((1.0-vAlong)*8.0,2.0));
  float tail=1.0-smoothstep(vAlong*0.22,vAlong*0.22+0.78,uFade);
  gl_FragColor=vec4(1.0,0.009,0.04,edge*head*tail*uOpacity);
}`;
export const nodesVertex = `
uniform float uDpr;
attribute float aAge, aStrength;
varying float vAge, vStrength;
void main(){
  vec4 view=modelViewMatrix*vec4(position,1.0);
  gl_Position=projectionMatrix*view;
  gl_PointSize=48.0*uDpr*8.0/max(0.1,-view.z);
  vAge=aAge; vStrength=aStrength;
}`;
export const nodesFragment = `
varying float vAge,vStrength;
void main(){
  float r=length(gl_PointCoord-0.5);
  float core=exp(-r*r*1600.0)*0.7;
  float wave=0.0;
  for(int i=0;i<3;i++){
    float p=vAge*1.7-float(i)*0.3;
    float rad=0.025+clamp(p,0.0,1.0)*0.36;
    wave+=(1.0-smoothstep(0.008,0.022,abs(r-rad)))*smoothstep(0.0,0.08,p)*(1.0-smoothstep(0.4,1.0,p))*0.5;
  }
  float alpha=(core+wave)*vStrength;
  if(alpha<0.004)discard;
  gl_FragColor=vec4(1.0,0.009,0.04,alpha);
}`;
