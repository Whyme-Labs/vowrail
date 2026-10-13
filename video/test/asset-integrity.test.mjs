import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {validateAssets} from '../validate-assets.mjs';

function fixture() {
  const directory=mkdtempSync(join(tmpdir(),'vowrail-video-assets-'));const publicDir=join(directory,'public');
  // Separate public directory prevents the source observation from entering the bundle.
  const source=join(directory,'observation.json');
    mkdirSync(publicDir);
    const files=['app-interactions.webm','explicit-review.png','expiry-replay.png'].map((file,i)=>{
      const bytes=Buffer.from('synthetic pixels '+i);writeFileSync(join(publicDir,file),bytes);
      return{file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
    });
    writeFileSync(join(publicDir,'asset-manifest.json'),JSON.stringify({files}));
    writeFileSync(join(publicDir,'model-text.json'),JSON.stringify({delivery:{reason:'synthetic delivery'},ambiguity:{reason:'synthetic ambiguity'}}));
    writeFileSync(source,JSON.stringify({cases:[{scenario:'delivery-preference',advice:{mode:'ai_advisory',reason:'synthetic delivery'}},{scenario:'ambiguous-request',advice:{mode:'ai_advisory',reason:'synthetic ambiguity'}}]}));
    return {directory,publicDir,source,close:()=>rmSync(directory,{recursive:true,force:true})};
}

test('unchanged allowlisted media and exact historical text have a stable fingerprint',()=>{
  const f=fixture();try{assert.equal(validateAssets(f.publicDir,f.source),validateAssets(f.publicDir,f.source));}finally{f.close();}
});
test('a changed ignored media file cannot reuse a stale manifest',()=>{
  const f=fixture();try{writeFileSync(join(f.publicDir,'explicit-review.png'),'different synthetic pixels');assert.throws(()=>validateAssets(f.publicDir,f.source),/Retained media changed/);}finally{f.close();}
});
test('unreviewed public files and altered historical explanations are rejected',()=>{
  const f=fixture();try{
    writeFileSync(join(f.publicDir,'model-text.json'),JSON.stringify({delivery:{reason:'invented result'},ambiguity:{reason:'synthetic ambiguity'}}));
    assert.throws(()=>validateAssets(f.publicDir,f.source),/committed observation/);
    writeFileSync(join(f.publicDir,'unreviewed.txt'),'synthetic private placeholder');
    assert.throws(()=>validateAssets(f.publicDir,f.source),/allowlist/);
  }finally{f.close();}
});
test('short-film audio is required and changed audio cannot retain its fingerprint',()=>{
  const f=fixture();try{
    assert.throws(()=>validateAssets(f.publicDir,f.source,true),/requires the supplied audio/);
    const audio=Buffer.from('synthetic soundtrack');const path=join(f.publicDir,'supplied-audio.m4a');writeFileSync(path,audio);
    const manifest=JSON.parse(readFileSync(join(f.publicDir,'asset-manifest.json')));
    manifest.files.push({file:'supplied-audio.m4a',bytes:audio.length,sha256:createHash('sha256').update(audio).digest('hex')});
    writeFileSync(join(f.publicDir,'asset-manifest.json'),JSON.stringify(manifest));
    const original=validateAssets(f.publicDir,f.source,true);assert.ok(original);
    writeFileSync(path,'changed soundtrack');assert.throws(()=>validateAssets(f.publicDir,f.source,true),/Retained media changed/);
  }finally{f.close();}
});
