import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sections,captions,FPS,DURATION_SECONDS} from './src/short-story.mjs';
import {validateAssets} from './validate-assets.mjs';
assert.equal(sections.length,9);assert.equal(sections[0].start,0);assert.equal(sections[1].id,'intro');assert.equal(sections[1].start,6);
for(let i=0;i<sections.length;i++){assert.ok(sections[i].seconds>0);if(i)assert.equal(sections[i].start,sections[i-1].start+sections[i-1].seconds);}
assert.equal(sections.at(-1).start+sections.at(-1).seconds,DURATION_SECONDS);
for(let i=0;i<captions.length;i++){const c=captions[i];if(i)assert.equal(c.startMs,captions[i-1].endMs);assert.ok(c.endMs>c.startMs);assert.ok(c.text.split(/\s+/).length/((c.endMs-c.startMs)/1000)<=3);}
assert.equal(captions[0].startMs,0);assert.equal(captions.at(-1).endMs,90000);
for(const phrase of ['private ceiling','buyer approval and capture','synthetic expiry replay','earlier separate Sandbox','not the configured payee','without another capture','remain unverified','separate runs','Private review'])assert.ok(captions.some(c=>c.text.includes(phrase)),phrase);
const assetFingerprint=validateAssets(new URL('public/',import.meta.url).pathname,new URL('../docs/demo-assets/openrouter-free-qualification.json',import.meta.url).pathname,true);
const manifest=JSON.parse(readFileSync(new URL('public/asset-manifest.json',import.meta.url)));
assert.equal(manifest.audio.seconds,DURATION_SECONDS);assert.ok(manifest.audio.loops>1);assert.equal(manifest.audio.crossfadeSeconds,.5);
console.log(JSON.stringify({result:'PASS',seconds:DURATION_SECONDS,fps:FPS,frames:DURATION_SECONDS*FPS,scenes:sections.length,captionCues:captions.length,maxCaptionWordsPerSecond:3,vowrailAppearsAtSeconds:6,assetFingerprint}));
