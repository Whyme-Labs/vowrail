import React from 'react';
import {interpolate,useCurrentFrame,useVideoConfig} from 'remotion';
import {Stage,palette,rise,clamp} from '../Design';

export function Opening(){const f=useCurrentFrame();const {fps}=useVideoConfig();return <Stage id="opening" dark>
  <div style={{position:'absolute',left:98,top:232,width:1040,fontSize:126,fontWeight:700,lineHeight:1.02,letterSpacing:-5}}>
    <div style={rise(f,0)}>AI can find</div><div style={rise(f,14)}>the offer.</div>
    <div style={{color:palette.lime,marginTop:28,...rise(f,40)}}>Who controls</div><div style={{color:palette.lime,...rise(f,54)}}>the purchase?</div>
  </div>
  <div style={{position:'absolute',left:1240,top:250,width:535,height:557,...rise(f,26)}}>
    <div style={{position:'absolute',inset:0,background:'#72855d',borderRadius:10,transform:`rotate(${interpolate(f,[0,12*fps],[-9,-6],clamp)}deg)`}}/>
    <div style={{position:'absolute',inset:0,background:palette.paper,borderRadius:10,transform:`rotate(${interpolate(f,[0,12*fps],[5,2],clamp)}deg)`,color:palette.ink,padding:48,boxSizing:'border-box'}}>
      <div style={{fontSize:26,letterSpacing:3}}>MY PRINT ORDER</div><div style={{fontSize:148,fontWeight:700,marginTop:34}}>100</div><div style={{fontSize:38}}>matte prints</div>
      <div style={{borderTop:`1px solid ${palette.line}`,marginTop:34,paddingTop:24,fontSize:36,lineHeight:1.5}}>Event in <b>3 days</b><br/>Limit <b>USD 220</b></div>
    </div>
  </div>
</Stage>}
