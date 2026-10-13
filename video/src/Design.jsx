import React from 'react';
import {AbsoluteFill,CanvasImage,Easing,interpolate,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {Video} from '@remotion/media';
import {captions,sections} from './story.mjs';

export const palette={forest:'#10392e',paper:'#f4f4e9',lime:'#d9ea86',ink:'#16382f',muted:'#617166',red:'#a54730',line:'#c9d3c6'};
export const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.bezier(.16,1,.3,1)};
export const rise=(frame,delay=0)=>({opacity:interpolate(frame,[delay,delay+20],[0,1],clamp),transform:`translateY(${interpolate(frame,[delay,delay+24],[24,0],clamp)}px)`});

export function Stage({id,dark=false,children}) {
  const f=useCurrentFrame();const {fps}=useVideoConfig();const section=sections.find(s=>s.id===id);
  const ms=(section.start+f/fps)*1000;
  const cue=captions.find(c=>c.scene===id&&ms>=c.startMs&&ms<c.endMs)??captions.filter(c=>c.scene===id).at(-1);
  const fg=dark?palette.paper:palette.ink;const bg=dark?palette.forest:palette.paper;
  return <AbsoluteFill data-scene={id} style={{background:bg,color:fg,fontFamily:'Arial, sans-serif',overflow:'hidden'}}>
    <div style={{position:'absolute',left:96,right:96,top:66,display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:26,fontWeight:700}}>
      <span style={{letterSpacing:3}}>VOWRAIL<span style={{fontSize:18,letterSpacing:1,fontWeight:400,marginLeft:28,opacity:.7}}>PRIVATE REVIEW</span></span>
      <span data-provenance style={{fontSize:22,fontWeight:400,opacity:.85,maxWidth:1050,textAlign:'right'}}>{section.label}</span>
    </div>
    <div style={{position:'absolute',left:96,right:96,top:128,height:1,background:dark?'#527062':palette.line}}/>
    <div style={{position:'absolute',left:100,top:164,fontSize:21,letterSpacing:2,opacity:.72,textTransform:'uppercase'}}>{String(sections.indexOf(section)+1).padStart(2,'0')} / {section.title}</div>
    {children}
    <div style={{position:'absolute',left:96,right:96,bottom:51,height:112,borderTop:`1px solid ${dark?'#527062':palette.line}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div data-caption style={{fontSize:32,lineHeight:1.35,textAlign:'center',maxWidth:1590,paddingTop:16}}>{cue?.text}</div>
    </div>
    <div style={{position:'absolute',bottom:27,left:96,right:96,height:3,background:dark?'#345447':'#dce1d4'}}>
      <div style={{height:3,background:dark?palette.lime:palette.forest,width:`${Math.min(100,(section.start+f/fps)/165*100)}%`}}/>
    </div>
  </AbsoluteFill>;
}

export function Heading({children,dark=false,size=102,width=800,top=224,delay=0}) {
  const f=useCurrentFrame();return <div data-key-text style={{position:'absolute',left:100,top,width,fontSize:size,fontWeight:700,lineHeight:1.05,letterSpacing:-4,color:dark?palette.paper:palette.ink,...rise(f,delay)}}>{children}</div>;
}
export function Note({children,top=752,width=760,dark=false}) {
  const f=useCurrentFrame();return <div data-key-text style={{position:'absolute',left:104,top,width,fontSize:30,lineHeight:1.35,color:dark?'#c1d3bd':palette.muted,...rise(f,34)}}>{children}</div>;
}

// The camera transforms the existing image/recording; it never changes UI data.
export function UiPanel({image,clip,focus='review'}) {
  const f=useCurrentFrame();const {fps}=useVideoConfig();
  const zoom=interpolate(f,[0,3*fps,14*fps],[1,1.55,1.64],clamp);
  const review=focus==='review';const left=review||focus==='expiry'?-630:focus==='mandate'?-35:-610;const top=focus==='expiry'?-400:review?-328:focus==='mandate'?-295:-240;
  const progress=interpolate(f,[0,3*fps],[0,1],clamp);
  const style={width:1000,height:625,position:'absolute',left:left*progress,top:top*progress,transform:`scale(${zoom})`,transformOrigin:'0 0'};
  return <div data-media-panel style={{position:'absolute',left:914,top:226,width:906,height:636,borderRadius:22,overflow:'hidden',background:'white',boxShadow:'0 22px 50px #173a2e22',border:'1px solid #cad4c7',...rise(f,14)}}>
    {clip?<Video name="Recorded local app" src={staticFile('app-interactions.webm')} premountFor={fps} trimBefore={clip.start*fps} playbackRate={clip.rate} muted style={style} objectFit="fill"/>:<CanvasImage src={staticFile(image)} style={style}/>}
  </div>;
}

export function Tag({children,x=104,y=690,dark=false,delay=24}) {
  const f=useCurrentFrame();return <div data-key-text style={{position:'absolute',left:x,top:y,border:`1px solid ${dark?'#6b8872':palette.line}`,borderRadius:100,padding:'16px 24px',fontSize:27,color:dark?palette.lime:palette.ink,...rise(f,delay)}}>{children}</div>;
}
