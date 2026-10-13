import React from 'react';
import {useCurrentFrame,useVideoConfig} from 'remotion';
import {Stage,Heading,Note,palette,rise} from '../Design';

export function Sandbox(){const f=useCurrentFrame();const {fps}=useVideoConfig();return <Stage id="sandbox" dark>
  <Heading dark size={101}>One Sandbox<br/>purchase.<br/>A matched result.</Heading>
  <Note dark top={748}>Earlier authorized run.<br/>Separate from all model cases.</Note>
  <div style={{position:'absolute',left:1014,top:253,width:770,height:530,borderRadius:20,background:palette.paper,color:palette.ink,padding:47,boxSizing:'border-box',...rise(f,14)}}>
    <div style={{fontSize:28,letterSpacing:3}}>HISTORICAL TEXT SUMMARY</div>
    <div style={{fontSize:155,fontWeight:700,letterSpacing:-5,marginTop:33}}><span style={{fontSize:36,letterSpacing:0,marginRight:19}}>USD</span>207</div>
    <div style={{fontSize:33,color:palette.muted,marginTop:20}}>One completed capture observed</div>
    <div style={{borderTop:`1px solid ${palette.line}`,marginTop:37,paddingTop:24,display:'flex',gap:18}}>{['Amount','Currency','Reference'].map((v,i)=><span key={v} style={{fontSize:25,fontWeight:700,...rise(f,2*fps+i*8)}}>✓ {v}</span>)}</div>
  </div>
  <div style={{position:'absolute',left:1020,top:822,fontSize:23,color:'#c1d3bd',maxWidth:785}}>No receipt image or private references. Synthetic Atlas was not the Sandbox payee.</div>
</Stage>}
