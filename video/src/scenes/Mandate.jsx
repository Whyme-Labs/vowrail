import React from 'react';
import {Stage,Heading,Note,Tag,UiPanel} from '../Design';

export function Mandate(){return <Stage id="mandate">
  <Heading size={106}>Set the limits.<br/>Keep them<br/>outside AI.</Heading>
  <Tag y={622}>USD 220 maximum</Tag><Tag y={705}>2 negotiation rounds</Tag>
  <Note top={810}>Only public requirements go to sellers.</Note>
  <UiPanel focus="mandate" clip={{start:0,rate:15/18}}/>
</Stage>}
