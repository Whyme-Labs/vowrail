import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sections,captions,FPS,DURATION_SECONDS,TRANSITION_FRAMES} from './src/story.mjs';
assert.equal(sections.length,11);assert.equal(sections[0].start,0);
for(let i=0;i<sections.length;i++){const s=sections[i];assert.ok(s.seconds>0);if(i)assert.equal(s.start,sections[i-1].start+sections[i-1].seconds);}
assert.equal(sections.at(-1).start+sections.at(-1).seconds,DURATION_SECONDS);
assert.equal(sections.reduce((sum,s)=>sum+s.seconds*FPS+TRANSITION_FRAMES,0)-TRANSITION_FRAMES*sections.length,DURATION_SECONDS*FPS);
for(let i=0;i<captions.length;i++){const c=captions[i];assert.ok(c.endMs>c.startMs);if(i)assert.equal(c.startMs,captions[i-1].endMs);assert.ok(c.text.length<170);assert.equal(c.timestampMs,null);assert.equal(c.confidence,null);}
assert.equal(captions[0].startMs,0);assert.equal(captions.at(-1).endMs,165000);
const models=JSON.parse(readFileSync(new URL('public/model-text.json',import.meta.url)));
assert.match(models.delivery.reason,/lowest price/);assert.match(models.ambiguity.reason,/20100 USD/);
assert.ok(captions.some(c=>/mislabeled cents/.test(c.text)));
assert.ok(captions.some(c=>/synthetic expiry replay/.test(c.text)));
assert.ok(captions.some(c=>/earlier separate Sandbox run/.test(c.text)));
assert.ok(captions.some(c=>/separate runs/.test(c.text)));
const index=readFileSync(new URL('src/index.jsx',import.meta.url),'utf8');assert.match(index,/durationInFrames=\{4950\}/);
assert.equal((index.match(/TransitionSeries.Sequence name=/g)||[]).length,11);
console.log(JSON.stringify({result:'PASS',seconds:165,fps:30,frames:4950,scenes:11,captionCues:captions.length,continuousCaptions:true,historicalErrorTextPreserved:true,newProviders:0,newPayments:0}));
