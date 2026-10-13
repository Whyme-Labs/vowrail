import React from 'react';
import {useCurrentFrame,useVideoConfig} from 'remotion';
import {Stage,Heading,Note,Tag,UiPanel,palette,rise} from '../Design';

export function Review(){const f=useCurrentFrame();const {fps}=useVideoConfig();return <Stage id="review">
  <Heading size={108}>Advice helps.<br/>You choose.</Heading>
  <div style={{position:'absolute',left:110,top:500,fontSize:79,fontWeight:700,...rise(f,22)}}>USD 207</div>
  <div style={{position:'absolute',left:113,top:598,fontSize:33,color:palette.muted,...rise(f,30)}}>Stored Atlas quote · two-day estimate</div>
  <Tag y={677}>Price · delivery estimate · expiry</Tag>
  <Note top={785}>Tax, refund terms and delivery<br/>still require buyer review.</Note>
  <UiPanel image="explicit-review.png"/>
  <div style={{position:'absolute',left:1320,top:818,padding:'10px 18px',fontSize:23,borderRadius:6,background:palette.forest,color:palette.paper,opacity:f>12*fps?1:0}}>Creation ≠ approval ≠ capture</div>
</Stage>}
