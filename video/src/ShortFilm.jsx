import React from 'react';
import {staticFile,useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {TransitionSeries,linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {FilmStoryContext} from './Design';
import {sections,captions,DURATION_SECONDS,TRANSITION_FRAMES} from './short-story.mjs';
import {Opening} from './scenes/Opening';
import {Intro} from './scenes/Intro';
import {Mandate} from './scenes/Mandate';
import {Negotiation} from './scenes/Negotiation';
import {Review} from './scenes/Review';
import {Expiry} from './scenes/Expiry';
import {Sandbox} from './scenes/Sandbox';
import {Recovery} from './scenes/Recovery';
import {Outcome} from './scenes/Outcome';
const scenes={opening:Opening,intro:Intro,mandate:Mandate,negotiation:Negotiation,review:Review,expiry:Expiry,sandbox:Sandbox,recovery:Recovery,outcome:Outcome};
export function ShortFilm(){const {fps}=useVideoConfig();return <FilmStoryContext.Provider value={{sections,captions,seconds:DURATION_SECONDS}}>
  <Audio src={staticFile('supplied-audio.m4a')}/>
  <TransitionSeries>{sections.map((s,i)=>{const Scene=scenes[s.id];return <React.Fragment key={s.id}>
    <TransitionSeries.Sequence name={s.title} durationInFrames={s.seconds*fps+(i<sections.length-1?TRANSITION_FRAMES:0)} premountFor={fps}><Scene/></TransitionSeries.Sequence>
    {i<sections.length-1?<TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames:TRANSITION_FRAMES})}/>:null}
  </React.Fragment>;})}</TransitionSeries>
</FilmStoryContext.Provider>}
