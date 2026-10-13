import React from 'react';
import {Stage,palette,rise} from '../Design';
import {useCurrentFrame} from 'remotion';

export function Outcome(){const f=useCurrentFrame();return <Stage id="outcome" dark>
  <div data-key-text style={{position:'absolute',left:102,top:235,fontSize:118,fontWeight:700,lineHeight:1.06,letterSpacing:-5}}>
    <div style={rise(f)}>AI help.</div><div style={{color:palette.lime,...rise(f,20)}}>Your permission.</div><div style={rise(f,40)}>A checkable outcome.</div>
  </div>
  <div style={{position:'absolute',left:110,top:695,display:'flex',gap:18}}>{['Bounded spend','Explicit review','Receipt recovery'].map((text,i)=><span key={text} style={{fontSize:29,border:'1px solid #7d9670',borderRadius:100,padding:'17px 28px',...rise(f,60+i*8)}}>{text}</span>)}</div>
  <div style={{position:'absolute',left:112,top:801,fontSize:28,color:'#c1d3bd',maxWidth:1660}}>Local prototype · Unverified model explanations · Delivery terms need review · No fulfillment guarantee</div>
</Stage>}
