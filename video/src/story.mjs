export const sections = [
  {id:'opening',title:'The buyer’s problem',start:0,seconds:12,label:'Illustrative buyer · synthetic print order'},
  {id:'tradeoff',title:'Price is only part of the choice',start:12,seconds:18,label:'Illustrative comparison · nonbinding synthetic estimates'},
  {id:'advice',title:'Advice can be wrong',start:30,seconds:18,label:'Historical free-model text · reconstructed evidence layout'},
  {id:'intro',title:'Vowrail',start:48,seconds:8,label:'Local prototype · AI advice stays advisory'},
  {id:'mandate',title:'Bounded permission',start:56,seconds:18,label:'Recorded local app simulation · edited playback speed'},
  {id:'negotiation',title:'Deterministic limits',start:74,seconds:16,label:'Recorded simulation (edited speed) · retained gateway checks'},
  {id:'review',title:'The buyer chooses',start:90,seconds:18,label:'Recorded local app review · no order or payment'},
  {id:'expiry',title:'Permission expires',start:108,seconds:12,label:'Synthetic shipped-UI expiry replay · no checkout or capture'},
  {id:'sandbox',title:'A checkable payment result',start:120,seconds:16,label:'Earlier separate PayPal Sandbox run · historical text summary'},
  {id:'recovery',title:'Check without paying again',start:136,seconds:14,label:'Distinct evidence: simulated loss tests + earlier receipt restart'},
  {id:'outcome',title:'Keep the purchase yours',start:150,seconds:15,label:'Private review · local prototype · separate historical runs'},
];

const lines = {
  opening:[
    [0,6,'I need 100 matte prints for an event in three days.'],
    [6,12,'I want AI help. I still need control over the purchase.'],
  ],
  tradeoff:[
    [0,6,'The cheapest offer may arrive too late.'],
    [6,12,'Price, timing and terms all shape the choice.'],
    [12,18,'These are illustrative quotes, not merchant commitments.'],
  ],
  advice:[
    [0,9,'An actual model explanation called Atlas cheapest. Birch cost less with a three-day estimate.'],
    [9,18,'Another assumed an uncertain deadline was acceptable and mislabeled cents as USD.'],
  ],
  intro:[
    [0,4,'Vowrail keeps purchase permission explicit.'],
    [4,8,'Agents propose. The deterministic gateway enforces the bounds.'],
  ],
  mandate:[
    [0,6,'Here the buyer permits at most USD 220 and two negotiation rounds.'],
    [6,12,'The stored mandate stays outside the model’s reasoning.'],
    [12,18,'Sellers receive public requirements, not the private ceiling.'],
  ],
  negotiation:[
    [0,5,'The gateway authorizes each round. Two means two.'],
    [5,10,'Retained checks refused a third round, invented offers and above-budget checkout.'],
    [10,16,'The gateway enforces the rule. A disabled button only displays it.'],
  ],
  review:[
    [0,6,'I compare the stored price, delivery estimate and expiry before choosing.'],
    [6,12,'Delivery and missing tax or refund terms still need buyer review.'],
    [12,18,'Order creation, buyer approval and capture remain separate steps.'],
  ],
  expiry:[
    [0,6,'An expired quote cannot begin checkout. An expired mandate cannot authorize capture.'],
    [6,12,'Previously completed payment status remains readable. This is a synthetic expiry replay.'],
  ],
  sandbox:[
    [0,5,'In an earlier separate Sandbox run, one authorized USD 207 purchase completed.'],
    [5,11,'Independent checks matched the amount, currency and reference.'],
    [11,16,'This is a text summary. The synthetic seller was not the configured payee.'],
  ],
  recovery:[
    [0,7,'If a payment response is uncertain, verify the stored outcome with a read-only check.'],
    [7,14,'Earlier restart restored the completed receipt after expiry. Recovery made no capture call.'],
  ],
  outcome:[
    [0,5,'Use AI help while keeping purchase permission explicit and the outcome checkable.'],
    [5,10,'Delivery terms need review. Model explanations remain unverified.'],
    [10,15,'Model tests and the Sandbox purchase were separate runs. Private review only.'],
  ],
};

// Remotion Caption shape; authored script, not a speech transcription.
export const captions = sections.flatMap(section => lines[section.id].map(([start,end,text]) => ({
  scene:section.id,text,startMs:(section.start+start)*1000,endMs:(section.start+end)*1000,
  timestampMs:null,confidence:null,
})));
export const FPS=30;
export const DURATION_SECONDS=165;
export const TRANSITION_FRAMES=12;
