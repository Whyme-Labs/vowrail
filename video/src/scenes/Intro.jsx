import React from 'react';
import {interpolate,useCurrentFrame,useVideoConfig} from 'remotion';
import {Stage,palette,rise,clamp} from '../Design';

export function Intro(){const f=useCurrentFrame();const {fps}=useVideoConfig();return <Stage id="intro" dark>
  <div data-key-text style={{position:'absolute',left:100,top:255,fontSize:190,fontWeight:700,letterSpacing:-8,...rise(f)}}>Vowrail.</div>
  <div style={{position:'absolute',left:110,top:505,width:1670,height:5,background:'#34594a'}}><div style={{height:5,background:palette.lime,width:1670,transformOrigin:'left',transform:`scaleX(${interpolate(f,[15,2*fps],[0,1],clamp)})`}}/></div>
  <div data-key-text style={{position:'absolute',left:109,top:563,fontSize:67,lineHeight:1.25,...rise(f,25)}}>AI proposes.<br/><span style={{color:palette.lime}}>The gateway enforces.</span></div>
  <div style={{position:'absolute',right:116,top:650,fontSize:31,color:'#c1d3bd',textAlign:'right',...rise(f,44)}}>Explicit permission<br/>A checkable outcome</div>
</Stage>}
