import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const baseMedia=['app-interactions.webm','explicit-review.png','expiry-replay.png'];
const digest=value=>createHash('sha256').update(value).digest('hex');

export function validateAssets(directory,qualificationPath,requireAudio=false) {
  const manifestBytes=readFileSync(join(directory,'asset-manifest.json'));
  const manifest=JSON.parse(manifestBytes);
  const hasAudio=manifest.files.some(f=>f.file==='supplied-audio.m4a');
  if(requireAudio&&!hasAudio)throw Error('The short film requires the supplied audio.');
  const media=hasAudio?[...baseMedia,'supplied-audio.m4a']:baseMedia;
  const allowed=[...media,'asset-manifest.json','model-text.json'].sort();
  if(JSON.stringify(readdirSync(directory).sort())!==JSON.stringify(allowed))throw Error('Only the reviewed public asset allowlist may be bundled.');
  if(JSON.stringify(manifest.files.map(f=>f.file).sort())!==JSON.stringify(media.slice().sort()))throw Error('Asset manifest is incomplete or duplicated.');
  const actualHashes=[];
  for(const entry of manifest.files) {
    const bytes=readFileSync(join(directory,entry.file));const sha256=digest(bytes);
    if(sha256!==entry.sha256||bytes.length!==entry.bytes)throw Error('Retained media changed: '+entry.file);
    actualHashes.push(sha256);
  }
  const textBytes=readFileSync(join(directory,'model-text.json'));const text=JSON.parse(textBytes);
  const qualification=JSON.parse(readFileSync(qualificationPath));
  for(const [key,scenario] of [['delivery','delivery-preference'],['ambiguity','ambiguous-request']]) {
    const observed=qualification.cases.find(c=>c.scenario===scenario&&c.advice?.mode==='ai_advisory');
    if(!observed||text[key]?.reason!==observed.advice.reason)throw Error('Historical model text must match the committed observation.');
  }
  return digest(Buffer.concat([manifestBytes,textBytes,Buffer.from(actualHashes.join('\n'))]));
}
