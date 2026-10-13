import React from 'react';
import {interpolate,useCurrentFrame,useVideoConfig} from 'remotion';
import {Stage,Heading,Note,Tag,UiPanel,palette,clamp} from '../Design';

export function Expiry(){const f=useCurrentFrame();const {fps}=useVideoConfig();const remaining=interpolate(f,[0,4*fps],[1,0],clamp);return <Stage id="expiry">
  <Heading size={107}>Permission<br/>has a lifetime.</Heading>
  <div style={{position:'absolute',left:120,top:515,width:570,height:15,borderRadius:10,background:'#d9ddd1',overflow:'hidden'}}><div style={{height:15,width:570,background:palette.red,transformOrigin:'left',transform:`scaleX(${remaining})`}}/></div>
  <div style={{position:'absolute',left:123,top:542,fontSize:22,color:palette.muted}}>Illustrated lifetime → expiry</div>
  <Tag y={584}>Expired quote → checkout disabled</Tag>
  <Tag y={670}>Expired mandate → no new capture</Tag>
  <Note top={801}>Completed status can still be read.</Note>
  <UiPanel image="expiry-replay.png" focus="expiry"/>
</Stage>}
