import React from 'react';
import {interpolate,useCurrentFrame,useVideoConfig} from 'remotion';
import {Stage,palette,rise,clamp} from '../Design';

export function Recovery(){const f=useCurrentFrame();const {fps}=useVideoConfig();return <Stage id="recovery">
  <div data-key-text style={{position:'absolute',left:100,top:235,fontSize:101,fontWeight:700,letterSpacing:-4,...rise(f)}}>Check without paying again.</div>
  <div style={{position:'absolute',left:170,top:482,height:4,width:1510,background:palette.line}}><div style={{height:4,width:1510,background:palette.forest,transformOrigin:'left',transform:`scaleX(${interpolate(f,[fps,5*fps],[0,1],clamp)})`}}/></div>
  {[['Restart','Restore the stored receipt'],['Verify','Match the locked purchase'],['Read only','No capture call in recovery']].map(([title,body],i)=><div key={title} style={{position:'absolute',left:100+i*584,top:421,width:548,height:312,boxSizing:'border-box',padding:36,border:`1px solid ${palette.line}`,borderRadius:18,background:i===2?palette.forest:'#fffef7',color:i===2?palette.paper:palette.ink,...rise(f,18+i*20)}}>
    <div style={{fontSize:25,opacity:.6}}>0{i+1}</div><div style={{fontSize:56,fontWeight:700,marginTop:24}}>{title}</div><div style={{fontSize:30,lineHeight:1.3,marginTop:22}}>{body}</div>
  </div>)}
  <div style={{position:'absolute',left:104,top:786,fontSize:29,lineHeight:1.5,color:palette.muted}}>Lost-response handling: simulated tests.<br/>Earlier actual Sandbox observation: completed receipt restored after restart and expiry.</div>
</Stage>}
