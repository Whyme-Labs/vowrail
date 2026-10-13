import React from 'react';
import {useCurrentFrame,useVideoConfig} from 'remotion';
import {Stage,Heading,Note,palette,rise} from '../Design';
import model from '../../public/model-text.json';

export function Advice(){const f=useCurrentFrame();const {fps}=useVideoConfig();const second=f>=9*fps;const item=second?model.ambiguity:model.delivery;const local=f-(second?9*fps:0);return <Stage id="advice">
  <Heading size={106}>A convincing<br/>explanation<br/>can be wrong.</Heading>
  <Note top={652}>Model text stays unverified.<br/>The buyer still confirms what matters.</Note>
  <div style={{position:'absolute',left:920,top:246,width:894,height:530,boxSizing:'border-box',padding:42,background:'#fffef7',border:`1px solid ${palette.line}`,borderRadius:20,...rise(local)}}>
    <div style={{fontSize:26,color:palette.red,fontWeight:700}}>UNVERIFIED MODEL EXPLANATION</div>
    <div style={{fontSize:36,fontWeight:700,marginTop:23}}>{second?'Ambiguous delivery request':'Three-day delivery preference'}</div>
    <div data-model-text style={{fontSize:29,lineHeight:1.5,marginTop:26}}>“{item.reason}”</div>
    <div data-key-text style={{position:'absolute',left:42,right:42,bottom:33,borderTop:`1px solid ${palette.line}`,paddingTop:20,fontSize:29,fontWeight:700,color:palette.red}}>{second?'Stored quote: USD 201. Deadline assumption needs confirmation.':'Stored Birch quote: USD 203 / 3 days. USD 4 less than Atlas.'}</div>
  </div>
  <div style={{position:'absolute',left:925,top:810,fontSize:23,color:palette.muted}}>Recorded Nvidia free-model outputs · No checkout in these cases.</div>
  <div style={{position:'absolute',left:105,top:839,fontSize:24,color:palette.muted}}>8 attempts · 3 usable outputs · Quality errors retained</div>
</Stage>}
