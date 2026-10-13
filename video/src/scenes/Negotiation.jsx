import React from 'react';
import {useCurrentFrame,useVideoConfig} from 'remotion';
import {Stage,Heading,Note,Tag,UiPanel,palette,rise} from '../Design';

export function Negotiation(){const f=useCurrentFrame();const {fps}=useVideoConfig();return <Stage id="negotiation">
  <Heading size={106}>Two rounds.<br/>A fixed limit.</Heading>
  <div style={{position:'absolute',left:110,top:505,display:'flex',gap:24}}>{[1,2].map((round,i)=><div key={round} style={{width:160,height:140,borderRadius:16,border:`2px solid ${palette.forest}`,background:f>(i?8*fps:fps)?palette.forest:'transparent',color:f>(i?8*fps:fps)?palette.lime:palette.forest,display:'flex',alignItems:'center',justifyContent:'center',fontSize:66,fontWeight:700,...rise(f,18+i*10)}}>{round}</div>)}</div>
  <Tag y={690}>Third round refused · ROUND_LIMIT</Tag>
  <Note top={785}>Retained checks rejected invented and<br/>above-budget checkout offers.</Note>
  <UiPanel focus="offers" clip={{start:15,rate:25/16}}/>
</Stage>}
