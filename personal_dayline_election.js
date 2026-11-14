/* Research geometry at the selected instant. No natal houses or score. */
(function(root,factory){const node=typeof module==='object'&&module.exports;
 const lunar=node?require('./lunar_core_v1.js'):null;
 const api=factory(node?require('./astronomy-engine-2.1.19.min.js'):root.Astronomy,()=>lunar||root.SkyRhythmLunar);
 if(node)module.exports=api;else root.PersonalDaylineElection=api;
})(globalThis,function(A,shared){'use strict';
 const rad=Math.PI/180,mod=(x,n)=>((x%n)+n)%n;
 const bodies=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
 function ascendant(t,place){
  if(!Number.isFinite(t)||!place||!Number.isFinite(place.lat)||Math.abs(place.lat)>90||!Number.isFinite(place.lon)||Math.abs(place.lon)>180)throw Error('Некоректний момент або координати карти початку справи.');
  // At/near a geographic pole there is no stable ordinary rising-point convention.
  if(Math.abs(place.lat)>=89.999)return {status:'unavailable_polar',longitude:null};
  const at=A.MakeTime(new Date(t)),theta=(15*A.SiderealTime(at)+place.lon)*rad,eps=A.e_tilt(at).tobl*rad,phi=place.lat*rad;
  const a=Math.cos(phi)*Math.cos(theta),b=Math.cos(phi)*Math.sin(theta)*Math.cos(eps)+Math.sin(phi)*Math.sin(eps);
  if(Math.hypot(a,b)<1e-8)return {status:'degenerate_horizon',longitude:null};
  let lambda=Math.atan2(-a,b);
  const east=-Math.sin(theta)*Math.cos(lambda)+Math.cos(theta)*Math.cos(eps)*Math.sin(lambda);
  if(Math.abs(east)<1e-8)return {status:'tangent_horizon',longitude:null};
  if(east<0)lambda+=Math.PI;
  const L=shared();
  const tropical=mod(lambda/rad,360),ay=L?L.ayanamshaAt(L.time(t)):23.8570923254552+0.0139688794*(at.tt/365.25)+3.07096226e-8*(at.tt/365.25)**2+A.e_tilt(at).dpsi/3600,longitude=mod(tropical-ay,360);
  // Midheaven: ecliptic point on the upper meridian (same RAMC/obliquity).
  const mcTropical=mod(Math.atan2(Math.sin(theta),Math.cos(theta)*Math.cos(eps))/rad,360);
  return {status:'computed',tropical,longitude,rashi:Math.floor(longitude/30),mcTropical,mcLongitude:mod(mcTropical-ay,360),ayanamsha:ay,physical_uncertainty_ms:null};
 }
 // Sensitivity conventions only (not normative): Porphyry quadrant trisection and
 // Sripati = midpoints of consecutive Porphyry cusps (Swiss 'S'). Sidereal = tropical - ayanamsha.
 function porphyryCusps(asc,mc){
  const c=new Array(12),q1=mod(asc-mc,360),q2=mod(mc+180-asc,360);
  c[9]=mc;c[10]=mod(mc+q1/3,360);c[11]=mod(mc+2*q1/3,360);c[0]=asc;c[1]=mod(asc+q2/3,360);c[2]=mod(asc+2*q2/3,360);
  for(const i of [0,1,2])c[i+6]=mod(c[i]+180,360);
  for(const i of [9,10,11])c[i-6]=mod(c[i]+180,360);
  return c;
 }
 function sripatiCusps(asc,mc){const p=porphyryCusps(asc,mc);return p.map((x,i)=>{const prev=p[(i+11)%12];return mod(prev+mod(x-prev,360)/2,360);});}
 function houseOf(lon,cusps){for(let i=0;i<12;i++){const span=mod(cusps[(i+1)%12]-cusps[i],360);if(mod(lon-cusps[i],360)<span)return i+1;}return null;}
 function observe(bodies,key){
  const h=b=>b[key];
  return {eighthHouse:bodies.filter(p=>h(p)===8).map(p=>p.body),
   beneficsAngularOrTrinal:bodies.filter(p=>p.classification==='benefic'&&[1,4,5,7,9,10].includes(h(p))).map(p=>p.body),
   fixedMaleficsInListedHouses:bodies.filter(p=>p.classification==='malefic'&&[3,6,10,11].includes(h(p))).map(p=>p.body),
   fixedBeneficsInListedHouses:bodies.filter(p=>p.classification==='benefic'&&[1,2,3,4,5,7,9,10].includes(h(p))).map(p=>p.body),
   eleventhHouse:bodies.filter(p=>h(p)===11).map(p=>p.body)};
 }
 // Source-scoped research interpretations, never an automatic benefic/score.
 // Tithi uses directed geocentric elongation, not illuminated fraction.
 function moonSourceCandidates(elongation){
  if(!Number.isFinite(elongation)||elongation<0||elongation>=360)return {status:'missing',excludedFromDecision:true};
  const tithi=Math.floor(elongation/12)+1,boundary=[8,23].includes(tithi);
  return {status:'source_scoped_candidates',tithi,excludedFromDecision:true,
   mcAnnaprashana:{source:'MC 5.19–20 commentary, printed181–182 / scans197–198',
    scope:'annaprashana; transfer_to_other_activities_unresolved',
    interpretation:boundary?'ashtami_inclusion_unresolved':tithi>=9&&tithi<=22?'purna':'kshina',
    boundaryTithi:boundary,universalWeaknessCriterion:false},
   laghuHindi:{source:'Laghu Jataka 2.4, Vasudeva Hindi commentary, electronic reproduction PDF26',
    scope:'natal_classification; not_a_muhurta_priority_rule',
    interpretation:tithi>=8&&tithi<=22?'purna':'kshina',
    interval:'purna: elongation >=84 and <264 degrees',
    printedEditionCollation:'pending'},
   // NSKTU Sanskrit commentary on LJ 2.4 (PDF9/printed7): "kṛṣṇapakṣasyāṣṭamyā ūrdhvaṃ śuklapakṣasyāṣṭamīṃ
   // yāvat kṣīṇacandro bhavati". Krishna Ashtami (23) is BEFORE the kshina span (conflicts with the Hindi
   // reading); inclusion of Shukla Ashtami (8) in "yāvat" is not settled.
   laghuSanskrit:{source:'Laghu Jataka 2.4, Sanskrit commentary, NSKTU Prak-Sastri Paper 8, PDF9 / printed7',
    scope:'natal_classification; not_a_muhurta_priority_rule',
    interpretation:tithi===8?'yavat_inclusion_unresolved':tithi>=9&&tithi<=23?'purna':'kshina',
    interval:'purna: elongation >=96 and <276 degrees; 84..96 unresolved'},
   agreement:(()=>{const r=[boundary?null:tithi>=9&&tithi<=22?'purna':'kshina',tithi>=8&&tithi<=22?'purna':'kshina',tithi===8?null:tithi>=9&&tithi<=23?'purna':'kshina'];
    return r.every(x=>x==='kshina')?'all_readings_kshina':r.every(x=>x==='purna')?'all_readings_purna':'readings_differ';})(),
   classification:'conditional_unresolved',score:null};
 }
 function mercurySourceCandidate(items){
  const p=items.find(x=>x.body==='Mercury'),companions=items.filter(x=>x.body!=='Mercury'&&x.rashi===p.rashi);
  const malefics=companions.filter(x=>['Sun','Mars','Saturn'].includes(x.body)).map(x=>x.body);
  const benefics=companions.filter(x=>['Jupiter','Venus'].includes(x.body)).map(x=>x.body);
  const conditional=companions.filter(x=>x.body==='Moon').map(x=>x.body);
  return {source:'Brihat Jataka XIV.1–5, Aiyar1905 printed149–151 / PDF193–195',
   scope:'natal_pair_yogas; transfer_to_II.5_and_MC_unresolved',convention:'same_sidereal_sign_candidate',orbDegrees:null,
   companions:companions.map(x=>x.body),fixedMalefics:malefics,fixedBenefics:benefics,conditionalCompanions:conditional,
   mixedAssociations:malefics.length>0&&benefics.length>0,
   priority:'unresolved',classification:'conditional_unresolved',excludedFromDecision:true,score:null};
 }
 // Diagnostic facts only. Same sign is not promoted to a normative yuti/orb,
 // and waxing/waning is not a numerical definition of kshina.
 function conditionalEvidence(items, phaseAngle){
  const valid=Array.isArray(items)&&items.length===7&&bodies.every(name=>items.filter(p=>p?.body===name&&Number.isFinite(p.longitude)&&p.longitude>=0&&p.longitude<360&&p.rashi===Math.floor(p.longitude/30)).length===1);
  if(!valid)return {status:'missing',classification:'conditional_unresolved',excludedFromDecision:true,score:null};
  const get=name=>items.find(p=>p.body===name),moon=get('Moon'),mercury=get('Mercury'),sun=get('Sun');
  const geometry=body=>items.filter(p=>p.body!==body.body).map(p=>({body:p.body,
   separationDegrees:Math.abs(mod(p.longitude-body.longitude+180,360)-180),
   sameSign:p.rashi===body.rashi,oppositeSign:mod(p.rashi-body.rashi,12)===6}));
  const supplied=phaseAngle!==undefined;
  if(supplied&&(!Number.isFinite(phaseAngle)||phaseAngle<0||phaseAngle>=360))return {status:'missing',classification:'conditional_unresolved',excludedFromDecision:true,score:null};
  const elongation=supplied?phaseAngle:mod(moon.longitude-sun.longitude,360);
  return {status:'geometry_only',classification:'conditional_unresolved',excludedFromDecision:true,score:null,
   convention:'sign_cooccupancy_is_not_verified_yuti; opposite_sign_is_not_verified_aspect',
   moon:{elongationDegrees:elongation,phaseConvention:supplied?'apparent_true_ecliptic_of_date_same_as_dayline_tithi':'supplied_longitude_fixture',phase:elongation===0?'new':elongation===180?'full':elongation<180?'waxing':'waning',
    relations:geometry(moon),weaknessThreshold:null,sourceCandidates:moonSourceCandidates(elongation),source:'MC 1.32 commentary / printed24; MC 4.7–8 / printed150–151',
    unresolved:['kshina_definition','yuti_definition','enclosure_definition','Jupiter_aspect_definition','navamsha_friendship_and_boolean_priority']},
   mercury:{relations:geometry(mercury),sourceCandidate:mercurySourceCandidate(items),source:'MC 1.32 commentary quoting Varaha; Brihat Jataka 2.5',
    unresolved:['yuti_definition','mixed_associations_priority','Moon_classification','nodes_not_in_seven_body_geometry']},
   fortnightFallback:{enabled:false,source:'MC 4.8 commentary / printed151',reason:'Requires necessity and lack of current favourable Moon, not missing data'}};
 }
 function conditionalHouses(items,key){
  return ['Moon','Mercury'].map(body=>{const p=items.find(p=>p.body===body),house=p?.[key];
   if(!Number.isInteger(house)||house<1||house>12)return {body,house:null,status:'missing'};
   return {body,house,status:'conditional_not_classified',
    eighthExclusion:house===8,eleventhListed:house===11,
    ifBeneficInListedHouses:[1,2,3,4,5,7,9,10].includes(house),
    ifMaleficInListedHouses:[3,6,10,11].includes(house),
    moonLagnaCautionCandidate:body==='Moon'&&house===1};
  });
 }
 function calculate(t,place){
  const asc=ascendant(t,place),result={instant:t,place:{lat:place.lat,lon:place.lon},ascendant:asc,
   profile:'whole_sign_candidate_v1',conventionStatus:'RESEARCH_CHOICE_NOT_SOURCE_SETTLED',
   scope:'selected_instant_not_entire_three_hour_window',fullElection:false,score:null,physical_uncertainty_ms:null,bodies:[]};
  if(asc.status!=='computed'){result.status='unavailable';return result;}
  // Bodies use the shared terrestrial time (TT = UTC + 69.184 s); the ascendant above keeps UT for sidereal time.
  const L=shared(),at=L?L.time(t):A.MakeTime(new Date(t));
  for(const body of bodies){const trop=body==='Moon'?A.EclipticGeoMoon(at).lon:A.Ecliptic(A.GeoVector(body,at,true)).elon;
   const longitude=mod(trop-asc.ayanamsha,360),rashi=Math.floor(longitude/30),house=mod(rashi-asc.rashi,12)+1;
   const houseEqual=Math.floor(mod(longitude-asc.longitude,360)/30)+1;
   result.bodies.push({body,longitude,rashi,house,houseEqual,classification:['Jupiter','Venus'].includes(body)?'benefic':['Moon','Mercury'].includes(body)?'conditional_unresolved':'malefic'});
  }
  const tropAsc=asc.tropical,tropMc=asc.mcTropical,sri=sripatiCusps(tropAsc,tropMc).map(x=>mod(x-asc.ayanamsha,360));
  for(const b of result.bodies)b.houseSripati=houseOf(b.longitude,sri);
  result.sripatiCusps=sri;
  result.houseSourceEvidence={
   signCounting:'Brihat Jataka I.4/I.16: rashi terminology; not a universal bhava mandate',
   sripatiGeometry:'Sripati Paddhati, Sastri1937 printed8–13; Brihat Jataka Aiyar1905 printed131 / PDF175',
   editorialContext:'Aiyar1905 printed130 attributes interpretation to Sundareswara Srauti; not a direct MC instruction',
   normativeElectionSystem:null,natalHousesInferred:false,excludedFromDecision:true};
  // These are isolated conditions under the declared house convention, never
  // a full election. Moon/Mercury are not silently classified by phase/orb.
  result.study={source:'MC 5.38 Piyushadhara, printed 198 / scan 214',
   eighthHouse:result.bodies.filter(p=>p.house===8).map(p=>p.body),
   beneficsAngularOrTrinal:result.bodies.filter(p=>p.classification==='benefic'&&[1,4,5,7,9,10].includes(p.house)).map(p=>p.body),
   // Separate observations from the cited Nrisimha passage in the commentary.
   // No existential/all-planets quantifier is invented for a combined verdict.
   fixedMaleficsInListedHouses:result.bodies.filter(p=>p.classification==='malefic'&&[3,6,10,11].includes(p.house)).map(p=>p.body),
   fixedBeneficsInListedHouses:result.bodies.filter(p=>p.classification==='benefic'&&[1,2,3,4,5,7,9,10].includes(p.house)).map(p=>p.body),
   eleventhHouse:result.bodies.filter(p=>p.house===11).map(p=>p.body),
   conditionalPlanets:['Moon','Mercury'],coverage:'seven_classical_bodies_no_nodes',
   status:'conditional_geometry_not_full_rule',excludedFromDecision:true};
  // Convention sensitivity: same observation under equal and Sripati houses. A differing
  // list means the observation depends on an unsettled house convention (not an error rate).
  const alt={equal:observe(result.bodies,'houseEqual'),sripati:observe(result.bodies,'houseSripati')};
  result.study.alternatives=alt;
  result.study.conventionSensitive=Object.fromEntries(Object.keys(alt.equal).map(k=>[k,['equal','sripati'].some(c=>JSON.stringify(alt[c][k])!==JSON.stringify(result.study[k]))]));
  // Same apparent convention as personal_dayline_model.elongation/tithi (Moon EclipticGeoMoon,
  // Sun with aberration). Not Astronomy.MoonPhase (aberration=false, ~35-40 s later at boundaries).
  result.conditionalEvidence=conditionalEvidence(result.bodies,mod(A.EclipticGeoMoon(at).lon-A.Ecliptic(A.GeoVector('Sun',at,true)).elon,360));
  result.study.conditionalByConvention=Object.fromEntries([['wholeSign','house'],['equal','houseEqual'],['sripati','houseSripati']].map(([name,key])=>[name,conditionalHouses(result.bodies,key)]));
  result.study.moonLagnaRule={source:'MC 1.32 commentary / printed24',status:'SOURCE_VARIANT_AND_HOUSE_CONVENTION_UNRESOLVED',
   exception:'Some authors allow non-weak Moon in Cancer/Taurus/Aries; kshina and precedence not settled',
   navamshaCondition:'NOT_OPERATIONALIZED',excludedFromDecision:true};
  result.status='candidate';return result;
 }
 return Object.freeze({ascendant,calculate,porphyryCusps,sripatiCusps,houseOf,conditionalEvidence,conditionalHouses,moonSourceCandidates});
});
