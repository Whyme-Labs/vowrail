import React from 'react';
import {interpolate,useCurrentFrame,useVideoConfig} from 'remotion';
import {Stage,palette,rise,clamp} from '../Design';

export function Tradeoff(){const f=useCurrentFrame();const {fps}=useVideoConfig();return <Stage id="tradeoff">
  <div data-key-text style={{position:'absolute',left:100,top:236,fontSize:102,fontWeight:700,letterSpacing:-4,...rise(f)}}>Cheap can still be too late.</div>
  {[['Cobalt',201,4],['Birch',203,3],['Atlas',207,2]].map(([name,price,days],i)=><div key={name} style={{position:'absolute',left:100+i*583,top:404,width:552,height:414,boxSizing:'border-box',padding:40,borderRadius:18,background:i===0?'#eadccc':'#fffef7',border:`1px solid ${i===0?'#bd9b83':palette.line}`,...rise(f,18+i*7)}}>
    <div style={{position:'absolute',inset:-2,borderRadius:18,border:`3px solid ${i===0?palette.red:palette.forest}`,pointerEvents:'none',opacity:interpolate(f,[(4+i*4)*fps,(4+i*4+.4)*fps,(7+i*4)*fps,(7+i*4+.4)*fps],[0,1,1,0],clamp)}}/>
    <div style={{fontSize:35}}>{name}<span style={{fontSize:22,display:'block',opacity:.6,marginTop:8}}>SYNTHETIC QUOTE</span></div>
    <div style={{fontSize:98,fontWeight:700,marginTop:26,letterSpacing:-5}}><span style={{fontSize:30,letterSpacing:0,marginRight:13}}>USD</span>{price}</div>
    <div style={{fontSize:38,marginTop:22}}>{days}-day estimate</div>
    {i===0?<div style={{color:palette.red,fontSize:27,fontWeight:700,marginTop:23,...rise(f,4*fps)}}>AFTER THE EVENT</div>:<div style={{fontSize:26,color:palette.muted,marginTop:23}}>A price / timing tradeoff</div>}
  </div>)}
  <div style={{position:'absolute',left:100,top:862,fontSize:25,color:palette.muted}}>Illustrative three-day need · Delivery estimates are not binding.</div>
  <div style={{position:'absolute',left:100,top:364,width:1720,height:3,background:palette.line}}><div style={{height:3,width:1720,background:palette.forest,transformOrigin:'left',transform:`scaleX(${interpolate(f,[20,3*fps],[0,1],clamp)})`}}/></div>
</Stage>}
