import {sections as originalSections} from './story.mjs';

// The shorter edit removes the comparison/model detour, preserving the core journey.
const durations = [['opening',6],['intro',6],['mandate',12],['negotiation',10],['review',14],['expiry',8],['sandbox',12],['recovery',10],['outcome',12]];
let start=0;
export const sections=durations.map(([id,seconds])=>{const section={...originalSections.find(s=>s.id===id),start,seconds};start+=seconds;return section;});
export const DURATION_SECONDS=90;
export const FPS=30;
export const TRANSITION_FRAMES=12;
const lines={
  opening:[[0,6,'I need 100 prints in three days. I still control the purchase.']],
  intro:[[0,6,'Agents propose. Vowrail’s gateway enforces spending permission.']],
  mandate:[[0,6,'The buyer allows USD 220 and two negotiation rounds.'],[6,12,'Sellers receive public requirements, never the private ceiling.']],
  negotiation:[[0,5,'Two rounds means two. The gateway refuses another.'],[5,10,'Invented offers and above-budget checkout are blocked.']],
  review:[[0,7,'Choose a stored offer. Delivery, tax and refund terms still need review.'],[7,14,'Order creation, buyer approval and capture are separate.']],
  expiry:[[0,8,'Expired permission blocks checkout or capture. This is a synthetic expiry replay.']],
  sandbox:[[0,6,'An earlier separate Sandbox run completed one authorized USD 207 purchase.'],[6,12,'Amount and currency matched. The synthetic seller was not the configured payee.']],
  recovery:[[0,5,'When a response is uncertain, check the stored outcome without another capture.'],[5,10,'Earlier restart restored the completed receipt after expiry.']],
  outcome:[[0,6,'AI helps. Your permission stays explicit and the result stays checkable.'],[6,12,'Model explanations remain unverified. Evidence comes from separate runs. Private review only.']],
};
export const captions=sections.flatMap(s=>lines[s.id].map(([start,end,text])=>({scene:s.id,text,startMs:(s.start+start)*1000,endMs:(s.start+end)*1000,timestampMs:null,confidence:null})));
