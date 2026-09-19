import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, DepthOfFieldEffect } from 'postprocessing';
import { sample } from './formation.js';
import * as shaders from './shaders.js';
import './style.css';

const $ = id => document.getElementById(id);
const stage = $('stage');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = () => stage.clientWidth < 704;
const COUNT = 32000;
const MAX_MESSAGES = 3;
const SEGMENTS = 64;
let time = 0, last = performance.now(), speed = 1, paused = reducedMotion.matches;
let nextSend = 1.5, randomState = 7448248, count = COUNT;
let visible = true, contextLost = false;
const rand = () => ((randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0) / 4294967296);
const seeds = new Float32Array(COUNT * 4);
const infected = new Float32Array(COUNT).fill(1e10);
for (let i = 0; i < COUNT; i++) {
  const a = rand(), b = rand(), c = rand(), d = rand();
  seeds.set([(i * .61803398875) % 1, (a + b + c - 1.5) * 1.13, (b + c + d - 1.5) * 1.08, rand()], i * 4);
}
const scene = new THREE.Scene();
scene.background = new THREE.Color(0);
const camera = new THREE.PerspectiveCamera(39, 1, .04, 45);
camera.position.z = 8;
const group = new THREE.Group();
scene.add(group);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
} catch {
  $('fallback').hidden = false;
  $('state').textContent = 'WEBGL UNAVAILABLE';
  document.querySelectorAll('.console input,.console button').forEach(el => el.disabled = true);
  throw new Error('WebGL unavailable; fallback displayed.');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.toneMapping = THREE.NoToneMapping;
stage.append(renderer.domElement);
renderer.domElement.addEventListener('webglcontextlost', e => {
  e.preventDefault(); contextLost = true; $('fallback').hidden = false;
  $('fallback').textContent = '图形上下文已中断，请刷新页面恢复。';
  $('state').textContent = 'RELOAD TO RECOVER';
});
const cloudGeometry = new THREE.BufferGeometry();
cloudGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
cloudGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
cloudGeometry.setAttribute('aInfected', new THREE.BufferAttribute(infected, 1));
const cloudUniforms = { uTime: { value: 0 }, uDpr: { value: renderer.getPixelRatio() }, uThickness: { value: 1 }, uReveal: { value: reducedMotion.matches ? 1 : 0 } };
const cloudMaterial = new THREE.ShaderMaterial({ uniforms: cloudUniforms, vertexShader: shaders.cloudVertex, fragmentShader: shaders.cloudFragment, transparent: true, depthWrite: true, toneMapped: false });
const cloud = new THREE.Points(cloudGeometry, cloudMaterial);
cloud.frustumCulled = false;
group.add(cloud);

// Screen-space triangle strips: stable line width on desktop and high-DPI mobile.
const strip = new THREE.BufferGeometry();
const along = [], side = [], indices = [];
for (let i = 0; i <= SEGMENTS; i++) {
  along.push(i / SEGMENTS, i / SEGMENTS); side.push(-1, 1);
  if (i < SEGMENTS) { const v = i * 2; indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3); }
}
strip.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(along.length * 3), 3));
strip.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
strip.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
strip.setIndex(indices);
const messages = [];
for (let i = 0; i < MAX_MESSAGES; i++) {
  const uniforms = { uFrom: { value: new THREE.Vector3() }, uTo: { value: new THREE.Vector3() }, uResolution: { value: new THREE.Vector2() }, uHead: { value: 0 }, uBend: { value: .4 }, uOpacity: { value: 0 }, uFade: { value: 0 } };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: shaders.arcVertex, fragmentShader: shaders.arcFragment, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(strip, material);
  mesh.frustumCulled = false; mesh.renderOrder = 1; mesh.visible = false;
  group.add(mesh);
  messages.push({ mesh, uniforms, active: false, generation: 0 });
}
const nodeGeometry = new THREE.BufferGeometry();
const nodePositions = new Float32Array(MAX_MESSAGES * 2 * 3);
const nodeAges = new Float32Array(MAX_MESSAGES * 2);
const nodeStrengths = new Float32Array(MAX_MESSAGES * 2);
nodeGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3).setUsage(THREE.DynamicDrawUsage));
nodeGeometry.setAttribute('aAge', new THREE.BufferAttribute(nodeAges, 1).setUsage(THREE.DynamicDrawUsage));
nodeGeometry.setAttribute('aStrength', new THREE.BufferAttribute(nodeStrengths, 1).setUsage(THREE.DynamicDrawUsage));
const nodeMaterial = new THREE.ShaderMaterial({ uniforms: { uDpr: { value: renderer.getPixelRatio() } }, vertexShader: shaders.nodesVertex, fragmentShader: shaders.nodesFragment, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
const nodes = new THREE.Points(nodeGeometry, nodeMaterial);
nodes.frustumCulled = false; nodes.renderOrder = 2;
group.add(nodes);

const composer = new EffectComposer(renderer, { multisampling: 0 });
composer.addPass(new RenderPass(scene, camera));
const dof = new DepthOfFieldEffect(camera, { bokehScale: .9, focalLength: .055, worldFocusRange: 2.2, resolutionScale: .75 });
dof.target = new THREE.Vector3(0, 0, .3);
const effectPass = new EffectPass(camera, dof);
composer.addPass(effectPass);

const getSeed = i => seeds.subarray(i * 4, i * 4 + 4);
const pointAt = i => sample(getSeed(i), time, cloudUniforms.uThickness.value);
function launch(sender = null, generation = 0) {
  const message = messages.find(m => !m.active);
  if (!message) return false;
  let from = sender, p;
  if (from === null) {
    for (let i = 0; i < 80; i++) { from = Math.floor(rand() * count); p = pointAt(from); if (Math.abs(p[0]) > .5 && Math.abs(p[2]) > .2) break; }
  }
  p = pointAt(from);
  let to = 0, best = -Infinity;
  for (let i = 0; i < 100; i++) {
    const candidate = Math.floor(rand() * count), q = pointAt(candidate);
    // Prefer opposite sides of the formation. A seeded scheduler makes replay stable.
    const score = -p[0] * q[0] - p[2] * q[2] - .5 * Math.abs(p[1] + q[1]) - (infected[candidate] < time ? .5 : 0);
    if (candidate !== from && score > best) { best = score; to = candidate; }
  }
  Object.assign(message, { active: true, from, to, born: time, travel: 1.5 + rand() * .6, generation, relayed: false });
  message.uniforms.uBend.value = (rand() < .5 ? 1 : -1) * (.3 + rand() * .18);
  infected[from] = Math.min(infected[from], time);
  infected[to] = Math.min(infected[to], time + message.travel);
  cloudGeometry.attributes.aInfected.needsUpdate = true;
  return true;
}
const relayQueue = [];
function updateMessages() {
  if (time >= nextSend) { if (launch()) nextSend = time + 2.9 + rand() * .8; }
  if (relayQueue.length && relayQueue[0].at <= time) { const pending = relayQueue[0]; if (launch(pending.from, pending.generation)) relayQueue.shift(); }
  nodeStrengths.fill(0);
  for (let slot = 0; slot < messages.length; slot++) {
    const m = messages[slot];
    if (!m.active) continue;
    const age = time - m.born;
    if (age > m.travel + 1.5) { m.active = false; m.mesh.visible = false; continue; }
    m.mesh.visible = $('lines').checked;
    const start = pointAt(m.from), end = pointAt(m.to);
    m.uniforms.uFrom.value.fromArray(start); m.uniforms.uTo.value.fromArray(end);
    m.uniforms.uHead.value = Math.sin(Math.min(age / m.travel, 1) * .73) / Math.sin(.73);
    m.uniforms.uOpacity.value = .36 * Math.min(age / .08, 1);
    m.uniforms.uFade.value = Math.max(0, (age - m.travel) / 1.5);
    nodePositions.set(start, slot * 6); nodePositions.set(end, slot * 6 + 3);
    nodeAges[slot * 2] = age; nodeAges[slot * 2 + 1] = age - m.travel;
    nodeStrengths[slot * 2] = Math.max(0, 1 - age / 1.7) * .65;
    nodeStrengths[slot * 2 + 1] = age >= m.travel ? Math.max(0, 1 - (age - m.travel) / 1.4) * .65 : 0;
    if (age >= m.travel && !m.relayed) {
      m.relayed = true;
      if (m.generation < 3) relayQueue.push({ from: m.to, generation: m.generation + 1, at: time + .08 });
    }
  }
  for (const attr of Object.values(nodeGeometry.attributes)) attr.needsUpdate = true;
}
function resize() {
  const width = stage.clientWidth, height = stage.clientHeight;
  camera.aspect = width / height;
  camera.rotation.set(0, 0, mobile() ? .5 : 0);
  camera.updateProjectionMatrix();
  const viewHeight = 16 * Math.tan(THREE.MathUtils.degToRad(39) / 2);
  const scale = mobile() ? Math.min(1.65, viewHeight * camera.aspect * .34) : Math.min(3.1, viewHeight * camera.aspect * .34);
  group.scale.setScalar(scale);
  cloudUniforms.uThickness.value = mobile() ? .65 : 1;
  const nextCount = mobile() ? 12000 : COUNT;
  if (nextCount !== count) {
    messages.forEach(m => { m.active = false; m.mesh.visible = false; });
    relayQueue.length = 0;
    nodeStrengths.fill(0); nodeGeometry.attributes.aStrength.needsUpdate = true;
    nextSend = time + .5;
  }
  count = nextCount;
  cloudGeometry.setDrawRange(0, count);
  renderer.setSize(width, height);
  composer.setSize(width, height);
  messages.forEach(m => m.uniforms.uResolution.value.set(width, height));
  $('metrics').textContent = `${count.toLocaleString('en-US')} PARTICLES`;
  render();
}
function render() {
  if (contextLost) return;
  cloudUniforms.uTime.value = time;
  cloud.visible = $('particles').checked;
  nodes.visible = $('lines').checked;
  messages.forEach(m => m.mesh.visible = m.active && $('lines').checked);
  if ($('dof').checked) composer.render(); else renderer.render(scene, camera);
}
function syncPlayback() {
  $('pause').textContent = paused ? '播放' : '暂停';
  $('pause').setAttribute('aria-pressed', String(paused));
  $('state').textContent = paused ? 'PAUSED' : 'LIVE SIMULATION';
}
$('pause').addEventListener('click', () => { paused = !paused; syncPlayback(); });
$('restart').addEventListener('click', () => {
  time = 0; nextSend = 1.5; randomState = 7448248; relayQueue.length = 0;
  infected.fill(1e10); cloudGeometry.attributes.aInfected.needsUpdate = true;
  messages.forEach(m => { m.active = false; m.mesh.visible = false; });
  nodeStrengths.fill(0); nodeGeometry.attributes.aStrength.needsUpdate = true;
  cloudUniforms.uReveal.value = paused ? 1 : 0;
  render();
});
$('speed').addEventListener('input', e => { speed = Number(e.target.value); $('speed-value').textContent = `${speed.toFixed(2)}×`; });
for (const id of ['particles', 'lines', 'dof']) $(id).addEventListener('change', render);
reducedMotion.addEventListener('change', e => { if (e.matches) { paused = true; cloudUniforms.uReveal.value = 1; syncPlayback(); render(); } });
document.addEventListener('visibilitychange', () => { last = performance.now(); });
new IntersectionObserver(entries => { visible = entries[0].isIntersecting; last = performance.now(); }, { rootMargin: '80px' }).observe(stage);
new ResizeObserver(resize).observe(stage);
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min((now - last) / 1000, .05); last = now;
  if (paused || document.hidden || !visible || contextLost) return;
  time += dt * speed;
  cloudUniforms.uReveal.value = Math.min(1, time / 3);
  updateMessages();
  render();
}
syncPlayback(); resize(); requestAnimationFrame(tick);
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  composer.dispose(); renderer.dispose(); cloudGeometry.dispose(); cloudMaterial.dispose();
  strip.dispose(); nodeGeometry.dispose(); nodeMaterial.dispose(); messages.forEach(m => m.mesh.material.dispose());
});
