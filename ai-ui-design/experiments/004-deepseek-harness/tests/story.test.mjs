import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sample, chapters } from '../src/story.js';
test('replay and reverse seeking produce the same complete frame state',()=>{const expected=sample(.72);for(const p of [0,.95,.3,1,.72])sample(p);assert.deepEqual(sample(.72),expected);});
test('the opening and final panel are flat and the final response is complete',()=>{assert.equal(sample(0).open,0);assert.equal(sample(0).response,0);assert.equal(sample(1).open,0);assert.equal(sample(1).response,1);assert.equal(sample(1).reveal,0);});
test('architecture has a stable reading interval',()=>{assert.equal(sample(.48).reveal,1);assert.equal(sample(.57).reveal,1);assert.equal(sample(.48).open,sample(.57).open);});
test('invalid and out-of-range input remains finite and bounded',()=>{for(const p of [-3,2,NaN,Infinity]){const s=sample(p);for(const key of ['p','open','reveal','sent','response','returnFlow'])assert.ok(Number.isFinite(s[key])&&s[key]>=0&&s[key]<=1);}});
test('each chapter is reachable at its labelled progress',()=>{chapters.forEach((c,i)=>assert.equal(sample(c.at).chapter,i));});
