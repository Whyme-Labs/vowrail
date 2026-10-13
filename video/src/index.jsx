import React from 'react';
import {Composition,Folder,registerRoot,useVideoConfig} from 'remotion';
import {TransitionSeries,linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {Opening} from './scenes/Opening';
import {Tradeoff} from './scenes/Tradeoff';
import {Advice} from './scenes/Advice';
import {Intro} from './scenes/Intro';
import {Mandate} from './scenes/Mandate';
import {Negotiation} from './scenes/Negotiation';
import {Review} from './scenes/Review';
import {Expiry} from './scenes/Expiry';
import {Sandbox} from './scenes/Sandbox';
import {Recovery} from './scenes/Recovery';
import {Outcome} from './scenes/Outcome';
import {ShortFilm} from './ShortFilm';

function Film(){const {fps}=useVideoConfig();const cut=()=> <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames:12})}/>;return <TransitionSeries>
  <TransitionSeries.Sequence name="Buyer problem" durationInFrames={12*fps+12} premountFor={fps}><Opening/></TransitionSeries.Sequence>{cut()}
  <TransitionSeries.Sequence name="Price and deadline" durationInFrames={18*fps+12} premountFor={fps}><Tradeoff/></TransitionSeries.Sequence>{cut()}
  <TransitionSeries.Sequence name="Historical model errors" durationInFrames={18*fps+12} premountFor={fps}><Advice/></TransitionSeries.Sequence>{cut()}
  <TransitionSeries.Sequence name="Vowrail introduction" durationInFrames={8*fps+12} premountFor={fps}><Intro/></TransitionSeries.Sequence>{cut()}
  <TransitionSeries.Sequence name="Recorded buyer permission" durationInFrames={18*fps+12} premountFor={fps}><Mandate/></TransitionSeries.Sequence>{cut()}
  <TransitionSeries.Sequence name="Recorded negotiation" durationInFrames={16*fps+12} premountFor={fps}><Negotiation/></TransitionSeries.Sequence>{cut()}
  <TransitionSeries.Sequence name="Recorded buyer review" durationInFrames={18*fps+12} premountFor={fps}><Review/></TransitionSeries.Sequence>{cut()}
  <TransitionSeries.Sequence name="Synthetic expiry replay" durationInFrames={12*fps+12} premountFor={fps}><Expiry/></TransitionSeries.Sequence>{cut()}
  <TransitionSeries.Sequence name="Earlier Sandbox summary" durationInFrames={16*fps+12} premountFor={fps}><Sandbox/></TransitionSeries.Sequence>{cut()}
  <TransitionSeries.Sequence name="Recovery evidence" durationInFrames={14*fps+12} premountFor={fps}><Recovery/></TransitionSeries.Sequence>{cut()}
  <TransitionSeries.Sequence name="Buyer outcome" durationInFrames={15*fps} premountFor={fps}><Outcome/></TransitionSeries.Sequence>
</TransitionSeries>}

registerRoot(()=> <>
  <Composition id="Vowrail" component={Film} durationInFrames={4950} fps={30} width={1920} height={1080}/>
  <Composition id="Vowrail90" component={ShortFilm} durationInFrames={2700} fps={30} width={1920} height={1080}/>
  <Folder name="Scenes">
    <Composition id="Opening" component={Opening} durationInFrames={360} fps={30} width={1920} height={1080}/>
    <Composition id="Tradeoff" component={Tradeoff} durationInFrames={540} fps={30} width={1920} height={1080}/>
    <Composition id="Advice" component={Advice} durationInFrames={540} fps={30} width={1920} height={1080}/>
    <Composition id="Intro" component={Intro} durationInFrames={240} fps={30} width={1920} height={1080}/>
    <Composition id="Mandate" component={Mandate} durationInFrames={540} fps={30} width={1920} height={1080}/>
    <Composition id="Negotiation" component={Negotiation} durationInFrames={480} fps={30} width={1920} height={1080}/>
    <Composition id="Review" component={Review} durationInFrames={540} fps={30} width={1920} height={1080}/>
    <Composition id="Expiry" component={Expiry} durationInFrames={360} fps={30} width={1920} height={1080}/>
    <Composition id="Sandbox" component={Sandbox} durationInFrames={480} fps={30} width={1920} height={1080}/>
    <Composition id="Recovery" component={Recovery} durationInFrames={420} fps={30} width={1920} height={1080}/>
    <Composition id="Outcome" component={Outcome} durationInFrames={450} fps={30} width={1920} height={1080}/>
  </Folder>
</>);
