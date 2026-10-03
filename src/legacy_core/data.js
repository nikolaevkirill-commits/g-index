/* NR_FN_BEGIN 001 */async function loadFutureCalendarAdvisory(){
  try{
    const response = await fetch(URL_CALENDAR_ADVISORY, {cache:'no-store'});
    if(!response.ok) throw new Error('HTTP '+response.status);
    const doc = await response.json();
    window._futureCalendarAdvisory = (doc && doc.days) || {};
  }catch(error){ globalThis.NRDiagnostics?.record('catch.34','recoverable');
    console.warn('[calendar advisory]', error.message);
    window._futureCalendarAdvisory = {};
  }
}/* NR_FN_END 001 */

/* NR_FN_BEGIN 038 */async function loadFutureKp(){
  if(_futureKp!==null)return _futureKp;
  if(_futureKpLoad)return _futureKpLoad;
  const epoch=_futureKpEpoch;
  const pending=(async()=>{
    try{
      const resp=await fetch('future_kp.json',{cache:'no-store'});
      if(!resp.ok)throw new Error('HTTP '+resp.status);
      const data=await resp.json();
      if(!data.kp||typeof data.kp!=='object'||Array.isArray(data.kp))throw new Error('Invalid future Kp map');
      if(epoch!==_futureKpEpoch)return loadFutureKp();
      _futureKp=data.kp;
      _futureKpMeta={generated:data.generated||null,source_log:data.source_log||[],points:Object.values(_futureKp)};
      return _futureKp;
    }catch(e){ globalThis.NRDiagnostics?.record('catch.44','recoverable');
      if(epoch!==_futureKpEpoch)return loadFutureKp();
      _futureKpMeta={error:e.message,source_log:[],points:[]};
      return {}; // Leave the store null so the next request can recover.
    }finally{if(epoch===_futureKpEpoch)_futureKpLoad=null;}
  })();
  _futureKpLoad=pending;
  return pending;
}/* NR_FN_END 038 */

/* NR_FN_BEGIN 040 */async function loadTanitaPromotionGate(){
  try{
    const r=await fetch('TANITA_2Y_PROMOTION_GATE_v1.json',{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const g=await r.json();
    if(Number(g.score_effect)!==0 || g.production_change!==false) throw new Error('unsafe Tanita gate contract');
    _tanitaPromotionGate=g;
  }catch(_e){ globalThis.NRDiagnostics?.record('catch.45','recoverable');
    _tanitaPromotionGate={promotion:{allowed:false,required_frozen_independent_outcomes:100},evidence:{prospective:{independent_real_outcomes:0,required:100}}};
  }
  renderTanitaShadow();
  return _tanitaPromotionGate;
}/* NR_FN_END 040 */

/* NR_FN_BEGIN 042 */async function loadKpHourlyAlert(){
  const sum=document.getElementById('kpHourlySummary');
  const body=document.getElementById('kpHourlyBody');
  if(!sum||!body) return;
  try{
    const r=await fetch('KP_HOURLY_ALERT_v2.json',{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const p=await r.json();
    const generatedMs=Date.parse(p.generated_at||'');
    const ageHours=Number.isFinite(generatedMs)?Math.max(0,(Date.now()-generatedMs)/3600000):Infinity;
    const maxAgeHours=6;
    const allSlots=Array.isArray(p.slots)?p.slots:[];
    // Keep only current/future slots. A small tolerance retains the currently
    // active 3-hour bin without allowing yesterday's forecast to masquerade as today.
    const minSlotMs=Date.now()-3*3600000;
    const maxSlotMs=Date.now()+Number(p.lookahead_hours||12)*3600000;
    const slots=allSlots.filter(x=>{
      const t=Date.parse(x&&x.time_utc||'');
      return Number.isFinite(t)&&t>minSlotMs&&t<maxSlotMs&&Number.isFinite(Number(x.kp));
    }).sort((a,b)=>Date.parse(a.time_utc)-Date.parse(b.time_utc));
    if(ageHours>maxAgeHours) throw new Error('Дані Kp застаріли: '+(Number.isFinite(ageHours)?ageHours.toFixed(1):'невідомо')+' год');
    if(!slots.length) throw new Error('Немає актуальних погодинних слотів Kp');
    const peak=slots.reduce((best,x)=>Number(x.kp)>Number(best.kp)?x:best,slots[0]);
    const kp=Number(peak.kp), level=kp>=5?2:kp>=4?1:0;
    const currentAuthority=currentKpAuthority();
    const currentKp=currentAuthority.usable?currentAuthority.kp:null;
    const peakTime=new Date(peak.time_utc);
    const peakTimeLabel=peakTime.toLocaleString('uk-UA',{timeZone:'Europe/Kyiv',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',hour12:false});
    const peakDateKyiv=peakTime.toLocaleDateString('sv-SE',{timeZone:'Europe/Kyiv'});
    let dailyKp=null, dailySource='unknown', dailySynthetic=false;
    try{
      const future=await loadFutureKp();
      const daily=future&&future[peakDateKyiv];
      if(daily&&Number.isFinite(Number(daily.kp))){
        dailyKp=Number(daily.kp);
        dailySource=String(daily.source||'unknown');
        dailySynthetic=!!daily.kp_synthetic;
      }
    }catch(_e){ window.NRDiagnostics?.record('legacy.catch.52','recoverable'); }

    // Persist the preceding published forecast in this browser. A material
    // upstream revision must be shown, not silently presented as an observation.
    let revision=null;
    const revisionKey='gindex_kp_hourly_snapshot_v1';
    const revisionAlertKey='gindex_kp_hourly_last_revision_v1';
    try{
      const previous=JSON.parse(localStorage.getItem(revisionKey)||'null');
      if(previous&&previous.generated_at!==p.generated_at&&previous.slots){
        for(const x of slots){
          const old=Number(previous.slots[x.time_utc]);
          const next=Number(x.kp);
          if(Number.isFinite(old)&&Number.isFinite(next)){
            const delta=next-old;
            if(!revision||Math.abs(delta)>Math.abs(revision.delta)) revision={time_utc:x.time_utc,old,newValue:next,delta};
          }
        }
      }
      const snapshot={generated_at:p.generated_at,slots:{}};
      for(const x of allSlots) snapshot.slots[x.time_utc]=Number(x.kp);
      localStorage.setItem(revisionKey,JSON.stringify(snapshot));
      if(revision&&Math.abs(revision.delta)>=1){
        revision.detected_at=Date.now();
        localStorage.setItem(revisionAlertKey,JSON.stringify(revision));
      }else{
        const storedRevision=JSON.parse(localStorage.getItem(revisionAlertKey)||'null');
        const storedAge=storedRevision&&Number.isFinite(Number(storedRevision.detected_at))
          ? Date.now()-Number(storedRevision.detected_at) : Infinity;
        revision=storedAge<=6*3600000?storedRevision:null;
        if(storedAge>6*3600000) localStorage.removeItem(revisionAlertKey);
      }
    }catch(_e){ window.NRDiagnostics?.record('legacy.catch.53','recoverable'); }

    const currentText=currentKp===null?'—':currentKp.toFixed(1);
    const peakText=Number.isFinite(kp)?kp.toFixed(1):'—';
    const coverage=p.forecast_coverage?.status||'unverified';
    const peakState=(coverage==='missing'?'ПРОГНОЗ ВІДСУТНІЙ · ':coverage!=='complete'?'НЕПОВНЕ/НЕПЕРЕВІРЕНЕ ПОКРИТТЯ · ':'')+(level>=2?'🔴 прогноз G1 або вище':level===1?'🟡 підвищення, але нижче G1':'🟢 нижче порога попередження');
    const slotValues=slots.map(x=>Number(x.kp)).filter(Number.isFinite);
    const slotSpread=slotValues.length?Math.max(...slotValues)-Math.min(...slotValues):0;
    const volatileForecast=slotSpread>=1.5;
    sum.textContent='🛰 Kp: зараз '+currentText+' ('+currentAuthority.label+') · прогнозований пік '+peakText+' о '+peakTimeLabel+' · '+peakState+
      (volatileForecast?' · ⚠ мінливий прогноз ΔKp '+slotSpread.toFixed(1):'')+(p.fallback?.issued_at?' · NOAA text: '+p.fallback.issued_at:'');

    const volatilityHtml=volatileForecast
      ? '<div style="margin:7px 0;padding:8px 10px;border:1px solid rgba(255,190,75,.55);border-radius:8px;background:rgba(255,176,32,.07);color:#ffd37a"><b>⚠ Великий розкид між майбутніми слотами:</b> ΔKp '+slotSpread.toFixed(1)+'. Це ознака мінливого прогнозу, а не одночасні значення поточного стану.</div>'
      : '';
    const revisionHtml=revision&&Math.abs(revision.delta)>=1
      ? '<div style="margin:7px 0;padding:8px 10px;border:1px solid rgba(255,112,112,.6);border-radius:8px;background:rgba(255,80,80,.08);color:#ffb0b0"><b>⚠ Прогноз різко переглянуто:</b> '+revision.old.toFixed(1)+' → '+revision.newValue.toFixed(1)+' (Δ '+(revision.delta>0?'+':'')+revision.delta.toFixed(1)+') для '+new Date(revision.time_utc).toLocaleString('uk-UA',{timeZone:'Europe/Kyiv',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',hour12:false})+'. Це зміна прогнозу, не зафіксований стрибок Kp.</div>'
      : '';
    const generatedLabel=Number.isFinite(generatedMs)?new Date(generatedMs).toLocaleString('uk-UA',{timeZone:'Europe/Kyiv',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',hour12:false}):'невідомо';
    const dailyHtml=dailyKp===null?'—':dailyKp.toFixed(1);
    const dailySourceLabel=dailySynthetic||dailySource==='synthetic_fallback'
      ? 'SYNTHETIC FALLBACK · не прогноз NOAA'
      : dailySource==='NOAA_forecast'
        ? 'NOAA · добовий прогноз'
        : dailySource==='NOAA_fact'
          ? 'NOAA · часткове/добове спостереження'
          : 'джерело не визначено';
    body.innerHTML=
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:7px;margin-bottom:8px">'+
        '<div style="padding:8px 10px;border:1px solid rgba(89,166,255,.32);border-radius:8px"><b style="color:#9fd1ff">ГЕОМАГНІТНИЙ ФОН ЗАРАЗ · ОКРЕМИЙ ПОКАЗНИК</b><br><span style="font-size:18px;font-weight:800;color:#dbe9ff">Kp '+currentText+'</span><br><span style="color:var(--dim)">Останній завершений або активний 3-годинний слот. Не є оцінкою сприятливості дня.</span></div>'+
        '<div style="padding:8px 10px;border:1px solid rgba(255,190,75,.42);border-radius:8px"><b style="color:#ffd37a">МАЙБУТНІЙ ПІК · ПРОГНОЗ</b><br><span style="font-size:18px;font-weight:800">Kp '+peakText+'</span> · '+peakTimeLabel+'<br><span style="color:var(--dim)">'+peakState+'. Це не спостережений факт.</span></div>'+
        '<div style="padding:8px 10px;border:1px solid rgba(89,166,255,.32);border-radius:8px"><b style="color:#9fd1ff">ДОБОВЕ ЗВЕДЕННЯ</b><br><span style="font-size:18px;font-weight:800">Kp '+dailyHtml+'</span> · '+peakDateKyiv+'<br><span style="color:'+(dailySynthetic?'#ffd37a':'var(--dim)')+'">'+dailySourceLabel+'. Не дорівнює максимуму окремого слота.</span></div>'+
        '<div style="padding:8px 10px;border:1px solid rgba(178,126,255,.32);border-radius:8px"><b style="color:#d9c2ff">PDF / ОПЕРАТИВНА ОЦІНКА</b><br><span style="font-weight:800">Окрема шкала −3…+3</span><br><span style="color:var(--dim)">Не є Kp і не повинна чисельно збігатися з Kp.</span></div>'+
      '</div>'+volatilityHtml+revisionHtml+
      '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">'+
        '<thead><tr><th style="text-align:left;padding:5px">Час Київ</th><th style="text-align:left;padding:5px">Kp</th><th style="text-align:left;padding:5px">Тип даних</th></tr></thead><tbody>'+
        slots.slice(0,12).map(x=>{const v=Number(x.kp),c=v>=5?'#ff7070':v>=4?'#ffd37a':'#9fd1ff';return '<tr style="border-top:1px solid var(--border)"><td style="padding:5px">'+new Date(x.time_utc).toLocaleString('uk-UA',{timeZone:'Europe/Kyiv',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',hour12:false})+'</td><td style="padding:5px;color:'+c+';font-weight:700">'+v.toFixed(1)+'</td><td style="padding:5px">'+(x.source==='observed'?'СПОСТЕРЕЖЕННЯ':'ПРОГНОЗ 3-ГОДИННОГО СЛОТА')+'</td></tr>'}).join('')+
        '</tbody></table></div>'+
      '<div style="margin-top:7px;color:var(--dim)">Сформовано: '+generatedLabel+' · <span style="color:#9fd1ff">синій = Kp нижче 4, лише геомагнітний показник</span>; Kp≥4 — підвищена активність; Kp≥5 — поріг G1. Колір Kp не означає сприятливий день. Погодинний прогноз не переписує денний PDF-reference або оперативний стан; він може лише активувати окремий safety-veto після досягнення визначеного порога.</div>';
    if(level>0){const panel=document.getElementById('kpHourlyPanel');if(panel)panel.open=true;}
  }catch(e){ globalThis.NRDiagnostics?.record('catch.46','recoverable');
    sum.textContent='🛰 Погодинний Kp тимчасово недоступний';
    body.textContent=e.message;
  }
}/* NR_FN_END 042 */

/* NR_FN_BEGIN 044 */async function loadSourceHealth(){
  const sum=document.getElementById('sourceHealthSummary'), body=document.getElementById('sourceHealthBody');
  try{
    const r=await fetch('SOURCE_ROUTING_AUDIT_v1.json',{cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status);
    const p=await r.json(), warnings=p.warnings||[], hard=p.hard_failures||[], routes=p.routes||[];
    const kp=routes.find(x=>x.id==='kp_observed_forecast')||{}, sw=routes.find(x=>x.id==='space_weather')||{};
    const ks=kp.semantic||{}, ss=sw.semantic||{}, delivery=ss.delivery||{};
    const kpAge=Number(kp.candidates&&kp.candidates[0]&&kp.candidates[0].age_hours);
    const kpFeedFresh=String(kp.status||'').toLowerCase()==='ok'&&Number.isFinite(kpAge)&&kpAge<=Number(kp.max_age_h||6);
    const kpNowLabel=kpFeedFresh&&ks.noaa_transport_ok?'NOAA feed свіжий':'Kp feed STALE/резерв';
    const kpHorizonLabel=Number(ks.real_points||0)+' NOAA · '+Number(ks.synthetic_points||0)+' synthetic';
    // A successfully delivered old snapshot must never be presented as LIVE.
    const swAge=Number(sw.candidates&&sw.candidates[0]&&sw.candidates[0].age_hours);
    const swIsStale=String(sw.status||'').toLowerCase()==='stale'||(Number.isFinite(swAge)&&swAge>6);
    const swLabel=swIsStale ? 'STALE джерело '+(Number.isFinite(swAge)?swAge.toFixed(1):'—')+' год' :
      (delivery.status==='last_good' ? 'LAST-GOOD '+Number(delivery.age_hours||0).toFixed(1)+' год' : 'LIVE');
    if(sum){ sum.textContent='📡 Джерела: Kp зараз '+kpNowLabel+' · Kp горизонт '+kpHorizonLabel+' · space '+swLabel+(hard.length?' · BLOCKED':warnings.length?' · WARN':' · OK'); sum.style.color=hard.length?'#ff8d8d':warnings.length?'#ffd37a':'#9be7bd'; }
    if(body) body.innerHTML='<b>Kp зараз:</b> '+kpNowLabel+'<br><b>Kp горизонт:</b> '+kpHorizonLabel+' <span style="color:var(--faint)">(кількість дат, не значення Kp; synthetic не є прогнозом NOAA)</span><br><b>Космічна погода:</b> '+swLabel+'<br><b>Правило:</b> synthetic/last-good позначаються явно; відсутні дані не стають нулем; advisory не змінює G.';
    const panel=document.getElementById('sourceHealthPanel'); if(panel&&(hard.length||warnings.length)) panel.open=true;
  }catch(e){ globalThis.NRDiagnostics?.record('catch.47','recoverable');  if(sum) sum.textContent='📡 Статус джерел недоступний'; if(body) body.textContent=e.message; }
}/* NR_FN_END 044 */

/* NR_FN_BEGIN 045 */async function loadSpaceWeatherAccumulated(){
  if(_spaceWeatherAccumulated!==null) return _spaceWeatherAccumulated;
  const sum=document.getElementById('spaceWeatherAccumulatedSummary');
  const body=document.getElementById('spaceWeatherAccumulatedBody');
  const shown=(v,d=1)=>Number.isFinite(Number(v))?Number(v).toFixed(d):'—';
  try{
    const r=await fetch('SPACE_WEATHER_CONTEXT_v1.json',{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const p=await r.json(); _spaceWeatherAccumulated=p||{};
    const m=p.magnetic||{}, w=p.solar_wind||{}, pr=p.protons||{}, a=p.alerts||{}, e=p.enlil||{}, sp=p.solar_probabilities||{};
    const c=p.coupling||{}, d=p.dst||{}, hp=p.hpo||{}, hp30=hp.hp30||{}, hp60=hp.hp60||{};
    const delivery=p.delivery||{}, deliveryStatus=delivery.status||'live', deliveryAge=Number(delivery.age_hours||0);
    const fetchedAt=Date.parse(p.fetched_at||''), currentAgeHours=Number.isFinite(fetchedAt)?(Date.now()-fetchedAt)/3600000:null;
    const advisoryStale=currentAgeHours===null||currentAgeHours>6;
    // fp403: stale/undated space-weather is archival context, never a live value.
    // Keep the provenance/age warning visible, but suppress all rapidly changing
    // measurements and do not let them trigger the expanded warning panel.
    const liveShown=(v,digits=1)=>advisoryStale?'—':shown(v,digits);
    const sourceLabel=advisoryStale ? ('STALE знімок · '+currentAgeHours.toFixed(1)+' год') :
      (deliveryStatus==='last_good' ? ('LAST-GOOD · '+deliveryAge.toFixed(1)+' год') : 'LIVE');
    const stressed=!advisoryStale&&((Number(m.longest_bz_le_minus5_minutes)>=30)||(Number(w.dynamic_pressure_max_6h_npa)>=5)||
      !!c.shock_candidate||Number(d.latest_nt)<=-50||Number(hp30.max_24h)>=5||
      !!pr.s1_threshold_exceeded||Number(a.recent_72h_count)>0||Number(e.peak_speed_km_s)>=550||
      Number(sp.m_class_1_day_pct)>=50||Number(sp.x_class_1_day_pct)>=10);
    if(sum) sum.textContent='🛰 Космічна погода: хвилинний coupling + Hp30/Hp60/Dst + прогноз 7 діб'+
      (stressed?' · ⚠ підвищене навантаження':' · спокійний накопичений фон')+' · '+sourceLabel;
    if(body) body.innerHTML=
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:5px">'+
      '<div style="padding:5px 7px;border:1px solid var(--border);border-radius:7px"><b>IMF Bz</b><br>мін '+liveShown(m.bz_min_6h_nt)+' nT · південний '+(!advisoryStale&&Number.isFinite(Number(m.southward_fraction_6h))?Math.round(Number(m.southward_fraction_6h)*100)+'%':'—')+' · ≤−5 nT '+liveShown(m.longest_bz_le_minus5_minutes,0)+' хв</div>'+
      '<div style="padding:5px 7px;border:1px solid var(--border);border-radius:7px"><b>Coupling (shadow)</b><br>Newell 1г '+liveShown(c.newell_proxy_mean_1h,0)+' · Ey∫ 1г '+liveShown(c.ey_integral_1h_mv_min_m,1)+' · south Bz∫ '+liveShown(c.southward_bz_integral_1h_nt_min,0)+(!advisoryStale&&c.shock_candidate?' · ⚠ імпульс':'')+'</div>'+
      '<div style="padding:5px 7px;border:1px solid var(--border);border-radius:7px"><b>Швидка геомагнітика</b><br>Hp30 зараз/max '+liveShown(hp30.latest)+'/'+liveShown(hp30.max_24h)+' · Hp60 '+liveShown(hp60.latest)+' · Dst '+liveShown(d.latest_nt,0)+' nT (min24 '+liveShown(d.min_24h_nt,0)+')</div>'+
      '<div style="padding:5px 7px;border:1px solid var(--border);border-radius:7px"><b>Сонячний вітер</b><br>зараз '+liveShown(w.speed_latest_km_s,0)+' км/с · max '+liveShown(w.speed_max_6h_km_s,0)+' км/с · тиск max '+liveShown(w.dynamic_pressure_max_6h_npa)+' nPa</div>'+
      '<div style="padding:5px 7px;border:1px solid var(--border);border-radius:7px"><b>Протони ≥10 MeV</b><br>max 24 год '+shown(pr.max_24h_ge10mev_pfu,2)+' pfu · S1 '+(pr.s1_threshold_exceeded?'перевищено':'ні')+'</div>'+
      '<div style="padding:5px 7px;border:1px solid var(--border);border-radius:7px"><b>NOAA alerts</b><br>G/R/S/CME за 72 год: '+shown(a.recent_72h_count,0)+'</div>'+
      '<div style="padding:5px 7px;border:1px solid var(--border);border-radius:7px"><b>ENLIL 7 діб</b><br>пік '+shown(e.peak_speed_km_s,0)+' км/с · '+(e.peak_speed_time?new Date(e.peak_speed_time).toLocaleString('uk-UA'):'час —')+' · CME cloud '+(e.cme_cloud_start?'так':'не виявлено')+'</div>'+
      '<div style="padding:5px 7px;border:1px solid var(--border);border-radius:7px"><b>Імовірність 1 доба</b><br>M '+shown(sp.m_class_1_day_pct,0)+'% · X '+shown(sp.x_class_1_day_pct,0)+'% · proton '+shown(sp.proton_10mev_1_day_pct,0)+'%</div>'+
      '</div><div style="margin-top:6px;color:var(--dim)"><b>Доставка: '+sourceLabel+'</b> · NOAA RTSW/Kyoto + GFZ Hpo + GOES/ENLIL · snapshot SHA-256 · shadow/advisory only · score effect 0 до prospective validation.'+
      (advisoryStale?'<div style="margin-top:3px;color:#ff9f9f">Дані старші 6 год: це архівний advisory, а не поточний live-стан.</div>':'')+'</div>';
    if(stressed){
      const panel=document.getElementById('spaceWeatherAccumulatedPanel'); if(panel) panel.open=true;
    }
    updateSpaceWeatherDecisionGuard();
  }catch(e){ globalThis.NRDiagnostics?.record('catch.48','recoverable');
    _spaceWeatherAccumulated={};
    if(sum) sum.textContent='🛰 Накопичений space-weather context недоступний';
    if(body) body.textContent='Production G не змінено. '+e.message;
    updateSpaceWeatherDecisionGuard();
  }
  return _spaceWeatherAccumulated;
}/* NR_FN_END 045 */

/* NR_FN_BEGIN 046 */async function loadAiaVernadsky(){
  if(_aiaVernadsky!==null) return _aiaVernadsky;
  const sum=document.getElementById('aiaVernadskySummary');
  const body=document.getElementById('aiaVernadskyBody');
  try{
    const pair=await Promise.all([
      fetch('AIA_VERNADSKY_DAILY_v1.json',{cache:'no-store'}),
      fetch('AIA_VERNADSKY_SHADOW_AUDIT_v1.json',{cache:'no-store'})
    ]);
    if(!pair[0].ok||!pair[1].ok) throw new Error('HTTP '+pair[0].status+'/'+pair[1].status);
    const daily=await pair[0].json(), audit=await pair[1].json();
    _aiaVernadsky={daily,audit};
    const days=daily.data||{}, keys=Object.keys(days).sort(), latest=keys[keys.length-1], row=days[latest]||{};
    const age=latest?Math.floor((Date.now()-Date.parse(latest+'T00:00:00Z'))/86400000):null;
    const stale=age!==null&&age>4, base=audit.baseline_frozen_engine||{}, withAia=audit.engine_plus_aia_lagged||{}, gate=audit.incremental_gate||{};
    if(sum) sum.textContent='🧲 AIA «Академік Вернадський» · '+(latest||'даних немає')+' · '+(stale?'⚠ затримка':'shadow спостереження');
    if(body) body.innerHTML=
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:5px">'+
      '<div style="padding:5px 7px;border:1px solid var(--border);border-radius:7px"><b>H, добовий Δ90</b><br>'+Number(row.h_robust_range||0).toFixed(1)+' nT</div>'+
      '<div style="padding:5px 7px;border:1px solid var(--border);border-radius:7px"><b>F, добовий Δ90</b><br>'+Number(row.f_robust_range||0).toFixed(1)+' nT</div>'+
      '<div style="padding:5px 7px;border:1px solid var(--border);border-radius:7px"><b>Швидкі зміни H</b><br>q99 '+Number(row.dh1m_q99_abs||0).toFixed(1)+' nT/хв</div>'+
      '<div style="padding:5px 7px;border:1px solid var(--border);border-radius:7px"><b>Повнота доби</b><br>'+Math.round(Number(row.coverage||0)*100)+'%</div>'+
      '</div><div style="margin-top:6px"><b>Time-split 2025→2026:</b> Engine exact '+(100*Number(base.exact||0)).toFixed(1)+'% → з AIA '+(100*Number(withAia.exact||0)).toFixed(1)+'%; знак '+(100*Number(base.strict_sign||0)).toFixed(1)+'% → '+(100*Number(withAia.strict_sign||0)).toFixed(1)+'%.</div>'+
      '<div style="margin-top:4px;color:#ffd37a"><b>'+(gate.passed?'Gate пройдено':'Gate НЕ пройдено')+'.</b> AIA не змінює G, PDF або рішення дня; score_effect=0.</div>'+
      (stale?'<div style="margin-top:3px;color:#ff9f9f">Дані старші 4 діб — використовувати лише як архівний контекст.</div>':'')+
      '<div style="margin-top:4px;color:var(--dim)">INTERMAGNET AIA · лише завершені UTC-доби · прогноз використовує тільки лаги 1–2 дні.</div>';
  }catch(e){ globalThis.NRDiagnostics?.record('catch.49','recoverable');
    _aiaVernadsky={};
    if(sum) sum.textContent='🧲 AIA «Академік Вернадський» — дані недоступні';
    if(body) body.textContent='G не змінено. '+e.message;
  }
  return _aiaVernadsky;
}/* NR_FN_END 046 */

/* NR_FN_BEGIN 047 */async function loadBgsSpaceWeather(){
  if(_bgsSpaceWeather !== null) return _bgsSpaceWeather;
  const panel=document.getElementById('bgsAdvisoryPanel');
  const sum=document.getElementById('bgsAdvisorySummary');
  const body=document.getElementById('bgsAdvisoryBody');
  try {
    const pair=await Promise.all([
      fetch('BGS_SPACE_WEATHER_v1.json',{cache:'no-store'}),
      fetch('AUTO_FORECAST_FEED_v1.json',{cache:'no-store'}).catch(()=>{globalThis.NRDiagnostics?.record('promise.catch.6','recoverable');return (null);})
    ]);
    const r=pair[0];
    if(!r.ok) throw new Error('HTTP '+r.status);
    const b=await r.json(); _bgsSpaceWeather=b||{};
    if(pair[1] && pair[1].ok) window._autoForecastFeed=await pair[1].json();
    renderTanitaShadow();
    renderSingleFinalDecision();
    if(!b.ok) throw new Error(b.error||'invalid BGS snapshot');
    const periods=Array.isArray(b.periods)?b.periods:[];
    const flags=b.flags||{};
    const conflict=periods.some((p,i)=>{
      const ds=kyivDayKey(i);
      const f=window._autoForecastFeed && window._autoForecastFeed.days && window._autoForecastFeed.days[ds];
      return f && f.bgs_advisory && f.bgs_advisory.conflict_with_positive_model;
    });
    const bgsFetchedAt=Date.parse(b.fetched_at||''), bgsAgeHours=Number.isFinite(bgsFetchedAt)?(Date.now()-bgsFetchedAt)/3600000:null;
    const bgsStale=bgsAgeHours!==null&&bgsAgeHours>12;
    if(sum) sum.textContent='🌍 BGS 3-добовий прогноз'+(bgsStale?' · STALE знімок '+bgsAgeHours.toFixed(1)+' год':'')+(conflict?' · ⚠ конфлікт із позитивною моделлю':'')+
      (flags.storm_g1_plus?' · можливий G1':'')+
      (flags.cme?' · CME':'')+(flags.glancing_blow?' · ковзний удар':'');
    if(body) body.innerHTML=
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:5px">'+
      periods.map(p=>'<div style="padding:5px 7px;border:1px solid var(--border);border-radius:7px"><b>'+p.from+'–'+p.to+
      '</b><br>середнє: '+p.average+' · максимум: <strong style="color:'+(p.max==='QUIET'?'#9ce6c0':'#ffd37a')+'">'+p.max+'</strong></div>').join('')+
      '</div><div style="margin-top:7px">'+(b.comment||'Без додаткового коментаря.')+'</div>'+
      '<div style="margin-top:6px;color:var(--dim)">Джерело: British Geological Survey · noon-to-noon GMT · незалежний advisory · score effect 0.'+
      (bgsStale?'<div style="margin-top:3px;color:#ff9f9f">Дані BGS старші 12 год: показано лише як архівний advisory.</div>':'')+'</div>';
    if(panel && flags.storm_g1_plus) panel.open=true;
    updateSpaceWeatherDecisionGuard();
  } catch(e) { globalThis.NRDiagnostics?.record('catch.50','recoverable');
    _bgsSpaceWeather={};
    if(sum) sum.textContent='🌍 BGS advisory тимчасово недоступний';
    if(body) body.textContent='Production G не змінено. '+e.message;
    updateSpaceWeatherDecisionGuard();
  }
  return _bgsSpaceWeather;
}/* NR_FN_END 047 */

/* NR_FN_BEGIN 058 */async function loadAutoProspectiveStatus(){
  if(_autoProspectiveStatus !== null) return _autoProspectiveStatus;
  const el = document.getElementById('autoProspectiveStatus');
  try {
    const r = await fetch('AUTO_PROSPECTIVE_STATUS_v1.json', {cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const s = await r.json();
    _autoProspectiveStatus = s || {};
    const gate = s.promotion_gate || {};
    const n = Number(gate.independent_real_outcomes ?? gate.current_selected_outcomes ?? 0);
    const expertPdfN = Number(gate.expert_pdf_comparisons ?? s.selected_high_scored ?? 0);
    const need = Number(gate.required_selected_outcomes || 100);
    const created = Number(s.decisions_total || 0);
    const passed = !!gate.passed;
    const editorialTotal = Number(s.editorial_comparisons && s.editorial_comparisons.total || 0);
    const editorialConflicts = Number(s.editorial_comparisons && s.editorial_comparisons.material_disagreements || 0);
    const contextCounts = s.shadow_context_flags && s.shadow_context_flags.counts || {};
    const contextTotal = Object.values(contextCounts).reduce((a,b)=>a+Number(b||0),0);
    const tanita = s.tanita_shadow || {};
    const tanitaFormula = tanita.formula_reconstruction || {};
    const tanitaDays = Number(tanita.horizon_days_available || 0);
    if(el) el.textContent = 'Автоматичний shadow: '+created+' прогнозів заморожено · незалежних real outcomes '+n+'/'+need+
      ' · expert-PDF comparisons '+expertPdfN+' (лише відтворення, не фактична точність)'+
      (passed ? ' · promotion gate пройдено' : ' · без заяви 90% до проходження gate')+
      (editorialTotal ? ' · Expert↔Engine перевірено '+editorialTotal+', суттєвих розбіжностей '+editorialConflicts : '')+
      (contextTotal ? ' · context flags '+contextTotal+' (лише ручна перевірка, G не змінено)' : '')+
      (tanitaFormula.verified_exact ? ' · Таніта: формула '+tanitaFormula.verified_exact+'/'+tanitaFormula.dates+
        ' відтворена, image-shadow '+tanitaDays+' дн. (G не змінено)' : '');
    renderTanitaShadow();
    loadOutcomeLedgerStatus();
    loadSystemHealthStatus();
    loadModelQualityStatus();
  } catch(e) { globalThis.NRDiagnostics?.record('catch.53','recoverable');
    _autoProspectiveStatus = {};
    if(el) el.textContent = 'Автоматичний shadow: статус тимчасово недоступний; production G не змінено.';
  }
  return _autoProspectiveStatus;
}/* NR_FN_END 058 */

/* NR_FN_BEGIN 059 */async function loadTanitaReviewStatus(){
  const el=document.getElementById('tanitaReviewStatus');
  if(!el) return null;
  try{
    const r=await fetch('TANITA_REVIEW_PRIORITY_STATUS_v1.json',{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const s=await r.json(), tiers=s.tiers||{}, c=s.calendar_coverage||{};
    el.textContent='Tanita QA: календарі '+Number(c.dates||0)+'/'+Number(c.expected||730)+' дат · ручна перевірка P0 '+Number(tiers.P0||0)+', P1 '+Number(tiers.P1||0)+', P2 '+Number(tiers.P2||0)+' · непідтверджені ознаки не впливають на G (score effect '+Number(s.production_score_effect||0)+')';
    el.style.color=(c.complete&&Number(s.production_score_effect||0)===0)?'#ffd37a':'#ff7b82';
    try{
      const pr=await fetch('TANITA_P0_REVIEW_STATUS_v1.json',{cache:'no-store'});
      if(pr.ok){ const p=await pr.json(); el.textContent+=' · P0-галерея: '+Number(p.p0_items||0)+' записів / '+Number(p.source_pages||0)+' сторінок, джерела '+((p.missing_source_pages||[]).length?'НЕПОВНІ':'OK'); }
    }catch(_e){ window.NRDiagnostics?.record('legacy.catch.55','recoverable'); }
    try{ const ir=await fetch('TANITA_P0_REVIEW_IMPORT_STATUS_v1.json',{cache:'no-store'}); if(ir.ok){ const i=await ir.json(); el.textContent+=' · import: '+String(i.state||'unknown')+', labels '+Number(i.imported_labels||0)+', unclear '+Number(i.unclear_items||0); } }catch(_e){ window.NRDiagnostics?.record('legacy.catch.56','recoverable'); }
    try{ const hr=await fetch('TANITA_MANUAL_HOLDOUT_STATUS_v1.json',{cache:'no-store'}); if(hr.ok){ const h=await hr.json(); const c=h.counts||{}; el.textContent+=' · holdout: '+String(h.state||'unknown')+', '+Number(c.evaluated_test||0)+'/'+Number(c.test||0)+' test'; } }catch(_e){ window.NRDiagnostics?.record('legacy.catch.57','recoverable'); }
    return s;
  }catch(e){ globalThis.NRDiagnostics?.record('catch.54','recoverable');  el.textContent='Tanita QA: статус недоступний; непідтверджені ознаки не застосовуються'; el.style.color='#ff7b82'; return null; }
}/* NR_FN_END 059 */

/* NR_FN_BEGIN 060 */async function loadModelQualityStatus(){
  const el=document.getElementById('modelQualityBadge');
  if(!el) return null;
  const pct=v=>Number.isFinite(Number(v))?(Number(v)*100).toFixed(1)+'%':'—';
  try{
    const r=await fetch('MODEL_QUALITY_AUDIT_v1.json',{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const q=await r.json(), m=q.metrics||{}, eng=m.engine_holdout_2026||{}, xls=m.excel_formula_holdout_2026||{}, tan=m.tanita_selective_router_holdout_2026||{};
    const safe=!!(q.production_conclusion&&q.production_conclusion.safe_formula_change);
    el.innerHTML='&#128202; Holdout 2026 · Автономний Engine: '+pct(eng.strict_sign)+' знак / '+pct(eng.exact)+' exact (n='+Number(eng.n||0)+') · Excel-відтворення: '+pct(xls.strict_sign)+' знак / '+pct(xls.exact)+' exact (n='+Number(xls.n||0)+', не реальна точність) · Tanita '+pct(tan.strict_sign)+' / '+pct(tan.exact)+' (n='+Number(tan.n||0)+', SHADOW)';
    el.title='Хронологічний holdout 2026 проти verified expert PDF. Engine — автономний прогноз. Excel — відтворення експертної формули, не незалежний прогноз. Tanita — shadow, score_effect=0. Production formula change: '+(safe?'дозволено':'НЕ дозволено аудитом')+'.';
    el.style.color=safe?'#43e6a7':'#ffd37a';
    el.style.borderColor=safe?'#43e6a7':'#ffd37a';
    return q;
  }catch(e){ globalThis.NRDiagnostics?.record('catch.55','recoverable');
    el.textContent='📊 Актуальні метрики тимчасово недоступні — production G не змінено';
    el.title='MODEL_QUALITY_AUDIT_v1.json: '+e.message;
    el.style.color='#ff7b82'; el.style.borderColor='#ff7b82';
    return null;
  }
}/* NR_FN_END 060 */

/* NR_FN_BEGIN 062 */async function loadSystemHealthStatus(){
  const el=document.getElementById('systemHealthBanner');
  if(!el) return null;
  try{
    // fp387: bypass both the browser HTTP cache and an older service-worker JSON
    // entry. If the network is unavailable, retry the canonical URL so the SW can
    // still return its explicitly labelled offline fallback.
    let r;
    try{
      r=await fetch('SYSTEM_HEALTH_STATUS_v1.json?fresh='+Date.now(),{cache:'no-store'});
      if(!r.ok) throw new Error('HTTP '+r.status);
    }catch(_freshErr){ globalThis.NRDiagnostics?.record('catch.56','recoverable');
      r=await fetch('SYSTEM_HEALTH_STATUS_v1.json',{cache:'force-cache'});
    }
    if(!r.ok) throw new Error('HTTP '+r.status);
    const s=await r.json(), sourceStatus=String(s.status||'UNKNOWN').toUpperCase();
    window.__nrSystemHealth=s;
    if(typeof window.renderCompetitiveCover==='function')window.renderCompetitiveCover();
    const hard=Array.isArray(s.hard_failures)?s.hard_failures:[];
    const warns=Array.isArray(s.warnings)?s.warnings:[];
    const pairs=Number(s.checks&&s.checks.real_outcome_pairs||0);
    const awaiting=Number(s.checks&&s.checks.real_outcomes_awaiting||0);
    const tanitaAwaiting=Number(s.checks&&s.checks.tanita_real_outcome_pairs&&s.checks.tanita_real_outcome_pairs.awaiting_independent_outcomes||0);
    const manualPending=Number(s.checks&&s.checks.tanita_balanced_review&&s.checks.tanita_balanced_review.pending_visual_review||0);
    const age=Number(s.checks&&s.checks.manifest_age_hours);
    const artifactAgeHours=s.generated_at ? ((Date.now()-new Date(s.generated_at).getTime())/3600000) : Infinity;
    // fp428 O-01: health is operational telemetry (live-context cadence), not a
    // daily forecast asset. Six-hour schedule plus one hour processing grace;
    // the manifest independently retains its 36-hour publication SLA.
    const healthStale=!Number.isFinite(artifactAgeHours)||artifactAgeHours< -5/60||artifactAgeHours>7||!Number.isFinite(age)||age>36;
    const tracker=s.checks&&s.checks.prospective_tracker;
    const trackerAgeRaw=tracker&&tracker.latest_age_hours;
    const trackerFresh=!!(tracker&&trackerAgeRaw!==null&&trackerAgeRaw!==''&&Number.isFinite(Number(trackerAgeRaw))&&Number(trackerAgeRaw)<=36);
    const trackerCoverageOk=!!(tracker&&tracker.status==='PASS');
    const evidencePrefixes=['tanita_outcomes_awaiting:','tanita_balanced_review_pending:','promotion_waiting_for_prospective_outcomes','prospective_tracker_missing_dates:','prospective_tracker_outcomes_filled:'];
    const evidenceWarns=warns.filter(w=>evidencePrefixes.some(p=>String(w).startsWith(p)));
    const operationalWarns=warns.filter(w=>!evidencePrefixes.some(p=>String(w).startsWith(p)));
    if(healthStale) operationalWarns.push('health_snapshot_stale_or_missing');
    if(s.checks?.last_completed_live_context_ok===false)operationalWarns.push('last_completed_live_context_failed');
    const automationStatus=hard.length||healthStale?'FAIL':operationalWarns.length?'WARN':'PASS';
    const evidenceStatus=(!trackerCoverageOk||pairs<100)?'BLOCKED':'READY';
    const colors=automationStatus==='PASS'?['#43e6a7','rgba(67,230,167,.28)','rgba(67,230,167,.055)']:
      automationStatus==='FAIL'?['#ff7b82','rgba(255,90,100,.48)','rgba(255,90,100,.08)']:
      ['#ffd37a','rgba(255,176,32,.40)','rgba(255,176,32,.06)'];
    el.style.display='block'; el.style.color=colors[0]; el.style.borderColor=colors[1]; el.style.background=colors[2];
    const stamp=s.generated_at?new Date(s.generated_at).toLocaleString('uk-UA'):'—';
    el.innerHTML='<strong>⚙ Автоматизація: '+automationStatus+'</strong> · hard failures '+hard.length+' · operational warnings '+operationalWarns.length+
      (Number.isFinite(age)?' · manifest '+age.toFixed(1)+' год':'')+
      (Number.isFinite(artifactAgeHours)?' · health age '+artifactAgeHours.toFixed(1)+' год':' · health age невідомий')+
      ' · знімок стану '+stamp+
      (hard.length?' <div style="margin-top:4px">⛔ '+hard.map(escapeHtml).join(' · ')+'</div>':'')+
      (operationalWarns.length?' <div style="margin-top:3px;color:#ffd37a">Операційні попередження: '+operationalWarns.map(escapeHtml).join(' · ')+'</div>':'')+
      '<div style="margin-top:4px;color:#ffd37a"><strong>🧪 Докази: '+evidenceStatus+'</strong> · validated outcome pairs '+pairs+'/100 · очікують незалежних outcomes '+awaiting+' · Tanita '+tanitaAwaiting+' · наступна ручна вибірка '+manualPending+' · категорії backlog можуть перетинатися; не сумуються</div>'+
      (!trackerFresh?'<div style="margin-top:3px;color:#ff7b82">⛔ Prospective tracker не має свіжої телеметрії (поріг 36 год); promotion gate заблоковано.</div>':'')+
      (trackerFresh&&!trackerCoverageOk?'<div style="margin-top:3px;color:#ff7b82">⛔ Prospective tracker свіжий, але історичне покриття неповне ('+Number(tracker.missing_dates||0)+' пропущених дат); promotion gate заблоковано.</div>':'')+
      (sourceStatus==='WARN'&&automationStatus==='PASS'?'<div style="margin-top:3px;color:#a9bad8">Health artifact має WARN лише через evidence gates; це не збій автоматизації.</div>':'')+
      (evidenceWarns.length?' <div style="margin-top:3px;color:#a9bad8">Evidence gates: '+evidenceWarns.map(escapeHtml).join(' · ')+'</div>':'');
    try{
      const xr=await fetch('EXCEL_FORMULA_INTEGRITY_STATUS_v1.json',{cache:'no-store'});
      if(xr.ok){
        const x=await xr.json(), c=x.coverage||{}, i=x.integrity||{};
        const t=x.chronological_validation&&x.chronological_validation.test_2026_onward&&x.chronological_validation.test_2026_onward.verbatim||{};
        const pct=v=>Number.isFinite(Number(v))?(100*Number(v)).toFixed(1)+'%':'\u2014';
        el.innerHTML+='<div style="margin-top:4px;color:#a9bad8">Excel audit: '+Number(c.raw_formula_dates||0)+
          ' raw dates through '+escapeHtml(String(c.raw_formula_max||'\u2014'))+
          ' \u00b7 PDF decisions through '+escapeHtml(String(c.pdf_decision_max||'\u2014'))+
          ' \u00b7 '+Number(c.pdf_dates_after_excel_formula||0)+' PDF dates without internal Excel formula'+
          ' \u00b7 test 2026: exact '+pct(t.exact)+', у межах ±1: '+pct(t.within_1)+', sign '+pct(t.strict_sign)+
          ' \u00b7 rebuilt disagreements '+Number(i.published_vs_rebuilt_disagreements||0)+
          ' \u00b7 score effect '+Number(x.production_score_effect||0)+'</div>';
      }
    }catch(_e){ window.NRDiagnostics?.record('legacy.catch.58','recoverable'); }
    return s;
  }catch(e){ globalThis.NRDiagnostics?.record('catch.57','recoverable');
    el.style.display='block'; el.style.color='#ff7b82'; el.style.borderColor='rgba(255,90,100,.48)';
    window.__nrSystemHealth=null;
    if(typeof window.renderCompetitiveCover==='function')window.renderCompetitiveCover();
    el.textContent='⚙ Стан автоматизації недоступний: '+e.message; return null;
  }
}/* NR_FN_END 062 */

/* NR_FN_BEGIN 063 */async function loadOutcomeLedgerStatus(){
  const el=document.getElementById('autoProspectiveStatus');
  if(!el) return null;
  try{
    const r=await fetch('OUTCOME_LEDGER_STATUS_v1.json',{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const s=await r.json(), real=s.real_outcomes||{}, expert=s.expert_reproduction||{};
    const paired=Number(real.paired_with_frozen_prediction||0), need=Number(real.required_for_promotion_gate||100);
    const rows=Number(real.unique_dates||real.chrono_rows_total||0), en=Number(expert.n||0);
    el.textContent += ' \u00b7 Реальні outcomes '+paired+'/'+need+' (Chrono: '+rows+' унікальних дат) \u00b7 PDF-мітки n='+en+' — лише відтворення експерта, не фактична точність';
    try {
      const gr=await fetch('SHADOW_MODEL_PROMOTION_STATUS_v1.json',{cache:'no-store'});
      if(gr.ok){
        const g=await gr.json(), t=g.tanita||{}, c=g.nonlinear_calendar_interaction||{};
        const signPct=Number(t.strong_historical_subset&&t.strong_historical_subset.strict_sign);
        el.textContent += ' \u00b7 Tanita strong: '+Number(t.strong_historical_subset&&t.strong_historical_subset.n||0)+
          ' dates, sign '+(Number.isFinite(signPct)?(signPct*100).toFixed(1)+'%':'--')+
          '; prospective '+Number(t.prospective_real_outcomes||0)+'/'+Number(t.required_prospective_real_outcomes||100)+
          ' \u00b7 nonlinear calendar: '+(c.historical_gate_passed?'candidate passed':'not confirmed')+
          ' (score effect 0)';
      }
    } catch(_e){ window.NRDiagnostics?.record('legacy.catch.59','recoverable'); }
    return s;
  }catch(e){ globalThis.NRDiagnostics?.record('catch.58','recoverable');
    el.textContent += ' \u00b7 журнал реальних outcomes тимчасово недоступний';
    return null;
  }
}/* NR_FN_END 063 */

/* NR_FN_BEGIN 064 */async function loadStrongRawPolicy(force = false){
  if(!force && _strongRawPolicy !== null) return _strongRawPolicy;
  const token=_beginAuthority('policy');
  try {
    const r=await token.fetch('SELECTIVE_POLICY_STRONG_RAW_v2.json',{cache:'no-store'});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const p=await r.json();
    if(!p || p.condition!=='abs(expert_raw_sum) >= 3' || Number(p.score_effect)!==0)throw new Error('invalid policy');
    _commitAuthority(token,()=>{_strongRawPolicy=p;_authoritySuccess(token);});
  }catch(e){ globalThis.NRDiagnostics?.record('catch.59','recoverable'); _authorityFailure(token,e);}finally{token.finish();}
  return _strongRawPolicy;
}/* NR_FN_END 064 */

/* NR_FN_BEGIN 065 */async function loadExpertCalc(force = false){
  if(!force && _expertCalc !== null) return _expertCalc;
  const token=_beginAuthority('calc');
  try {
    const resp=await token.fetch('expert_calc_scores.json',{cache:'default'});
    if(!resp.ok)throw new Error('HTTP '+resp.status);
    const data=await resp.json();
    if(!data || !data.scores || typeof data.scores!=='object' || Array.isArray(data.scores))throw new Error('invalid scores');
    _commitAuthority(token,()=>{
      _expertCalc=data.scores;
      window._expertCalcLoadStatus=Object.keys(_expertCalc).length?'loaded':'invalid';
      _authoritySuccess(token);
    });
  }catch(e){ globalThis.NRDiagnostics?.record('catch.60','recoverable');
    _authorityFailure(token,e);
    if(token.current())window._expertCalcLoadStatus=_expertCalc?'stale':'missing';
  }finally{token.finish();}
  return _expertCalc;
}/* NR_FN_END 065 */

/* NR_FN_BEGIN 066 */async function loadExpertOverrides(force = false){
  if(!force && _expertOverrides !== null && window._expertOverridesLoadStatus==='loaded') return _expertOverrides;
  const token=_beginAuthority('overrides');
  try {
    const {data,delivery}=await _readOverrideDocument(token);
    const fileOverrides={},rejected=[];
    for(const row of data.overrides){
      const score=_strictDayScore(row?.expert_eng);
      if(row?.date && score!==null)fileOverrides[row.date]={...row,expert_eng:score};
      else rejected.push({date:row?.date||null,reason:'invalid_discrete_score'});
    }
    _commitAuthority(token,()=>{
      _fileOverrides=fileOverrides;_publishExpertOverrides();
      window.__overridesRejected=rejected;
      window._expertOverridesDelivery=delivery;
      window._expertOverridesLoadStatus='loaded';_authoritySuccess(token);
      if(delivery==='offline_fallback')window.__authoritySourceState.overrides.stale=true;
    });
  }catch(e){ globalThis.NRDiagnostics?.record('catch.61','recoverable');
    _authorityFailure(token,e);
    if(token.current()){
      _publishExpertOverrides();
      window._expertOverridesLoadStatus=Object.keys(_expertOverrides).length?'stale':'missing';
    }
  }finally{token.finish();}
  return _expertOverrides;
}/* NR_FN_END 066 */

/* NR_FN_BEGIN 067 */async function loadDailyMaster(){
  if(_dailyMaster !== null) return _dailyMaster;
  try {
    const resp = await fetch('daily_master.json', { cache: 'no-store' });
    if(!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    const meta = data && data.meta || {};
    const contractOk = meta.target_contract === 'independent_real_outcome' &&
      Number(meta.independent_real_outcome_pairs || 0) > 0;
    if(!contractOk){
      console.warn('[target-contract] daily_master disabled: pseudo-prospective reliability is not an independent outcome metric');
      _dailyMaster = {};
      return _dailyMaster;
    }
    _dailyMaster = data.days || {};
  } catch(e){ globalThis.NRDiagnostics?.record('catch.62','recoverable');
    if(window._DEBUG) console.warn('[target-contract] daily_master.json unavailable:', e.message);
    _dailyMaster = {};
  }
  return _dailyMaster;
}/* NR_FN_END 067 */

/* NR_FN_BEGIN 072 */async function loadBulletinV2(){
  if(_bulletinV2 !== null) return _bulletinV2;
  try {
    const resp = await fetch('bulletin_v2.json', { cache: 'default' });
    if(!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    _bulletinV2 = data.days || [];
  } catch(e){ globalThis.NRDiagnostics?.record('catch.67','recoverable');
    if(window._DEBUG) console.warn('[fp87] bulletin_v2.json not available:', e.message);
    _bulletinV2 = [];
  }
  return _bulletinV2;
}/* NR_FN_END 072 */

/* NR_FN_BEGIN 074 */async function loadChronoPanel(){
  if(_chronoPanel !== null) return _chronoPanel;
  try {
    const resp = await fetch('chrono_panel.json', { cache: 'default' });
    if(!resp.ok) throw new Error('HTTP ' + resp.status);
    _chronoPanel = await resp.json();
  } catch(e){ globalThis.NRDiagnostics?.record('catch.68','recoverable');
    if(window._DEBUG) console.warn('[fp87] chrono_panel.json not available:', e.message);
    _chronoPanel = null;
  }
  return _chronoPanel;
}/* NR_FN_END 074 */

/* NR_FN_BEGIN 076 */async function loadEngineScores(force = false){
  if(!force && _engineScores !== null) return _engineScores;
  const token=_beginAuthority('engine');
  if(window.EngineTagParser && !window._engineTagAliasSpec){
    try {
      const aliases=await window.EngineTagParser.loadAliasSpec('./engine_tag_aliases_v1.json');
      if(token.current())window._engineTagAliasSpec=aliases;
    } catch(aliasErr) { globalThis.NRDiagnostics?.record('catch.69','recoverable');
      console.warn('[engine-tags] alias spec unavailable; legacy UI fallback active:', aliasErr.message);
    }
  }
  try {
    const resp = await token.fetch('engine_scores.json', { cache: 'default' });
    if(!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    const scores = data.scores || {};
    for(const entry of Object.values(scores)){
      if(entry && typeof entry==='object') entry._frozenInputKp=entry.kp;
    }
    const referenceCached=resp.headers?.get('x-gindex-delivery')==='cached';

    if(window._DEBUG) console.log('[v87.61] engine_scores loaded: ' + Object.keys(scores).length + ' days, v' + (data.version || '?'));
    // v88.8.35-fp56-P8: override synthetic Kp with REAL Kp from future_kp.json (27DO).
    // Не міняє eng-score (frozen tag-based), лише замінює відображуваний Kp і знімає synthetic-мітку,
    // де є реальні дані. Це усуває "Kp=2.0 synthetic" на майбутніх датах без бюлетеня.
    try {
      const fkp = await loadFutureKp();
      if(fkp && Object.keys(fkp).length){
        let _patched = 0;
        for(const ds in scores){
          const e = scores[ds];
          if(e && e.kp_synthetic === true && fkp[ds] && fkp[ds].kp_synthetic === false && Number.isFinite(kpDayTerm(fkp[ds].kp))){
            e.kp = fkp[ds].kp;
            e.kp_synthetic = false;
            e.kp_source = fkp[ds].source || '27do';
            e.kp_real_from_future = true;
            _patched++;
          }
        }
        if(window._DEBUG && _patched) console.log('[fp56-P8] real Kp applied to ' + _patched + ' synthetic days');
      }
    } catch(_e){ globalThis.NRDiagnostics?.record('catch.70','recoverable');  if(window._DEBUG) console.warn('[fp56-P8] future_kp apply failed:', _e.message); }
    // v88.8.35-fp56-P8: annual_2026_27.json — астрономічний каркас (Swiss Ephemeris, звірено drikpanchang 10.06.2026).
    // Для дат ПОЗА engine_scores (2027+) даємо cal_score як попередній бал з міткою annual_fallback.
    // Це НЕ рішення дня — лише каркас до появи бюлетеня/engine. Freeze не порушено (окремий файл).
    try {
      const ar = await token.fetch('annual_2026_27.json', { cache: 'default' });
      if(ar.ok){
        const aj = await ar.json();
        // fp77: nakshatra name→number (1-27). annual_2026_27 uses abbreviated forms.
        const _NAK_MAP = {
          'Ashwini':1,'Bharani':2,'Krittika':3,'Rohini':4,'Mrigashira':5,
          'Ardra':6,'Punarvasu':7,'Pushya':8,'Ashlesha':9,'Magha':10,
          'P.Phalguni':11,'Purva Phalguni':11,'U.Phalguni':12,'Uttara Phalguni':12,
          'Hasta':13,'Chitra':14,'Swati':15,'Vishakha':16,'Anuradha':17,
          'Jyeshtha':18,'Mula':19,
          'P.Ashadha':20,'Purva Ashadha':20,'U.Ashadha':21,'Uttara Ashadha':21,
          'Shravana':22,'Dhanishta':23,'Dhanishtha':23,'Shatabhisha':24,
          'P.Bhadrapada':25,'Purva Bhadrapada':25,'U.Bhadrapada':26,'Uttara Bhadrapada':26,
          'Revati':27
        };
        let _added = 0, _enriched = 0;
        for(const day of (aj.days||[])){
          const _nakNum = _NAK_MAP[day.nakshatra] || null;
          if(!scores[day.date]){
            scores[day.date] = { eng: day.cal_score, pdf: null, tag: '',
              kp: null, kp_synthetic: false, annual_fallback: true,
              cal_score: day.cal_score, cal_symbols: day.symbols||[],
              cal_tithi: day.tithi_n, cal_nakshatra: _nakNum,
              annual_tithi: day.tithi, annual_nakshatra: day.nakshatra };
            _added++;
          } else {
            // fp77: enrich existing entries with Panchanga display fields.
            // Does NOT override eng/pdf/tag/kp/cal_score/cal_symbols (freeze-safe).
            const e = scores[day.date];
            if(!e.annual_tithi)     e.annual_tithi    = day.tithi;
            if(!e.annual_nakshatra) e.annual_nakshatra = day.nakshatra;
            if(!e.cal_tithi)        e.cal_tithi       = day.tithi_n;
            if(!e.cal_nakshatra && _nakNum) e.cal_nakshatra = _nakNum;
            if(!e.annual_yoga)      e.annual_yoga      = day.yoga;
            if(!e.annual_phrases)   e.annual_phrases   = day.phrases||[];
            _enriched++;
          }
        }
        if(window._DEBUG) console.log('[fp77] annual: +' + _added + ' fallback, +' + _enriched + ' enriched (nak+tithi added)');
      }
    } catch(_e){ globalThis.NRDiagnostics?.record('catch.71','recoverable');  if(window._DEBUG) console.warn('[fp56-P8] annual load failed:', _e.message); }
    if(!token.current())return _engineScores;
    _commitAuthority(token,()=>{
    _engineScores=scores;
    window.__referenceSourceState={mode:referenceCached?'cached':'live',stale:referenceCached,loadedAt:Date.now(),reason:referenceCached?'sw_offline_fallback':'network'};
    window.__engineRetryCount=0;_authoritySuccess(token);
    // V25-fu30: check expiration — show banner if scores expire soon
    try {
      const todayKey = todayKyivStr();
      const today = kyivDayDate(0);
      const futureDates = Object.keys(_engineScores)
        .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= todayKey);
      if(futureDates.length > 0){
        const maxDate = futureDates.sort().pop();
        const maxDt = new Date(maxDate+'T12:00:00Z');
        const daysRemaining = Math.round((maxDt - today) / 86400000);
        if(daysRemaining < 30 && !document.getElementById('engineExpirationBanner')){
          const banner = document.createElement('div');
          banner.id = 'engineExpirationBanner';
          banner.style.cssText = 'margin:0 0 10px;padding:10px 14px;border-radius:12px;'
            + 'border:1px solid rgba(255,170,51,.45);'
            + 'background:linear-gradient(180deg,rgba(255,170,51,.10),rgba(255,170,51,.04));'
            + 'font-size:12px;color:#ffaa33';
          banner.innerHTML = '⚠ <strong>Engine scores expire in ' + daysRemaining
            + ' days</strong> (last covered: ' + maxDate + '). Engine v18.5 has no forecasts beyond this date — extend dataset before expiration.';
          // Insert after backtestBanner if it exists, else at top of main container
          const target = document.getElementById('backtestBanner') || document.querySelector('main') || document.body;
          if(target && target.parentNode){
            target.parentNode.insertBefore(banner, target.nextSibling);
          }
          console.warn('[V25-fu30] Engine scores expire in ' + daysRemaining + ' days');
        }
      } else if(Object.keys(_engineScores).length > 0){
        // No future dates at all — engine fully expired
        if(!document.getElementById('engineExpirationBanner')){
          const banner = document.createElement('div');
          banner.id = 'engineExpirationBanner';
          banner.style.cssText = 'margin:0 0 10px;padding:10px 14px;border-radius:12px;'
            + 'border:1px solid rgba(255,107,107,.55);'
            + 'background:linear-gradient(180deg,rgba(255,107,107,.12),rgba(255,107,107,.04));'
            + 'font-size:12px;color: var(--bad)';
          banner.innerHTML = '🚨 <strong>Engine scores fully expired</strong> — no forecasts available for today or future. Showing live Hero G only.';
          const target = document.getElementById('backtestBanner') || document.querySelector('main') || document.body;
          if(target && target.parentNode){
            target.parentNode.insertBefore(banner, target.nextSibling);
          }
          console.error('[V25-fu30] Engine scores fully expired');
        }
      }
    } catch(expErr){ globalThis.NRDiagnostics?.record('catch.72','recoverable');
      console.warn('[V25-fu30] expiration check failed:', expErr.message);
    }
    });
    return _engineScores;
  } catch(e){ globalThis.NRDiagnostics?.record('catch.73','recoverable');
    _authorityFailure(token,e);
    if(!token.current())return _engineScores;
    console.warn('[v87.61] engine_scores.json fetch failed:', e.message);
    window.__referenceSourceState = {mode:_engineScores?'cached':'unavailable', stale:true, loadedAt:window.__referenceSourceState?.loadedAt||null, reason:String(e.message||'fetch_failed')};
    window.__engineRetryCount = Number(window.__engineRetryCount||0) + 1;
    if (window.__engineRetryCount <= 3) {
      setTimeout(() => { loadEngineScores(true).then(() => {
        try { syncV702UI(); syncHero(); _renderHeroHierarchy(); } catch(_eRefresh){ window.NRDiagnostics?.record('legacy.catch.70','recoverable'); }
      }); }, Math.min(30000, 2000 * Math.pow(2, window.__engineRetryCount-1)));
    }
    return _engineScores;
  } finally {token.finish();}
}/* NR_FN_END 076 */

/* NR_FN_BEGIN 090 */function fetchWithTimeout(url, ms=5000){
  const ctrl = new AbortController();
  const tid = setTimeout(()=>ctrl.abort(), ms);
  return fetch(url, {cache:'no-store', signal:ctrl.signal}).finally(()=>clearTimeout(tid));
}/* NR_FN_END 090 */

/* NR_FN_BEGIN 092 */function _playContextSourceBlocked(url){
  if(!window.GINDEX_PLAY_CHANNEL)return false;
  let decoded=String(url);
  for(let i=0;i<3;i++){try{const next=decodeURIComponent(decoded);if(next===decoded)break;decoded=next;}catch(_e){ globalThis.NRDiagnostics?.record('catch.76','recoverable'); break;}}
  return /(?:https?:)?\/\/(?:www\.)?(?:sidc\.be|gi\.alaska\.edu)\.?(?=[:/?#]|$)/i.test(decoded);
}/* NR_FN_END 092 */

/* NR_FN_BEGIN 093 */function fetchTextWithCORS(url,validate,options={}){
  const controller=new AbortController(),parent=options.signal;
  const cancel=()=>controller.abort();
  if(parent?.aborted)cancel();else parent?.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(cancel,options.timeoutMs||17500);
  const cancelled=()=>{if(controller.signal.aborted)throw new DOMException('Request cancelled','AbortError');};
  const valid=text=>typeof text==='string'&&text.length>0&&(typeof validate!=='function'||validate(text));
  const request=(async()=>{
    if(_playContextSourceBlocked(url))throw new Error('PLAY_SOURCE_POLICY: external SILSO/UAF fallback disabled');
    const candidates=[];
    if(options.directOnly)candidates.push([url,options.timeoutMs||4000]);
    else {
    if(NOAA_WORKER_URL&&!NOAA_WORKER_URL.includes('YOUR_USERNAME'))candidates.push([NOAA_WORKER_URL+encodeURIComponent(url),3000]);
    candidates.push([url,4000]);
    if(!window.GINDEX_PLAY_CHANNEL)candidates.push(['https://api.allorigins.win/raw?url='+encodeURIComponent(url),2500]);
    candidates.push(['https://corsproxy.io/?url='+encodeURIComponent(url),2500],['https://proxy.corsfix.com/?'+encodeURIComponent(url),2500]);
    if(!window.GINDEX_PLAY_CHANNEL)candidates.push(['https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(url),2500]);
    }
    for(const [endpoint,limit] of candidates){
      cancelled();const attempt=new AbortController();let rejectAbort;
      const stop=()=>{attempt.abort();rejectAbort?.(new DOMException('Request cancelled','AbortError'));};
      controller.signal.addEventListener('abort',stop,{once:true});
      const expired=new Promise((_,reject)=>{rejectAbort=reject;});
      const attemptTimer=setTimeout(stop,limit);
      window.__networkRequests=window.__networkRequests||{active:0,started:0,finished:0};
      window.__networkRequests.active++;window.__networkRequests.started++;
      try{
        const text=await Promise.race([(async()=>{const r=await fetch(endpoint,{cache:'no-store',signal:attempt.signal});if(!r.ok)throw new Error('HTTP '+r.status);return r.text();})(),expired]);
        cancelled();if(valid(text))return text;
      }catch(e){ globalThis.NRDiagnostics?.record('catch.77','recoverable'); cancelled();if(window._DEBUG)console.warn('[CORS]',e.message);}
      finally{clearTimeout(attemptTimer);controller.signal.removeEventListener('abort',stop);window.__networkRequests.active--;window.__networkRequests.finished++;}
    }
    throw new Error('Всі проксі недоступні: '+url.slice(0,80));
  })().finally(()=>{clearTimeout(timer);parent?.removeEventListener('abort',cancel);});
  request.cancel=cancel;return request;
}/* NR_FN_END 093 */

/* NR_FN_BEGIN 096 */function parseIcsDate(s){
  if(!s) return null;
  const m1 = s.match(/(\d{8})(?:T(\d{6})Z?)?/);
  if(m1){
    const y = m1[1].slice(0,4), mo = m1[1].slice(4,6), d = m1[1].slice(6,8);
    if(!m1[2]) return new Date(`${y}-${mo}-${d}T00:00:00Z`);
    const hh = m1[2].slice(0,2), mm = m1[2].slice(2,4), ss = m1[2].slice(4,6);
    return new Date(`${y}-${mo}-${d}T${hh}:${mm}:${ss}Z`);
  }
  const dt = new Date(s);
  return isNaN(dt) ? null : dt;
}/* NR_FN_END 096 */

/* NR_FN_BEGIN 098 */function parseICS(text){
  const lines = unfoldIcs(text);
  const events = [];
  let cur = null;
  for(const ln of lines){
    if(ln.startsWith('BEGIN:VEVENT')) cur = {};
    else if(ln.startsWith('END:VEVENT')) {
      if(cur.DTSTART && cur.SUMMARY) events.push(cur);
      cur = null;
    }else if(cur){
      const p = ln.indexOf(':');
      if(p>0){
        const key = ln.slice(0,p).split(';')[0].trim();
        const val = ln.slice(p+1).trim();
        if(key==='SUMMARY') cur.SUMMARY = val;
        if(key==='DTSTART') cur.DTSTART = val;
        if(key==='DTEND')   cur.DTEND   = val;
      }
    }
  }
  const out = [];
  for(const e of events){
    const ds = parseIcsDate(e.DTSTART);
    const de = e.DTEND ? parseIcsDate(e.DTEND) : null;
    for(const d of expandDateRangeUTC(ds,de)){
      out.push({date: fmtDate(d), summary: e.SUMMARY});
    }
  }
  return out;
}/* NR_FN_END 098 */

/* NR_FN_BEGIN 119 */function parseNoaaJson(text){
  const normalized = String(text||'').replace(/([:\[,]\s*)(?:NaN|-?Infinity)(?=\s*[,}\]])/g, '$1null');
  return JSON.parse(normalized);
}/* NR_FN_END 119 */

/* NR_FN_BEGIN 120 */function _looksLikeNoaaArray(text){
  try { return Array.isArray(parseNoaaJson(text)); } catch(_e) { globalThis.NRDiagnostics?.record('catch.85','recoverable');  return false; }
}/* NR_FN_END 120 */

/* NR_FN_BEGIN 121 */async function fetchBzNow(signal){
  const url = 'https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json';
  let text;
  try { text = await fetchTextWithCORS(url, _looksLikeNoaaArray,{signal}); } catch(e){ globalThis.NRDiagnostics?.record('catch.86','recoverable');  console.warn('[v42] Bz fetch failed',e); return null; }
  try {
    const rows = parseNoaaJson(text);
    if(!Array.isArray(rows)||rows.length<1){ console.warn('[v42] Bz: unexpected format'); return null; }
    const preferred=rows.find(r=>r&&r.active===true&&isFinite(parseFloat(r.bz_gsm)))||
                    rows.find(r=>r&&isFinite(parseFloat(r.bz_gsm)));
    if(preferred){
      const bz=parseFloat(preferred.bz_gsm);
      lastBz=bz; lastBzTime=preferred.time_tag;
      if(window._DEBUG) console.log('[fp269] RTSW Bz OK:',bz,'@',preferred.time_tag);
      return {bz,time:preferred.time_tag};
    }
  } catch(e){ globalThis.NRDiagnostics?.record('catch.87','recoverable');  console.warn('[v42] Bz parse failed',e); }
  return null;
}/* NR_FN_END 121 */

/* NR_FN_BEGIN 122 */async function fetchVswNow(signal){
  const url = 'https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json';
  let text;
  try { text = await fetchTextWithCORS(url, _looksLikeNoaaArray,{signal}); } catch(e){ globalThis.NRDiagnostics?.record('catch.88','recoverable');  console.warn('[v42] Vsw fetch failed',e); return null; }
  try {
    const rows = parseNoaaJson(text);
    if(!Array.isArray(rows)||rows.length<1){ console.warn('[v42] Vsw: unexpected format'); return null; }
    const preferred=rows.find(r=>r&&r.active===true&&isFinite(parseFloat(r.proton_speed)))||
                    rows.find(r=>r&&isFinite(parseFloat(r.proton_speed)));
    if(preferred){
      const vsw=parseFloat(preferred.proton_speed);
      lastVsw=vsw; lastVswTime=preferred.time_tag;
      if(window._DEBUG) console.log('[fp269] RTSW Vsw OK:',vsw,'@',preferred.time_tag);
      return {vsw,time:preferred.time_tag};
    }
  } catch(e){ globalThis.NRDiagnostics?.record('catch.89','recoverable');  console.warn('[v42] Vsw parse failed',e); }
  return null;
}/* NR_FN_END 122 */

/* NR_FN_BEGIN 123 */async function fetchXrayNow(signal){
  const url = 'https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json';
  // fp378: prefer the scheduler-validated same-origin snapshot. Browser CORS
  // proxies are only a fallback and must not be the primary availability path.
  try {
    const localResp = await fetch('SPACE_WEATHER_CONTEXT_v1.json', {cache:'no-store',signal});
    if(localResp.ok){
      const localPayload = await localResp.json();
      if(signal?.aborted)return null;
      const localXray = localPayload && localPayload.xray || {};
      const localFlux = parseFloat(localXray.flux_w_m2);
      const localTime = Date.parse(localXray.latest_time || '');
      const localAgeH = Number.isFinite(localTime) ? Math.max(0, (Date.now()-localTime)/3600000) : Infinity;
      if(Number.isFinite(localFlux) && localFlux >= 0 && /^[ABCMX]\d+(?:\.\d+)?$/.test(String(localXray.class||'')) && localAgeH <= 8){
        window._lastXray = {
          flux: localFlux,
          class: String(localXray.class),
          time: localXray.latest_time,
          _delivery: 'same_origin_snapshot'
        };
        return window._lastXray;
      }
    }
  } catch(e) { globalThis.NRDiagnostics?.record('catch.90','recoverable');
    if(window._DEBUG) console.warn('[xray] same-origin snapshot unavailable:', e.message);
  }
  let text;
  try { text = await fetchTextWithCORS(url, _looksLikeNoaaArray,{signal}); } catch(e){ globalThis.NRDiagnostics?.record('catch.91','recoverable');  console.warn('[v87.15] Xray fetch failed',e); return null; }
  try {
    const rows = parseNoaaJson(text);
    if(!Array.isArray(rows)||rows.length===0) return null;
    // Шукаємо останній long-wave (0.1-0.8nm) запис з валідним flux
    for(let i=rows.length-1;i>=0;i--){
      const r = rows[i];
      if(r.energy === '0.1-0.8nm' && isFinite(parseFloat(r.flux))){
        const flux = parseFloat(r.flux);
        // Classify letter
        let cls='A', mag=flux*1e8;
        if(flux >= 1e-4){ cls='X'; mag=flux*1e4; }
        else if(flux >= 1e-5){ cls='M'; mag=flux*1e5; }
        else if(flux >= 1e-6){ cls='C'; mag=flux*1e6; }
        else if(flux >= 1e-7){ cls='B'; mag=flux*1e7; }
        const classStr = cls + mag.toFixed(1);
        window._lastXray = { flux, class: classStr, time: r.time_tag };
        return window._lastXray;
      }
    }
  } catch(e){ globalThis.NRDiagnostics?.record('catch.92','recoverable');  console.warn('[v87.15] Xray parse failed',e); }
  return null;
}/* NR_FN_END 123 */

/* NR_FN_BEGIN 144 */async function fetchGfzKpAsNoaaFormat(daysBack,signal){
  const _days = isFinite(daysBack) ? daysBack : 3;
  const end = new Date();
  const start = new Date(end.getTime() - _days * 86400000);
  // ISO without ms для GFZ API
  const _fmt = d => d.toISOString().slice(0,19) + 'Z';
  const url = `https://kp.gfz.de/app/json/?start=${_fmt(start)}&end=${_fmt(end)}&index=Kp&status=now`;
  const text = await fetchTextWithCORS(url,undefined,{signal});
  let data;
  try { data = JSON.parse(text); } catch(e) { globalThis.NRDiagnostics?.record('catch.97','recoverable');  throw new Error('GFZ JSON parse: '+e.message); }
  if (!data || !Array.isArray(data.datetime) || !Array.isArray(data.Kp)) {
    throw new Error('GFZ format invalid (no datetime/Kp arrays)');
  }
  if (data.datetime.length !== data.Kp.length) {
    throw new Error('GFZ length mismatch: '+data.datetime.length+' vs '+data.Kp.length);
  }
  // Build NOAA-compatible rows
  const out = [['time_tag','Kp','a_running']];
  for (let i = 0; i < data.datetime.length; i++) {
    const t = data.datetime[i];
    const k = parseFloat(data.Kp[i]);
    if (!t || !isFinite(k) || k < 0) continue;
    // GFZ datetime: "2026-05-11T06:00:00Z" → NOAA: "2026-05-11 06:00:00"
    const tNoaa = String(t).replace('T',' ').replace('Z','').replace(/\.\d+/,'');
    out.push([tNoaa, k, null]);
  }
  if (out.length < 2) throw new Error('GFZ empty after filter');
  return JSON.stringify(out);
}/* NR_FN_END 144 */

/* NR_FN_BEGIN 145 */function parseKpObsJSON(json){
  let rows;
  try{ rows = JSON.parse(json); }catch(e){ globalThis.NRDiagnostics?.record('catch.98','recoverable');  return {kNow:null,aNow:null,whenText:null,kPrev3h:null,kp24hAgo:null}; }
  if(!Array.isArray(rows)||!rows.length) return {kNow:null,aNow:null,whenText:null,kPrev3h:null,kp24hAgo:null};
  // v59: підтримка обох форматів: масив масивів і масив об'єктів
  let data;
  if(typeof rows[0] === 'object' && !Array.isArray(rows[0])){
    // Формат об'єктів: [{time_tag, Kp, a_running}]
    data = rows.filter(r=>r.Kp!=null&&r.Kp!=='');
    if(!data.length) return {kNow:null,aNow:null,whenText:null,kPrev3h:null,kp24hAgo:null};
    const last = data[data.length-1];
    const kNow = parseFloat(last.Kp);
    const aNow = last.a_running!=null ? parseInt(last.a_running,10) : null;
    const whenText = last.time_tag ? last.time_tag+' UTC' : null;
    const prev = data.length>=2 ? data[data.length-2] : null;
    const kPrev3h = prev ? parseFloat(prev.Kp) : null;
    const prev24h = data.length>=9 ? data[data.length-9] : null;
    const kp24hAgo = prev24h ? parseFloat(prev24h.Kp) : null;
    return {kNow:isFinite(kNow)?kNow:null, aNow, whenText, kPrev3h:isFinite(kPrev3h)?kPrev3h:null, kp24hAgo:isFinite(kp24hAgo)?kp24hAgo:null};
  }
  // Формат масивів: [["time_tag","Kp",...],...]
  if(rows.length<2) return {kNow:null,aNow:null,whenText:null,kPrev3h:null,kp24hAgo:null};
  data = rows.slice(1).filter(r=>r[1]!=null&&r[1]!=='');
  if(!data.length) return {kNow:null,aNow:null,whenText:null,kPrev3h:null,kp24hAgo:null};
  const last = data[data.length-1];
  const kNow = parseFloat(last[1]);
  const aNow = last[2]!=null ? parseInt(last[2],10) : null;
  const whenText = last[0] ? last[0]+' UTC' : null;
  const prev = data.length>=2 ? data[data.length-2] : null;
  const kPrev3h = prev ? parseFloat(prev[1]) : null;
  const prev24h = data.length>=9 ? data[data.length-9] : null;
  const kp24hAgo = prev24h ? parseFloat(prev24h[1]) : null;
  return {kNow:isFinite(kNow)?kNow:null, aNow, whenText, kPrev3h:isFinite(kPrev3h)?kPrev3h:null, kp24hAgo:isFinite(kp24hAgo)?kp24hAgo:null};
}/* NR_FN_END 145 */

/* NR_FN_BEGIN 146 */function parseWolfSn(json){
  try{
    const raw = String(json || '').trim();
    if(!raw) return null;
    if(raw[0] === '[' || raw[0] === '{'){
      const rows = JSON.parse(raw);
      if(!Array.isArray(rows)||!rows.length) return null;
      const last = rows[rows.length-1];
      const sn = parseFloat(last[4]);
      const dateStr = `${last[0]}-${String(last[1]).padStart(2,'0')}-${String(last[2]).padStart(2,'0')}`;
      return isFinite(sn) ? {sn, dateStr, provisional: last[7]===1} : null;
    }
    // Official SILSO semicolon-delimited daily/monthly files. Ignore the -1
    // missing sentinel and walk back to the newest valid observation.
    const lines = raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    for(let i=lines.length-1;i>=0;i--){
      const c = lines[i].split(';').map(s=>s.trim());
      if(c.length < 5) continue;
      const isDaily = c.length >= 8;
      const sn = Number(isDaily ? c[4] : c[3]);
      if(!Number.isFinite(sn) || sn < 0) continue;
      const y=Number(c[0]), m=Number(c[1]), d=isDaily?Number(c[2]):1;
      if(!Number.isInteger(y)||!Number.isInteger(m)||!Number.isInteger(d)) continue;
      const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const provisional = isDaily ? Number(c[7]) === 1 : true;
      return {sn,dateStr,provisional};
    }
    return null;
  }catch(e){ globalThis.NRDiagnostics?.record('catch.99','recoverable');  return null; }
}/* NR_FN_END 146 */

/* NR_FN_BEGIN 148 */function parseWolfSnStatus(json){
  try{
    const status = JSON.parse(json);
    const latest = status && status.latest_observation;
    const sn = Number(latest && latest.sn);
    const dateStr = String((latest && latest.date) || '');
    if(!Number.isFinite(sn) || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    return {
      sn, dateStr, provisional: latest.provisional === true,
      _delivery:'local_snapshot', _refreshStatus:String(status.status||'UNKNOWN'),
      _generatedAt:String(status.generated_at_utc||'')
    };
  }catch(_e){ globalThis.NRDiagnostics?.record('catch.100','recoverable');  return null; }
}/* NR_FN_END 148 */

/* NR_FN_BEGIN 149 */async function fetchWolfSnResilient(signal){
  try{
    const text=await fetchTextWithCORS(URL_WOLF_SN_STATUS+'?v='+Date.now(),undefined,{signal,timeoutMs:2500,directOnly:true});
    const parsed=parseWolfSnStatus(text);
    if(parsed)return parsed;
  }catch(e){ globalThis.NRDiagnostics?.record('catch.101','recoverable');  if(window._DEBUG) console.warn('[SILSO] local snapshot unavailable:',e.message); }
  if(window.GINDEX_PLAY_CHANNEL)throw new Error('SILSO local snapshot unavailable; external fallback disabled in Play');
  for(const url of [URL_WOLF_SN, URL_WOLF_SN_FB]){
    try{
      const parsed = parseWolfSn(await fetchTextWithCORS(url,_looksLikeSilso,{signal}));
      if(parsed) return {...parsed,_delivery:'direct_or_proxy'};
    }catch(_e){ window.NRDiagnostics?.record('legacy.catch.85','recoverable'); }
  }
  throw new Error('SILSO snapshot and live endpoints unavailable');
}/* NR_FN_END 149 */

/* NR_FN_BEGIN 150 */function parseUafAurora(html){
  if(!html || typeof html !== 'string') return null;
  // Reject malformed source values before conversion loses their original text.
  const sourceKp = value => {
    if (typeof value !== 'number' && typeof value !== 'string') return NaN;
    if (typeof value === 'string' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) return NaN;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= 9 ? n : NaN;
  };
  try{
    // v88.6.9.1: bracket-balanced JSON array extraction (regex з [^[\]] не справляється з nested)
    const matches = [];
    let i = 0;
    while(i < html.length){
      // Шукаємо '[{' — початок JSON array з об'єктами
      const openIdx = html.indexOf('[{', i);
      if(openIdx < 0) break;
      // Балансуємо дужки
      let depth = 0, end = -1;
      for(let j = openIdx; j < html.length; j++){
        const c = html[j];
        if(c === '[' || c === '{') depth++;
        else if(c === ']' || c === '}'){
          depth--;
          if(depth === 0){ end = j+1; break; }
        }
      }
      if(end < 0){ i = openIdx + 1; continue; }
      const candidate = html.slice(openIdx, end);
      // Швидкий check: чи містить кp i predicted_time
      if(candidate.includes('"kp"') && candidate.includes('predicted_time')){
        matches.push(candidate);
      }
      i = end;
    }
    if(matches.length < 1) return null;

    const today = todayKyivStr();
    const result = { kp3Day: [], kp27Day: [], historical: [] };

    for(const raw of matches){
      let arr;
      try{ arr = JSON.parse(raw); }catch(e){ globalThis.NRDiagnostics?.record('catch.102','recoverable');  continue; }
      if(!Array.isArray(arr) || !arr.length) continue;
      const first = arr[0];
      if(!first || !first.predicted_time) continue;

      const ptStr = String(first.predicted_time);
      const isDailyOnly = ptStr.length === 10;       // 'YYYY-MM-DD'
      const has3hr = /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(ptStr); // 'YYYY-MM-DD HH:MM:SS'
      const firstDate = ptStr.slice(0,10);
      const lastDate = String(arr[arr.length-1].predicted_time).slice(0,10);

      if(isDailyOnly){
        // 27-day forecast (daily) — only first one wins (skip duplicate)
        if(!result.kp27Day.length){
          result.kp27Day = arr.map(r => ({
            date: new Date(r.predicted_time + 'T00:00:00Z'),
            kp: sourceKp(r.kp)
          })).filter(r => isFinite(r.kp));
        }
      } else if(has3hr){
        // Має slot-час → це або 3-day (future, 24 slots) або historical (past, 180 entries)
        // v88.6.9 fix H1: classifier тільки за датами (без fuzzy 3-day window):
        //   last < today  → historical
        //   first >= today → 3-day (future)
        //   first < today <= last → contains today (mixed) → 3-day
        const isHistorical = lastDate < today;
        const isFuture = firstDate >= today || (firstDate < today && lastDate >= today);

        if(isHistorical){
          if(!result.historical.length){
            result.historical = arr.map(r => ({
              date: r.predicted_time.slice(0,10),
              kp: sourceKp(r.kp)
            })).filter(r => isFinite(r.kp));
          }
        } else if(isFuture && !result.kp3Day.length){
          // 3-day має ~24 entries (8 slots × 3 days). Якщо arr.length > 50, то це навряд 3-day.
          if(arr.length <= 50){
            result.kp3Day = arr.map(r => ({
              time: r.predicted_time,
              date: r.predicted_time.slice(0,10),
              kp: sourceKp(r.kp)
            })).filter(r => isFinite(r.kp));
          } else {
            // Великий future array — кладемо у historical як scratch
            result.historical = arr.map(r => ({
              date: r.predicted_time.slice(0,10),
              kp: sourceKp(r.kp)
            })).filter(r => isFinite(r.kp));
          }
        }
      }
    }
    return (result.kp3Day.length || result.kp27Day.length || result.historical.length) ? result : null;
  }catch(e){ globalThis.NRDiagnostics?.record('catch.103','recoverable');
    console.warn('[v88.6.9 UAF] parse failed:', e.message);
    return null;
  }
}/* NR_FN_END 150 */

/* NR_FN_BEGIN 155 */function parse3DaySafe(json){
  // NOAA supports both object rows and legacy header/table rows. Only rows
  // explicitly marked predicted are forecast evidence; observation time is
  // not issuance time. Keep UTC slots in their actual positions.
  const out = {issued:null, predictedAp:[], days:[], _source:'noaa-3day',
    _recordCounts:{predicted:0, excluded:0, conflictingSlots:0}};
  try{
    const rows = JSON.parse(json);
    if(!Array.isArray(rows) || !rows.length) return out;
    const table = Array.isArray(rows[0]);
    const header = table ? rows[0].map(x=>String(x).toLowerCase()) : [];
    const ti = header.indexOf('time_tag'), ki = header.indexOf('kp'), si = header.indexOf('observed');
    if(table && (ti<0 || ki<0 || si<0)) return out;
    const slots = new Map(), conflicts = new Set();
    for(const row of table ? rows.slice(1) : rows){
      const stamp = table ? row?.[ti] : row?.time_tag;
      const raw = table ? row?.[ki] : row?.kp;
      const kind = table ? row?.[si] : row?.observed;
      const kp = _finiteFormulaNumber(raw);
      const match = typeof stamp==='string' && stamp.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):00:00(?:Z)?$/);
      const dt = match ? new Date(match[1]+'T'+match[2]+':00:00Z') : null;
      if(kind!=='predicted' || !Number.isFinite(kp) || kp<0 || kp>9 ||
          !dt || !Number.isFinite(dt.getTime()) || dt.toISOString().slice(0,10)!==match[1] ||
          Number(match[2])>21 || Number(match[2])%3!==0){out._recordCounts.excluded++;continue;}
      const key = dt.toISOString();
      if(conflicts.has(key)) continue;
      if(slots.has(key) && slots.get(key).kp!==kp){
        slots.delete(key); conflicts.add(key); out._recordCounts.conflictingSlots++; continue;
      }
      slots.set(key,{date:match[1],slot:Number(match[2])/3,kp});
    }
    out._recordCounts.predicted = slots.size;
    const today = todayKyivStr(), byDay = new Map();
    const end = new Date(today+'T00:00:00Z');end.setUTCDate(end.getUTCDate()+2);
    const lastDay = end.toISOString().slice(0,10);
    for(const [stamp,r] of [...slots].sort(([a],[b])=>a.localeCompare(b))){
      if(r.date<today || r.date>lastDay) continue;
      if(!byDay.has(r.date)) byDay.set(r.date,Array(8).fill(NaN));
      byDay.get(r.date)[r.slot]=r.kp;
      if(!out.firstForecastTime) out.firstForecastTime=stamp;
    }
    for(const [date,kp8] of byDay){
      const complete = kp8.every(Number.isFinite);
      const day={date:new Date(date+'T00:00:00Z'),kp8,
        kpMax:complete ? Math.max(...kp8) : NaN, forecastSlotCount:kp8.filter(Number.isFinite).length};
      if(!complete) day._needsFill=true;
      out.days.push(day);
      const aValues=kp8.filter(Number.isFinite).map(kpToApInterp);
      out.predictedAp.push({date:day.date,Ap:complete ? aValues.reduce((a,b)=>a+b,0)/8 : null});
    }
    _ensureThreeDays(out);
  }catch(e){ globalThis.NRDiagnostics?.record('catch.107','recoverable'); if(window._DEBUG)console.warn('[parse3DaySafe]',e.message);}
  return out;
}/* NR_FN_END 155 */

/* NR_FN_BEGIN 158 */function _parseDstTimeToDate(raw){
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.replace(/\s*UTC\s*$/i, '').trim();
  if (!s) return null;
  s = s.replace(' ', 'T');
  if (!/Z$/i.test(s)) s += 'Z';
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}/* NR_FN_END 158 */

/* NR_FN_BEGIN 160 */function parseDst(json){
  try{
    const rows = JSON.parse(json);
    if(!Array.isArray(rows)||!rows.length) return null;
    // v68: підтримка обох форматів (масиви і об'єкти — SWPC SCN)
    if(typeof rows[0]==='object'&&!Array.isArray(rows[0])){
      const data=rows.filter(r=>r.dst!=null&&r.dst!=='');
      const hit=_lastValidDst(data, r=>(r.dst!=null?r.dst:r.Dst));
      return hit ? { dst: hit.dst, time:(hit.row.time_tag||'')+'UTC' } : null;
    }
    // масив масивів з заголовком
    if(rows.length<2) return null;
    const data=rows.slice(1).filter(r=>r[1]!=null&&r[1]!=='');
    const hit=_lastValidDst(data, r=>r[1]);
    return hit ? { dst: hit.dst, time: hit.row[0]+'UTC' } : null;
  }catch(e){ globalThis.NRDiagnostics?.record('catch.108','recoverable');  return null; }
}/* NR_FN_END 160 */

/* NR_FN_BEGIN 161 */function parse45Day(json){
  try{
    const payload=JSON.parse(json),data=Array.isArray(payload)?payload:payload?.data;
    if(!Array.isArray(data)) return [];
    let sourceRows=data;
    if(data.some(r=>r && typeof r.metric==='string')){
      const byTime=new Map();
      for(const r of data){
        if(!r || !['ap','f107'].includes(r.metric)) continue;
        const key=r.time;if(!byTime.has(key)) byTime.set(key,{time:key});
        const item=byTime.get(key),value=_finiteFormulaNumber(r.value);
        if(Object.prototype.hasOwnProperty.call(item,r.metric) && item[r.metric]!==value) item[r.metric]=NaN;
        else item[r.metric]=value;
      }
      sourceRows=[...byTime.values()];
    }
    const rows=[];
    for(const r of sourceRows){
      const rawDate=Array.isArray(r)?r[0]:(r?.time??r?.time_tag??r?.date);
      const rawAp=Array.isArray(r)?r[1]:r?.ap;
      const Ap=_finiteFormulaNumber(rawAp);
      if(typeof rawDate!=='string' || !/^\d{4}-\d{2}-\d{2}(?:$|[T ])/.test(rawDate) || !Number.isFinite(Ap) || Ap<0 || Ap>400) continue;
      const ds=rawDate.slice(0,10),date=new Date(ds+'T00:00:00Z');
      if(!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==ds) continue;
      const flux=_finiteFormulaNumber(Array.isArray(r)?r[2]:r?.f107);
      rows.push({date,Ap,flux:Number.isFinite(flux)&&flux>=50&&flux<=400?flux:null});
    }
    return rows.sort((a,b)=>a.date-b.date);
  }catch(e){ globalThis.NRDiagnostics?.record('catch.109','recoverable'); return [];}
}/* NR_FN_END 161 */

/* NR_FN_BEGIN 163 */function parse27Day(text){
  const rows = [];
  const lines = text.split(/\r?\n/);
  for(const line of lines){
    if(line.startsWith('#')||line.startsWith(':')||!line.trim()) continue;
    // Format: "2026 Mar 16     108          15          4"
    const m = line.match(/(\d{4})\s+(\w{3})\s+(\d{1,2})\s+(\d+)\s+(\d+)\s+(\d+)/);
    if(!m) continue;
    const MONTH_IDX = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
    // v88.6.9 fix H2: skip line якщо невідомий месяц (раніше silent fallback на January = data corruption)
    const monIdx = MONTH_IDX[m[2]];
    if(monIdx === undefined){
      console.warn('[parse27Day] Невідомий месяць у рядку:', line.slice(0,40));
      continue;
    }
    const date = new Date(Date.UTC(parseInt(m[1],10), monIdx, parseInt(m[3],10)));
    const fluxRaw = parseInt(m[4],10);
    // fp428 X-01: quarantine impossible/corrupted F10.7 values. F10.7 remains
    // advisory-only (score_effect=0), but it must not be presented as real.
    const fluxValid = Number.isFinite(fluxRaw) && fluxRaw >= 50 && fluxRaw <= 400;
    rows.push({date, flux: fluxValid ? fluxRaw : null, fluxRaw,
      fluxStatus: fluxValid ? 'verified_range' : 'conflicting_outlier',
      Ap: parseInt(m[5],10), kpMax: parseInt(m[6],10)});
  }
  return rows;
}/* NR_FN_END 163 */

/* NR_FN_BEGIN 167 */async function fetchDGDLast30(){
  if(_dgdInflight) return _dgdInflight;
  _dgdInflight = (async () => {
    const cacheKey = 'dgd_cache_v1';
    const cached = lsGet(cacheKey);
    if(cached){
      try{
        const o = JSON.parse(cached);
        if(o && o.ts && (Date.now() - o.ts < 6*3600*1000) && o.data){
          return new Map(Object.entries(o.data));
        }
      }catch(e){ globalThis.NRDiagnostics?.record('catch.119','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
    }
    let text = '';
    try{ text = await fetchTextWithCORS('https://services.swpc.noaa.gov/text/daily-geomagnetic-indices.txt'); }
    catch(e){ globalThis.NRDiagnostics?.record('catch.120','recoverable');  console.warn('[DGD] fetch failed', e); return null; }
    if(!text) return null;
    const map = new Map();
    const lines = text.split(/\r?\n/);
    for(const ln of lines){
      if(!ln || ln.startsWith(':') || ln.startsWith('#')) continue;
      const parts = ln.trim().split(/\s+/);
      if(parts.length < 30) continue; // 3(date) + 9(mid) + 9(hi) + 9(planetary)
      const y = parseInt(parts[0],10), mo = parseInt(parts[1],10), d = parseInt(parts[2],10);
      if(!isFinite(y) || !isFinite(mo) || !isFinite(d)) continue;
      // Планетарні Kp — останні 8 токенів (parts.length-8 .. parts.length-1)
      const kpVals = parts.slice(parts.length - 8).map(parseFloat).filter(isFinite);
      if(kpVals.length !== 8) continue;
      const kpMax = Math.max(...kpVals);
      const ds = `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      map.set(ds, kpMax);
    }
    if(map.size > 0){
      try{
        const obj = {}; for(const [k,v] of map.entries()) obj[k]=v;
        lsSet(cacheKey, JSON.stringify({ts: Date.now(), data: obj}));
      }catch(e){ globalThis.NRDiagnostics?.record('catch.121','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
    }
    return map;
  })();
  try {
    return await _dgdInflight;
  } finally {
    // Скидаємо inflight після завершення (успіх або помилка) — наступний запит піде у cache
    _dgdInflight = null;
  }
}/* NR_FN_END 167 */

/* NR_FN_BEGIN 205 */async function fetchText(u){
  try {
    const res = await fetch(u, {cache:'no-store'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch(e) { globalThis.NRDiagnostics?.record('catch.148','recoverable');
    console.error('fetchText failed:', u, e.message);
    throw e;
  }
}/* NR_FN_END 205 */

/* NR_FN_BEGIN 206 */async function preloadEventsAroundNow(){
  const now = new Date();
  const yrs = [now.getUTCFullYear(), now.getUTCFullYear()+1];
  // v88.8.62-fp138: події не мають права блокувати NOAA/live render.
  // Синхронно: тільки builtin events + NASA eclipse catalog (локально, швидко).
  // Online ICS — тільки якщо явно ?onlineics=1 у indexIcsEventsForYears().
  try {
    indexBuiltinEvents();
    for(const y of yrs) await ensureEclipsesForYear(y);
    try {
      const _qs = new URLSearchParams(location.search || '');
      if (_qs.get('onlineics') === '1') {
        setTimeout(()=>indexIcsEventsForYears(yrs).catch(e=>{globalThis.NRDiagnostics?.record('promise.catch.8','recoverable'); if(window._DEBUG) console.warn('[ICS bg]', e.message); }), 0);
      }
    } catch(_e){ window.NRDiagnostics?.record('legacy.catch.116','recoverable'); }
  } catch(e) { globalThis.NRDiagnostics?.record('catch.149','recoverable');
    if(window._DEBUG) console.warn('[ICS] builtin/eclipse preload failed:', e.message);
  }
}/* NR_FN_END 206 */

/* NR_FN_BEGIN 211 */function parseETipTop(eTip, limit=3){
  if(!eTip || typeof eTip!=='string') return [];
  return eTip.split('\n').map(s=>s.trim()).filter(Boolean)
    .filter(s => !s.startsWith('────') && !s.startsWith('eᵢ =') && !s.startsWith('0 —'))
    .filter(s => !/\bBz\s*=\b|\bVsw\s*=\b/.test(s)) // v83f: exclude space weather context
    .map(line => {
      const m = line.match(/^([+-]?\d+(?:\.\d+)?)\s*—\s*(.+?)(?:\s+\[.*\])?$/);
      if(!m) return null;
      return { value: Number(m[1]), label: m[2].replace(/\s+\(≈\)\s*$/, '').trim() };
    })
    .filter(Boolean)
    .sort((a,b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, limit);
}/* NR_FN_END 211 */

/* NR_FN_BEGIN 239 */function _patchStaleLoadingDOM() {
  // a0) heroTomorrow стрілка "→" через race (render3Day виконується ДО
  // renderCurrentPanel() у тому самому проході loadAll(), тому #nowG/uiState.gNow
  // ще не заповнені на момент першого обчислення тренду "завтра" — diff завжди
  // рахується як 0, стрілка завжди нейтральна "→", навіть коли реальна різниця
  // велика). v88.9.38-fp220 FIX (аудит-раунд-7): той самий "re-trigger коли дані
  // з'явились" патерн, що вже використаний нижче для whyRows/timingRows/
  // decisionTimingList — застосований тепер і сюди.
  try {
    const _htChk = document.getElementById('heroTomorrow');
    if (_htChk && _htChk.dataset._arrowNeutral !== '0'
        && (_htChk.textContent || '').includes('→')
        && isFinite(window.__uiState?.gNow)
        && Array.isArray(window._gIndex_last3D?.days)
        && typeof render3Day === 'function') {
      render3Day(window._gIndex_last3D);
      // Позначаємо, що ре-тригер уже відбувся для цього G_now — не заходити в
      // цикл повторних викликів, якщо реальний стан ЛИШИВСЯ нейтральним.
      if (document.getElementById('heroTomorrow')) {
        document.getElementById('heroTomorrow').dataset._arrowNeutral = '0';
      }
    }
  } catch(_e0){ window.NRDiagnostics?.record('legacy.catch.149','recoverable'); }

  // v88.9.43-fp225 (doc15, Problem 3): той самий клас race — computeCScore()
  // (усередині renderCurrentPanel()) читає window._kpSourceFreshness, але це
  // поле встановлюється ПІЗНІШЕ в loadAll() (після NOAA/GFZ fetch). На першому
  // проході _src=undefined → DEGRADED-штраф C-score мовчки пропускається →
  // "Якість даних: Висока" (92%) застрягає, навіть коли freshnessBadge вже
  // показує ESTIMATED/DEGRADED. Один одноразовий ре-тригер, коли дані з'являться.
  try {
    const _qEl = document.getElementById('heroConfidence');
    if (_qEl && _qEl.dataset._cscoreStale !== '0'
        && isFinite(window._kpSourceFreshness?.ageHours)
        && typeof renderCurrentPanel === 'function') {
      renderCurrentPanel();
      if (document.getElementById('heroConfidence')) {
        document.getElementById('heroConfidence').dataset._cscoreStale = '0';
      }
    }
  } catch(_e0b){ window.NRDiagnostics?.record('legacy.catch.150','recoverable'); }

  // a) whyRows "Дані завантажуються…" — re-trigger _renderHeroCause if data is available now
  try {
    const _wr = document.getElementById('whyRows');
    if (_wr && _wr.textContent && _wr.textContent.includes('Дані завантажуються')) {
      // v88.8.91-fp172: __uiState.gNow alone was unreliable (stays NaN if it
      // was set during an early render pass before Kp arrived, and never
      // gets refreshed until the next full loadAll() cycle).
      // v88.8.95-fp176: fp172 fallback read '#heroG' — WRONG. Виправлено fp209:
      // #heroG — це велике кільце, і після fp128/fp208 воно показує PDF/Engine
      // ВЕРДИКТ (дискретне -3..+3), не G_now (безперервний фон). Змішування цих
      // двох метрик у fallback означало: якщо __uiState.gNow ще NaN на момент
      // рендеру, функція могла взяти -3 (вердикт) і трактувати його як "поточний
      // G_now" у поясненні "Чому сьогодні такий день?" — показуючи неправильну
      // причину користувачу. #nowG — окремий бейдж "G-індекс зараз", використовується
      // як надійне джерело G_now у 5+ інших місцях файлу (рядки 3004, 13669, 13817,
      // 15426, 19370) — тепер єдиний fallback тут теж.
      let _gNow = window.__uiState?.gNow;
      if (!isFinite(_gNow)) {
        const _nowGEl = document.getElementById('nowG');
        _gNow = _num(_firstText(_nowGEl) || _nowGEl?.textContent);
      }
      const _kp = (typeof lastWWV !== 'undefined' && lastWWV && isFinite(lastWWV.kNow)) ? lastWWV.kNow : NaN;
      if (isFinite(_gNow) && typeof _renderHeroCause === 'function') {
        _renderHeroCause(_gNow, _kp);
      }
    }
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.151','recoverable'); }

  // b) timingRows "Прогноз Kp-слотів недоступний" OR stale storm fallback — re-trigger if _daySlots populated
  try {
    const _tr = document.getElementById('timingRows');
    if (_tr && _tr.textContent &&
        (_tr.textContent.includes('недоступний') || _tr.textContent.includes('Слоти підтягуються'))) {
      if (Array.isArray(window._daySlots) && window._daySlots.length > 0
          && typeof _renderHeroTimeWindows === 'function') {
        _renderHeroTimeWindows();
      }
    }
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.152','recoverable'); }

  // c) decisionTimingList "Немає даних по слотах" OR stale storm fallback — re-trigger if _daySlots populated
  try {
    const _dtl = document.getElementById('decisionTimingList');
    if (_dtl && _dtl.textContent &&
        (_dtl.textContent.includes('Немає даних') || _dtl.textContent.includes('Storm — Kp=') || _dtl.textContent.includes('Storm fallback'))) {
      if (Array.isArray(window._daySlots) && window._daySlots.length > 0
          && typeof renderDecisionTiming === 'function') {
        renderDecisionTiming(window._daySlots);
      }
    }
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.153','recoverable'); }

  // v88.8.35-fp56-P8: keep the explicit decision hierarchy (РІШЕННЯ ДНЯ / ФОН ЗАРАЗ / ЯКІСТЬ) in sync.
  try { if (typeof _renderHeroHierarchy === 'function') _renderHeroHierarchy(); } catch(_e){ window.NRDiagnostics?.record('legacy.catch.154','recoverable'); }
  // fp207 (2026-07-16): renderHeroBulletin() існувала, але НІКОЛИ не викликалась — той самий
  // клас багу, що loadEngineScores/loadExpertOverrides орфани з історії проєкту.
  // Тому 'ENGINE V18.5:' badge завжди показував '—' незалежно від наявності даних.
  try { if (typeof renderHeroBulletin === 'function') renderHeroBulletin(); } catch(_e){ window.NRDiagnostics?.record('legacy.catch.155','recoverable'); }
}/* NR_FN_END 239 */

/* NR_FN_BEGIN 274 */async function loadAllLite(){
  try{
    await loadFutureCalendarAdvisory();
    const btn = el('btnRefresh'); if(btn) btn.disabled = false;
    const kpCached = parseFloat(lsGet('last_kp_known'));
    const kp0 = Number.isFinite(kpCached) ? kpCached : 2.0;
    lastWWV = {kNow:kp0, aNow:null, whenText:'SAFE BOOT / synthetic', kPrev3h:null, kp24hAgo:null, _synthetic:true};
    const _synDays = [0,1,2].map(offset => {
      const d = new Date(todayKyivStr()+'T12:00:00Z'); d.setUTCHours(0,0,0,0); d.setUTCDate(d.getUTCDate()+offset);
      return { date:d, kp8:Array(8).fill(kp0), kpMax:kp0, _synthetic:true };
    });
    last3D = { issued:null, predictedAp:[], days:_synDays, _synthetic:true };
    window._gIndex_last3D = last3D;
    try{ render3Day(last3D); }catch(e){ globalThis.NRDiagnostics?.record('catch.219','recoverable');  console.warn('[fp138 lite render3Day]', e.message); }
    try{ renderCurrentPanel(); }catch(e){ globalThis.NRDiagnostics?.record('catch.220','recoverable');  console.warn('[fp138 lite current]', e.message); }
    // fp145 FIX: решта рендерів робить десятки синхронних computeAi (кожен смикає астро-
    // бібліотеку). Кумулятивно це блокувало головний потік на 1.5-2с → "Сторінка не
    // відповідає" + кнопки не встигали навіситись. Виносимо у чергу з yield між кроками:
    // потік звільняється, UI лишається чутливим, важкі обрахунки дорахуються поетапно.
    const _yield = () => new Promise(r => (typeof requestIdleCallback==='function' ? requestIdleCallback(()=>r(), {timeout:500}) : setTimeout(r,0)));
    (async () => {
      await _yield();
      try{ renderPanchanga(sunriseUTC(new Date(todayKyivStr()+'T12:00:00Z'))); }catch(e){ globalThis.NRDiagnostics?.record('catch.221','recoverable');  console.warn('[fp138 lite panch]', e.message); }
      await _yield();
      try{
        const _syn27 = Array.from({length:27},(_,i)=>{ const d=new Date(todayKyivStr()+'T12:00:00Z'); d.setUTCHours(0,0,0,0); d.setUTCDate(d.getUTCDate()+i-7); return {date:d, flux:null, Ap:null, kpMax:kp0, _synthetic:true}; });
        render27Day(_syn27, last3D);
      }catch(e){ globalThis.NRDiagnostics?.record('catch.222','recoverable');  console.warn('[fp138 lite 27d]', e.message); }
      await _yield();
      try{ updateFreshnessBadge(); }catch(e){ window.NRDiagnostics?.record('legacy.catch.199','recoverable'); }
      try{ syncV702UI(); }catch(e){ globalThis.NRDiagnostics?.record('catch.223','recoverable');  console.warn('[fp138 lite sync]', e.message); }
      await _yield();
      // Regime cards remain retired until independent outcomes exist.
      try{ if(typeof renderUnifiedIndicesPanel==='function') renderUnifiedIndicesPanel(); }catch(e){ window.NRDiagnostics?.record('legacy.catch.200','recoverable'); }
      try{ if(typeof _patchStaleLoadingDOM==='function') _patchStaleLoadingDOM(); }catch(e){ window.NRDiagnostics?.record('legacy.catch.201','recoverable'); }
    })();
    try{
      const st=document.getElementById('freshnessBadge');
      if(st){ st.textContent='● SAFE'; st.style.background='#1a2540'; st.style.color='#9bb1dc'; st.title='Safe boot: live NOAA fetch вимкнено на старті, щоб сторінка не зависала. Натисни Оновити або відкрий ?live=1 для live fetch.'; }
      const ts=document.getElementById('dataTimestamp'); if(ts) ts.textContent='SAFE BOOT · live fetch manual';
    }catch(e){ window.NRDiagnostics?.record('legacy.catch.202','recoverable'); }
  }catch(e){ globalThis.NRDiagnostics?.record('catch.224','recoverable');
    console.error('[fp138 loadAllLite fatal]', e);
    try{ el('nowError').textContent='SAFE BOOT error: '+e.message; }catch(_e){ window.NRDiagnostics?.record('legacy.catch.203','recoverable'); }
  }
}/* NR_FN_END 274 */

/* NR_FN_BEGIN 275 */async function loadAll(){
  el('btnRefresh').disabled = true;
  el('nowError').textContent = '';
  el('threeError').textContent = '';

  setStamp();
  await loadFutureCalendarAdvisory();

  // v88.9.6x-fp246: легка перевірка manifest на КОЖЕН цикл loadAll (boot +
  // кожні N хв auto-refresh) — не блокує решту завантаження (fire-and-forget),
  // бо це незалежний рейл від live Kp/Dst/Sn нижче.
  try { checkDataManifest().catch(()=>{globalThis.NRDiagnostics?.record('promise.catch.9','recoverable');}); } catch(e){ window.NRDiagnostics?.record('legacy.catch.204','recoverable'); }

  try{
    await preloadEventsAroundNow();
  }catch(err){ globalThis.NRDiagnostics?.record('catch.225','recoverable');
    el('nowError').textContent = 'Попередження: не вдалося підвантажити події: ' + err.message;
  }

  // ═══ Паралельне завантаження всіх джерел (v26: Promise.allSettled) ═══
  // v88.8.62-fp138: primary source fetches MUST be bounded too.
  // fp134 only bounded fallback calls; primary Promise.allSettled still waited for the full
  // CORS chain of every source and could freeze perceived startup. Each rail now gets a
  // hard 5s wait budget; stale/dead sources fall through to existing cache/synthetic logic.
  const [kpObsR, kpLiveR, kpFcstR, t27R, dstR, snR] = await Promise.allSettled([
    withTimeout(fetchTextWithCORS(URL_KP_OBS, _looksLikeJson), 5000, 'primary KP_OBS'),
    withTimeout(fetchTextWithCORS(URL_KP_OBS_FB, _looksLikeJson), 5000, 'provisional KP_1M'),
    withTimeout(fetchTextWithCORS(URL_KP_FCST, _looksLikeJson), 5000, 'primary KP_FCST'),
    withTimeout(fetchTextWithCORS(URL_27DAY), 5000, 'primary 27DAY'),
    withTimeout(fetchTextWithCORS(URL_DST, _looksLikeJson), 5000, 'primary DST'),
    withTimeout(signal=>fetchWolfSnResilient(signal), 5000, 'resilient WOLF_SN')
  ]);

  // Kp спостереження (P0: fallback на planetary_k_index_1m.json)
  if(kpObsR.status === 'fulfilled'){
    _lastKpObsJson = kpObsR.value;
    lastWWV = parseKpObsJSON(kpObsR.value);
    // v88.8.18 ★ STALENESS DETECTION: NOAA SWPC + GFZ — обидва можуть бути stale.
    // Перевіряємо чи NOAA data > 24h тому. Якщо так — пробуємо GFZ і порівнюємо ages.
    // НЕ замінюємо stale на більш-stale; беремо джерело з найсвіжішим timestamp.
    let _noaaAgeH = null;
    try {
      if (lastWWV && lastWWV.whenText) {
        const _tsStr = lastWWV.whenText.replace(' UTC', '').replace(' ', 'T') + 'Z';
        const _tsMs = new Date(_tsStr).getTime();
        // v88.9.59-fp241 FIX-CRITICAL (аудит-раунд-27, Problem 1): time_tag —
        // це ПОЧАТОК 3-годинного observed-інтервалу NOAA (напр. 12:00 →
        // інтервал 12:00-15:00 UTC), а не момент, коли значення стало
        // актуальним. Раніше вік рахувався від time_tag напряму, тому
        // затримка виглядала перебільшеною приблизно на 3 години (17:39 −
        // 12:00 = 5.7г замість реальних 17:39 − 15:00 = 2.7г після завершення
        // інтервалу). Тепер додаємо тривалість інтервалу (3г) — вік
        // рахується від моменту, коли дані стали фінальними.
        const KP_INTERVAL_HOURS = 3;
        if (isFinite(_tsMs)) _noaaAgeH = (Date.now() - (_tsMs + KP_INTERVAL_HOURS*3600000)) / 3600000;
        // Захист: якщо результат від'ємний (інтервал ще триває — NOAA іноді
        // публікує проміжне значення до завершення вікна), не показуємо
        // "від'ємну затримку" — округляємо до 0 (щойно з'явилось).
        if (_noaaAgeH !== null && _noaaAgeH < 0) _noaaAgeH = 0;
      }
    } catch(eStale){ window.NRDiagnostics?.record('legacy.catch.205','recoverable'); }
    window._kpSourceFreshness = { source: 'NOAA', ageHours: _noaaAgeH };

    if (_noaaAgeH !== null && _noaaAgeH > 24) {
      // NOAA stale → пробуємо GFZ і порівнюємо ages
      console.warn('[v88.8.18] NOAA Kp data stale ('+_noaaAgeH+'h old) — comparing з GFZ');
      try {
        const gfzVal = await withTimeout(signal=>fetchGfzKpAsNoaaFormat(3,signal), 5000, 'GFZ-compare');
        const gfzParsed = parseKpObsJSON(gfzVal);
        let _gfzAgeH = null;
        if (gfzParsed && gfzParsed.whenText) {
          const _gTsStr = gfzParsed.whenText.replace(' UTC','').replace(' ','T') + 'Z';
          const _gTsMs = new Date(_gTsStr).getTime();
          // v88.9.59-fp241 (той самий фікс, що й для NOAA вище): GFZ теж
          // публікує 3-годинні Kp-інтервали з time_tag на початку вікна.
          if (isFinite(_gTsMs)) _gfzAgeH = (Date.now() - (_gTsMs + 3*3600000)) / 3600000;
          if (_gfzAgeH !== null && _gfzAgeH < 0) _gfzAgeH = 0;
        }
        if (gfzParsed && isFinite(gfzParsed.kNow) && _gfzAgeH !== null && _gfzAgeH < _noaaAgeH) {
          _lastKpObsJson = gfzVal;
          lastWWV = gfzParsed;
          window._kpSourceFreshness = { source: 'GFZ Potsdam', ageHours: _gfzAgeH };
          _setSrcStatus('srcKpObs','ok');
          if(window._DEBUG) console.log('[v88.8.18] GFZ свіжіше ('+_gfzAgeH+'h) ніж NOAA ('+_noaaAgeH+'h) — replaced');
        } else if (gfzParsed) {
          if(window._DEBUG) console.warn('[v88.8.18] GFZ теж stale ('+_gfzAgeH+'h) — keeping NOAA ('+_noaaAgeH+'h)');
          _setSrcStatus('srcKpObs','cache'); // обидва старі — позначка cache
        } else {
          _setSrcStatus('srcKpObs','cache');
        }
      } catch(eGfz){ globalThis.NRDiagnostics?.record('catch.226','recoverable');
        console.warn('[v88.8.18] GFZ comparison failed, keeping NOAA:', eGfz.message);
        _setSrcStatus('srcKpObs','cache'); // NOAA stale, GFZ fail → degraded
      }
    } else {
      _setSrcStatus('srcKpObs','ok');
    }
    if (lastWWV && isFinite(lastWWV.kNow)) lsSet('last_kp_known', lastWWV.kNow);
    if(window._DEBUG) console.log('[v43] KP_OBS OK (primary)');
  } else {
    console.warn('[v43] KP_OBS primary failed, trying fallback:', kpObsR.reason?.message);
    // v88.8.18 ★ NEW: GFZ Potsdam Kp як tier-1 fallback (NOAA stale since 2026-03-28)
    let _gfzOK = false;
    try{
      const gfzVal = await withTimeout(signal=>fetchGfzKpAsNoaaFormat(3,signal), 5000, 'GFZ-fallback');
      _lastKpObsJson = gfzVal;
      lastWWV = parseKpObsJSON(gfzVal);
      _setSrcStatus('srcKpObs','ok');
      if (lastWWV && isFinite(lastWWV.kNow)) lsSet('last_kp_known', lastWWV.kNow);
      _gfzOK = true;
      if(window._DEBUG) console.log('[v88.8.18] KP_OBS GFZ Potsdam fallback OK (Kp='+lastWWV.kNow+')');
    }catch(eGfz){ globalThis.NRDiagnostics?.record('catch.227','recoverable');
      console.warn('[v88.8.18] GFZ fallback failed:', eGfz.message);
    }
    if (!_gfzOK) try{
      const fbVal = await withTimeout(fetchTextWithCORS(URL_KP_OBS_FB), 5000, 'KP_OBS_FB');
      // planetary_k_index_1m.json: [{time_tag,kp,kp_index,...}]
      // Конвертуємо у формат noaa-planetary-k-index.json: [["time_tag","Kp"],...]
      const fbData = JSON.parse(fbVal);
      const converted = JSON.stringify(
        [["time_tag","Kp"]].concat(
          fbData.map(r=>[r.time_tag, parseFloat(r.kp)])
        )
      );
      _lastKpObsJson = converted;
      lastWWV = parseKpObsJSON(converted);
      if(window._DEBUG) console.log('[v43] KP_OBS fallback OK (1m)');
    }catch(e2){ globalThis.NRDiagnostics?.record('catch.228','recoverable');
      if (!_gfzOK) {
        console.warn('[v43] KP_OBS fallback also failed:', e2.message);
        // v62: synthetic Kp з localStorage (останнє відоме значення)
        const _lsKp = parseFloat(lsGet('last_kp_known'));
        if (isFinite(_lsKp)) {
          lastWWV = {kNow:_lsKp, aNow:null, whenText:'(кеш)', kPrev3h:null, kp24hAgo:null, _cached:true};
          _setSrcStatus('srcKpObs','cache');
          if(window._DEBUG) console.log('[v62] KP_OBS: using localStorage cache Kp='+_lsKp);
        } else {
          lastWWV = {kNow:2.0, aNow:null, whenText:'(synthetic)', kPrev3h:null, kp24hAgo:null, _synthetic:true};
          _setSrcStatus('srcKpObs','synthetic');
          if(window._DEBUG) console.log('[v62] KP_OBS: full fallback to synthetic Kp=2.0');
        }
      }
    }
  }

  // The finalized 3-hour feed may lag the current interval. Prefer a fresh,
  // robust 5-point median from NOAA's 1-minute estimated Kp rail and label it
  // PROVISIONAL; never present it as a finalized observation.
  if (kpLiveR.status === 'fulfilled') {
    try {
      const _sample1m = _provisionalKpMedian(JSON.parse(kpLiveR.value),Date.now());
      if (_sample1m) {
        const _kp1m = _sample1m.kp, _age1m = _sample1m.ageHours;
        const _prevFinal = lastWWV;
        lastWWV = {
          kNow: _kp1m, aNow: _prevFinal?.aNow ?? null,
          whenText: new Date(_sample1m.ts).toISOString().replace('T',' ').replace('Z',' UTC'),
          ts: _sample1m.ts,
          kPrev3h: _prevFinal?.kNow ?? null, kp24hAgo: _prevFinal?.kp24hAgo ?? null,
          _provisional: true,
          _sourceLabel: 'NOAA 1-minute estimated Kp (5-point median)'
        };
        window._kpSourceFreshness = {source:'NOAA 1m estimated', ageHours:Math.max(0,_age1m), provisional:true};
        _setSrcStatus('srcKpObs','ok');
        lsSet('last_kp_known', _kp1m);
      }
    } catch(_e1m) { globalThis.NRDiagnostics?.record('catch.229','recoverable');  if(window._DEBUG) console.warn('[fp417 KP_1M]', _e1m.message); }
  }

  // Kp прогноз 3 дні
  if(kpFcstR.status === 'fulfilled'){
    last3D = parse3DaySafe(kpFcstR.value);
    window._gIndex_last3D = last3D;  // fp53-B: store globally for post-27day re-render
    // v88.7.6: Fill-up винесено у спільну функцію — використовується для NOAA і UAF.
    _fillPlaceholderDays(last3D, t27R);
    render3Day(last3D);
    // fp50-C: render3Day → renderDayForecast → fills _daySlots AFTER syncHero already ran.
    // syncHero called renderDecisionTiming when _daySlots was empty → "Немає даних по слотах".
    // Re-trigger patch now that _daySlots is populated.
    try { if(typeof _patchStaleLoadingDOM === 'function') _patchStaleLoadingDOM(); } catch(_e){ window.NRDiagnostics?.record('legacy.catch.206','recoverable'); }
    _setSrcStatus('srcKpFcst', last3D.days.length ? (last3D._partialReal ? 'cache' : 'ok') : 'error');
  } else {
    _setSrcStatus('srcKpFcst','error');
    el('threeError').textContent = 'Помилка 3-day: ' + (kpFcstR.reason?.message || 'недоступний');
  }
  // fp373: same-origin future_kp.json is refreshed by the local NOAA updater.
  // When it covers today + 2 days with verified NOAA values, let the normal
  // local-snapshot branch below consume it and do not probe the slower UAF/CORS
  // chain. UAF remains available only when the verified local horizon is incomplete.
  let _preferVerifiedLocal3Day = false;
  if (!last3D || !last3D.days || !last3D.days.length || last3D._synthetic) {
    try {
      const _localKp = await loadFutureKp() || {};
      _preferVerifiedLocal3Day = [0,1,2].every(offset => {
        const d = new Date(todayKyivStr()+'T12:00:00Z');
        d.setUTCHours(0,0,0,0); d.setUTCDate(d.getUTCDate()+offset);
        const point = _localKp[fmtDate(d)];
        return point && Number.isFinite(Number(point.kp)) && point.kp_synthetic === false;
      });
    } catch(_e) { globalThis.NRDiagnostics?.record('catch.230','recoverable');  _preferVerifiedLocal3Day = false; }
  }
  // v88.6.9: Tier-2 UAF Geophysical Institute fallback — якщо NOAA 3-day fail
  if (!window.GINDEX_PLAY_CHANNEL && (!last3D || !last3D.days || !last3D.days.length || last3D._synthetic) && !_preferVerifiedLocal3Day) {
    try{
      if(window._DEBUG) console.log('[v88.6.9] NOAA 3-day fail → trying UAF Alaska mirror');
      const _uafHtml = await withTimeout(fetchTextWithCORS(URL_UAF_AURORA), 5000, 'UAF-3day');
      const _uaf = parseUafAurora(_uafHtml);
      const _last3DUaf = uafTo3DayFormat(_uaf);
      if (_last3DUaf && _last3DUaf.days && _last3DUaf.days.length) {
        last3D = _last3DUaf;
        // v88.7.6 BUG-2 fix: UAF days можуть мати placeholder з _needsFill — заповнюємо перед render.
        _fillPlaceholderDays(last3D, t27R);
        render3Day(last3D);
        _setSrcStatus('srcKpFcst','cache'); // 'cache' indicates secondary source
        if(window._DEBUG) console.log('[v88.7.6] UAF Alaska 3-day OK ('+_last3DUaf.days.length+' days, filled)');
        // Cache UAF 27-day для подальшого використання нижче
        if(_uaf && _uaf.kp27Day && _uaf.kp27Day.length){
          window._uafCache27Day = uafTo27DayFormat(_uaf);
        }
      }
    }catch(uafErr){ globalThis.NRDiagnostics?.record('catch.231','recoverable');
      console.warn('[v88.6.9] UAF fallback failed:', uafErr.message);
    }
  }
  // v62: fallback — якщо last3D порожній, генеруємо synthetic з поточного Kp
  if (!last3D || !last3D.days || !last3D.days.length) {
    const _kpNow = (lastWWV && isFinite(lastWWV.kNow)) ? lastWWV.kNow : 2.0;
    // v88.8.76-fp155: ПЕРЕД плато — пробуємо future_kp.json (вже задеплоєний реальний
    // NOAA_forecast з локального update_kp.bat, окремий канал від живого браузерного CORS-фетчу
    // що зараз впав). Якщо для дня є реальні дані (kp_synthetic:false) — використовуємо їх
    // замість плаского повтору поточного Kp. Раніше: живий CORS впав → плато-заглушка,
    // навіть коли свіжіший реальний прогноз уже лежав у репо. Знайдено 2026-07-08 (аудит
    // невідповідності "3-day спадає" vs "future_kp.json зростає").
    let _fkp = {};
    try { _fkp = await loadFutureKp() || {}; } catch(_e){ globalThis.NRDiagnostics?.record('catch.232','recoverable');  _fkp = {}; }
    let _usedReal = 0;
    const _synDays = [0,1,2].map(offset => {
      const d = new Date(todayKyivStr()+'T12:00:00Z'); d.setUTCHours(0,0,0,0); d.setUTCDate(d.getUTCDate()+offset);
      const ds = fmtDate(d);
      const fEntry = _fkp[ds];
      if (fEntry && isFinite(fEntry.kp) && fEntry.kp_synthetic === false) {
        _usedReal++;
        return { date:d, kp8: Array(8).fill(fEntry.kp), kpMax: fEntry.kp, _fromFutureKp: true, _kpSource: fEntry.source };
      }
      return { date:d, kp8: Array(8).fill(_kpNow), kpMax: _kpNow };
    });
    const _allReal = _usedReal === _synDays.length;
    last3D = { issued: null, predictedAp: [], days: _synDays, _synthetic: !_allReal, _partialReal: _usedReal > 0 && !_allReal };
    render3Day(last3D);
    _setSrcStatus('srcKpFcst', _allReal ? 'cache' : (_usedReal > 0 ? 'cache' : 'synthetic'));
    // v87.95: дублювання видалено. threeError більше не пише "NOAA недоступний" —
    // це тепер ексклюзивно у threeNoaaAlert (з рамкою, бажовтим іконом). Раніше було видно
    // повідомлення тричі: банер + threeError text + bulletin sub-label.
    el('threeError').textContent = '';
    // v87.90: видимий alert над quick-cards + приглушені quick-cards
    const _alertEl = document.getElementById('threeNoaaAlert');
    if (_alertEl) {
      if (_allReal) {
        // v88.8.76-fp155: усі 3 дні покриті реальним future_kp.json — це вже не плато,
        // приховуємо тривожний банер, лишаємо нейтральну примітку джерела.
        _alertEl.style.display = 'block';
        _alertEl.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:16px">ℹ</span>
            <div style="flex:1">
              <div style="font-weight:700;color:#9fd1ff">Живий браузерний NOAA-фетч недоступний — показано резервні дані з future_kp.json</div>
              <div style="margin-top:2px;font-size:11px;color:var(--dim)">
                Це реальний NOAA 3-day forecast, збережений локальним update_kp.bat (не плато на поточному Kp). Онови сторінку, щоб спробувати живий CORS ще раз.
              </div>
            </div>
          </div>`;
      } else if (_usedReal > 0) {
        _alertEl.style.display = 'block';
        _alertEl.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:18px">⚠</span>
            <div style="flex:1">
              <div style="font-weight:700;color:#fca474">NOAA forecast частково недоступний</div>
              <div style="margin-top:2px;font-size:11px;color:#ffcc99">
                ${_usedReal} з ${_synDays.length} днів — реальний прогноз з future_kp.json, решта — плато на поточному Kp=${isFinite(_kpNow) ? _kpNow.toFixed(1) : '?'}. Спробуй оновити через 10–30 хв.
              </div>
            </div>
          </div>`;
      } else {
        _alertEl.style.display = 'block';
        _alertEl.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:18px">⚠</span>
            <div style="flex:1">
              <div style="font-weight:700;color:#ffb0b0">NOAA forecast недоступний</div>
              <div style="margin-top:2px;font-size:11px;color:#ffa0a0">
                Картки нижче — це <strong>не прогноз</strong>, а плато на базі поточного Kp=${isFinite(_kpNow) ? _kpNow.toFixed(1) : '?'}.
                Без динаміки. Спробуй оновити через 10–30 хв (CORS-проксі періодично відмовляють).
              </div>
            </div>
          </div>`;
      }
    }
    const _qw = document.getElementById('threeQuick');
    if (_qw) _qw.style.opacity = _allReal ? '1' : '0.55';
  } else {
    // NOAA OK — приховати alert і відновити opacity
    const _alertEl = document.getElementById('threeNoaaAlert');
    if (_alertEl) _alertEl.style.display = 'none';
    const _qw = document.getElementById('threeQuick');
    if (_qw) _qw.style.opacity = '1';
  }

  // Dst index
  if(dstR.status === 'fulfilled'){
    window._lastDst = parseDst(dstR.value);
    // v88.9.6x-fp244: зберігаємо провенанс — коли реально зафетчили і звідки,
    // потрібно для _dstProvenanceCheck() (не можна перевірити "вік запису"
    // без цього, коли time з фіда відсутній/нерозпізнаний).
    if (window._lastDst) { window._lastDst.fetchedAt = Date.now(); window._lastDst.sourceUrl = URL_DST; }
    if (window._lastDst) { lsSet('last_dst_known', window._lastDst.dst); _setSrcStatus('srcDst','ok'); }
    const dstEl = document.getElementById('sciDst');
    if(window._lastDst){
      const {dst} = window._lastDst;
      if(dstEl){
        const dCol = dst<=-100?'var(--bad)':dst<=-50?'var(--warn)':dst<=-30?'#c8a84b':dst<=0?'#9bb1dc':'var(--ok)';
        dstEl.innerHTML = `<span style="color:${dCol};font-weight:700">${dst}</span> нТл`;
      }
    } else {
      console.warn('[v42] parseDst failed');
      // v62: Dst ls cache
      const _lsDst = parseFloat(lsGet('last_dst_known'));
      if (isFinite(_lsDst)) { window._lastDst = {dst:_lsDst, time:'(кеш)', _cached:true}; _setSrcStatus('srcDst','cache'); } else { _setSrcStatus('srcDst','error'); }
      if(dstEl) dstEl.textContent = isFinite(_lsDst) ? _lsDst+' нТл (кеш)' : '—';
    }
  }

  // Wolf Sn
  if(snR.status === 'fulfilled'){
    window._lastWolfSn = snR.value;
    if (window._lastWolfSn) { _setSrcStatus('srcSn',window._lastWolfSn._delivery==='local_snapshot'?'snapshot':'ok'); } else { _setSrcStatus('srcSn','error'); }
    if(window._lastWolfSn){
      const snEl = el('nowSn');
      const {sn, dateStr, provisional} = window._lastWolfSn;
      const snCls = sn>150 ? 'color:var(--bad)' : (sn>80 ? 'color:var(--warn)' : 'color:var(--ok)');
      snEl.style.display='inline-flex';
      const delivery = window._lastWolfSn._delivery==='local_snapshot' ? ' · snapshot' : '';
      snEl.innerHTML = `Sn <strong style="${snCls}">${sn}</strong>${provisional?' (попер.)':''} <span class="muted" style="font-size:11px">${dateStr}${delivery}</span>`;
    }
  } else {
    window._lastWolfSn = null;
    _setSrcStatus('srcSn','error');
    const snEl=el('nowSn');
    if(snEl){snEl.textContent='Sn: дані недоступні';snEl.style.display='inline-flex';}
  }

  // v42: Real-time solar wind (DSCOVR Bz + Vsw)
  // v88.8.62-fp138: secondary live rails are non-critical; never let them block startup.
  try { await withTimeout(signal=>fetchBzNow(signal), 3500, 'Bz live');  } catch(_){ globalThis.NRDiagnostics?.record('catch.233','recoverable'); if(window._DEBUG)console.warn('[silent]')}
  try { await withTimeout(signal=>fetchVswNow(signal), 3500, 'Vsw live'); } catch(_){ globalThis.NRDiagnostics?.record('catch.234','recoverable'); if(window._DEBUG)console.warn('[silent]')}
  // v87.15 U6: GOES X-ray flare — Solar flare monitoring
  try { await withTimeout(signal=>fetchXrayNow(signal), 3500, 'Xray live'); } catch(_){ globalThis.NRDiagnostics?.record('catch.235','recoverable'); if(window._DEBUG)console.warn('[silent]')}
  // v62: Bz/Vsw localStorage cache + v87.16 A4: separate status indicators
  if (isFinite(lastBz))  { lsSet('last_bz_known', lastBz);  _setSrcStatus('srcBz','ok'); }
  else { const _lbz=parseFloat(lsGet('last_bz_known')); if(isFinite(_lbz)){ lastBz=_lbz; _setSrcStatus('srcBz','cache'); } else _setSrcStatus('srcBz','error'); }
  if (isFinite(lastVsw)) { lsSet('last_vsw_known', lastVsw); _setSrcStatus('srcVsw','ok'); }
  else { const _lvsw=parseFloat(lsGet('last_vsw_known')); if(isFinite(_lvsw)){ lastVsw=_lvsw; _setSrcStatus('srcVsw','cache'); } else _setSrcStatus('srcVsw','error'); }
  const sciBzEl  = document.getElementById('sciBz');
  const _lastBzN = Number(lastBz);
  if(sciBzEl) sciBzEl.textContent = Number.isFinite(_lastBzN) ? _lastBzN.toFixed(1)+' нТл' : '\u2014';
  const sciVswEl = document.getElementById('sciVsw');
  const _lastVswN = Number(lastVsw);
  if(sciVswEl) sciVswEl.textContent = Number.isFinite(_lastVswN) ? Math.round(_lastVswN)+' км/с' : '\u2014';
  // v87.15 U6: render X-ray flare + localStorage cache + alert if M/X class + source status
  try {
    const sciXrayEl = document.getElementById('sciXray');
    if (sciXrayEl) {
      const xr = window._lastXray;
      if (xr && xr.class) {
        sciXrayEl.textContent = xr.class;
        const letter = xr.class[0];
        sciXrayEl.style.color = letter === 'X' ? '#ff4444' : letter === 'M' ? '#ff9944' : letter === 'C' ? '#ffcc44' : '#63be7b';
        sciXrayEl.style.fontWeight = (letter === 'X' || letter === 'M') ? '800' : '600';
        lsSet('last_xray_class', xr.class);
        _setSrcStatus('srcXray', xr._delivery==='same_origin_snapshot' ? 'snapshot' : 'ok');
      } else {
        const cached = lsGet('last_xray_class');
        if (cached) { sciXrayEl.textContent = cached + ' (кеш)'; sciXrayEl.style.color = 'var(--dim)'; _setSrcStatus('srcXray','cache'); }
        else _setSrcStatus('srcXray','error');
      }
    }
  } catch(e) { globalThis.NRDiagnostics?.record('catch.236','recoverable');  _setSrcStatus('srcXray','error'); }

  // v87.16 A1 fix: показати Sn_pen в формулі UI коли реально активний у розрахунку
  try {
    const _snEl = document.getElementById('formulaSnAddon');
    const _snVal = window._lastWolfSn ? (window._lastWolfSn.sn ?? 0) : 0;
    if (_snEl) _snEl.style.display = 'none'; // fp297: Sn is context-only
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.207','recoverable'); }

  try{
    renderCurrentPanel();
  }catch(e){ globalThis.NRDiagnostics?.record('catch.237','recoverable');
    console.error('renderCurrentPanel error:', e);
    el('nowError').textContent = 'Помилка панелі: ' + e.message;
  }

  try{
    renderPanchanga(sunriseUTC(new Date(todayKyivStr()+'T12:00:00Z'))); // v37.6: noon для консистентності з G
  }catch(e){ globalThis.NRDiagnostics?.record('catch.238','recoverable');  console.error('renderPanchanga error:', e); }

  // 27-day (P0: fallback на 45-day-forecast.json)
  async function try27Day(){
    if(t27R.status === 'fulfilled'){
      try{
        const r27 = parse27Day(t27R.value);
        if(r27.length === 0) throw new Error('порожній результат');
        const todayStr = todayKyivStr();
        const r27today = r27.find(r=>fmtDate(r.date)===todayStr) || r27[0];
        window._lastF107 = r27today && isFinite(r27today.flux) ? r27today.flux : null;
        render27Day(r27, last3D);
    // fp53-B: re-render 3-day quick cards AFTER _27dComputed is populated so delta lookup works.
    // render3Day ran earlier when _27dComputed was empty → delta column showed nothing.
    try {
      const _l3d = window._gIndex_last3D || last3D;
      if (_l3d && typeof render3Day === 'function') render3Day(_l3d);
    } catch(_e){ window.NRDiagnostics?.record('legacy.catch.208','recoverable'); }
        _setSrcStatus('src27Day','ok');
        if(window._DEBUG) console.log('[v43] 27-day OK (primary .txt)');
        return;
      }catch(err){ globalThis.NRDiagnostics?.record('catch.239','recoverable');
        console.warn('[v43] 27-day parse failed:', err.message, '— trying UAF fallback');
      }
    } else {
      console.warn('[v43] 27-day fetch failed:', t27R.reason?.message, '— trying UAF fallback');
    }
    // UAF fallback is web-only; Play continues to the NOAA/local fallback below.
    if(!window.GINDEX_PLAY_CHANNEL){
    try{
      let r27uaf = window._uafCache27Day;
      if (!r27uaf || !r27uaf.length) {
        const _uafHtml = await withTimeout(fetchTextWithCORS(URL_UAF_AURORA), 5000, 'UAF-27day');
        const _uaf = parseUafAurora(_uafHtml);
        r27uaf = uafTo27DayFormat(_uaf);
      }
      if(r27uaf && r27uaf.length){
        window._lastF107 = null; // UAF не дає F10.7
        render27Day(r27uaf, last3D);
        _setSrcStatus('src27Day','cache');
        el('twentysevenError').textContent = '⚠ NOAA 27-day .txt недоступний — показано UAF Alaska mirror (без F10.7)';
        if(window._DEBUG) console.log('[v88.6.9] 27-day UAF Alaska OK ('+r27uaf.length+' days)');
        return;
      }
    }catch(uafErr){ globalThis.NRDiagnostics?.record('catch.240','recoverable');
      console.warn('[v88.6.9] UAF 27-day fallback failed:', uafErr.message, '— trying 45-day fallback');
    }
    }
    // Fallback: 45-day-forecast.json → parse45Day → конвертуємо у формат r27
    try{
      const fb45 = await withTimeout(fetchTextWithCORS(URL_45DAY_FB), 5000, '45-day-fallback');
      const rows45 = parse45Day(fb45);
      if(!rows45.length) throw new Error('45-day: порожній масив');
      const r27fb = apOnlyTo27Day(rows45);
      const todayStr = todayKyivStr();
      const r27today = r27fb.find(r=>fmtDate(r.date)===todayStr) || r27fb[0];
      window._lastF107 = r27today && Number.isFinite(r27today.flux) ? r27today.flux : null;
      render27Day(r27fb, last3D);
      _setSrcStatus('src27Day','cache');
      el('twentysevenError').textContent = '⚠ 27-day недоступний — показано 45-day Ap; максимум Kp із добового Ap не визначається';
      if(window._DEBUG) console.log('[v43] 45-day fallback OK,', r27fb.length, 'рядків');
    }catch(e2){ globalThis.NRDiagnostics?.record('catch.241','recoverable');
      console.warn('[v43] 45-day fallback failed:', e2.message);
      // v62: synthetic 27-day з поточного Kp + lsGet
      const _kp27 = (lastWWV && isFinite(lastWWV.kNow)) ? lastWWV.kNow
                  : parseFloat(lsGet('last_kp_known')) || 2.0;
      const _syn27 = Array.from({length:27},(_,i)=>{
        const d=new Date(todayKyivStr()+'T12:00:00Z'); d.setUTCHours(0,0,0,0); d.setUTCDate(d.getUTCDate()+i);
        return {date:d, flux:null, Ap:null, kpMax:_kp27, _synthetic:true};
      });
      render27Day(_syn27, last3D);
      _setSrcStatus('src27Day','synthetic');
      el('twentysevenError').textContent = '⚠ NOAA 27/45-day недоступні — synthetic прогноз (Kp='+_kp27.toFixed(1)+')';
    }
  }
  // v88.6.9: try27Day у outer try щоб помилка не зламала рендеринг
  try {
    await try27Day();
  } catch(e) { globalThis.NRDiagnostics?.record('catch.242','recoverable');
    console.warn('[loadAll] try27Day failed:', e.message);
    _setSrcStatus('src27Day','error');
  }

  // ── Freshness badge ──
  updateFreshnessBadge();

  try{ syncV702UI(); }catch(e){ globalThis.NRDiagnostics?.record('catch.243','recoverable');  console.warn('syncV702UI:', e); }
  // v88.8.51-fp128 BUGFIX: renderRegimeCards() раніше викликалась ЛИШЕ ОДИН РАЗ при
  // початковому завантаженні сторінки (addEventListener('load',...)), НЕ в кожному
  // циклі loadAll(). Якщо на той єдиний момент live Kp (lastWWV.kNow) ще не встиг
  // прийти з мережі (race condition), картка "космопогода" назавжди застрягала на
  // fallback-значенні — жодне наступне авто-оновлення (кожні N хв) її не оновлювало,
  // на відміну від hero-кільця/GNSS, які проходять через syncV702UI() тут же.
  // Тепер renderRegimeCards() теж в циклі — самокорегується на наступному refresh.
  // Regime cards remain retired until independent outcomes exist.
  try{ if(typeof renderUnifiedIndicesPanel === 'function') renderUnifiedIndicesPanel(); }catch(e){ globalThis.NRDiagnostics?.record('catch.244','recoverable'); if(window._DEBUG)console.warn('[fp126 unifiedIndices]:',e.message)}
  // fp54-A: _daySlots may now be populated (from renderDayForecast earlier in the cycle)
  // Final pass to patch any stale "Немає даних по слотах" placeholders.
  setTimeout(() => {
    try { if(typeof _patchStaleLoadingDOM === 'function') _patchStaleLoadingDOM(); } catch(_e){ window.NRDiagnostics?.record('legacy.catch.209','recoverable'); }
    try { if(typeof _applyStormGuardDOM === 'function') _applyStormGuardDOM(); } catch(_e){ window.NRDiagnostics?.record('legacy.catch.210','recoverable'); }
    // v88.8.51-fp128 BUGFIX: hero-число іноді застрягало на G_now (fallback) замість
    // вердикту дня — підтверджено вручну: syncHero() викликаний повторно одразу дає
    // правильний результат (entry.eng вже доступний), отже це race condition між
    // паралельними syncHero()-викликами при завантаженні сторінки, не баг логіки.
    // Гарантований відкладений повтор самокоригує це на кожному циклі.
    try { if(typeof syncHero === 'function') syncHero(); } catch(_e){ window.NRDiagnostics?.record('legacy.catch.211','recoverable'); }
  }, 400);
  try{ applyWowFromG(); }catch(e){ globalThis.NRDiagnostics?.record('catch.245','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  el('btnRefresh').disabled = false;
}/* NR_FN_END 275 */

/* NR_FN_BEGIN 348 */function loadScenario(key) {
  if (key === 'today') {
    // Зчитати поточні значення з дашборду
    const kpEl  = document.getElementById('sciKp');
    const gEl   = document.getElementById('nowG');
    const aiEl  = document.getElementById('nowAi');
    const kpNow = parseFloat(kpEl ? kpEl.textContent : '') || 2;
    // Розкладемо ΣAᵢ з поточного G: ΣAᵢ = G - (2-Kp)
    const gNow  = parseFloat(gEl ? gEl.textContent.replace('G','') : '') || 0;
    const aiNow = gNow - kpDayTerm(kpNow);
    setSlider('g2kp', kpNow);
    setSlider('g2li', 0);
    setSlider('g2mi', 0);
    setSlider('g2ei', 0);
    setSlider('g2pi', parseFloat(aiNow.toFixed(1)));
    document.getElementById('g2eiVal').title = 'Сумарний ΣAᵢ перенесено в Pᵢ для спрощення';
    syncG2('📍 Сьогоднішні значення з дашборду (ΣAᵢ агрегований у Pᵢ)');
    return;
  }
  const s = G2_SCENARIOS[key];
  if (!s) return;
  setSlider('g2kp', s.kp);
  setSlider('g2li', s.li);
  setSlider('g2mi', s.mi);
  setSlider('g2ei', s.ei);
  setSlider('g2pi', s.pi);
  syncG2(s.label);
}/* NR_FN_END 348 */

/* NR_FN_BEGIN 354 */function _noaaSeverityColor(level){
  // G/M/X/R/S завжди мають цифру в кінці — беремо як грубу оцінку тяжкості 1-5
  const n = parseInt((level||'').replace(/[^0-9.]/g,''), 10) || 1;
  if (n >= 4) return '#ff6b6b';   // критично
  if (n >= 2) return '#ffb347';   // помітно
  return '#9bd49e';               // низько, інформаційно
}/* NR_FN_END 354 */

/* NR_FN_BEGIN 355 */function _noaaPlainExplain(type, level){
  const letter = (level||'').charAt(0);
  const num = parseInt((level||'').replace(/[^0-9]/g,''),10) || 1;
  const entry = _NOAA_LEVEL_EXPLAIN[letter];
  if(!entry) return 'Офіційне повідомлення NOAA про космічну погоду.';
  const idx = Math.min(num-1, entry[1].length-1);
  return entry[1][idx] || 'Офіційне повідомлення NOAA про космічну погоду.';
}/* NR_FN_END 355 */
