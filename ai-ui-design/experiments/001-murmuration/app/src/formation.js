// Independent reconstruction of the three blended parametric formations observed
// in OpenAI's CloudMeshHero. The CPU sampler is only used for message endpoints;
// all cloud particles are positioned by the corresponding GLSL function on GPU.
const mix = (a, b, t) => a + (b - a) * t;
const smooth = x => x * x * (3 - 2 * x);
export function sample(seed, seconds, thickness = 1) {
  const [along, lateral, deep, character] = seed;
  const t = 43.8 + seconds * .04;
  const angle = along * Math.PI * 2 + t * (.151 + character * .025);
  const a = lateral * thickness, d = deep * thickness;
  const pulse = t * .14;
  const cross = .1 + .15 * Math.abs(Math.sin(angle * 1.5 + pulse)) ** 1.6;
  const filament = .022 * Math.sin(angle * 5 + d * 4 - t * .36);
  const envelope = .79 + .21 * Math.cos(angle * 2);
  const f = angle + .2 * Math.sin(angle * 2 + pulse);
  const ring = [Math.cos(angle) * (1.03 + .1 * Math.sin(angle * 2 - pulse) + a * cross), Math.sin(angle) * .42 + .085 * Math.sin(angle * 2 + pulse) + a * cross * .74 + filament, Math.sin(angle + pulse * .65) * .76 + d * cross * 1.72];
  const ribbon = [1.34 * Math.sin(angle) + a * Math.cos(angle) * .09, Math.sin(angle * 2 + pulse) * .27 + Math.sin(angle * 3 - pulse * .6) * .08 + a * envelope * .22 + filament, Math.cos(angle) * .72 + Math.sin(angle * 2 - pulse * .7) * .12 + d * envelope * .43];
  const exchange = [Math.sin(f) * 1.08 + a * Math.cos(f) * .14, Math.sin(f * 2) * .31 + a * .17 + filament, Math.cos(f) * .86 + d * (.17 + Math.abs(Math.sin(f)) * .13)];
  const wr = smooth(.5 + .5 * Math.sin(t * .105 - .5));
  const we = smooth(.5 + .5 * Math.sin(t * .074 + 1.3)) * .72;
  return ring.map((v, i) => mix(mix(ribbon[i], exchange[i], we), v, wr) + [Math.sin(angle * 3 + d * 1.6 - t * .19) * .035, Math.sin(angle * 2 + a * 2.1 + t * .14) * .028, Math.cos(angle * 4 + a * .9 - t * .17) * .055][i]);
}
export const formationGLSL = `
vec3 formation(vec4 seed, float seconds, float thickness) {
  float t = 43.8 + seconds * 0.04;
  float angle = seed.x * 6.28318530718 + t * (0.151 + seed.w * 0.025);
  float a = seed.y * thickness, d = seed.z * thickness, pulse = t * 0.14;
  float crossSection = 0.1 + 0.15 * pow(abs(sin(angle * 1.5 + pulse)), 1.6);
  float filament = 0.022 * sin(angle * 5.0 + d * 4.0 - t * 0.36);
  float envelope = 0.79 + 0.21 * cos(angle * 2.0);
  float f = angle + 0.2 * sin(angle * 2.0 + pulse);
  vec3 ring = vec3(cos(angle)*(1.03+0.1*sin(angle*2.0-pulse)+a*crossSection), sin(angle)*0.42+0.085*sin(angle*2.0+pulse)+a*crossSection*0.74+filament, sin(angle+pulse*0.65)*0.76+d*crossSection*1.72);
  vec3 ribbon = vec3(1.34*sin(angle)+a*cos(angle)*0.09, sin(angle*2.0+pulse)*0.27+sin(angle*3.0-pulse*0.6)*0.08+a*envelope*0.22+filament, cos(angle)*0.72+sin(angle*2.0-pulse*0.7)*0.12+d*envelope*0.43);
  vec3 exchange = vec3(sin(f)*1.08+a*cos(f)*0.14, sin(f*2.0)*0.31+a*0.17+filament, cos(f)*0.86+d*(0.17+abs(sin(f))*0.13));
  float wr = smoothstep(0.0, 1.0, 0.5+0.5*sin(t*0.105-0.5));
  float we = smoothstep(0.0, 1.0, 0.5+0.5*sin(t*0.074+1.3))*0.72;
  return mix(mix(ribbon, exchange, we), ring, wr) + vec3(sin(angle*3.0+d*1.6-t*0.19)*0.035, sin(angle*2.0+a*2.1+t*0.14)*0.028, cos(angle*4.0+a*0.9-t*0.17)*0.055);
}`;
