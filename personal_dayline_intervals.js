/* Local research only. Half-open intervals, no score and no normative house/yuti choice. */
(function(root,factory){const node=typeof module==='object'&&module.exports;
 const api=factory(node?require('./personal_dayline_model.js'):root.PersonalDayline,node?require('./personal_dayline_election.js'):root.PersonalDaylineElection);
 if(node)module.exports=api;else root.PersonalDaylineIntervals=api;
})(globalThis,function(M,E){'use strict';
 const H=3600000,bodyNames=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
 function state(t,place){
  const chart=E.calculate(t,place),tithi=M.tithi(t).number;
  const values={tithi};
  // Sign/association evidence does not require an ascendant, including at a pole.
  const signs=Object.fromEntries(bodyNames.map(b=>[b,M.planetSign(t,b).rashi]));
  for(const b of bodyNames)values['sign:'+b]=signs[b];
  values.houseStatus=chart.status;
  if(chart.status==='candidate'){
   values.ascSign=chart.ascendant.rashi;
   for(const p of chart.bodies)for(const k of ['house','houseEqual','houseSripati'])values[k+':'+p.body]=p[k];
  }
  const companions=bodyNames.filter(b=>b!=='Mercury'&&signs[b]===signs.Mercury);
  const fixed=companions.filter(b=>['Sun','Mars','Saturn'].includes(b));
  const moonEv=E.moonSourceCandidates(M.tithi(t).angle);
  // LJ 2.4 commentary: kshina Moon is itself a malefic and "any one" malefic companion makes Mercury
  // malefic. The Moon companion is resolved ONLY when all three recorded kshina readings agree.
  const viaMoon=companions.includes('Moon')?moonEv.agreement:null;
  return {values,moon:moonEv,mercury:{companions,
   candidate:fixed.length?'malefic':viaMoon==='all_readings_kshina'?'malefic_via_kshina_moon':viaMoon==='all_readings_purna'?'benefic':companions.includes('Moon')?'moon_condition_unresolved':'benefic',
   witnesses:fixed,rule:'Laghu Jataka 2.4 commentary: any one malefic; no majority vote',
   geometry:'same_sign_candidate_not_normative_yuti',normativeClassification:null,excludedFromDecision:true},
   houseStatus:chart.status,score:null,fullElection:false,physical_uncertainty_ms:null};
 }
 // A bounded sampling/refinement algorithm, NOT proof that arbitrarily short states cannot exist.
 // Each changed field is refined separately: two planets can cross different cusps in one minute.
 function survey(start,end,place,{stepMs=60000,toleranceMs=1}={}){
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||end<=start||end-start>26*H)throw Error('Expected one local day, at most 26 hours');
  if(!Number.isInteger(stepMs)||stepMs<1000||stepMs>60000||toleranceMs!==1)throw Error('Unsupported survey/tolerance');
  const cache=new Map(),at=t=>{if(!cache.has(t))cache.set(t,state(t,place));return cache.get(t);};
  const events=[];let left=start,previous=at(left);
  while(left<end-1){const right=Math.min(left+stepMs,end-1),next=at(right);
   for(const key of new Set([...Object.keys(previous.values),...Object.keys(next.values)])){
    if(previous.values[key]===next.values[key])continue;
    // Several successive changes of one field inside one step (A->B->C, e.g. fast high-latitude
    // cusps) are all refined: keep bisecting from the last found change until the step's end value.
    // Return crossings A->B->A wholly inside a step remain undetectable by sampling.
    let from=previous.values[key],base=left;
    for(let guard=0;guard<64;guard++){
     let lo=base,hi=right;
     while(hi-lo>toleranceMs){const mid=Math.floor((lo+hi)/2);if(at(mid).values[key]===from)lo=mid;else hi=mid;}
     const to=at(hi).values[key];
     events.push({at:hi,key,from:at(lo).values[key]??null,to:to??null,numericalBracketMs:hi-lo});
     if(to===next.values[key]||hi>=right)break;
     from=to;base=hi;
    }
   }
   left=right;previous=next;
  }
  events.sort((a,b)=>a.at-b.at||a.key.localeCompare(b.key));
  return {events,initial:at(start),coverage:'sampled_changed_fields_refined; shorter_return_crossings_not_excluded',stepMs,
   numericalToleranceMs:toleranceMs,physical_uncertainty_ms:null,evaluations:cache.size};
 }
 function attach(base,surveyResult){
  if(!base?.windows?.length||!Array.isArray(surveyResult?.events))throw Error('Missing dayline/survey');
  const windows=base.windows.map(w=>{
   const events=surveyResult.events.filter(e=>e.at>=w.start&&e.at<w.end);
   const cuts=[...new Set([w.start,w.end,...w.segments.flatMap(s=>[s.start,s.end]),...events.map(e=>e.at)])].sort((a,b)=>a-b);
   const segments=cuts.slice(0,-1).map((start,i)=>{
    const end=cuts[i+1],source=w.segments.find(s=>s.start<=start&&start<s.end);
    if(!source)throw Error('Gap in original segments');
    return {...source,start,end,conditions:state(start,base.place),events:events.filter(e=>e.at===start)};
   });
   return {...w,segments,conditionsVary:events.length>0};
  });
  return {...base,windows,conditionSurvey:surveyResult,score:null,fullElection:false,physical_uncertainty_ms:null,
   intervalScope:'research conditions and existing Tara/hora segments; not a full election',
   natalAscendantInferred:false};
 }
 function build(input,options){const base=M.build(input);return attach(base,survey(base.day.start,base.day.end,base.place,options));}
 return Object.freeze({state,survey,attach,build});
});
