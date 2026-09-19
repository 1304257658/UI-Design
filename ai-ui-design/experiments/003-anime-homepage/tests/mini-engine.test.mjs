import test from 'node:test';
import assert from 'node:assert/strict';
import {Timeline} from '../src/mini-engine.js';
function fixture(){
  let id=0;const jobs=new Map();const frames=[];
  const timeline=new Timeline({duration:1000,tracks:[{key:'x',start:200,end:800,from:10,to:70}],render:(v,t)=>frames.push({v,t}),request:cb=>{jobs.set(++id,cb);return id;},cancel:n=>jobs.delete(n)});
  const tick=now=>{const ready=[...jobs.values()];jobs.clear();ready.forEach(cb=>cb(now));};
  return {timeline,jobs,frames,tick};
}
test('seek is independent of visit order, clamps time, and preserves endpoints',()=>{const {timeline:t}=fixture();t.seek(500);assert.equal(t.sample(t.time).x,40);t.seek(999).seek(0).seek(500);assert.equal(t.sample(t.time).x,40);t.seek(-50);assert.equal(t.time,0);assert.equal(t.sample(0).x,10);t.seek(5000);assert.equal(t.time,1000);assert.equal(t.sample(1000).x,70);});
test('one scheduled frame even after duplicate play; pause cancels it',()=>{const {timeline:t,jobs,tick}=fixture();t.play().play();assert.equal(jobs.size,1);tick(0);tick(250);assert.equal(t.time,250);t.pause();assert.equal(jobs.size,0);tick(900);assert.equal(t.time,250);});
test('reversing and changing speed do not reuse stale frame deltas',()=>{const {timeline:t,tick,jobs}=fixture();t.seek(700).setSpeed(-2).play();tick(500);tick(600);assert.equal(t.time,500);t.setSpeed(1);tick(700);assert.equal(t.time,500);tick(1200);assert.equal(t.time,1000);assert.equal(t.playing,false);assert.equal(jobs.size,0);});
test('manual seek during playback rebases clock and reverse stops at zero',()=>{const {timeline:t,tick}=fixture();t.play();tick(0);tick(100);t.seek(200);tick(500);assert.equal(t.time,200);t.setSpeed(-1);tick(600);tick(1000);assert.equal(t.time,0);assert.equal(t.playing,false);});
test('frame partitioning gives the same result for time-based interpolation',()=>{const a=fixture(),b=fixture();a.timeline.play();b.timeline.play();[0,100,200,300,400,500].forEach(a.tick);[0,250,500].forEach(b.tick);assert.deepEqual(a.timeline.sample(a.timeline.time),b.timeline.sample(b.timeline.time));});
test('invalid state is rejected and dispose cancels future writes',()=>{const {timeline:t,jobs,frames,tick}=fixture();assert.throws(()=>t.seek(NaN),RangeError);assert.throws(()=>t.setSpeed(0),RangeError);assert.throws(()=>new Timeline({duration:0,tracks:[]}),RangeError);t.play();t.dispose();const n=frames.length;tick(200);t.play().seek(500);assert.equal(jobs.size,0);assert.equal(frames.length,n);});
