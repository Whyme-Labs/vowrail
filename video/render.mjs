import './loopback.cjs';
import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderStill,renderMedia,makeCancelSignal} from '@remotion/renderer';
import {readFileSync,writeFileSync,mkdirSync,existsSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {validateAssets} from './validate-assets.mjs';
const here=fileURLToPath(new URL('.',import.meta.url));
const out=resolve(process.env.VOWRAIL_VIDEO_OUT??join(here,'renders'));mkdirSync(out,{recursive:true});
const browserExecutable=process.env.REMOTION_BROWSER_EXECUTABLE;
if(!browserExecutable)throw Error('Set REMOTION_BROWSER_EXECUTABLE to a verified local headless Chromium; no download is performed.');
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:here,encoding:'utf8'}).trim();
const sourceWorkingTreeDirty=Boolean(execFileSync('git',['status','--porcelain'],{cwd:here,encoding:'utf8'}).trim());
if(process.argv.includes('--render')&&sourceWorkingTreeDirty)throw Error('Commit the reviewed composition before the complete render.');
const assetFingerprint=validateAssets(join(here,'public'),join(here,'../docs/demo-assets/openrouter-free-qualification.json'));
const assertInputsStable=()=>{
  if(execFileSync('git',['rev-parse','HEAD'],{cwd:here,encoding:'utf8'}).trim()!==sourceCommit||execFileSync('git',['status','--porcelain'],{cwd:here,encoding:'utf8'}).trim())throw Error('Source changed during export; prior work is preserved.');
  if(validateAssets(join(here,'public'),join(here,'../docs/demo-assets/openrouter-free-qualification.json'))!==assetFingerprint)throw Error('Assets changed during export; prior work is preserved.');
};
const bundlePath=join(here,'.bundle');
// Always rebuild: a cached bundle cannot certify the current source revision.
const serveUrl=await bundle({entryPoint:join(here,'src/index.jsx'),outDir:bundlePath,publicDir:join(here,'public'),onProgress:p=>{if(p===100)console.log('Bundle ready');}});
const browser=await openBrowser('chrome',{browserExecutable,logLevel:'warn',chromiumOptions:{headless:true}});
const report={sourceCommit,sourceWorkingTreeDirty,assetFingerprint,remotionVersion:'4.0.535',width:1920,height:1080,fps:30,frames:4950,seconds:165,concurrency:1,encoderThreads:1,parallelEncoding:false,audio:'none; authored burned captions and VTT',externalProviderCalls:0,newPayments:0,foregroundAppsControlled:false,stills:[],chunks:[]};
const limitEncodingThreads=({args})=>[...args.slice(0,-1),'-threads','1',args.at(-1)];
try {
 const composition=await selectComposition({serveUrl,id:'Vowrail',puppeteerInstance:browser,timeoutInMilliseconds:20000,logLevel:'warn'});
 if(composition.durationInFrames!==4950||composition.fps!==30)throw Error('Composition timing changed');
 if(process.argv.includes('--stills')) {
   const custom=process.argv.find(a=>a.startsWith('--stamps='));
   const stamps=custom?custom.split('=')[1].split(',').map(Number):[2,10,18,27,35,43,52,61,69,80,87,95,103,113,119,127,134,140,147,155,162];
   if(!stamps.every(s=>Number.isFinite(s)&&s>=0&&s<165))throw Error('Preview frames must stay within the film.');
   for(const stamp of stamps){const frame=stamp*30;await renderStill({composition,serveUrl,puppeteerInstance:browser,frame,output:join(out,`frame-${stamp}.png`),imageFormat:'png',timeoutInMilliseconds:20000,logLevel:'warn'});report.stills.push({second:stamp,frame});console.log(`Preview ${stamp}s`);}
 }
 if(process.argv.includes('--benchmark')) {
   const start=Date.now();await renderMedia({composition,serveUrl,puppeteerInstance:browser,outputLocation:join(out,'benchmark-3s.mp4'),codec:'h264',frameRange:[0,89],concurrency:1,disallowParallelEncoding:true,muted:true,x264Preset:'veryfast',crf:20,timeoutInMilliseconds:20000,logLevel:'warn',ffmpegOverride:limitEncodingThreads});report.benchmark={frames:90,wallMs:Date.now()-start};console.log(JSON.stringify(report.benchmark));
 }
 if(process.argv.includes('--render')) {
   const chunks=join(out,'chunks');mkdirSync(chunks,{recursive:true});
   const limit=Number(process.env.VOWRAIL_CHUNK_FRAMES??450);
   if(!Number.isSafeInteger(limit)||limit<90||limit>900)throw Error('Bound chunks to 90–900 frames');
   const totalStarted=Date.now();
   const remainingBudget=()=>25*60*1000-(Date.now()-totalStarted);
   for(let start=0;start<4950;start+=limit){
     assertInputsStable();
     const end=Math.min(4949,start+limit-1);const file=join(chunks,`${String(start).padStart(5,'0')}.mp4`);
     const receipt=file+'.json';
     if(existsSync(file)){
       const saved=existsSync(receipt)?JSON.parse(readFileSync(receipt,'utf8')):null;
       const digest=createHash('sha256').update(readFileSync(file)).digest('hex');
       if(saved?.sourceCommit===sourceCommit&&saved?.assetFingerprint===assetFingerprint&&saved?.start===start&&saved?.end===end&&saved?.sha256===digest){console.log(`Preserved verified completed chunk ${start}-${end}`);report.chunks.push({...saved,file,reused:true});continue;}
       renameSync(file,file+'.preserved-'+Date.now());
     }
     if(remainingBudget()<=0)throw Error('Total render budget reached; completed chunks preserved');
     const cancellation=makeCancelSignal();const watchdog=setTimeout(()=>cancellation.cancel(),Math.min(180000,remainingBudget()));
     const begun=Date.now();let last=0;
     try {await renderMedia({composition,serveUrl,puppeteerInstance:browser,outputLocation:file,codec:'h264',frameRange:[start,end],concurrency:1,disallowParallelEncoding:true,cancelSignal:cancellation.cancelSignal,muted:true,x264Preset:'veryfast',crf:20,timeoutInMilliseconds:20000,logLevel:'warn',ffmpegOverride:limitEncodingThreads,onProgress:({renderedFrames})=>{if(renderedFrames>=last+90){last=renderedFrames;console.log(`Chunk ${start}-${end}: ${renderedFrames} frames`);}}});}
     finally{clearTimeout(watchdog);}
     assertInputsStable();
     const item={start,end,file,sourceCommit,assetFingerprint,wallMs:Date.now()-begun,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')};
     writeFileSync(receipt,JSON.stringify(item,null,2)+'\n');report.chunks.push(item);console.log(`Finished ${start}-${end}`);
     writeFileSync(join(out,'render-progress.json'),JSON.stringify(report,null,2)+'\n');
   }
   const list=join(out,'concat.txt');writeFileSync(list,report.chunks.map(c=>`file '${c.file.replaceAll("'","'\\''")}'`).join('\n')+'\n');
   if(remainingBudget()<=0)throw Error('Render budget reached; verified chunks preserved before concatenation');
   execFileSync('ffmpeg',['-v','error','-nostdin','-y','-f','concat','-safe','0','-i',list,'-map_metadata','-1','-c','copy','-movflags','+faststart',join(out,'vowrail-sanitized-review-2m45.mp4')],{timeout:Math.min(60000,remainingBudget())});
   report.renderWallMs=Date.now()-totalStarted;report.output=join(out,'vowrail-sanitized-review-2m45.mp4');
 }
 writeFileSync(join(out,'renderer-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({result:'PASS',sourceCommit,stills:report.stills.length,chunks:report.chunks.length,output:report.output,benchmark:report.benchmark}));
}finally{await browser.close({silent:true});}
