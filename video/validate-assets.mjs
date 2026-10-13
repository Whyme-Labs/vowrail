import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const media=['app-interactions.webm','explicit-review.png','expiry-replay.png'];
const allowed=[...media,'asset-manifest.json','model-text.json'].sort();
const digest=value=>createHash('sha256').update(value).digest('hex');

export function validateAssets(directory,qualificationPath) {
  if(JSON.stringify(readdirSync(directory).sort())!==JSON.stringify(allowed))throw Error('Only the reviewed public asset allowlist may be bundled.');
  const manifestBytes=readFileSync(join(directory,'asset-manifest.json'));
  const manifest=JSON.parse(manifestBytes);
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
