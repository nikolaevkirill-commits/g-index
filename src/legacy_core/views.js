/* NR_FN_BEGIN 020 */function _ensureToastContainer(){
  let c = document.getElementById('_toastContainer');
  if(c) return c;
  c = document.createElement('div');
  c.id = '_toastContainer';
  c.style.cssText = 'position:fixed;top:16px;right:16px;z-index:10000;display:flex;flex-direction:column;gap:8px;max-width:340px;pointer-events:none';
  // Mobile: bottom-anchored
  if(window.innerWidth < 600){ c.style.cssText = c.style.cssText.replace('top:16px;right:16px','bottom:16px;left:16px;right:16px;max-width:none'); }
  document.body.appendChild(c);
  return c;
}/* NR_FN_END 020 */

/* NR_FN_BEGIN 021 */function showToast(message, type='info', timeoutMs=null){
  const c = _ensureToastContainer();
  const t = document.createElement('div');
  const colors = {
    info:    { bg:'#1e2a44', border:'#2a3b61', text:'#cfe0ff', icon:'ℹ️' },
    success: { bg:'#0a2a15', border:'#2bd47d', text:'#9ce6c0', icon:'✓' },
    warn:    { bg:'#2a1f0a', border:'#ffaa33', text:'#ffd99e', icon:'⚠' },
    error:   { bg:'#2a0808', border:'#ff6b6b', text:'#ff9999', icon:'✗' }
  };
  const c_ = colors[type] || colors.info;
  const ttl = timeoutMs ?? (type === 'error' || type === 'warn' ? 6000 : 4000);
  t.style.cssText = `background:${c_.bg};border:1px solid ${c_.border};color:${c_.text};padding:10px 14px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.4);font-size:13px;line-height:1.4;display:flex;align-items:flex-start;gap:8px;pointer-events:auto;cursor:pointer;animation:toastSlideIn .2s ease-out`;
  t.innerHTML = `<span style="flex-shrink:0">${c_.icon}</span><span style="flex:1">${String(message).replace(/</g,'&lt;')}</span><span style="flex-shrink:0;opacity:.5;font-size:16px;line-height:1">×</span>`;
  t.onclick = () => t.remove();
  c.appendChild(t);
  setTimeout(() => { t.style.transition='opacity .25s'; t.style.opacity='0'; setTimeout(()=>t.remove(), 260); }, ttl);
  return t;
}/* NR_FN_END 021 */

/* NR_FN_BEGIN 022 */function showToastConfirm(message, onConfirm, onCancel){
  const c = _ensureToastContainer();
  const t = document.createElement('div');
  t.style.cssText = 'background: var(--border);border:1px solid #2a3b61;color: var(--text2);padding:14px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.4);font-size:13px;line-height:1.4;pointer-events:auto;animation:toastSlideIn .2s ease-out';
  t.innerHTML = `<div style="margin-bottom:10px">${String(message).replace(/</g,'&lt;')}</div>
    <div style="display:flex;gap:6px;justify-content:flex-end">
      <button class="_tcCancel" style="padding:5px 12px;background: var(--border);color: var(--muted);border:1px solid #2a3b61;border-radius:5px;cursor:pointer;font-size:12px">Скасувати</button>
      <button class="_tcOk" style="padding:5px 12px;background: var(--ok);color:#0a1020;border:none;border-radius:5px;cursor:pointer;font-size:12px;font-weight:700">OK</button>
    </div>`;
  c.appendChild(t);
  t.querySelector('._tcOk').onclick    = () => { t.remove(); if(onConfirm) onConfirm(); };
  t.querySelector('._tcCancel').onclick = () => { t.remove(); if(onCancel) onCancel(); };
  return t;
}/* NR_FN_END 022 */

/* NR_FN_BEGIN 039 */function renderTanitaShadow(){
  const sum=document.getElementById('tanitaShadowSummary');
  const body=document.getElementById('tanitaShadowBody');
  if(!sum||!body) return;
  const today=todayKyivStr();
  const feed=window._autoForecastFeed||{};
  const day=feed.days&&feed.days[today]||{};
  const tanita=day.tanita_shadow||{};
  const status=_autoProspectiveStatus||{};
  const ts=status.tanita_shadow||{};
  const fr=ts.formula_reconstruction||{};
  const hold=ts.holdout||{};
  const strong=hold.strong_image_against_pdf||{};
  const gate=_tanitaPromotionGate||{};
  const evidence=gate.evidence||{};
  const prospective=evidence.prospective||{};
  const residual=evidence.residual_holdout||{};
  const promotion=gate.promotion||{};
  const independent=Number(prospective.independent_real_outcomes||0);
  const required=Number(prospective.required||promotion.required_frozen_independent_outcomes||100);
  const tScore=Number.isFinite(Number(tanita.score))?Number(tanita.score):null;
  const base=Number.isFinite(Number(day.score))?Number(day.score):null;
  const delta=tScore!==null&&base!==null?tScore-base:null;
  const conflict=delta!==null&&((tScore*base<0)||Math.abs(delta)>=2);
  const icons=Array.isArray(tanita.detected_icons)&&tanita.detected_icons.length?tanita.detected_icons.join(', '):'надійні іконки не виділені';
  const relation=tScore===null||base===null?'немає повної пари':conflict?'КОНФЛІКТ':Math.sign(tScore)===Math.sign(base)?'напрям збігається':'часткова розбіжність';
  sum.textContent='🔐 Таніта SHADOW · вплив на G = 0 · '+relation+
    ' · формула '+(fr.verified_exact||0)+'/'+(fr.dates||0)+' відтворена'+
    (tScore!==null?' · сьогодні shadow '+(tScore>0?'+':'')+tScore:'')+
    (conflict?' · ⚠ перевірити':'');
  body.innerHTML=
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:6px">'+
      '<div style="padding:7px 9px;border:1px solid var(--border);border-radius:8px"><b>Детермінована формула</b><br><code>(2−Kp)+Місяць+Затемнення+Σваг</code><br>Перевірка: '+(fr.verified_exact||0)+'/'+(fr.dates||0)+', помилок '+(fr.mismatches||0)+'</div>'+
      '<div style="padding:7px 9px;border:1px solid var(--border);border-radius:8px"><b>Сьогодні</b><br>Таніта image-shadow: '+(tScore===null?'—':(tScore>0?'+':'')+tScore)+
        '<br>Основний PDF/Engine reference: '+(base===null?'—':(base>0?'+':'')+base)+(delta===null?'':' · Δ '+(delta>0?'+':'')+delta)+
        '<br><b style="color:'+(conflict?'#ffd37a':'#b9d8ff')+'">'+relation+'</b></div>'+
      '<div style="padding:7px 9px;border:1px solid var(--border);border-radius:8px"><b>Розпізнані символи</b><br>'+icons+'</div>'+
      '<div style="padding:7px 9px;border:1px solid var(--border);border-radius:8px"><b>Історична перевірка (не real outcomes)</b><br>strong-image n='+(strong.n||0)+
        ' · exact '+(strong.exact==null?'—':(strong.exact*100).toFixed(1)+'%')+
        ' · ±1 '+(strong.within1==null?'—':(strong.within1*100).toFixed(1)+'%')+
        ' · sign '+(strong.strict_sign==null?'—':(strong.strict_sign*100).toFixed(1)+'%')+'</div>'+
      '<div style="padding:7px 9px;border:1px solid '+(promotion.allowed?'rgba(67,230,167,.4)':'rgba(255,190,75,.38)')+';border-radius:8px"><b>Незалежні результати</b><br>'+independent+'/'+required+
        ' заморожених пар<br>Promotion: <b>'+(promotion.allowed?'ДОЗВОЛЕНО':'HOLD')+'</b></div>'+
    '</div>'+
    '<div style="margin-top:7px;color:'+(conflict?'#ffd37a':'var(--dim)')+'">'+
      (conflict?'⚠ Це окремий сигнал для перевірки, не автоматична заміна рішення. ':'')+
      'Image-decoder має score effect 0; він пояснює та пререєструє кандидата, але не змінює Hero, PDF/Engine reference чи оперативний стан. '+
      (Number(residual.strict_sign_delta||0)<=0?'На chronological holdout приріст проти baseline відсутній. ':'')+
      'Активація можлива лише після '+required+' незалежних outcome-пар і повторного аудиту.</div>';
}/* NR_FN_END 039 */

/* NR_FN_BEGIN 041 */function renderSingleFinalDecision(){
  const el=document.getElementById('singleFinalDecisionBody');
  if(!el) return;
  const today=todayKyivStr();
  const day=window._autoForecastFeed&&window._autoForecastFeed.days&&window._autoForecastFeed.days[today];
  if(!day||!day.final_decision){
    el.textContent='Денний PDF/Engine reference ще не завантажений.';
    return;
  }
  const f=day.final_decision;
  const score=Number(f.score);
  const referenceLabel=score>=2?'СПРИЯТЛИВИЙ ДЕННИЙ СИГНАЛ':score>0?'ПОМІРНО СПРИЯТЛИВИЙ ДЕННИЙ СИГНАЛ':score===0?'НЕЙТРАЛЬНИЙ ДЕННИЙ СИГНАЛ':score<=-2?'НЕСПРИЯТЛИВИЙ ДЕННИЙ СИГНАЛ':'ОБЕРЕЖНИЙ ДЕННИЙ СИГНАЛ';
  const sources={
    expert_formula_raw:'формула експерта (raw)',
    verified_expert_pdf:'перевірений прогноз експерта',
    engine_v18_5_frozen:'автономний Engine v18.5',
    engine_tanita_selective_v1:'валідований Engine + Таніта router',
    engine_residual_rule_v1:'валідована поправка помилки Engine'
  };
  const color=score>=2?'#43e6a7':score>0?'#b9e986':score===0?'#cbd5e1':score<=-2?'#ff7070':'#ffd37a';
  const _bgsFetchedMs=Date.parse((_bgsSpaceWeather&&_bgsSpaceWeather.fetched_at)||'');
  const _bgsFresh=Number.isFinite(_bgsFetchedMs) && (Date.now()-_bgsFetchedMs)<=12*3600000;
  // fp392: a BGS restriction copied into AUTO_FORECAST_FEED can outlive the
  // snapshot that produced it. Archived BGS remains visible in its own panel
  // but cannot masquerade as a current decision restriction.
  const restrictions=(Array.isArray(f.restrictions)?f.restrictions:[]).filter(x=>
    _bgsFresh || !/^BGS\b/i.test(String(x||''))
  );
  el.innerHTML=
    '<div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap">'+
      '<strong style="font-size:24px;color:'+color+'">REFERENCE '+(score>0?'+':'')+score+' · '+referenceLabel+'</strong>'+
      '<span style="color:#9fb6c8">Джерело reference: '+(sources[f.authority]||f.authority)+' · '+(f.confidence_tier||'без рівня')+'</span>'+
    '</div>'+
    '<div style="margin-top:7px;color:#c7d8e6">'+
      (f.tanita_corroborates?'✓ Таніта підтверджує напрям. ':'Таніта не використовується як другий голос. ')+
      (restrictions.length?'<span style="color:#ffd37a">Обмеження: '+restrictions.join(' · ')+'</span>':'Критичних додаткових обмежень у feed немає.')+
    '</div>'+
    '<div style="margin-top:5px;font-size:10px;color:#ffd37a">Це не команда. Оперативну дію визначає обережніший стан у Hero з live-фоном, Kp і часовими блокуваннями.</div>';
}/* NR_FN_END 041 */

/* NR_FN_BEGIN 069 */function renderRegimeCards(){
  const wrap = el('regimeCards');
  if(!wrap || !_dailyMaster) return;
  const today = (typeof fmtDate==='function') ? todayKyivStr() : todayKyivStr();
  const m = _dailyMaster[today];
  if(!m){ wrap.style.display='none'; return; }
  wrap.style.display='grid';

  // Score card
  const sv=el('rcScoreVal'), sc=el('rcScoreCls');
  if(sv){
    const s=m.score;
    sv.textContent=(s>0?'+':'')+s;
    const clsCol = m.class3==='positive'?'#2bd47d':(m.class3==='negative'?'#ff6b6b':'#9bb1dc');
    sv.style.color=clsCol;
    sc.textContent=m.class3==='positive'?'позитивний':(m.class3==='negative'?'негативний':'нейтральний');
  }
  // Regime card
  const reg=REGIME_LABEL[m.regime_type]||REGIME_LABEL.baseline;
  const rv=el('rcRegimeVal'), rd=el('rcRegimeDesc'), rc=el('rcRegime');
  if(rv){ rv.textContent=reg.t; rv.style.color=reg.c; rd.textContent=reg.d;
    rc.title='Режим: '+reg.t+'. '+reg.d+'. Надійність: '+reg.conf+'.\nРежими розрізнені за LATENT_REGIME_AUDIT: extreme=детермінований астро (~85%), editorial=Tarita uplift, neutral=змішаний (true/hidden polarity).'; }
  // Confidence card — ПРОСПЕКТИВНА надійність (non-circular), не лише sealed precision
  const cv=el('rcConfVal'), cp=el('rcConfPrec'), cc=el('rcConf');
  if(cv){ cv.textContent=CONF_LABEL[m.confidence]||'—'; cv.style.color=CONF_COLOR[m.confidence]||'#9bb1dc';
    const relP = m.reliability_prospective!=null ? Math.round(m.reliability_prospective*100)+'%' : '';
    const stable = m.regime_stable===true ? ' ✓стаб' : (m.regime_stable===false ? ' ⚠зсув' : '');
    cp.textContent = relP ? ('надійн. '+relP+stable) : ('precision '+Math.round((m.precision||0)*100)+'%');
    cc.title='Впевненість '+CONF_LABEL[m.confidence]+'. ПРОСПЕКТИВНА надійність режиму (post-freeze, non-circular): '+relP+'.\n'+
      (m.regime_stable===false?'⚠ Режим нестаціонарний — точність змінюється в часі (π_k(t)).\n':'')+
      'extreme_positive 93% стабільний · extreme_negative 71% зсув · neutral 21% шум.\nНа відміну від sealed precision, це міряно на датах ПІСЛЯ заморозки engine.'; }
  // Space weather card
  const spv=el('rcSpaceVal'), spd=el('rcSpaceDesc');
  if(spv){
    // v88.8.40: BUGFIX — раніше брали m.kp зі застарілого _dailyMaster snapshot (часто synthetic 2.0),
    // тому картка показувала "Kp 2 спокій" навіть коли live Kp=6-7 (шторм). Пріоритет — live NOAA (lastWWV.kNow).
    const _liveKpSW = (typeof lastWWV!=='undefined' && lastWWV && isFinite(lastWWV.kNow)) ? lastWWV.kNow : null;
    const kp = _liveKpSW!=null ? _liveKpSW : m.kp;
    const dst=m.dst_min, syn = _liveKpSW!=null ? false : m.kp_synthetic;
    let regime='спокій', col='#2bd47d';
    if(dst!=null && dst<=-30){ regime='буря'; col='#ff6b6b'; }
    else if(kp>=6){ regime='буря'; col='#ff6b6b'; }
    else if(kp>=5){ regime='збурення'; col='#ffaa33'; }
    spv.textContent='Kp '+(kp!=null?kp.toFixed(2).replace(/\.?0+$/,''):'—')+(syn?'*':'');
    spv.style.color=col;
    // v88.8.55: дебаг-рядок [dbg:...] прибрано (fp128 TEMP DEBUG підтверджено стабільним
    // на fp123, 2026-07-04 → 2026-07-06, діагностика завершена).
    spd.textContent=(dst!=null?'Dst '+dst+' · ':'')+regime;
  }
}/* NR_FN_END 069 */

/* NR_FN_BEGIN 070 */function renderUnifiedIndicesPanel(){
  const box = el('unifiedIndicesPanel');
  if(!box) return;
  try{
    const dayRef = new Date(todayKyivStr()+'T12:00:00Z');
    // Day indices use the same canonical sunrise anchor as G/Pi and the
    // main Jyotish card.  Do not mix an arbitrary noon snapshot into a
    // day-level panel (audit C4-C6).
    const p = (typeof computePanchanga==='function') ? computePanchanga(sunriseUTC(dayRef)) : null;
    if(!p) { box.style.display='none'; return; }
    box.style.display='block';
    // v88.8.86-fp165: снепшот НАЗВ (не тільки чисел) для Change Log — запит Kyrylo/аудит:
    // "Тітхі: Dashami → Ekadashi", а не просто "-0.8". _saveGHistory() підхопить це поле.
    window.__lastPanchNames = {
      tithi: p.tithi?.name || null, nakshatra: p.nakshatra?.name || null,
      yoga: p.yoga?.name || null, karana: p.karana?.name || null
    };

    let _uipOperationalScore = null;
    try {
      const _uipG = isFinite(window.__uiState?.gNow) ? Number(window.__uiState.gNow) : NaN;
      const _uipKp = isFinite(window.__uiState?.kpNow) ? Number(window.__uiState.kpNow) : NaN;
      const _uipSig = resolveDaySignal_v88825(new Date(todayKyivStr()+'T12:00:00Z'), _uipG, _uipKp, {isToday:true});
      if (_uipSig && isFinite(_uipSig.decisionScore)) _uipOperationalScore = Number(_uipSig.decisionScore);
    } catch(_e){ window.NRDiagnostics?.record('legacy.catch.67','recoverable'); }
    const _uipRestricted = _uipOperationalScore !== null && _uipOperationalScore < 0;
    const rowEl = el('uipPanchangaRow');
    if(rowEl){
      // v88.8.82-fp161: ⓘ-підказка на кожен індекс — що це і який традиційний вплив
      // (запит Kyrylo: наведення на символ → буква "і" з поясненням). Джерело формулювань:
      // Posibnyk_Part2_Jyotish.docx + BPHS (vol1/2), той самий канон що вже використовує
      // дашборд для рекомендацій "краща дія". Це традиційна ведична асоціація,
      // НЕ медичний діагноз — так само як і решта дашборду.
      const EXPLAIN = {
        'Тітхі': 'Місячний день (1 з 30, за кутовою відстанню Місяць−Сонце). Традиційно пов\'язується із загальним емоційним тонусом дня. Несприятливі тітхі (4, 6, 8, 9, 12, 14, 29, 30) вважаються менш вдалими для нових справ.',
        'Накшатра': '1 з 27 "місячних сузір\'їв" (по 13°20\'), де зараз Місяць. У ведичній традиції впливає на характер дня — окремі накшатри вважаються сприятливими для конкретних типів справ (переговори, лікування, подорожі тощо).',
        'Йога': 'Сума довгот Сонця+Місяця, поділена на 27 частин. Показує загальне поєднання сонячної й місячної енергії дня — окремі йоги традиційно сприятливі, окремі несприятливі.',
        'Карана': 'Половина тітхі (60 у місяці). Рухомі карани (Бава/Балава/Каулава/Тайтіла/Ваніджа) традиційно сприятливі для активних справ; нерухомі — для завершення й стабільних справ.'
      };
      const items = [
        ['Тітхі', p.tithi?.name, p.tithi?.score],
        ['Накшатра', p.nakshatra?.name, p.nakshatra?.score],
        ['Йога', p.yoga?.name, p.yoga?.score],
        ['Карана', p.karana?.name, p.karana?.score]
      ];
      rowEl.innerHTML = items.map(([label, name, score])=>{
        if(name==null) return '';
        // A Panchanga component is a traditional factor already included in G_raw,
        // never an independent green permission. Under a restrictive operational
        // state it stays neutral/purple even when its local score is positive.
        const col = score>0 ? (_uipRestricted ? '#cfb6ff' : '#7ab8d4') : score<0 ? '#ff8866' : 'var(--muted)';
        const expl = EXPLAIN[label] || '';
        return `<div style="padding:5px 6px;border-radius:6px;background:rgba(255,255,255,.03);text-align:center">
          <div style="font-size:8px;color:var(--faint);text-transform:uppercase">${label}
            <span class="hint" tabindex="0" style="cursor:help;color:var(--faint);border:1px solid var(--faint);border-radius:50%;width:11px;height:11px;display:inline-flex;align-items:center;justify-content:center;font-size:7px;font-style:normal;margin-left:2px;vertical-align:middle">і<span class="hint-pop">${_escHtml(expl)}<br><span style="opacity:.6;font-size:10px">Традиційна ведична асоціація, не медичний діагноз.</span></span></span>
          </div>
          <div style="font-size:11px;font-weight:600;color:${col}">${name}</div>
          <div style="font-size:8px;color:var(--faint)">фактор · не прогноз</div>
        </div>`;
      }).join('');
    }

    // Сирий сигнал: live Kp + G_now, з розбивкою (та сама арифметика, що в heroHierarchy)
    const rawEl = el('uipRaw');
    if(rawEl){
      const kpN = (window.__uiState && isFinite(window.__uiState.kpNow)) ? Number(window.__uiState.kpNow)
                : (typeof lastWWV!=='undefined' && lastWWV && isFinite(lastWWV.kNow)) ? lastWWV.kNow : null;
      const gN = (window.__uiState && isFinite(window.__uiState.gNow)) ? Number(window.__uiState.gNow) : null;
      if(kpN!=null && gN!=null){
        const sigma = gN - kpDayTerm(kpN);
        rawEl.innerHTML = `Kp <b>${kpN.toFixed(2)}</b> · G_now <b style="color:${gN>=0?'var(--ok)':'#ff8866'}">${gN>=0?'+':''}${gN.toFixed(2)}</b> <span style="font-size:10px;color:var(--faint)">(=2−Kp${sigma>=0?'+':''}${sigma.toFixed(1)} панчанга)</span>`;
      } else {
        rawEl.innerHTML = '<span style="color:var(--faint)">даних недостатньо</span>';
      }
    }

    // Вердикт: PDF/Engine (пріоритетне джерело за архітектурою: expert_override>engine_v18.5>cal_score)
    const vEl = el('uipVerdict');
    if(vEl){
      const snap = (typeof getEngineScore==='function') ? getEngineScore(now) : null;
      if(snap && isFinite(snap.eng)){
        const sc = Math.max(-3, Math.min(3, Math.round(Number(snap.eng))));
        const v = (typeof VERDICT_7CLASS!=='undefined') ? VERDICT_7CLASS[String(sc)] : null;
        const col = v ? v.color : 'var(--text2)';
        const lab = v ? v.label : '';
        const star = snap._expertOverride ? ' ★' : '';
        vEl.innerHTML = `<span style="color:${col}">${sc>=0?'+':''}${sc} ${lab}</span>${star}`;
      } else {
        vEl.innerHTML = '<span style="color:var(--faint)">даних недостатньо</span>';
      }
    }
  }catch(e){ globalThis.NRDiagnostics?.record('catch.66','recoverable');  if(window._DEBUG) console.warn('[unifiedIndicesPanel]', e.message); }
}/* NR_FN_END 070 */

/* NR_FN_BEGIN 071 */function renderHeroRegimePill(){
  const pill=el('heroRegimePill');
  if(!pill || !_dailyMaster) return;
  const today=(typeof fmtDate==='function')?todayKyivStr():todayKyivStr();
  const m=_dailyMaster[today];
  if(!m){pill.style.display='none';return;}
  const reg=REGIME_LABEL[m.regime_type]||REGIME_LABEL.baseline;
  const relP=m.reliability_prospective!=null?Math.round(m.reliability_prospective*100)+'%':'';
  const stable=m.regime_stable===true?' ✓стаб':(m.regime_stable===false?' ⚠зсув':'');
  pill.style.display='block';
  pill.style.color=reg.c;
  pill.textContent='▸ '+reg.t+(relP?' · надійн. '+relP+stable:'');
  pill.title='Режим: '+reg.t+'. '+reg.d+'.\nПроспективна надійність: '+relP+stable+'\nДжерело: LATENT_REGIME_AUDIT_v1 (post-freeze prospective, non-circular).';
}/* NR_FN_END 071 */

/* NR_FN_BEGIN 073 */function renderBulletinV2(){
  const card = el('bulletinV2Card'), list = el('bulletinV2List');
  if(!card || !list || !_bulletinV2 || !_bulletinV2.length){ if(card) card.style.display='none'; return; }
  card.style.display='block';
  const clsCol = c => c==='positive'?'#2bd47d':(c==='negative'?'#ff6b6b':'#9bb1dc');
  list.innerHTML = _bulletinV2.map(b=>{
    const col = clsCol(b.class3);
    const s = (b.score>0?'+':'')+b.score;
    return `<div style="padding:8px 10px;border-radius:8px;border:1px solid var(--border2);background:rgba(11,18,32,.4);border-left:3px solid ${col}">
      <div style="font-size:12px;font-weight:700;color:var(--text)">${b.weekday} ${b.headline}</div>
      <div style="font-size:11px;color:var(--dim);margin-top:2px">Причина: ${b.reason}</div>
      <div style="font-size:11px;color:var(--dim)">Контекст: ${b.context}</div>
      <div style="font-size:11px;color:${col};margin-top:2px">→ ${b.action}</div>
    </div>`;
  }).join('');
}/* NR_FN_END 073 */

/* NR_FN_BEGIN 075 */function renderChronoPanel(){
  const card=el('chronoPanelCard'), body=el('chronoPanelBody'), prog=el('chronoProgress');
  if(!card){ return; }
  card.style.display='block';

  let entries=[];
  try{ entries=JSON.parse(localStorage.getItem('gindex_chrono_v2_abcd')||'[]'); }catch(e){ window.NRDiagnostics?.record('legacy.catch.68','recoverable'); }

  const valid=entries.filter(e=>e.exposure!=='invalid' && e.axis_a!=null && e.locked);
  const nv=valid.length;
  const today=todayKyivStr();
  const todayEntry=entries.find(e=>e.date===today);

  if(prog) prog.textContent='n='+nv+'/30';

  // ── QUALITY METRICS ──────────────────────────────────────────
  // 1. Coverage: days logged / days elapsed since first entry
  let coverage=null, coverageStr='—', coverageCol='var(--dim)';
  if(valid.length>=1){
    const first=valid[0].date;
    const firstD=new Date(first), todayD=new Date(today);
    const elapsed=Math.round((todayD-firstD)/(1000*86400))+1;
    coverage=Math.round(valid.length/elapsed*100);
    coverageStr=coverage+'%';
    coverageCol=coverage>=90?'var(--ok)':coverage>=70?'#ffaa33':'var(--bad)';
  }

  // 2. Median lag: ts (save time) - date (day start midnight local)
  let medLagStr='—', medLagCol='var(--dim)', medLagWarn='';
  const lags=valid.filter(e=>e.ts).map(e=>{
    const dayStart=new Date(e.date+'T20:00:00').getTime(); // expected fill after 20:00
    const lag=(e.ts-dayStart)/(1000*3600);
    return lag;
  }).filter(l=>l>-24 && l<48); // reasonable range
  if(lags.length>=1){
    lags.sort((a,b)=>a-b);
    const med=lags[Math.floor(lags.length/2)];
    medLagStr=(med>=0?'+':'')+med.toFixed(1)+'h від 20:00';
    medLagCol=Math.abs(med)<3?'var(--ok)':Math.abs(med)<12?'#ffaa33':'var(--bad)';
    const retro=lags.filter(l=>l>24).length;
    if(retro>0) medLagWarn=` · ⚠ ${retro} ретро-запис${retro>1?'ів':''}`;
  }

  // 3. Variance check (entropy proxy) — dead data if all axes near 0
  let varStr='—', varCol='var(--dim)', varWarn='';
  if(valid.length>=3){
    const means=['axis_a','axis_b','axis_c','axis_d'].map(k=>{
      const vs=valid.map(e=>e[k]||0);
      const m=vs.reduce((a,b)=>a+b,0)/vs.length;
      const v=vs.reduce((a,b)=>a+(b-m)**2,0)/vs.length;
      return v;
    });
    const avgVar=means.reduce((a,b)=>a+b,0)/4;
    varStr=avgVar.toFixed(2);
    varCol=avgVar>=1.5?'var(--ok)':avgVar>=0.5?'#ffaa33':'var(--bad)';
    if(avgVar<0.5) varWarn=' ⚠ низька варіативність — перевір чи не авто-заповнення';
  }

  // 4. Response bias — skip rate on "normal" days vs extreme days
  let biasStr='—', biasCol='var(--dim)', biasWarn='';
  if(valid.length>=5 && typeof _dailyMaster==='object' && _dailyMaster){
    const loggedDates=new Set(valid.map(e=>e.date));
    let extLogged=0, extTotal=0, baseLogged=0, baseTotal=0;
    Object.values(_dailyMaster).forEach(m=>{
      if(!m.date) return;
      const isExt=m.regime_type&&m.regime_type.startsWith('extreme');
      if(isExt){extTotal++;if(loggedDates.has(m.date))extLogged++;}
      else{baseTotal++;if(loggedDates.has(m.date))baseLogged++;}
    });
    const extRate=extTotal?extLogged/extTotal:null;
    const baseRate=baseTotal?baseLogged/baseTotal:null;
    if(extRate!==null && baseRate!==null && baseTotal>=5){
      const diff=Math.round((extRate-baseRate)*100);
      biasStr=(diff>=0?'+':'')+diff+'pp (extreme vs baseline)';
      biasCol=Math.abs(diff)<15?'var(--ok)':Math.abs(diff)<30?'#ffaa33':'var(--bad)';
      if(diff>20) biasWarn=' ⚠ selection bias: екстремальні дні логуєш частіше';
      if(diff<-20) biasWarn=' ⚠ selection bias: пропускаєш екстремальні дні';
    }
  }

  // Quality grade
  let grade='?', gradeCol='var(--dim)';
  if(nv>=3){
    const scores=[
      coverage!=null?(coverage>=90?2:coverage>=70?1:0):0,
      lags.length?(Math.abs(lags[Math.floor(lags.length/2)])<3?2:Math.abs(lags[Math.floor(lags.length/2)])<12?1:0):0,
      varStr!=='—'?(parseFloat(varStr)>=1.5?2:parseFloat(varStr)>=0.5?1:0):1,
      biasStr!=='—'?(Math.abs(parseInt(biasStr))<15?2:Math.abs(parseInt(biasStr))<30?1:0):1,
    ];
    const total=scores.reduce((a,b)=>a+b,0);
    grade=total>=7?'A':total>=5?'B':total>=3?'C':'D';
    gradeCol=total>=7?'var(--ok)':total>=5?'#ffaa33':'var(--bad)';
  }

  // Progress bar
  const pct=Math.min(100,Math.round(nv/30*100));
  const barCol=nv>=30?'var(--ok)':nv>=10?'#ffaa33':'#9bb1dc';

  // Today status
  const todayHtml=todayEntry&&todayEntry.axis_a!=null
    ?`<div style="margin-top:6px;padding:5px 10px;border-radius:7px;background:rgba(43,212,125,.06);border:1px solid rgba(43,212,125,.15);font-size:10px">
        ✓ Сьогодні записано · mean=${todayEntry.chrono_mean>=0?'+':''}${todayEntry.chrono_mean} (A=${todayEntry.axis_a} B=${todayEntry.axis_b} C=${todayEntry.axis_c} D=${todayEntry.axis_d}) 🔒
      </div>`
    :`<div style="margin-top:6px;padding:5px 10px;border-radius:7px;background:rgba(255,170,51,.06);border:1px solid rgba(255,170,51,.2);color:#ffaa33;font-size:10px">
        ⏳ Сьогодні ще не записано — заповни A/B/C/D ввечері (blind, до перегляду G)
      </div>`;

  const rMsg=nv<10
    ?`<div style="color:#ffaa33;font-size:10px;margin-top:4px">🔒 r заблоковано · ще ${10-nv} до перевірки</div>`
    :nv<30
    ?`<div style="color:var(--ok);font-size:10px;margin-top:4px">✅ r доступний у Python · ще ${30-nv} до тесту</div>`
    :`<div style="color:var(--ok);font-size:10px;margin-top:4px;font-weight:700">✅ n≥30 — Mann-Whitney тест!</div>`;

  // Phase 2 gate check
  const phase2Ready = nv>=30 && coverage!=null && coverage>=80 && ['A','B'].includes(grade);
  const phase2Html = `<div style="margin-top:8px;padding:6px 10px;border-radius:7px;
    border:1px solid ${phase2Ready?'var(--ok)':'var(--border2)'};
    background:${phase2Ready?'rgba(43,212,125,.08)':'rgba(11,18,32,.3)'};
    font-size:10px;color:${phase2Ready?'var(--ok)':'var(--dim)'}">
    ${phase2Ready
      ? '🚀 <b>Phase 2 розблоковано</b> — Personal Calibration Engine доступний (n≥30, coverage≥80%, Quality≥B)'
      : `🔒 Phase 2 (Personal Model): n=${nv}/30 · coverage=${coverageStr} · quality=${grade} — потрібно n≥30, coverage≥80%, ≥B`}
  </div>`;

  body.innerHTML=`
    <div style="margin-bottom:6px;font-size:10px;color:var(--dim)">Незалежний outcome target · A/B/C/D −3..+3 · preregistration locked</div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
      <div style="flex:1;height:5px;background:var(--border);border-radius:3px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${barCol};border-radius:3px"></div>
      </div>
      <span style="font-size:11px;font-weight:700;color:${barCol}">${nv}/30</span>
      <span style="font-size:14px;font-weight:900;color:${gradeCol}" title="Chrono Quality Score: Coverage + Lag + Variance + Bias">${grade}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:10px;margin-top:6px">
      <div><span style="color:var(--dim)">Покриття</span> <span style="color:${coverageCol};font-weight:700">${coverageStr}</span></div>
      <div><span style="color:var(--dim)">Медіан lag</span> <span style="color:${medLagCol};font-weight:700">${medLagStr}</span>${medLagWarn?`<span style="color:var(--bad)">${medLagWarn}</span>`:''}</div>
      <div><span style="color:var(--dim)">Варіативність</span> <span style="color:${varCol};font-weight:700">${varStr}</span>${varWarn?`<span style="color:var(--bad);font-size:9px">${varWarn}</span>`:''}</div>
      <div><span style="color:var(--dim)">Selection bias</span> <span style="color:${biasCol};font-weight:700">${biasStr}</span>${biasWarn?`<span style="color:var(--bad);font-size:9px">${biasWarn}</span>`:''}</div>
    </div>
    ${todayHtml}
    ${rMsg}
    ${phase2Html}`;
}/* NR_FN_END 075 */

/* NR_FN_BEGIN 079 */function renderHeroBulletin(){
  const elB = el('heroBulletin');
  if(!elB) return;
  const entry = getEngineScore(new Date(todayKyivStr()+'T12:00:00Z'));
  if(!entry){
    elB.textContent = '—';
    elB.title = 'Engine v18.5 bulletin score. Поточна дата поза validation window (2025-06-16 → 2026-12-31) або JSON не завантажився.';
    return;
  }
  const s = entry.eng;
  const color = s >= 2 ? 'var(--ok)' : s === 1 ? '#9cd49c' : s === 0 ? 'var(--muted)' : s === -1 ? 'var(--warn)' : s <= -2 ? 'var(--bad)' : 'var(--muted)';
  // v88.9.34-fp215 FIX-CRITICAL (аудит-раунд-5, Problem 4): статичний
  // data-label="Engine v18.5" (з HTML) залишався незмінним навіть коли `s` —
  // це PDF override, не розрахунок engine. Користувач читав "ENGINE V18.5: −3 ~★"
  // і думав, що engine порахував −3 із synthetic Kp — насправді −3 це ручний
  // вердикт з PDF, а ~ (synthetic Kp) стосується RAW engine snapshot ПІД override,
  // який до цього значення не має відношення. Тепер лейбл перемикається явно.
  elB.dataset.label = entry._expertOverride ? 'PDF override' : 'Engine v18.5';
  // v88.9.37-fp219 FIX-CRITICAL (аудит-раунд-6, Problem 1): ~ (synthetic Kp)
  // стосується RAW engine snapshot, а не PDF override — override узагалі не
  // рахується з якогось Kp, це ручний вердикт людини з тексту PDF. Але synMark
  // формувався БЕЗУМОВНО з entry.kp_synthetic, тому "PDF OVERRIDE: −3 ~★"
  // все одно приписував synthetic Kp значенню −3, яке від нього не залежить.
  // Тепер ~ (і ◌/✓, той самий клас маркерів) показуються ТІЛЬКИ коли число —
  // реальний розрахунок engine, не override.
  const _isPdfOverride = entry._expertOverride === true;
  // v87.90: synthetic marker у видимому тексті (не лише tooltip) — чесність для майбутніх дат
  const _synMark = _isPdfOverride ? '' : (entry.annual_fallback ? '<span style="color:#9bb1dc;margin-left:2px" title="Річний астрономічний каркас (Swiss Ephemeris) — попередній бал, очікує бюлетеня">◌</span>' : (entry.kp_synthetic ? '<span style="color:#fca474;margin-left:2px" title="Synthetic Kp=2.0 (NOAA 27DO недоступний — очікує бюлетеня або оновлення даних)">~</span>' : (entry.kp_real_from_future ? '<span style="color:#63be7b;margin-left:2px" title="Реальний Kp з NOAA 27-day-outlook (не synthetic)">✓</span>' : '')));
  // v88.7.15 Г: marker '★' коли застосовано expert override; '?' коли candidate є, але source не підтверджений.
  const _unv = entry._expertOverrideAvailable && entry._expertOverrideVerified === false && isFinite(entry._expertEngCandidate);
  const _ovMark = entry._expertOverride ? '<span style="color:#ffd166;margin-left:2px;font-size:9px" title="Expert override застосовано">★</span>' : (_unv ? '<span style="color: var(--warn);margin-left:2px;font-size:9px" title="PDF override candidate НЕ застосовано: source не підтверджений">?</span>' : '');
  // v88.8.18: marker 'ψ' (психо-trinity) коли v18.8 patches застосовано
  const _patchMark = (entry._v186Patches && entry._v186Patches.length > 0)
    ? `<span style="color:#7ec8ff;margin-left:2px;font-size:9px" title="v18.5 canonical (patches disabled in freeze) · v18.5 score ${entry._engV185Raw>=0?'+':''}${entry._engV185Raw}">ψ</span>`
    : '';
  elB.innerHTML = _unv
    ? `<span style="color:${color};font-weight:700">${s >= 0 ? '+' : ''}${s}</span><span style="color: var(--warn);font-size:10px;margin-left:4px">/ PDF ${entry._expertEngCandidate >= 0 ? '+' : ''}${entry._expertEngCandidate}?</span>${_synMark}${_ovMark}${_patchMark}`
    : `<span style="color:${color};font-weight:700">${s >= 0 ? '+' : ''}${s}${_synMark}${_ovMark}${_patchMark}</span>`;
  const synth = entry.kp_synthetic ? ' · ⚠ Kp synthetic (scenario, не forecast)' : '';
  const pdfStr = (entry.pdf !== null && entry.pdf !== undefined) ? ` · PDF ${entry.pdf >= 0 ? '+' : ''}${entry.pdf}` : '';
  // v88.7.15 Г: рядок про override у tooltip
  const _ovInfo = entry._expertOverride
    ? `
★ Expert override applied: raw engine v18.5 був ${entry._engRaw >= 0 ? '+' : ''}${entry._engRaw}, expert PDF (${entry._overrideAppliedIn || 'PDF #48'}) caliбрував до ${s >= 0 ? '+' : ''}${s}. Категорія: ${entry._overrideCategory || '—'}.`
    : (_unv ? `
? Expert override candidate NOT applied: raw engine=${s >= 0 ? '+' : ''}${s}, PDF candidate=${entry._expertEngCandidate >= 0 ? '+' : ''}${entry._expertEngCandidate}. Reason: ${entry._overrideSourceReason || 'source not verified'}` : '');
  // v88.8.18: v18.8 patches info
  const _patchInfo = (entry._v186Patches && entry._v186Patches.length > 0)
    ? `\nψ v18.5 canonical (patches disabled in freeze) (raw v18.5: ${entry._engV185Raw>=0?'+':''}${entry._engV185Raw})`
    : '';
  elB.title = _isPdfOverride
    ? `PDF override: ${s >= 0 ? '+' : ''}${s} (verified expert verdict, джерело: ${entry._overrideSourcePdf || entry._overrideAppliedIn || 'PDF'}).\nRaw Engine v18.5 (для порівняння): ${isFinite(entry._engRaw) ? (entry._engRaw >= 0 ? '+' : '') + entry._engRaw : 'недоступний'}.\nТег: ${entry.tag || '—'}\nDashboard G (continuous) ≠ PDF/Engine score (threshold) — різні моделі за дизайном.`
    : `Engine v18.5 canonical score: ${s >= 0 ? '+' : ''}${s} (V3 freeze active, patches disabled).\nТег: ${entry.tag || '—'}\nKp=${entry.kp}${synth}${pdfStr}${_ovInfo}${_patchInfo}\nDashboard G (continuous) ≠ Engine score (threshold) — різні моделі за дизайном.`;
}/* NR_FN_END 079 */

/* NR_FN_BEGIN 081 */function renderHeroAstroLayer(){
  const elA = el('heroAstroLayer');
  if(!elA) return;
  const entry = getEngineScore(new Date(todayKyivStr()+'T12:00:00Z'));
  if(!entry || entry.cal_tithi === undefined || entry.cal_tithi === null){
    elA.style.display = 'none';
    return;
  }
  // fp78 FIX: annual_2026_27.json (noon UTC, drikpanchang-verified) = canonical Panchanga display.
  // Unified with Panchanga panel. Previously used _liveCtx (current moment) which diverged from
  // panel when user viewed dashboard before tithi boundary (e.g. 09:00 UTC → Navami while panel=Dashami).
  // _liveCtx kept as fallback only when annual data absent.
  const _liveCtx = (typeof _lastPanchCtx !== 'undefined') ? _lastPanchCtx : null;
  const _YOGAS_FB = ['Vishkambha','Priti','Ayushman','Saubhagya','Shobhana','Atiganda','Sukarman',
    'Dhriti','Shula','Ganda','Vriddhi','Dhruva','Vyaghata','Harshana','Vajra',
    'Siddhi','Vyatipata','Variyan','Parigha','Shiva','Siddha','Sadhya','Shubha',
    'Shukla','Brahma','Indra','Vaidhriti'];
  let tName, nName, yName, tNumLive, nNumLive, yNumLive;
  if(entry.annual_tithi && entry.annual_nakshatra){
    // PRIMARY: noon UTC pre-computed (annual_2026_27.json, drikpanchang-verified)
    tName = entry.annual_tithi.replace(/\s*\([SK]\)\s*/,'');  // "Dashami (S)" → "Dashami"
    nName = entry.annual_nakshatra;
    yName = entry.annual_yoga ? (_YOGAS_FB[(entry.annual_yoga|0)-1] || ('Y'+entry.annual_yoga)) : '—';
    tNumLive = entry.cal_tithi;
    nNumLive = entry.cal_nakshatra;
    yNumLive = entry.annual_yoga;
  } else if(_liveCtx && _liveCtx.tithi && _liveCtx.nakshatra && _liveCtx.yoga){
    // FALLBACK: live current moment (when annual not enriched)
    tName = _liveCtx.tithi.name;
    nName = _liveCtx.nakshatra.name;
    yName = _liveCtx.yoga.name;
    tNumLive = _liveCtx.tithi.num;
    nNumLive = _liveCtx.nakshatra.idx;
    yNumLive = (_liveCtx.yoga.num !== undefined) ? _liveCtx.yoga.num : null;
  } else {
    // FALLBACK: engine_scores fields (early load before annual ready)
    const tIdx = Math.max(0, Math.min(29, (entry.cal_tithi|0) - 1));
    const nIdx = Math.max(0, Math.min(26, (entry.cal_nakshatra|0) - 1));
    const yIdx = Math.max(0, Math.min(26, (entry.cal_yoga|0) - 1));
    tName = (typeof TITHI_NAMES !== 'undefined') ? (TITHI_NAMES[tIdx] || ('T'+entry.cal_tithi)) : ('T'+entry.cal_tithi);
    nName = (typeof NAKSHATRA_NAMES !== 'undefined') ? (NAKSHATRA_NAMES[nIdx] || ('N'+entry.cal_nakshatra)) : ('N'+entry.cal_nakshatra);
    yName = _YOGAS_FB[yIdx] || ('Y'+entry.cal_yoga);
    tNumLive = entry.cal_tithi;
    nNumLive = entry.cal_nakshatra;
    yNumLive = entry.cal_yoga;
  }
  // Engine_scores values (для tooltip — показ розбіжностей)
  const _engT = entry.cal_tithi;
  const _engN = entry.cal_nakshatra;
  const _engY = entry.cal_yoga;
  // Detect divergence (live vs frozen engine) — корисно для аудиту
  const _divT = (tNumLive !== _engT);
  const _divN = (nNumLive !== _engN);
  const _divY = (yNumLive !== _engY);
  const _hasDiv = _divT || _divN || _divY;
  // YOGA names array для конвертації engine yoga number → name (для tooltip)
  const _YOGA_NAMES_FOR_TIP = ['Vishkambha','Priti','Ayushman','Saubhagya','Shobhana','Atiganda','Sukarman',
    'Dhriti','Shula','Ganda','Vriddhi','Dhruva','Vyaghata','Harshana','Vajra',
    'Siddhi','Vyatipata','Variyan','Parigha','Shiva','Siddha','Sadhya','Shubha',
    'Shukla','Brahma','Indra','Vaidhriti'];
  const _engTName = (typeof TITHI_NAMES !== 'undefined' && _engT) ? (TITHI_NAMES[Math.max(0, _engT-1)] || ('T'+_engT)) : ('T'+_engT);
  const _engNName = (typeof NAKSHATRA_NAMES !== 'undefined' && _engN) ? (NAKSHATRA_NAMES[Math.max(0, _engN-1)] || ('N'+_engN)) : ('N'+_engN);
  const _engYName = _engY ? (_YOGA_NAMES_FOR_TIP[Math.max(0, _engY-1)] || ('Y'+_engY)) : ('Y'+_engY);

  const cs = entry.cal_score;
  const csColor = (cs >= 2) ? 'var(--ok)' : (cs === 1) ? '#9cd49c' : (cs === 0) ? 'var(--muted)' : (cs === -1) ? 'var(--warn)' : (cs <= -2) ? 'var(--bad)' : 'var(--muted)';
  // v88.8.37-fp70-B: коли frozen cal_score розходиться зі знаком LIVE-панчанги
  // (boundary day, frozen nak ≠ live nak), голе число −2 поряд з live назвами
  // створює протиріччя з панчанга-текстом «фон підтримує». Тому при розбіжності
  // ховаємо число, лишаємо ⊙ маркер (деталі у tooltip). cal_score лишається frozen reference.
  const _liveTotal = (_liveCtx && _liveCtx.tithi && _liveCtx.nakshatra && _liveCtx.yoga)
    ? ((_liveCtx.tithi.score||0)+(_liveCtx.nakshatra.score||0)+(_liveCtx.yoga.score||0)) : null;
  const _csConflict = (_liveTotal !== null && cs !== undefined && cs !== null &&
                       Math.sign(cs) !== 0 && Math.sign(_liveTotal) !== 0 &&
                       Math.sign(cs) !== Math.sign(_liveTotal));
  const csStr = (cs !== undefined && cs !== null && !_csConflict) ? `<span style="color:${csColor};font-weight:700">${cs >= 0 ? '+' : ''}${cs}</span> · ` : '';
  // Compact label: cal_score · Tithi (live) · first 8 chars Nakshatra (live)
  // v88.7.12: маркер ⊙ якщо є розбіжність з engine — натяк, що варто глянути tooltip
  const _divMark = _hasDiv ? '<span style="color:var(--faint);font-size:9px;margin-left:2px" title="Розбіжність з engine_scores — деталі у tooltip">⊙</span>' : '';
  elA.innerHTML = `${csStr}🌙 ${tName} · ✨ ${nName.slice(0, 8)}${_divMark}`;
  // Rich tooltip with full astronomical context
  const symStr = formatCalSymbols(entry.cal_symbols);
  const artifactWarn = entry.excel_tag_artifact ? `\n⚠ Excel-tag artifact: ${entry.excel_tag_artifact_reason || ''}` : '';
  // v88.1: Yoga advisory (read-only, BPHS canonical penalty for negative yogas)
  const _ny = NEGATIVE_YOGAS_BPHS[entry.cal_yoga];
  const yogaAdvisory = _ny
    ? `\n⚪ BPHS yoga advisory: ${_ny.name} (canonical penalty ${_ny.pen}). Engine v18.5 не модифікує score (audit n=280 v5.1: rule REJECTED).`
    : '';
  // v88.7.12: показуємо Live + Engine якщо різні, інакше просто єдину пару
  const _tithiLine = _divT
    ? `Tithi: ${tNumLive} (${tName}) live · engine: ${_engT} (${_engTName})`
    : `Tithi: ${tNumLive} (${tName})`;
  const _nakLine = _divN
    ? `Nakshatra: ${nNumLive} (${nName}) live · engine: ${_engN} (${_engNName})`
    : `Nakshatra: ${nNumLive} (${nName})`;
  const _yogaLine = (_divY && yNumLive)
    ? `Yoga: ${yNumLive} (${yName}) live · engine: ${_engY} (${_engYName})`
    : `Yoga: ${yNumLive || _engY} (${yName})`;
  const _divNote = _hasDiv
    ? `\n\n⊙ Розбіжність pill ↔ engine: pill = noon UTC (annual_2026_27.json, drikpanchang-verified); engine_scores = 00:30 UTC Swiss Ephemeris. На boundary днях (~46%) tithi/nakshatra може зсунутись на 1. Bulletin score не залежить від цього.`
    : '';
  elA.title = `Astronomical layer (live names, frozen score)\ncal_score: ${cs >= 0 ? '+' : ''}${cs} (engine_scores.json, не PDF/engine)\n${_tithiLine}\n${_nakLine}\n${_yogaLine}\nSymbols: ${symStr}${artifactWarn}${yogaAdvisory}${_divNote}\n\nv88.7.12: tithi/nakshatra/yoga назви — live (узгоджено з Панчанга-карткою). cal_score/cal_symbols — frozen engine_scores. Engine pill (+3) — frozen v18.5 bulletin.`;
  elA.style.display = '';
}/* NR_FN_END 081 */

/* NR_FN_BEGIN 083 */function renderScenarioCard(){
  const elStrip = el('scenarioStrip');
  if(!elStrip) return;
  const today = new Date(todayKyivStr()+'T12:00:00Z');
  const days = [];
  for(let i=0; i<7; i++){
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() + i);
    const ds = fmtDate(d);
    // v88.8.1: getEngineScore() замість прямого _engineScores[ds] — застосовує expert overrides
    // (Г-патч v88.7.15) до 7-денного scenario strip. Раніше: прямий доступ → на 7 днях
    // 12.05–24.05 strip показував raw engine v18.5, не expert PDF #48 calibrated.
    const entry = (typeof getEngineScore === 'function') ? getEngineScore(d) : (_engineScores ? _engineScores[ds] : null);
    days.push({ date: d, ds, entry });
  }
  // Якщо engine_scores ще не готовий або порожній — показуємо placeholder
  const haveData = days.some(x => x.entry);
  if(!haveData){
    elStrip.innerHTML = '<div style="font-size:11px;color:var(--dim);padding:6px">engine_scores.json не завантажено — оновіть сторінку</div>';
    return;
  }
  const dowUA = ['Нд','Пн','Вт','Ср','Чт','Пт','Сб'];
  function colorForScore(s){
    if(s === null || s === undefined) return 'var(--muted)';
    if(s >= 2) return 'var(--ok)';
    if(s === 1) return '#9cd49c';
    if(s === 0) return 'var(--muted)';
    if(s === -1) return 'var(--warn)';
    return 'var(--bad)';
  }
  function bgForScore(s){
    if(s === null || s === undefined) return 'rgba(155,177,220,.08)';
    if(s >= 2) return 'rgba(43,212,125,.18)';
    if(s === 1) return 'rgba(43,212,125,.10)';
    if(s === 0) return 'rgba(155,177,220,.10)';
    if(s === -1) return 'rgba(255,170,51,.15)';
    return 'rgba(232,80,91,.18)';
  }
  let html = '';
  let critCount = 0; // v88.7.13 B: кiлькiсть РЕАЛЬНО критичних днів (eng<=-2) у наступнi 7. Раніше |eng|>=2 — на CSV n=294 давало 58.8% днів і 7/7 на зеленому тижні (слово втрачало семантику небезпеки). Тепер узгоджено з Excel ТИЖНЕВИЙ_ПРОГНОЗ "🔴 КРИТИЧНО" = реальна загроза.
  for(const d of days){
    const e = d.entry;
    const eng = e ? e.eng : null;
    const cal = e ? e.cal_score : null;
    const tag = e ? (e.tag || '') : '';
    const synth = e && e.kp_synthetic;
    const artifact = e && e.excel_tag_artifact;
    const dow = dowUA[d.date.getDay()];
    const dom = d.date.getDate();
    const isToday = (d.ds === fmtDate(today));
    if(eng !== null && eng !== undefined && eng <= -2) critCount++;
    const engStr = (eng !== null && eng !== undefined) ? `${eng >= 0 ? '+' : ''}${eng}` : '—';
    const calStr = (cal !== null && cal !== undefined) ? `${cal >= 0 ? '+' : ''}${cal}` : '';
    const calDot = (cal !== null && cal !== undefined)
      ? `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${colorForScore(cal)};margin-right:3px;vertical-align:middle" title="cal_score ${calStr}"></span>`
      : '';
    const flags = (synth ? '~' : '') + (artifact ? '⚠' : '');
    const tt = e
      ? `${d.ds} (${dow})\nPDF/Engine Day_score: ${engStr}${synth ? ' (Kp synthetic)' : ''}\ncal_score: ${calStr || '—'}\nТег: ${tag || '—'}` + (artifact ? `\n⚠ ${e.excel_tag_artifact_reason || 'Excel-tag artifact'}` : '') + ((function(){
          const _ny2 = (typeof NEGATIVE_YOGAS_BPHS !== 'undefined' && e.cal_yoga) ? NEGATIVE_YOGAS_BPHS[e.cal_yoga] : null;
          return _ny2 ? `\n⚪ BPHS: ${_ny2.name} (${_ny2.pen}, advisory only)` : '';
        })()) + ((function(){
          // v88.8.38: forecast_confidence note (read-only, freeze-safe)
          const _fc = (typeof forecastConfidence === 'function') ? forecastConfidence(e) : null;
          // v88.8.39: cal/eng sign diagnostic (AUDIT-ONLY; partly construction-dependent — eng derives from cal, NOT an independent reliability metric). Tooltip only, does not drive badge.
          const _sg = x => x>0?1:(x<0?-1:0);
          const _cs = _sg(e.cal_score), _es = _sg(e.eng);
          const _cons = (_cs!==0 && _es!==0)
            ? (_cs===_es ? '\nAudit: cal↔engine напрям збігається (внутрішня узгодженість, не незалежний показник)'
                         : '\nAudit: cal↔engine розходяться — можливий editorial overlay')
            : '';
          return (_fc && _fc.note) ? `\n\n🎯 Довіра: ${_fc.level} — ${_fc.note}${_cons}` : '';
        })()) + `\n\nКлік → деталі у таблиці 27 днів. Це PDF/Engine Day_score, не G_now і не G_day raw`
      : `${d.ds} (${dow}) — поза validation window`;
    const borderToday = isToday ? '2px solid var(--ok)' : '1px solid var(--border2)';
    const clickAttr = e ? ` onclick="scrollAndHighlight27d('${d.ds}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();scrollAndHighlight27d('${d.ds}')}"` : '';
    const cursorStyle = e ? 'pointer' : 'help';
    // v88.8.39-fp76: confidence badge — canonical guardrails only (HIGH=●, WEAK=!, LOW=○)
    const _fc = (e && typeof forecastConfidence === 'function') ? forecastConfidence(e) : null;
    const confBadge = (_fc && _fc.level === 'HIGH')
      ? `<span style="position:absolute;top:2px;right:3px;font-size:8px;color:var(--ok)" title="HIGH: ±3 ~92-93% strict">●</span>`
      : (_fc && _fc.level === 'WEAK')
      ? `<span style="position:absolute;top:2px;right:3px;font-size:9px;color:var(--warn);font-weight:800" title="WEAK: ±2 miscalibrated (PPV ~3%, GT≈neutral)">!</span>`
      : (_fc && _fc.level === 'LOW')
      ? `<span style="position:absolute;top:2px;right:3px;font-size:8px;color:var(--dim)" title="LOW: engine failure / ignore">○</span>`
      : '';
    html += `<div${clickAttr} style="position:relative;flex:1 0 64px;min-width:64px;padding:6px 4px;border-radius:8px;border:${borderToday};background:${bgForScore(eng)};text-align:center;cursor:${cursorStyle};transition:transform .12s,box-shadow .12s" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 2px 8px rgba(0,0,0,.3)'" onmouseout="this.style.transform='';this.style.boxShadow=''" title="${escapeHtml(tt)}">`
      + confBadge
      + `<div style="font-size:9px;color:var(--dim);font-weight:700">${dow}</div>`
      + `<div style="font-size:11px;color:var(--text2);font-weight:600">${dom}</div>`
      + `<div style="margin-top:2px">${calDot}<span style="font-size:13px;font-weight:800;color:${colorForScore(eng)}">${engStr}</span></div>`
      + (flags ? `<div style="font-size:9px;color:var(--warn);margin-top:1px;line-height:1">${flags}</div>` : '<div style="height:11px"></div>')
      + `</div>`;
  }
  elStrip.innerHTML = html;
  // Update summary sub-label (з i18n)
  const subEl = el('scenarioSummarySub');
  if(subEl){
    const _t88 = (typeof I18N !== 'undefined' && typeof _currentLang !== 'undefined' && I18N[_currentLang]) ? I18N[_currentLang] : null;
    const critWord = (_t88 && _t88.scenarioCritical) ? _t88.scenarioCritical : ((_currentLang === 'EN') ? 'critical' : (critCount===1?'критичний':'критичних'));
    const stableWord = (_t88 && _t88.scenarioStable) ? _t88.scenarioStable : 'стабільний';
    const critTxt = critCount > 0 ? `<span style="color:var(--warn);font-weight:700">⚡ ${critCount} ${critWord} з ${days.length}</span>` : `${stableWord} тиждень`;
    // v88.7.14 E1: прибрано дубль "7 днів" — заголовок details уже містить "Сценарій на 7 днів".
    // Раніше: "Сценарій на 7 днів — 7 днів · 4 критичних". Тепер: "Сценарій на 7 днів — 4 критичних з 7".
    subEl.innerHTML = ' — ' + critTxt;
  }
  // v88.2: auto-expand scenarioCard коли crit≥3 з 7 — щоб користувач побачив warning.
  // Trigger тільки один раз на сесію (per browser session) — не override user manual close.
  try {
    const card = document.getElementById('scenarioCard');
    if(card && critCount >= 3 && !card.open && !sessionStorage.getItem('gix_scenario_auto_expanded')){
      card.open = true;
      sessionStorage.setItem('gix_scenario_auto_expanded', '1');
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.71','recoverable'); }
}/* NR_FN_END 083 */

/* NR_FN_BEGIN 108 */function renderAstronomyEvents(dateUTC){
  const eclipseMain = el('eclipseEventMain');
  const eclipseSub = el('eclipseEventSub');
  const paradeMain = el('planetParadeMain');
  const paradeSub = el('planetParadeSub');
  const pairMain = el('planetPairMain');
  const pairSub = el('planetPairSub');
  if(!eclipseMain || !eclipseSub || !paradeMain || !paradeSub || !pairMain || !pairSub) return;
  const when = (dateUTC && isFinite(dateUTC.getTime())) ? dateUTC : new Date();
  const stamp = el('astroEventsStamp');
  if(stamp) stamp.textContent = when.toLocaleString('uk-UA',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});

  const eclipse = nearestCatalogEclipse(when);
  const mi = computeMiFromEclipses(when);
  if(eclipse){
    const today0 = Date.UTC(when.getUTCFullYear(),when.getUTCMonth(),when.getUTCDate());
    const days = Math.round((eclipse.date.getTime()-today0)/86400000);
    const countdown = days===0 ? 'сьогодні' : days===1 ? 'завтра' : `через ${days} дн.`;
    const dateLabel = eclipse.date.toLocaleDateString('uk-UA',{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'});
    eclipseMain.innerHTML = `🌘 ${ECLIPSE_TYPE_UA[eclipse.type]||'затемнення'} · ${dateLabel} · ${countdown}`;
    eclipseSub.innerHTML = `<strong style="color:${mi.Mi<0?'#ff9f9f':'var(--muted)'}">Сьогодні Mᵢ = ${mi.Mi}</strong> — ${mi.Mi<0?'вже враховано у ΣAᵢ та G':'сьогодні не впливає на G'}. Тип і дата — глобальна подія. Цей модуль не розраховує локальну видимість і не стверджує, що затемнення видно з Києва. <a href="https://science.nasa.gov/eclipses/future-eclipses/" target="_blank" rel="noopener" style="color:#8fc8ff">NASA ↗</a>`;
  }else{
    eclipseMain.textContent = 'Немає підтвердженої події в локальному каталозі';
    eclipseSub.textContent = 'Mᵢ не змінюється. Каталог не підміняється припущенням.';
  }

  try{
    const parade = nextMorningPlanetParade(when);
    if(parade){
      const count = parade.above.length;
      const dateLabel = parade.observeAt.toLocaleDateString('uk-UA',{day:'2-digit',month:'long'});
      const timeLabel = parade.observeAt.toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'});
      const sunriseLabel = parade.sunrise.toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'});
      const total = parade.positions.length;
      const paradeState = parade.event
        ? `${parade.event.bodies.length}-планетний парад · локально ${count}/${total} над горизонтом`
        : count>=4 ? `${count} планет над горизонтом · без каталожної події` : 'локальний парад не підтверджено';
      paradeMain.textContent = `🪐 ${paradeState} · ${dateLabel} о ${timeLabel}`;
      const list = parade.positions.sort((a,b)=>a.az-b.az).map(p=>{
        const altLabel = Math.abs(p.alt)<5 ? p.alt.toFixed(1) : p.alt.toFixed(0);
        return `${p.ua} ${altLabel}°${p.alt<=0?' (за горизонтом)':''}${p.optics?' 🔭':''}`;
      }).join(' · ');
      const peak = parade.event ? ` Пік події: ${new Date(parade.event.peak+'T00:00:00Z').toLocaleDateString('uk-UA',{day:'2-digit',month:'long',timeZone:'UTC'})}.` : '';
      paradeSub.innerHTML = `${list||'Немає валідних позицій'}. Розрахунок для координат дашборду за 1 год до сходу Сонця (${sunriseLabel}); 🔭 — потрібна оптика.${peak} «Парад» — популярна назва одночасної видимості, <strong>score_effect=0</strong>.`;
    }else{
      paradeMain.textContent = 'Локальна геометрія параду ще завантажується';
      paradeSub.textContent = 'Склад не вгадується: потрібні Astronomy Engine, координати та час сходу Сонця.';
    }

    const pair = nearestPhysicalPlanetPair(when);
    if(pair){
      const level = pair.angle<=1 ? 'тісне зближення' : pair.angle<=5 ? 'помітне зближення' : 'найменша відстань серед 7 планет';
      pairMain.textContent = `${pair.a.ua} — ${pair.b.ua}: ${pair.angle.toFixed(1)}° · ${level}`;
      pairSub.innerHTML = `Геоцентричний кут на небі; ${pair.motion}. <strong>Інформаційно, score_effect=0</strong>. Це не Hora і не автоматичний прогноз подій. Джерело розрахунку: Astronomy Engine.`;
      _astroEventsRetryCount = 0;
    }else{
      pairMain.textContent = 'Астрономічний модуль ще завантажується';
      pairSub.textContent = 'Кут не вигадується: буде показаний лише після готовності Astronomy Engine.';
      if(_astroEventsRetryCount<5){ _astroEventsRetryCount++; setTimeout(()=>renderAstronomyEvents(new Date()),1500); }
    }
  }catch(e){ globalThis.NRDiagnostics?.record('catch.83','recoverable');
    pairMain.textContent = 'Кутова пара тимчасово недоступна';
    pairSub.textContent = 'Помилка астрономічного модуля; score_effect=0. Інші показники не підміняють цей факт.';
  }

  const horaEl = el('horaPairDisclosure');
  if(horaEl){
    try{
      const seq = calcHoraSequence(when,new Date(when.getTime()+3*3600000),2);
      horaEl.innerHTML = seq.length>1
        ? `Традиційний Hora‑перехід: <strong>${seq[0].planet} → ${seq[1].planet}</strong> о ${seq[0].endLocal}. Це часовий символічний цикл, <strong>не фізичне зближення планет</strong>.`
        : 'Традиційний Hora‑перехід: дані тимчасово недоступні.';
    }catch(_e){ globalThis.NRDiagnostics?.record('catch.84','recoverable');  horaEl.textContent='Традиційний Hora‑перехід: дані тимчасово недоступні.'; }
  }
}/* NR_FN_END 108 */

/* NR_FN_BEGIN 112 */function renderDayTheme(){
  const card = document.getElementById('dayThemeCard');
  if(!card) return;
  const today = todayKyivStr();
  const eng = (typeof getEngineScore==='function') ? getEngineScore(today) : null;
  if(!eng || !isFinite(eng.eng)){ card.style.display='none'; return; }
  const score = Math.max(-3, Math.min(3, Math.round(eng.eng)));
  const tag = eng.tag || '';
  const kp = (typeof lastWWV!=='undefined' && lastWWV && isFinite(lastWWV.kNow)) ? lastWWV.kNow : 2;
  const TONES = {
    // v88.8.37-fp70: Тема дня = ІНТЕРПРЕТАЦІЯ (Co-Star pattern), НЕ повтор Hero-статусу.
    // Hero каже ЩО (сприятливий/несприятливий), Тема каже ЯК САМЕ використати.
    '3':  ['Просувай і запускай.',         'Сьогодні добре відкривати нові ініціативи, укладати домовленості та просувати ключові проєкти.'],
    '2':  ['Планування і просування.',     'Добрий момент для підготовки, зустрічей і завершення відкладених справ.'],
    '1':  ['Рутина і стабільність.',       'Тримай звичний ритм. Спокійна продуктивність без ризиків.'],
    '0':  ['Стандартний темп.',            'Без різких кроків у будь-який бік. Ідеально для аналізу і підготовки.'],
    '-1': ['Завершуй, не починай.',        'Закривай відкриті справи. Нові ініціативи краще відкласти до кращого фону.'],
    '-2': ['Мінімізуй навантаження.',      'Відкладай важливі рішення. Зосередься на обов\'язковому мінімумі.'],
    '-3': ['Стоп-день.',                   'Уникай нових дій і ключових кроків. Відпочинок і очікування — правильна стратегія.'],
  };
  const [tone, action] = TONES[String(score)] || TONES['0'];
  const TAG_THEMES = {'✈':'переміщення і логістики','⊕':'лікування і відновлення','💊':'лікування і відновлення','📚':'навчання і розвитку','❤':'стосунків і комунікацій','⚡':'уважності (підвищений ризик)','✂':'завершення і відсікання зайвого'};
  const TOKEN_THEMES = {
    plane:'переміщення і логістики', plus:'лікування і відновлення', med:'лікування і відновлення',
    study:'навчання і розвитку', heart:'стосунків і комунікацій', bolt:'уважності (підвищений ризик)',
    scissors:'завершення і відсікання зайвого'
  };
  let themes = Object.entries(TAG_THEMES).filter(([s])=>tag.includes(s)).map(([,p])=>p);
  if(window.EngineTagParser && window._engineTagAliasSpec){
    const _tokens = window.EngineTagParser.parseTagTokens(tag, window._engineTagAliasSpec);
    themes = [...new Set(_tokens.map(token => TOKEN_THEMES[token]).filter(Boolean))];
  }
  const themeStr = themes.length ? `Підходить для ${themes.slice(0,2).join(' і ')}.` : '';
  const kpNote = kp>=5?'⚠ Геомагнітна буря — тримайся планів.':kp>=3?'Геомагнітний фон помірний.':'';
  const borderCol = score>=2?'rgba(43,212,125,.3)':score>=1?'rgba(43,212,125,.18)':score===0?'var(--border)':score>=-1?'rgba(255,170,51,.25)':'rgba(255,107,107,.3)';
  const labelCol = score>=1?'#63be7b':score===0?'#9bb1dc':'#ffd2a0';
  card.style.display='block'; card.style.borderColor=borderCol;
  card.innerHTML=`<div style="font-size:9px;font-weight:800;letter-spacing:.1em;color:var(--faint);text-transform:uppercase;margin-bottom:6px">Тема дня</div><div style="font-size:15px;font-weight:700;color:${labelCol};line-height:1.3;margin-bottom:4px">${tone}</div><div style="font-size:13px;color:var(--text2);line-height:1.5">${action}${themeStr?' '+themeStr:''}${kpNote?' '+kpNote:''}</div>`;
}/* NR_FN_END 112 */

/* NR_FN_BEGIN 114 */function renderWeekSummary(){
  const bar = document.getElementById('weekSummaryBar');
  if(!bar) return;
  const today = new Date(todayKyivStr()+'T12:00:00Z');
  const days = [];
  for(let i=0;i<7;i++){
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate()+i);
    const ds = fmtDate(d);
    const e = (typeof getEngineScore==='function') ? getEngineScore(ds) : null;
    const kpDynamic = getDynamicKpForDate_v889125(d);
    const aiDynamic = computeAi(sunriseUTC(d), isFinite(kpDynamic) ? kpDynamic : null);
    const rawDynamic = isFinite(kpDynamic) ? kpDayTerm(kpDynamic) + aiDynamic.Ai : NaN;
    const sig = resolveDaySignal_v88825(d, rawDynamic, kpDynamic, {isToday:i===0, horizon:'week'});
    const reference = sig && isFinite(sig.dayScore) ? Math.max(-3,Math.min(3,Math.round(sig.dayScore))) : null;
    const operational = sig && isFinite(sig.decisionScore) ? Math.max(-3,Math.min(3,Math.round(sig.decisionScore))) : null;
    const dowShort = ['НД','ПН','ВТ','СР','ЧТ','ПТ','СБ'][d.getDay()];
    const dateNum = d.getUTCDate();
    const mon = d.getUTCMonth()+1;
    const sourceBase = e && e._expertOverride ? 'PDF' : (e ? 'Engine' : '—');
    const guards = [sig?.guard, sig?.dynamicGuard].filter(x=>x && x!=='none');
    // This block is explicitly a G_raw forecast summary. Never substitute
    // today's operational/PDF decision for the raw series.
    const displayScore = isFinite(rawDynamic) ? Number(rawDynamic) : null;
    days.push({ds, operational, displayScore, reference, source:sourceBase, guards, dow:dowShort, dateNum, mon, isToday:i===0, kpDynamic, rawDynamic});
  }

  const col = s => s===null?'var(--faint)':s>=2?'#63be7b':s>=0.5?'#9cd49c':s>-0.5?'#9bb1dc':s>-2?'#ffd2a0':'#ff6b6b';
  const green = days.filter(d=>d.displayScore!==null&&d.displayScore>=2).length;
  const greenL = days.filter(d=>d.displayScore!==null&&d.displayScore>=0.5&&d.displayScore<2).length;
  const red = days.filter(d=>d.displayScore!==null&&d.displayScore<=-2).length;
  const redL = days.filter(d=>d.displayScore!==null&&d.displayScore>-2&&d.displayScore<=-0.5).length;
  const neutral = days.filter(d=>d.displayScore!==null&&d.displayScore>-0.5&&d.displayScore<0.5).length;

  // Знаходимо кластери для наративу
  const fmt = d => `${d.dateNum}.${d.mon}`;
  const bestDays = days.filter(d=>d.displayScore!==null&&d.displayScore>=2);
  const stopDays = days.filter(d=>d.displayScore!==null&&d.displayScore<=-2);
  const mildCautionDays = days.filter(d=>d.displayScore!==null&&d.displayScore>-2&&d.displayScore<=-0.5);
  const bestStr = bestDays.length ? bestDays.map(d=>`${d.dow} ${fmt(d)}`).join(', ') : null;
  const stopStr = stopDays.length ? stopDays.map(d=>`${d.dow} ${fmt(d)}`).join(', ') : null;
  const mildCautStr = mildCautionDays.length ? mildCautionDays.map(d=>`${d.dow} ${fmt(d)}`).join(', ') : null;

  // fp309: тижневий тон рахується з УСІХ денних класів.
  // Раніше green порівнювався лише з hard-red, а -1 ігнорувався у балансі:
  // 3 сприятливі, 2 hard-red, 1 mild-red помилково ставали "сприятливим тижнем".
  const favorable = green + greenL;
  const cautious = red + redL;
  const weekTone = red>=3?['🔴','Складний прогнозний фон',`${red} дні з G_raw≤−2 · прогноз, не команда`]:
                   red>=2&&cautious>favorable?['🟡','Обережний прогнозний фон',`${red} дні з G_raw≤−2 · більше перевірок`]:
                   favorable>=4&&red===0&&cautious<=1?['🟢','Переважно вищий raw-контекст','Прогнозний фон, не дозвіл на дію']:
                   favorable>cautious&&red<=1?['🟢','Більше високих raw-значень','Прогнозний фон, не дозвіл на дію']:
                   cautious>favorable?['🟡','Переважно нижчий raw-контекст','Прогнозний фон, не оперативна команда']:
                   (favorable===0&&cautious===0)?['⚪','Нейтральний raw-контекст','Прогнозний фон без готового рішення']:
                   ['⚪','Змішаний тиждень',`${red} низький raw · ${redL} помірно низький raw`];

  // Рядок цифр (компактний, знизу)
  const rowHtml = days.map(d=>{
    const s = d.displayScore; const sStr = s===null?'—':(s>=0?'+':'')+(d.isToday?s.toFixed(0):s.toFixed(1));
    const refStr = d.reference===null?'—':(d.reference>=0?'+':'')+d.reference;
    const bold = d.isToday?'font-weight:800;text-decoration:underline':'';
    const opTitle = d.isToday && d.operational!==null ? ` Operational ${d.operational>=0?'+':''}${d.operational}.` : '';
    const sourceTitle = `Forecast G_raw ${sStr}.${opTitle} PDF/Engine reference ${refStr} (${d.source}).${d.guards.length?' Safety: '+d.guards.join('+')+'.':''}`;
    return `<span title="${sourceTitle}" style="display:inline-flex;flex-direction:column;align-items:center;min-width:38px;${bold}">
      <span style="font-size:8px;color:var(--dim)">${d.dow}</span>
      <span style="font-size:11px;font-weight:700;color:${col(s)}">${sStr}</span>
      <span style="font-size:7px;color:var(--faint)">G_raw forecast${d.guards.length?' ⚠':''}</span>
      ${d.isToday&&d.operational!==null?`<span style="font-size:7px;color:#d6b55c">OP ${d.operational>=0?'+':''}${d.operational}</span>`:''}
      <span style="font-size:7px;color:${d.source==='PDF'?'#d6b55c':'var(--faint)'}">ref ${refStr} ${d.source}</span>
    </span>`;
  }).join('');

  bar.style.display = 'block';
  bar.innerHTML = `
    <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:5px">
      <span style="font-size:9px;font-weight:800;letter-spacing:.08em;color:var(--faint);text-transform:uppercase">Тиждень</span>
      <span style="font-size:13px;font-weight:700;color:${weekTone[0]==='🔴'?'#ff6b6b':weekTone[0]==='🟢'?'#63be7b':'#9bb1dc'}">${weekTone[1]}</span>
      <span style="font-size:11px;color:var(--text2)">${weekTone[2]}</span>
    </div>
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px;color:var(--text2);margin-bottom:6px">
      ${favorable>0?`<span>🟢 ${favorable} високий raw</span>`:''}
      ${neutral>0?`<span>⚪ ${neutral} нейтральний raw</span>`:''}
      ${cautious>0?`<span>🔴 ${cautious} низький raw</span>`:''}
      ${bestStr?`<span style="color:var(--faint)">·</span><span style="color:#9cd49c">Вищий raw: ${bestStr}</span>`:''}
      ${stopStr?`<span style="color:var(--faint)">·</span><span style="color:#ff6b6b">Низький raw: ${stopStr}</span>`:''}
      ${mildCautStr?`<span style="color:var(--faint)">·</span><span style="color:#ffa64d">Помірно низький raw: ${mildCautStr}</span>`:''}
    </div>
    <div style="display:flex;gap:1px">${rowHtml}</div>`;
}/* NR_FN_END 114 */

/* NR_FN_BEGIN 115 */function renderAuditCard(opts){
  const silent = !opts || opts.silent !== false; // default silent=true
  const card = document.getElementById('auditCard');
  if(!card) return;

  const ui   = window.__uiState || {};
  const ai   = ui.ai || {};
  const kp   = isFinite(ui.kpNow) ? +ui.kpNow : 2;
  const gNow = isFinite(ui.gNow)  ? +ui.gNow  : NaN;
  const kpMod = +kpDayTerm(kp).toFixed(2);

  // Engine day score
  let dayScore = null, hasPdf = false, pdfSrc = '—';
  try {
    const _e = (typeof getEngineScore === 'function') ? getEngineScore(new Date(todayKyivStr()+'T12:00:00Z')) : null;
    if(_e && isFinite(_e.eng)){
      dayScore = +_e.eng;
      hasPdf   = true;
      pdfSrc   = (_e.src === 'override' || _e._expertOverrideVerified) ? 'PDF/Engine (override)' : 'PDF/Engine';
    }
  } catch(_){ window.NRDiagnostics?.record('legacy.catch.74','recoverable'); }

  // Ai components
  const Li = isFinite(ai.Li) ? +ai.Li : '?';
  const Mi = isFinite(ai.Mi) ? +ai.Mi : '?';
  const ei = isFinite(ai.ei) ? +ai.ei : '?';
  const Pi = isFinite(ai.Pi) ? +ai.Pi : '?';
  const Di = isFinite(ai.Di) ? +ai.Di : 0;
  const Ai = isFinite(ai.Ai) ? +ai.Ai.toFixed(2) : '?';

  // Rahu — fallback chain: _lastPanchCtx → __p3RahuCache → computePanchanga
  let rahuStr = '—';
  try {
    let _R = null;
    if(typeof _lastPanchCtx !== 'undefined' && _lastPanchCtx && _lastPanchCtx._kyivDateKey===todayKyivStr() && _lastPanchCtx._geoKey===String(_userLat)+','+String(_userLon) && _lastPanchCtx.rahu && _lastPanchCtx.rahu.start)
      _R = _lastPanchCtx.rahu;
    if(!_R && window.__p3RahuCache && window.__p3RahuCache.dk===todayKyivStr() && window.__p3RahuCache.geoKey===String(_userLat)+','+String(_userLon) && window.__p3RahuCache.rahu && window.__p3RahuCache.rahu.start)
      _R = window.__p3RahuCache.rahu;
    if(!_R && typeof computePanchanga === 'function'){
      const _pc = computePanchanga(sunriseUTC(new Date(todayKyivStr()+'T12:00:00Z')));
      if(_pc && _pc.rahu && _pc.rahu.start) _R = _pc.rahu;
    }
    if(_R && _R.start && _R.end) rahuStr = `${_R.start}–${_R.end}`;
  } catch(_){ window.NRDiagnostics?.record('legacy.catch.75','recoverable'); }

  // Confidence + data-mode
  const confPct   = isFinite(ui.confPct) ? Math.round(ui.confPct) : '?';
  const confGrade = ui.confGrade || '—';
  let dmLabel = '';
  try {
    const _dm = (typeof resolveDataModeExtended === 'function') ? resolveDataModeExtended() : 'live';
    const _dmMap = { live:'LIVE', estimated:'ESTIMATED', partial:'DELAYED', scenario:'SCENARIO', offline:'OFFLINE' };
    if(_dm && _dm !== 'live') dmLabel = ', ' + (_dmMap[_dm] || _dm.toUpperCase());
  } catch(_){ window.NRDiagnostics?.record('legacy.catch.76','recoverable'); }

  const _fmt = v => (typeof v === 'number') ? (v >= 0 ? '+'+v.toFixed(2) : v.toFixed(2)) : String(v);

  const html = `<div style="padding:10px 14px;border-radius:12px;border:1px solid rgba(100,150,255,.25);background:rgba(10,18,35,.55);font-size:12px;color:var(--dim)">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span style="font-size:13px;font-weight:600;color:var(--text)">Чому такий висновок?</span>
    <button id="auditCardClose" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;line-height:1;padding:0 2px" aria-label="Закрити">✕</button>
  </div>
  <pre style="margin:0;font-family:ui-monospace,monospace;font-size:11px;line-height:1.7;white-space:pre-wrap;color:var(--dim)">──────────────────────────────────────
${hasPdf ? `G_day  ${dayScore >= 0 ? '+' : ''}${dayScore}  (${pdfSrc})` : 'G_day  ?  (PDF не завантажено)'}
ΣAᵢ    ${_fmt(Ai)} = Lᵢ${_fmt(Li)} + Mᵢ${_fmt(Mi)} + eᵢ${_fmt(ei)} + Pᵢ${_fmt(Pi)} + Dᵢ${_fmt(Di)}
Kp     ${_fmt(kpMod)} (Kp=${kp.toFixed(1)}, modifier=2−Kp)
Rahu   ${rahuStr}
Conf   ${confGrade} (${confPct}%${dmLabel})
─────────────────────────────
G_now  ${isFinite(gNow) ? (gNow >= 0 ? '+' : '') + gNow.toFixed(2) : '?'} = (2−Kp) + ΣAᵢ = ${_fmt(kpMod)} + ${_fmt(Ai)}
──────────────────────────────────────</pre>
</div>`;

  card.innerHTML = html;
  // fp72a/fp73/fp74/fp75: silent=true → не змінюємо display (користувач керує через toggle)
  if(!silent) card.style.display = '';

  // Close button handler
  const _cl = document.getElementById('auditCardClose');
  if(_cl) _cl.onclick = function(){
    card.style.display = 'none';
    const _btn = document.getElementById('auditToggleBtn');
    if(_btn){
      _btn.textContent = 'Аудит ▸';
      _btn.setAttribute('aria-label','Аудит: показати розкладку висновку');
    }
  };
}/* NR_FN_END 115 */

/* NR_FN_BEGIN 116 */function renderGnssRisk(){
  const card = document.getElementById('gnssCard');
  if(!card) return;

  // === Вхідні дані (вже є в дашборді) ===
  const kp = (typeof lastWWV !== 'undefined' && lastWWV && isFinite(lastWWV.kNow))
    ? lastWWV.kNow : (window.__lastKp || 2);
  const dst = (typeof _lastDst !== 'undefined' && isFinite(_lastDst)) ? _lastDst : 0;
  const lat = (typeof _userLat !== 'undefined') ? _userLat : 50.45; // default Kyiv
  const nowUTC = new Date();
  // v88.9.6x-fp249 (аудит: hardcoded UTC+3 зсунеться на годину після переходу
  // Києва на зимовий час) — той самий канонічний офсет, що вже в fp245.
  const localHour = ((nowUTC.getUTCHours() + kyivOffsetHoursIntAt(nowUTC)) % 24 + 24) % 24;

  // === GNSS Risk v1 — NOAA G-Scale ===
  let base = 0;
  if(kp >= 7) base = 4;
  else if(kp >= 6) base = 3;
  else if(kp >= 5) base = 2;
  else if(kp >= 3) base = 1;
  // else base = 0

  let mods = 0;
  const modReasons = [];
  // Нічний модифікатор (ефект сильніший 20:00–02:00 local)
  if(localHour >= 20 || localHour <= 2){
    mods++; modReasons.push('ніч +1');
  }
  // Широтний: екватор (<25°) та приполярна зона (>65°) — критичніші
  if(lat < 25 || lat > 65){
    mods++; modReasons.push('широта +1');
  }
  // Dst буря
  if(isFinite(dst) && dst < -50){
    mods++; modReasons.push(`Dst ${dst}нТл +1`);
  }
  const score = Math.min(4, base + mods);

  // v88.8.37-fp70: GNSS card — прихований при score 0-1 (не впливає на рішення),
  // компактний при score 2, повний при score 3+.
  if(score <= 1){
    card.style.display = 'none';
    return;
  }

  const LEVELS = [
    {label:'🟢 НИЗЬКИЙ',     col:'#2bd47d', bg:'rgba(43,212,125,.08)', border:'rgba(43,212,125,.3)'},
    {label:'🟡 ПОМІРНИЙ',    col:'#f0c040', bg:'rgba(240,192,64,.08)',  border:'rgba(240,192,64,.3)'},
    {label:'🟠 ПІДВИЩЕНИЙ',  col:'#ff8c42', bg:'rgba(255,140,66,.08)',  border:'rgba(255,140,66,.3)'},
    {label:'🔴 ВИСОКИЙ',     col:'#ff5555', bg:'rgba(255,85,85,.08)',   border:'rgba(255,85,85,.3)'},
    {label:'🔴 КРИТИЧНИЙ',   col:'#ff2222', bg:'rgba(255,34,34,.10)',   border:'rgba(255,34,34,.4)'},
  ];
  const VERDICTS = [
    'GPS стабільний. Дрон: дозволено.',
    'GPS стабільний для більшості. Дрон: дозволено з контролем.',
    'Можлива деградація GPS. Дрон: перевір точність перед зльотом.',
    'Підвищена похибка, loss-of-lock можливий. Дрон: тільки LoS з резервом.',
    'GPS деградований. Дрон: не рекомендовано без резервної навігації.',
  ];

  const lv = LEVELS[score];
  const verdict = VERDICTS[score];
  const kpStr = kp.toFixed(1);
  const modStr = modReasons.length ? ` · ${modReasons.join(' · ')}` : '';
  const nightWarn = (localHour >= 20 || localHour <= 2)
    ? '<span style="font-size:10px;color:#ffa64d"> · ніч (ефект ↑)</span>' : '';

  card.style.display = 'block';
  card.style.borderColor = lv.border;
  card.style.background = lv.bg;

  // Компактний режим при score=2 (підвищений, але не критичний)
  if(score === 2){
    card.innerHTML = `<div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:12px;font-weight:700;color:${lv.col}">${lv.label}</span>
      <span style="font-size:11px;font-weight:600;color:var(--dim)">GNSS / UAV</span>
      <span style="font-size:11px;color:var(--text2)">${verdict}</span>
      <span style="font-size:10px;color:var(--faint);margin-left:auto">Kp ${kpStr}</span>
    </div>`;
    return;
  }
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span style="font-size:13px;font-weight:700;color:${lv.col}">${lv.label}</span>
      <span style="font-size:11px;font-weight:700;color:var(--dim)">GNSS / UAV</span>
      <span style="font-size:10px;color:var(--faint);margin-left:auto">Kp ${kpStr}${nightWarn}</span>
    </div>
    <div style="font-size:12px;color:var(--text2);margin-top:4px">${verdict}</div>
    ${score >= 2 ? `<div style="font-size:10px;color:var(--faint);margin-top:3px">
      Модифікатори: Kp ${kpStr}${modStr}${isFinite(dst)&&dst<-50?' · Dst '+dst+'нТл':''} · широта ${lat.toFixed(0)}°
    </div>` : ''}
    <div style="font-size:9px;color:var(--faint);margin-top:4px;opacity:.6">
      NOAA G-Scale · Groves &amp; Akala, Radio Science 2012 · не замінює NOTAM/SWPC alerts
    </div>`;
}/* NR_FN_END 116 */

/* NR_FN_BEGIN 165 */function draw27dTable(){
  const tbody = document.getElementById('twentysevenContent');
  const todayStr = todayKyivStr();
  const filterVal = document.getElementById('sel27Filter').value;

  let data = [..._27dComputed];
  const _rawGOf = d => Number(d?.G);

  // v88.8.34: фільтр тільки по raw continuous G. PDF/Engine — overlay, не заміна G.
  if(filterVal === 'good')    data = data.filter(d => _rawGOf(d) >= 0.5);
  if(filterVal === 'neutral') data = data.filter(d => _rawGOf(d) > -0.5 && _rawGOf(d) < 0.5);
  if(filterVal === 'bad')     data = data.filter(d => _rawGOf(d) < -0.5);
  if(filterVal === 'verybad') data = data.filter(d => _rawGOf(d) <= -2.5);
  if(filterVal === 'calendar-risk') data = data.filter(d => d.calendarAdvisory?.level === 'high_risk');
  if(filterVal === 'calendar-caution') data = data.filter(d => ['caution','mixed'].includes(d.calendarAdvisory?.level));
  if(filterVal === 'calendar-support') data = data.filter(d => d.calendarAdvisory?.level === 'support');

  // v88.8.34: sort за raw continuous G. PDF/Engine score не змішується з G.
  data.sort((a,b)=>{
    let va, vb;
    if(_27dSortCol==='g')    { va=_rawGOf(a); vb=_rawGOf(b); }
    else if(_27dSortCol==='ap') { va=a.r.Ap; vb=b.r.Ap; }
    else                     { va=a.ds;     vb=b.ds; }
    if(va < vb) return _27dSortDir==='asc' ? -1 : 1;
    if(va > vb) return _27dSortDir==='asc' ? 1 : -1;
    return 0;
  });

  // Оновлення іконок сортування
  document.querySelectorAll('.th-sort').forEach(th=>{
    th.classList.remove('asc','desc');
    if(th.dataset.col === _27dSortCol) th.classList.add(_27dSortDir);
  });

  if(!data.length){ tbody.innerHTML='<tr><td colspan="15" style="color: var(--muted);padding:16px">Немає даних за фільтром</td></tr>'; return; }

  // G_ос: обчислюємо natal для активного слоту (якщо є)
  let natalIdxFor27 = null;
  const slotD = getSlotData(_activeSlot);
  if(slotD && slotD.date) {
    try {
      const birthJDE = dateToJDE(slotD.date, slotD.time||'12:00', slotD.utcOff??2);
      const natalNak = calcNakshatra(calcMoonLongitude(__nrUtcJdToTt(birthJDE)), birthJDE);
      natalIdxFor27 = natalNak.idx;
    } catch(e){ globalThis.NRDiagnostics?.record('catch.110','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  }
  const gosColVisible = natalIdxFor27 !== null;
  const gosHeader = document.getElementById('th27Gos');
  if(gosHeader) gosHeader.style.display = gosColVisible ? '' : 'none';

  let html='';
  const _panchCache={};
  for(const {r,ds,kpUsed,isOverridden,ai,G,delta,f107mod,_expertEng,_hasOverride,_baseDecisionEng,_decisionEng,_decisionAuthority,_dynamicGuard,calendarAdvisory} of data){
    const isToday = ds === todayStr;
    const _opSig27 = isToday ? getCurrentOperationalSignal() : null;
    const _opScore27 = _opSig27 && isFinite(_opSig27.decisionScore) ? Number(_opSig27.decisionScore) : NaN;
    // v88.8.34: raw-G table value; expert score is overlay, not replacement.
    const G_display = G;
    const gcls = classForG(G_display);
    const cls  = kpUsed>=5 ? 'k-bad' : (kpUsed>=4 ? 'k-warn' : 'k-ok');
    const kpLabel = isOverridden ? 'Kp max (3d↑)' : 'Kp max (27d)';
    const gTipBase = gTooltipText(kpLabel, kpUsed, ai);
    let gTip = f107mod && f107mod.val !== 0 ? gTipBase + '\n⚠ F10.7: ' + f107mod.tip + ' (контекст, не в G)' : gTipBase;
    if(r.fluxStatus === 'conflicting_outlier') gTip += `\n⚠ F10.7 CONFLICTING/QUARANTINED: raw=${r.fluxRaw}; score_effect=0`;
    if (_hasOverride && Number.isFinite(_expertEng) && Number.isFinite(G)) {
      gTip += `\n\n★ PDF/Engine Day_score: ${_expertEng>=0?'+':''}${_expertEng}\n(G_day raw = ${G>=0?'+':''}${G.toFixed(2)}, delta ${(_expertEng-G).toFixed(1)})`;
    }
    if(calendarAdvisory){
      const _adText = calendarAdvisoryText(calendarAdvisory);
      if(_adText) gTip += `\n\nCalendar advisory (${calendarAdvisory.level}): ${_adText}\nscore_effect=0; never add it to G_day again.`;
    }
    // Moon phase emoji for Li column
    const _moonEmoji = ai.phaseDeg < 22 ? '🌑' : ai.phaseDeg < 67 ? '🌒' : ai.phaseDeg < 112 ? '🌓' : ai.phaseDeg < 157 ? '🌔' : ai.phaseDeg < 202 ? '🌕' : ai.phaseDeg < 247 ? '🌖' : ai.phaseDeg < 292 ? '🌗' : ai.phaseDeg < 337 ? '🌘' : '🌑';
    // Nakshatra quality dot
    const _p27 = _panchCache[ds] || (_panchCache[ds]=computePanchanga(typeof sunriseUTC==='function' ? sunriseUTC(r.date) : r.date));
    const _nakDot = _p27.nakshatra.score>=1?'🟢':_p27.nakshatra.score<=-1?'🔴':'🟡';
    const Lcell  = `<span class="hint mono" tabindex="0">${_moonEmoji}${ai.Li !== 0 ? ' <b>'+ai.Li+'</b>' : ''}<span class="hint-pop">${escapeHtml(ai.lTip)}\n${ai.phaseName} (${ai.phaseDeg.toFixed(0)}°)\nНакш.: ${_p27.nakshatra.name} ${_nakDot}</span></span>`;
    const _nakDotCell = `<td style="font-size:14px;text-align:center" title="${_p27.nakshatra.name} (${_p27.nakshatra.score>=1?'сприятл.':_p27.nakshatra.score<=-1?'несприятл.':'нейтр.'})">${_nakDot}</td>`;
    const _mUnvMark = ai.eclipseUnverified ? '<span style="color:#fca474;margin-left:4px" title="Тип затемнення не підтверджено NASA-каталогом">⚠</span>' : '';
    const Mcell  = `<span class="hint mono" tabindex="0">${ai.Mi}${_mUnvMark}<span class="hint-pop">${escapeHtml(ai.mTip)}</span></span>`;
    // R-M window marker for ei
    const _rmActive = isRussellMcPherron(r.date);
    const _eiLabel = ai.ei !== 0 ? String(ai.ei) : (_rmActive ? '<span style="color:#fca474;font-size:9px" title="Russell-McPherron вікно">R-M</span>' : '0');
    const Ecell  = `<span class="hint mono" tabindex="0">${_eiLabel}<span class="hint-pop">${escapeHtml(ai.eTip)}${_rmActive?'\n⚠ Russell-McPherron вікно (підвищена геомагн. чутливість)':''}</span></span>`;
    const Pcell  = `<span class="hint mono" tabindex="0">${ai.Pi}<span class="hint-pop">${escapeHtml(ai.pTip||'')}</span></span>`;
    const AiCell = `<span class="hint mono" tabindex="0">${ai.Ai}<span class="hint-pop">${escapeHtml(ai.explain)}</span></span>`;
    const rowStyle = G <= -2.5 ? 'background:rgba(255,107,107,0.1);' : G <= -0.5 ? 'background:rgba(255,204,0,0.05);' : '';
    const todayStyle = isToday ? 'outline:2px solid rgba(55,167,255,0.6);' : '';
    const kpSuffix = isOverridden ? ' ▲' : '';
    const deltaCell = delta === null ? '<td class="mono muted col-hide-mobile">—</td>'
      : delta > 0.05  ? `<td class="mono col-hide-mobile" style="color:var(--bad)">↑ +${delta.toFixed(2)}</td>`
      : delta < -0.05 ? `<td class="mono col-hide-mobile" style="color:var(--ok)">↓ ${delta.toFixed(2)}</td>`
      : `<td class="mono muted col-hide-mobile">→</td>`;

    // G_ос клітинка для цього рядка
    let gosCell = '';
    if(gosColVisible && Number.isFinite(G)) {
      const rowDate = r.date;
      const jde27 = rowDate.getTime() / 86400000 + 2440587.5;
      const nak27 = calcNakshatra(calcMoonLongitude(__nrUtcJdToTt(jde27)), jde27);
      const t27 = calcTaara(natalIdxFor27, nak27.idx);
      const gmod27 = TAARA_DANGER.includes(t27.group) ? -1 : (t27.group===2||t27.group===4||t27.group===6||t27.group===8||t27.group===9) ? 1 : 0;
      const Gos27 = (isFinite(G) ? G : 0) + gmod27;
      const gcol27 = gmod27 < 0 ? '#ff6b6b' : gmod27 > 0 ? '#2bd47d' : '#6b82aa';
      const sign27 = Gos27 >= 0 ? '+' : '';
      gosCell = `<td style="font-size:12px;font-weight:700;color:${gcol27}" title="G_ос=${sign27}${Gos27.toFixed(2)}: G${isFinite(G)?(G>=0?'+':'')+G.toFixed(2):''} ${gmod27>=0?'+':''}${gmod27} (Taara ${t27.group} ${t27.name})">${sign27}${Gos27.toFixed(2)}</td>`;
    }

    // v87.62: Day_score cell (PDF/Engine discrete score) + sign divergence mark
    let bulletinCell = '<td class="mono muted" style="font-size:12px">—</td>';
    try {
      const _bs27 = getEngineScore(r.date);
      if(_bs27 && isFinite(_bs27.eng)){
        const _bSign = _bs27.eng >= 0 ? '+' : '';
        const _bCol = _bs27.eng >= 2 ? '#2bd47d' : _bs27.eng === 1 ? '#9cd49c' : _bs27.eng === 0 ? 'var(--muted)' : _bs27.eng === -1 ? '#ffaa33' : '#ff6b6b';
        // v88.9.43-fp225 FIX-CRITICAL (doc15, Problem 4): той самий баг, що вже
        // виправлено в heroBulletin (fp219) — ~ приписувався PDF override,
        // ігноруючи _expertOverride. "PDF/Engine +3~" вводило в оману.
        const _bSynth = _bs27._expertOverride ? '' : (_bs27.kp_synthetic ? '~' : '');
        // Sign divergence same rule as 3-day
        const _gPos27 = G >= 0.5, _gNeg27 = G <= -0.5;
        const _ePos27 = _bs27.eng > 0, _eNeg27 = _bs27.eng < 0;
        const _div27 = (_gPos27 && _eNeg27) || (_gNeg27 && _ePos27);
        const _warn = _div27 ? '<span style="color:#fca474;margin-right:3px" title="Розбіжність знака з G">⚠</span>' : '';
        const _pdfStr = (_bs27.pdf !== null && _bs27.pdf !== undefined) ? `\nPDF: ${_bs27.pdf>=0?'+':''}${_bs27.pdf}` : '';
        const _tipB = `PDF/Engine Day_score: ${_bSign}${_bs27.eng}\nТег: ${_bs27.tag||'—'}\nKp=${_bs27.kp}${_bs27.kp_synthetic?' (synthetic 2.0)':''}${_pdfStr}${_div27?'\n\n⚠ Знак не співпадає з G — моделі не згодні':''}`;
        bulletinCell = `<td style="font-size:12px;text-align:center" title="${escapeHtml(_tipB)}">${_warn}<span style="color:${_bCol};font-weight:700">${_bSign}${_bs27.eng}${_bSynth}</span></td>`;
      }
    } catch(e){ globalThis.NRDiagnostics?.record('catch.111','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

    html += `<tr data-ds="${ds}" style="${(G_display <= -2.5 ? 'background:rgba(255,107,107,0.1);' : G_display <= -0.5 ? 'background:rgba(255,204,0,0.05);' : '')}${todayStyle}">
      <td class="mono col-date"${isToday?' style="font-weight:700;color:var(--alt)"':''}>${ds}${isToday?' <span style="white-space:nowrap;color:var(--alt)">◀</span>':''}</td>
      ${_nakDotCell}
      <td style="min-width:60px">
        ${calendarAdvisory ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 4px 0 0;background:` + (calendarAdvisory.level==='high_risk'?'#ff4d5e':calendarAdvisory.level==='caution'?'#ffaa33':calendarAdvisory.level==='mixed'?'#b88cff':calendarAdvisory.level==='support'?'#2bd47d':'#6b82aa') + `" title="Calendar advisory: ` + escapeHtml(calendarAdvisoryText(calendarAdvisory)) + `; score_effect=0"></span>` : ''}
        <span class="gbadge ${gcls} hint" tabindex="0" style="font-size:13px;padding:4px 8px;min-width:60px">G raw ${isFinite(G_display)?(G_display>=0?'+':'')+G_display.toFixed(1):'…'}<div style="font-size:8px;color:var(--faint);font-weight:500">контекст доби · не рішення${_dynamicGuard?' · ⚠ Kp advisory':''}</div>${_hasOverride?'<span style="color:#ffd166;font-size:10px;margin-left:2px" title="Окремий PDF reference у відповідній колонці">★</span>':''}<span class="hint-pop">${escapeHtml(gTip)}</span></span>
        <div style="margin-top:2px;height:3px;border-radius:2px;background:#0a1020;overflow:hidden"><div style="height:100%;width:${Math.min(100,Math.max(4,isFinite(G_display)?(Math.abs(G_display)/4*100):4)).toFixed(0)}%;background:${G_display<=-2.5?'#ff4444':G_display<=-0.5?'#ffaa33':G_display>=0.5?'#2bd47d':'#9bb1dc'};transition:width .3s"></div></div>
      </td>
      <td><span class="kbadge ${cls}">Kp ${Number.isFinite(kpUsed)?kpUsed.toFixed(2):'—'}${kpSuffix}</span></td>
      ${deltaCell}
      <td>${Lcell}</td><td>${Mcell}</td><td>${Ecell}</td><td>${Pcell}</td><td>${AiCell}</td>
      <td class="mono col-hide-mobile">${Number.isFinite(r.Ap) ? r.Ap : '—'}</td>
      <td class="mono col-hide-mobile">${r.fluxStatus==='conflicting_outlier'?`<span style="color:var(--bad)" title="F10.7 raw=${r.fluxRaw}; поза допустимим діапазоном 50–400; score_effect=0">CONFLICT</span>`:(r.flux ?? '—')}</td>
      <td style="font-size:12px">${isFinite(G_display)?classifyG(G_display):'Дані відсутні'}</td>
      <td class="col-hide-mobile" style="font-size:12px">${(()=>{const _p=calcProbabilityLayer({G:G_display,horizon:'27day'});return _p?`<span style="font-weight:700;color:var(--muted)" title="Евристична зона G; не ймовірність, score_effect=0">${escapeHtml(_p.labelUA)}</span>`:'—';})()}</td>
      <td style="font-size:12px;color:${isToday?'var(--warn)':'var(--faint)'}">${isToday
        ? (isFinite(_opScore27) ? `OP ${_opScore27>=0?'+':''}${_opScore27} · ${escapeHtml(_opSig27.title||'оперативний стан')}` : 'OP недоступний · fail-closed')
        : 'raw-контекст · не команда'}</td>
      ${bulletinCell}
      ${gosCell}
    </tr>`;
  }
  tbody.innerHTML = html;

  // ── Статистика 27-day ──
  const _s27el = document.getElementById('stat27');
  if (_s27el && data.length) {
    // v88.8.34: статистика тільки по raw continuous G. PDF/Engine score не входить у G statistics.
    const _gOf = d => Number(d?.G);
    const _gVals = data.map(_gOf).filter(g => isFinite(g));
    const _nHigh = _gVals.filter(g => g >= 0.5).length;
    const _nLow  = _gVals.filter(g => g < -0.5).length;
    const _nMid  = _gVals.length - _nHigh - _nLow;
    const _gAvg  = _gVals.length ? (_gVals.reduce((a,b)=>a+b,0) / _gVals.length) : 0;
    const _gMin  = _gVals.length ? Math.min(..._gVals) : 0;
    const _gMax  = _gVals.length ? Math.max(..._gVals) : 0;
    _s27el.innerHTML =
      `<span>📅 Raw G доступно: <strong>${_gVals.length}/${data.length}</strong></span>` +
      `<span>G ≥ +0.5: <strong>${_nHigh}</strong></span>` +
      `<span>−0.5 ≤ G &lt; +0.5: <strong>${_nMid}</strong></span>` +
      `<span>G &lt; −0.5: <strong>${_nLow}</strong></span>` +
      `<span>Середнє raw G: <strong>${_gAvg>=0?'+':''}${_gAvg.toFixed(2)}</strong></span>` +
      `<span>Діапазон raw G: <strong>${_gMin>=0?'+':''}${_gMin.toFixed(1)}…${_gMax>=0?'+':''}${_gMax.toFixed(1)}</strong></span>`;
  }

  // fp455: raw 27-day block is descriptive context only, never action or risk language.
  const ts=document.getElementById('trend27Summary');
  if(ts&&data.length){
    const _gOf = d => Number(d?.G);
    const sorted=[...data].sort((a,b)=>a.ds.localeCompare(b.ds));
    const next7=sorted.slice(0,7);
    const next7Values=next7.map(_gOf).filter(Number.isFinite),allValues=sorted.map(_gOf).filter(Number.isFinite);
    const next7Missing=7-next7Values.length,min=allValues.length?Math.min(...allValues):NaN,max=allValues.length?Math.max(...allValues):NaN;
    ts.textContent=`Raw G coverage: ${allValues.length}/${data.length}. Перші 7 календарних дат: ${next7Values.length} значень, ${next7Missing} missing. Діапазон: ${Number.isFinite(min)?min.toFixed(1):'—'}…${Number.isFinite(max)?max.toFixed(1):'—'}. Це числовий контекст, не action, не ризик і не рекомендація.`;
  }
}/* NR_FN_END 165 */

/* NR_FN_BEGIN 166 */function render27Day(rows, last3D){
  const tbody = document.getElementById('twentysevenContent');
  if(!rows||!rows.length){ tbody.innerHTML='<tr><td colspan="15" style="color: var(--muted)">Немає даних</td></tr>'; return; }
  _last27Rows = rows;
  _27dComputed = build27dComputed(rows, last3D);
  draw27dTable();
  draw27Chart();
  // v88.7.7 BUG-1 fix: повторно малюємо 7-day trend з whyCard, бо _27dComputed щойно готове.
  // Перший виклик _renderWhyTrend з _renderHeroCause міг спрацювати до build27dComputed →
  // тренд побудувався race-fallback (computeAi з kp=2). Зараз — точний з 27-day Kp.
  try { if(typeof _renderWhyTrend === 'function') _renderWhyTrend(); } catch(e){ globalThis.NRDiagnostics?.record('catch.112','recoverable'); if(window._DEBUG)console.warn('[silent _renderWhyTrend rerender]:',e.message)}

  // Сортування по кліку на заголовок
  document.querySelectorAll('.th-sort').forEach(th=>{
    th.onclick = ()=>{
      if(_27dSortCol === th.dataset.col){
        _27dSortDir = _27dSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        _27dSortCol = th.dataset.col;
        _27dSortDir = th.dataset.col === 'g' ? 'asc' : 'asc';
      }
      draw27dTable();
    };
  });

  // Фільтр
  document.getElementById('sel27Filter').onchange = draw27dTable;

  // v87.28: compare periods (non-blocking, errors isolated)
  try{ renderComparePeriods(); }catch(e){ globalThis.NRDiagnostics?.record('catch.113','recoverable');  console.warn('[comparePeriods]', e); }
  // v87.34: forward timeline (non-blocking, errors isolated)
  try{ renderForwardTimeline(); }catch(e){ globalThis.NRDiagnostics?.record('catch.114','recoverable');  console.warn('[forwardTimeline]', e); }
  // v88.8.37-fp70: Тема дня
  try{ renderDayTheme(); }catch(e){ globalThis.NRDiagnostics?.record('catch.115','recoverable');  console.warn('[dayTheme]', e); }
  // v88.8.37-fp70: GNSS/UAV Risk Layer
  try{ renderGnssRisk(); }catch(e){ globalThis.NRDiagnostics?.record('catch.116','recoverable');  console.warn('[gnssRisk]', e); }
  // v88.8.37-fp70: 7-day Summary
  try{ renderWeekSummary(); }catch(e){ globalThis.NRDiagnostics?.record('catch.117','recoverable');  console.warn('[weekSummary]', e); }
  // v88.8.37-fp72: Audit Card (оновлюємо дані при кожному refresh, показ — через toggle)
  try{ renderAuditCard(); }catch(e){ globalThis.NRDiagnostics?.record('catch.118','recoverable');  console.warn('[auditCard]', e); }
}/* NR_FN_END 166 */

/* NR_FN_BEGIN 168 */function renderComparePeriods(){
  const wrap = document.getElementById('comparePeriodsBlock');
  if(!wrap) return;

  // v87.29: режим у localStorage, default = 'year' (Σ-ритм)
  const mode = lsGet('cmp_mode','year'); // 'year' | 'carrington'

  const today = new Date(todayKyivStr()+'T12:00:00Z');
  const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const yearNow = todayUTC.getUTCFullYear();

  if(mode === 'year'){
    // ── РЕЖИМ 1: рік тому (Σ-ритм only) ──
    const days = [];
    for(let k=-3;k<=3;k++){
      const dNow = addDays(todayUTC, k);
      const dPrev = new Date(Date.UTC(dNow.getUTCFullYear()-1, dNow.getUTCMonth(), dNow.getUTCDate()));
      const aiNow  = computeAi(sunriseUTC(dNow),  0);
      const aiPrev = computeAi(sunriseUTC(dPrev), 0);
      days.push({ dNow, dPrev, aiNow: aiNow.Ai, aiPrev: aiPrev.Ai });
    }
    // v88.9.42-fp224 (аудит-раунд-11, Problem 11): "Середній Σ 2026/2025" без
    // видимого пояснення читалось як річне/місячне середнє, хоча це 7-денне
    // вікно (-3..+3 дні від сьогодні) БЕЗ Kp-компонента (historical Kp
    // недоступний) — пояснення було лише в hover title, не у видимому лейблі.
    const _cmpFrom = fmtDate(days[0].dNow), _cmpTo = fmtDate(days[days.length-1].dNow);
    const _cmpFromP = fmtDate(days[0].dPrev), _cmpToP = fmtDate(days[days.length-1].dPrev);
    const _cmpLabel1 = `Середній ΣAᵢ ${_cmpFrom}–${_cmpTo}`;
    const _cmpLabel2 = `проти ${_cmpFromP}–${_cmpToP} · Kp не враховано`;
    _renderCmpBlock(wrap, days, {
      mode, label1: _cmpLabel1, label2: _cmpLabel2,
      unit: 'Σ', pillText: 'Σ-ритм', yearNow, yearPrev: yearNow-1,
      helpText: `Σ-ритм = ΣAᵢ (Lᵢ+Mᵢ+eᵢ+Pᵢ+Dᵢ) — Панчанга + затемнення + свята + Dst-буря.\nБез Kp-компонента, бо historical Kp за рік недоступний.\nВікно: -3..+3 дні від сьогодні (7 днів), НЕ річне чи місячне середнє.`
    });
    return;
  }

  // ── РЕЖИМ 2: 4 тижні назад (Carrington rotation) з повним G ──
  // Placeholder поки DGD вантажиться
  wrap.style.display = 'block';
  wrap.innerHTML = `<div style="font-size:12px;color:var(--dim)">Завантаження DGD-архіву…</div>`;

  fetchDGDLast30().then(kpMap => {
    const days = [];
    let missing = 0;
    for(let k=-3;k<=3;k++){
      const dNow  = addDays(todayUTC, k);
      const dPrev = addDays(todayUTC, k - 27); // Carrington rotation
      const dsNow  = fmtDate(dNow);
      const dsPrev = fmtDate(dPrev);
      const kpNow  = kpMap ? kpMap.get(dsNow)  : null;
      const kpPrev = kpMap ? kpMap.get(dsPrev) : null;
      const aiNow  = computeAi(sunriseUTC(dNow),  kpNow  || 0);
      const aiPrev = computeAi(sunriseUTC(dPrev), kpPrev || 0);
      // Повний G = 2 − Kp + ΣAᵢ; якщо Kp немає → тільки Σ (позначимо)
      const gNow  = (kpNow  != null) ? (kpDayTerm(kpNow)  + aiNow.Ai)  : aiNow.Ai;
      const gPrev = (kpPrev != null) ? (kpDayTerm(kpPrev) + aiPrev.Ai) : aiPrev.Ai;
      if(kpNow == null || kpPrev == null) missing++;
      days.push({ dNow, dPrev, aiNow: gNow, aiPrev: gPrev, kpNow, kpPrev });
    }
    _renderCmpBlock(wrap, days, {
      mode, label1: 'Середній G (зараз)', label2: 'Середній G (4 тижні тому)',
      unit: 'G', pillText: 'Carrington rotation', yearNow,
      helpText: `Повний G = 2−Kp+ΣAᵢ. Historical Kp із NOAA DGD (last 30 days).\nВікно: тиждень −3..+3 від сьогодні vs той самий тиждень 27 днів тому.\nCarrington rotation ≈ 27.28 днів — той самий геліо-довготний сектор Сонця.${missing>0?'\n⚠ '+missing+' днів без Kp (використано лише Σ).':''}`
    });
  }).catch(err => {globalThis.NRDiagnostics?.record('promise.catch.7','recoverable');
    wrap.innerHTML = `<div style="font-size:12px;color:#ff9966">Не вдалося завантажити DGD-архів. <a href="#" onclick="_cmpSetMode('year');return false" style="color: var(--alt)">Переключитись на Σ-ритм (рік тому)</a></div>`;
  });
}/* NR_FN_END 168 */

/* NR_FN_BEGIN 169 */function _renderCmpBlock(wrap, days, opts){
  const { mode, label1, label2, unit, pillText, yearNow, yearPrev, helpText } = opts;
  const avgNow  = days.length ? days.reduce((s,d)=>s+(isFinite(d.aiNow)?d.aiNow:0), 0) / days.length : 0;
  const avgPrev = days.length ? days.reduce((s,d)=>s+(isFinite(d.aiPrev)?d.aiPrev:0), 0) / days.length : 0;
  const delta = avgNow - avgPrev;
  const deltaCol = delta >= 0.3 ? '#9fd1ff' : delta <= -0.3 ? '#ff6b6b' : '#9bb1dc';
  const deltaSign = delta >= 0 ? '+' : '';
  const deltaTxt = isFinite(delta) ? `${deltaSign}${delta.toFixed(2)}` : '—';

  // Sparkline
  const barW = 28, barGap = 6, barMaxH = 34;
  const maxAbs = Math.max(...days.flatMap(d => [Math.abs(d.aiNow), Math.abs(d.aiPrev)]), 1);
  const svgW = days.length * (barW + barGap) - barGap;
  const svgH = barMaxH * 2 + 14;
  const midY = svgH / 2;
  const mkBar = (val, x, col) => {
    const h = Math.abs(val) / maxAbs * barMaxH;
    const y = val >= 0 ? midY - h : midY;
    return `<rect x="${x}" y="${y}" width="${barW-2}" height="${h}" fill="${col}" opacity="0.85" rx="2"/>`;
  };
  const LOC_SHORT = d => {
    const wk = ['Нд','Пн','Вт','Ср','Чт','Пт','Сб'][d.getUTCDay()];
    return `${wk} ${d.getUTCDate()}`;
  };
  let bars = '';
  const dayLbls = [];
  for(let i=0;i<days.length;i++){
    const x = i * (barW + barGap);
    bars += mkBar(days[i].aiPrev, x+1, '#4a5e8c');
    const nowCol = days[i].aiNow > 0 ? '#6aa8df' : days[i].aiNow < 0 ? '#ff6b6b' : '#6b82aa';
    bars += mkBar(days[i].aiNow, x+3, nowCol);
    dayLbls.push(`<text x="${x + barW/2}" y="${svgH-2}" text-anchor="middle" fill="#7f99c4" font-size="8">${LOC_SHORT(days[i].dNow)}</text>`);
  }
  bars = `<line x1="0" y1="${midY}" x2="${svgW}" y2="${midY}" stroke="#2a3b61" stroke-width="1"/>` + bars + dayLbls.join('');

  const narrative = delta >= 0.5 ? 'Цьогорічний ритм помітно кращий'
                  : delta >= 0.2 ? 'Цьогорічний ритм трохи кращий'
                  : delta <= -0.5 ? 'Цьогорічний ритм помітно нижчий'
                  : delta <= -0.2 ? 'Цьогорічний ритм трохи нижчий'
                  : 'Ритм майже однаковий';

  // Toggle buttons
  const tgl = (val, txt) => {
    const active = (val === mode);
    return `<button onclick="_cmpSetMode('${val}')" style="font-size:10px;padding:3px 8px;border-radius:6px;border:1px solid ${active?'#37a7ff':'#2a3b61'};background:${active?'rgba(55,167,255,0.18)':'#0f1a2f'};color:${active?'#9fd1ff':'#9bb1dc'};cursor:pointer;font-weight:${active?700:400}">${txt}</button>`;
  };

  wrap.style.display = 'block';
  wrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
      <span style="font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--dim)">Порівняння періодів</span>
      <span class="pill" style="font-size:9px">${pillText}</span>
      <span class="hint" tabindex="0" style="font-size:10px;color:var(--faint);cursor:help">
        ⓘ
        <span class="hint-pop" style="white-space:pre;font-size:11px">${helpText}</span>
      </span>
      <span style="margin-left:auto;display:flex;gap:4px">
        ${tgl('year','Рік тому (Σ)')}
        ${tgl('carrington','4 тижні (G)')}
      </span>
    </div>
    <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      <div style="flex:0 0 auto">
        <div style="font-size:11px;color:var(--dim)">${label1}</div>
        <div class="mono" style="font-size:18px;font-weight:700;color:${avgNow>=0?'#9fd1ff':avgNow<=-0.5?'#ff6b6b':'#9bb1dc'}">${avgNow>=0?'+':''}${avgNow.toFixed(2)}</div>
      </div>
      <div style="flex:0 0 auto">
        <div style="font-size:11px;color:var(--dim)">${label2}</div>
        <div class="mono" style="font-size:18px;font-weight:700;color:${avgPrev>=0?'#8fb5ff':'#b07080'};opacity:0.85">${avgPrev>=0?'+':''}${avgPrev.toFixed(2)}</div>
      </div>
      <div style="flex:0 0 auto;border-left:1px solid #2a3b61;padding-left:16px">
        <div style="font-size:11px;color:var(--dim)">Різниця</div>
        <div class="mono" style="font-size:18px;font-weight:700;color:${deltaCol}">${deltaTxt}</div>
      </div>
      <div style="flex:1 1 auto;min-width:220px">
        <svg viewBox="0 0 ${svgW} ${svgH}" style="width:100%;max-width:${svgW*1.5}px;height:${svgH}px">${bars}</svg>
        <div style="display:flex;gap:10px;font-size:9px;color:var(--faint);margin-top:2px">
          <span><span style="display:inline-block;width:8px;height:8px;background: var(--ok);vertical-align:middle;margin-right:3px"></span>зараз</span>
          <span><span style="display:inline-block;width:8px;height:8px;background:#4a5e8c;vertical-align:middle;margin-right:3px"></span>${mode==='year' ? (yearPrev||yearNow-1) : '−27 дн.'}</span>
        </div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--dim);margin-top:6px">${narrative}.</div>
  `;
}/* NR_FN_END 169 */

/* NR_FN_BEGIN 175 */function renderForwardTimeline(){
  const wrap = document.getElementById('forwardTimelineBlock');
  if(!wrap) return;
  if(!_27dComputed || !_27dComputed.length){ wrap.style.display='none'; return; }
  wrap.style.display = 'block';
  // fp52-P7: ensure header explains source = NOAA 27-day (same as chart line, NOT 3-day forecast)
  const _ftHeader = wrap.querySelector('.ft-source-note');
  if (!_ftHeader) {
    const _note = document.createElement('div');
    _note.className = 'ft-source-note';
    _note.style.cssText = 'font-size:9px;color:var(--faint);margin-bottom:4px';
    _note.title = 'Forward timeline використовує NOAA 27-day outlook — той самий масив що й графік 27D. Може відрізнятися від 3-day forecast.';
    _note.textContent = 'ⓘ Джерело: NOAA 27-day Largest Kp (≠ NOAA 3-day forecast)';
    wrap.insertBefore(_note, wrap.firstChild);
  }

  // v87.35: visible subset на вузьких екранах
  const { data: visibleData, offset, isNarrow } = _ftGetVisibleData();

  const todayStr = todayKyivStr();
  const todayIdx = _27dComputed.findIndex(d => d.ds === todayStr);
  const selIdx = _ftSelectedIdx >= 0 ? _ftSelectedIdx : (todayIdx >= 0 ? todayIdx : 0);
  const sel = _27dComputed[selIdx];

  const gap = 1;

  // Sticks HTML — тільки видимі
  let sticks = '';
  for(let i=0;i<visibleData.length;i++){
    const globalIdx = offset + i;
    const d = visibleData[i];
    // v88.8.34: raw continuous G only; PDF/Engine score is only a marker/tooltip
    const _gEff = d.G;
    const g = isFinite(_gEff) ? _gEff : 0;
    // fp387: every bar is the same raw-context series as the 27-day line.
    // A verified PDF reference is provenance only: gold outline + tooltip, never
    // a green/red fill that could be mistaken for an operational permission.
    const _hasDecision = d._hasOverride && Number.isFinite(d._expertEng);
    const col = _ftGColor(_gEff);
    const isToday = (globalIdx === todayIdx);
    const isSel = (globalIdx === selIdx);
    // v87.90 P5 fix: opacity gradient за horizon — uncertainty visualization
    // 0..3д = full confidence, 4..7д = 75%, 8..14д = 55%, 15..27д = 35%
    // Чесно показує що дальні дні менш надійні (NOAA 27-day має ±1.5 розкид Kp).
    const daysOut = (todayIdx >= 0) ? (globalIdx - todayIdx) : 0;
    const horizonConf = daysOut <= 0 ? 1.0 : daysOut <= 3 ? 1.0 : daysOut <= 7 ? 0.75 : daysOut <= 14 ? 0.55 : 0.35;
    const opacity = isSel ? 1 : (isToday ? 0.92 : 0.7 * horizonConf);
    // v88.8.18: для overrides — золоте обведення замість transparent
    const border = isSel ? `2px solid #fff` : (isToday ? `1.5px solid #9fd1ff` : d._hasOverride ? '1px solid #ffd166' : '1px solid transparent');
    const hPct = Math.max(18, Math.min(100, Math.abs(g) * 18 + 18));
    const _confLbl = daysOut <= 3 ? ' · близький горизонт' : daysOut <= 7 ? ' · короткий горизонт' : daysOut <= 14 ? ' · середній горизонт' : ' · дальній горизонт';
    const _ovLbl = _hasDecision ? ` · PDF REFERENCE ${d._expertEng>=0?'+':''}${d._expertEng} · raw G=${d.G.toFixed(1)}` : ' · лише raw-контекст';
    const label = `${d.ds}${_ovLbl}${_confLbl}`;
    sticks += `<div class="ft-stick" data-idx="${globalIdx}" title="${label}" style="flex:1;min-width:0;height:${hPct}%;background:${col};opacity:${opacity};border-radius:2px;cursor:pointer;transition:opacity .15s, border .15s;box-sizing:border-box;border:${border}"></div>`;
  }

  // Detail panel
  const _selG_raw = sel.G;
  const selG = isFinite(_selG_raw) ? _selG_raw : 0;
  const selCat = _ftCategory(_selG_raw);
  const selCol = _ftGColor(_selG_raw);
  const gSign = selG >= 0 ? '+' : '';
  const aiPart = sel.ai ? `ΣAᵢ ${sel.ai.Ai>=0?'+':''}${sel.ai.Ai}` : '';
  const kpPart = isFinite(sel.kpUsed) ? `Kp ${sel.kpUsed.toFixed(1)}` : '';
  const relDays = selIdx - (todayIdx >= 0 ? todayIdx : 0);
  const relTxt = relDays === 0 ? 'сьогодні' : relDays > 0 ? `+${relDays} дн.` : `${relDays} дн.`;

  // v87.35: Speed buttons — active state по _ftPlaySpeed
  const speedBtn = (val, label) => {
    const active = (_ftPlaySpeed === val);
    return `<button onclick="_ftSetSpeed(${val})" style="font-size:10px;padding:2px 7px;border:1px solid ${active?'#37a7ff':'#2a3b61'};background:${active?'rgba(55,167,255,0.15)':'#0f1a2f'};color:${active?'#9fd1ff':'#9bb1dc'};border-radius:5px;cursor:pointer;font-weight:${active?700:400}">${label}</button>`;
  };

  const narrowHint = isNarrow ? `<span style="font-size:9px;color:var(--faint)">${visibleData.length}/${_27dComputed.length} дн.</span>` : '';

  wrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">
      <span style="font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--dim)">Forward timeline</span>
      <span class="pill" style="font-size:9px">${visibleData.length} дн.</span>
      ${narrowHint}
      <span class="hint" tabindex="0" style="font-size:10px;color:var(--faint);cursor:help">ⓘ<span class="hint-pop" style="white-space:pre;font-size:11px">Інтерактивна смуга прогнозу. Клік по стовпчику — вибір дня.
▶ Play автопрокручує по обраній швидкості. Висота ∝ |G_day raw|. Колір кожного стовпчика = зона G_raw. Золота рамка = на цю дату є PDF reference; його знак написаний у деталях. Reference і raw не є дозволом для дії.
${isNarrow?'На вузькому екрані показано 14 днів (−3..+10 від сьогодні).':'Показано всі 27 днів прогнозу.'}</span></span>
      <span style="margin-left:auto;display:flex;gap:3px;align-items:center">
        ${speedBtn(0.5, '½×')}
        ${speedBtn(1, '1×')}
        ${speedBtn(2, '2×')}
      </span>
      <button id="ftPlayBtn" onclick="_ftTogglePlay()" style="font-size:11px;padding:3px 10px;border:1px solid ${_ftPlaying?'#ff9955':'#2a3b61'};background:${_ftPlaying?'rgba(255,153,85,0.15)':'#0f1a2f'};color:${_ftPlaying?'#ffc998':'#9bb1dc'};border-radius:6px;cursor:pointer">${_ftPlaying?'⏸ Pause':'▶ Play'}</button>
      <button onclick="_ftJumpTo(-1)" style="font-size:11px;padding:3px 8px;border:1px solid #2a3b61;background:#0f1a2f;color: var(--muted);border-radius:6px;cursor:pointer" title="Сьогодні">⌖</button>
    </div>
    <div id="ftSticksRow" style="display:flex;align-items:flex-end;height:48px;gap:${gap}px;padding:0 2px">${sticks}</div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:4px;font-size:9px;color:var(--faint);letter-spacing:.04em" title="Прозорість лише візуально послаблює дальній горизонт. Це не калібрована ймовірність і не оцінка точності.">
      <span><strong style="color:#f0a33a">Колір = зона G_raw-контексту</strong>, не дозвіл; <strong style="color:#ffd166">золота рамка = PDF reference</strong>, не оперативне рішення.</span><span>Горизонт raw:</span>
      <span>0–3д близький</span><span>4–7д короткий</span><span>8–14д середній</span><span>15–27д дальній</span>
    </div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px;padding-top:8px;border-top:1px solid #1e2a44">
      <div style="flex:0 0 auto">
        <div style="font-size:10px;color:var(--faint)">${sel.ds} · ${relTxt}</div>
        ${(() => {
          // fp359: for today the canonical operational resolver is primary.
          // PDF/Engine remains a frozen reference and raw remains source context.
          try {
            const _v = (typeof getEngineScore === 'function') ? getEngineScore(sel.ds) : null;
            if (sel.ds === todayStr && typeof resolveDaySignal_v88825 === 'function') {
              const _liveG = isFinite(window.__uiState?.gNow) ? Number(window.__uiState.gNow) : selG;
              const _liveKp = isFinite(window.__uiState?.kpNow) ? Number(window.__uiState.kpNow) : Number(sel.kpUsed);
              const _opSig = resolveDaySignal_v88825(new Date(sel.ds+'T12:00:00Z'), _liveG, _liveKp, {isToday:true});
              const _op = Number(_opSig?.decisionScore);
              if (Number.isFinite(_op)) {
                const _opCol = _op >= 1 ? '#63be7b' : _op <= -1 ? '#ff6b6b' : '#9bb1dc';
                const _ref = (_v && isFinite(_v.eng)) ? Math.max(-3, Math.min(3, Math.round(_v.eng))) : null;
                return `<div class="mono" style="font-size:18px;font-weight:700;color:${_opCol}" title="Оперативний стан зараз: обережніший результат live/raw-фону та safety-обмежень.">${_op>=0?'+':''}${_op} <span style="font-size:11px;font-weight:600;color:var(--dim)">оперативний стан</span></div>`
                  + `<div style="font-size:10px;color:var(--faint);margin-top:1px">${_ref === null ? '' : `PDF/Engine reference ${_ref>=0?'+':''}${_ref} · `}raw G_now ${_liveG>=0?'+':''}${Number(_liveG).toFixed(1)}</div>`;
              }
            }
            if (_v && isFinite(_v.eng)) {
              const _ec = Math.max(-3, Math.min(3, Math.round(_v.eng)));
              const _vcol = _ec >= 1 ? '#cfb6ff' : _ec <= -1 ? '#ff8f9a' : '#9bb1dc';
              return `<div class="mono" style="font-size:18px;font-weight:700;color:${_vcol}" title="Заморожений PDF/Engine reference для порівняння; не оперативний дозвіл.">${_ec>=0?'+':''}${_ec} <span style="font-size:11px;font-weight:600;color:var(--dim)">PDF/Engine reference</span></div>`
                + `<div style="font-size:10px;color:var(--faint);margin-top:1px" title="Forward Timeline raw = day-peak G (max Kp прогнозу × ΣAᵢ). Довідковий геомагнітний тренд, НЕ вердикт.">довідково · raw G_day ${gSign}${selG.toFixed(1)}</div>`;
            }
          } catch(_e){ window.NRDiagnostics?.record('legacy.catch.87','recoverable'); }
          // fallback: немає verdict для дати — показуємо raw як було
          return `<div class="mono" style="cursor:help;font-size:18px;font-weight:700;color:${selCol}" title="G ${gSign}${selG.toFixed(2)} — денний пік. Hero G показує LIVE слот.">G_day ${gSign}${selG.toFixed(2)}</div>`
            + `<div style="font-size:10px;color:var(--dim);margin-top:1px">G_day raw · не G_now</div>`;
        })()}
      </div>
      <div style="flex:0 0 auto;font-size:11px;color:var(--dim)">
        <div title="Категорія за G_day raw (астро без експерта). НЕ підсумковий вердикт дня — див. PDF/Engine зліва.">raw: ${selCat}</div>
        <div>${[kpPart, aiPart].filter(Boolean).join(' · ')}</div>
      </div>
    </div>
  `;

  // v87.39: Click + touch swipe + keyboard + ARIA
  const row = document.getElementById('ftSticksRow');
  if(row){
    // 1. Click + ARIA per stick
    row.querySelectorAll('.ft-stick').forEach(st => {
      const i = parseInt(st.dataset.idx, 10);
      const d = isFinite(i) ? _27dComputed[i] : null;
      if(d){
        // v88.8.34: ARIA label використовує raw continuous G
        const _gEff = d.G; // v88.8.34: raw continuous G only
        const gTxt = isFinite(_gEff) ? _gEff.toFixed(2) : 'н/д';
        const _ovTxt = d._hasOverride ? ', expert override' : '';
        st.setAttribute('role', 'button');
        st.setAttribute('tabindex', i === selIdx ? '0' : '-1');
        st.setAttribute('aria-label', `${d.ds}, G ${gTxt}${_ovTxt}, ${_ftCategory(_gEff)}`);
        if(i === selIdx) st.setAttribute('aria-current', 'true');
      }
      st.addEventListener('click', () => {
        if(isFinite(i)) _ftJumpTo(i);
      });
    });

    // 2. Swipe-to-scrub (touch) — drag across sticks selects day under finger
    let _ftDragging = false;
    const _handleTouchIdx = (clientX) => {
      const rect = row.getBoundingClientRect();
      const rel = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const pct = rel / rect.width;
      const offset = _ftGetVisibleData().offset;
      const visLen = _ftGetVisibleData().data.length;
      if(!visLen) return;
      const localIdx = Math.min(visLen - 1, Math.floor(pct * visLen));
      const globalIdx = offset + localIdx;
      if(globalIdx !== _ftSelectedIdx) _ftJumpTo(globalIdx);
    };
    row.addEventListener('touchstart', (e) => {
      _ftDragging = true;
      // Auto-pause play при touch interaction
      if(_ftPlaying){ _ftTogglePlay(); }
      if(e.touches[0]) _handleTouchIdx(e.touches[0].clientX);
    }, { passive: true });
    row.addEventListener('touchmove', (e) => {
      if(!_ftDragging) return;
      if(e.touches[0]) _handleTouchIdx(e.touches[0].clientX);
    }, { passive: true });
    row.addEventListener('touchend', () => { _ftDragging = false; });
    row.addEventListener('touchcancel', () => { _ftDragging = false; });

    // 3. Keyboard navigation — arrows + Home/End
    row.addEventListener('keydown', (e) => {
      const n = _27dComputed.length;
      if(e.key === 'ArrowLeft'){
        e.preventDefault();
        _ftJumpTo(Math.max(0, _ftSelectedIdx - 1));
        const focused = row.querySelector(`.ft-stick[data-idx="${_ftSelectedIdx}"]`);
        if(focused) focused.focus();
      } else if(e.key === 'ArrowRight'){
        e.preventDefault();
        _ftJumpTo(Math.min(n - 1, _ftSelectedIdx + 1));
        const focused = row.querySelector(`.ft-stick[data-idx="${_ftSelectedIdx}"]`);
        if(focused) focused.focus();
      } else if(e.key === 'Home'){
        e.preventDefault();
        _ftJumpTo(0);
        const focused = row.querySelector('.ft-stick[data-idx="0"]');
        if(focused) focused.focus();
      } else if(e.key === 'End'){
        e.preventDefault();
        _ftJumpTo(n - 1);
        const focused = row.querySelector(`.ft-stick[data-idx="${n-1}"]`);
        if(focused) focused.focus();
      } else if(e.key === ' ' || e.key === 'Enter'){
        e.preventDefault();
        _ftTogglePlay();
      }
    });

    // ARIA role for the row container
    row.setAttribute('role', 'slider');
    row.setAttribute('aria-label', 'Таймлайн прогнозу на 27 днів');
    row.setAttribute('aria-valuemin', '0');
    row.setAttribute('aria-valuemax', String(_27dComputed.length - 1));
    row.setAttribute('aria-valuenow', String(selIdx));
    const selD = _27dComputed[selIdx];
    if(selD) row.setAttribute('aria-valuetext', `${selD.ds}, G ${isFinite(selD.G)?selD.G.toFixed(2):'—'}`);
  }
}/* NR_FN_END 175 */

/* NR_FN_BEGIN 183 */function renderCurrentPanel(){
  const nowUTC = new Date();

  // 1) Kp
  let kUse = (lastWWV && typeof lastWWV.kNow==='number') ? lastWWV.kNow : null;
  if(kUse==null && last3D && (last3D.days||[]).length){
    const today = startUTC(nowUTC);
    const row = last3D.days.find(d=> sameUTCDay(startUTC(d.date), today)) || last3D.days[0];
    if(row && isFinite(row.kpMax)) kUse = row.kpMax;
  }
  // fp106: ls-cache fallback — коли live Kp впав, читаємо останній відомий Kp з localStorage
  if(kUse==null){
    const _lsKp = parseFloat(lsGet('last_kp_known'));
    if(isFinite(_lsKp)) kUse = _lsKp;
  }

  // 2) Бейдж Kp + tooltip + δKp тренд
  const nowKpEl = el('nowKp');
  if(kUse!=null){
    const kp = badgeForK(kUse);
    // δKp: різниця між поточним і попереднім 3-год спостереженням
    let deltaHtml = '';
    if(lastWWV && isFinite(lastWWV.kPrev3h) && isFinite(lastWWV.kNow)){
      const delta = lastWWV.kNow - lastWWV.kPrev3h;
      if(Math.abs(delta) >= 0.1){
        const arrow = delta > 0 ? '↑' : '↓';
        const dCol  = delta > 0 ? '#ff9966' : '#63be7b';
        deltaHtml = ` <span style="font-size:11px;color:${dCol};font-weight:700">${arrow}${Math.abs(delta).toFixed(1)}</span>`;
      }
    }
    // v26.2: 24h trend arrow
    let trend24Html = '';
    if(lastWWV && isFinite(lastWWV.kp24hAgo) && isFinite(lastWWV.kNow)){
      const d24 = lastWWV.kNow - lastWWV.kp24hAgo;
      if(Math.abs(d24) >= 0.3){
        const arr = d24 > 0 ? '⬆' : '⬇';
        const col = d24 > 0 ? '#ff6b6b' : '#2bd47d';
        trend24Html = ` <span style="font-size:10px;color:${col};opacity:0.8" title="24h тренд: ${d24>0?'+':''}${d24.toFixed(1)}">${arr}24h</span>`;
      }
    }
    nowKpEl.className = kp.cls + ' hint';
    nowKpEl.setAttribute('tabindex','0');
    nowKpEl.innerHTML = `${kp.text}${deltaHtml}${trend24Html}<span class="hint-pop">${escapeHtml(kpTooltip(kUse))}</span>`;
  }else{
    nowKpEl.className = 'kbadge k-warn';
    nowKpEl.textContent = 'Kp —';
  }

  // 2b) Regime chip (v70: E16 sync — Quiet/Transition/Disturbed)
  let _regimeEl = el('regimeChip');
  if(!_regimeEl){
    _regimeEl = document.createElement('span');
    _regimeEl.id = 'regimeChip';
    _regimeEl.style.cssText = 'font-size:10px;padding:2px 7px;border-radius:4px;font-weight:600;margin-left:4px;letter-spacing:0.5px';
    nowKpEl.parentNode.insertBefore(_regimeEl, nowKpEl.nextSibling);
  }
  if(kUse != null){
    if(kUse >= 7)      { _regimeEl.textContent = 'G3+ ЗБУРЕНИЙ'; _regimeEl.style.background = '#5c1010'; _regimeEl.style.color = '#ff6b6b'; }
    else if(kUse >= 5) { _regimeEl.textContent = 'ЗБУРЕНИЙ';      _regimeEl.style.background = '#3a1800'; _regimeEl.style.color = '#fca474'; }
    else if(kUse >= 3) { _regimeEl.textContent = 'ПЕРЕХІДНИЙ';    _regimeEl.style.background = '#2a2800'; _regimeEl.style.color = '#e8d44d'; }
    else               { _regimeEl.textContent = 'СПОКІЙНО';      _regimeEl.style.background = '#0a2a15'; _regimeEl.style.color = '#63be7b'; }
  } else {
    _regimeEl.textContent = '';
  }

  // 2b) Regime chip (v70: Quiet/Transition/Disturbed)
  const regEl = el('nowRegime');
  if(kUse!=null){
    const rg = kUse>=5 ? {t:'Збурений',c:'#ff6b6b',bg:'#3a0f0f'} : kUse>=3 ? {t:'Перехідний',c:'#fca474',bg:'#2a1f0a'} : {t:'Спокійно',c:'#63be7b',bg:'#0a2a14'};
    regEl.style.cssText = `display:inline-block;font-size:10px;font-weight:600;color:${rg.c};background:${rg.bg};padding:2px 8px;border-radius:10px;border:1px solid ${rg.c}40;margin-left:6px;vertical-align:middle`;
    regEl.textContent = rg.t;
  } else { regEl.style.display='none'; }

  // 3) Ap (факт або найближчий прогноз)
  const today0 = startUTC(nowUTC);
  let apFallback = null;
  if (last3D && Array.isArray(last3D.predictedAp) && last3D.predictedAp.length){
    apFallback = last3D.predictedAp.slice().sort(
      (a,b)=> Math.abs(a.date - today0) - Math.abs(b.date - today0)
    )[0];
  }
  const apEl = el('nowAp');
  if (lastWWV && typeof lastWWV.aNow==='number'){
    const a = lastWWV.aNow;
    apEl.className = 'pill hint';
    apEl.setAttribute('tabindex','0');
    apEl.innerHTML = `Ap ≈ ${a}<span class="hint-pop">${escapeHtml(apTooltip(a,false))}</span>`;
  } else if (apFallback) {
    const a = apFallback.Ap;
    apEl.className = 'pill hint';
    apEl.setAttribute('tabindex','0');
    apEl.innerHTML = `Ap (прогноз) ${a}<span class="hint-pop">${escapeHtml(apTooltip(a,true))}</span>`;
  } else {
    apEl.className = 'pill';
    apEl.textContent = 'Ap —';
  }

  // 3b) Wolf Sn (якщо вже завантажено)
  if(window._lastWolfSn){
    const snEl = el('nowSn');
    const {sn, dateStr, provisional} = window._lastWolfSn;
    const snCls = sn>150 ? 'color:var(--bad)' : (sn>80 ? 'color:var(--warn)' : 'color:var(--ok)');
    const delivery = window._lastWolfSn._delivery==='local_snapshot' ? ' · snapshot' : '';
    snEl.style.display='inline-flex';
    snEl.innerHTML = `Sn <strong style="${snCls}">${sn}</strong>${provisional?' (попер.)':''} <span class="muted" style="font-size:11px">${dateStr}${delivery}</span>`;
  }

  // 4) ΣAᵢ — v26.2: беремо з 3-day для консистентності (той самий результат що в таблиці)
  let ai;
  const todayStr3d = fmtDate(nowUTC);
  if(last3D && Array.isArray(last3D.days)){
    const todayRow = last3D.days.find(d => fmtDate(d.date) === todayStr3d);
    if(todayRow){
      // v87.30 A2-full: Hero використовує ai для ПОТОЧНОГО моменту (реальний hora-слот + real-time Panchanga),
      // а не noon-UTC як раніше (A2-lite). Це дає користувачу ΣAᵢ, який відповідає зараз.
      // noon-ai паралельно рахується для diff-disclosure ("Δ vs полудень") в tooltip.
      // 27-day таблиця, compare periods, персональні slots — залишаються на noon (stable contract).
      // v37.9: для поточного стану використовуємо kNow, не kpMax — щоб eᵢ відповідав реальному Kp зараз
      const kNowForAi = (lastWWV && isFinite(lastWWV.kNow)) ? lastWWV.kNow : (isFinite(kUse) ? kUse : null);
      ai = computeAi(nowUTC, kNowForAi);
      // v87.33: aiNoon рахуємо для того самого дня, що `nowUTC`, а не `todayRow.date` —
      // на межі доби todayRow може бути ВЧОРА (3-day forecast ще не оновив), тоді diff misleading.
      try{
        const aiNoon = computeAi(sunriseUTC(nowUTC), kNowForAi);
        ai._noonDelta = {
          Ai: Math.round((ai.Ai - aiNoon.Ai) * 10) / 10,
          ei: Math.round((ai.ei - aiNoon.ei) * 10) / 10,
          horaEi: Math.round(((ai.horaEi||0) - (aiNoon.horaEi||0)) * 10) / 10,
          noonAi: aiNoon.Ai
        };
      }catch(e){ globalThis.NRDiagnostics?.record('catch.124','recoverable');  ai._noonDelta = null; }
      ai._isNowBased = true;
    }
  }
  if(!ai){
    // v87.30: fallback теж на nowUTC (не noonUTC) для консистентної семантики Hero
    ai = computeAi(nowUTC, isFinite(kUse) ? kUse : null);
    try{
      const aiNoon = computeAi(sunriseUTC(nowUTC), isFinite(kUse) ? kUse : null);
      ai._noonDelta = {
        Ai: Math.round((ai.Ai - aiNoon.Ai) * 10) / 10,
        ei: Math.round((ai.ei - aiNoon.ei) * 10) / 10,
        horaEi: Math.round(((ai.horaEi||0) - (aiNoon.horaEi||0)) * 10) / 10,
        noonAi: aiNoon.Ai
      };
    }catch(e){ globalThis.NRDiagnostics?.record('catch.125','recoverable');  ai._noonDelta = null; }
    ai._isNowBased = true;
  }
  const aiWrap = el('nowAi');
  aiWrap.style.display = 'inline-flex';
  // v87.30 A2-full: якщо ai для ПОТОЧНОГО моменту, показати diff vs полудень у tooltip
  let _noonDiffLine = '';
  if(ai._noonDelta && Math.abs(ai._noonDelta.Ai) >= 0.1){
    const d = ai._noonDelta;
    const sgn = d.Ai >= 0 ? '+' : '';
    _noonDiffLine = `\n─────\nΔ vs полудень: ΣAᵢ ${sgn}${d.Ai}${Math.abs(d.horaEi||0)>=0.1?` (Hora: ${d.horaEi>=0?'+':''}${d.horaEi})`:''}`;
  }
  const aiTipHtml = escapeHtml(
    `Lᵢ: ${ai.Li} — ${ai.lTip.replace(/^[-\d]+\s—\s/, '')}\n` +
    `Mᵢ: ${ai.Mi} — ${ai.mTip.replace(/^[-\d]+\s—\s/, '')}\n` +
    `eᵢ: ${ai.ei}\n${ai.eTip}\n` +
    `Pᵢ: ${ai.Pi} — ${(ai.pTip||'').replace(/^[-\d.]+\s—\s/, '')}\n` +
    `─────\n${ai.explain}${_noonDiffLine}`
  ).replace(/\n/g, '<br>');
  aiWrap.innerHTML = `ΣAᵢ = ${ai.Ai} <span class="hint-pop" id="nowAiTip">${aiTipHtml}</span>`;
  // aiTip тепер перебудований — беремо свіжу посилання
  const aiTip = el('nowAiTip');

  // фаза – окремий бейдж
  const tagEl = el('nowTag');
  tagEl.style.display='inline-flex';
  tagEl.textContent = `Фаза Місяця: ${ai.phaseName || '—'}`;

  // 5) G (інтегральний індикатор) + ПІДКАЗКА СКЛАДУ
  // v26: G = 2 − Kp + ΣAᵢ (єдина формула скрізь). M_DST та F10.7 — лише індикатори у Science Bar.
  const dstMod = computeDstModifier(); // залишається для Science Bar
  const G = (kUse!=null ? kpDayTerm(kUse) : NaN) + ai.Ai; // Ai вже включає Di (A3)
  const gCls = classForG(G);
  const gTipLines = [
    gTooltipText('Kp', (kUse!=null ? kUse : NaN), ai),
    ai.Di !== 0 ? `🧲 Dᵢ=${ai.Di}: ${ai.diTip}` : null
  ].filter(Boolean).join('\n');
  // v26: Confidence Band
  const cb = computeConfidenceBand(kUse, _lastKpObsJson);
  const gLo = isFinite(G) ? (G - cb.delta).toFixed(1) : '—';
  const gHi = isFinite(G) ? (G + cb.delta).toFixed(1) : '—';
  const cbHtml = isFinite(G) ? `<span style="font-size:12px;color:var(--dim);font-weight:400;margin-left:6px">± ${cb.delta}</span>` : '';
  const gEl = el('nowG');
  const _prevGCls = gEl.dataset.lastGcls || '';
  gEl.className = `gbadge ${gCls} hint`;
  gEl.dataset.lastGcls = gCls;
  if(_prevGCls && _prevGCls !== gCls){
    gEl.classList.add('g-updated');
    setTimeout(()=>gEl.classList.remove('g-updated'), 500);
  }
  gEl.setAttribute('tabindex','0');
  // P2-ux: G-Trend стрілка (Kp 3h delta)
  let _gTrendHtml = '';
  if (lastWWV && isFinite(lastWWV.kPrev3h) && isFinite(lastWWV.kNow)) {
    const _dkp = lastWWV.kNow - lastWWV.kPrev3h;
    if (Math.abs(_dkp) >= 0.3) {
      const _tarr = _dkp > 0 ? '\u2191' : '\u2193';
      const _tcol = _dkp > 0 ? '#fca474' : '#63be7b';
      _gTrendHtml = ` <span style="font-size:13px;color:${_tcol};vertical-align:middle;opacity:0.9" title="G-\u0442\u0440\u0435\u043d\u0434: Kp ${_dkp>0?'+':''}${_dkp.toFixed(1)} \u0437\u0430 3h">${_tarr}</span>`;
    }
  }
  // v64: C-score inline — compute early so we can use in badge
  const _kpSrcInline = lastWWV && isFinite(lastWWV.kNow) ? 'obs'
    : (last3D && (last3D.days||[]).length) ? '3d'
    : (_last27Rows && _last27Rows.length) ? '27d' : 'syn';
  // v87.17 A5 fix: guarantee freshnessBadge reflects actual state before computeCScore reads it
  try { if (typeof _renderFreshnessState === 'function') _renderFreshnessState(); } catch(e){ globalThis.NRDiagnostics?.record('catch.126','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  const _csInline = computeCScore(kUse, _lastKpObsJson, ai, G, _kpSrcInline);
  const _cCol = _csInline.gradeCol;
  const _cHtml = isFinite(G)
    ? ` <span style="font-size:11px;font-weight:500;color:${_cCol};opacity:0.85;letter-spacing:.01em" title="C-score: впевненість моделі ${_csInline.pct}%">C=${_csInline.conf.toFixed(2)}</span>`
    : '';
  // v88.6.9 (Issue C): clarify Hero = current moment vs day peak (forecast)
  // Hero G base = current Kp (=kUse). Forward Timeline base = day peak Kp.
  // Якщо різниця >= 1.5 балів — пояснити user що це РIЗНI семантики, не bug.
  let _peakHintLine = '';
  try {
    const _todayStr = todayKyivStr();
    const _todayRow = (last3D && Array.isArray(last3D.days))
      ? last3D.days.find(d => fmtDate(d.date) === _todayStr) : null;
    if(_todayRow && isFinite(_todayRow.kpMax) && isFinite(kUse)){
      const _peakKp = _todayRow.kpMax;
      const _peakG = kpDayTerm(_peakKp) + ai.Ai;
      const _gDiff = Math.abs(_peakG - G);
      if(_gDiff >= 1.5){
        _peakHintLine = `\n─────\n📊 Зараз (Kp=${kUse.toFixed(1)}): G=${G.toFixed(2)}\n📈 Денний пік (Kp=${_peakKp.toFixed(1)}): G=${_peakG >= 0 ? '+' : ''}${_peakG.toFixed(1)}\n(Forward Timeline показує пік, Hero — поточний момент)`;
      }
    }
  } catch(_pHE){ window.NRDiagnostics?.record('legacy.catch.88','recoverable'); }
  // v88.8.18 ★ EXPERT OVERRIDE marker для Hero G today (як уже зроблено для tomorrow).
  // Якщо expert PDF override для today різниться суттєво — показуємо ★ + інфо у tooltip.
  let _heroOverrideMark = '';
  let _heroOverrideTip = '';
  try {
    if (typeof getEffectiveGForDate === 'function' && isFinite(G)) {
      const _heroEff = getEffectiveGForDate(new Date(), G, 1.5);
      if (_heroEff.hasOverride) {
        // v88.8.35-fp18: знаковий конфлікт raw G vs PDF override → червоний ⚠ замість жовтого ★.
        // Симетрично з heroTomorrow fix. Користувач має одразу бачити що "позитивний live"
        // не означає "позитивний день" коли експерт каже інакше.
        const _ovr = _heroEff.override;
        const _signConflict = isFinite(_ovr)
          && ((G > 0.3 && _ovr < -0.3) || (G < -0.3 && _ovr > 0.3));
        if (_signConflict) {
          _heroOverrideMark = '<span style="color: var(--bad);font-size:14px;margin-left:4px;text-shadow:0 0 4px rgba(0,0,0,.5)" title="Конфлікт знаків raw vs PDF override">⚠</span>';
        } else {
          _heroOverrideMark = '<span style="color:#ffd166;font-size:14px;margin-left:4px;text-shadow:0 0 4px rgba(0,0,0,.5)">★</span>';
        }
        _heroOverrideTip = _heroEff.tooltip;
      }
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.89','recoverable'); }
  gEl.innerHTML = `G ${isFinite(G)? G.toFixed(2):'…'}${_heroOverrideMark}${_gTrendHtml}${_cHtml}${cbHtml}<span class="hint-pop">${escapeHtml(gTipLines + _peakHintLine + _heroOverrideTip)}\n\nC-score (впевненість): ${_csInline.pct}%\nConfidence Band: [${gLo} … ${gHi}]\nΔKp(8 obs): ±${cb.kpDelta} · ΔAᵢ: ±0.5</span>`;
  el('nowGcat').textContent = classifyG(isFinite(G)? G:0);

  // ─── v80: delta computation (cScore DOM writes removed — data in __uiState) ───
  try {
    const yesterday = new Date(todayKyivStr()+'T12:00:00Z'); yesterday.setUTCDate(yesterday.getUTCDate()-1);
    const yKey = 'gPrev_' + yesterday.toISOString().slice(0,10);
    const todayKey = 'gPrev_' + todayKyivStr();
    if(isFinite(G) && ai){
      const snap = JSON.stringify({ G: +G.toFixed(2), kp: +(kUse||0).toFixed(2), Li: ai.Li, Mi: ai.Mi, ei: ai.ei, Pi: ai.Pi });
      try { localStorage.setItem(todayKey, snap); } catch(_e){ window.NRDiagnostics?.record('legacy.catch.90','recoverable'); } // v88.8.35-fp56-P8
    }
    const yRaw = localStorage.getItem(yKey);
    if(yRaw && isFinite(G) && ai){
      let ySnap = null;
      try { ySnap = JSON.parse(yRaw); } catch(e){ globalThis.NRDiagnostics?.record('catch.127','recoverable');  ySnap = { G: parseFloat(yRaw) }; }
      const yG = ySnap.G;
      if(isFinite(yG)){
        const dG = G - yG;
        if(window.__uiState) window.__uiState.delta = dG;
      }
    }
  } catch(e){ globalThis.NRDiagnostics?.record('catch.128','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  // ── Probability Layer v68 ────────────────────────────────────────────────
  if(isFinite(G)){
    const _probNow = calcProbabilityLayer({G, csConf:_csInline.conf, horizon:'now'});
    // v78: renderNowProbability removed (hidden DOM); data kept for pipeline
    window._probNow = _probNow;
  }

  // v80: gTopRow sync removed (block deleted)
  // Бейдж "до наступного порогу"
  if(isFinite(G) && kUse != null){
    const thresholds = [
      {label:'G1 (Kp=5)', kp:5}, {label:'G2 (Kp=6)', kp:6},
      {label:'G3 (Kp=7)', kp:7}, {label:'G4 (Kp=8)', kp:8}
    ];
    const next = thresholds.find(t => kUse < t.kp);
    const nearNoteEl = el('nearNote');
    if(next){
      const delta = (next.kp - kUse).toFixed(1);
      nearNoteEl._threshHtml = `<span style="color: var(--muted);font-size:12px">До ${next.label}: Kp+${delta}</span>`;
    } else {
      nearNoteEl._threshHtml = `<span style="color: var(--bad);font-size:12px">⚡ Kp=${kUse.toFixed(1)} — буря активна</span>`;
    }
  }
  // Загальний висновок одним реченням
  if(isFinite(G)){
    // v26.2: Storm override — якщо Kp≥5, показуємо попередження про бурю
    let sm, key;
    if(isFinite(kUse) && kUse >= 7){
      sm = {icon:'⛔', title:'БУРЯ G3+', sub:'Геомагнітна буря — утриматись від критичних рішень'};
      key = '≤-3';
    } else if(isFinite(kUse) && kUse >= 5){
      sm = {icon:'⚠️', title:'БУРЯ', sub:'Kp≥5 — геомагнітна буря, підвищена обережність'};
      key = '-2';
    } else {
      const summaryMap = {
        '≤-3': {icon:'⛔', title:'СТОП', sub:'Уникати бойових дій і критичних рішень'},
        '-2':  {icon:'⚠️', title:'ОБЕРЕЖНО', sub:'Мінімізувати ризики, підвищена обережність'},
        '-1':  {icon:'〽️', title:'ПОМІРНО', sub:'Діяти обережно, контролювати особовий склад'},
        '0':   {icon:'➖', title:'НЕЙТРАЛЬНО', sub:'Стандартний оперативний режим'},
        '1':   {icon:'✅', title:'ДОПУСТИМО', sub:'Планові операції, помірна активність'},
        '≥2':  {icon:'🌟', title:'ОПТИМАЛЬНО', sub:'Час для активних дій і рішень'}
      };
      // v83f: use canonical stateKey
      const _smKeyMap = { tense:'≤-3', unstable:'-1', neutral:'0', good:'1', favorable:'≥2' };
      key = _smKeyMap[classifyStateByG(G)] || '0';
      sm = summaryMap[key] || {icon:'➖',title:'НЕЙТРАЛЬНО',sub:''};
    }
    // Пояснення по компонентах для tooltip
    const parts = ['G = геомагнетизм (Kp) + астрокалендар', 'PCL = Панчанга (хронобіологія)', 'Різниця між G і PCL — нормальна: різні системи', '─────'];
    if(kUse != null) parts.push(`Геомагнетизм: Kp = ${kUse.toFixed(2)}${kUse>=5?' ⚡ БУРЯ':''}`);
    if(dstMod.val !== 0) parts.push(`⚠ Dst: ${dstMod.tip} (контекст)`);
    if(ai.Li !== 0) parts.push(`Фаза місяця: ${ai.phaseName} → Lᵢ = ${ai.Li}`);
    if(ai.Mi !== 0) parts.push(`Затемнення → Mᵢ = ${ai.Mi}`);
    if(ai.ei !== 0 || ai.eTip !== '0 — подій не знайдено') parts.push(`Астрокалендар: ${ai.eTip}`);
    else parts.push(`Астрокалендар: подій не знайдено`);
    if(ai.Pi !== 0) parts.push(`Панчанга (Pᵢ): ${ai.pTip||''}`);
    if(ai.bzVal !== 0) parts.push(`IMF Bz: ${computeBzModifier(lastBz).tip} — контекст (Science Bar)`);
    if(ai.vswVal !== 0) parts.push(`Vsw: ${computeVswModifier(lastVsw).tip} — контекст (Science Bar)`);
    const dstNow = window._lastDst ? window._lastDst.dst : NaN;
    const stormClass = classifyStorm(kUse, dstNow, lastBz, lastVsw);
    parts.push(`Класифікатор бурі: ${stormClass}`);
    parts.push(`─────`);
    parts.push(`G = 2 − Kp + ΣAᵢ = ${G.toFixed(2)}`);
    if(isFinite(kUse) && kUse >= 5) parts.push(`⚠ Kp=${kUse.toFixed(1)} ≥ 5 → геомагнітна буря`);
    const tipText = parts.join('\n');
    // v26.2: storm override colors
    const smCol = (isFinite(kUse) && kUse>=5) ? '#ff6b6b' : G<=-2.5?'#ff4444':G<=-1?'#ffaa33':G>=1?'#2bd47d':'#9bb1dc';
    const smBg  = (isFinite(kUse) && kUse>=5) ? 'rgba(255,60,60,0.13)' : G<=-2.5?'rgba(255,60,60,0.13)':G<=-1?'rgba(255,160,50,0.10)':G>=1?'rgba(43,212,125,0.10)':'rgba(155,177,220,0.07)';
    // v80: nowSummary write removed (element deleted)
  }

  // 6) Ярлик часу
  let effLabel = '—';
  if(lastWWV && lastWWV.whenText){
    effLabel = `Kp snapshot: ${lastWWV.whenText}`;
  }else if(last3D && last3D.days && last3D.days.length){
    const eff = startUTC(last3D.days[0].date);
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    effLabel = `3-day доба: ${eff.getUTCDate()} ${months[eff.getUTCMonth()]} 00:00 UTC`;
  }
  el('nowEffLabel').textContent = `(${effLabel})`;
  updateDataTimestamp(lastWWV && lastWWV.whenText ? lastWWV.whenText : null);

  const nearNoteEl2 = el('nearNote');
  const baseNote = (!lastWWV && kUse != null)
    ? 'Kp: спостереження недоступні — використано прогноз (3-day NOAA).'
    : (kUse == null ? 'Kp недоступний: немає ні спостережень, ні прогнозу.' : '');
  nearNoteEl2.innerHTML = (baseNote ? `<span>${baseNote}</span> ` : '') + (nearNoteEl2._threshHtml || '');

  // lunar_phase_deg: береться з ai.phaseDeg (computeAi вже рахує moonPhaseAngle)
  // Експортуємо глобально — для forecast_engine v18.5 інтеграції
  const lunarPhaseDeg = isFinite(ai.phaseDeg) ? ai.phaseDeg : (moonPhaseAngle(nowUTC) + 360) % 360;
  window._lunarPhaseDeg = lunarPhaseDeg; // forecast_engine: predict(kp, tags, prev_kp, prev_score, date, lunar_phase_deg)

  // v80: __uiState — decoupled source of truth (replaces DOM-relay)
  window.__uiState = {
    gNow: isFinite(G) ? G : NaN,
    kpNow: kUse,
    ai: ai,
    gCat: classifyG(isFinite(G) ? G : 0),
    conf: _csInline.conf,
    confPct: _csInline.pct,
    confReasons: _csInline.drivers || [], // v87.90 fix: функція повертає drivers, не reasons
    confGrade: _csInline.gradeLabel,
    confCol: _csInline.gradeCol,
    freshness: null,       // set by _renderFreshnessState
    stamp: fmtLocal(new Date()),
    lunarPhaseDeg: lunarPhaseDeg,
    phaseName: ai.phaseName || phaseNameByAngle(lunarPhaseDeg),
  };

  try{
    renderGaugeMoon(G, lunarPhaseDeg, kUse!=null?kUse:0, ai.phaseName || phaseNameByAngle(lunarPhaseDeg));
    // v88.8.18: sound notification — G-score crossing 0 (favorable ↔ unfavorable).
    if (window.GIndexSound) window.GIndexSound.checkCritical(G);
  }catch(e){ globalThis.NRDiagnostics?.record('catch.129','recoverable');  console.error('gauge:', e); }

  // Hora таймлайн + найкращий час + Co-Star + Science bar + Profile
  try{
    renderHoraTimeline(nowUTC, kUse != null ? kUse : 0, G);
    renderAstronomyEvents(nowUTC);
    const hora = calcHora(nowUTC);
    renderBestTime(nowUTC, kUse != null ? kUse : 0, G, 0);
    // v78: renderCoStarBanner, updateSafeStateBanner removed (CSS-hidden targets)
    renderDayForecast(last3D, kUse, ai); // v78: stripped to data-only (_daySlots)
    renderGDecomp(G, kUse, ai);
    renderProfileRec();
  }catch(e){ globalThis.NRDiagnostics?.record('catch.130','recoverable');  console.error('extras:', e); }
  // Science bar — окремий try щоб завжди оновлювався
  try{
    const apVal = (lastWWV && typeof lastWWV.aNow==='number') ? lastWWV.aNow
      : (last3D && last3D.predictedAp && last3D.predictedAp[0] ? last3D.predictedAp[0].Ap : NaN);
    const snVal = window._lastWolfSn ? window._lastWolfSn.sn : null;
    const f107Val = window._lastF107 || null;
    updateScienceBar(kUse != null ? kUse : NaN, apVal, snVal, ai, ai.phaseName || phaseNameByAngle(lunarPhaseDeg), lunarPhaseDeg, f107Val);
  }catch(e){ globalThis.NRDiagnostics?.record('catch.131','recoverable');  console.error('scibar:', e); }
}/* NR_FN_END 183 */

/* NR_FN_BEGIN 191 */function renderPanchangaCard(state){
  const { p, ctx, cells, _gEarly, aiNow, pclOnly, panchDiscrepancy, finalDo, finalAvoid, _gNow, dateStr, dateUTC } = state;
  // Use the canonical operational verdict for visual suppression. Raw G can be
  // positive while the single operational decision is negative; in that case
  // positive Jyotish components must not render as green permissions.
  let _panchVisualCtx = _gEarly;
  try {
    const _pvKp = isFinite(window.__uiState?.kpNow) ? Number(window.__uiState.kpNow) : NaN;
    const _pvSig = resolveDaySignal_v88825(new Date(todayKyivStr()+'T12:00:00Z'), Number(_gNow), _pvKp, {isToday:true});
    if (_pvSig && isFinite(_pvSig.decisionScore)) _panchVisualCtx = Number(_pvSig.decisionScore);
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.94','recoverable'); }
  const el_ = id => document.getElementById(id);
  // Local Panchanga properties never override the operational safety state.
  let _finalDayDecision = null;
  try {
    const _decisionDate = new Date(todayKyivStr()+'T12:00:00Z');
    const _kpFinal = isFinite(window.__uiState?.kpNow) ? Number(window.__uiState.kpNow) : NaN;
    const _sigFinal = resolveDaySignal_v88825(_decisionDate, _gNow, _kpFinal, {isToday:true});
    if (_sigFinal && Number.isFinite(Number(_sigFinal.decisionScore))) _finalDayDecision = Number(_sigFinal.decisionScore);
  } catch(_eFinalDay){ window.NRDiagnostics?.record('legacy.catch.95','recoverable'); }
  const _decisionKnownFinalDay = Number.isFinite(_finalDayDecision);
  const _criticalFinalDay = _decisionKnownFinalDay && _finalDayDecision <= -1;
  const _localAction = (txt) => {
    if (!txt) return '';
    const safe = escapeHtml(String(txt));
    return (!_decisionKnownFinalDay || _criticalFinalDay)
      ? `<span style="color:#9bb1dc">Локальна асоціація${_decisionKnownFinalDay?'':' (оперативний стан невідомий)'}: ${safe}</span>`
      : `✓ ${safe}`;
  };
  // v88.9.54-fp236: "~12:00 UTC" тут був хардкоджений і неточний — dateUTC це
  // РЕАЛЬНИЙ sunrise-момент (переданий через computePanchangaState(sunriseUTC(...))),
  // не буквально полудень. Показуємо фактичну годину:хвилину UTC.
  const _refHM = (dateUTC instanceof Date && !isNaN(dateUTC.getTime()))
    ? String(dateUTC.getUTCHours()).padStart(2,'0') + ':' + String(dateUTC.getUTCMinutes()).padStart(2,'0') + ' UTC'
    : '~схід сонця';
  el_('panchDate').textContent = dateStr + ' ' + _refHM;

  function scoreSpan(s){
    if(s > 0) return `<span class="panch-score-pos">+${s}</span>`;
    if(s < 0) return `<span class="panch-score-neg">${s}</span>`;
    return `<span class="panch-score-neu">0</span>`;
  }

  // Build render-cells with HTML sub (scoreSpan) from state.cells
  const renderCells = cells.map(c => ({
    ...c,
    sub: `${c.sub}${c.sub?' · ':''}PCL ${scoreSpan(c.score)}`
  }));
  // Aliases for HTML table (hand-coded references)
  const tAdv = cells[0]?.adv || null;
  const vAdv = cells[1]?.adv || null;
  const nAdv = cells[2]?.adv || null;
  const yAdv = cells[3]?.adv || null;
  const kAdv = cells[4]?.adv || null;
  const rahuAdv = cells[5]?.adv || null;
  const _aiEarly = state._aiEarly;

  // v87.56: removed inner cellClass (dead, 0 callsites)

  // Компактна таблиця з tooltips по кожному параметру
  // gCtx: при G<-1 зелені елементи показуємо синіми (ок самі по собі, але день поганий)
  const scoreIcon = (s, gCtx) => {
    if (s <= -2) return '🔴';
    if (s === -1) return '🟡';
    if (s >= 1)  return (gCtx != null && gCtx < -1) ? '🔵' : '🟢';
    return '⚪';
  };

  // v87.31: visual weight bar — довжина та колір пропорційні |score|
  // Шкала score у Panchanga: зазвичай -3..+3, іноді -4..+4 (Nak/Yoga)
  // v87.96 fix (баг #5): gCtx parameter — узгоджено з scoreIcon. Коли глобальний G тиснутий
  // (g < -1), локально позитивні score приглушуються до синього (#7da4d8) замість зеленого,
  // щоб не створювати видимого конфлікту з червоним Hero (Vara=Soma +1, Yoga=Dhruva +1 тощо).
  const scoreBar = (s, gCtx) => {
    const abs = Math.abs(s||0);
    if (abs === 0) return '';
    const maxW = 32; // px, для score=3
    const w = Math.min(maxW, Math.round(abs / 3 * maxW));
    const _suppressed = (s > 0 && gCtx != null && gCtx < -1);
    const col = s > 0 ? (_suppressed ? '#7da4d8' : '#2bd47d') : '#ff6b6b';
    const opacity = _suppressed ? 0.35 : 0.55;
    return `<span aria-hidden="true" title="|score|=${abs}" style="display:inline-block;vertical-align:middle;width:${w}px;height:4px;background:${col};opacity:${opacity};border-radius:2px;margin-left:4px;margin-right:2px"></span>`;
  };

  // Детальні пояснення для tooltip кожного параметра
  const PANCH_TIPS = {
    tithi: tip => {
      const typeDesc = {
        'Нанда':'Нанда (радісна) — сприятлива для починань і нових справ.',
        'Бхадра':'Бхадра (добра) — добра для будівництва і навчання.',
        'Джая':'Джая (перемога) — добра для початку справ і досягнень.',
        'Рікта':'Рікта (порожня) — уникати важливих рішень і активних дій.',
        'Пурна':'Пурна (повна) — сприятлива для завершення і дипломатії.'
      };
      // v88.8.4: paksha (світла/темна половина) + lunar day number — для контексту
      const isKrishna = (tip.name || '').includes('(K)') || (tip.name || '') === 'Amavasya';
      const pakshaDesc = isKrishna
        ? 'Krishna paksha (темна половина) — Місяць убуває, енергія йде до завершення.'
        : 'Shukla paksha (світла половина) — Місяць росте, енергія йде до зростання.';
      const lunarDayLine = (tip.num !== undefined && isFinite(tip.num)) ? `Місячний день: ${tip.num} з 30\n` : '';
      return `TITHI — місячний день\n` +
        `Що це: час, за який Місяць відстає від Сонця на 12°.\n` +
        `Місяць = 30 тітхі (15 світлих + 15 темних).\n` +
        lunarDayLine +
        `Paksha: ${pakshaDesc}\n` +
        `Тип: ${typeDesc[tip.type] || tip.type}\n` +
        `Вплив: ${tip.score > 0 ? 'сприятливий' : tip.score < 0 ? 'несприятливий' : 'нейтральний'} (PCL ${tip.score > 0 ? '+' : ''}${tip.score})`;
    },
    vara: tip => {
      const desc = {
        'Сонце':'Неділя (Сонце) — лідерство, влада, здоровʼя.',
        'Місяць':'Понеділок (Місяць) — розвідка, раптові дії; погіршує якість сну.',
        'Марс':'Вівторок (Марс) — бойові дії, хірургія, мужність.',
        'Меркурій':'Середа (Меркурій) — комунікації, переговори, логістика.',
        'Юпітер':'Четвер (Юпітер) — стратегія, командування; найкращий для рішень.',
        'Венера':'Пʼятниця (Венера) — відпочинок, ротація, дипломатія.',
        'Сатурн':'Субота (Сатурн) — дисципліна, патрулювання, довгострокові завдання.'
      };
      return `VARA — день тижня\n` +
        `Що це: кожен день керується планетою-регентом.\n` +
        `${desc[tip.planet] || tip.planet}\n` +
        `Вплив на когнітивний стан: PCL ${tip.score > 0 ? '+' : ''}${tip.score}`;
    },
    nakshatra: tip => {
      const typeDesc = {
        'Легка':'Легка — підходить для радісних і легких справ.',
        "М\u2019яка":"М\u2019яка — добра для мистецтва і зцілення.",
        'Стала':'Стала — добра для довгострокових проєктів.',
        'Рухома':'Рухома — добра для переміщень і операцій.',
        'Жорстка':'Жорстка — деструктивна енергія; обережно.',
        'Змішана':'Змішана — нейтральна, помірна активність.'
      };
      // v88.8.15: розширений tooltip — Ganda Mool + Pancha Pakshi канон
      // v88.8.16: + canonical subtype/effect details (Drikpanchang)
      const gandaMoolNote = tip.isGandaMool
        ? `\n⚠ GANDA MOOL — junction nakshatra (BPHS Ch.4 v.13).\n  ${tip.gandaMoolDetails ? `Тип: ${tip.gandaMoolDetails.subtype} (${tip.gandaMoolDetails.ruler}-ruled). Вплив на: ${tip.gandaMoolDetails.effect}.\n  ` : ''}Народжені сьогодні традиційно проходять Mool Shanti (27-денний ритуал).`
        : '';
      // v88.8.16: Panchak warn
      const panchakNote = tip.isPanchak
        ? `\n⚠ PANCHAK — Місяць у Aquarius/Pisces 5-day інаусп. зоні${tip.panchakType ? ` (${tip.panchakType})` : ''}.\n  Канон Drikpanchang: уникати весілля, новосілля, бізнес-старту, південних подорожей.`
        : '';
      const ppNote = tip.panchaPakshi
        ? `\n🐦 Pancha Pakshi: ${tip.panchaPakshi.birdUa} (${tip.panchaPakshi.birdEn})\n  Якості: ${tip.panchaPakshi.quality}`
        : '';
      return `NAKSHATRA — місячна стоянка\n` +
        `Що це: 27 стоянок Місяця по 13°20' екліптики.\n` +
        `Місяць проходить всі 27 за ~27,3 доби.\n` +
        `Регент: ${tip.regent}\n` +
        `${typeDesc[tip.type] || tip.type}\n` +
        `Вплив: PCL ${tip.score > 0 ? '+' : ''}${tip.score}` +
        gandaMoolNote + panchakNote + ppNote;
    },
    yoga: tip => {
      return `YOGA — сонячно-місячний резонанс\n` +
        `Що це: 27 Yoga = якість резонансу коли сума довгот Сонця і Місяця\n` +
        `досягає кратного 13°20'. Середня тривалість ~24 год.\n` +
        `${tip.isCritical ? '⚠️ КРИТИЧНА Yoga — retro_end −3' : `Вплив: ${tip.score > 0 ? 'сприятлива' : tip.score < 0 ? 'несприятлива' : 'нейтральна'}`}\n` +
        `PCL ${tip.score > 0 ? '+' : ''}${tip.score}`;
    },
    karana: tip => {
      // v88.7.7 FIX-D: показуємо note з типу карани (Bava=Постійні справи, Vanija=Торгівля...).
      // Раніше для не-Vishti завжди було "Вплив: нейтральний" — втрата інформації BPHS.
      const _impactTxt = tip.isVishti
        ? '⛔ VISHTI (Bhadra) — традиційно вето: уникати важливих активних дій (PCL ' + tip.score + ')'
        : `Тип: ${tip.type}\nПризначення: ${tip.note || 'нейтральне'}\nВплив: ${tip.score > 0 ? 'сприятливий' : tip.score < 0 ? 'несприятливий' : 'нейтральний'}`;
      return `KARANA — половина місячного дня\n` +
        `Що це: час, за який ΔL збільшується на 6°. Кожна тітхі = 2 карани.\n` +
        `${_impactTxt}\n` +
        `PCL ${tip.score > 0 ? '+' : ''}${tip.score}`;
    },
    rahu: tip => {
      return `RAHU KALAM — несприятливий інтервал\n` +
        `Що це: 90-хвилинний щоденний інтервал Північного вузла Місяця.\n` +
        `Традиційно: не починати нових справ і бойових завдань.\n` +
        `${tip.active ? '⚠️ Зараз активний! Уникати нових операцій.' : 'Зараз неактивний.'}\n` +
        `PCL ${tip.active ? '−1' : '0'}`;
    }
  };

  const html = `<table style="width:100%;border-collapse:collapse;font-size:13px">
    <colgroup><col style="width:30%"><col style="width:32%"><col style="width:38%"></colgroup>
    <tr style="border-bottom:1px solid #1e2f52">
      <th style="padding:3px 6px;font-size:10px;color:var(--dim);font-weight:500;text-align:left">ЩО ДІЄ</th>
      <th style="padding:3px 6px;font-size:10px;color:var(--dim);font-weight:500;text-align:left">ВПЛИВ</th>
      <th style="padding:3px 6px;font-size:10px;color:var(--dim);font-weight:500;text-align:left">КРАЩА ДІЯ</th>
    </tr>
    <tr>
      <td style="padding:5px 6px;color: var(--muted);font-size:11px">
        <span class="hint" tabindex="0" style="cursor:help;font-style:italic;border-bottom:1px dotted var(--faint)">Tithi<span class="hint-pop" style="white-space:pre;font-size:12px">${escapeHtml(PANCH_TIPS.tithi(p.tithi))}</span></span>
      </td>
      <td style="padding:5px 6px;font-weight:600"><span class="hint" tabindex="0" style="cursor:help">${scoreIcon(p.tithi.score, _panchVisualCtx)}${scoreBar(p.tithi.score, _panchVisualCtx)} ${p.tithi.name}<br><span style="font-size:10px;color:#7a95b8;font-weight:400">${p.tithi.type}</span><span class="hint-pop" style="white-space:pre;font-size:12px">${escapeHtml(PANCH_TIPS.tithi(p.tithi))}</span></span></td>
      <td data-local-action="1" style="padding:5px 6px;font-size:11px;color:#b0c4de">${tAdv && tAdv.do ? _localAction(tAdv.do) : ''}</td>
    </tr>
    <tr>
      <td style="padding:5px 6px;color: var(--muted);font-size:11px">
        <span class="hint" tabindex="0" style="cursor:help;font-style:italic;border-bottom:1px dotted var(--faint)">Vara<span class="hint-pop" style="white-space:pre;font-size:12px">${escapeHtml(PANCH_TIPS.vara(p.vara))}</span></span>
      </td>
      <td style="padding:5px 6px;font-weight:600"><span class="hint" tabindex="0" style="cursor:help">${scoreIcon(p.vara.score, _panchVisualCtx)}${scoreBar(p.vara.score, _panchVisualCtx)} ${p.vara.name}<br><span style="font-size:10px;color:#7a95b8;font-weight:400">${p.vara.planet}</span><span class="hint-pop" style="white-space:pre;font-size:12px">${escapeHtml(PANCH_TIPS.vara(p.vara))}</span></span></td>
      <td data-local-action="1" style="padding:5px 6px;font-size:11px;color:#b0c4de">${vAdv && vAdv.do ? _localAction(vAdv.do) : ''}</td>
    </tr>
    <tr>
      <td style="padding:5px 6px;color: var(--muted);font-size:11px">
        <span class="hint" tabindex="0" style="cursor:help;font-style:italic;border-bottom:1px dotted var(--faint)">Nakshatra<span class="hint-pop" style="white-space:pre;font-size:12px">${escapeHtml(PANCH_TIPS.nakshatra(p.nakshatra))}</span></span>
      </td>
      <td style="padding:5px 6px;font-weight:600"><span class="hint" tabindex="0" style="cursor:help">${scoreIcon(p.nakshatra.score, _panchVisualCtx)}${scoreBar(p.nakshatra.score, _panchVisualCtx)} ${p.nakshatra.name}${p.nakshatra.isGandaMool ? ' <span style="color:#ffaa33;font-size:10px;font-weight:700" title="Ganda Mool junction nakshatra">⚠ GM</span>' : ''}${p.nakshatra.isPanchak ? ` <span style="color:#ff8866;font-size:10px;font-weight:700" title="Panchak — інаусп. 5-day window">⚠ PK${p.nakshatra.panchakType ? ' '+p.nakshatra.panchakType.split(' ')[0] : ''}</span>` : ''}<br><span style="font-size:10px;color:#7a95b8;font-weight:400">${p.nakshatra.type} · ${p.nakshatra.regent}${p.nakshatra.panchaPakshi ? ` · 🐦 ${p.nakshatra.panchaPakshi.birdUa}` : ''}</span><span class="hint-pop" style="white-space:pre;font-size:12px">${escapeHtml(PANCH_TIPS.nakshatra(p.nakshatra))}</span></span></td>
      <td data-local-action="1" style="padding:5px 6px;font-size:11px;color:#b0c4de">${nAdv && nAdv.do ? _localAction(nAdv.do) : ''}</td>
    </tr>
    <tr>
      <td style="padding:5px 6px;color: var(--muted);font-size:11px">
        <span class="hint" tabindex="0" style="cursor:help;font-style:italic;border-bottom:1px dotted var(--faint)">Yoga<span class="hint-pop" style="white-space:pre;font-size:12px">${escapeHtml(PANCH_TIPS.yoga(p.yoga))}</span></span>
      </td>
      <td style="padding:5px 6px;font-weight:600"><span class="hint" tabindex="0" style="cursor:help">${scoreIcon(p.yoga.score, _panchVisualCtx)}${scoreBar(p.yoga.score, _panchVisualCtx)} ${p.yoga.name}${p.yoga.isCritical?' ⚠️':''}<br><span style="font-size:10px;color:#7a95b8;font-weight:400">резонанс Сонце–Місяць</span><span class="hint-pop" style="white-space:pre;font-size:12px">${escapeHtml(PANCH_TIPS.yoga(p.yoga))}</span></span></td>
      <td data-local-action="1" style="padding:5px 6px;font-size:11px;color:#b0c4de">${yAdv && yAdv.do ? _localAction(yAdv.do) : ''}</td>
    </tr>
    <tr>
      <td style="padding:5px 6px;color: var(--muted);font-size:11px">
        <span class="hint" tabindex="0" style="cursor:help;font-style:italic;border-bottom:1px dotted var(--faint)">Karana<span class="hint-pop" style="white-space:pre;font-size:12px">${escapeHtml(PANCH_TIPS.karana(p.karana))}</span></span>
      </td>
      <td style="padding:5px 6px;font-weight:600"><span class="hint" tabindex="0" style="cursor:help">${scoreIcon(p.karana.score, _panchVisualCtx)}${scoreBar(p.karana.score, _panchVisualCtx)} ${p.karana.name}${p.karana.isVishti?' ⛔':''}<br><span style="font-size:10px;color:#7a95b8;font-weight:400">${p.karana.type}</span><span class="hint-pop" style="white-space:pre;font-size:12px">${escapeHtml(PANCH_TIPS.karana(p.karana))}</span></span></td>
      <td data-local-action="1" style="padding:5px 6px;font-size:11px;color:#b0c4de">${kAdv && kAdv.do ? _localAction(kAdv.do) : ''}</td>
    </tr>
    ${_aiEarly.ei !== 0 ? `<tr style="background:rgba(255,100,100,0.05)">
      <td style="padding:5px 6px;color:#ff9f9f;font-size:11px;font-style:italic">eᵢ (події)</td>
      <td style="padding:5px 6px;font-weight:600">${_aiEarly.ei < 0 ? '🔴' : '🟢'} <span style="color:${_aiEarly.ei < 0 ? '#ff9f9f' : '#63be7b'}">${_aiEarly.ei > 0 ? '+' : ''}${_aiEarly.ei}</span><br><span style="font-size:10px;color:#7a95b8;font-weight:400">${escapeHtml((_aiEarly.eTip||'').split('\\n')[0])}</span></td>
      <td style="padding:5px 6px;font-size:11px;color:#ccaaaa">${_aiEarly.ei < 0 ? '✗ Несприятлива подія знижує G' : '✓ Сприятлива подія'}</td>
    </tr>` : ''}
    <tr>
      <td style="padding:5px 6px;color: var(--muted);font-size:11px">
        <span class="hint" tabindex="0" style="cursor:help;font-style:italic;border-bottom:1px dotted var(--faint)">Rahu Kalam<span class="hint-pop" style="white-space:pre;font-size:12px">${escapeHtml(PANCH_TIPS.rahu(p.rahu))}</span></span>
      </td>
      ${(() => {
        // v88.8.7 БАГ#1 fix: 3-state Rahu Kalam замість 2-state.
        // Раніше: only 'active' / 'not active'. "Не active" → 🟢 'Обмежень немає' — wrong,
        // бо Rahu Kalam щодня є, просто може бути в майбутньому або вже минулим.
        // Тепер: 🔴 active / 🟡 upcoming / ⚪ past — користувач бачить статус коректно.
        // v88.8.7 БАГ#2 fix: час Rahu Kalam — у локальному часі (раніше UTC без позначки → плутанина).
        const _nh = new Date().getUTCHours() + new Date().getUTCMinutes()/60;
        const _rs = p.rahu.start.split(':').map(Number);
        const _re = p.rahu.end.split(':').map(Number);
        const _rsH = _rs[0] + (_rs[1]||0)/60;
        const _reH = _re[0] + (_re[1]||0)/60;
        // Convert UTC HH:MM → Europe/Kyiv (fp245: канонічно, НЕ browser TZ —
        // раніше через Date.UTC+getHours(), що плаває з TZ ноутбука/телефона).
        const _today = new Date();
        const _toLocal = (utcStr) => utcHHMMToKyiv(utcStr, _today);
        const _rsLocal = _toLocal(p.rahu.start);
        const _reLocal = _toLocal(p.rahu.end);
        // v88.8.20 fix: active rerender від ПОТОЧНОГО _nh, не від p.rahu.active
        // (p.rahu.active заморожений на reference noon UTC у computePanchanga — застаріває протягом дня).
        const _isRahuNow = (_nh >= _rsH) && (_nh < _reH);
        let _rIcon, _rText, _rAdvice;
        if (_isRahuNow) {
          _rIcon = '🔴'; _rText = `${_rsLocal}–${_reLocal} зараз`;
          _rAdvice = '✗ Не починати нових операцій';
        } else if (_nh < _rsH) {
          _rIcon = '🟡'; _rText = `${_rsLocal}–${_reLocal} (буде)`;
          _rAdvice = `⏳ Уникати важливих рішень з ${_rsLocal}`;
        } else {
          _rIcon = '⚪'; _rText = `${_rsLocal}–${_reLocal} (минув)`;
          _rAdvice = '✓ Минув';
        }
        const _utcTip = `UTC: ${p.rahu.start}–${p.rahu.end}`;
        return `<td style="padding:5px 6px;font-weight:600"><span class="hint" tabindex="0" style="cursor:help" title="${_utcTip}">${_rIcon} ${_rText}<span class="hint-pop" style="white-space:pre;font-size:12px">${escapeHtml(PANCH_TIPS.rahu(p.rahu))}</span></span></td>
      <td style="padding:5px 6px;font-size:11px;color:#b0c4de">${_rAdvice}</td>`;
      })()}
    </tr>
    ${(() => {
      // v88.8.13: Yamagandam + Gulika Kaal — додаткові канонічні inauspicious windows.
      // Всі три (Rahu/Yama/Gulika) — обов'язкова канонічна triada за Surya Siddhanta.
      // UI зменшено: ті самі 3 стани (active/upcoming/past), мінімізована вага.
      // Якщо subobjects відсутні (legacy panchanga) — гасимо без exception.
      if (!p.rahu.yamagandam || !p.rahu.gulika) return '';
      const _today2 = new Date();
      const _nh2 = _today2.getUTCHours() + _today2.getUTCMinutes()/60;
      const _toLocal2 = (utcStr) => utcHHMMToKyiv(utcStr, _today2);
      const _renderWindow = (label, w, _iconColor) => {
        const _ws = w.start.split(':').map(Number);
        const _we = w.end.split(':').map(Number);
        const _wsH = _ws[0] + (_ws[1]||0)/60;
        const _weH = _we[0] + (_we[1]||0)/60;
        const _wsLocal = _toLocal2(w.start);
        const _weLocal = _toLocal2(w.end);
        // v88.8.20 fix: active rerender від ПОТОЧНОГО _nh2, не від w.active
        // (w.active заморожений у computePanchanga на reference noon UTC — застаріває).
        const _isActiveNow = (_nh2 >= _wsH) && (_nh2 < _weH);
        let _ic, _tx, _adv;
        if (_isActiveNow) { _ic = '🔴'; _tx = `${_wsLocal}–${_weLocal} зараз`; _adv = '✗ Уникати важливих справ'; }
        else if (_nh2 < _wsH) { _ic = '🟡'; _tx = `${_wsLocal}–${_weLocal}`; _adv = `⏳ З ${_wsLocal} обережно`; }
        else { _ic = '⚪'; _tx = `${_wsLocal}–${_weLocal} (минув)`; _adv = '✓ Минув'; }
        return `<tr>
          <td style="padding:5px 6px;color: var(--muted);font-size:11px">
            <span class="hint" tabindex="0" style="cursor:help;font-style:italic;border-bottom:1px dotted var(--faint)">${label}<span class="hint-pop" style="white-space:pre;font-size:12px">${escapeHtml(label === 'Yamagandam' ? 'Канонічне інаусп. вікно (Surya Siddhanta).\\nДруге за важливістю після Rahu Kalam.\\nIST canon: Sun=5, Mon=4, Tue=3, Wed=2, Thu=1, Fri=7, Sat=6.\\nUTC: ' + w.start + '–' + w.end : 'Канонічне інаусп. вікно (син Сатурна).\\nТретє після Rahu+Yama.\\nIST canon: Sun=7, Mon=6, Tue=5, Wed=4, Thu=3, Fri=2, Sat=1.\\nUTC: ' + w.start + '–' + w.end)}</span></span>
          </td>
          <td style="padding:5px 6px;font-weight:600;font-size:12px">${_ic} ${_tx}</td>
          <td style="padding:5px 6px;font-size:11px;color:#b0c4de">${_adv}</td>
        </tr>`;
      };
      return _renderWindow('Yamagandam', p.rahu.yamagandam) + _renderWindow('Gulika Kaal', p.rahu.gulika);
    })()}
  </table>`;

  // v85b: pclOnly, aiNow, panchDiscrepancy, finalDo, finalAvoid, _gNow — from state
  const totalPCL = pclOnly + aiNow.Mi;
  const topDo = finalDo.join(' · ');
  const topAv = finalAvoid.join(' · ');
  // v88.8.37-fp70: панчанга БІЛЬШЕ НЕ має власного verdict/кольору.
  // Канонічний verdict дня = PDF/Engine (Hero). Панчанга = ПОЯСНЕННЯ внеску, не картка.
  // Раніше: summaryLabel='сприятливо/обережно' + summaryColor від G_now → дублювало Hero
  // і створювало конфлікт «зелений бордюр vs червоні крапки» (Тип А аудиту 16.06).
  // Тепер: показуємо астро-внесок (Pi) як НЕЙТРАЛЬНУ метрику без verdict-слова.
  const _astroNet = isFinite(aiNow.Ai)
    ? Number(aiNow.Ai)
    : Number(aiNow.Li||0)+Number(aiNow.Mi||0)+Number(aiNow.ei||0)+Number(aiNow.Pi||0)+Number(aiNow.Di||0);
  const _astroSign = _astroNet > 0 ? '+' : '';
  const _astroLabel = _astroNet >= 1 ? 'сумарний контекст підтримує' : _astroNet <= -1 ? 'сумарний контекст тисне' : 'сумарний контекст близький до нейтрального';
  const summaryLabel = `ΣAᵢ (усі astro-фактори): ${_astroSign}${_astroNet.toFixed(1)}`;
  const summaryColor = '#9bb1dc'; // нейтральний — НЕ verdict-колір
  const _panchDiscHtml = panchDiscrepancy ? `<div style="margin-top:4px;font-size:11px;color:#ffa64d">⚠ G-індекс (noon UTC): ${panchDiscrepancy}</div>` : '';

  const summaryHtml = `
    <div class="panch-summary" style="border-top:1px solid #1e2f52;margin-top:12px;padding-top:10px">
      <span style="font-weight:700;color:${summaryColor}">${summaryLabel}</span>
      <span class="muted" style="font-size:12px;margin-left:8px">${_astroLabel}; Pᵢ=${aiNow.Pi} — лише один локальний внесок · фон зараз G=${isFinite(_gNow)?_gNow.toFixed(1):'—'} | Lᵢ=${aiNow.Li} Mᵢ=${aiNow.Mi} <span class="hint" tabindex="0" style="cursor:help;border-bottom:1px dotted var(--faint)">eᵢ=${aiNow.ei}<span class="hint-pop" style="white-space:pre;font-size:12px">${escapeHtml(aiNow.eTip)}</span></span> <span class="hint" tabindex="0" style="cursor:help;border-bottom:1px dotted var(--faint)">Pᵢ=${aiNow.Pi}<span class="hint-pop" style="white-space:pre;font-size:12px">${escapeHtml(aiNow.pTip||'')}</span></span>${aiNow.Di!==0?` <span style="color:#ff9f9f;font-weight:700" title="${escapeHtml(aiNow.diTip)}">Dᵢ=${aiNow.Di}</span>`:''}</span>
      ${_panchDiscHtml}
      <div style="margin-top:6px;font-size:13px">
        ${topDo ? `<span style="color:#63be7b">✓ </span><span style="color:#b0ccaa">${topDo}</span>` : ''}
      </div>
      <div style="margin-top:3px;font-size:13px">
        ${topAv ? `<span style="color:#ff9f9f">✗ </span><span style="color:#ccaaaa">${topAv}</span>` : ''}
      </div>
    </div>`;

  // v88.8.37-fp70: бордюр панчанги БІЛЬШЕ не фарбується за G_now — нейтральний.
  // Колір сторінки/вердикт = ТІЛЬКИ Hero (PDF/Engine). Панчанга = пояснення.
  const _panchBorderColor = '#1e2f52'; // нейтральний бордер, без verdict-семантики
  // v88.8.35-fp56-P8: guard the borderColor write — the very next block already null-checks
  // _panchCard, so this direct deref was an inconsistent crash risk when panchCard is absent
  // (simple-mode / alt layout). Render no longer throws if the card isn't in the DOM.
  const _panchCard = document.getElementById('panchCard');
  if (_panchCard) _panchCard.style.borderColor = _panchBorderColor;
  // v88.8.37-fp70: панчанга-картка БІЛЬШЕ не класифікується за G (g-* класи).
  // Прибираємо verdict-семантику кольору — картка нейтральна, це блок-пояснення.
  if (_panchCard) {
    _panchCard.classList.remove('g-tense','g-unstable','g-neutral','g-good','g-favorable');
  }

  el_('panchGrid').innerHTML = html;
  el_('panchNote').innerHTML = summaryHtml +
    '<div class="small muted" style="margin-top:6px;font-size:10px;opacity:.75">ℹ️ Формула: G = 2 − Kp + ΣAᵢ. R&D advisory.</div>';

  // v87.9: Рекомендований час — підсумковий блок знизу Панчанги (балансує висоту з personalCard)
  try {
    const bt = document.getElementById('panchBestTime');
    if (bt) {
      const slots = window._daySlots || [];
      // v88.8.9 БАГ#6 fix + v88.8.10 edge fix: фільтрую тільки майбутні + поточний слот.
      // Раніше (v88.8.9): fallback на всі slots коли future.length<2 → знову показувало
      // минулі slots о 21:00+. Тепер: якщо тільки 1 future slot — показуємо його як
      // "Рівний день" (best=worst), без fallback на минулі.
      const _nowUtcH = new Date().getUTCHours();
      const _futureSlots = slots.filter(s => {
        const _slotUtcH = parseInt(s.label, 10);
        return isFinite(_slotUtcH) && _slotUtcH + 3 > _nowUtcH; // включно з поточним
      });
      const _activeSlots = _futureSlots; // НЕ fallback — якщо все минуло, краще не показати ніж показати минуле
      if (_activeSlots.length >= 2 || _activeSlots.length === 1) {
        // Знайти найкращий (max G) та найгірший (min G) слот у actionable set
        const sorted = [..._activeSlots].sort((a,b) => b.G - a.G);
        const best = sorted[0];
        const worst = sorted[sorted.length - 1];
        // sameSlot true коли тільки 1 slot, або різниця G < 0.5
        const sameSlot = _activeSlots.length === 1 || best.label === worst.label || (best.G - worst.G) < 0.5;
        // Класифікація всього дня (всі слоти, не лише майбутні — для day average)
        const dayAvg = slots.reduce((s,x) => s + x.G, 0) / slots.length;
        const stateClass = dayAvg >= 1 ? '' : dayAvg > -1 ? 'is-neutral' : 'is-tense';
        bt.className = 'panch-best-time ' + stateClass;
        // v88.9.6x-fp245: канонічний Europe/Kyiv-офсet (kyivOffsetHoursIntAt) —
        // НЕ browser TZ. Закриває одразу дві проблеми: (1) v88.7.13 баг, де
        // getTimezoneOffset() у Kyrylo іноді повертав 0 (privacy-розширення);
        // (2) аудит fp242 п.4 — якщо Kyrylo подорожує, "Рекомендований час"
        // раніше показав би ЙОГО поточний TZ замість Києва, розходячись із
        // Панчангою/Rahu (які завжди Europe/Kyiv через todayKyivStr()).
        const _refDate = (dateUTC instanceof Date) ? dateUTC : new Date();
        const _kyivOffInt = kyivOffsetHoursIntAt(_refDate);
        const _toLocalRange = (utcLabel) => {
          const h = parseInt(utcLabel, 10);
          if (!isFinite(h)) return `${utcLabel}:00–??:00`;
          const ls = ((h + _kyivOffInt) % 24 + 24) % 24;
          const le = ((h + 3 + _kyivOffInt) % 24 + 24) % 24;
          return `${String(ls).padStart(2,'0')}:00–${String(le).padStart(2,'0')}:00`;
        };
        const _utcRange = (utcLabel) => {
          const h = parseInt(utcLabel, 10);
          if (!isFinite(h)) return `${utcLabel}:00–??:00`;
          return `${String(h).padStart(2,'0')}:00–${String((h + 3) % 24).padStart(2,'0')}:00`;
        };
        // v88.9.6x-fp248 (аудит fp247, п.4): best раніше показував ЦІЛИЙ
        // 3-годинний слот з максимальним G, навіть якщо Rahu/Yama/Gulika
        // перекривали його частину (напр. "09:00–12:00", хоча Yama почалась
        // о 11:05) — "найкращий час" виглядав ширшим, ніж він реально чистий.
        // Тепер: якщо best-слот частково заблокований — звужуємо діапазон до
        // найдовшого НЕзаблокованого сегмента.
        const _toLocalRangeH = (aH, bH) => {
          const ls = ((aH + _kyivOffInt) % 24 + 24) % 24;
          const le = ((bH + _kyivOffInt) % 24 + 24) % 24;
          const _fmtH2 = x => { const hh = Math.floor(x); let mm = Math.round((x - hh) * 60); if (mm === 60) mm = 0; return String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0'); };
          return `${_fmtH2(ls)}–${_fmtH2(le)}`;
        };
        let _bestClipNote = '', _bestClipped = null;
        try {
          const _bh = parseInt(best.label, 10);
          if (isFinite(_bh) && typeof resolveSlotDecision === 'function' && typeof getInauspiciousWindowsUTC === 'function') {
            const _bDec = resolveSlotDecision({
              slotStartH: _bh, slotEndH: _bh + 3, nowH: null,
              slotG: best.G, dayScore: null,
              windows: getInauspiciousWindowsUTC(), stormActive: false
            });
            if (_bDec.segments.length > 1) {
              const _clean = _bDec.segments.filter(s => !s.blockedNewStarts);
              if (_clean.length) {
                const _longest = _clean.reduce((a,b) => (b.bH - b.aH) > (a.bH - a.aH) ? b : a);
                const _blocked = _bDec.segments.find(s => s.blockedNewStarts);
                const _blockedName = _blocked ? _blocked.reasons.filter(r => r.startsWith('window:')).map(r => r.slice(7)).join('+') : '';
                _bestClipped = { a: _longest.aH, b: _longest.bH };
                _bestClipNote = _blockedName ? ` (без ${_blockedName})` : '';
              }
            }
          }
        } catch(_eBestClip){ window.NRDiagnostics?.record('legacy.catch.96','recoverable'); }
        const bestRange = _bestClipped ? (_toLocalRangeH(_bestClipped.a, _bestClipped.b) + _bestClipNote) : _toLocalRange(best.label);
        const worstRange = _toLocalRange(worst.label);
        const bestRangeUTC = _utcRange(best.label);
        const worstRangeUTC = _utcRange(worst.label);
        const bestG = (best.G >= 0 ? '+' : '') + best.G.toFixed(1);
        const worstG = (worst.G >= 0 ? '+' : '') + worst.G.toFixed(1);
        // fp406: positive local/raw values are factors, not a green action permission.
        const bestCls = _criticalFinalDay ? '' : (best.G > 0 ? 'is-pos' : best.G < 0 ? 'is-neg' : '');
        const worstCls = worst.G < 0 ? 'is-neg' : '';
        let html = '';
        if (sameSlot) {
          const _sameLabel = _criticalFinalDay ? 'Найменше локальне навантаження' : 'Рівний день';
          const _sameHint = _criticalFinalDay
            ? `Оперативний стан ${_finalDayDecision}: це не сприятливе вікно; лише необхідна рутина.`
            : 'Без виражених піків — витримуй рутину. Уникай імпульсних рішень.';
          html = `<div class="pbt-row">`
               + `<span class="pbt-label">${_sameLabel}</span>`
               + `<span class="pbt-value ${bestCls}">G≈${bestG}</span>`
               + `</div>`
               + `<div class="pbt-hint">${_sameHint}</div>`;
        } else {
          // v88.7.13 N1: лейбл «Уникати» з об'єктом + ховання залежно від worst.G.
          // Канон Posibnyk Part II Tab.1: «Уникати важливих дій» (завжди з об'єктом).
          // Реєстр А (внутрішньо-оперативний, узгоджений з Excel ТИЖНЕВИЙ_ПРОГНОЗ).
          //   worst.G > +0.5  → ховати рядок (зелений день — нема чого «уникати»)
          //   worst.G ∈ (-0.5, +0.5] → «Менш сприятливий час» (нейтрально, без алармізму)
          //   worst.G ≤ -0.5  → «Уникати важливих рішень» (Posibnyk-канон)
          let _worstLabel = '';
          let _showWorst = true;
          if (worst.G > 0.5) {
            _showWorst = false;
          } else if (worst.G > -0.5) {
            _worstLabel = 'Менш сприятливий час';
          } else {
            _worstLabel = 'Уникати важливих рішень';
          }
          // v88.9.08-fp189: дзеркально до worst-лейбла (v88.7.13 N1) — best-лейбл
          // завжди писав «Найкращий час», навіть коли ВСІ слоти від'ємні (14.07:
          // best=-2.1 «найкращий» поруч із «уникати 12:00-15:00» у Плані дня).
          //   best.G ≥ +0.5 → «Найкращий час»
          //   best.G ∈ (-0.5, +0.5) → «Відносно кращий час»
          //   best.G ≤ -0.5 → «Найменш ризиковий час (весь день у мінусі)»
          const _bestLabelPbt = _criticalFinalDay ? 'Найменше локальне навантаження'
                              : best.G >= 0.5 ? 'Найкращий час'
                              : best.G > -0.5 ? 'Відносно кращий час'
                              : 'Найменш ризиковий час';
          const _bestSuffix = _criticalFinalDay
            ? ` <span style="color:#ff9f9f;font-size:9px">· оперативний стан ${_finalDayDecision}: лише рутина</span>`
            : best.G <= -0.5 ? ' <span style="color:#ffaa33;font-size:9px">· весь день у мінусі</span>' : '';
          html = `<div class="pbt-row">`
               + `<span class="pbt-label">${_bestLabelPbt}</span>`
               + `<span class="pbt-value ${bestCls}" title="UTC: ${bestRangeUTC}. G_day raw — continuous фон доби (2 − Kp_day + ΣAᵢ). НЕ PDF/Engine reference.">${bestRange} · G_day raw=${bestG}${_bestSuffix} <span style="color:var(--faint);font-size:9px">· не PDF/Engine</span></span>`
               + `</div>`;
          if (_showWorst) {
            html += `<div class="pbt-row">`
                 + `<span class="pbt-label">${_worstLabel}</span>`
                 + `<span class="pbt-value ${worstCls}" title="UTC: ${worstRangeUTC}. G_day raw — continuous фон доби. НЕ PDF/Engine експертний verdict.">${worstRange} · G_day raw=${worstG} <span style="color:var(--faint);font-size:9px">· не PDF/Engine</span></span>`
                 + `</div>`;
          }
        }
        // v88.8.1: hint про поточний Choghadiya — інтеграція 5 angas + muhurta shastra.
        // Геомагнітний G і Vedic Choghadiya — РІЗНІ шари. Користувач отримує обидва.
        // v88.8.3: + "наступний сприятливий" — actionable info для планування.
        try {
          const _sr = _calcSunRiseSet(dateUTC);
          if(_sr){
            const _chog = _calcChoghadiya(dateUTC, _sr.sunrise, _sr.sunset);
            if(_chog){
              const _now = new Date();
              const _all = [..._chog.day, ..._chog.night];
              const _cur = _all.find(s => _now >= s.start && _now < s.end);
              if(_cur){
                const _scoreColor = _cur.score >= 1 ? '#7be88a' : _cur.score === 0 ? 'var(--text2)' : '#e89c7b';
                html += `<div class="pbt-row" style="margin-top:4px;padding-top:4px;border-top:1px dashed rgba(255,255,255,.08);font-size:11px">`
                     + `<span class="pbt-label" style="font-size:10px;color:var(--faint)">Чогхадія зараз</span>`
                     + `<span style="color:${_scoreColor}" title="${_cur.ua} — ${_cur.hint}. До ${_fmtLocalHM(_cur.end)}.">`
                     + `${_cur.icon} ${_cur.name} <span style="color:var(--faint);font-size:10px">· до ${_fmtLocalHM(_cur.end)}</span>`
                     + `</span></div>`;
                // v88.8.3: наступний сприятливий слот (Amrit/Shubh/Labh) — actionable
                if(_cur.score < 1){
                  const _nextGood = _all.find(s => s.start > _now && s.score >= 1);
                  if(_nextGood){
                    html += `<div class="pbt-row" style="font-size:11px">`
                         + `<span class="pbt-label" style="font-size:10px;color:var(--faint)">Наступне сприятливе</span>`
                         + `<span style="color:#7be88a" title="${_nextGood.ua} — ${_nextGood.hint}">`
                         + `${_nextGood.icon} ${_nextGood.name} `
                         + `<span style="color:var(--faint);font-size:10px">· з ${_fmtLocalHM(_nextGood.start)}</span>`
                         + `</span></div>`;
                  }
                }
              }
            }
          }
        } catch(e){ window.NRDiagnostics?.record('legacy.catch.97','recoverable'); }
        bt.innerHTML = html;
      } else {
        bt.innerHTML = '';
      }
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.98','recoverable'); }

  // v87.43: fill "Найближчі критичні вікна" — заповнюємо пустоту корисним контентом
  try { _renderPanchUpcoming(dateUTC); } catch(e){ window.NRDiagnostics?.record('legacy.catch.99','recoverable'); }
  // v88.8.0: Сонячний ритм — Sunrise/Sunset, Abhijit Muhurta, Choghadiya (16 muhurta).
  try { _renderSolarRhythm(dateUTC); } catch(e){ window.NRDiagnostics?.record('legacy.catch.100','recoverable'); }
  // v88.8.17: Pancha Pakshi 5 птахів visualization — заповнює empty space у Personal column
  try { _renderPanchaPakshi(dateUTC); } catch(e){ window.NRDiagnostics?.record('legacy.catch.101','recoverable'); }
  // v88.8.17: tick — оновлюємо Sun Rhythm статуси (Brahma/Vijaya/Godhuli/Nishita/Abhijit)
  // кожну хвилину. Без цього: статус 'буде/минув' застарілий між data refreshes.
  // Скрін v88.8.16 17:10 показав Vijaya 🟡 хоча end 16:28 < now 17:10 → має бути ⚪.
  if (window._sunRhythmTickTimer) clearInterval(window._sunRhythmTickTimer);
  window._sunRhythmTickTimer = setInterval(function() {
    try { _renderSolarRhythm(dateUTC); } catch(_e){ window.NRDiagnostics?.record('legacy.catch.102','recoverable'); }
  }, 60000); // 1 раз/хвилину достатньо для muhurta granularity
}/* NR_FN_END 191 */

/* NR_FN_BEGIN 192 */function _renderPanchUpcoming(refDateUTC){
  const wrap = document.getElementById('panchUpcomingEvents');
  const list = document.getElementById('panchUpcomingList');
  if(!wrap || !list) return;

  const items = [];
  const today = refDateUTC || new Date(todayKyivStr()+'T12:00:00Z');
  const todayMs = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  const daysFrom = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00Z');
    return Math.round((d.getTime() - todayMs) / 86400000);
  };
  const relTxt = (n) => {
    if(n < 0) return `${n} дн.`;
    if(n === 0) return 'сьогодні';
    if(n === 1) return 'завтра';
    return `+${n} дн.`;
  };

  // 1. 3-day Pᵢ середнє — панчанга тренд
  try {
    if(typeof last3D !== 'undefined' && last3D && last3D.days && last3D.days.length >= 2){
      let sum = 0, n = 0;
      last3D.days.forEach(d => {
        try {
          const ai = computeAi(sunriseUTC(d.date), 0);
          if(isFinite(ai.Pi)){ sum += ai.Pi; n++; }
        } catch(e){ globalThis.NRDiagnostics?.record('catch.134','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
      });
      if(n >= 2){
        const avg = sum / n;
        const sgn = avg >= 0 ? '+' : '';
        const cls = avg >= 0.3 ? 'ok' : avg <= -0.3 ? 'bad' : 'neu';
        items.push({
          icon: '📈',
          label: '3-day Pᵢ середнє',
          when: '',
          rel: '',
          note: `${sgn}${avg.toFixed(1)} (${avg >= 0.3 ? 'панчанга підтримує' : avg <= -0.3 ? 'панчанга заважає' : 'панчанга нейтральна'})`,
          cls,
          // v88.7.13 N4: tooltip — пояснення формули та порогів класифікації
          tip: 'Середнє арифметичне Pᵢ за наступні 3 дні (включно з сьогодні).\nPᵢ = (Tithi×lunar_mod + Vara + Nakshatra + Yoga + Karana) × PCL_SCALE,\nPCL_SCALE = 0.4 має статус R&D/advisory і ще не підтверджений prospective-вибіркою.\nВиключення: tіхі 11 (Ekadashi), 15 (Purnima), 26 (Krishna Ekadashi), 30 (Amavasya)\n  → обробляються в eᵢ (events), не в Pᵢ.\nКласифікація 3-day середнього:\n  ≥ +0.3 — «панчанга підтримує»\n  ≤ -0.3 — «панчанга заважає»\n  інше    — «нейтральна»\nДжерело: live sunrise reference (astronomy-engine), не frozen engine_scores.'
        });
      }
    }
  } catch(e){ globalThis.NRDiagnostics?.record('catch.135','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  // 2. v87.44: Vaisnava-події з BUILTIN_VAISNAVA (Ekadasi/Amavasya/Purnima)
  //    Сканую 60 днів вперед — перша кожного типу
  try {
    if(typeof BUILTIN_VAISNAVA !== 'undefined' && Array.isArray(BUILTIN_VAISNAVA)){
      const found = { ekad: false, ama: false, purn: false };
      // Purnima is a lunar tithi, not a Vaisnava festival-name match.
      // Derive it from the same canonical Panchanga calculation used elsewhere.
      for(let pd = 0; pd <= 35 && !found.purn; pd++){
        const pDate = new Date(todayMs + pd * 86400000 + 12 * 3600000);
        const pCalc = computePanchanga(pDate);
        if(pCalc && pCalc.tithi && pCalc.tithi.num === 15){
          const pKey = pDate.toISOString().slice(0,10);
          items.push({
            icon: '🌕',
            label: 'Пурніма (Tithi 15 · розрахунок)',
            when: pKey,
            rel: relTxt(pd),
            note: 'Lᵢ = 0, нейтрально · не дата свята',
            cls: 'neu'
          });
          found.purn = true;
        }
      }
      const sorted = BUILTIN_VAISNAVA.slice().sort((a,b) => a.d.localeCompare(b.d));
      for(const ev of sorted){
        const dd = daysFrom(ev.d);
        if(dd < 0) continue;
        if(dd > 60) break;
        const s = ev.s.toLowerCase();
        if(!found.ekad && /ekadasi|ekādaśī|ekadashi/i.test(ev.s) && !/break fast/i.test(ev.s)){
          items.push({
            icon: '🕉',
            label: 'Екадаші (11-й тіхі)',
            when: ev.d,
            rel: relTxt(dd),
            note: 'eᵢ = −2, день відречення',
            cls: 'warn'
          });
          found.ekad = true;
        }
        if(!found.ama && /\bamavasya\b/i.test(ev.s)){
          items.push({
            icon: '🌑',
            label: 'Амавасья (новий місяць)',
            when: ev.d,
            rel: relTxt(dd),
            note: 'Mᵢ = −3, високий ризик',
            cls: 'bad'
          });
          found.ama = true;
        }
        if(found.ekad && found.ama && found.purn) break;
      }
    }
  } catch(e){ globalThis.NRDiagnostics?.record('catch.136','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  // 3. v87.44: Найближча Vishti Karana (7-а рухома) — скан 14 днів
  try {
    for(let dd = 0; dd <= 14; dd++){
      const d = new Date(todayMs + dd * 86400000);
      const p = computePanchanga(d);
      if(p && p.karana && p.karana.isVishti){
        items.push({
          icon: '⛔',
          label: 'Vishti (Bhadra) Karana',
          when: d.toISOString().slice(0,10),
          rel: relTxt(dd),
          note: 'важливі справи відкласти',
          cls: 'warn'
        });
        break;
      }
    }
  } catch(e){ globalThis.NRDiagnostics?.record('catch.137','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  // 4. v87.44+v87.45: Поточна Nakshatra + орієнтовна зміна
  //    v87.45 fix: computePanchanga повертає nakshatra.num (1-based), не .idx
  try {
    const pNow = computePanchanga(today);
    if(pNow && pNow.nakshatra){
      // Зміна Nakshatra відбувається коли Місяць проходить 13°20' sidereal.
      // Середня швидкість ~13.18°/доба → ~1 Nakshatra / доба.
      // Шукаю наступні 48 год, коли num зміниться.
      const curNum = pNow.nakshatra.num;
      let shiftHrs = null;
      for(let h = 1; h <= 48; h++){
        const t = new Date(today.getTime() + h * 3600000);
        const p2 = computePanchanga(t);
        if(p2 && p2.nakshatra && p2.nakshatra.num !== curNum){
          shiftHrs = h;
          // Взяти наступну Nakshatra
          const nextNakName = p2.nakshatra.name;
          const hrs = Math.floor(shiftHrs);
          const hrsTxt = hrs < 1 ? '<1г' : hrs < 24 ? `${hrs}г` : `${Math.round(hrs/24)}д`;
          items.push({
            icon: '✨',
            label: `Накшатра: ${pNow.nakshatra.name}`,
            when: '',
            rel: '',
            note: `→ ${nextNakName} через ${hrsTxt}`,
            cls: 'neu'
          });
          break;
        }
      }
    }
  } catch(e){ globalThis.NRDiagnostics?.record('catch.138','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  if(!items.length){ wrap.style.display = 'none'; return; }

  const colorFor = cls =>
    cls === 'bad' ? '#ff8a7a'
    : cls === 'warn' ? '#ffb870'
    : cls === 'ok' ? '#8ce0b0'
    : '#b7c7ea';

  const html = items.map(it => {
    const whenBlock = it.rel
      ? `<span style="color:var(--faint);font-size:10px;white-space:nowrap;margin-left:4px">${it.when}${it.when ? ' · ' : ''}${it.rel}</span>`
      : '';
    // v88.7.13 N4: опційний tooltip на item якщо .tip заповнено (поки використовується для 3-day Pᵢ)
    const _titleAttr = it.tip ? ` title="${escapeHtml(it.tip)}"` : '';
    const _cursor = it.tip ? ';cursor:help' : '';
    return `<div${_titleAttr} style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px dashed rgba(139,160,200,.12)${_cursor}">`
      + `<span style="font-size:14px;flex-shrink:0">${it.icon}</span>`
      + `<span style="color:${colorFor(it.cls)};font-weight:500;flex-shrink:0">${it.label}</span>`
      + whenBlock
      + `<span style="color:var(--dim);font-size:11px;margin-left:auto;text-align:right">${it.note}</span>`
      + `</div>`;
  }).join('');

  list.innerHTML = html;
  wrap.style.display = 'block';
}/* NR_FN_END 192 */

/* NR_FN_BEGIN 199 */function _renderPanchaPakshi(refDateUTC){
  const wrap = document.getElementById('panchaPakshiBlock');
  const elBirds = document.getElementById('panchaPakshiBirds');
  const elActive = document.getElementById('panchaPakshiActive');
  if(!wrap || !elBirds || !elActive) return;

  // Отримати поточну nakshatra
  let panch;
  try { panch = computePanchanga(refDateUTC || new Date()); } catch(e) { globalThis.NRDiagnostics?.record('catch.141','recoverable');  wrap.style.display='none'; return; }
  if(!panch || !panch.nakshatra || !panch.nakshatra.panchaPakshi) {
    wrap.style.display = 'none';
    return;
  }
  const activeId = panch.nakshatra.panchaPakshi.birdId;

  // Birds metadata: emoji, color, name
  const BIRDS_META = [
    { emoji: '🦅', name: 'Гриф',   color: '#d4a574' }, // Vulture
    { emoji: '🦉', name: 'Сова',   color: '#a89668' }, // Owl
    { emoji: '🐦‍⬛', name: 'Ворона', color: '#8090a0' }, // Crow
    { emoji: '🐓', name: 'Півень', color: '#e89a4d' }, // Cock
    { emoji: '🦚', name: 'Павич',  color: '#5fa8d3' }  // Peacock
  ];

  // Render 5 birds
  elBirds.innerHTML = BIRDS_META.map((b, i) => {
    const isActive = i === activeId;
    const opacity = isActive ? '1' : '0.35';
    const transform = isActive ? 'scale(1.35)' : 'scale(1)';
    const fontSize = isActive ? '36px' : '24px';
    const filter = isActive ? `drop-shadow(0 0 8px ${b.color}AA)` : 'none';
    const labelColor = isActive ? b.color : 'var(--faint)';
    const labelWeight = isActive ? '700' : '400';
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;transition:all .3s ease;opacity:${opacity};transform:${transform};filter:${filter}" title="${b.name}">
      <span style="font-size:${fontSize};line-height:1">${b.emoji}</span>
      <span style="font-size:9px;color:${labelColor};font-weight:${labelWeight};letter-spacing:.04em">${b.name}</span>
    </div>`;
  }).join('');

  // Active bird quality + qualities
  const activeBird = BIRDS_META[activeId];
  const quality = panch.nakshatra.panchaPakshi.quality;
  const nakName = panch.nakshatra.name;
  // v88.8.41-fp102: 5-STATE ACTIVITY ENGINE — реальний практичний сигнал.
  // ДЖЕРЕЛО: Pulippani Ch.2-3 (archive.org, див. PANCHA_PAKSHI_SOURCE.md).
  // R&D-наближення: точна 100-таблична схема автора недоступна в OCR,
  // activity-цикл: точна формула Bright Half (верифіковано зі сканів), Dark Half — та сама формула, R&D.
  let _ppActivityLine = '';
  try {
    // v88.8.99-fp180: BUG FOUND — this used `refDateUTC` (the day's fixed
    // noon-UTC reference, same as panchDate "~12:00 UTC"), NOT the actual
    // live moment. Result: the displayed "current phase" time window
    // (e.g. "02:01-05:14 UTC") never matched the real current time shown
    // elsewhere on the dashboard (Kyrylo caught this 2026-07-13 comparing
    // it against the personal natal-bird card, which correctly uses
    // new Date()). The bird-of-the-day itself (nakshatra->bird, computed
    // above via panch/refDateUTC) is correctly day-referenced and left
    // untouched — only the "what phase is it RIGHT NOW" line needs the
    // real clock time.
    const _now = new Date();
    const _wd = _now.getDay();
    let _sr = null, _ss = null;
    try {
      const _solar = (typeof _calcSunRiseSet === 'function') ? _calcSunRiseSet(_now) : null;
      if (_solar && _solar.sunrise && _solar.sunset) { _sr = _solar.sunrise; _ss = _solar.sunset; }
    } catch(e){ window.NRDiagnostics?.record('legacy.catch.103','recoverable'); }
    if (_sr && _ss) {
      const _yama = getCurrentYama(_now, _sr, _ss);
      // v88.8.51-fp128 BUGFIX: раніше isShukla не передавався → завжди verified=true,
      // навіть у Dark Half (де формула насправді ще не звірена зі сканів книги).
      const _isShuklaNow = (typeof GIndexPPProfile !== 'undefined' && typeof GIndexPPProfile.pakshaFromDate === 'function')
        ? GIndexPPProfile.pakshaFromDate(_now) : true;
      const _act = getPakshiActivityForYama(activeId, _yama.yamaIdx, _wd, _yama.isDay, _isShuklaNow);
      const _actCol = _act.strength >= 3 ? '#7ee787' : _act.strength <= 1 ? '#ff9999' : 'var(--dim)';
      const _hhmm = (d) => d.toISOString().slice(11,16);
      const _unverifiedTag = _act.verified === false ? ' <span style="color:var(--warn)" title="Dark Half — формула тимчасова, не звірена зі сканів книги">⚠</span>' : '';
      _ppActivityLine = `<div style="margin-top:4px;font-size:10px;color:${_actCol}">→ Фаза: <strong>${_act.activityUa}</strong>${_unverifiedTag} (${_hhmm(_yama.yamaStart)}–${_hhmm(_yama.yamaEnd)} UTC) · ${_act.advice}</div>`;
    }
    // v88.8.51-fp128: міст до персонального блоку — якщо профіль збережений, показати підказку тут
    try {
      if (typeof GIndexPPProfile !== 'undefined') {
        const _prof = GIndexPPProfile.loadSlot(GIndexPPProfile.currentSlot || 0);
        if (_prof && _prof.date) {
          const _bd = new Date(`${_prof.date}T${_prof.time || '12:00'}:00`);
          if (isFinite(_bd.getTime())) {
            const _pNak = GIndexPPProfile.nakshatraFromDate(_bd);
            const _pShukla = GIndexPPProfile.pakshaFromDate(_bd);
            const _pBird = GIndexPPProfile.birdFromNakshatra(_pNak, _pShukla);
            _ppActivityLine += `<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(155,177,220,.12);font-size:10px;color:var(--faint)">👤 Твій натальний птах: <strong style="color:var(--accent)">${GIndexPPProfile.ICONS[_pBird]} ${GIndexPPProfile.NAMES_UA[_pBird]}</strong> — деталі в блоці нижче</div>`;
          }
        }
      }
    } catch(e){ window.NRDiagnostics?.record('legacy.catch.104','recoverable'); }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.105','recoverable'); }
  let _ppDisclaimer = '';
  try {
    const _eToday = (typeof getEngineScore === 'function') ? getEngineScore(refDateUTC || new Date()) : null;
    const _eVal = (_eToday && isFinite(_eToday.eng)) ? Number(_eToday.eng) : null;
    if (_eVal !== null && _eVal <= -2) {
      _ppDisclaimer = `<div style="margin-top:6px;padding:4px 6px;border-radius:4px;background:rgba(255,107,107,.08);border:1px solid rgba(255,107,107,.25);font-size:9px;color:#ffaa99;font-style:italic;text-align:center;line-height:1.35">⚠ R&D-наближення (не canonical Pulippani таблиця). PDF/Engine reference ${_eVal} обмежує ризик; оперативний стан у Hero має пріоритет.</div>`;
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.106','recoverable'); }
  elActive.innerHTML = `<span style="color:${activeBird.color};font-weight:700">${activeBird.emoji} ${activeBird.name}</span> · через <em style="color:var(--text2)">${nakName}</em><br><span style="color:var(--dim);font-size:10px;font-style:italic">${quality}</span>${_ppActivityLine}${_ppDisclaimer}`;
}/* NR_FN_END 199 */

/* NR_FN_BEGIN 200 */function _renderSolarRhythm(refDateUTC){
  const wrap = document.getElementById('panchSolarRhythm');
  const elTimes = document.getElementById('panchSolarTimes');
  const elAbh = document.getElementById('panchAbhijit');
  const elChog = document.getElementById('panchChoghadiya');
  if(!wrap || !elTimes || !elAbh || !elChog) return;

  const date = refDateUTC || new Date();
  const sr = _calcSunRiseSet(date);
  if(!sr){
    wrap.style.display = 'none';
    return;
  }
  const { sunrise, sunset } = sr;
  // Solar noon
  const solarNoonMs = (sunrise.getTime() + sunset.getTime()) / 2;
  const solarNoon = new Date(solarNoonMs);
  const dayLengthMin = Math.round((sunset.getTime() - sunrise.getTime()) / 60000);
  const dayLenH = Math.floor(dayLengthMin / 60);
  const dayLenM = dayLengthMin % 60;

  // v88.8.18: sound notification — sunrise event (within ±60s window).
  // Track як boolean "currently in sunrise minute" — fires once при transition false→true.
  if (window.GIndexSound) {
    const _now = Date.now();
    const _sr = sunrise.getTime();
    const _inSunriseWindow = (_now >= _sr - 60000 && _now <= _sr + 60000);
    window.GIndexSound._track('sunrise', _inSunriseWindow);
  }

  // 1. Sunrise/Sunset/Solar Noon
  elTimes.innerHTML = `
    <span title="Місцевий схід Сонця (geo: ${_userLat.toFixed(2)}°, ${_userLon.toFixed(2)}°)">
      <span style="color:#ffce54;font-weight:700">↑</span> Схід <strong>${_fmtLocalHM(sunrise)}</strong>
    </span>
    <span title="Місцевий захід Сонця">
      <span style="color:#ff7e54;font-weight:700">↓</span> Захід <strong>${_fmtLocalHM(sunset)}</strong>
    </span>
    <span style="color:var(--dim)" title="Solar noon = (Схід + Захід) / 2">
      ☀ Полудень <strong>${_fmtLocalHM(solarNoon)}</strong>
    </span>
    <span style="color:var(--faint);font-size:11px" title="Тривалість світлового дня">
      (день ${dayLenH}г ${String(dayLenM).padStart(2,'0')}хв)
    </span>
  `;

  // v88.8.1: 1b. Sun/Moon Rashi (sidereal Vedic знак)
  try {
    const rashis = _calcRashis(date);
    if(rashis){
      const elRashis = document.getElementById('panchRashis');
      if(elRashis){
        elRashis.innerHTML = `
          <span title="Surya Rashi — поточний sidereal знак Сонця (Lahiri ayanamsha). Сонце міняє знак раз на ~30 днів.">
            <span style="color:#ffce54">☉ Сонце</span>
            у <strong>${rashis.sun.ua}</strong>
            <span style="color:var(--faint);font-size:10px">(${rashis.sun.skr}, ${rashis.sun.deg.toFixed(1)}°, регент: ${rashis.sun.lord})</span>
          </span>
          <span title="Chandra Rashi — поточний sidereal знак Місяця. Міняється кожні ~2.5 дні. Базис для janma rashi і muhurta.">
            <span style="color: var(--muted)">☽ Місяць</span>
            у <strong>${rashis.moon.ua}</strong>
            <span style="color:var(--faint);font-size:10px">(${rashis.moon.skr}, ${rashis.moon.deg.toFixed(1)}°, регент: ${rashis.moon.lord})</span>
          </span>
        `;
      }
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.107','recoverable'); }

  // 2. Abhijit Muhurta
  const abh = _calcAbhijit(sunrise, sunset);
  if(abh){
    const now = new Date();
    const isNow = now >= abh.start && now < abh.end;
    const isPast = now >= abh.end;
    const isTue = abh.isTuesday;
    // v88.8.18: sound notification — Abhijit transition (false → true). Skip Tuesday (canon: Abhijit неактивний).
    if (window.GIndexSound && !isTue) window.GIndexSound._track('abhijit', isNow);
    const tueNote = isTue ? ' <span style="color:var(--warn);font-size:10px">(вівторок — Abhijit неактивний за BPHS)</span>' : '';
    const status = isTue ? '⚠' : (isNow ? '🟢 зараз' : (isPast ? '✓ минула' : '⏳ ще буде'));
    const color = isTue ? 'var(--warn)' : (isNow ? 'var(--ok)' : (isPast ? 'var(--dim)' : '#ffce54'));
    elAbh.innerHTML = `
      <span title="Abhijit Muhurta = solar noon ± 24хв. Універсально-сприятливе вікно дня (за BPHS, окрім вівторка). Ідеально для важливих рішень, переговорів, запусків.">
        <span style="color:${color};font-weight:700">⏱ Абгіджит-мухурта</span>
        <strong>${_fmtLocalHM(abh.start)}–${_fmtLocalHM(abh.end)}</strong>
        <span style="color:${color};font-size:11px">· ${status}</span>${tueNote}
      </span>
    `;
  } else {
    elAbh.innerHTML = '';
  }

  // v88.8.14: 2b. Auspicious Muhurta block (Brahma/Vijaya/Godhuli/Nishita)
  // Виклик з nextSunrise (наступний день) для точного Nishita.
  try {
    const elAusp = document.getElementById('panchAuspiciousMuhurta');
    if (elAusp) {
      // Наступний sunrise через _calcSunRiseSet(date+1d)
      const nextDay = new Date(date.getTime() + 24*3600*1000);
      let nextSunrise = null;
      try { const nsr = _calcSunRiseSet(nextDay); if(nsr) nextSunrise = nsr.sunrise; } catch(_e){ window.NRDiagnostics?.record('legacy.catch.108','recoverable'); }
      const ausp = _calcAuspiciousMuhurtas(sunrise, sunset, nextSunrise);
      if (ausp) {
        const now = new Date();
        const _renderAuspBlock = (label, w, hint, eventKey) => {
          const isNow = now >= w.start && now < w.end;
          const isPast = now >= w.end;
          // v88.8.18: sound notification — track muhurta activation (false → true).
          if (eventKey && window.GIndexSound) window.GIndexSound._track(eventKey, isNow);
          const status = isNow ? '🟢' : isPast ? '⚪' : '🟡';
          const color = isNow ? 'var(--ok)' : isPast ? 'var(--dim)' : '#ffce54';
          const opacity = isPast ? '0.55' : '1';
          return `<span title="${escapeHtml(hint)}" style="display:inline-flex;gap:4px;align-items:center;opacity:${opacity}">
            <span style="color:${color};font-weight:600">${status} ${label}</span>
            <strong style="color:var(--text2)">${_fmtLocalHM(w.start)}–${_fmtLocalHM(w.end)}</strong>
          </span>`;
        };
        elAusp.innerHTML = [
          _renderAuspBlock('Brahma', ausp.brahma,
            'Brahma Muhurta = 2 muhurta до сходу (~96-48 хв до sunrise). Канон BPHS — найкращий час для духовних практик, медитації, навчання.',
            'brahma'),
          _renderAuspBlock('Vijaya', ausp.vijaya,
            'Vijaya Muhurta = 11-та з 15 muhurta дня. Канон Drik Panchang — "час перемоги": успіх у складних задачах, переговори, дебати.'),
          _renderAuspBlock('Godhuli', ausp.godhuli,
            'Godhuli Muhurta = sunset ± 0.5 muhurta. "Час повернення корови" — gentle transitions, вечірні молитви, зосередження.'),
          _renderAuspBlock('Nishita', ausp.nishita,
            'Nishita Muhurta = 8-ма з 15 night muhurta (північна). Канон BPHS — meditation, midnight rituals, deep contemplation.')
        ].join('');
      }
    }
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.109','recoverable'); }

  // 3. Choghadiya
  const chog = _calcChoghadiya(date, sunrise, sunset);
  if(chog){
    const now = new Date();
    const renderRow = (slot, idx, half) => {
      const isNow = now >= slot.start && now < slot.end;
      const isPast = now >= slot.end;
      const colorMap = {
        2:'#7be88a',  1:'#a8d97a',  0:'var(--text2)',
        '-1':'#e89c7b','-2':'#ff7b7b'
      };
      const c = colorMap[slot.score] ?? 'var(--text2)';
      const opacity = isPast ? '0.42' : '1';
      const bg = isNow ? 'rgba(123,232,138,.10)' : 'transparent';
      const scoreStr = `PCL ${slot.score > 0 ? '+' : ''}${slot.score}`;
      const nowMark = isNow ? `<span style="color:var(--ok);font-weight:700;margin-left:4px">◄ поточний слот · ${scoreStr}</span>` : '';
      return `<div style="display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:4px;background:${bg};opacity:${opacity}" title="${slot.ua} — ${slot.hint} (${scoreStr})">
        <span style="color:var(--faint);font-size:10px;width:14px;text-align:right">${idx+1}</span>
        <span style="color:var(--faint);font-size:10px;width:78px">${_fmtLocalHM(slot.start)}–${_fmtLocalHM(slot.end)}</span>
        <span style="color:${c};font-weight:600;width:60px">${slot.name}</span>
        <span style="color:${c};font-size:10px;width:32px">${slot.icon}</span>
        <span style="color:var(--dim);font-size:10px">${slot.hint}${nowMark}</span>
      </div>`;
    };
    // v88.8.41-fp103: явний поточний слот з PCL-числом — раніше Choghadiya показувала
    // колір/timeline, але не explicit число (на відміну від Hora "PCL +X").
    // ⚠ FREEZE COMPLIANCE: ADVISORY DISPLAY ONLY. _curSlot.score НЕ передається
    // в computeAi()/G/Pᵢ. Джерело score: _CHOG_META (вже існувало до fp103,
    // тут лише виведено explicit число в UI, логіка розрахунку не змінена).
    let _chogNowLine = '';
    try {
      const _allSlots = [...chog.day, ...chog.night];
      const _curSlot = _allSlots.find(s => now >= s.start && now < s.end);
      if (_curSlot) {
        const _ccol = _curSlot.score > 0.3 ? '#7ee787' : _curSlot.score < -0.3 ? '#ff9999' : 'var(--dim)';
        const _csign = _curSlot.score > 0 ? '+' : '';
        _chogNowLine = `<div style="margin-bottom:6px;padding:4px 6px;border-radius:4px;background:rgba(255,255,255,.03);font-size:11px">Зараз: <strong style="color:${_ccol}">${_curSlot.ua} (${_curSlot.name})</strong> <span style="color:${_ccol};font-weight:700">${_csign}${_curSlot.score} PCL-preview</span> <span style="font-size:9px;color:var(--faint)" title="Advisory display only — НЕ входить у canonical G/Pᵢ/final_score">(не в G)</span> · до ${_fmtLocalHM(_curSlot.end)} — ${_curSlot.hint}</div>`;
      }
    } catch(e){ window.NRDiagnostics?.record('legacy.catch.110','recoverable'); }
    elChog.innerHTML = `
      ${_chogNowLine}
      <div style="font-size:10px;color:var(--faint);margin-bottom:4px;letter-spacing:0.04em">☀ ДЕНЬ (${_fmtLocalHM(sunrise)} → ${_fmtLocalHM(sunset)})</div>
      ${chog.day.map((s,i) => renderRow(s, i, 'day')).join('')}
      <div style="font-size:10px;color:var(--faint);margin:8px 0 4px;letter-spacing:0.04em">🌙 НІЧ (${_fmtLocalHM(sunset)} → +наступн. схід)</div>
      ${chog.night.map((s,i) => renderRow(s, i, 'night')).join('')}
    `;
  } else {
    elChog.innerHTML = '<span class="muted">Choghadiya недоступна без sunrise/sunset.</span>';
  }

  wrap.style.display = 'block';
}/* NR_FN_END 200 */

/* NR_FN_BEGIN 201 */function renderPanchanga(dateUTC){
  const state = computePanchangaState(dateUTC);
  _lastPanchCtx = state.ctx;
  // fp429 D3: cached Panchanga may survive a Europe/Kyiv midnight boundary.
  // Bind the cache to the day for which it was rendered before it can be used
  // as a fallback by the operational timing-window resolver.
  if (_lastPanchCtx) {_lastPanchCtx._kyivDateKey = todayKyivStr();_lastPanchCtx._geoKey=String(_userLat)+','+String(_userLon);}
  // v85b-F4: expose raw panchanga total (ns+ts+ys+ks+rahu) for verdict sync
  if (_lastPanchCtx) _lastPanchCtx.pclTotal = state.pclOnly;
  renderPanchangaCard(state);
  // v88.7.16: re-render hero Astro chip ПІСЛЯ оновлення _lastPanchCtx.
  // Раніше: chip рендерився після loadEngineScores (init), коли _lastPanchCtx міг бути
  // null або stale. На boundary днях (~46% часу) chip показував frozen engine tithi
  // замість live (наприклад: chip "Saptami K" + картка "Ashtami K" одночасно).
  // Тепер: chip оновлюється на КОЖЕН renderPanchanga → синхронізація гарантована.
  try { if (typeof renderHeroAstroLayer === 'function') renderHeroAstroLayer(); }
  catch(e){ window.NRDiagnostics?.record('legacy.catch.111','recoverable'); }
}/* NR_FN_END 201 */

/* NR_FN_BEGIN 202 */function renderDayForecast(last3D, kUse, ai) {
  const todayStr = todayKyivStr();
  const todayRow = last3D && Array.isArray(last3D.days)
    ? last3D.days.find(d => fmtDate(d.date) === todayStr) : null;
  const useRow = todayRow;
  window._daySlots = [];
  if (!useRow || !useRow.kp8 || !useRow.kp8.length || useRow._filledFrom || useRow._fromFutureKp || useRow._synthetic) return;
  const kp8 = useRow.kp8;
  const todayNoon = sunriseUTC(useRow.date);
  const slotLabels = ['00','03','06','09','12','15','18','21'];
  window._daySlots = [];
  for (let i = 0; i < kp8.length; i++) {
    const kp = kp8[i];
    if (!Number.isFinite(kp)) continue;
    const aiSlot = computeAi(todayNoon, kp);
    const G = kpDayTerm(kp) + aiSlot.Ai;
    window._daySlots.push({ i, kp, G, label: slotLabels[i] || String(i*3) });
  }
  // v87.9: якщо Панчанга вже рендерена раніше — оновити panchBestTime з новими slots
  try {
    if (document.getElementById('panchBestTime') && typeof _lastPanchCtx !== 'undefined' && _lastPanchCtx) {
      renderPanchanga(sunriseUTC(new Date(todayKyivStr()+'T12:00:00Z')));
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.112','recoverable'); }
  // fp24: heat strip must re-render from same _daySlots as panchBestTime — avoids stale data-gval mismatch
  try { if (typeof renderHeatStripV86 === 'function') renderHeatStripV86(); } catch(e){ window.NRDiagnostics?.record('legacy.catch.113','recoverable'); }
}/* NR_FN_END 202 */

/* NR_FN_BEGIN 204 */function render3Day(parsed3){
  parsed3 = (parsed3 && typeof parsed3 === 'object') ? parsed3 : {days:[]};
  let days = Array.isArray(parsed3.days) ? parsed3.days : [];
  // fp333: one atomic 3-day state. A late empty CORS/UAF result must not
  // overwrite a valid table while leaving already-rendered quick cards on screen.
  if(!days.length && window.__lastValid3DayRender &&
      Array.isArray(window.__lastValid3DayRender.days) &&
      window.__lastValid3DayRender.days.length){
    parsed3 = window.__lastValid3DayRender;
    days = parsed3.days;
  }
  if(!days.length){
    const empty3d = '<span class="muted">Немає даних у 3-добовому продукті.</span>';
    el('threeContent').innerHTML = empty3d;
    const quick3d = document.getElementById('threeQuick');
    if(quick3d) quick3d.innerHTML = '';
    return;
  }
  window.__lastValid3DayRender = parsed3;
  const hdr = parsed3._partialReal
    ? `<div style="margin-bottom:4px;font-size:11px;color:#fca474">⚠ Прогноз частково недоступний — позначені дні оцінено за поточним Kp; це не прогноз NOAA</div>`
    : parsed3._synthetic
    ? `<div style="margin-bottom:4px;font-size:11px;color:#fca474">⚠ NOAA недоступний — розрахунок на базі поточного Kp (synthetic)</div>`
    : (parsed3.days.some(d=>d._fromFutureKp)
        ? `<div style="margin-bottom:4px;font-size:11px;color:#9bd49e">ℹ Живий NOAA недоступний — показано future_kp.json (реальний резервний прогноз, не плато)</div>`
        : (parsed3.issued ? `<div class="muted small" style="margin-bottom:4px">Прогноз NOAA: ${parsed3.issued.slice(0,10)}</div>` : ''));
  let html = hdr + '<table><thead><tr>'
    + '<th class="col-date">Дата (UTC)</th>'
    + '<th>G</th>'
    + '<th>Kp max</th>'
    + '<th>Lᵢ</th>'
    + '<th>Mᵢ</th>'
    + '<th>eᵢ</th>'
    + '<th>Pᵢ</th>'
    + '<th class="col-3d-ai">ΣAᵢ</th>'
    + '<th class="col-3d-ap">Ap (прогноз)</th>'
    + '<th class="col-hide-mobile">Kp слоти (8×3год)</th>'
    + '<th>Категорія</th>'
    + '<th class="col-hide-mobile">Зона G</th>'
    + '<th>Рекомендація</th>'
    + '</tr></thead><tbody>';

  for(const d of days){
    const apEntry = parsed3.predictedAp.find(x=> fmtDate(x.date)===fmtDate(d.date)) ?? null;
    // v52: визначаємо kpMax ПЕРЕД computeAi — щоб ai і G використовували однаковий kp
    // fp428 D-01: the 3-day rail is daily Kp_max. Current 1-minute/3-hour
    // Kp belongs only to G_now and must never replace this daily maximum.
    const kpMax = d.kpMax;
    const ai = computeAi(sunriseUTC(d.date), isFinite(kpMax) ? kpMax : null);
    const G = isFinite(kpMax) ? kpDayTerm(kpMax) + ai.Ai : NaN;
    const isToday = fmtDate(d.date) === todayKyivStr();
    const _daySig3 = (typeof resolveDaySignal_v88825 === 'function') ? resolveDaySignal_v88825(d.date, G, kpMax, {isToday}) : null;
    const G_decision = _daySig3 && isFinite(_daySig3.decisionScore) ? Number(_daySig3.decisionScore) : G;
    const displayG3 = isToday ? G_decision : G;
    const cls = isFinite(kpMax)? (kpMax>=5? 'k-bad' : (kpMax>=4? 'k-warn':'k-ok')) : 'k-ok';
    const gCls = classForG(displayG3);
    const kp = d.kp8.map(v=>isFinite(v)? v.toFixed(2) : '…').join(' | ');
    const rowStyle = displayG3 <= -2 ? 'background:rgba(255,107,107,0.08);' : '';
    const todayStyle = isToday ? 'outline:2px solid rgba(55,167,255,0.6);' : '';

    const _moonE3 = ai.phaseDeg < 22 ? '🌑' : ai.phaseDeg < 67 ? '🌒' : ai.phaseDeg < 112 ? '🌓' : ai.phaseDeg < 157 ? '🌔' : ai.phaseDeg < 202 ? '🌕' : ai.phaseDeg < 247 ? '🌖' : ai.phaseDeg < 292 ? '🌗' : ai.phaseDeg < 337 ? '🌘' : '🌑';
    const Lcell  = `<div class="mono" style="font-weight:700"><span class="hint" tabindex="0">${_moonE3}${ai.Li !== 0 ? ' '+ai.Li : ''}<span class="hint-pop">${escapeHtml(ai.lTip)}\n${ai.phaseName} (${ai.phaseDeg.toFixed(0)}°)</span></span></div>`;
    const _mUnvMark2 = ai.eclipseUnverified ? '<span style="color:#fca474;margin-left:4px" title="Тип затемнення не підтверджено NASA-каталогом">⚠</span>' : '';
    const Mcell  = `<div class="mono" style="font-weight:700"><span class="hint" tabindex="0">${ai.Mi}${_mUnvMark2}<span class="hint-pop">${escapeHtml(ai.mTip)}</span></span></div>`;
    const Ecell  = `<div class="mono" style="font-weight:700"><span class="hint" tabindex="0">${ai.ei}<span class="hint-pop">${escapeHtml(ai.eTip)}</span></span></div>`;
    const Pcell  = `<div class="mono" style="font-weight:700"><span class="hint" tabindex="0">${ai.Pi}<span class="hint-pop">${escapeHtml(ai.pTip||'')}</span></span></div>`;
    const AiCell = `<div class="mono" style="font-weight:700"><span class="hint" tabindex="0">${ai.Ai}<span class="hint-pop">${escapeHtml(ai.explain)}</span></span></div>`;

    const kpCell = isFinite(kpMax)
      ? `<span class="kbadge ${cls} hint" tabindex="0">Kp ${kpMax.toFixed(2)}${d._synthetic ? ' (оцінка)' : ''}<span class="hint-pop">${escapeHtml(kpTooltip(kpMax))}</span></span>`
      : `<span class="kbadge k-warn">…</span>`;

    const apCell = apEntry && Number.isFinite(apEntry.Ap)
      ? `<span class="hint" tabindex="0">${apEntry.Ap}<span class="hint-pop">${escapeHtml(apTooltip(apEntry.Ap,true))}</span></span>`
      : '—';

    const gTip = gTooltipText('Kp max', (isFinite(kpMax)? kpMax : NaN), ai);

    const _prob3d = calcProbabilityLayer({G:displayG3, csConf:1, horizon:'3day'});
    const _riskCell = _prob3d
      ? `<span style="font-size:12px;font-weight:700;color:var(--muted)" title="Евристична зона G; не ймовірність, score_effect=0">${escapeHtml(_prob3d.labelUA)}</span>`
      : '—';
    html += `<tr style="${rowStyle}${todayStyle}">
      <td class="mono col-date"${isToday?' style="font-weight:700;color:var(--alt)"':''}>${fmtDate(d.date)}${isToday?' <br><span style="color:var(--alt);font-size:10px;white-space:nowrap">◀ сьогодні</span>':''}</td>
      <td><span class="gbadge ${gCls} hint" tabindex="0">${isToday?'Рішення':'Forecast G_raw'} ${isFinite(displayG3)?(displayG3>=0?'+':'')+displayG3.toFixed(1):'…'}<small class="audit-only" style="color:var(--faint);font-size:8px">${isToday?' · raw-аудит '+(Number.isFinite(G)?(G>=0?'+':'')+G.toFixed(1):'…'):' · не оперативна команда'}${_daySig3?.dynamicGuard?' · ⚠ Kp advisory':''}</small><span class="hint-pop">${escapeHtml(_daySig3?.tooltip||gTip)}</span></span></td>
      <td>${kpCell}</td>
      <td>${Lcell}</td>
      <td>${Mcell}</td>
      <td>${Ecell}</td>
      <td>${Pcell}</td>
      <td class="col-3d-ai">${AiCell}</td>
      <td class="col-3d-ap mono">${apCell}</td>
      <td class="col-hide-mobile">${kpSparkline(d.kp8)}</td>
      <td><span class="hint" tabindex="0" style="color:${isToday?(_daySig3?.color||'var(--text2)'):(displayG3<=-2?'#ff6b6b':displayG3<=-0.5?'#ffaa33':displayG3>=2?'#2bd47d':'#9bb1dc')};font-weight:700">${isToday?(_daySig3?_daySig3.title:classifyG(G)):'Прогнозний raw-контекст'}<span class="hint-pop">${escapeHtml(isToday?(_daySig3?.tooltip||gTip):'Майбутній безперервний G_raw; не оперативна команда і не PDF-verdict.')}</span></span></td>
      <td class="mono col-hide-mobile">${_riskCell}</td>
      <td style="${isToday?(_daySig3?.recommendation||recommendG(G,kpMax)).style:'color:var(--muted)'}">${isToday?(_daySig3?.recommendation||recommendG(G,kpMax)).text:'Фоновий прогноз; рішення формується лише в сам день.'}</td>
    </tr>`;
  }
  html += '</tbody></table>';
  el('threeContent').innerHTML = html;

  // Quick summary pills
  const qw=el('threeQuick');
  if(qw){
    let qhtml='';
    // v87.6 Крок 3: зібрати "завтра" для Hero-link
    let _tomorrowG = null;
    let _tomorrowSig = null;
    const _todayStr = todayKyivStr();
    for(const d of days){
      const kpMax=d.kpMax;
      const ai=computeAi(sunriseUTC(d.date),isFinite(kpMax)?kpMax:null);
      const G=isFinite(kpMax)?kpDayTerm(kpMax)+ai.Ai:NaN;
      const isToday=fmtDate(d.date)===todayKyivStr();
      const _daySigQ = (typeof resolveDaySignal_v88825 === 'function') ? resolveDaySignal_v88825(d.date, G, kpMax, {isToday}) : null;
      // v87.6: перший НЕ-сьогоднішній день = "завтра"
      if (!isToday && _tomorrowG === null && isFinite(G)) {
        _tomorrowSig = _daySigQ;
        _tomorrowG = G;
      }
      // v83f: aligned with classifyStateByG thresholds
      // v88.8.9 БАГ#5 fix: повне узгодження з classifyStateByG.
      // Раніше: G<0 → 'обережно' плутало бо classifyStateByG для G ∈ [-1, +0.5)
      // дає 'нейтральний'. Юзер бачив у Hero 'НЕЙТРАЛЬНИЙ ДЕНЬ' і одночасно у
      // 3-day card на сьогодні 'обережно' — суперечливі повідомлення.
      // Тепер один поріг: classifyStateByG → label.
      const _stateKey = _daySigQ ? (_daySigQ.opKey || _daySigQ.dayKey || _daySigQ.liveKey) : ((typeof classifyStateByG === 'function') ? classifyStateByG(G, kpMax) : 'neutral');
      const cat = _daySigQ ? _daySigQ.title : 'нейтрально';
      const act = _daySigQ ? _daySigQ.action : 'стандартний режим';
      const col = _daySigQ ? _daySigQ.color : '#9bb1dc';
      const forecastColQ = G<=-2?'#ff6b6b':G<=-0.5?'#ffaa33':G>=2?'#2bd47d':'#9bb1dc';
      // fp365: the card headline is the operational result only. PDF/Engine and
      // NOAA raw stay on their own explicitly labeled audit lines below.
      const _opScoreQ = (_daySigQ && isFinite(_daySigQ.decisionScore)) ? Number(_daySigQ.decisionScore) : G;
      const _opScoreTextQ = isFinite(_opScoreQ) ? ((_opScoreQ >= 0 ? '+' : '') + _opScoreQ) : '—';
      const _futureRawTextQ = isFinite(G) ? ((G >= 0 ? '+' : '') + G.toFixed(1)) : '—';
      const dd=d.date.getUTCDate()+'.'+(d.date.getUTCMonth()+1);
      // v87.61: Bulletin (engine v18.5) score line if available
      // v87.62: + sign divergence alert when G and Bulletin have opposite signs
      let _bulletinLine = '';
      let _isDivergent = false;
      let _bsEng = NaN, _bsCol = 'var(--muted)';
      try {
        const _bs = getEngineScore(d.date);
        if(_bs && isFinite(_bs.eng)){
          _bsEng = _bs.eng;
          const _bsSign = _bs.eng >= 0 ? '+' : '';
          _bsCol = _bs.eng >= 2 ? '#2bd47d' : _bs.eng === 1 ? '#9cd49c' : _bs.eng === 0 ? 'var(--muted)' : _bs.eng === -1 ? '#ffaa33' : '#ff6b6b';
          // v88.9.43-fp225 FIX-CRITICAL (doc15, Problem 4): той самий баг, що
          // вже виправлено в heroBulletin (fp219) — ~ приписувався PDF override.
          const _synth = _bs._expertOverride ? '' : (_bs.kp_synthetic ? '~' : '');
          // v88.7 (deep audit): _recalculatedFromLive deprecated → _kpOutdated marker
          // Show marker коли snapshot Kp != live Kp (engine score залишається original snapshot)
          const _recalcMark = _bs._kpOutdated
            ? `<span style="color:#ffaa33;font-size:11px;font-weight:700;margin-left:4px;cursor:help" title="⚠ Engine score з snapshot (validated tag-based)&#10;Snapshot Kp=${_bs.kp.toFixed(1)} (estimated/synthetic)&#10;Live NOAA Kp=${_bs._liveKp.toFixed(1)}&#10;&#10;Engine v18.5 score не перерахований — це tag-based прогноз.&#10;Якщо live Kp значно інший — звертайтесь до Hero G для real-time оцінки.&#10;&#10;Why no recalc? Round(Hero G) дає 47% accuracy. Snapshot — 75.0% strict holdout (κ=0.52). Краще показати validated.">⚠</span>`
            : '';
          // Sign divergence: G>=0.5 & eng<0, або G<=-0.5 & eng>0. Нейтральний діапазон |G|<0.5 не вважається.
          // v88.8.36-fp56-P12: + другий тригер — ВЕЛИКА дельта |G−eng|≥2.5 навіть без знакового конфлікту
          // (кейс 13.06: raw +0.2 vs PDF −3, Δ=3.2 — проходив без попередження через deadzone).
          const _gPos = G >= 0.5, _gNeg = G <= -0.5;
          const _ePos = _bs.eng > 0, _eNeg = _bs.eng < 0;
          const _divergent = (_gPos && _eNeg) || (_gNeg && _ePos) || Math.abs(G - _bs.eng) >= 2.5;
          _isDivergent = _divergent;
          if (_divergent) {
            // v88.8.5 Б2: розширений tooltip — пояснює ЧОМУ розбіжність і ЩО робити.
            // Раніше: загальне 'обережніше з рішеннями'. Тепер: причини + actionable hint.
            _bulletinLine = `<div style="font-size:10px;margin-top:2px;padding:2px 6px;border-radius:4px;background:rgba(255,170,51,.15);border:1px solid rgba(255,170,51,.35);cursor:help" title="⚠ G_now/G_day raw і PDF/Engine Day_score: різні знаки АБО велика розбіжність (Δ≥2.5).&#10;&#10;Чому це буває:&#10;• Engine — frozen tag-based за snapshot Kp; G — live з реальним Kp.&#10;• На boundary days Vedic Panchanga зсувається, Engine snapshot ще не оновлено.&#10;• Engine clamps до ±3, G — continuous (-5..+7).&#10;• На експертних PDF днях override може давати +3, навіть якщо Kp низький.&#10;&#10;Що робити: знизь довіру до автоматичної оцінки на 15%. Перевір 1-2 додаткові сигнали (NOAA SWPC, Panchanga вкладка, локальне самопочуття) перед важливим рішенням.">⚠ ${_bs._expertOverride ? 'PDF reference' : 'Engine reference'}: <span style="color:${_bsCol};font-weight:700">${_bsSign}${_bs.eng}${_synth}</span>${_recalcMark} <span style="color:var(--faint);font-size:9px">· не дозвіл · розбіжність</span></div>`;
          } else {
            _bulletinLine = `<div style="font-size:10px;color:var(--dim);margin-top:2px">${_bs._expertOverride ? 'PDF reference' : 'Engine reference'}: <span style="color:${_bsCol};font-weight:700">${_bsSign}${_bs.eng}${_synth}</span>${_recalcMark} <span style="color:var(--faint);font-size:9px">· не дозвіл</span></div>`;
          }
        }
      } catch(e){ globalThis.NRDiagnostics?.record('catch.142','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
      // v87.90: synthetic Kp warning у quick-card — engine_scores дає kp=2.0 default для майбутнього
      // Якщо bulletin entry має kp_synthetic — це scenario, не реальний forecast
      // v87.90: посилене виділення — opacity 0.55, dashed 2px з кольором, striped pattern
      // v88.6.9: розрізняємо коли live forecast Kp реальний (з NOAA 3-day чи 27-day) vs повністю synthetic.
      // Якщо last3D має real kpMax для цього дня — engine просто OUTDATED (тренувався на старому snapshot),
      // НЕ scenario. Показуємо iнший label.
      // v88.9.42-fp224 FIX-CRITICAL (аудит-раунд-11, Problem 2/3): раніше
      // _isSynthScen перевіряв ЛИШЕ entry.kp_synthetic — прапор, що лишається
      // від СИРОГО snapshot навіть після застосування override (override
      // переписує тільки eng/pdf/_expertOverride, не kp_synthetic — по дизайну,
      // щоб можна було показати "raw engine snapshot мав synthetic Kp" в
      // tooltip). Але картка не розрізняла "override existс" від "override
      // absent" — тому 20.07 (verified PDF +3, застосований поверх snapshot
      // з synthetic Kp) все одно рендерився як "⚠ Сценарій, не прогноз",
      // приховуючи реальний PDF override. Тепер перевіряємо override ПЕРШИМ.
      const _hasVerifiedOverride = (function(){
        try { const _e = getEngineScore(d.date); return !!(_e && _e._expertOverride === true); } catch(e){ globalThis.NRDiagnostics?.record('catch.143','recoverable');  return false; }
      })();
      const _isSynthScen = _hasVerifiedOverride ? false : (function(){
        try { const _e = getEngineScore(d.date); return _e && _e.kp_synthetic === true; } catch(e){ globalThis.NRDiagnostics?.record('catch.144','recoverable');  return false; }
      })();
      const _hasRealLiveKp = isFinite(d.kpMax) && d.kpMax > 0 && !d._filledFrom;
      const _engineOutdatedNotSynth = _isSynthScen && _hasRealLiveKp;
      const _engineFullySynth      = _isSynthScen && !_hasRealLiveKp;
      const _scenStyle = _hasVerifiedOverride
        ? `border:1px solid rgba(255,209,102,.5);background:rgba(255,209,102,.08)`
        : _engineFullySynth
        ? `border:2px dashed rgba(252,164,116,.6);opacity:.55;background:repeating-linear-gradient(45deg,rgba(252,164,116,.08),rgba(252,164,116,.08) 6px,${col}10 6px,${col}10 12px)`
        : _engineOutdatedNotSynth
        ? `border:1px dashed rgba(155,177,220,.55);opacity:.7;background:${col}12`
        : `background:${col}15;border:1px solid ${col}40`;
      let _scenLabel = '';
      let _scenBanner = '';
      // v88.9.42-fp224 (Problem 2/3, продовження): override поверх snapshot із
      // synthetic Kp (типовий кейс для дат за межами NOAA 3-day вікна, напр.
      // 20.07) НЕ підпадав ні під _engineFullySynth, ні під _engineOutdatedNotSynth
      // (обидва стали false одразу як з'явився _hasVerifiedOverride вище) —
      // banner просто не рендерився. Тепер окрема, найвищий пріоритет гілка:
      // будь-який verified override завжди явно позначений, незалежно від
      // стану Kp у сирому snapshot під ним.
      if (_hasVerifiedOverride && _daySigQ && _daySigQ.dynamicGuard) {
        const _pdfBase = isFinite(_daySigQ.sourceDayScore) ? Number(_daySigQ.sourceDayScore) : _bsEng;
        const _opNow = Number.isFinite(_daySigQ.decisionScore) ? _daySigQ.decisionScore : G;
        if (_daySigQ.dynamicGuard === 'kp_storm' || _daySigQ.dynamicGuard === 'kp_elevated') {
          const _guardWhy = _daySigQ.dynamicGuard === 'kp_storm' ? 'Kp ≥ 5' : 'Kp ≥ 4';
          _scenBanner = '<div style="font-size:9px;font-weight:800;letter-spacing:.04em;color:#ffaa33;background:rgba(255,170,51,.14);border:1px solid rgba(255,170,51,.5);border-radius:6px;padding:3px 6px;margin-bottom:5px;text-align:center">⚠ БЕЗПЕКА: ' + _guardWhy + ' — перевірити GPS/зв’язок/дрони; рішення дня ' + (_pdfBase>=0?'+':'') + _pdfBase + ' не змінено</div>';
        } else if (_daySigQ.dynamicGuard === 'current_window') {
          const _windowNames = ((_daySigQ.intradayGuard && _daySigQ.intradayGuard.reasonsNow) || [])
            .filter(r => String(r).startsWith('window:')).map(r => String(r).slice(7)).join('+') || 'Rahu/Yama/Gulika';
          _scenBanner = '<div style="font-size:9px;font-weight:800;letter-spacing:.04em;color:#ffaa33;background:rgba(255,170,51,.14);border:1px solid rgba(255,170,51,.5);border-radius:6px;padding:3px 6px;margin-bottom:5px;text-align:center">⚠ ПОТОЧНЕ ВІКНО: ' + _windowNames + ' — лише рутина зараз; денний reference ' + (_pdfBase>=0?'+':'') + _pdfBase + ' показано окремо</div>';
        }
      } else if (_hasVerifiedOverride) {
        const _engRawForBanner = (function(){ try { const _es = getEngineScore(d.date); return isFinite(_es?._engRaw) ? _es._engRaw : null; } catch(_e){ globalThis.NRDiagnostics?.record('catch.145','recoverable');  return null; } })();
        _scenBanner = `<div style="font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#ffd166;background:rgba(255,209,102,.15);border:1px solid rgba(255,209,102,.45);border-radius:6px;padding:2px 6px;margin-bottom:5px;text-align:center" title="Це значення — ручний verified PDF-вердикт (expert override), НЕ розрахунок engine v18.5.${_engRawForBanner!=null ? ' Raw engine v18.5 snapshot: '+(_engRawForBanner>=0?'+':'')+_engRawForBanner+'.' : ''} Фон NOAA (raw, окремо, довідково) — рядок нижче.">★ PDF REFERENCE · VERIFIED OVERRIDE · НЕ РІШЕННЯ ДЛЯ ДІЇ</div>`;
      } else if(_engineFullySynth){
        // v88.8.35-fp56-P8: make a synthetic-Kp SCENARIO card unmistakably weaker than a real
        // forecast. The dashed/opacity styling alone read too similar to a real card (user confusion).
        // Add an explicit top banner + stronger label. Numbers/logic unchanged — presentation only.
        _scenBanner = `<div style="font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#fca474;background:rgba(252,164,116,.18);border:1px solid rgba(252,164,116,.5);border-radius:6px;padding:2px 6px;margin-bottom:5px;text-align:center" title="NOAA не дає реального forecast Kp на цю дату (за межами 3-денного вікна). Підставлено synthetic Kp=2.0. Це ймовірний сценарій «якщо нічого не зміниться», НЕ прогноз.">⚠ Сценарій, не прогноз</div>`;
        _scenLabel = `<div style="font-size:9px;color:#fca474;margin-top:2px;line-height:1.3" title="Engine використав synthetic Kp=2.0 (NOAA forecast недоступний). Це сценарій, не справжній прогноз.">ймовірний сценарій за поточним Kp · synthetic</div>`;
      } else if(_engineOutdatedNotSynth){
        // v88.9.34-fp215 (аудит-раунд-5, Problem 13): якщо для цієї дати активний
        // verified PDF override — банер мав казати конкретно "PDF override", а не
        // generic "PDF/Engine", яке читається так, ніби engine v18.5 порахував.
        const _dayHasOverride = (function(){ try { const _es = getEngineScore(d.date); return !!(_es && _es._expertOverride); } catch(_e){ globalThis.NRDiagnostics?.record('catch.146','recoverable');  return false; } })();
        // v88.8.35-fp56-P8: engine-outdated is DIFFERENT from synthetic-scenario — here live Kp is
        // REAL (=${d.kpMax}) but the engine score was computed on an older snapshot. Give it its own
        // explicit (blue, not orange) banner so the card no longer reads as a normal forecast, while
        // still distinguishing it from the synthetic-Kp scenario case above. Numbers unchanged.
        _scenBanner = _dayHasOverride
          ? `<div style="font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#ffd166;background:rgba(255,209,102,.15);border:1px solid rgba(255,209,102,.45);border-radius:6px;padding:2px 6px;margin-bottom:5px;text-align:center" title="Це значення — ручний verified PDF-вердикт (expert override), НЕ розрахунок engine v18.5. Raw engine snapshot окремо, у tooltip бейджа Engine v18.5.">★ PDF override · не engine v18.5</div>`
          : `<div style="font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color: var(--muted);background:rgba(155,177,220,.15);border:1px solid rgba(155,177,220,.45);border-radius:6px;padding:2px 6px;margin-bottom:5px;text-align:center" title="Live NOAA forecast Kp=${d.kpMax.toFixed(1)} свіжіший за engine-score (рахований на старому snapshot). Engine може недо-оцінювати буревий ризик — звіряйся з live.">ⓘ PDF/Engine reference · live Kp оновлює safety-контур</div>`;
        _scenLabel = `<div style="font-size:9px;color: var(--muted);margin-top:2px;line-height:1.3" title="Engine v18.5 score обчислений на snapshot часу train. Live NOAA forecast Kp=${d.kpMax.toFixed(1)} оновленіший. Engine score може недо-оцінювати буревий ризик.">пріоритет — live Kp=${d.kpMax.toFixed(1)}, не engine</div>`;
      }
      qhtml+=`<span title="${escapeHtml(_daySigQ?.tooltip||'')}" style="flex:1;min-width:140px;padding:8px 14px;border-radius:10px;${_scenStyle};text-align:center">
        ${_scenBanner}
        <div style="font-weight:700;color:${isToday?col:forecastColQ};font-size:14px">${dd} → ${isToday?'ОПЕРАТИВНО '+_opScoreTextQ:'FORECAST G_raw '+_futureRawTextQ} · ${isToday?cat:'не команда для дії'}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${isToday?act:'Прогнозний фон; PDF/Engine reference показано окремо.'}</div>
        ${_bulletinLine}
        <div class="card3d-numeric" style="font-size:10px;color:var(--faint);margin-top:3px" title="Довідкові raw-числа. G_day raw (3d) = 2 − Kp_max з NOAA 3-day forecast (${isFinite(kpMax)?kpMax.toFixed(1):'?'}) + ΣAᵢ. Це добовий 3-day прогноз, не live G_now і не 27-day NOAA raw. PDF/Engine зверху — денний reference. Оперативний стан обирає обережніший safety-контур.">${isFinite(G)?'<span style="color:var(--faint);font-size:9px">3D NOAA G_day raw · ДОБА, НЕ G_now: </span>'+(G>=0?'+':'')+G.toFixed(1):'—'}${(() => {
          // fp51: show G_day 27D alongside 3D and delta
          try {
            const _ds51 = typeof fmtDate === 'function' ? fmtDate(d.date) : d.date.toISOString().slice(0,10);
            const _e27 = Array.isArray(window._27dComputed) ? window._27dComputed.find(e => e.ds === _ds51) : null;
            if (_e27 && isFinite(_e27.G)) {
              const _delta = G - _e27.G;
              const _deltaStr = (_delta >= 0 ? '+' : '') + _delta.toFixed(1);
              const _27str = (_e27.G >= 0 ? '+' : '') + _e27.G.toFixed(1);
              const _deltaColor = Math.abs(_delta) >= 0.3 ? '#ffaa33' : 'var(--faint)';
              return ` · <span style="color:var(--faint)">27D NOAA raw: ${_27str}</span><span style="color:${_deltaColor};font-size:9px"> Δ3D−27D ${_deltaStr}</span>`;
            }
          } catch(_e){ window.NRDiagnostics?.record('legacy.catch.114','recoverable'); }
          return '';
        })()}</div>
        ${_scenLabel}
        ${(function(){
          // v88.9.6x-fp259 (кейс 22.07: PDF −3 vs G_day raw +3.8): раніше
          // розбіжність показувала лише один рядок "⚠ PDF/Engine: −3 ·
          // розбіжність" — недостатньо, щоб зрозуміти ЩО саме розходиться.
          // Явна картка з розкладкою: PDF / геомагнітний фон / Панчанга Pᵢ /
          // календарні фактори (cal_score, cal_symbols — mercury_retro, bolt
          // тощо, вже завантажені в _engineScores, раніше ніде так не
          // показувались). КРИТИЧНО (аудит, п.2): Pᵢ вже входить у G_day raw
          // вище (computeAi: AiNoDstRaw = Li+Mi+ei+Pi) — це ОДИН сигнал,
          // не два незалежних "голоси". Явно позначаємо це в картці, щоб не
          // рахувати "2 зелених проти 1 червоного".
          if (!_isDivergent) return '';
          try {
            const _dsCal = fmtDate(d.date);
            const _calEntry = (typeof _engineScores !== 'undefined' && _engineScores && _engineScores[_dsCal]) ? _engineScores[_dsCal] : null;
            const _calScore = _calEntry && isFinite(_calEntry.cal_score) ? Number(_calEntry.cal_score) : null;
            const _calSymbols = _calEntry && Array.isArray(_calEntry.cal_symbols) ? _calEntry.cal_symbols : [];
            const _calSymText = (_calSymbols.length && typeof formatCalSymbols === 'function') ? formatCalSymbols(_calSymbols) : '';
            const _piVal = (ai && isFinite(ai.Pi)) ? ai.Pi : null;
            const _piLabel = _piVal === null ? '' : (_piVal >= 0.3 ? 'підтримує' : _piVal <= -0.3 ? 'заважає' : 'нейтральна');
            const _pdfLabel = _bsEng >= 2 ? 'сприятливо' : _bsEng >= 1 ? 'помірно сприятливо' : _bsEng === 0 ? 'нейтрально' : _bsEng >= -1 ? 'помірно уникати' : 'уникати';
            const _rawLabel = G >= 2 ? 'сприятливий' : G >= 0.5 ? 'помірно сприятливий' : G >= -0.5 ? 'нейтральний' : 'несприятливий';
            return `<div style="margin-top:6px;padding:8px 10px;border-radius:8px;background:rgba(255,107,107,.08);border:1px solid rgba(255,107,107,.35);font-size:11px;line-height:1.65;text-align:left">
              <div style="font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#ff9f9f;font-size:10px;margin-bottom:4px;cursor:help" title="Значна розбіжність (Δ≥2.5 або протилежні знаки) між експертним вердиктом і сирим геомагнітним фоном. Розклад нижче — щоб зрозуміти ЩО саме розходиться, а не просто 'десь конфлікт'.">⚠ Конфлікт моделей</div>
              <div><span style="color:var(--faint)">Експерт/PDF:</span> <strong style="color:${_bsCol}">${_bsEng>=0?'+':''}${_bsEng}</strong> — ${_pdfLabel}</div>
              <div><span style="color:var(--faint)">Геомагнітний фон (G_day raw):</span> <strong style="color:${forecastColQ}">${isFinite(G)?(G>=0?'+':'')+G.toFixed(1):'—'}</strong> — ${_rawLabel}</div>
              ${_piVal !== null ? `<div><span style="color:var(--faint)">Панчанга Pᵢ:</span> <strong>${_piVal>=0?'+':''}${_piVal.toFixed(1)}</strong>${_piLabel?' — '+_piLabel:''} <span style="color:var(--faint);font-size:9px" title="AiNoDstRaw = Lᵢ+Mᵢ+eᵢ+Pᵢ — Pᵢ вже частина суми вище, не окремий сигнал">(вже в фоні вище, не окремий голос)</span></div>` : ''}
              ${_calScore !== null ? `<div><span style="color:var(--faint)">Календарні фактори:</span> <strong>${_calScore>=0?'+':''}${_calScore.toFixed(1)}</strong>${_calSymText?' — '+_calSymText:''} <span style="color:var(--faint);font-size:9px">(frozen engine_scores, довідково)</span></div>` : ''}
              <div style="margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,.08)"><span style="color:var(--faint)">${isToday?'Оперативний стан':'Прогнозний висновок'}:</span> <strong style="color:${isToday?(_daySigQ?.color||'#ffaa33'):forecastColQ}">${isToday?(isFinite(_daySigQ?.decisionScore)?(_daySigQ.decisionScore>=0?'+':'')+_daySigQ.decisionScore:'—'):(isFinite(G)?(G>=0?'+':'')+G.toFixed(1):'—')} — ${isToday?escapeHtml(_daySigQ?.title||'потрібна перевірка'):'не команда для дії'}</strong><br><span style="color:var(--faint);font-size:9px">PDF лишається reference; ${isToday?'оперативний контур обирає обережніший сигнал.':'остаточний стан формується лише в сам день за live-даними.'}</span></div>
            </div>`;
          } catch(_eConf) { globalThis.NRDiagnostics?.record('catch.147','recoverable');  return ''; }
        })()}
      </span>`;
    }
    qw.innerHTML=qhtml;
    // v87.6 Крок 3: expose для Hero-link
    window.__tomorrowG = _tomorrowG;
    // Оновити heroTomorrow badge одразу
    try {
      const _htEl = document.getElementById('heroTomorrow');
      if (_htEl) {
        if (isFinite(_tomorrowG)) {
          // v88.9.33-fp214 FIX-CRITICAL (аудит-раунд-4, "завтра" desync):
          // Раніше фолбек, коли __uiState.gNow ще NaN (race — рендер heroTomorrow
          // може відпрацювати до loadAll()), ПЕРЕРАХОВУВАВ today G через
          // days[0].kpMax (денний ПІК прогнозу Kp) — інша величина, ніж live
          // поточний Kp. Це давало інший today-baseline, ніж той, що бачить
          // користувач у кільці/Formula Audit (#nowG), і могло перевернути
          // напрям стрілки "завтра" (напр. показати "↓ погіршення" там, де
          // проти РЕАЛЬНОГО G_now це насправді покращення).
          // Виправлено: той самий канонічний #nowG DOM-fallback, що вже
          // застосований у _patchStaleLoadingDOM (fp172/fp209) — єдине надійне
          // джерело G_now у файлі, а не окрема формула з іншою семантикою.
          let _todayG = isFinite(window.__uiState?.gNow) ? window.__uiState.gNow : NaN;
          if (!isFinite(_todayG)) {
            const _nowGEl2 = document.getElementById('nowG');
            _todayG = _num(_firstText(_nowGEl2) || _nowGEl2?.textContent);
          }
          const _diff = isFinite(_todayG) ? (_tomorrowG - _todayG) : 0;
          const _arrow = _diff > 0.3 ? '↑' : _diff < -0.3 ? '↓' : '→';
          let _hint = _diff > 0.3 ? 'покращення' : _diff < -0.3 ? 'погіршення' : 'без змін';
          const _sign = _tomorrowG >= 0 ? '+' : '';
          // v87.92 fix: scenario marker через data-attribute + CSS ::after — не можна перетерти JS-рендерами
          // v87.94: + sibling DOM fallback (heroTomorrowScenario) — окремий elem, не конфліктує з рендерами
          const _isScenario = !!(parsed3 && parsed3._synthetic);

          // v88.8.18 ★ FIX: централізована override detection через helper.
          const _tomDate = days.find(dd => fmtDate(dd.date) !== _todayStr);
          const _tomEff = (typeof getEffectiveGForDate === 'function' && _tomDate)
            ? getEffectiveGForDate(_tomDate.date, _tomorrowG)
            : { hasOverride: false, marker: '', tooltip: '', override: null };

          // v88.8.35-fp18 fix: КОНФЛІКТ ЗНАКІВ raw vs PDF override.
          // Раніше показували "↑ покращення ★" навіть коли raw=+4.7 а override=-3.
          // Тепер: якщо знаки протилежні І override помітний (delta≥1.5) → переписуємо hint
          // на "конфлікт: PDF -3" з червоним стрілкою-попередженням замість оптимістичного "↑".
          let _displayArrow = _arrow;
          let _conflictOverride = false;
          if (_tomEff.hasOverride && isFinite(_tomEff.override)) {
            const _rawPositive = _tomorrowG > 0.3;
            const _ovrNegative = _tomEff.override < -0.3;
            const _rawNegative = _tomorrowG < -0.3;
            const _ovrPositive = _tomEff.override > 0.3;
            if ((_rawPositive && _ovrNegative) || (_rawNegative && _ovrPositive)) {
              _conflictOverride = true;
              const _ovrSign = _tomEff.override >= 0 ? '+' : '';
              _hint = `конфлікт: PDF ${_ovrSign}${_tomEff.override}`;
              _displayArrow = '⚠';
            }
          }

          // v88.8.35-fp56-P8: УНІФІКАЦІЯ — якщо є override, показуємо PDF-число ЗАВЖДИ
          // (не лише при конфлікті знаків). Раніше "G=+1.4 ↑ покращення ★" ховало PDF=+3 за зірочкою —
          // користувач бачив різні числа в різних блоках. Тепер: "G=+1.4 · PDF: +3 ★".
          let _pdfPart = '';
          if (_tomEff.hasOverride && isFinite(_tomEff.override) && !_conflictOverride) {
            const _os = _tomEff.override >= 0 ? '+' : '';
            _pdfPart = ` · PDF: ${_os}${_tomEff.override}`;
          }
          // v88.9.37-fp219 (аудит-раунд-6, Problem 3): раніше текст завжди
          // починався з raw G ("G=+0.9 ↑ покращення · PDF: +0★") — користувач
          // першим читав "покращення", хоча головне рішення для дня — PDF-
          // вердикт (тут 0, нейтрально), а "покращення" стосується ЛИШЕ
          // переходу live-фону G_now→G_raw, не вердикту. Коли override існує,
          // PDF-вердикт тепер іде першим, фон — другим, явно підписаний "фон".
          if (_tomorrowSig && _tomorrowSig.dynamicGuard && isFinite(_tomorrowSig.decisionScore)) {
            const _op = Number(_tomorrowSig.decisionScore);
            const _base = isFinite(_tomorrowSig.sourceDayScore) ? Number(_tomorrowSig.sourceDayScore) : _tomEff.override;
            const _why = _tomorrowSig.dynamicGuard === 'kp_storm' ? 'Kp≥5' : 'Kp≥4';
            _htEl.textContent = 'PDF ' + (_base>=0?'+':'') + _base + ' · ⚠ ' + _why + ' лише безпека GPS/зв’язку/дронів';
          } else if (_tomEff.hasOverride && isFinite(_tomEff.override) && !_conflictOverride) {
            const _os2 = _tomEff.override >= 0 ? '+' : '';
            _htEl.textContent = `PDF: ${_os2}${_tomEff.override} · фон ${_sign}${_tomorrowG.toFixed(1)} ${_displayArrow}${_tomEff.marker}`;
          } else {
            _htEl.textContent = `G=${_sign}${_tomorrowG.toFixed(1)} ${_displayArrow} ${_hint}${_pdfPart}${_tomEff.marker}`;
          }
          const _htSibling = document.getElementById('heroTomorrowScenario');
          if (_isScenario) {
            _htEl.dataset.scenario = '1';
            _htEl.title = '⚠ NOAA forecast недоступний — це плато на базі поточного Kp, не справжній прогноз. Тренд "покращення/погіршення" базується на Aᵢ-факторах календаря (Lᵢ, Mᵢ, Pᵢ), а не на динаміці Kp.';
            if (_htSibling) { _htSibling.textContent = '⚠ SCENARIO'; _htSibling.className = 'scenario'; }
          } else {
            delete _htEl.dataset.scenario;
            // v88.7 (deep audit): tooltip пояснює чому "Завтра G" може відрізнятися від Forward Timeline peak
            // v88.8.18 ★ FIX: helper повертає override info як tooltip приставку
            _htEl.title = `G завтра = ${_sign}${_tomorrowG.toFixed(1)} (Kp_max з NOAA 3-day forecast + Aᵢ календар).\n\nFlash-tip: Forward Timeline (нижче) показує денний пік Kp з 27-day NOAA outlook — інше джерело, інша часова роздільність. Розходження 0.5-1.0 — норма.\n\nКольори:\n● зелений: G ≥ 1 (сприятливо)\n● сірий: 0 ≤ G < 1 (нейтрально)\n● жовтий: -2 < G < 0 (помірний фон)\n● червоний: G ≤ -2 (буря)${_tomEff.tooltip}`;
            if (_htSibling) { _htSibling.textContent = ''; _htSibling.className = ''; }
          }
          // v88.8.35-fp18: при sign conflict — червоний попереджувальний колір, незалежно від raw G.
          _htEl.style.color = _isScenario ? 'var(--muted)'
            : _conflictOverride ? 'var(--bad)'
            : _tomorrowG >= 1 ? 'var(--ok)' : _tomorrowG >= 0 ? 'var(--muted)' : _tomorrowG > -2 ? 'var(--warn)' : 'var(--bad)';
        } else {
          _htEl.textContent = '';
          delete _htEl.dataset.scenario;
          const _htSibling = document.getElementById('heroTomorrowScenario');
          if (_htSibling) { _htSibling.textContent = ''; _htSibling.className = ''; }
        }
      }
    } catch(e){ window.NRDiagnostics?.record('legacy.catch.115','recoverable'); }
  }
}/* NR_FN_END 204 */

/* NR_FN_BEGIN 232 */function renderDecisionTiming(slots){
  // v88.8.35-fp56-P8: self-heal at the SOURCE. Previous patches (fp24/32/37/38/40/54-A)
  // tried to fix the "Немає даних по слотах" + filled "Критичні вікна" contradiction
  // AFTER render, via DOM. Root cause is a race: the hero pipeline can pass a stale
  // empty _daySlots snapshot here while timingRows renders from a fresher one.
  // Fix: if called with an empty/invalid snapshot but the global _daySlots already has
  // data, use the live global slots. No timing/threshold logic changed — only the input.
  if ((!Array.isArray(slots) || !slots.length) && Array.isArray(window._daySlots) && window._daySlots.length) {
    slots = window._daySlots;
  }
  const summary = buildTimingSummary(slots);
  const list = el('decisionTimingList');
  if(!list) return summary;
  // v88.8.35-fp8 M: попередження якщо live-дані затримані — щоб користувач не приймав
  // зелені слоти як актуальну рекомендацію.
  let _delayWarn = '';
  try {
    const _dm = (typeof window !== 'undefined' && window.__dataMode)
              || (typeof resolveDataMode === 'function' ? resolveDataMode() : 'live');
    if (_dm !== 'live') {
      const _wTxt = ({
        partial:  '⚠ Live-дані затримані (DELAYED/PARTIAL). Слоти орієнтовні — перед важливою дією перевір через 5–10 хв.',
        scenario: '⚠ NOAA forecast недоступний. Слоти показані за сценарієм поточного Kp — не реальний прогноз.',
        offline:  '⚠ Дані з кешу (OFFLINE). Слоти можуть бути неактуальними; для рішень — PDF/Engine.'
      })[_dm] || '';
      if (_wTxt) {
        _delayWarn = `<div style="color:#ffd2a0;font-size:11px;padding:4px 8px;margin-bottom:6px;background:rgba(255,170,51,.08);border-left:2px solid #ffaa33;border-radius:4px">${_wTxt}</div>`;
      }
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.121','recoverable'); }
  const futureSlots = summary.slots.filter(s => !s.isPast);
  const pastCount = summary.slots.length - futureSlots.length;
  const visible = futureSlots.length ? futureSlots : summary.slots;
  if(!visible.length){
    // fp32: if no slots but storm window known — show storm fallback instead of "немає даних"
    const _sw32t = window._stormWindow;
    if (_sw32t && isFinite(_sw32t.kp) && _sw32t.kp >= 5) {
      const _utcL32t = String(_sw32t.label).padStart(2,'0');
      const _kyivL32t = String(((parseInt(_sw32t.label,10) + kyivOffsetHoursIntAt(new Date())) % 24 + 24) % 24).padStart(2,'0');
      list.innerHTML = _delayWarn + `
        <div class="dt-row dt-good dt-now"><span class="dt-time">Зараз</span><span class="dt-label">орієнтовно можна — дійте до ${_utcL32t}:00 UTC ◀</span></div>
        <div class="dt-row dt-bad" style="opacity:.85"><span class="dt-time">До ${_utcL32t}:00 UTC / ${_kyivL32t}:00 Київ</span><span class="dt-label">закрити важливе</span></div>
        <div class="dt-row dt-bad" style="opacity:.72"><span class="dt-time">Після бурі</span><span class="dt-label">тільки рутина / без критичних рішень</span></div>
        <div style="color:var(--faint);font-size:10px;margin-top:4px">⚡ Storm fallback — Kp=${_sw32t.kp.toFixed(1)} о ${_utcL32t}:00 UTC. Слоти недоступні.</div>
      `;
    } else {
      list.innerHTML = _delayWarn + `<span style="color:var(--dim);font-size:12px">Немає даних по слотах.</span>`;
    }
    return summary;
  }
  // v85b-F8.2+F8.3: при allSame — decision-level (2 рядки), не 6.
  // Деталі по слотах залишаються у "Локальний ритм" нижче (сенс-розділення ролей).
  if(summary.allSame){
    const _first = visible[0];
    const _cls = _first?.cls || 'mid';
    // v88.8.35-fp11 W: PDF/Engine hard-cap — якщо денний verdict ≤ -2, заборонити
    // позитивні фрази "сприятливий момент / стандартний темп" навіть при `_cls === 'good'`.
    let _ttHardCap = null;
    try {
      const _eTd = (typeof getEngineScore === 'function') ? getEngineScore(new Date(todayKyivStr()+'T12:00:00Z')) : null;
      const _eTdScore = (_eTd && isFinite(_eTd.eng)) ? Number(_eTd.eng) : null;
      if (_eTdScore !== null && _eTdScore <= -2) _ttHardCap = _eTdScore;
    } catch(e){ window.NRDiagnostics?.record('legacy.catch.122','recoverable'); }
    // fp28: storm-guard для "До кінця дня" — якщо є storm window, фон не може бути "сприятливий" до кінця
    const _sw28 = window._stormWindow;
    const _nowText = _first?.isNow ? _first.text : _ttHardCap !== null
                   ? `тільки рутина · день PDF/Engine = ${_ttHardCap}`
                   : (_sw28 && isFinite(_sw28.kp) && _sw28.kp >= 5 && _cls !== 'bad')
                     ? `сприятливо — дій зараз, до ${String(_sw28.label).padStart(2,'0')}:00 UTC`
                     : (_cls === 'bad' ? 'уникати — без форсування'
                       : _cls === 'mid' ? 'стандартний темп'
                       : 'сприятливий момент');
    const _stormRestText = (_sw28 && isFinite(_sw28.kp) && _sw28.kp >= 5)
      ? `до ${String(_sw28.label).padStart(2,'0')}:00 UTC — можна; після — тільки рутина (Kp-буря)`
      : null;
    const _restText = _ttHardCap !== null
                    ? `без нових рішень до кінця дня`
                    : _stormRestText
                    ? _stormRestText
                    : (_cls === 'bad' ? 'режим без змін до кінця дня'
                      : _cls === 'mid' ? 'фон стабільний до кінця дня'
                      : 'сприятливий фон до кінця дня');
    const _clsForRender = (_ttHardCap !== null || _stormRestText) ? 'bad' : _cls;
    // fp30-F: apply "орієнтовно" prefix in allSame block when data is not live
    let _nowTextFinal = _nowText;
    try {
      const _dm30 = (typeof window !== 'undefined' && window.__dataMode)
                 || (typeof resolveDataMode === 'function' ? resolveDataMode() : 'live');
      if (_dm30 !== 'live' && _ttHardCap === null && !_stormRestText && _cls !== 'bad')
        _nowTextFinal = 'орієнтовно: ' + _nowText;
    } catch(_e30){ window.NRDiagnostics?.record('legacy.catch.123','recoverable'); }
    list.innerHTML = _delayWarn + `
      <div class="dt-row dt-${_clsForRender} dt-now"><span class="dt-time">Зараз</span><span class="dt-label">${_nowTextFinal} ◀</span></div>
      <div class="dt-row dt-${_clsForRender}" style="opacity:.72"><span class="dt-time">До кінця дня</span><span class="dt-label">${_restText}</span></div>
      <div style="color:var(--faint);font-size:10px;margin-top:4px">Детальний погодинний розклад — у "Локальний ритм" нижче</div>
    `;
    return summary;
  }
  // v88.8.35-fp11 X + fp12 Y: DELAYED/STALE/SCENARIO → префікс "орієнтовно".
  // АЛЕ якщо PDF/Engine для дня ≤ -2 (критичний день), переписуємо ВЕСЬ текст
  // зелених/нейтральних слотів на "тільки рутина", а не залишаємо "орієнтовно: сприятливо".
  // Це усуває звучання "орієнтовно: можна" як дозвіл на дію.
  let _slotPrefixDelayed = '';
  let _pdfHardForList = null;
  try {
    const _dm2 = (typeof window !== 'undefined' && window.__dataMode)
               || (typeof resolveDataMode === 'function' ? resolveDataMode() : 'live');
    if (_dm2 !== 'live') _slotPrefixDelayed = 'орієнтовно: ';
    const _eTd = (typeof getEngineScore === 'function') ? getEngineScore(new Date(todayKyivStr()+'T12:00:00Z')) : null;
    const _eTdS = (_eTd && isFinite(_eTd.eng)) ? Number(_eTd.eng) : null;
    if (_eTdS !== null && _eTdS <= -2) _pdfHardForList = _eTdS;
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.124','recoverable'); }
  // Normal mode (non-flat day) — render all slots as before
  list.innerHTML = _delayWarn + visible.map(s => {
    let _displayText = s.text;
    let _displayCls = s.cls;
    if (_pdfHardForList !== null && s.cls !== 'bad') {
      // PDF/Engine ≤ -2: жорстко переписуємо текст і клас на негативний — DELAYED префікс не потрібен,
      // бо вже зрозуміло що це "тільки рутина".
      _displayText = `тільки рутина (день PDF/Engine = ${_pdfHardForList})`;
      _displayCls = 'bad';
    } else if (_slotPrefixDelayed && s.cls !== 'bad') {
      // DELAYED/STALE без критичного PDF/Engine: тільки префікс "орієнтовно".
      _displayText = _slotPrefixDelayed + s.text;
    }
    return `<div class="dt-row dt-${_displayCls}${s.isNow?' dt-now':''}">`
    +`<span class="dt-time">${s.time}</span><span class="dt-label">${_displayText}${s.isNow?' ◀ поточний слот':''}</span></div>`;
  }).join('')
  + (pastCount > 0 ? `<div style="color:var(--faint);font-size:10px;margin-top:4px;font-style:italic">Показано ${visible.length} з ${summary.slots.length} слотів (минуло ${pastCount})</div>` : '');
  return summary;
}/* NR_FN_END 232 */

/* NR_FN_BEGIN 236 */function renderAlertBanner(g, kp){
  const banner = document.getElementById('alertBanner');
  const titleEl = document.getElementById('alertTitle');
  const bodyEl = document.getElementById('alertBody');
  if (!banner || !titleEl || !bodyEl) return;

  const alerts = [];

  // v87.15 U6: X-ray flare alerts (M/X class) — найвищий пріоритет, миттєвий вплив
  const xr = window._lastXray;
  if (xr && xr.class) {
    const letter = xr.class[0];
    if (letter === 'X') {
      alerts.push({ title: `☀ X-КЛАС СПАЛАХ · ${xr.class}`, body: 'Потужний сонячний спалах зареєстровано GOES. Радіо-пропадання, можливі GPS-збої. Очікуйте посилення Kp за 24-48 год.' });
    } else if (letter === 'M') {
      const mag = parseFloat(xr.class.slice(1));
      if (mag >= 5) {
        alerts.push({ title: `⚠ M-КЛАС СПАЛАХ · ${xr.class}`, body: 'Середньо-потужний спалах. Можлива CME та посилення геомагнітної активності через 1-3 дні.' });
      }
    }
  }

  // Current Kp ≥ 5 → geomagnetic storm
  if (isFinite(kp) && kp >= 5) {
    const level = kp >= 7 ? 'G3+ СИЛЬНА БУРЯ' : kp >= 6 ? 'G2 ПОМІРНА БУРЯ' : 'G1 СЛАБКА БУРЯ';
    alerts.push({ title: `⚡ ${level} (Kp=${kp.toFixed(1)})`, body: 'Уникайте важливих рішень, подорожей, переговорів. Чекайте стабілізації.' });
  }

  // G ≤ -3 → extreme risk
  if (isFinite(g) && g <= -3) {
    const _operationalG = Math.max(-3, Math.min(3, g));
    alerts.push({ title: '🔴 ВИСОКИЙ РИЗИК', body: `G_raw = ${g.toFixed(1)} — сума одночасних факторів поза оперативною шкалою −3…+3. Оперативний стан: ${_operationalG.toFixed(0)}. Не приймайте важливих рішень 3-6 годин.` });
  }

  // Forecast: check _daySlots for future Kp ≥ 5
  // fp43: use canonical resolveStormWindow() — single source of truth
  window._stormWindow = resolveStormWindow(new Date(), window._daySlots || [], kp);
  const _sw43 = window._stormWindow;
  if (_sw43 && !alerts.length) {
    const _utcH = parseInt(_sw43.label, 10);
    const _kyivH = ((_utcH + kyivOffsetHoursIntAt(new Date())) % 24 + 24) % 24;
    const _kyivStr = String(_kyivH).padStart(2,'0') + ':00';
    const _alertTitle = _sw43.active
      ? `⚡ БУРЯ АКТИВНА ЗАРАЗ — Kp=${_sw43.kp.toFixed(1)}`
      : `⚠ БУРЯ ОЧІКУЄТЬСЯ через ${_sw43.etaLabel}`;
    const _alertBody = _sw43.active
      ? `Геомагнітна буря Kp=${_sw43.kp.toFixed(1)} зараз активна. Тільки рутина, без критичних рішень.`
      : `Прогнозований Kp=${_sw43.kp.toFixed(1)} о ${_sw43.label}:00 UTC / ${_kyivStr} Київ. Завершіть важливі справи заздалегідь.`;
    alerts.push({ title: _alertTitle, body: _alertBody });
  }

  // G ≤ -2 (moderate risk, softer alert)
  if (isFinite(g) && g <= -2 && g > -3 && !alerts.length) {
    alerts.push({ title: '⚠ ПІДВИЩЕНИЙ РИЗИК', body: `G = ${g.toFixed(1)} — тиск зростає. Будьте обережні з рішеннями.` });
  }

  if (alerts.length > 0) {
    const a = alerts[0]; // show most severe
    titleEl.textContent = a.title;
    bodyEl.textContent = a.body;
    banner.style.display = '';
    // Color intensity by severity
    if (alerts[0].title.includes('СИЛЬНА') || alerts[0].title.includes('ВИСОКИЙ') || alerts[0].title.includes('X-КЛАС')) {
      banner.style.borderColor = 'rgba(255,40,40,.55)';
      banner.style.background = 'linear-gradient(180deg,rgba(255,30,30,.18),rgba(255,30,30,.08))';
    } else if (alerts[0].title.includes('M-КЛАС')) {
      banner.style.borderColor = 'rgba(255,150,40,.45)';
      banner.style.background = 'linear-gradient(180deg,rgba(255,140,20,.14),rgba(255,140,20,.06))';
    }
    // fp39: fp32 inline patches REMOVED. _applyStormGuardDOM (called below) handles all DOM patches
    // with short, consistent texts. fp32 inline was duplicating work AND writing LONG texts that
    // _applyStormGuardDOM's trigger logic couldn't overwrite (it only catches fallback placeholders).
  } else {
    banner.style.display = 'none';
  }
  // fp35: always call standalone storm-guard, regardless of banner state
  try { _applyStormGuardDOM(); _patchStaleLoadingDOM(); } catch(e){ window.NRDiagnostics?.record('legacy.catch.130','recoverable'); }

  // fp96: Sanity Watchdog — yellow non-critical warnings
  try {
    const sWarns = _runSanityWatchdog(g, kp);
    const sb = document.getElementById('sanityBanner');
    const si = document.getElementById('sanityItems');
    if(sb && si){
      if(sWarns.length > 0){
        si.innerHTML = sWarns.map(w =>
          `<div><strong>${w.icon} ${w.title}:</strong> ${w.body}</div>`
        ).join('');
        sb.style.display = '';
        // fp100: якщо є stale або physics inconsistency — позначити статус як DEGRADED
        const hasStale = sWarns.some(w => w.icon === '📡');
        const hasPhysics = sWarns.some(w => w.icon === '🔬');
        if(hasStale || hasPhysics){
          const fb = document.getElementById('freshnessBadge');
          const hf = document.getElementById('heroFreshness');
          if(fb && !fb.textContent.includes('STALE') && !fb.textContent.includes('OLD')){
            fb.textContent = '⚠ DEGRADED';
            fb.style.color = '#ff9944';
            fb.style.background = '#2a1200';
            // v88.9.34-fp215 (аудит-раунд-5, Problem 7): це ЄДИНЕ місце, де факт
            // DEGRADED точно відомий у момент виявлення (той самий висновок, що
            // вже зробив fp199-коментар нижче про heroConfidence). Публікуємо це
            // напряму як прапор, а не лише як текст бейджа — Formula Audit тепер
            // може читати РЕАЛЬНИЙ стан замість вгадування через .includes('degraded')
            // на тексті іншого елемента.
            // v88.9.40-fp222 (Problem 4): розширено до повного window.__sourceState
            // через _updateSourceState — той самий helper, що вже використовують
            // інші 3 writer'и.
            window.__isDegraded = true;
            _updateSourceState({ mode: 'degraded', degraded: true, reason: hasPhysics ? 'physics_conflict' : 'stale_feed' });
          }
          if(hf && !hf.textContent.includes('STALE') && !hf.textContent.includes('OLD')){
            hf.textContent = 'DEGRADED';
            hf.style.color = '#ff9944';
            window.__isDegraded = true;
            _updateSourceState({ mode: 'degraded', degraded: true, reason: hasPhysics ? 'physics_conflict' : 'stale_feed' });
          }
          // fp199 (2026-07-16, скрін Kyrylo): computeCScore() рахує heroConfidence
          // РАНІШЕ, ніж window._lastDst/_kpSourceFreshness взагалі приходять (async,
          // pre-fetch) — тому мій fp198-мірор-фікс не встигав спрацювати, і
          // "ЯКІСТЬ ДАНИХ: Висока" лишалась поруч з щойно виставленим DEGRADED.
          // Це ЄДИНЕ місце, де ми ТОЧНО знаємо факт DEGRADED в момент його появи —
          // форсуємо узгодження тут напряму, без залежності від порядку computeCScore.
          const hcEl = document.getElementById('heroConfidence');
          if(hcEl && !hcEl.textContent.includes('Низька')){
            hcEl.textContent = 'Середня';
            hcEl.style.color = '#ffcc00';
            hcEl.title = (hcEl.title||'') + '\n\n⚠ fp199: знижено з "Висока" — статус DEGRADED виявлено після початкового розрахунку якості.';
          }
        }
      } else {
        sb.style.display = 'none';
      }
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.131','recoverable'); }
}/* NR_FN_END 236 */

/* NR_FN_BEGIN 238 */function _renderHeroHierarchy(){
  try{
    const box = (typeof el==='function') ? el('heroHierarchy') : document.getElementById('heroHierarchy');
    if(!box) return;
    // fp288: heroWhyText нижче також читає цей snapshot. Раніше `snap` був
    // const усередині вкладеного try, тому поза ним виникав ReferenceError,
    // який зовнішній catch мовчки ковтав, а текст назавжди лишався
    // «Завантаження…».
    let snap = null;
    // fp289: heroWhyText використовує Kp після блоку рендера G_now.
    // Раніше там читалась неоголошена змінна `kp`; реальний `kpN` був const
    // усередині іншого try і був недоступний. Це гарантовано кидало
    // ReferenceError та залишало «Завантаження…».
    let kp = (window.__uiState && isFinite(window.__uiState.kpNow))
      ? Number(window.__uiState.kpNow) : NaN;
    let currentG = (window.__uiState && isFinite(window.__uiState.gNow))
      ? Number(window.__uiState.gNow) : NaN;
    // PDF/Engine is preserved as a frozen reference, not rendered as permission.
    let decHtml = '<span style="color:var(--dim)">завантаження…</span>';
    try{
      snap = (typeof getEngineScore==='function') ? getEngineScore(new Date(todayKyivStr()+'T12:00:00Z')) : null;
      if(snap && isFinite(snap.eng)){
        const sc  = Math.max(-3, Math.min(3, Math.round(Number(snap.eng))));
        const v   = (typeof VERDICT_7CLASS!=='undefined') ? VERDICT_7CLASS[String(sc)] : null;
        const star= snap._expertOverride ? ' <span title="Expert override застосовано" style="color:#ffd166">★</span>' : '';
        const col = v ? v.color : 'var(--text2)';
        const lab = v ? v.label : '';
        decHtml = `<span style="font-weight:800;color:${col}">${sc>=0?'+':''}${sc}</span> <span style="color:var(--text2)">${lab}</span>${star}`;
        // v88.8.55: гарантований ресинк hero-кільця в ту саму мить, коли ми ВЖЕ підтвердили
        // (тут, вище) що snap.eng доступний. Раніше syncHero() покладався на окремий
        // getEngineScore()-виклик усередині resolveHeroSignalHierarchy_v88824() і на 400ms
        // delayed retry "навмання" (fp128) — якщо той конкретний виклик встигав РАНІШЕ за
        // момент, коли дані реально прийшли, кільце застрягало на G_now (fallback) без
        // гарантії самокорекції. Тепер ресинк прив'язаний до підтвердженого факту наявності
        // даних, а не до таймауту.
        // v88.9.13-fp194: ═══ КОРІНЬ 4-х ЗАВИСАНЬ (fp167/168/170test/191) ═══
        // Цей "гарантований ресинк" (v88.8.55) замикав нескінченну взаємну рекурсію:
        // syncHero → (останній рядок) _patchStaleLoadingDOM → _renderHeroHierarchy →
        // → syncHero → … Коло замикалось ЛИШЕ коли getEngineScore повертав дані
        // (isFinite(snap.eng)) — тому дашборд був стабільний без engine-даних і
        // миттєво висів (98.6% CPU) при будь-якій спробі їх завантажити.
        // Відтворено в jsdom: 3865 повних проходів syncHero за 45с (194К чекпойнтів).
        // Guard обмежує глибину: легітимний одноразовий ресинк зберігається,
        // повторний вхід із власного ж ланцюга — блокується.
        try{
          if(typeof syncHero==='function' && !window.__heroResyncActive){
            window.__heroResyncActive = true;
            try { syncHero(); } finally { window.__heroResyncActive = false; }
          }
        }catch(_e){ window.NRDiagnostics?.record('legacy.catch.138','recoverable'); }
      }
    }catch(e){ window.NRDiagnostics?.record('legacy.catch.139','recoverable'); }
    // 2) Фон зараз — G_now (live composite 2−Kp+ΣAᵢ)
    let gHtml = '<span style="color:var(--dim)">—</span>';
    try{
      const g = currentG;
      const kpN = (window.__uiState && isFinite(window.__uiState.kpNow)) ? Number(window.__uiState.kpNow) : NaN;
      if(isFinite(g)){
        // v88.8.35-fp56-P8: use canonical classifyStateByG(g, kp) — the single source of truth for
        // G-state (see its v87.90/v88.7 notes). The previous P4 code had its OWN thresholds
        // (g>=2 / g>-0.5 / g>-2) AND ignored the storm-override, so during a Kp≥5 storm the hero
        // background could read "сильний фон" green while the rest of the UI warned about the storm —
        // exactly the contradiction classifyStateByG was written to prevent.
        const _cls = (typeof classifyStateByG==='function') ? classifyStateByG(g, kpN) : null;
        // v88.8.36-fp56-P10: лейбли = канонічна шкала classifyG (lowercase). Раніше good='сприятливий'
        // → конфліктувало з classifyG good='Помірно сприятливий' (G=+0.73 показувало «сприятливий»).
        const _map = {
          favorable:['фон значно вище нейтралі','var(--ok)'],
          good:     ['фон вище нейтралі','var(--ok)'],
          neutral:  ['фон біля нейтралі','var(--muted)'],
          unstable: ['фон нижче нейтралі','#ffaa33'],
          tense:    ['напружений live-фон','#ff6b6b']
        };
        const _m = (_cls && _map[_cls]) ? _map[_cls] : ['нейтральний','var(--muted)'];
        const word = _m[0], col = _m[1];
        // v88.9.57-fp239 (аудит-раунд-25, Problem 3): "live Kp" завжди казав
        // "live", незалежно від реального джерела — навіть коли Kp насправді
        // OBSERVED · DELAYED на кілька годин. Той самий принцип, що вже
        // застосований до heroFreshness/Formula Audit/заголовка через
        // resolveSourceLabel().
        const _kpSrcWord = (function(){ try { const _r = resolveSourceLabel(); return _r.isLive ? 'live' : (_r.isRealObserved ? 'observed' : 'forecast'); } catch(_e){ globalThis.NRDiagnostics?.record('catch.154','recoverable');  return 'live'; } })();
        const kpTxt= isFinite(kpN) ? ` <span style="color:var(--faint);font-size:11px">· ${_kpSrcWord} Kp ${kpN.toFixed(2)}</span>` : '';
        // v88.8.51-fp128: видима арифметика — "звідки береться це число", без пояснень у тултіпах.
        // ΣAᵢ виводиться зворотно з формули G=2-Kp+ΣAᵢ (self-consistent, нічого не вигадується).
        let _breakdown = '';
        if(isFinite(kpN)){
          const _sigmaAi = g - kpDayTerm(kpN);
          _breakdown = ` <span style="color:var(--faint);font-size:10px" title="G_now = 2−Kp+ΣAᵢ (панчанга-фактори). Це НЕ вердикт дня — дивись 'РІШЕННЯ ДНЯ' вище.">= 2−Kp${kpN.toFixed(1)}${_sigmaAi>=0?'+':''}${_sigmaAi.toFixed(1)}</span>`;
        }
        // v88.8.37-fp70: видимий підпис шкали — юзер бачить +1.93 і +3.6 у 27-day без пояснення.
        // «поточна хвиля» vs «денний пік» — два різних виміри, не конфлікт.
        const _scaleNote = `<span style="font-size:9px;color:var(--faint);margin-left:4px" title="G_now = поточний live-фон (оновлюється щогодини). G_day raw у 27-day = денний пік (max Kp прогнозу). Різниця нормальна — це різні часові горизонти.">· поточна хвиля</span>`;
        gHtml = `<span style="color:var(--muted)">G_now <b style="color:${col}">${g>=0?'+':''}${g.toFixed(2)}</b> · довідковий фон, не рішення</span><span class="audit-only"> · ${word}${kpTxt}${_breakdown}${_scaleNote}</span>`;
      }
    }catch(e){ window.NRDiagnostics?.record('legacy.catch.140','recoverable'); }
    let opHtml = '<span style="color:var(--dim)">даних недостатньо</span>';
    let opColor = 'var(--muted)';
    let opBg = 'rgba(155,177,220,.06)';
    try {
      const _opSig = getCurrentOperationalSignal();
      if (!_opSig || !_opSig.decisionAvailable) {
        opHtml = '<span style="font-weight:900;color:var(--muted)">РІШЕННЯ НЕДОСТУПНЕ</span> <span style="font-size:10px;color:var(--faint)">· немає чинного денного reference</span>';
        opColor = 'var(--muted)';
        opBg = 'rgba(155,177,220,.06)';
        throw new Error('fp430_no_operational_verdict');
      }
      const _opScore = _operationalScoreFromState_v88825(_opSig.opKey);
      const _opMap = {
        favorable:['МОЖНА ДІЯТИ','var(--ok)','rgba(43,212,125,.06)'],
        good:['ПЛАНОВІ ДІЇ','var(--ok)','rgba(43,212,125,.06)'],
        neutral:['СТАНДАРТНИЙ РЕЖИМ','var(--muted)','rgba(155,177,220,.06)'],
        unstable:['ЛИШЕ ПЕРЕВІРЕНА РУТИНА','#ffaa33','rgba(255,170,51,.09)'],
        tense:['СТОП НОВИМ РІШЕННЯМ','#ff6b6b','rgba(255,107,107,.10)']
      };
      const _op = _opMap[_opSig.opKey] || _opMap.neutral;
      opColor=_op[1]; opBg=_op[2];
      const _guardNote = _opSig.guard !== 'none'
        ? ` <span style="font-size:10px;color:var(--faint)">· safety guard: ${escapeHtml(_opSig.guard)}</span>` : '';
      opHtml=`<span style="font-weight:900;color:${opColor}">${_op[0]}</span> <span style="font-weight:800;color:${opColor}">${_opScore>=0?'+':''}${_opScore}</span>${_guardNote}`;
    } catch(_e){ window.NRDiagnostics?.record('legacy.catch.141','recoverable'); }
    // v88.8.80-fp159: якщо решта пайплайну ВЖЕ має дані (G_now визначений), а decHtml
    // усе ще на дефолтному "завантаження…" — це означає, що Engine/PDF ГЕНУЇННО відсутній
    // (V3 freeze / немає бюлетеня на сьогодні), а НЕ "ще не встиг завантажитись". Раніше
    // цей рядок міг залипати на "завантаження…" назавжди, створюючи враження зламаного
    // рендеру поруч із Hero, що вже показує "можна діяти" з живих даних — плутанина.
    if (decHtml.includes('завантаження') && isFinite((window.__uiState||{}).gNow)) {
      decHtml = '<span style="color:var(--faint)">PDF/Engine недоступний на сьогодні — Hero нижче показує live-фон, НЕ вердикт дня</span>';
    }
    // 3) Якість даних — dataMode (live/partial/scenario/offline)
    // fp79 FIX: використовуємо resolveDataModeExtended() щоб розрізнити 'estimated' (Kp ≤12h, нормальний
    // 3-годинний цикл NOAA) від 'partial' (справжній delay). Раніше обидва показували "DELAYED".
    let qLab='—', qCol='var(--dim)';
    try{
      const dm = (typeof resolveDataModeExtended==='function'?resolveDataModeExtended():'live');
      // v88.9.45-fp227 (аудит-раунд-14, Помилки 1 і 4): раніше 'estimated' тут
      // завжди писав generic "ESTIMATED · Kp ≤12год (норма циклу NOAA 3год)" —
      // (а) незалежно від того, реальний observed чи справжній forecast, і
      // (б) слово "норма" для 5-годинної затримки при 3-годинному циклі NOAA
      // маніпулятивно применшувало факт як мінімум одного пропущеного циклу.
      // Тепер: для observed-гілки — resolveSourceLabel() (та сама функція, що
      // й Formula Audit/heroFreshness/верхній бейдж); формулювання "норма"
      // замінено на чесніше "допустиме fallback-вікно".
      const _rslQ = (dm === 'estimated') ? resolveSourceLabel() : null;
      const map = {
        live:      ['ДАНІ LIVE · актуальні · не оцінка дня','#9fd1ff'],
        estimated: _rslQ ? [_rslQ.combined + ' · допустиме fallback-вікно до 12г', _rslQ.color] : ['ESTIMATED · допустиме fallback-вікно до 12г','#a8d5e0'],
        partial:   ['DELAYED · орієнтовно — перевір перед важливою дією','#ffcc44'],
        scenario:  ['SCENARIO · не реальний прогноз, лише плато за поточним Kp','#ff9944'],
        offline:   ['OFFLINE · з кешу, можливо застаріле','#ff6b6b']
      };
      const m = map[dm] || map.live; qLab=m[0]; qCol=m[1];
    }catch(e){ window.NRDiagnostics?.record('legacy.catch.142','recoverable'); }
    const _fmtDayTag = (ds) => { const p=String(ds||'').split('-'); return p.length===3 ? p[2]+'.'+p[1] : ''; };
    const _todayTag = _fmtDayTag(todayKyivStr());
    const _tmTagDate = new Date(todayKyivStr()+'T12:00:00Z'); _tmTagDate.setUTCDate(_tmTagDate.getUTCDate()+1);
    const _tomorrowTag = _fmtDayTag(_tmTagDate.toISOString().slice(0,10));
    const row = (k,v,kc,timeTag)=>{
      // v88.8.37-fp70-C: явний часовий префікс (ЗАРАЗ/СЬОГОДНІ/ЗАВТРА) — головне джерело
      // плутанини був змішаний часовий горизонт. Тепер кожен рядок підписаний коли він діє.
      const _tt = timeTag ? `<span style="flex:0 0 62px;font-size:8px;font-weight:800;letter-spacing:.06em;color:var(--faint);text-transform:uppercase">${timeTag}</span>` : '<span style="flex:0 0 62px"></span>';
      return `<div style="display:flex;gap:8px;align-items:baseline;padding:6px 10px;border-top:1px solid var(--border)">`
      + _tt
      + `<span style="flex:0 0 150px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${kc||'var(--dim)'}">${k}</span>`
      + `<span style="flex:1;font-size:13px;line-height:1.25">${v}</span></div>`;
    };
    // 4) ЗАВТРА — forecast (G_day raw + PDF/Engine якщо є)
    let tomoHtml = '<span style="color:var(--dim)">—</span>';
    try{
      const _tm = new Date(todayKyivStr()+'T12:00:00Z'); _tm.setUTCDate(_tm.getUTCDate()+1);
      const _tsn = (typeof getEngineScore==='function') ? getEngineScore(_tm) : null;
      if(_tsn && isFinite(_tsn.eng)){
        const _tsc = Math.max(-3,Math.min(3,Math.round(Number(_tsn.eng))));
        const _tv = (typeof VERDICT_7CLASS!=='undefined') ? VERDICT_7CLASS[String(_tsc)] : null;
        const _tcol = _tv ? _tv.color : 'var(--text2)';
        const _tlab = _tv ? _tv.label : '';
        tomoHtml = `<span style="font-weight:800;color:${_tcol}">${_tsc>=0?'+':''}${_tsc}</span> <span style="color:var(--text2)">${_tlab}</span> <span style="color:var(--faint);font-size:10px">· прогноз</span>`;
        // v88.9.33-fp214 (аудит-раунд-4): за тим самим принципом, що й "сьогодні"
        // нижче (fp56-P8) — коли дискретний вердикт ЗАВТРА (тут, округлено -3..+3)
        // і неперервний live-тренд G_raw (бейдж heroTomorrow, статус-рядок) різняться
        // напрямом/знаком, явно позначаємо це прямо в рядку, а не лише в hover-title.
        try {
          const _tgRaw = window.__tomorrowG;
          if (isFinite(_tgRaw) && Math.abs(Math.round(_tgRaw) - _tsc) >= 1) {
            tomoHtml += ` <span class="audit-only" style="color:var(--faint);font-size:9px" title="Технічний raw-аудит, не друге рішення.">· raw-аудит=${_tgRaw>=0?'+':''}${_tgRaw.toFixed(1)}</span>`;
          }
        } catch(_e){ window.NRDiagnostics?.record('legacy.catch.143','recoverable'); }
      }
    }catch(e){ window.NRDiagnostics?.record('legacy.catch.144','recoverable'); }
    box.innerHTML =
        `<div style="display:flex;gap:8px;align-items:baseline;padding:7px 10px;background:${opBg}">`
      + `<span style="flex:0 0 62px;font-size:8px;font-weight:800;letter-spacing:.06em;color:#9cd49c;text-transform:uppercase">Сьогодні ${_todayTag}</span>`
      + `<span class="hero-label" data-basic="Зараз" style="flex:0 0 150px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:${opColor}">Оперативний стан · головний</span>`
      + `<span style="flex:1;font-size:14px;font-weight:700;line-height:1.25">${opHtml}</span></div>`
      + `<div style="display:flex;gap:8px;align-items:baseline;padding:6px 10px;border-top:1px solid var(--border)">`
      + `<span style="flex:0 0 62px;font-size:8px;font-weight:800;letter-spacing:.06em;color:var(--faint);text-transform:uppercase">Доба ${_todayTag}</span>`
      + `<span class="hero-label" data-basic="Довідково" style="flex:0 0 150px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--dim)">PDF/Engine reference · ${(function(){
          // v88.9.47-fp229 (аудит-раунд-16, Недолік 1): заголовок завжди казав
          // узагальнено "PDF/Engine", навіть коли сьогодні реально застосовано
          // verified PDF override (не розрахунок engine). Той самий принцип, що
          // вже застосований до кільця (fp215) і 3-day карток (fp215/fp224).
          try {
            const _esToday = (typeof todayKyivStr === 'function' && typeof getEngineScore === 'function')
              ? getEngineScore(new Date(todayKyivStr()+'T12:00:00Z')) : null;
            return (_esToday && _esToday._expertOverride) ? 'PDF OVERRIDE' : 'PDF/Engine';
          } catch(_e) { globalThis.NRDiagnostics?.record('catch.155','recoverable');  return 'PDF/Engine'; }
        })()}</span>`
      + `<span style="flex:1;font-size:14px;font-weight:700;line-height:1.25">${decHtml} <span style="font-size:10px;color:var(--faint)">· не дозвіл на дію</span></span></div>`
      + row((function(){ try { const _r = resolveSourceLabel(); return _r.isLive ? 'ДОВІДКОВИЙ LIVE-ФОН · НЕ РІШЕННЯ' : 'ДОВІДКОВИЙ ФОН · НЕ РІШЕННЯ (' + _r.freshnessLabel.toLowerCase() + ')'; } catch(_e){ globalThis.NRDiagnostics?.record('catch.156','recoverable');  return 'ДОВІДКОВИЙ LIVE-ФОН · НЕ РІШЕННЯ'; } })(), gHtml, null, 'Зараз '+_todayTag)
      + row((function(){
          // v88.9.48-fp230 (аудит-раунд-17, Problem 2): той самий принцип, що
          // вже застосований до "сьогодні" (fp229) — тепер і для "завтра".
          try {
            const _tmrDate = new Date(new Date(todayKyivStr()+'T12:00:00Z').getTime() + 86400000);
            const _esTmr = (typeof getEngineScore === 'function') ? getEngineScore(_tmrDate) : null;
            return 'Прогноз дня · ' + ((_esTmr && _esTmr._expertOverride) ? 'PDF OVERRIDE' : 'PDF/Engine');
          } catch(_e) { globalThis.NRDiagnostics?.record('catch.157','recoverable');  return 'Прогноз дня · PDF/Engine'; }
        })(), tomoHtml, null, 'Завтра '+_tomorrowTag)
      + row('Якість даних', `<span style="font-weight:700;color:${qCol}">${qLab}</span>`, null, '')
      + (function(){
          // v88.8.35-fp56-P8: when day-verdict and live background diverge (|Δ|≥1), explain BOTH
          // that they're different horizons AND which one leads decisions. Closes the "−3 vs −1.10
          // looks contradictory" confusion right in the hero, not only in the collapsed legend.
          try {
            const _sn = (typeof getEngineScore==='function') ? getEngineScore(new Date(todayKyivStr()+'T12:00:00Z')) : null;
            const _eng = (_sn && isFinite(_sn.eng)) ? Number(_sn.eng) : NaN;
            if (isFinite(currentG) && isFinite(_eng) && Math.abs(currentG - _eng) >= 1) {
              return `<div style="padding:6px 10px;border-top:1px solid var(--border);font-size:10px;color:var(--faint);line-height:1.4">`
                + `<b style="color:#ffaa33">Сигнали розходяться: PDF/Engine reference не є оперативним дозволом.</b> `
                + `Головний рядок застосовує обережніший оперативний стан; PDF/Engine і G_now лишаються видимими для перевірки.</div>`;
            }
          } catch(_e){ window.NRDiagnostics?.record('legacy.catch.145','recoverable'); }
          return '';
        })();
    box.style.display='block';
    // v88.8.35-fp56-P8: fill the «Чому?» accordion with a plain-language reason (Basic Mode only).
    // Uses already-computed variables: g, kp, snap, _dm45. No new fetches, no formulas exposed.
    try {
      const _why = document.getElementById('heroWhyText');
      if (_why) {
        const _kpPart = isFinite(kp) ? (kp < 2 ? 'Геомагнітний фон спокійний' : kp < 4 ? 'Геомагнітний фон помірний' : 'Геомагнітний фон активний') : '';
        const _whySig = getCurrentOperationalSignal();
        const _dayLabel = _whySig.opKey === 'tense' ? 'оперативно не починати нових справ'
          : _whySig.opKey === 'unstable' ? 'оперативно лише перевірена рутина'
          : _whySig.opKey === 'neutral' ? 'оперативно стандартний режим'
          : 'оперативно дозволені планові дії';
        // Базове пояснення записується ДО необов'язкового Panchanga enrichment,
        // тому додатковий розрахунок більше не може залишити loading-placeholder.
        _why.textContent = [_kpPart, _dayLabel].filter(Boolean).join('. ') + '.';
        try {
          const _pSnap = (typeof computePanchanga === 'function') ? computePanchanga(new Date(todayKyivStr()+'T12:00:00Z')) : null;
          const _nak = _pSnap?.nakshatra?.name || '';
          const _rahu = (_pSnap?.rahu?.active) ? 'Зараз несприятливий час доби (Раху Калам)' : '';
          const _parts = [_kpPart, _nak ? `Накшатра — ${_nak}` : '', _dayLabel, _rahu].filter(Boolean);
          if (_parts.length) _why.textContent = _parts.join('. ') + '.';
        } catch(_panchErr){ window.NRDiagnostics?.record('legacy.catch.146','recoverable'); }
      }
    } catch(_e){ window.NRDiagnostics?.record('legacy.catch.147','recoverable'); }
  }catch(e){ window.NRDiagnostics?.record('legacy.catch.148','recoverable'); }
}/* NR_FN_END 238 */

/* NR_FN_BEGIN 240 */function renderHeatStripV86(){
  const enabled = (function(){
    try { return localStorage.getItem('v86_heat') !== '0'; } catch(e){ globalThis.NRDiagnostics?.record('catch.159','recoverable');  return true; }
  })();
  const strip = document.getElementById('timingHeatStrip');
  if (!strip) return;
  if (!enabled){ strip.classList.add('v86-hidden'); return; }
  strip.classList.remove('v86-hidden');

  const slots = window._daySlots || [];
  const _now = new Date();
  const nowUTC = _now.getUTCHours();
  const currentSlotIdx = Math.floor(nowUTC / 3); // 0..7 — UTC, для лукапу даних слоту (window._daySlots)
  // v87.90 fix: лейбли показуємо в ЛОКАЛЬНОМУ часі, бо UTC дезорієнтує (юзер у Києві о 21:52 бачить "18" і не розуміє що це).
  // v88.9.6x-fp245 (аудит fp242, п.4): раніше через getTimezoneOffset() (browser TZ) —
  // якщо Kyrylo подорожує, слоти показали б ЙОГО поточний TZ замість Києва,
  // розходячись із Панчангою/Rahu (завжди Europe/Kyiv через todayKyivStr()).
  const _tzOffH = kyivOffsetHoursIntAt(_now);
  // v87.15 S4: визначаємо "рівний день" — варіативність G між слотами <0.3
  const _gVals = slots.filter(s => isFinite(s.G)).map(s => s.G);
  const _isFlat = _gVals.length >= 4 && (Math.max(..._gVals) - Math.min(..._gVals)) < 0.3;
  let _heatReference = null;
  try {
    const _hd = (typeof getEngineScore === 'function')
      ? getEngineScore(new Date(todayKyivStr()+'T12:00:00Z')) : null;
    if (_hd && isFinite(_hd.eng)) _heatReference = Number(_hd.eng);
  } catch(_eHeat){ window.NRDiagnostics?.record('legacy.catch.159','recoverable'); }
  const _hasHeatReference = _heatReference !== null;
  const _heatWindows = (typeof getInauspiciousWindowsUTC === 'function') ? getInauspiciousWindowsUTC() : [];
  const _nowPreciseH = _now.getUTCHours() + _now.getUTCMinutes() / 60;
  const _authorityNote = document.getElementById('timingAuthorityNote');
  if (_authorityNote) {
    _authorityNote.style.display = 'block';
    _authorityNote.textContent = `Кожен слот показує оперативну дію для свого часу (буря → Rahu/Yama/Gulika → raw G). PDF/Engine ${_hasHeatReference ? (_heatReference>=0?'+':'')+_heatReference : '—'} — довідковий денний сигнал, не дозвіл для всіх годин.`;
  }
  const segs = strip.querySelectorAll('.heat-seg');
  segs.forEach((seg, idx) => {
    // v87.90: лейбл — локальний час початку слоту
    const _utcStart = idx * 3;
    const _localStart = ((_utcStart + _tzOffH) % 24 + 24) % 24;
    const _localEnd = ((_utcStart + 3 + _tzOffH) % 24 + 24) % 24;
    const _labelEl = seg.querySelector('.heat-label');
    if (_labelEl) _labelEl.textContent = String(Math.floor(_localStart)).padStart(2, '0');
    seg.title = `${String(Math.floor(_localStart)).padStart(2,'0')}-${String(Math.floor(_localEnd)).padStart(2,'0')} локально (UTC ${String(_utcStart).padStart(2,'0')}-${String((_utcStart+3)%24).padStart(2,'0')})`;
    // Reset classes
    seg.classList.remove('heat-good','heat-mid','heat-bad','heat-current','heat-flat');
    seg.removeAttribute('data-gval');
    // Find matching slot
    const slot = slots.find(s => s.i === idx);
    if (!slot || !isFinite(slot.G)){
      seg.style.opacity = '0.3';
      return;
    }
    seg.style.opacity = '1';
    const g = slot.G;
    // The same canonical per-slot resolver is used by Critical windows,
    // Personal context and Day plan. Never stamp one PDF score on all hours.
    const _sw44h = window._stormWindow;
    const _stormStartHh = (_sw44h && isFinite(_sw44h.kp) && _sw44h.kp >= 5) ? parseInt(_sw44h.label, 10) : null;
    const _isStormSlotH = _stormStartHh !== null && (idx * 3 >= _stormStartHh || (isFinite(slot.kp) && slot.kp >= 5));
    const _slotDecision = (typeof resolveSlotDecision === 'function') ? resolveSlotDecision({
      slotStartH: _utcStart,
      slotEndH: _utcStart + 3,
      nowH: _nowPreciseH,
      slotG: g,
      dayScore: _heatReference,
      windows: _heatWindows,
      stormActive: _isStormSlotH
    }) : null;
    const _slotBlocked = !!(_slotDecision && _slotDecision.hasBlockedSegment);
    const _slotAction = _slotDecision?.slotAction || '';
    // A negative daily reference/operational contour cannot render a green
    // "МОЖНА" slot. The slot can only identify the least restrictive routine
    // window; it cannot overturn the single daily verdict.
    const _dayRestrictedHeat = isFinite(_heatReference) && Number(_heatReference) < 0;
    const _slotRoutine = !_slotBlocked && (_dayRestrictedHeat || _slotAction.includes('рутин') || _slotAction.includes('обереж') || _slotAction.includes('перевір') || _slotAction.includes('без нових') || _slotAction.includes('без жодних'));
    const _slotAllowed = !_slotBlocked && !_slotRoutine && !_dayRestrictedHeat && g >= 0.5;
    if (_slotBlocked) {
      seg.classList.add('heat-bad');
      seg.setAttribute('data-gval', 'БЛОК');
    } else if (_slotAllowed) {
      seg.classList.add('heat-good');
      seg.setAttribute('data-gval', 'МОЖНА');
    } else {
      seg.classList.add('heat-mid');
      seg.setAttribute('data-gval', _slotRoutine ? 'РУТИНА' : 'СТАНД.');
    }
    seg.title += ` · Оперативно: ${_slotAction || 'даних недостатньо'}; raw G ${g>=0?'+':''}${g.toFixed(1)}; PDF/Engine reference ${_hasHeatReference ? (_heatReference>=0?'+':'')+_heatReference : '—'}`;
    // Mark current time slot
    if (idx === currentSlotIdx) seg.classList.add('heat-current');
    if (_isFlat && !_slotBlocked) seg.classList.add('heat-flat');
  });
}/* NR_FN_END 240 */

/* NR_FN_BEGIN 241 */function renderGRadialV86(g, kp, ai){
  const enabled = (function(){
    try { return localStorage.getItem('v86_radial') !== '0'; } catch(e){ globalThis.NRDiagnostics?.record('catch.160','recoverable');  return true; }
  })();
  const v86Wrap = document.getElementById('heroRingV86Wrap');
  const legacyWrap = document.getElementById('heroRing');
  if (!v86Wrap || !legacyWrap) return;
  if (!enabled) {
    // Hide v86, show legacy
    v86Wrap.classList.add('v86-hidden');
    legacyWrap.style.cssText += ';display:flex!important';
    return;
  }
  // Enable v86 mode
  v86Wrap.classList.remove('v86-hidden');
  legacyWrap.style.display = 'none';

  // v88.9.39-fp221 АРХІТЕКТУРНА ЗМІНА (аудит-раунд-8): fp212–fp219 ховали
  // сегменти/легенду/дельту кільця, коли є PDF-вердикт — намір був не давати
  // хибне враження, що дуги розкладають вердикт. Але наслідок: коли вердикт
  // є (а він є майже завжди, бо expert_overrides покриває майже кожен день),
  // кільце ставало порожнім сірим колом — сам індикатор переставав працювати.
  // Нове рішення: кільце ЗАВЖДИ показує G_now (live, неперервний) з повною
  // декомпозицією сегментів. PDF-вердикт НІКОЛИ не змішується з цим кільцем —
  // він живе окремо в heroHierarchy ("СЬОГОДНІ" рядок), heroBulletin
  // (статус-рядок "PDF OVERRIDE: −3★") і великому текстовому вердикті під
  // індексами дня. Кільце більше НЕ читає window.__heroVerdictDisplay.
  // Сегменти й легенда — завжди видимі.

  // fp325: ONE DECISION UX. A verified PDF/Engine verdict is the only
  // primary number. Raw G_now arcs/legend would visually decompose a
  // different metric, so hide them while a final verdict exists.
  const _fp325Verdict = window.__heroVerdictDisplay || null;
  const _fp325HasVerdict = !!(_fp325Verdict && _fp325Verdict.hasVerdict && isFinite(_fp325Verdict.val));
  try {
    const _segLayer = document.getElementById('v86Segments');
    const _legend = document.getElementById('v86Legend');
    ['v86segKp','v86segLi','v86segMi','v86segEi','v86segPi','v86segDi'].forEach(_id => {
      const _seg = document.getElementById(_id);
      if (_seg) _seg.style.opacity = _fp325HasVerdict ? '0.10' : '1';
    });
    if (_legend) _legend.style.display = _fp325HasVerdict ? 'none' : '';
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.160','recoverable'); }

  // Values (absolute for segment size, sign for visual direction later)
  // v86.0.1: NaN-safety — якщо ai undefined, robust fallback
  const safeAi = ai || {};
  const kpPart = isFinite(kp) ? kpDayTerm(kp) : 0;
  const segs = [
    { id:'v86segKp', val: isFinite(kpPart) ? kpPart : 0 },
    { id:'v86segLi', val: isFinite(safeAi.Li) ? safeAi.Li : 0 },
    { id:'v86segMi', val: isFinite(safeAi.Mi) ? safeAi.Mi : 0 },
    { id:'v86segEi', val: isFinite(safeAi.ei) ? safeAi.ei : 0 },
    { id:'v86segPi', val: isFinite(safeAi.Pi) ? safeAi.Pi : 0 },
    { id:'v86segDi', val: isFinite(safeAi.Di) ? safeAi.Di : 0 }
  ];
  const rawTotal = segs.reduce((s,x) => s + Math.abs(x.val), 0);
  const R = 92;
  const C = 2 * Math.PI * R; // ≈ 578
  // v87.3 B3/B6: якщо всі сегменти нульові — показати 6 рівних тьмяних частин (neutral state)
  const neutral = rawTotal < 0.01;
  const totalAbs = neutral ? 6 : rawTotal;
  // v87.3 B2: невеликий розрив між активними сегментами (запобігає злипанню)
  const GAP_PX = 2;
  const activeCount = neutral ? 6 : segs.filter(s => Math.abs(s.val) >= 0.05).length;
  const totalGap = activeCount > 1 ? GAP_PX * activeCount : 0;
  // v88.9.43-fp225 FIX-CRITICAL (doc14/doc15, Problem 5, доопрацювання):
  // fp224 масштабував довжину дуги за |G|/5, АЛЕ для "neutral" (всі компоненти
  // справді нульові, rawTotal<0.01) примусово ставив масштаб=1 — тобто якраз
  // ЦЕЙ край-кейс (G=0, все спокійно) все ще малював майже ПОВНЕ сіре коло,
  // хоча мав би бути НАЙменшим. Прибрано цей примусовий override — масштаб
  // тепер уніфіковано за |G|/5 для БУДЬ-якого стану, включно з neutral
  // (природно дає малу/порожню дугу, бо G≈0, коли компоненти≈0).
  //
  // Другий край-кейс з аудиту (сильна компенсація: A1=+2, A2=−2 → G=0, але
  // система насправді нестабільна) НЕ вирішується масштабуванням довжини дуги
  // взагалі — |G| справді мале в цьому випадку, і дуга справді має бути
  // короткою (net-результат дійсно слабкий). Замість спроби "показати
  // нестабільність через довжину дуги" (що суперечило б самій ідеї "довжина
  // = сила net G"), додано ОКРЕМИЙ індекс компенсації C = 1 − |G|/Σ|Aᵢ| —
  // текстовий маркер поруч із кільцем, що явно попереджає про приховану
  // внутрішню нестабільність, коли компоненти сильно гасять одне одного.
  const _gMagnitude = isFinite(g) ? Math.abs(g) : 0;
  // v88.9.51-fp233 FIX-CRITICAL (аудит-раунд-19, Problem 2): раніше floor 0.08
  // застосовувався БЕЗУМОВНО — тому "всі компоненти = 0" (справжня відсутність
  // активності) давало 7.8% дуги, майже не відрізняючись від "+2/−2" (7.9%).
  // Тепер: немає активності → дуга РІВНО 0%. Floor лише коли компоненти є.
  const _hasActivity = rawTotal > 1e-9;
  // v88.9.51-fp233 FIX (Problem 3): режим компенсації — коли net-G малий, але
  // реальна активність висока (компоненти гасять одне одного), масштабуємо
  // дугу за Σ|Aᵢ| (реальна активність), а не за |G| (net≈0), і рендеримо
  // штриховано. Інакше сильна компенсація виглядала як спокій.
  const _compensationIdx = (_hasActivity) ? Math.max(0, 1 - (_gMagnitude / rawTotal)) : 0;
  const _compensationMode = _hasActivity && _compensationIdx >= 0.4 && rawTotal >= 1.5;
  const _magnitudeScale = !_hasActivity ? 0
    : _compensationMode ? Math.max(0.08, Math.min(1, rawTotal / 5))
    : Math.max(0.08, Math.min(1, _gMagnitude / 5));
  const usableC = Math.max(C - totalGap, C * 0.5) * _magnitudeScale;
  try {
    // v88.9.52-fp234 (Problem 4): справжня штриховка — окреме halo-кільце
    // з повторюваним патерном 6/4, а не псевдо-dasharray на сегментах.
    const _halo = document.getElementById('v86CompensationHalo');
    if (_halo) _halo.style.opacity = _compensationMode ? '0.85' : '0';
  } catch(_eHalo){ window.NRDiagnostics?.record('legacy.catch.161','recoverable'); }
  try {
    const _compEl = document.getElementById('v86CompensationNote');
    if (_compEl) {
      if (_compensationMode) {
        const _pos = segs.filter(s=>s.val>0).reduce((a,b)=>a+b.val,0);
        const _neg = segs.filter(s=>s.val<0).reduce((a,b)=>a+b.val,0);
        // v88.9.52-fp234 (Problem 5): у цьому режимі довжина дуги означає
        // Σ|Aᵢ| (gross activity), а не |G| — той самий візуальний канал для
        // іншої величини. Тому явний маркер, а не лише дрібний пояснювальний
        // текст: користувач має бачити, що шкала змінилась.
        _compEl.innerHTML = `<b style="color:#ffd166">GROSS ACTIVITY</b><br>⚠ компенсація: +${_pos.toFixed(1)} / ${_neg.toFixed(1)} → G≈${g.toFixed(2)}<br><span style="color:var(--faint)">дуга = Σ|Aᵢ|, не |G|</span>`;
        _compEl.style.display = '';
        _compEl.title = `Σ|Aᵢ|=${rawTotal.toFixed(2)}, але |G|=${_gMagnitude.toFixed(2)} (C=${_compensationIdx.toFixed(2)}).\nСильні протилежні фактори гасять одне одного — net-результат слабкий, але система НЕ спокійна.\nДуга масштабована за реальною активністю Σ|Aᵢ| (не за net-G) і штрихована саме тому.`;
      } else {
        _compEl.textContent = '';
        _compEl.style.display = 'none';
      }
    }
  } catch(_eComp){ window.NRDiagnostics?.record('legacy.catch.162','recoverable'); }
  const _segLabels = { v86segKp:'2−Kp (геомагнітний)', v86segLi:'Lᵢ (місяць)', v86segMi:'Mᵢ (затемнення)', v86segEi:'eᵢ (події)', v86segPi:'Pᵢ (панчанга)', v86segDi:'Dᵢ (Dst-буря)' };
  let cursor = 0;
  segs.forEach(s => {
    const absVal = neutral ? 1 : Math.abs(s.val);
    const share = absVal / totalAbs;
    const isActive = neutral || absVal >= 0.05;
    const segLen = isActive ? usableC * share : 0;
    const gap = C - segLen;
    const el = document.getElementById(s.id);
    if (!el) return;
    el.setAttribute('stroke-dasharray', `${segLen.toFixed(2)} ${gap.toFixed(2)}`);
    el.setAttribute('stroke-dashoffset', `${(-cursor).toFixed(2)}`);
    // v88.9.39-fp221: сегменти більше НЕ ховаються за вердиктом — кільце
    // завжди показує G_now-декомпозицію (див. коментар на початку функції).
    el.style.display = '';
    // v87.3 B1/B5: повний hide нульових сегментів (усуває фантомні крапки)
    el.style.opacity = neutral ? '0.35' : (isActive ? '1' : '0');
    // v88.9.41-fp223 FIX-CRITICAL (аудит-раунд-10, Problem 1): раніше колір
    // сегмента визначався ТИПОМ компонента (Pᵢ завжди #37d39a зелений, з HTML),
    // незалежно від знаку значення — великий негативний Pᵢ=−0.8 фарбувався
    // тим самим зеленим, що й позитивний внесок, тому кільце виглядало
    // переважно "позитивним" при насправді від'ємній сумі. Тепер колір
    // ЗАВЖДИ кодує знак: зелений=позитивний, червоний/помаранчевий=негативний,
    // сірий=нейтральний(~0). Тип компонента лишається впізнаваним через
    // легенду (підписи назв) і title-tooltip на самому сегменті.
    // v88.9.42-fp224 FIX (аудит-раунд-11, Problem 6): fp223 прибрав власний
    // колір типу компонента на користь суто знакового (зелений/червоний) —
    // це вирішило Problem 1 (fp223), але створило нову: 2−Kp і Pᵢ, обидва
    // негативні, стали однаковим червоним — легенда й кільце більше не
    // показували, ЯКИЙ сегмент де. Компроміс за рекомендацією аудиту:
    // повертаємо ВЛАСНИЙ колір типу (ідентичність), а знак передаємо
    // насиченістю/яскравістю ТОГО САМОГО кольору (негатив = притлумлений
    // відтінок, не інший колір) + товщиною (було раніше) + title-tooltip.
    const _typeColors = { v86segKp:'#ffb84d', v86segLi:'#8da2ff', v86segMi:'#ff6b6b', v86segEi:'#d28cff', v86segPi:'#37d39a', v86segDi:'#58c7ff' };
    const _typeColorsDim = { v86segKp:'#8a6329', v86segLi:'#4d5687', v86segMi:'#8a3a3a', v86segEi:'#6e4a87', v86segPi:'#1e6e52', v86segDi:'#2e6b80' };
    if (!neutral && isActive) {
      const isNeg = s.val < 0;
      const _baseCol = _typeColors[s.id] || '#8b93a8';
      const _dimCol = _typeColorsDim[s.id] || '#555b6b';
      el.setAttribute('stroke-width', isNeg ? '8' : '12');
      el.setAttribute('stroke', isNeg ? _dimCol : _baseCol);
      el.style.filter = isNeg ? 'none' : `drop-shadow(0 0 6px ${_baseCol})`;
    } else {
      el.setAttribute('stroke-width', '12');
      el.setAttribute('stroke', '#8b93a8');
      el.style.filter = 'none';
    }
    try {
      const _lbl = _segLabels[s.id] || s.id;
      const _existingTitle = el.querySelector('title');
      const _titleText = `${_lbl}: ${s.val >= 0 ? '+' : ''}${s.val.toFixed(2)}`;
      if (_existingTitle) { _existingTitle.textContent = _titleText; }
      else { const _t = document.createElementNS('http://www.w3.org/2000/svg', 'title'); _t.textContent = _titleText; el.appendChild(_t); }
    } catch(_eTip){ window.NRDiagnostics?.record('legacy.catch.163','recoverable'); }
    if (isActive) cursor += segLen + (activeCount > 1 ? GAP_PX : 0);
  });
  // v88.9.42-fp224 (Problem 6, легенда): узгоджено з новою логікою сегментів —
  // крапка знову власний колір типу (притлумлений при негативі, як і сегмент),
  // а не суто знаковий зелений/червоний. Додано текстовий +/−N.NN поруч із
  // назвою — легенда тепер показує тип (колір+назва), знак (+/−) і величину
  // (число) одночасно, без потреби гадати за одним лише кольором.
  try {
    const _typeColors2 = { v86segKp:'#ffb84d', v86segLi:'#8da2ff', v86segMi:'#ff6b6b', v86segEi:'#d28cff', v86segPi:'#37d39a', v86segDi:'#58c7ff' };
    const _typeColorsDim2 = { v86segKp:'#8a6329', v86segLi:'#4d5687', v86segMi:'#8a3a3a', v86segEi:'#6e4a87', v86segPi:'#1e6e52', v86segDi:'#2e6b80' };
    segs.forEach(s => {
      const _dot = document.querySelector(`#v86Legend [data-seg="${s.id}"]`);
      const _isNeutral = Math.abs(s.val) < 0.05;
      if (_dot) _dot.style.background = _isNeutral ? '#8b93a8' : (s.val < 0 ? (_typeColorsDim2[s.id] || '#555b6b') : (_typeColors2[s.id] || '#8b93a8'));
      const _valEl = document.querySelector(`#v86Legend [data-segval="${s.id}"]`);
      // v88.9.43-fp225 (doc14, Problem 6): раніше число ховалось для майже-
      // нульових значень — але явний приклад аудиту хоче бачити "Lᵢ +0.00"
      // завжди, не лише для помітних значень. Товщина сама по собі недостатньо
      // передає знак — число обов'язкове завжди.
      // v88.9.45-fp227 (аудит-раунд-14, Помилка 5): притлумлений відтінок
      // кольору (fp224) сам по собі недостатньо помітний на 6px крапці —
      // користувач все одно міг читати "зелений=позитивний". Додано явний
      // ▼/▲ перед числом — однозначний незалежно від сприйняття кольору.
      if (_valEl) _valEl.textContent = ' ' + (s.val >= 0 ? '▲+' : '▼') + s.val.toFixed(2);
    });
  } catch(_eLg){ window.NRDiagnostics?.record('legacy.catch.164','recoverable'); }
  // Central G-value
  const vEl = document.getElementById('v86GVal');
  if (vEl) {
    // fp425: center follows the same explicit display contract as Hero.
    // With an available operational verdict it shows the discrete state;
    // otherwise it shows continuous G_now as reference-only context.
    const _vDisplay = window.__heroVerdictDisplay || null;
    const _hasFinalDecision = !!(_vDisplay && _vDisplay.hasVerdict && isFinite(_vDisplay.val));
    const _shown = _hasFinalDecision ? Number(_vDisplay.val) : g;
    // v88.9.41-fp223 (аудит-раунд-10, Problem 4): кільце показувало -1.5
    // (1 знак), а рядок "ЗАРАЗ" — -1.47 (2 знаки) — те саме число, різна
    // точність відображення виглядало як два різних значення. Уніфіковано.
    vEl.textContent = isFinite(_shown)
      ? (_shown >= 0 ? '+' : '') + (_hasFinalDecision ? String(Math.round(_shown)) : _shown.toFixed(2))
      : '—';
    vEl.style.color = _shown >= 1 ? '#7fe3a6' : _shown >= -1 ? '#ffd77a' : '#ff9f9f';
    vEl.style.textShadow = _shown >= 1 ? '0 0 12px rgba(127,227,166,.3)'
                         : _shown >= -1 ? '0 0 12px rgba(255,210,110,.3)'
                         : '0 0 12px rgba(255,120,120,.3)';
    try {
      const _lbl = document.getElementById('v86GLabel');
      if (_lbl) _lbl.textContent = _hasFinalDecision ? 'ОПЕРАТИВНИЙ СТАН' : 'G_NOW';
    } catch(_e){ window.NRDiagnostics?.record('legacy.catch.165','recoverable'); }
  }
  // v88.9.31-fp212: евристичний діапазон мінливості G_now (НЕ калібрований статистичний CI —
  // не плутати з реальним 95% CI engine v18.5 backtest у backtestBadgeTitle, той — справжній
  // біноміальний ДІ на n=280, залишено без змін).
  // Розрахунок: σ = sqrt(kpDelta² + eventUncertainty²); kpDelta з last-8 NOAA Kp obs.
  const ciEl = document.getElementById('v86CI');
  if (ciEl) {
    const _vdCI = window.__heroVerdictDisplay || null;
    if (_vdCI && _vdCI.hasVerdict && isFinite(_vdCI.val)) {
      // fp326: live raw already has a dedicated hierarchy row; do not repeat it inside the medallion.
      ciEl.textContent = '';
      ciEl.title = '';
      ciEl.style.display = 'none';
    } else if (isFinite(g) && typeof computeConfidenceBand === 'function') {
      try {
        const cb = computeConfidenceBand(kp, _lastKpObsJson);
        // v88.9.39-fp221: кільце тепер ЗАВЖДИ показує G_now (не вердикт) —
        // цей діапазон завжди про той самий G_now, що в центрі, тому гейтинг
        // за вердиктом більше не потрібен (раніше ховали, коли центр
        // показував вердикт; тепер центр ніколи не показує вердикт).
        if (cb && isFinite(cb.delta) && cb.delta > 0) {
          // v88.9.41-fp223 (аудит-раунд-10, Problem 2): "± 0.7" без слова в
          // головному крузі виглядав як звичний символ довірчого інтервалу.
          // Title вже пояснював, але видимий текст — ні. Додано слово прямо
          // в текст (коротко, щоб влізло під кільце).
          ciEl.textContent = 'мінливість ± ' + cb.delta.toFixed(1);
          // Статистичні терміни з конкретним означенням (калібрований перцентиль
          // розподілу похибки) сюди не підходять: це евристика
          // σ=sqrt(kpDelta²+0.5²) з мінливості Kp, не відкалібрований розподіл
          // залишків проти GT. Тому в назві/title лишається тільки нейтральне
          // "евристичний діапазон мінливості", без множників нормального
          // розподілу (раніше тут був і "×1.96" — теж прибрано, fp213).
          ciEl.title = `Евристичний діапазон мінливості ≈ ±${cb.delta.toFixed(1)}.\nKp variability ${cb.kpDelta.toFixed(1)} + event uncertainty 0.5.\nЧим менше — тим стабільніший прогноз.\n\n⚠ Це НЕ статистичний довірчий інтервал — емпіричної калібровки проти GT ще не проведено.`;
          ciEl.style.display = '';
        } else {
          ciEl.style.display = 'none';
        }
      } catch(e) { globalThis.NRDiagnostics?.record('catch.161','recoverable');  ciEl.style.display = 'none'; }
    } else {
      ciEl.style.display = 'none';
    }
  }
  // fp325 final pass: segment render above writes opacity after the initial
  // guard. Apply one-decision presentation last, after every raw element was
  // updated. Raw remains available in the labelled hierarchy audit row.
  if (_fp325HasVerdict) {
    try {
      ['v86segKp','v86segLi','v86segMi','v86segEi','v86segPi','v86segDi','v86CompensationHalo'].forEach(_id => {
        const _el = document.getElementById(_id);
        if (_el) _el.style.display = 'none';
      });
      const _note = document.getElementById('v86CompensationNote');
      const _delta = document.getElementById('v86DeltaInline');
      const _legacyCaption = document.getElementById('heroLegendCaption');
      const _legacyMoon = document.getElementById('heroMoonPhaseIcon');
      const _track = document.getElementById('v86DecisionTrack');
      const _decision = Number(_fp325Verdict.val);
      const _decisionColor = _decision >= 1 ? '#37d39a' : (_decision <= -1 ? '#ff6b78' : '#ffd166');
      if (_note) _note.style.display = 'none';
      if (_delta) _delta.style.display = 'none';
      // fp327: these legacy G_now captions belong to the old ring and were
      // overlapping the decision medallion and hero content.
      if (_legacyCaption) _legacyCaption.style.display = 'none';
      if (_legacyMoon) _legacyMoon.style.display = 'none';
      if (_track) {
        _track.setAttribute('stroke', _decisionColor);
        _track.style.opacity = '0.78';
        _track.style.filter = `drop-shadow(0 0 7px ${_decisionColor})`;
      }
    } catch(_e){ window.NRDiagnostics?.record('legacy.catch.166','recoverable'); }
  }
}/* NR_FN_END 241 */

/* NR_FN_BEGIN 254 */function _renderHeroCause(g, kp) {
  const whyRows = el('whyRows');
  const whyMain = el('whyMain');
  if (!whyRows) return;
  // fp34: don't overwrite real content with "Дані завантажуються" placeholder.
  // Only write placeholder on FIRST render (when whyRows is empty/—).
  // Otherwise keep previous render so user doesn't see "loading" while data exists.
  if (!isFinite(g)) {
    const _curTxt = (whyRows.textContent || '').trim();
    if (!_curTxt || _curTxt === '—' || _curTxt === '') {
      whyRows.innerHTML = '<span style="color:var(--dim)">Дані завантажуються…</span>';
    }
    return;
  }

  // fp406: positive factors remain visible but must not look like a second
  // green verdict when the canonical operational decision is restrictive.
  let _operationalCritical406 = false;
  try {
    const _sig406 = (typeof resolveDaySignal_v88825 === 'function') ? resolveDaySignal_v88825() : null;
    _operationalCritical406 = Number.isFinite(Number(_sig406?.decisionScore)) && Number(_sig406.decisionScore) <= -1;
  } catch(_e406){ window.NRDiagnostics?.record('legacy.catch.185','recoverable'); }

  // v85b: read from __uiState.ai instead of DOM gDecompChips
  const _ai = window.__uiState?.ai;
  const factors = [];
  if (isFinite(kp)) factors.push({ name: '2−Kp', val: Math.round(kpDayTerm(kp) * 10) / 10, label: 'геомагнітний' });
  if (_ai) {
    if (_ai.Li !== 0) factors.push({ name: 'Lᵢ', val: _ai.Li, label: 'місяць' });
    if (_ai.Mi !== 0) factors.push({ name: 'Mᵢ', val: _ai.Mi, label: 'затемнення' });
    if (_ai.ei !== 0) factors.push({ name: 'eᵢ', val: _ai.ei, label: 'події' });
    if (_ai.Pi !== 0) factors.push({ name: 'Pᵢ', val: _ai.Pi, label: 'панчанга' });
    if ((_ai.Di || 0) !== 0) factors.push({ name: 'Dᵢ', val: _ai.Di, label: 'DST' });
    // v88.7.8 FIX-H: Snᵢ (sunspot penalty) — раніше схований у tooltip, тепер повноцінний chip.

    // Add zero factors for neutral display
    const zeroNames = ['Lᵢ','Mᵢ','eᵢ','Pᵢ','Dᵢ'];
    const zeroLabels = { 'Lᵢ':'місяць', 'Mᵢ':'затемнення', 'eᵢ':'події', 'Pᵢ':'панчанга', 'Dᵢ':'DST' };
    for (const nm of zeroNames) {
      if (!factors.find(f => f.name === nm)) factors.push({ name: nm, val: 0, label: zeroLabels[nm] });
    }
  }

  factors.sort((a, b) => Math.abs(b.val) - Math.abs(a.val));
  const mainName = factors[0]?.name;

  // v79: split into active and neutral factors
  const activeFact = factors.filter(f => Math.abs(f.val) >= 0.05);
  const neutralFact = factors.filter(f => Math.abs(f.val) < 0.05);

  // v87.6 Крок 2: Cause-chain — top-3 активних фактори як 3 речення "причина → наслідок"
  const chainEl = el('whyCauseChain');
  if (chainEl) {
    // v88.8.35-fp13 EE: семантика 2−Kp.
    // 2−Kp — це ВКЛАД у композитний G. f.val < 0 ⇒ Kp > 2 (тобто збурений геомагнітний фон).
    // Раніше pos писалось "фон спокійний" → семантично хибно, бо при Kp = 5.3 ВКЛАД −3.3 — це G1-буря.
    // Тепер тексти описують реальний фізичний стан, а не знак вкладу:
    const _effects = {
      '2−Kp': { neg:'геомагнітний фон активний/збурений', pos:'геомагнітний фон спокійний' },
      'Lᵢ':   { neg:'місячна фаза тисне',           pos:'місяць у ресурсі' },
      'Mᵢ':   { neg:'затемнення активне',           pos:'затемнень немає' },
      'eᵢ':   { neg:'астроподії напружені',         pos:'астроподії сприяють' },
      'Pᵢ':   { neg:'панчанга напружена',           pos:'панчанга підтримує' },
      'Dᵢ':   { neg:'Dst-буря тисне',               pos:'Dst спокійний' }
    };
    const _top3 = activeFact.slice(0, 3);
    if (_top3.length > 0) {
      chainEl.innerHTML = _top3.map(f => {
        const sign = f.val > 0 ? '+' : '';
        const isKp = f.name === '2−Kp';
        // v88.9.34-fp215 FIX-CRITICAL (аудит-раунд-5, Problem 3): для 2−Kp текст
        // уже описував ФІЗИЧНИЙ стан (neg='спокійний'), але стрілка (dir) і
        // колір-клас (cls) досі бралися за сирим арифметичним знаком val=2−Kp —
        // тим самим правилом, що й для Pᵢ/Lᵢ/etc, де val<0 дійсно означає
        // "погано". Для Kp це давало пряму суперечність: "↓ −0.7 — фон
        // спокійний" (слово=добре, стрілка+колір=погано). Тепер для Kp обидва
        // похідні від ФІЗИЧНОГО стану (ті самі пороги, що вже в
        // renderKpContribution, fp212: <3 спокійно, 3–5 підвищено, ≥5 буря),
        // а не від сирого знаку компонента формули.
        const _kpPhysical = isKp ? (2 - f.val) : null; // val = 2−Kp → Kp = 2−val
        const dir = isKp
          ? (_kpPhysical >= 3 ? '↑' : '↓')
          : (f.val > 0 ? '↑' : '↓');
        const eff  = _effects[f.name] || { neg:'додає ризик', pos:'сприяє' };
        // Для 2−Kp інверсна семантика: f.val < 0 (Kp вище за 2) = негативний геомагнітний стан.
        // Хоч у формулі це додатний вклад у G (бо ваш G = 2 − Kp + ΣAᵢ — більше Kp ⇒ менше G).
        // Класс CSS залишаємо за знаком вкладу (для color), але текст — фізично коректний.
        const txt0  = isKp
                   ? (f.val > 0 ? eff.pos : eff.neg)  // словник 2−Kp: neg = "активний/збурений"
                   : (f.val > 0 ? eff.pos : eff.neg);
        // v88.9.42-fp224 FIX (аудит-раунд-11, Problem 8): словесна категорія
        // (напр. "панчанга напружена") не враховувала МАГНІТУДУ значення —
        // Pᵢ=−0.1 (майже нейтрально) і Pᵢ=−2.0 (реально сильний вплив)
        // отримували ту саму формулу-опис. Тепер для слабких значень (|val|<0.3)
        // додається пом'якшувальне "слабко" — не змінюючи саму категорію.
        const txt = Math.abs(f.val) < 0.3 ? ('слабко ' + txt0) : txt0;
        const cls0 = isKp
          ? (_kpPhysical >= 3 ? 'is-neg' : 'is-pos') // фізично: буря/підвищено = погано, спокійно = добре
          : (f.val > 0 ? 'is-pos' : 'is-neg');
        const cls = (_operationalCritical406 && cls0 === 'is-pos') ? '' : cls0;
        return `<div class="why-cause-row ${cls}">`
             + `<span class="wcr-cause">${f.name} (зараз) ${dir} ${sign}${f.val.toFixed(1)}</span>`
             + `<span class="wcr-arrow">→</span>`
             + `<span class="wcr-effect">${txt}</span>`
             + `</div>`;
      }).join('');
    } else {
      chainEl.innerHTML = '';
    }
  }

  const pc = _lastPanchCtx;
  const panchDetail = pc ? [pc.tithi?.name, pc.karana?.name].filter(Boolean).join(' · ') : '';
  const panchWarn = pc?.karana?.isVishti ? ' ⛔' : '';
  function _panchEffect(pi) {
    const v = Number(pi || 0);
    if (v >= 1.5) return 'підтримує день';
    if (v <= -1.5) return 'створює напруження';
    if (v < -0.3) return 'додає нестабільність';
    if (v > 0.3) return 'сприяє';
    return 'не впливає';
  }

  // Active factors with full detail
  let html = activeFact.map(f => {
    const col = f.val > 0 ? (_operationalCritical406 ? '#9bb1dc' : '#2bd47d') : '#ff6b6b';
    const sign = f.val > 0 ? '+' : '';
    const dir = f.val > 0 ? '↑' : '↓';
    const isMain = f.name === mainName;
    let detail = '';
    if (f.name === 'Pᵢ') {
      const effect = _panchEffect(f.val);
      detail = panchDetail ? ` <span style="color:var(--faint);font-size:10px">${effect} (${panchDetail}${panchWarn})</span>` : '';
    }
    if (f.name === 'eᵢ') {
      // v83d: show which event caused the eᵢ penalty
      const _eTip = window.__uiState?.ai?.eTip || '';
      const _eLines = _eTip.split('\n').filter(l => /^[+-]?\d/.test(l.trim()) && !/\bBz\s*=\b|\bVsw\s*=\b/.test(l));
      if (_eLines.length) {
        const _eNames = _eLines.map(l => l.replace(/^[+-]?\d+\s*—\s*/, '').replace(/\s*\(≈\).*$/, '').trim()).filter(Boolean);
        detail = _eNames.length ? ` <span style="color:var(--faint);font-size:10px">${_eNames.join(', ')}</span>` : '';
      }
    }
    return `<div class="why-row${isMain ? ' is-main' : ''}">`
      + `<div class="why-name">${f.name} <span style="color:var(--dim);font-size:11px">${f.label} (зараз)</span>${detail}</div>`
      + `<div class="why-val" style="color:${col}">${sign}${f.val.toFixed(1)}</div>`
      + `<div class="why-dir" style="color:${col}">${dir}</div>`
      + `</div>`;
  }).join('');

  // v85b-F7: Neutral factors — each as dimmed row (не злита в 1 рядок)
  // v87.7d: маркерний клас is-neutral для CSS auto-hide коли cause-chain активний
  if (neutralFact.length > 0) {
    html += neutralFact.map(f => {
      return `<div class="why-row is-neutral" style="opacity:.5">`
        + `<div class="why-name" style="color:var(--faint)">${f.name} <span style="color:var(--dim);font-size:11px">${f.label}</span></div>`
        + `<div class="why-val" style="color:var(--faint)">0.0</div>`
        + `<div class="why-dir" style="color:var(--faint)">•</div>`
        + `</div>`;
    }).join('');
  }

  whyRows.innerHTML = html || '<span style="color:var(--dim)">Усі фактори нейтральні</span>';

  if (whyMain) {
    const d = activeFact[0];
    const d2 = activeFact[1];
    if (d) {
      // v85b-F4: use raw panchanga total (same source as Panchanga card verdict) to avoid desync
      const panchTotal = (pc && typeof pc.pclTotal === 'number') ? pc.pclTotal
                       : (pc?.aiComponents?.Pi || 0);
      const pTxt = panchTotal <= -2 ? 'Панчанга також погіршує фон.'
                 : panchTotal <= -1 ? 'Панчанга злегка тисне.'
                 : panchTotal >=  2 ? 'Панчанга посилює день.'
                 : panchTotal >=  1 ? 'Панчанга частково підтримує.'
                 : 'Панчанга нейтральна.';
      const secondTxt = d2 ? ` ${d2.label} (${d2.val>0?'+':''}${d2.val.toFixed(1)}) теж впливає.` : '';
      // v83e: use shared driver label from computeTopDrivers
      const _td = window._lastTopDrivers;
      let dLabel = d.label;
      if (d.name === 'eᵢ' && _td?.mainLabel && _td.main?.key === 'ei') {
        dLabel = _td.mainLabel;
      }
      // v83e: event breakdown under whyMain
      let eBreakdownHtml = '';
      if (Math.abs(d.val) >= 0.5 && d.name === 'eᵢ') {
        const _eTop = parseETipTop(window.__uiState?.ai?.eTip || '', 3);
        if (_eTop.length) {
          eBreakdownHtml = '<div style="margin-top:6px;display:flex;flex-direction:column;gap:3px">'
            + _eTop.map(ev => `<div style="display:flex;justify-content:space-between;font-size:12px"><span>${driverIcon(ev.value)} ${ev.label}</span><span style="font-weight:700;color:${ev.value<0?'#ff9aa5':'#7ee0a0'}">${ev.value>0?'+':''}${ev.value.toFixed(1)}</span></div>`).join('')
            + '</div>';
        }
      }
      whyMain.innerHTML = `Головна причина: <strong>${dLabel}</strong> (${d.val>0?'+':''}${d.val.toFixed(1)}).${secondTxt} ${pTxt}${eBreakdownHtml}`;
    } else {
      // v85b-F4: pclTotal-aware fallback
      const _pt = (pc && typeof pc.pclTotal === 'number') ? pc.pclTotal : 0;
      const _ptTxt = _pt <= -2 ? 'Панчанга несприятлива.'
                   : _pt <= -1 ? 'Панчанга злегка тисне.'
                   : _pt >=  2 ? 'Панчанга підтримує день.'
                   : _pt >=  1 ? 'Панчанга частково підтримує.'
                   : (pc?.aiComponents?.Pi != null ? 'Панчанга нейтральна.' : '');
      whyMain.textContent = ('Усі фактори нейтральні — день рівний без вираженого тиску. ' + _ptTxt).trim();
    }
  }

  // v87.47: 7-day G sparkline — заповнення whyCard і тренд-контекст
  try { _renderWhyTrend(); } catch(e){ window.NRDiagnostics?.record('legacy.catch.186','recoverable'); }
}/* NR_FN_END 254 */

/* NR_FN_BEGIN 255 */function _renderWhyTrend(){
  const block = document.getElementById('whyTrendBlock');
  const svg = document.getElementById('whyTrendSvg');
  const note = document.getElementById('whyTrendNote');
  if(!block || !svg) return;

  // Збираю 7 днів: -3..+3
  // _27dComputed починається з сьогодні (індекс 0) і йде вперед.
  // Минулі 3 дні беру з last3D.days (якщо є) або _ghistory.
  const days = [];
  const todayStr = todayKyivStr();

  // 1. -3..-1 з last3D або computeAi з історичного Kp
  // v88.7.6 BUG-1 fix: обмежуємо до 3 останніх минулих днів через slice(-3),
  // інакше last3D з 4-day window (іноді буває залежно від часу публікації NOAA) дає 4 точки минулого.
  // v88.7.7 CRITICAL fix: фільтр через fmtDate(d.date) — раніше було d.date < todayStr,
  // що завжди false (Date < string → JS coerce string→NaN → comparison undefined → false).
  // Тому last3D ніколи не використовувалось у тренді — це був прихований баг із оригіналу.
  try {
    if(typeof last3D !== 'undefined' && last3D && last3D.days){
      const _pastFromLast3D = last3D.days
        .filter(d => d.date && fmtDate(d.date) < todayStr)
        .slice(-3); // тільки 3 останні минулі дні (хронологічно найближчі до today)
      _pastFromLast3D.forEach(d => {
        // fp26: last3D.days[].G never assigned (parse3DaySafe тільки {date, kp8, kpMax}).
        // Раніше days.push({G: d.G}) → G=undefined → fallback на kp=2 placeholder спрацьовував завжди.
        // Тепер: рахуємо G inline з реального kpMax.
        let _Gpast;
        try {
          const _kp = isFinite(d.kpMax) ? d.kpMax : 2;
          const _ai = computeAi(sunriseUTC(d.date), _kp);
          _Gpast = kpDayTerm(_kp) + _ai.Ai;
        } catch(_e) { globalThis.NRDiagnostics?.record('catch.177','recoverable');  _Gpast = undefined; }
        if (isFinite(_Gpast)) days.push({ ds: fmtDate(d.date), G: _Gpast, isPast: true });
      });
    }
  } catch(e){ globalThis.NRDiagnostics?.record('catch.178','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  // Якщо last3D не дав 3 минулих — заповнюю computeAi з реального Kp.
  // fp26: був hardcoded kp=2 → 7-day chart показував штучні G (нижчі за реальні).
  // Тепер: спершу _engineScores[ds].kp (історичний снапшот), потім lastWWV.kNow, в крайньому — 2.
  if(days.length < 3){
    for(let i = -3; i <= -1; i++){
      const ds = fmtDate(addDays(new Date(todayKyivStr()+'T12:00:00Z'), i));
      if(days.find(x => x.ds === ds)) continue;
      try {
        let _kpPast = 2;
        if (typeof _engineScores !== 'undefined' && _engineScores && _engineScores[ds] && isFinite(_engineScores[ds].kp)) {
          _kpPast = _engineScores[ds].kp;
        } else if (typeof lastWWV !== 'undefined' && lastWWV && isFinite(lastWWV.kNow)) {
          _kpPast = lastWWV.kNow;
        }
        const ai = computeAi(sunriseUTC(addDays(new Date(todayKyivStr()+'T12:00:00Z'), i)), _kpPast);
        const _Gpast = kpDayTerm(_kpPast) + ai.Ai;
        days.push({ ds, G: _Gpast, isPast: true });
      } catch(e){ globalThis.NRDiagnostics?.record('catch.179','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
    }
  }

  // 2. сьогодні + 3 вперед з _27dComputed
  // v88.7.6 BUG-1 fix: race-condition guard — якщо _27dComputed ще не готове, fallback на computeAi.
  // v88.7.7 CRITICAL fix: _27dComputed[0] НЕ обов'язково today!
  // NOAA 27-day-outlook публікується щопонеділка → у четвер _27dComputed[0]=monday=today-3.
  // Раніше брав індекси [0..3] → у четвер це були 4 МИНУЛІ дні (понеділок..середа), today випадало з тренду.
  // Зараз шукаємо індекс today через findIndex і беремо [idxToday..idxToday+3].
  let _todayPlusFutureAdded = 0;
  if(typeof _27dComputed !== 'undefined' && _27dComputed && _27dComputed.length > 0){
    const idxToday = _27dComputed.findIndex(d => d && d.ds === todayStr);
    if(idxToday >= 0){
      // v88.9.01-fp182: "today" (i===0) used _27dComputed's d.G — the NOAA
      // 27-day OUTLOOK forecast Kp (published weekly on Monday), NOT live
      // observed Kp. This made "today" in this chart disagree with the main
      // G_now ring in sign, with no visible reason (Kyrylo caught this
      // 2026-07-14). The fallback path below already correctly used live
      // Kp for today — this just brings the primary path in line with it.
      const _kpLiveToday = (typeof lastWWV !== 'undefined' && lastWWV && isFinite(lastWWV.kNow)) ? lastWWV.kNow : null;
      for(let i = 0; i < 4; i++){
        const d = _27dComputed[idxToday + i];
        if(d && d.ds && isFinite(d.G)){
          let _gForDay = d.G;
          if (i === 0 && _kpLiveToday !== null) {
            try {
              const _aiLive = computeAi(sunriseUTC(new Date(todayKyivStr()+'T12:00:00Z')), _kpLiveToday);
              _gForDay = kpDayTerm(_kpLiveToday) + _aiLive.Ai;
            } catch(e) { globalThis.NRDiagnostics?.record('catch.180','recoverable');  _gForDay = d.G; /* keep forecast value if live calc fails */ }
          }
          days.push({ ds: d.ds, G: _gForDay, isPast: false, isToday: i === 0, kpUsed: (i === 0 ? _kpLiveToday : d.kpUsed) });
          _todayPlusFutureAdded++;
        }
      }
      if(window._DEBUG) console.log('[v88.7.7 trend] _27dComputed today at idx='+idxToday+', added '+_todayPlusFutureAdded+' day(s)');
    } else if(window._DEBUG){
      console.warn('[v88.7.7 trend] today '+todayStr+' not found in _27dComputed (length='+_27dComputed.length+', first ds='+(_27dComputed[0]?.ds||'?')+')');
    }
  }
  // Race-condition fallback: _27dComputed ще не готове ABO today не знайдено → today + 3 наперед через computeAi.
  if(_todayPlusFutureAdded === 0){
    const _kpNow = (typeof lastWWV !== 'undefined' && lastWWV && isFinite(lastWWV.kNow)) ? lastWWV.kNow : 2;
    for(let i = 0; i <= 3; i++){
      const ds = fmtDate(addDays(new Date(todayKyivStr()+'T12:00:00Z'), i));
      if(days.find(x => x.ds === ds)) continue;
      try {
        const ai = computeAi(sunriseUTC(addDays(new Date(todayKyivStr()+'T12:00:00Z'), i)), i === 0 ? _kpNow : 2);
        const G = kpDayTerm(i === 0 ? _kpNow : 2) + ai.Ai;
        days.push({ ds, G, isPast: false, isToday: i === 0, kpUsed: (i === 0 ? _kpNow : 2) });
      } catch(e){ globalThis.NRDiagnostics?.record('catch.181','recoverable'); if(window._DEBUG)console.warn('[silent fallback]:',e.message)}
    }
    if(window._DEBUG) console.log('[v88.7.7 trend] race fallback computeAi для today+3');
  }

  // Sort by date + cap at 7
  days.sort((a,b) => a.ds.localeCompare(b.ds));

  // v87.48 fix #3: dedupe by ds (last3D + _27dComputed may both contain today)
  const seen = new Set();
  const unique = [];
  for(const d of days){
    if(!seen.has(d.ds)){ seen.add(d.ds); unique.push(d); }
  }
  days.length = 0;
  days.push(...unique);

  // v87.48 fix #2: enforce correct isToday/isPast based on ds, not insertion order
  days.forEach(d => {
    d.isToday = (d.ds === todayStr);
    d.isPast  = (d.ds <  todayStr);
  });

  // v88.8.18 ★ FIX: anotate days з expert overrides — через централізований helper.
  // На скрін Image 3 vs Image 5: завтра G=+0.8 (астро), але expert=+3 (PDF bulletin).
  // Без цього маркера тренд "спадаючий до -0.9 на 13.05" вводить в оману.
  days.forEach(d => {
    d.overrideEng = null;
    d.engineEng = null;
    try {
      if (typeof getEffectiveGForDate === 'function' && !d.isPast){
        // Для future days: помічаємо override
        const _eff = getEffectiveGForDate(new Date(d.ds + 'T12:00:00Z'), d.G, 0); // delta=0 — anyone override
        if (_eff.override !== null) d.overrideEng = _eff.override;
      }
      // Engine snapshot — навіть для days без expert override (для tooltip info)
      // fp198: раніше читало _engineScores[d.ds].eng НАПРЯМУ → обходило getEngineScore()
      // і тому НЕ бачило Сурья-фікс (fp197) та expert_calc (fp196). Це давало розсинхрон:
      // hero-вердикт = -2 (через getEngineScore), а тиждень-смуга/27day = -3 (raw).
      // Тепер через getEngineScore() — єдине джерело істини.
      if (typeof getEngineScore === 'function'){
        const _snap = getEngineScore(new Date(d.ds + 'T12:00:00Z'));
        if (_snap && isFinite(_snap.eng)) d.engineEng = _snap.eng;
      } else if (typeof _engineScores !== 'undefined' && _engineScores && _engineScores[d.ds]){
        const _eng = _engineScores[d.ds];
        if (_eng && isFinite(_eng.eng)) d.engineEng = _eng.eng;
      }
    } catch(e){ globalThis.NRDiagnostics?.record('catch.182','recoverable'); if(window._DEBUG)console.warn('[silent overrideAnnot]:',e.message)}
  });

  if(days.length < 2){ block.style.display = 'none'; return; }

  // Layout
  const W = 440, H = 90;
  const padL = 20, padR = 20, padT = 8, padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const Gs = days.map(d => d.G).filter(g => isFinite(g));
  const gMin = Math.min(-2, ...Gs);
  const gMax = Math.max(2, ...Gs);
  const gRange = Math.max(1, gMax - gMin);
  const xFor = i => padL + (days.length === 1 ? innerW/2 : (i / (days.length - 1)) * innerW);
  const yFor = g => padT + innerH - ((g - gMin) / gRange) * innerH;
  const y0 = yFor(0);

  const colorFor = g =>
    g >= 1.5  ? '#2bd47d'
    : g >= 0.5 ? '#8ce0b0'
    : g >= -0.5 ? '#b7c7ea'
    : g >= -1.5 ? '#ffcc00'
    : '#ff8a7a';

  // Build SVG
  let svgHtml = '';
  // Zero line
  svgHtml += `<line x1="${padL}" y1="${y0.toFixed(1)}" x2="${W-padR}" y2="${y0.toFixed(1)}" stroke="rgba(139,160,200,.15)" stroke-dasharray="2 3" />`;
  svgHtml += `<text x="${padL-4}" y="${(y0+3).toFixed(1)}" font-size="9" fill="#5f7293" text-anchor="end">0</text>`;

  // Past segment (solid) + forecast segment (dashed)
  const pastPts = days.filter(d => d.isPast || d.isToday).map((d,i) => `${xFor(days.indexOf(d)).toFixed(1)},${yFor(d.G).toFixed(1)}`);
  const futPts  = days.filter(d => !d.isPast).map((d,i) => `${xFor(days.indexOf(d)).toFixed(1)},${yFor(d.G).toFixed(1)}`);
  if(pastPts.length >= 2){
    svgHtml += `<polyline points="${pastPts.join(' ')}" fill="none" stroke="#5a7ab0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`;
  }
  if(futPts.length >= 2){
    svgHtml += `<polyline points="${futPts.join(' ')}" fill="none" stroke="#8ea4c8" stroke-width="1.5" stroke-dasharray="3 3" stroke-linecap="round" />`;
  }

  // Dots
  days.forEach((d, i) => {
    const x = xFor(i), y = yFor(d.G);
    const col = colorFor(d.G);
    // v88.8.18 ★ FIX + fp12 BB: tooltip явно розрізняє Raw G_day vs PDF/Engine, щоб користувач
    // не плутав точки raw-серії зі зірками PDF expert overlay.
    let _dotTip = `${d.ds}\nRaw G_day: ${d.G >= 0 ? '+' : ''}${d.G.toFixed(2)}`;
    // v88.9.42-fp224 (аудит-раунд-11, Problem 10): показуємо розбивку
    // Kp-baseline vs ΣAᵢ, коли kpUsed відомий — інакше назва "NOAA 27-day"
    // візуально приписує весь результат NOAA, хоча при низькому Largest Kp
    // (2−Kp≈0) майже все число формує ΣAᵢ (Панчанга), не NOAA.
    if (isFinite(d.kpUsed)) {
      const _kpBase = kpDayTerm(d.kpUsed);
      const _aiSum = d.G - _kpBase;
      _dotTip += `\n  NOAA Kp baseline (2−Kp): ${_kpBase >= 0 ? '+' : ''}${_kpBase.toFixed(1)}\n  ΣAᵢ (Панчанга): ${_aiSum >= 0 ? '+' : ''}${_aiSum.toFixed(1)}`;
    }
    if(Number.isFinite(d.overrideEng)){
      _dotTip += `\nPDF Engine: ${d.overrideEng >= 0 ? '+' : ''}${d.overrideEng} (експертна оцінка)`;
    } else if(Number.isFinite(d.engineEng)){
      _dotTip += `\nPDF Engine: ${d.engineEng >= 0 ? '+' : ''}${d.engineEng} (v18.5)`;
    }
    const _titleAttr = `<title>${_dotTip}</title>`;
    if(d.isToday){
      svgHtml += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="${col}" stroke="#0a1428" stroke-width="2">${_titleAttr}</circle>`;
      svgHtml += `<text x="${x.toFixed(1)}" y="${(y+20).toFixed(1)}" font-size="10" fill="${col}" text-anchor="middle" font-weight="700">зараз</text>`;
    } else {
      svgHtml += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${d.isPast ? 3.5 : 4}" fill="${col}" opacity="${d.isPast ? 0.75 : 1}">${_titleAttr}</circle>`;
    }
    // v88.8.18 ★ FIX + fp12 BB + fp14 EE: marker ★ на y(expert_eng), а не приклеєний над точкою.
    // До fp14 EE: зірка стояла на y-9 від raw — користувач не міг прочитати реальний expert_eng з графіка.
    // Тепер зірка на y(expert_eng) clamped до gMin/gMax. Якщо raw і expert близько — зсуваємо ★ на 9px вгору щоб не злилось.
    // Для today: зірка теж малюється (раніше !d.isPast — today попадав, бо isPast=false). Залишаємо як є.
    if(Number.isFinite(d.overrideEng) && !d.isPast){
      const _ovClamped = Math.max(gMin, Math.min(gMax, d.overrideEng));
      let _starY = yFor(_ovClamped);
      if (Math.abs(_starY - y) < 6) _starY = y - 9; // fallback щоб не перекривало точку
      // Пунктирна вертикаль raw↔expert якщо реальна |Δ|≥1
      if (Math.abs(d.overrideEng - d.G) >= 1) {
        const _y1 = Math.min(y, _starY), _y2 = Math.max(y, _starY);
        svgHtml += `<line x1="${x.toFixed(1)}" y1="${_y1.toFixed(1)}" x2="${x.toFixed(1)}" y2="${_y2.toFixed(1)}" stroke="rgba(255,209,102,0.45)" stroke-width="1" stroke-dasharray="2 3" />`;
      }
      svgHtml += `<text x="${x.toFixed(1)}" y="${(_starY+4).toFixed(1)}" font-size="11" fill="#ffd166" text-anchor="middle" font-weight="700" style="filter:drop-shadow(0 0 2px rgba(0,0,0,.7))"><title>${d.ds}\nPDF Engine: ${d.overrideEng >= 0 ? '+' : ''}${d.overrideEng} (експертна оцінка дня)\nRaw G_day: ${d.G >= 0 ? '+' : ''}${d.G.toFixed(1)} (астро без експерта)</title>★</text>`;
    }
    // Day label
    // v88.7.6 BUG-4 fix: round (не ceil) + noon-UTC anchor — DST-safe день-різниця.
    // Ceil давав +1 при переходах на/з DST (23-год або 25-год доба).
    const _msPerDay = 86400000;
    const _todayMs = new Date(todayStr + 'T12:00:00Z').getTime();
    const _dsMs    = new Date(d.ds      + 'T12:00:00Z').getTime();
    const lbl = d.isToday
      ? ''
      : d.isPast
        ? `−${Math.max(0, Math.round((_todayMs - _dsMs)/_msPerDay))}д`
        : `+${Math.max(0, Math.round((_dsMs - _todayMs)/_msPerDay))}д`;
    if(lbl){
      svgHtml += `<text x="${x.toFixed(1)}" y="${(H-6).toFixed(1)}" font-size="9" fill="#5f7293" text-anchor="middle">${lbl}</text>`;
    }
  });

  svg.innerHTML = svgHtml;

  // Summary text
  // v87.48 fix #1: peak detection — шукаю серед МАЙБУТНІХ днів (не сьогодні і не минулих)
  const todayG = days.find(d => d.isToday)?.G;
  const futDays = days.filter(d => !d.isPast && !d.isToday);
  let peak = null;
  let arrow = '→';
  let trendTxt = 'стабільний';
  if(futDays.length && todayG !== undefined){
    const maxD = futDays.reduce((a,b) => b.G > a.G ? b : a);
    const minD = futDays.reduce((a,b) => b.G < a.G ? b : a);
    if(maxD.G > todayG + 0.5){ peak = maxD; arrow = '↗'; trendTxt = 'зростаючий'; }
    else if(minD.G < todayG - 0.5){ peak = minD; arrow = '↘'; trendTxt = 'спадаючий'; }
  }
  const peakStr = peak ? `до ${peak.G >= 0 ? '+' : ''}${peak.G.toFixed(1)} на ${peak.ds.slice(5)}` : '';

  if(note){
    // v88.8.18 ★ FIX: попередження якщо future days мають expert overrides
    // зі значним розходженням з астро G.
    const _futWithOverride = days.filter(d =>
      !d.isPast && !d.isToday && Number.isFinite(d.overrideEng)
    );
    const _maxDelta = _futWithOverride.length
      ? Math.max(..._futWithOverride.map(d => Math.abs(d.overrideEng - d.G)))
      : 0;
    let _overrideWarn = '';
    if(_futWithOverride.length && _maxDelta >= 2){
      const _firstOv = _futWithOverride[0];
      const _diff = _firstOv.overrideEng - _firstOv.G;
      _overrideWarn = ` · <span style="color:#ffd166" title="На графіку показано G_day raw = 2 − Kp_day + ΣAᵢ. PDF/Engine Day_score дає окремий денний reference (★ маркер). Делта до ${_maxDelta.toFixed(1)} балів — перевір 3-day forecast блок нижче для правильних значень.">★ є експертні корекції (Δ до ${_maxDelta.toFixed(1)})</span>`;
    }
    note.innerHTML = `Тренд ${arrow} ${trendTxt}${peakStr ? ' · ' + peakStr : ''}${_overrideWarn}`;
  }
  block.style.display = 'block';
}/* NR_FN_END 255 */

/* NR_FN_BEGIN 256 */function _renderHeroTimeWindows() {
  const wrap = el('timingRows');
  const shiftEl = el('timingNextShift');
  if (!wrap) return;
  const slots = window._daySlots;
  if (!slots || !slots.length) {
    // fp32: if storm known, show storm info instead of generic "недоступний"
    const _sw32c = window._stormWindow;
    if (_sw32c && isFinite(_sw32c.kp) && _sw32c.kp >= 5) {
      const _utcLc = String(_sw32c.label).padStart(2,'0');
      const _kyivLc = String(((parseInt(_sw32c.label,10) + kyivOffsetHoursIntAt(new Date())) % 24 + 24) % 24).padStart(2,'0');
      wrap.innerHTML = `<span style="color:#ffd2a0;font-size:11px">⚡ Kp-слоти недоступні, але відомо: буря Kp=${_sw32c.kp.toFixed(1)} о ${_utcLc}:00 UTC / ${_kyivLc}:00 Київ</span>`;
    } else {
      wrap.innerHTML = '<span style="color:var(--dim)">Прогноз Kp-слотів недоступний</span>';
    }
    return;
  }

  const nowH = new Date().getUTCHours();
  const isPaid = PAYWALL.isPaid();
  const visibleSlots = isPaid ? slots : slots.filter(s => {
    const h = parseInt(s.label || '0');
    return (nowH >= h && nowH < h + 3) || (h > nowH);
  }).slice(0, 3);

  // Find current and next slots
  let currentIdx = -1, nextIdx = -1;
  slots.forEach((s, i) => {
    const h = parseInt(s.label || '0');
    if (nowH >= h && nowH < h + 3) currentIdx = i;
  });
  if (currentIdx >= 0 && currentIdx < slots.length - 1) nextIdx = currentIdx + 1;

  // v78d: Panchanga context for timing
  const _pc = _lastPanchCtx;
  const _panchPi = _pc?.aiComponents?.Pi || 0;
  const _vishti = _pc?.karana?.isVishti;
  const _panchTimingNote = _vishti ? 'Vishti підсилює ризик' : (_panchPi <= -1.5 ? (_pc?.karana?.name || 'Панчанга') + ' створює напруження' : _panchPi < -0.3 ? (_pc?.karana?.name || 'Панчанга') + ' додає нестабільність' : '');
  const _rahuActive = _pc?.rahu?.active;

  // v79: detect flat day (all slots within 0.5 of each other)
  const _gValues = slots.map(s => s.G);
  const _gSpread = Math.max(..._gValues) - Math.min(..._gValues);
  const _isFlat = _gSpread < 0.5;

  // v79: update timing title based on day type
  // v85b-F8.3: позначити detail-level на flat-day (decision = вище у "Коли діяти")
  const _timTitle = el('timingTitle');
  if (_timTitle) _timTitle.textContent = _isFlat ? 'Локальний ритм — деталі по слотах' : 'Критичні вікна (сьогодні)';
  // v87.90: показуємо disambig chip тільки коли це "Локальний ритм" (flat day)
  const _disambig = el('timingDisambig');
  if (_disambig) _disambig.style.display = _isFlat ? '' : 'none';

  // v79: pre-compute hora for each slot when flat
  const _horaForSlot = {};
  if (_isFlat) {
    try {
      const now = new Date();
      visibleSlots.forEach(s => {
        const h = parseInt(s.label || '0');
        // v88.9.58-fp240 (Problem 3): послідовність планет по ВСЬОМУ слоту,
        // не лише в середині — див. calcHoraSequence.
        const slotStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, 0));
        const slotEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h + 3, 0));
        const sequence = calcHoraSequence(slotStart, slotEnd, 4);
        const hora = sequence[0] || calcHora(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h + 1, 30)));
        hora.sequence = sequence;
        _horaForSlot[h] = hora;
      });
    } catch(e){ globalThis.NRDiagnostics?.record('catch.183','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  }

  // v88.9.6x-fp243: раніше цей блок сам рахував Rahu/Yama/Gulika (_inauspWins) і
  // сам вирішував текст дії (_actionLabel), а «План дня» і «Особистий контекст»
  // рахували своє — незалежно, різними шляхами. Наслідок (аудит fp242): та сама
  // хвилина видавала «активні дії і ключові рішення · ⚠ Rahu» тут і «не починати
  // нових справ» в іншій картці. Тепер: вікна — через getInauspiciousWindowsUTC()
  // (спільна для всіх трьох блоків), а дію для кожного слоту вирішує ЄДИНА функція
  // resolveSlotDecision() (пріоритет: буря → активне вікно → базове G → контекст дня).
  const _inauspWins = getInauspiciousWindowsUTC();

  const lines = visibleSlots.map(s => {
    const h = parseInt(s.label || '0'); // UTC година початку
    const endH = h + 3;
    const isCurrent = (nowH >= h && nowH < endH);
    const isNext = (nextIdx >= 0 && slots[nextIdx] === s);
    // v88.9.6x-fp243b FIX-CRITICAL (аудит fp243, п.2): для ПОТОЧНОГО слоту всі три
    // блоки мали передавати resolveSlotDecision РІЗНИЙ G — тут статичний s.G
    // (прогноз слоту), а особистий блок — live _v73G() (G_now). Через це поза Rahu
    // один блок міг сказати «активні дії», а інший — «обережно» на ту саму мить.
    // Тепер: для поточного слоту effectiveG = G_now (якщо доступний), для
    // майбутніх слотів — s.G (G_now для майбутнього не існує).
    const _liveGNow = (isCurrent && typeof _v73G === 'function') ? _v73G() : NaN;
    const g = (isCurrent && isFinite(_liveGNow)) ? _liveGNow : s.G;
    let _dayNegFlag = false;
    let _dayEngForGate = null;
    try {
      const _de = getEngineScore(new Date(todayKyivStr()+'T12:00:00Z'));
      if (_de && isFinite(_de.eng)) { _dayNegFlag = Number(_de.eng) <= -2; _dayEngForGate = Number(_de.eng); }
    } catch(e){ window.NRDiagnostics?.record('legacy.catch.187','recoverable'); }
    const _colBase = _dayNegFlag
      ? (g >= 0 ? '#ffaa33' : g >= -1 ? '#ff9944' : '#ff6b6b')
      : (g >= 1 ? '#2bd47d' : g >= 0 ? '#9bb1dc' : g >= -1 ? '#ffcc00' : '#ff6b6b');

    // fp243: той самий критерій storm hard-cap, що й раніше в normalizeDaySlots/dayPlan.
    const _sw174slot = window._stormWindow;
    const _stormActiveSlot = !!(_sw174slot && isFinite(_sw174slot.kp) && _sw174slot.kp >= 5 && h >= parseInt(_sw174slot.label, 10));
    const _nowPreciseH2 = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;

    const _decision = resolveSlotDecision({
      slotStartH: h, slotEndH: endH, nowH: _nowPreciseH2,
      slotG: g, dayScore: _dayEngForGate,
      windows: _inauspWins, stormActive: _stormActiveSlot
    });
    // v88.9.6x-fp243b FIX-CRITICAL (аудит fp243, п.1): раніше колір читав
    // blockedNewStarts = "десь у слоті є блок" — тому о 06:30 (до Rahu 07:06)
    // рядок писав "активні дії" ЗЕЛЕНИМ текстом, але кольором точки — червоним.
    // Для поточного слоту колір мусить відповідати ЦІЙ МИТІ (blockedNow), для
    // майбутніх слотів — попередження про слот загалом (hasBlockedSegment).
    const _blockedByDay = _dayNegFlag;
    let col = (_blockedByDay || (isCurrent ? _decision.blockedNow : _decision.hasBlockedSegment)) ? '#ff6b6b' : _colBase;

    // Поточний слот показує точний сегмент "зараз" (з реальними межами вікна,
    // обрізаними по слоту) — саме кейс зі скріну: 08:10 всередині Rahu 07:06–09:06,
    // слот 06:00–09:00 → "07:06–09:00 — тільки рутина; Rahu активний".
    let label = (isCurrent && _decision.actionNow) ? _decision.actionNow : _decision.slotAction;
    const _currentPresentation = isCurrent ? getCurrentOperationalPresentation() : null;
    if(_currentPresentation){
      label = _currentPresentation.text;
      col = _currentPresentation.color;
    }

    if (_isFlat && _horaForSlot[h] && !_decision.hasBlockedSegment) {
      const hora = _horaForSlot[h];
      // v88.9.58-fp240 (Problem 3): якщо всередині слоту хора змінюється —
      // показуємо послідовність (Меркурій → Місяць), а не лише одну планету
      // з середини слоту, яка могла вже не діяти на момент початку слоту.
      const _horaLabel = (hora.sequence && hora.sequence.length > 1)
        ? hora.sequence.map(x => x.planet).join(' → ')
        : hora.planet;
      label += ` · ${_horaLabel}`;
    }
    // Panchanga overlay — лише коли слот НЕ заблокований вікном (активне Rahu/
    // Yama/Gulika вже explicit у тексті рішення, не дублюємо попередження).
    if (_panchTimingNote && g < 0.5 && !_decision.hasBlockedSegment) label += ` (${_panchTimingNote})`;
    const _isBlockedVisual = isCurrent
      ? (_currentPresentation.cls !== 'good')
      : (_blockedByDay || _decision.hasBlockedSegment);
    const _isRoutineVisual = !_isBlockedVisual && (label.includes('рутин') || label.includes('обереж') || label.includes('перевір'));
    const _actionCls = _isBlockedVisual ? ' is-blocked' : _isRoutineVisual ? ' is-routine' : ' is-allowed';
    const cls = (isCurrent ? ' is-now' : isNext ? ' is-next' : '') + _actionCls;
    const _markColor = _isBlockedVisual ? '#ff6b6b' : _isRoutineVisual ? '#ffaa33' : 'var(--ok)';
    const mark = isCurrent ? `<span style="color:${_markColor};font-size:10px;font-weight:700"> ◀ поточний слот</span>` : '';
    const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${col};flex-shrink:0"></span>`;
    // v87.90: показуємо ЛОКАЛЬНИЙ час замість UTC (Київ юзер бачить свій час)
    // v88.9.6x-fp245: канонічно Europe/Kyiv, не browser TZ (аудит fp242, п.4).
    const _tzOffH2 = kyivOffsetHoursIntAt(new Date());
    const _hL = ((h + _tzOffH2) % 24 + 24) % 24;
    const _eL = ((endH + _tzOffH2) % 24 + 24) % 24;
    const _hLstr = String(Math.floor(_hL)).padStart(2,'0');
    const _eLstr = String(Math.floor(_eL)).padStart(2,'0');
    return `<div class="timing-row${cls}" title="UTC ${String(h).padStart(2,'0')}:00–${String(endH).padStart(2,'0')}:00">`
      + `<div class="timing-time">${_hLstr}:00–${_eLstr}:00</div>`
      + `<div class="timing-label" style="display:flex;align-items:center;gap:6px">${dot}<span>${label}${mark}</span></div>`
      + `</div>`;
  });

  // v88.8.93-fp174: Kyrylo couldn't tell why slots with a POSITIVE G value
  // (+3.8 etc) were shown in red "avoid" boxes — the storm hard-cap (Kp>=5
  // forces all slots to 'bad' regardless of the underlying G number) was
  // undocumented on screen, reading as a contradiction. Added explicit note.
  const _sw174 = window._stormWindow;
  const _stormNote174 = (_sw174 && isFinite(_sw174.kp) && _sw174.kp >= 5)
    ? `<div style="padding:4px 10px 6px;font-size:10px;color:#ffb86c;border-bottom:1px dashed rgba(255,184,108,.25);margin-bottom:4px">⚠ Червоне з ${_sw174.label}:00 UTC — через прогноз Kp≥5 (буря), НЕ через погане число G. Число залишається реальним, але рекомендація навмисно ставиться на "тільки рутина" заради безпеки під час бурі.</div>`
    : '';

  // v87.41: explicit free-tier hint — без цього "3 з 8 слотів" виглядає як баг.
  // Додаємо зверху списку pre-пояснення.
  const _headerHint = _stormNote174 || ((!isPaid && slots.length > visibleSlots.length)
    ? `<div role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();PaywallModal.show('Повний розклад','research');}" style="padding:4px 10px 6px;font-size:10px;color:var(--faint);border-bottom:1px dashed rgba(139,160,200,.18);margin-bottom:4px;cursor:pointer" onclick="PaywallModal.show('Повний розклад','research')">📍 Показано ${visibleSlots.length} з ${slots.length} слотів (поточне + майбутні) · повний день — дослідна функція</div>`
    : '');

  if (!isPaid && slots.length > 3) {
    lines.push(`<div role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();PaywallModal.show('Повний розклад','research');}" style="margin-top:4px;padding:5px 10px;border-radius:8px;border:1px dashed rgba(55,167,255,.22);background:rgba(55,167,255,.04);font-size:11px;color:#8fb5ff;cursor:pointer" onclick="PaywallModal.show('Повний розклад','research')">🧪 Повний розклад (${slots.length} вікон) — дослідна функція</div>`);
  }
  wrap.innerHTML = _headerHint + lines.join('');

  // Next shift badge with countdown
  if (shiftEl && currentIdx >= 0) {
    const currentH = parseInt(slots[currentIdx].label || '0');
    const endMinutes = (currentH + 3) * 60;
    const nowMinutes = nowH * 60 + new Date().getUTCMinutes();
    const remaining = endMinutes - nowMinutes;
    if (remaining > 0 && nextIdx >= 0) {
      const nextG = slots[nextIdx].G;
      const curG = slots[currentIdx].G;
      const hrs = Math.floor(remaining / 60);
      const mins = remaining % 60;
      const timeStr = hrs > 0 ? `${hrs}г ${mins}хв` : `${mins}хв`;
      // v87.60 Fix #3: уникнути оксюморону "Зміна через X → без змін".
      // Якщо G не змінюється — говорити про перехід слоту, не про зміну стану.
      let badgeText;
      if (nextG > curG)      badgeText = `Зміна через ${timeStr} · ↑ покращення`;
      else if (nextG < curG) badgeText = `Зміна через ${timeStr} · ↓ погіршення`;
      else                   badgeText = `Наступний слот через ${timeStr} · фон стабільний`;
      shiftEl.innerHTML = `<div class="next-shift-badge"><span class="live-dot"></span>${badgeText}</div>`;
    } else {
      shiftEl.innerHTML = '';
    }
  }
}/* NR_FN_END 256 */

/* NR_FN_BEGIN 260 */function renderMoonRetroTop(){
  const now=new Date();
  const pc=_lastPanchCtx;
  const ai=pc?.aiComponents;

  // Moon block — from JS variables
  const pd=window._lunarPhaseDeg;
  // One complete instant Panchanga snapshot supplies every live lunar field.
  // This removes independent floor(phase/12) copies that drifted from
  // Nakshatra near boundaries while preserving the separate day/sunrise layer.
  let _livePanch185=null;
  try{ _livePanch185=computePanchanga(now); }catch(_e){ window.NRDiagnostics?.record('legacy.catch.189','recoverable'); }
  const phaseName=isFinite(pd)?phaseNameByAngle(pd):'—';
  // v88.9.03-fp185: same stale-cache bug as fp184 — moonLiNow ("Now" in the
  // id!) was reading ai.Li from _lastPanchCtx (noon-UTC-referenced cache),
  // not live. Recompute Amavasya case live from pd, matching computeAi's
  // canonical formula, same as syncWhy()'s fix.
  const _tithiIdxForLi185 = Number.isFinite(Number(_livePanch185?.tithi?.num)) ? Number(_livePanch185.tithi.num) - 1 : null;
  // v88.9.07-fp188: той самий дзеркальний баг що в syncWhy — fallback (ai.Li)
  // читав кеш (sunrise-референс) коли live-тітхі вже НЕ Амавасья. Рахуємо live.
  const _kpLive185 = (window.__uiState && isFinite(window.__uiState.kpNow)) ? window.__uiState.kpNow : 0;
  const liVal = _tithiIdxForLi185 === null ? (ai?String(ai.Li):'—')
              : String(_tithiIdxForLi185 === 29 ? -3
                : _tithiIdxForLi185 === 14 ? (_kpLive185 >= 7 ? -2 : _kpLive185 >= 5 ? -1 : 0)
                : 0);
  // v88.9.05-fp187: same live-vs-cached-noon bug as Li — tithiName came from
  // _lastPanchCtx (stale), while _tithiIdxForLi185 (live, from pd) was
  // already computed right here for the Li fix. Reuse it for the name too.
  const tithiName = _tithiIdxForLi185 !== null ? TITHI_NAMES[_tithiIdxForLi185] : (pc?.tithi?.name||'—');
  const tithiNum = _tithiIdxForLi185 !== null ? _tithiIdxForLi185 + 1 : (pc?.tithi?.num||'');
  // Use the same live timestamp and canonical Panchanga function as Tithi.
  // The cached sunrise/noon context remains a separate comparison layer.
  const nakName=_livePanch185?.nakshatra?.name||pc?.nakshatra?.name||'—';
  const nakScore=_livePanch185?.nakshatra?.score??pc?.nakshatra?.score;

  if(el('moonPhaseNow')) el('moonPhaseNow').textContent=phaseName;
  if(el('moonTithiNow')) el('moonTithiNow').textContent=tithiNum?tithiName+' ('+tithiNum+')':tithiName;
  if(el('moonLiNow')) el('moonLiNow').textContent=liVal;
  if(el('moonNakNow')) el('moonNakNow').textContent=nakName;

  // Nakshatra quality dot
  if(el('moonNakQualNow')){
    const dot=nakScore>=1?'🟢':nakScore<=-1?'🔴':'🟡';
    const label=nakScore>=1?'Сприятлива':nakScore<=-1?'Несприятлива':'Нейтральна';
    el('moonNakQualNow').textContent=dot+' '+label;
  }

  // Illumination
  if(isFinite(pd)){
    const illum=((1-Math.cos(pd*Math.PI/180))/2*100).toFixed(0);
    if(el('moonIllumNow')) el('moonIllumNow').textContent=illum+'% освітл.';
  }

  // Next tithi shift (approx: each tithi ~24h, compute remainder)
  if(el('moonNextShift')){
    try{
      // v88.9.05-fp187: same stale-cache pattern — use live tithi number
      // (window._lunarPhaseDeg) instead of cached pc.tithi.num.
      const tNum = Number(_livePanch185?.tithi?.num||pc?.tithi?.num||0);
      // Canonical ephemeris-derived boundary estimate from computePanchanga.
      const _nextH=Number(_livePanch185?.tithi?.hoursToNext);
      const remH=Number.isFinite(_nextH)?Math.max(1,Math.round(_nextH)):null;
      el('moonNextShift').textContent=remH===null?'—':'~'+remH+'г';
      if(el('moonShiftHint')) el('moonShiftHint').textContent='Тітхі '+(tNum<30?tNum+1:1);
    }catch(e){ globalThis.NRDiagnostics?.record('catch.184','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  }

  // Retro block
  const planets=['Mercury','Venus','Mars','Jupiter','Saturn'];
  const uaNames={Mercury:'☿ Меркурій',Venus:'♀ Венера',Mars:'♂ Марс',Jupiter:'♃ Юпітер',Saturn:'♄ Сатурн'};
  const active=[];
  const html=planets.map(p=>{
    let rx=null;
    try{rx=isRetrograde(p,now)}catch(e){ globalThis.NRDiagnostics?.record('catch.185','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
    if(rx) active.push(uaNames[p]||p);
    return '<span class="retro-chip '+(rx?'rx':'direct')+'">'+(rx===null?'?':rx?'℞':'•')+' '+(uaNames[p]||p)+'</span>';
  }).join('');

  if(el('retroNowWrap')) el('retroNowWrap').innerHTML=html;
  const n=active.length;
  if(el('retroPressure')){
    const lbl=n>=3?'high':n>=2?'medium':n>=1?'low':'direct';
    const col=n>=3?'#ff6b6b':n>=2?'#ffaa33':n>=1?'#ffd866':'#2bd47d';
    el('retroPressure').textContent=lbl;
    el('retroPressure').style.color=col;
  }
  const retroUnknown = planets.some(p => isRetrograde(p, now) === null);
  if(el('retroNowNote')) el('retroNowNote').textContent=retroUnknown ? 'Ретроградність: немає перевірених даних для цієї дати' : (n?'Активні: '+active.join(', '):'Усі планети — прямий рух') + ' · Swiss Ephemeris, час приблизний до хвилини';
  if(retroUnknown && el('retroPressure')) el('retroPressure').textContent='невідомо';

  // Summary line for collapsed astroGrid header
  if(el('retroSummaryLine')){
    const shortNames={Mercury:'☿',Venus:'♀',Mars:'♂',Jupiter:'♃',Saturn:'♄'};
    const rxShort=[];
    planets.forEach(p=>{try{if(isRetrograde(p,now))rxShort.push(shortNames[p]+'℞')}catch(e){ globalThis.NRDiagnostics?.record('catch.186','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}});
    el('retroSummaryLine').innerHTML=retroUnknown ? '🪐 Рух планет: немає перевірених даних' : rxShort.length
      ?'🪐 <span style="color:#ff9966">'+rxShort.join(' ')+'</span>'
      :'🪐 <span style="color: var(--ok)">прямий рух</span>';
  }

  const oldBadge=el('retroNowBadge');
  if(oldBadge) oldBadge.style.display='none';
}/* NR_FN_END 260 */

/* NR_FN_BEGIN 268 */function renderProvenance(){
  const el = document.getElementById('provenanceContent');
  if(!el) return;
  const _ds = window.__dashState || {};
  const _ui = window.__uiState || {};
  const _now = new Date();
  const _fresh = document.getElementById('freshnessBadge')?.textContent || '?';

  // Kp source
  const _kpVal = _ui.kpNow ?? _ds.kpNow ?? (lastWWV?.kNow);
  const _kpSrc = lastWWV?._synthetic ? 'synthetic (fallback)'
              : (lastWWV?.whenText || 'NOAA observed');
  const _kpFreshTs = lastWWV?.ts || null;

  // Sn
  const _snVal = window._lastWolfSn?.sn ?? null;
  const _snDate = window._lastWolfSn?.dateStr ?? '—';
  const _snProv = window._lastWolfSn?.provisional ? ' (попер.)' : '';

  // Dst
  const _dstVal = window._lastDst?.dst ?? null;
  const _dstTime = window._lastDst?.time ?? '—';
  const _dstCached = window._lastDst?._cached ? ' (кеш)' : '';
  // v88.9.6x-fp244 (аудит fp242, п.2): раніше тут завжди писалось "· Kyoto",
  // навіть якщо timestamp не підтверджений офіційним фідом (майбутній/
  // застарілий/нерозпізнаний). Тепер hint явно каже "непідтверджено" + причину.
  let _dstProvLabel = ' · Kyoto' + _dstCached;
  try {
    const _dpRow = _dstProvenanceCheck();
    if (!_dpRow.ok && _dstVal != null) _dstProvLabel = ` · ⚠ непідтверджено (${_dpRow.reason})`;
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.196','recoverable'); }

  // Engine v18.5 entry today
  const _eng = (typeof getEngineScore === 'function') ? getEngineScore(_now) : null;
  // v88.9.37-fp219 FIX-CRITICAL (аудит-раунд-6, Problem 2): той самий баг, що
  // і Problem 1 (heroBulletin) — synthetic-мітка була безумовною, а заголовок
  // блоку жорстко "Engine v18.5" навіть коли _eng.eng — PDF override, не
  // розрахунок engine. Formula Audit — саме те місце, де користувач очікує
  // найточнішу provenance-інформацію, тому цю плутанину тут особливо критично
  // було залишити. Тепер явно розділено.
  const _engIsOverride = !!(_eng && _eng._expertOverride);
  const _engStr = _eng ? `${_eng.eng >= 0 ? '+' : ''}${_eng.eng}${(!_engIsOverride && _eng.kp_synthetic) ? ' ⚠ synthetic' : ''}` : '—';
  const _engTag = _eng?.tag || '—';
  const _engRawStr = (_eng && isFinite(_eng._engRaw)) ? `${_eng._engRaw >= 0 ? '+' : ''}${_eng._engRaw}${_eng.kp_synthetic ? ' ⚠ synthetic' : ''}` : (_engIsOverride ? 'недоступний' : '—');
  const _engSourcePdf = _eng?._overrideSourcePdf || _eng?._overrideAppliedIn || '—';

  // Components G
  const _ai = _ui.ai || _ds.ai || {};
  const _gNow = _ui.gNow ?? _ds.gNow ?? NaN;
  const _gRawOutsideOperationalScale = isFinite(_gNow) && Math.abs(_gNow) > 3;
  const _gOperational = isFinite(_gNow) ? Math.max(-3, Math.min(3, _gNow)) : NaN;

  // Cache state
  // v88.9.33-fp214 FIX (аудит-раунд-4): freshnessBadge може показувати "DEGRADED"
  // (задокументовано в його ж title/tooltip: "NOAA-фід не оновлювався понад 3г
  // АБО фізична суперечність між джерелами"), але жодна з попередніх гілок
  // (live/cache/stale/offline/old) не матчила цей рядок — падало в "? unknown",
  // хоча стан насправді ВІДОМИЙ (просто відсутня гілка). Додано явну гілку.
  const _freshLower = _fresh.toLowerCase();
  // v88.9.40-fp222 (Problem 4, фінально): тепер window.__sourceState.mode —
  // перше джерело (єдиний canonical об'єкт, у який пишуть усі 4 writer'и).
  // window.__isDegraded — другий пріоритет (той самий прапор з fp215, лишається
  // для сумісності). Текстовий парсинг freshnessBadge — останній fallback.
  const _srcMode = window.__sourceState && window.__sourceState.mode;
  // v88.9.45-fp227 (аудит-раунд-14): для 'estimated' основний лейбл тепер теж
  // явно каже OBSERVED/FORECAST через resolveSourceLabel() — раніше показував
  // generic "✓ ESTIMATED", і лише hint (_fresh) містив деталізацію.
  const _estimatedLabel = (function(){ try { const _r = resolveSourceLabel(); return _r.isRealObserved ? ('✓ ' + _r.combined) : '✓ ESTIMATED'; } catch(_e){ globalThis.NRDiagnostics?.record('catch.192','recoverable');  return '✓ ESTIMATED'; } })();
  const _modeToLabel = { live:'✓ LIVE', estimated:_estimatedLabel, delayed:'⊙ DELAYED', stale:'⊙ CACHE/STALE', old:'✗ OFFLINE', scenario:'⚠ SCENARIO', offline:'✗ OFFLINE', degraded:'⚠ DEGRADED' };
  const _cacheState = _modeToLabel[_srcMode] ? _modeToLabel[_srcMode]
                    : window.__isDegraded === true ? '⚠ DEGRADED'
                    : _freshLower.includes('degraded') ? '⚠ DEGRADED'
                    : _freshLower.includes('live') ? '✓ LIVE'
                    : _freshLower.includes('cache') || _freshLower.includes('stale') ? '⊙ CACHE/STALE'
                    : _freshLower.includes('offline') || _freshLower.includes('old') ? '✗ OFFLINE'
                    : _freshLower.includes('delay') ? '⊙ DELAYED'
                    : _freshLower.includes('estimat') ? '✓ ESTIMATED'
                    : `? unknown (raw: ${_fresh})`;

  const _row = (label, val, hint) => `<div class="prov-row">
    <span style="color:var(--dim)">${label}</span>
    <span style="color:var(--text)">${val}${hint ? ` <span style="color:var(--faint);font-size:10px">${hint}</span>` : ''}</span>
  </div>`;
  // v87.90: smart sign format для компонентів Composite G — показує знак для скан-чіткості
  const _fmt = (v, dp) => {
    if (v == null || !isFinite(v)) return '—';
    if (Math.abs(v) < (dp === 2 ? 0.005 : 0.05)) return dp === 2 ? '0.00' : '0';
    return (v > 0 ? '+' : '') + v.toFixed(dp);
  };

  el.innerHTML = `
    <div class="prov-grid">
      <div class="prov-col">
        <div style="font-size:10px;color:var(--alt);letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">${(typeof t === 'function' ? t('provenanceInputs') : 'Inputs')}</div>
        ${_row('Час перерахунку (UTC)', _now.toISOString().slice(0,16) + 'Z')}
        ${_row('Kp', isFinite(_kpVal) ? _kpVal.toFixed(2) : '—', _kpSrc)}
        ${_row('Sn (Wolf)', _snVal != null ? _snVal + _snProv : '—', _snDate + ' · SILSO')}
        ${_row('Dst', _dstVal != null ? _dstVal + ' нТл' : '—', _dstTime + _dstProvLabel)}
        ${_row('Source state', _cacheState, (_fresh && _fresh.replace(/^●\s*/,'').trim() === _cacheState.replace(/^[✓⊙✗⚠]\s*/,'').trim()) ? '' : _fresh)}
      </div>
      <div class="prov-col">
        <div style="font-size:10px;color:var(--ok);letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">${(typeof t === 'function' ? t('provenanceComposite') : 'Composite G')}</div>
        ${_row('2 − Kp', _fmt(isFinite(_kpVal) ? kpDayTerm(_kpVal) : null, 2))}
        ${_row('Lᵢ (тітхі)', _fmt(_ai.Li, 1), _ai.lTip ? _ai.lTip.split('\\n')[0].slice(0,40) : '')}
        ${_row('Mᵢ (затемн.)', _fmt(_ai.Mi, 1), _ai.mTip ? _ai.mTip.slice(0,40) : '')}
        ${_row('eᵢ (події)', _fmt(_ai.ei, 1))}
        ${_row('Pᵢ (панчанга)', _fmt(_ai.Pi, 1), _ai.pTip ? _ai.pTip.slice(0,40) : '')}
        ${_row('Dᵢ (Dst-буря)', _fmt(_ai.Di, 1))}
        ${_row('ΣAᵢ', _fmt(_ai.Ai, 1))}
        <div class="prov-row prov-row-total">
          <span style="color:${rawContextColor(_gNow)};font-weight:700">G_raw total</span>
          <span style="color:var(--text);font-weight:700;font-size:14px">${_fmt(_gNow, 2)}${_gRawOutsideOperationalScale ? ` <span style="color:var(--warn);font-size:10px;font-weight:600">поза оперативною шкалою −3…+3; стан ${_fmt(_gOperational, 0)}</span>` : ''}</span>
        </div>
      </div>
    </div>
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
      ${_engIsOverride ? `
      <div style="font-size:10px;color:#ffd166;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">PDF override (verified expert verdict)</div>
      ${_row('Score', _engStr)}
      ${_row('Джерело', escapeHtml(String(_engSourcePdf)))}
      <div style="font-size:10px;color:var(--warn);letter-spacing:.12em;text-transform:uppercase;margin:10px 0 6px">Raw Engine v18.5 (для порівняння, НЕ застосовано)</div>
      ${_row('Score', _engRawStr)}
      ${_row('Tag', _engTag)}
      ` : `
      <div style="font-size:10px;color:var(--warn);letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">Engine v18.5 (rule-based, для порівняння)</div>
      ${_row('Score', _engStr)}
      ${_row('Tag', _engTag)}
      `}
    </div>
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(155,177,220,.25)">
      <div style="font-size:10px;color:#8fb5ff;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">Expert Excel replay (R&amp;D, довідково — НЕ production-джерело)</div>
      ${_row('Знак / Exact', '81.0% / 66.5% (n=394, revision-aware PDF overlap)')}
      ${_row('±1', '88.3% (той самий n=394)')}
      ${_row('Файл покриває', '495 днів, 07.03.2025–14.07.2026')}
      <div style="margin-top:6px;padding:6px 8px;font-size:9px;color:var(--faint);background:rgba(143,181,255,.06);border-radius:6px;line-height:1.5">
        Ретроспективне відтворення PDF-вердикту за РУЧНИМИ експертними тегами (не автоматичний розрахунок).
        Дані закінчуються 14.07.2026 — після цієї дати НЕ застосовується (немає підготовлених вхідних тегів).
        Це не незалежний прогноз, а звірка з тим самим інструментом, яким міг користуватись експерт при написанні PDF.
        Автоматизація вхідних тегів (V19-shadow) — окрема задача в розробці, паралельно з frozen v18.5, не в production.
      </div>
    </div>
    <div style="margin-top:10px;padding:6px 8px;font-size:10px;color:var(--faint);background:rgba(11,18,32,.6);border-radius:6px;line-height:1.5">
      Усі дані фіксуються при кожному G-tick (~10 хв). Натисни Оновити (вверху) щоб примусово оновити.
      Розбіжність G live vs Engine v18.5 — нормальна (різні моделі за дизайном). Synthetic Kp = NOAA forecast недоступний → зачекай 10-30 хв або відкрий заново.
    </div>
  `;
}/* NR_FN_END 268 */

/* NR_FN_BEGIN 269 */function renderAntiAction(){
  const _el = document.getElementById('antiActionContent');
  if(!_el) return;
  // fp412: Jyotish is descriptive context only; Hero owns the verdict.
  _el.innerHTML = '<div style="color:var(--muted);font-size:12px;line-height:1.5"><strong>Календарний контекст Jyotish</strong> · традиційні назви та часові вікна показані в картці нижче. score_effect=0; цей шар не дозволяє і не забороняє дії. Оперативне рішення — лише у головному блоці.</div>';
  const _aPrev412 = document.getElementById('antiActionPreview');
  if(_aPrev412) _aPrev412.textContent = 'Jyotish: календарний контекст · score_effect=0 · не команда для дії';
  return;
  const _ds = window.__dashState || {};
  const _ai = (window.__uiState && window.__uiState.ai) || _ds.ai || {};

  const _now = new Date(todayKyivStr()+'T12:00:00Z');
  // v87.90 fix: використовую noonUTC щоб узгодити з Panchanga картою (раніше Anti-action міг показувати інший Tithi через time-of-day shift)
  const _refDate = (typeof sunriseUTC === 'function') ? sunriseUTC(_now) : _now;
  let _panch = null;
  try { if(typeof computePanchanga === 'function') _panch = computePanchanga(_refDate); } catch(e){ globalThis.NRDiagnostics?.record('catch.193','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  if(!_panch){
    _el.innerHTML = '<span style="color:var(--dim)">Дані ще завантажуються…</span>';
    return;
  }

  const _items = [];
  try {
    const _tAdv = (typeof TITHI_ADVICE !== 'undefined') ? TITHI_ADVICE[_panch.tithi.num - 1] : null;
    const _vAdv = (typeof VARA_ADVICE !== 'undefined') ? VARA_ADVICE[localWeekday(_refDate)] : null; // v87.90: локальний день
    const _nAdv = (typeof NAKSHATRA_ADVICE !== 'undefined') ? NAKSHATRA_ADVICE[_panch.nakshatra.type] : null;
    const _yAdv = (typeof YOGA_ADVICE !== 'undefined') ? YOGA_ADVICE[_panch.yoga.num - 1] : null;
    const _kVishti = _panch.karana && _panch.karana.isVishti;

    if(_tAdv) _items.push({src:'Tithi', label:_panch.tithi.name, score:_panch.tithi.score, do:_tAdv.do, avoid:_tAdv.avoid});
    if(_vAdv) _items.push({src:'Vara', label:_panch.vara.name, score:_panch.vara.score, do:_vAdv.do, avoid:_vAdv.avoid});
    if(_nAdv) _items.push({src:'Nakshatra', label:_panch.nakshatra.name, score:_panch.nakshatra.score, do:_nAdv.do, avoid:_nAdv.avoid});
    if(_yAdv) _items.push({src:'Yoga', label:_panch.yoga.name, score:_panch.yoga.score, do:_yAdv.do, avoid:_yAdv.avoid});
    if(_kVishti) _items.push({src:'Karana', label:'Vishti (Bhadra)', score:-2, do:'Очікування, спостереження', avoid:'Будь-які активні дії (вето)'});
    if(_panch.rahu && _panch.rahu.active) _items.push({src:'Rahu Kalam', label:`${_panch.rahu.start}–${_panch.rahu.end}`, score:-1, do:'Оборона', avoid:'Нові старти'});
  } catch(e){ globalThis.NRDiagnostics?.record('catch.194','recoverable');
    _el.innerHTML = '<span style="color:var(--dim)">Помилка обчислення рекомендацій.</span>';
    return;
  }

  // Persona context — Taara (якщо введено birth date)
  let _personaCtx = '';
  try {
    if(typeof getSlotData === 'function' && typeof _activeSlot !== 'undefined'){
      const _data = getSlotData(_activeSlot);
      if(_data && _data.date){
        const _bjde = dateToJDE(_data.date, _data.time, _data.utcOff);
        const _njde = Date.now() / 86400000 + 2440587.5;
        const _nat = calcNakshatra(calcMoonLongitude(__nrUtcJdToTt(_bjde)), _bjde);
        const _now2 = calcNakshatra(calcMoonLongitude(__nrUtcJdToTt(_njde)), _njde);
        const _t = calcTaara(_nat.idx, _now2.idx);
        // v87.90 fix: захист від NaN у _nat.idx (раніше показувало "#NaN")
        const _natName = (Number.isInteger(_nat.idx) && typeof NAKSHATRA_NAMES !== 'undefined' && NAKSHATRA_NAMES[_nat.idx])
          ? NAKSHATRA_NAMES[_nat.idx]
          : '?';
        if(_t.danger){
          _personaCtx = `<div style="padding:6px 10px;margin-bottom:8px;border-radius:6px;border-left:3px solid var(--bad);background:rgba(255,107,107,.08);font-size:11px;line-height:1.5">
            <strong style="color:var(--bad)">⚠ Особистий ризик: Taara ${_t.name}</strong> для <strong>${escapeHtml(_data.name || 'тебе')}</strong> (натальна ${_natName})<br>
            <span style="color:var(--dim)">Сьогодні рекомендації нижче діють <strong>сильніше</strong> — критичний цикл.</span>
          </div>`;
        } else if(_t.group === 2 || _t.group === 4 || _t.group === 6 || _t.group === 8 || _t.group === 9){
          _personaCtx = `<div style="padding:6px 10px;margin-bottom:8px;border-radius:6px;border-left:3px solid var(--ok);background:rgba(43,212,125,.08);font-size:11px;line-height:1.5">
            <strong style="color:var(--ok)">✓ Особисто сприятливо: Taara ${_t.name}</strong> для <strong>${escapeHtml(_data.name || 'тебе')}</strong> (натальна ${_natName})
          </div>`;
        }
      }
    }
  } catch(e){ globalThis.NRDiagnostics?.record('catch.195','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  const _avoidItems = _items.filter(i => i.avoid && i.avoid.length > 0);
  const _doItems = _items.filter(i => i.do && i.do.length > 0);
  // v87.90: позначити які items є в обох списках (Vara Sunday має і do і avoid → юзер плутається)
  const _bothSet = new Set();
  for(const a of _avoidItems){
    if(_doItems.some(d => d.src === a.src)) _bothSet.add(a.src);
  }

  let _horaLine = '';
  try {
    if(typeof calcHora === 'function'){
      const _h = calcHora(new Date());
      if(_h && _h.planet){
        _horaLine = `<div style="font-size:10px;color:var(--faint);margin-bottom:6px;letter-spacing:.04em">⏱ Зараз <strong style="color:var(--muted)">${_h.planet} hora</strong>${_h.minLeft ? ` (ще ${_h.minLeft}хв)` : ''} · враховуй це при timing</div>`;
      }
    }
  } catch(e){ globalThis.NRDiagnostics?.record('catch.196','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  const _renderItem = (i, kind) => {
    const _col = i.score >= 1 ? 'var(--ok)' : i.score <= -1 ? 'var(--bad)' : 'var(--muted)';
    const _txt = kind === 'avoid' ? i.avoid : i.do;
    // v87.90: якщо src у _bothSet — позначити "змішаний день" чіпом
    const _bothBadge = _bothSet.has(i.src) ? `<span style="display:inline-block;font-size:9px;padding:1px 5px;border-radius:4px;background:rgba(255,204,68,.15);color:#ffcc44;margin-left:4px;letter-spacing:.04em" title="Цей компонент має і сприятливі, і несприятливі грані сьогодні. Зважено: дивись обидва списки.">±</span>` : '';
    return `<div style="padding:5px 0;border-bottom:1px solid rgba(30,42,68,.3);display:grid;grid-template-columns:90px 1fr;gap:10px">
      <span style="color:var(--dim);font-size:11px">
        <strong style="color:${_col}">${i.src}</strong>${_bothBadge}<br>
        <span style="font-size:10px;color:var(--faint)">${i.label}</span>
      </span>
      <span style="font-size:12px;color:var(--text2);line-height:1.5">${_txt}</span>
    </div>`;
  };

  let _html = _personaCtx + _horaLine;

  if(_avoidItems.length > 0){
    _html += `<div style="font-size:10px;color:var(--bad);letter-spacing:.12em;text-transform:uppercase;margin:4px 0 4px">${(typeof t === 'function' ? t('antiActionAvoid') : '✗ Уникати сьогодні')}</div>`;
    _avoidItems.forEach(i => { _html += _renderItem(i, 'avoid'); });
  }

  if(_doItems.length > 0){
    _html += `<div style="font-size:10px;color:var(--ok);letter-spacing:.12em;text-transform:uppercase;margin:10px 0 4px">${(typeof t === 'function' ? t('antiActionDo') : '✓ Сприятливо для')}</div>`;
    _doItems.forEach(i => { _html += _renderItem(i, 'do'); });
  }

  if(_avoidItems.length === 0 && _doItems.length === 0){
    _html += `<div style="color:var(--dim);font-size:12px">${(typeof t === 'function' ? t('antiActionNeutral') : 'Нейтральний день — без сильних рекомендацій. Дій за стандартним планом.')}</div>`;
  }

  _html += `<div style="margin-top:8px;padding:6px 8px;font-size:10px;color:var(--faint);background:rgba(11,18,32,.6);border-radius:6px;line-height:1.5">
    ${(typeof t === 'function' ? t('antiActionFooter') : 'Джерела: BPHS Vol.2 (muhurta), традиційна Vedic panchanga. Рекомендації <strong>advisory</strong>, не медичні/фінансові поради.')}
  </div>`;

  _el.innerHTML = _html;

  // v87.90: dynamic preview line у summary — кількість avoid/do рекомендацій
  const _aPrev = document.getElementById('antiActionPreview');
  if(_aPrev){
    if(_avoidItems.length === 0 && _doItems.length === 0){
      _aPrev.textContent = 'Нейтральний день — без сильних рекомендацій';
    } else {
      const parts = [];
      if(_avoidItems.length > 0) parts.push(`<strong style="color:var(--bad)">${_avoidItems.length} уникати</strong>`);
      if(_doItems.length > 0) parts.push(`<strong style="color:var(--ok)">${_doItems.length} сприятливо</strong>`);
      _aPrev.innerHTML = `Панчанга: ${parts.join(' · ')} <span style="color:var(--faint);font-size:10px">· advisory layer, не змінює PDF/Engine verdict</span>`;
    }
  }
}/* NR_FN_END 269 */

/* NR_FN_BEGIN 270 */function renderDisagreement(){
  const _alert = document.getElementById('disagreementAlert');
  if(!_alert) return;
  // fp412: explain provenance divergence only; never synthesize advice.
  const _ui412 = window.__uiState || {};
  const _g412 = Number(_ui412.gNow);
  const _e412 = (typeof getEngineScore === 'function') ? getEngineScore(new Date(todayKyivStr()+'T12:00:00Z')) : null;
  const _ref412 = _e412 && Number.isFinite(Number(_e412.eng)) ? Number(_e412.eng) : null;
  if(Number.isFinite(_g412) && _ref412 !== null && Math.sign(_g412) !== Math.sign(_ref412)){
    _alert.style.display='block';
    _alert.innerHTML='<strong>Джерела розходяться.</strong> G_now — поточний контекст; PDF/Engine — окремий денний reference. Це пояснення розбіжності, не команда. Оперативне рішення показане лише у головному блоці.';
  } else {
    _alert.style.display='none';
    _alert.innerHTML='';
  }
  return;
  const _ui = window.__uiState || {};
  const _gNow = _ui.gNow ?? NaN;
  const _eng = (typeof getEngineScore === 'function') ? getEngineScore(new Date(todayKyivStr()+'T12:00:00Z')) : null;
  const _engVal = _eng ? _eng.eng : null;
  const _pdfVal = (_eng && _eng.pdf != null) ? _eng.pdf : null;

  // Σ year ago — historical pattern (без Kp бо historical Kp недоступний)
  let _sigmaYear = null;
  try {
    if(typeof computeAi === 'function' && typeof sunriseUTC === 'function'){
      const _ya = new Date();
      const _mBefore = _ya.getUTCMonth();
      _ya.setUTCFullYear(_ya.getUTCFullYear() - 1);
      // v88.8.37-fp70: leap-day guard. 29.02 → setUTCFullYear(-1) на невисокосний
      // рік дає 01.03 (місяць зсувається з 1 на 2). Відкочуємо на 28.02 щоб
      // year-ago лишалось у тому самому місяці (коректна календарна точка).
      if(_ya.getUTCMonth() !== _mBefore){
        _ya.setUTCDate(_ya.getUTCDate() - 1);
      }
      _sigmaYear = computeAi(sunriseUTC(_ya), 0).Ai;
    }
  } catch(e){ globalThis.NRDiagnostics?.record('catch.197','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  const _models = [];
  if(isFinite(_gNow))    _models.push({
    name: 'Live G',
    val: _gNow,
    sub: 'фон зараз: 2−Kp+ΣAᵢ',
    tip: 'Поточна continuous-оцінка на основі реального Kp NOAA + Vedic Panchanga компонентів. Continuous score (-5..+7).'
  });
  if(_engVal != null)    _models.push({
    name: (_eng && _eng._expertOverride) ? 'PDF/Engine' : 'Engine',
    val: _engVal,
    sub: (_eng && _eng._expertOverride) ? 'прогноз дня з PDF' : 'правила engine',
    tip: 'Engine v18.5 — правило-базована модель. Дискретний рейтинг −3..+3 на історичних даних. Holdout (n=56): 75.0% strict / 82.1% binary · Global (n=280): 71.4% strict / 83.6% binary · Cohen κ=0.52. R&D / Advisory — V3 prospective freeze 2026-05-03 → ~2026-08-01.'
  });
  if(_pdfVal != null)    _models.push({
    name: 'Бюлетень',
    val: _pdfVal,
    sub: 'експерт, ручна оцінка',
    tip: 'PDF-бюлетень — manual оцінка експерта з історичних бюлетенів. Дискретна шкала −3..+3.'
  });
  if(_sigmaYear != null) _models.push({
    // v88.8.5 Б1 fix: явний label "Σ Рік тому" (не "Рік тому") — щоб користувач
    // одразу бачив що це астро-сума ΣAᵢ, а не G рік тому. Раніше "+1.20" поряд
    // з "Engine +3" виглядав як G у тих самих одиницях, але насправді це
    // тільки Lᵢ+Mᵢ+eᵢ+Pᵢ (без Kp компонента).
    name: 'Σ Рік тому',
    val: _sigmaYear,
    sub: 'тільки астро (без Kp)',
    tip: '⏳ ІСТОРИЧНІ ДАНІ — не порівнюй з G напряму!\n\nΣ Year ago — обчислення ΣAᵢ для тої самої дати РІК ТОМУ.\n• Тільки Lᵢ+Mᵢ+eᵢ+Pᵢ компоненти (БЕЗ Kp — historical Kp недоступний).\n• Інша одиниця ніж G (G = 2 − Kp + ΣAᵢ).\n• Інша дата — не сьогодні, а та сама календарна точка минулого року.\n\nЦе reference для річного астро-ритму — порівняння поточних астро-факторів з тими, що були рік тому. НЕ є "ще одне джерело сьогоднішньої оцінки".\n\nНЕ плутай з 7-day mean у "Прогноз на 27 днів".'
  });

  if(_models.length < 2){ _alert.style.display = 'none'; return; }

  // v88.8.18 Bug fix: Σ Рік тому — історичні астро-дані (інша дата, без Kp).
  // НЕ повинно тригерити warnings про "сьогоднішній розкид/конфлікт", бо це не сьогоднішнє джерело.
  // Range і sign conflict — лише з today's моделей. Σ Рік тому показується окремо як reference.
  const _todayVals = _models.filter(m => m.name !== 'Σ Рік тому').map(m => m.val);
  const _todayMax = _todayVals.length ? Math.max(..._todayVals) : 0;
  const _todayMin = _todayVals.length ? Math.min(..._todayVals) : 0;
  const _todayRange = _todayMax - _todayMin;
  // v88.8.36-fp56-P12g: поріг конфлікту знаків знижено 0.5→0.1. Кейс 13.06: LIVE +0.20 vs PDF −3
  // не тригерив _signConflict (бо +0.20 < 0.5 не вважалось «позитивним») → блок казав «в одному
  // напрямку», хоча знаки протилежні. 0.1 відсікає лише істинний нуль, не реальний слабкий плюс.
  const _hasPos = _todayVals.some(v => v > 0.1);
  const _hasNeg = _todayVals.some(v => v < -0.1);
  const _signConflict = _hasPos && _hasNeg;

  // v88.6.9: поріг range 2.5 → 3.0 щоб не trigger warning при normal architectural divergence
  // (Hero continuous score vs Engine discrete tag-model завжди дають ~2 бали рiзницi navit pri spокiйному днi)
  // Sign conflict (один + iнший −) залишається тригером ВЖИВЕ.
  // v88.8.18: trigger тільки якщо today's range ≥3 (БЕЗ Σ Рік тому, бо то інша одиниця).
  if(_todayRange < 3.0 && !_signConflict){
    _alert.style.display = 'none';
    return;
  }

  // v87.90: повний redesign — 3-секційна структура
  // Section 1: Що сталося (заголовок + одне речення WHY)
  // Section 2: Числа моделей з підписами під кожним
  // Section 3: Що робити (1-2 чіткі дії)

  const _title = _signConflict
    ? 'ℹ Два контури: прогноз дня і фон зараз різні'
    : `ℹ Різна сила сигналів (розкид ${_todayRange.toFixed(1)} балів)`;

  const _why = _signConflict
    ? 'PDF/Engine дає денний прогноз, а Live G показує тактичний фон зараз. Це не математичний конфлікт: це дві різні шкали, тому діємо за live-guard, але прогноз дня лишається PDF/Engine.'
    : `Сьогоднішні контури (Live G, Engine/PDF${_pdfVal != null ? ', Бюлетень' : ''}) вказують в одному напрямку, але з різною силою. Розкид ${_todayRange.toFixed(1)} бала — це невизначеність сили, не зміна знаку.`;

  const _conf = _signConflict ? '~30%' : _todayRange >= 4 ? '~25%' : '~15%';

  const _action = _signConflict
    ? `Не змішуй індекси: <strong style="color:#ffd2a0">PDF/Engine = прогноз дня</strong>, <strong style="color:#ffd2a0">Live G = дія зараз</strong>. Якщо Live G негативний — не стартуй нове, навіть коли день у PDF позитивний.`
    : `Рівень сили не однаковий. Для важливого рішення звір 1–2 додаткові сигнали (NOAA SWPC, Panchanga, локальне самопочуття).`;

  // Кожна модель — окремий блок з name + value + subtitle (хто це)
  const _modelsHtml = _models.map(m => {
    const col = m.val >= 0.5 ? 'var(--ok)' : m.val <= -0.5 ? 'var(--bad)' : 'var(--muted)';
    let valStr;
    if (Math.abs(m.val) < 0.005) valStr = '0';
    else if (Number.isInteger(m.val)) valStr = (m.val > 0 ? '+' : '') + m.val;
    else valStr = (m.val > 0 ? '+' : '') + m.val.toFixed(2);
    const _tip = m.tip ? ` title="${m.tip.replace(/"/g,'&quot;')}"` : '';
    // v88.8.18 Bug fix: Σ Рік тому — distinct styling (історичні дані, інша одиниця).
    const _isHist = m.name === 'Σ Рік тому';
    // v88.8.35-fp7 J: видимий label кодує що це ΣAᵢ-шкала (астро без Kp), не G.
    // Внутрішнє m.name лишається 'Σ Рік тому' — filter і compare логіка не змінюється.
    const _displayName = _isHist ? 'ΣAᵢ рік тому' : m.name;
    const _bg = _isHist ? 'rgba(70,90,130,.25)' : 'rgba(11,18,32,.55)';
    const _bd = _isHist ? '1px dashed rgba(155,177,220,.45)' : '1px solid rgba(255,170,51,.15)';
    const _histBadge = _isHist ? '<span style="font-size:10px;color:#ffaa33;background:rgba(255,170,51,.18);padding:2px 6px;border-radius:4px;margin-left:4px;font-weight:700;letter-spacing:.04em" title="Це історичні дані — інша дата (та сама календарна точка минулого року). НЕ сьогоднішня оцінка.">⏳ ІНША ДАТА</span>' : '';
    return `<div${_tip} style="flex:1;min-width:90px;padding:6px 8px;border-radius:6px;background:${_bg};border:${_bd};cursor:help;display:flex;flex-direction:column;gap:1px;align-items:flex-start">
      <span style="font-size:10px;color:var(--dim);letter-spacing:.04em;text-transform:uppercase">${_displayName}${_histBadge}</span>
      <span style="font-family:var(--mono),ui-monospace,monospace;font-size:16px;font-weight:700;color:${col}">${valStr}</span>
      <span style="font-size:9px;color:var(--faint);line-height:1.3">${m.sub}</span>
    </div>`;
  }).join('');

  // v88.8.37-fp70: «Два контури» згорнуто у <details> — компактний рядок завжди видно,
  // технічні деталі (4 моделі + дія) розгортаються кліком. 95% юзерів не читають аудит-рівень,
  // тому за замовчуванням згорнуто. Summary = одне речення суті.
  const _summaryLine = _signConflict
    ? 'ℹ Зараз фон кращий, ніж прогноз дня — деталі'
    : `ℹ Сигнали різної сили (розкид ${_todayRange.toFixed(1)}) — деталі`;
  _alert.innerHTML = `
    <details style="cursor:pointer">
      <summary style="font-weight:600;color:#ffd2a0;font-size:12px;line-height:1.4;list-style:none;outline:none">${_summaryLine}</summary>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-top:8px">
        <span style="font-size:20px;line-height:1.1;flex:0 0 auto">⚠</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;color:#ffd2a0;font-size:14px;line-height:1.3">${_title}</div>
          <div style="margin-top:4px;font-size:11px;color:var(--text2);line-height:1.5">${_why}</div>
          <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">${_modelsHtml}</div>
          <div style="margin-top:8px;padding:7px 10px;border-radius:6px;background:rgba(255,204,68,.06);border-left:2px solid rgba(255,204,68,.4);font-size:11px;color:var(--text2);line-height:1.5">
            <strong style="color:#ffcc44">Що робити:</strong> ${_action}
          </div>
        </div>
      </div>
    </details>`;
  _alert.style.display = 'block';
}/* NR_FN_END 270 */

/* NR_FN_BEGIN 271 */function renderIntraDayAlert(){
  const _alert = document.getElementById('intraDayAlert');
  if(!_alert) return;

  const _kpNow = (typeof lastWWV !== 'undefined' && lastWWV && isFinite(lastWWV.kNow)) ? lastWWV.kNow : NaN;
  if(!isFinite(_kpNow)){ _alert.style.display = 'none'; return; }

  if(typeof last3D === 'undefined' || !last3D || !last3D.days || !last3D.days.length){ _alert.style.display = 'none'; return; }
  if(last3D._synthetic){ _alert.style.display = 'none'; return; } // synthetic не має внутрішньодобових змін

  const _today = last3D.days[0];
  if(!_today || !_today.kp8 || !_today.kp8.length){ _alert.style.display = 'none'; return; }

  const _now = new Date();
  const _hUTC = _now.getUTCHours();
  const _curSlot = Math.floor(_hUTC / 3);
  const _futureSlots = _today.kp8.slice(_curSlot + 1).filter(v => isFinite(v));
  if(_futureSlots.length === 0){ _alert.style.display = 'none'; return; }

  const _minFuture = Math.min(..._futureSlots);
  const _maxFuture = Math.max(..._futureSlots);
  const _dropDelta = _kpNow - _minFuture;
  const _riseDelta = _maxFuture - _kpNow;

  const SIGNIFICANT = 1.5;
  let _msg = null, _col = '#ffaa33';

  if(_dropDelta >= SIGNIFICANT){
    const _minIdx = _today.kp8.indexOf(_minFuture, _curSlot + 1);
    const _minHourUTC = _minIdx * 3;
    // v87.91 fix: був hardcoded UTC+3 (тільки Київ влітку). Беремо реальний локальний час браузера.
    const _slotDate = new Date(_today.date instanceof Date ? _today.date : new Date());
    _slotDate.setUTCHours(_minHourUTC, 0, 0, 0);
    const _localHour = _slotDate.getHours();
    const _hourStr = String(_localHour).padStart(2,'0') + ':00';
    const _gNow = window.__uiState?.gNow ?? NaN;
    const _gFuture = isFinite(_gNow) ? _gNow - _dropDelta : NaN;
    _msg = {
      icon: '📉',
      title: `Kp впаде ${_kpNow.toFixed(1)} → ${_minFuture.toFixed(1)} ближче до ${_hourStr}`,
      body: `За кілька годин геомагнітний фон ослабне на ${_dropDelta.toFixed(1)} пункти. ${isFinite(_gFuture) ? `G знизиться приблизно з ${_gNow >= 0 ? '+' : ''}${_gNow.toFixed(2)} до ${_gFuture >= 0 ? '+' : ''}${_gFuture.toFixed(2)}.` : ''}`,
      action: 'Завершуй важливе зараз. Увечері — планові і консервативні завдання.'
    };
    _col = '#ffaa33';
  } else if(_riseDelta >= SIGNIFICANT){
    const _maxIdx = _today.kp8.indexOf(_maxFuture, _curSlot + 1);
    const _maxHourUTC = _maxIdx * 3;
    // v87.91 fix: реальний локальний час замість hardcoded UTC+3
    const _slotDate = new Date(_today.date instanceof Date ? _today.date : new Date());
    _slotDate.setUTCHours(_maxHourUTC, 0, 0, 0);
    const _localHour = _slotDate.getHours();
    const _hourStr = String(_localHour).padStart(2,'0') + ':00';
    _msg = {
      icon: '📈',
      title: `Kp зросте ${_kpNow.toFixed(1)} → ${_maxFuture.toFixed(1)} ближче до ${_hourStr}`,
      body: `За кілька годин геомагнітний фон підсилиться на ${_riseDelta.toFixed(1)} пункти. Поточний спокій тимчасовий.`,
      action: _maxFuture >= 5 ? 'Готуйся до G1+ бурі. Перенеси критичні комунікації.' : 'Активніше використовуй спокійні години зараз.'
    };
    // v88.8.35-fp12 Z: PDF/Engine ≤ -2 hard-cap — навіть якщо локально Kp дозволяє "активніше",
    // загальний день критичний. Переписуємо action на "тільки для рутини / підготовки".
    try {
      const _eTd = (typeof getEngineScore === 'function') ? getEngineScore(new Date(todayKyivStr()+'T12:00:00Z')) : null;
      const _eTdS = (_eTd && isFinite(_eTd.eng)) ? Number(_eTd.eng) : null;
      if (_eTdS !== null && _eTdS <= -2 && _maxFuture < 5) {
        _msg.action = `Використовуй спокійні години тільки для рутини й підготовки (день PDF/Engine = ${_eTdS}).`;
      }
    } catch(e){ window.NRDiagnostics?.record('legacy.catch.197','recoverable'); }
    _col = _maxFuture >= 5 ? '#ff6b6b' : '#ffaa33';
  } else {
    _alert.style.display = 'none';
    return;
  }

  _alert.style.borderColor = _col + '80';
  _alert.style.background = `linear-gradient(180deg,${_col}1a,${_col}06)`;
  // v88.8.35-fp13 CC + fp15 GG: якщо forecast застарілий — додати застереження.
  // fp15 GG: розрізняємо ESTIMATED (real forecast, ≤12h затримка) від PARTIAL (severe).
  // Banner будує прогноз з last3D.days[0].kp8; якщо ці дані не свіжі, видимий "Kp впаде 5.3→3.3"
  // може не відповідати поточному NOAA feed.
  let _staleNote = '';
  try {
    const _dmExt = (typeof resolveDataModeExtended === 'function') ? resolveDataModeExtended() : null;
    const _dm = _dmExt || (typeof window !== 'undefined' && window.__dataMode)
              || (typeof resolveDataMode === 'function' ? resolveDataMode() : 'live');
    if (_dm !== 'live') {
      let _srcLabel = 'затриманого';
      let _noteColor = '#ffd2a0';
      if (_dm === 'scenario')      { _srcLabel = 'сценарного'; _noteColor = '#ff9966'; }
      else if (_dm === 'estimated'){ _srcLabel = 'злегка-несвіжого (≤12год) реального'; _noteColor = '#a8d5e0'; }
      else if (_dm === 'partial')  { _srcLabel = 'застарілого (>12год) реального'; _noteColor = '#ffd2a0'; }
      else if (_dm === 'offline')  { _srcLabel = 'OFFLINE — старі кешовані'; _noteColor = '#ff8a7a'; }
      _staleNote = `<div style="margin-top:4px;font-size:10px;color:${_noteColor};font-style:italic">⚠ Прогноз будується із ${_srcLabel} NOAA 3-day feed — звірте з swpc.noaa.gov перед рішенням.</div>`;
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.198','recoverable'); }
  _alert.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px">
      <span style="font-size:20px;line-height:1.1;flex:0 0 auto">${_msg.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;color:${_col};font-size:13px;line-height:1.3">${_msg.title}</div>
        <div style="margin-top:3px;font-size:11px;color:var(--text2);line-height:1.5">${_msg.body}</div>
        <div style="margin-top:6px;padding:6px 9px;border-radius:6px;background:rgba(11,18,32,.5);border-left:2px solid ${_col};font-size:11px;color:var(--text2);line-height:1.5">
          <strong style="color:${_col}">Що робити:</strong> ${_msg.action}
        </div>
        ${_staleNote}
      </div>
    </div>`;
  _alert.style.display = 'block';
}/* NR_FN_END 271 */

/* NR_FN_BEGIN 272 */function renderCounterfactual(){
  const _el = document.getElementById('counterfactualContent');
  if(!_el) return;
  const _ui = window.__uiState || {};
  const _ai = _ui.ai || {};
  const _gNow = _ui.gNow ?? NaN;
  const _kpNow = _ui.kpNow ?? NaN;

  if(!isFinite(_gNow) || !isFinite(_kpNow)){
    _el.innerHTML = '<span style="color:var(--dim)">Дані ще завантажуються…</span>';
    return;
  }

  const _Li = _ai.Li || 0;
  const _Mi = _ai.Mi || 0;
  const _ei = _ai.ei || 0;
  const _Pi = _ai.Pi || 0;
  const _Di = _ai.Di || 0;

  // Top-driver / antitop analysis
  const _kpPart = kpDayTerm(_kpNow);
  const _components = [
    { name: '2 − Kp',          val: _kpPart, label: 'геомагнітний фон' },
    { name: 'Lᵢ',              val: _Li,     label: 'тітхі (місячний день)' },
    { name: 'Mᵢ',              val: _Mi,     label: 'затемнення/їх вікно' },
    { name: 'eᵢ',              val: _ei,     label: 'календарні події' },
    { name: 'Pᵢ',              val: _Pi,     label: 'панчанга (Vara/Nak/Yoga/Karana)' },
    { name: 'Dᵢ',              val: _Di,     label: 'Dst-буря' }
  ].filter(c => Math.abs(c.val) >= 0.05);
  _components.sort((a,b) => Math.abs(b.val) - Math.abs(a.val));

  // Top-driver banner
  let _topHtml = '';
  if(_components.length > 0){
    const _top = _components[0];
    // v88.9.34-fp215 (аудит-раунд-5, той самий клас Problem 3): для Kp той самий
    // сирий знак val>0 давав хибний колір/текст — спокійний Kp (val<0) писався
    // як "найбільше тисне" червоним, хоча фізично це добре. Той самий фізичний
    // поріг, що вже в renderKpContribution (fp212) і why-cause-chain (fp215 вище).
    const _isTopKp = _top.name === '2 − Kp';
    const _topPhysicalBad = _isTopKp ? ((_top.val + 2) >= 3) : (_top.val < 0);
    const _topCol = _topPhysicalBad ? 'var(--bad)' : 'var(--ok)';
    const _topAction = _topPhysicalBad ? 'найбільше тисне' : 'найбільше додає';
    // v87.90: clean format — нуль як "0"
    const _topStr = Math.abs(_top.val) < 0.05 ? '0' : (_top.val > 0 ? '+' : '') + _top.val.toFixed(1);
    const _secStr = _components.length >= 2
      ? (Math.abs(_components[1].val) < 0.05 ? '0' : (_components[1].val > 0 ? '+' : '') + _components[1].val.toFixed(1))
      : '';
    _topHtml = `<div style="padding:8px 10px;margin-bottom:10px;background:rgba(11,18,32,.7);border-radius:6px;border-left:3px solid ${_topCol};font-size:12px;line-height:1.5">
      <strong style="color:${_topCol}">${_top.name} ${_topAction}</strong> сьогодні: <span class="mono" style="font-family:var(--mono),ui-monospace,monospace;font-weight:700;color:${_topCol}">${_topStr}</span>
      <span style="color:var(--dim)">(${_top.label})</span>
      ${_components.length >= 2 ? `<br><span style="color:var(--faint);font-size:10px">Другий за впливом: <strong>${_components[1].name}</strong> (${_secStr})</span>` : ''}
    </div>`;
  } else {
    _topHtml = `<div style="padding:8px 10px;margin-bottom:10px;background:rgba(11,18,32,.7);border-radius:6px;font-size:12px;color:var(--dim)">Усі компоненти близькі до 0 — нейтральний день.</div>`;
  }

  // Counterfactual scenarios — arithmetic deltas (швидко, без re-running computeAi)
  const _scenarios = [
    {
      icon: '🟦',
      label: (typeof t === 'function' ? t('counterfactualScenPi0') : 'Якби Pᵢ був 0 (нейтральна панчанга)'),
      delta: -_Pi,
      hint: Math.abs(_Pi) < 0.1 ? 'Pᵢ вже ≈0 — без змін' : (_Pi > 0 ? 'Без панчанги було б гірше' : 'Без панчанги було б краще')
    },
    {
      icon: '🌑',
      label: (typeof t === 'function' ? t('counterfactualScenAmavasya') : 'Якби була Амавасья (Lᵢ=−3)'),
      delta: (-3) - _Li,
      hint: 'Місяць у з\'єднанні з Сонцем — найскладніший lunar день'
    },
    {
      icon: '☄',
      label: (typeof t === 'function' ? t('counterfactualScenEclipse') : 'Якби було повне затемнення (Mᵢ=−4)'),
      delta: (-4) - _Mi,
      hint: 'Total eclipse — критичний день за BPHS'
    },
    {
      icon: '⚡',
      label: (typeof t === 'function' ? t('counterfactualScenStorm') : 'Якби буря Kp=7 (G3+)'),
      delta: kpDayTerm(7) - kpDayTerm(_kpNow),
      hint: 'Сильна геомагнітна буря — Kp різко вгору'
    },
    {
      icon: '☀',
      label: (typeof t === 'function' ? t('counterfactualScenCalm') : 'Якби Kp був 1 (дуже спокійно)'),
      delta: kpDayTerm(1) - kpDayTerm(_kpNow),
      hint: 'Спокійне геомагнітне поле'
    }
  ];

  let _scenHtml = `<div style="font-size:11px;color:var(--dim);margin-bottom:6px">${(typeof t === 'function' ? t('counterfactualHeader') : 'Що було б, якби один компонент був інакшим:')}</div>`;
  for(const _s of _scenarios){
    const _newG = _gNow + _s.delta;
    // v88.7+ (deep audit): scenarios "storm" і "calm" перевизначають Kp,
    // тому колір має враховувати модифікований Kp (G3+ storm не може бути зеленим).
    let _scenKp = _kpNow;
    if (_s.label && _s.label.includes('Kp=7')) _scenKp = 7;
    else if (_s.label && _s.label.includes('Kp був 1')) _scenKp = 1;
    const _scenCls = classifyStateByG(_newG, _scenKp);
    const _col = (_scenCls === 'favorable' || _scenCls === 'good') ? 'var(--ok)'
               : _scenCls === 'neutral' ? '#ffd77a'
               : _scenCls === 'unstable' ? 'var(--warn)'
               : 'var(--bad)';
    const _dCol = _s.delta > 0.1 ? 'var(--ok)' : _s.delta < -0.1 ? 'var(--bad)' : 'var(--dim)';
    // v87.90: clean format — нуль як "0" замість "+0.0"
    const _newGStr = Math.abs(_newG) < 0.005 ? '0.00' : (_newG > 0 ? '+' : '') + _newG.toFixed(2);
    const _deltaStr = Math.abs(_s.delta) < 0.05 ? '0' : (_s.delta > 0 ? '+' : '') + _s.delta.toFixed(1);
    _scenHtml += `<div style="display:grid;grid-template-columns:24px 1fr 90px;gap:10px;padding:6px 0;border-bottom:1px solid rgba(30,42,68,.4);align-items:center">
      <span style="font-size:14px;text-align:center">${_s.icon}</span>
      <div>
        <div style="font-size:12px;color:var(--text2)">${_s.label}</div>
        <div style="font-size:10px;color:var(--faint);margin-top:1px">${_s.hint}</div>
      </div>
      <div style="text-align:right">
        <div class="mono" style="font-family:var(--mono),ui-monospace,monospace;font-size:14px;font-weight:700;color:${_col}">G ${_newGStr}</div>
        <div class="mono" style="font-family:var(--mono),ui-monospace,monospace;font-size:9px;color:${_dCol}">Δ ${_deltaStr}</div>
      </div>
    </div>`;
  }

  _el.innerHTML = _topHtml + _scenHtml +
    `<div style="margin-top:8px;padding:6px 8px;font-size:10px;color:var(--faint);background:rgba(11,18,32,.6);border-radius:6px;line-height:1.5">
      Ablation: arithmetic delta з поточної формули G = 2 − Kp + ΣAᵢ. Не враховує вторинних ефектів (lunar_mod на Pᵢ при зміні фази тощо).
    </div>`;

  // v87.90: dynamic preview line у summary — реальний top-driver сьогодні
  const _prevEl = document.getElementById('counterfactualPreview');
  if(_prevEl && _components.length > 0){
    const _topD = _components[0];
    const _topStr = Math.abs(_topD.val) < 0.05 ? '0' : (_topD.val > 0 ? '+' : '') + _topD.val.toFixed(1);
    const _topAct = _topD.val > 0 ? 'додає' : 'тисне';
    const _topCol = _topD.val > 0 ? 'var(--ok)' : 'var(--bad)';
    _prevEl.innerHTML = `Сьогодні найбільше <strong style="color:${_topCol}">${_topD.name} ${_topAct}</strong> (${_topStr}) · 5 «якби» сценаріїв всередині`;
  }
}/* NR_FN_END 272 */

/* NR_FN_BEGIN 295 */function renderGaugeMoon(G, phaseDeg, kp, phaseName) {
  // v75: gauge SVG removed (gaugeMoonWrap dead since v74), keep moonMini + planetAnim
  const toRad = d => d * Math.PI / 180;
  const illum = (1 - Math.cos(toRad(phaseDeg))) / 2;
  const moonPhaseWarning = (phaseName==='Пурніма (Повня)'||phaseName==='Амавасья');

  // v70.8: compact moon-only SVG for astroGrid moonCard
  const moonMini = document.getElementById('moonMiniSvg');
  if(moonMini){
    const mmSvg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">
      <circle cx="50" cy="50" r="42" fill="#111108"/>
      ${phaseDeg <= 180
        ? `<rect x="50" y="8" width="42" height="84" fill="#c0c0b0" clip-path="url(#mmClip)"/>
           <ellipse cx="50" cy="50" rx="${Math.abs(42*Math.cos(phaseDeg*Math.PI/180)).toFixed(1)}" ry="42" fill="${illum<0.5?'#111108':'#c0c0b0'}" clip-path="url(#mmClip)"/>`
        : `<rect x="8" y="8" width="42" height="84" fill="#c0c0b0" clip-path="url(#mmClip)"/>
           <ellipse cx="50" cy="50" rx="${Math.abs(42*Math.cos(phaseDeg*Math.PI/180)).toFixed(1)}" ry="42" fill="${illum<0.5?'#111108':'#c0c0b0'}" clip-path="url(#mmClip)"/>`
      }
      <defs><clipPath id="mmClip"><circle cx="50" cy="50" r="42"/></clipPath></defs>
      <circle cx="50" cy="50" r="42" fill="none" stroke="${moonPhaseWarning?'#ff9933':'#2a3050'}" stroke-width="1.5"/>
      <circle cx="60" cy="44" r="4" fill="none" stroke="#1a1a15" stroke-width="1" opacity="0.5"/>
      <circle cx="42" cy="61" r="3" fill="none" stroke="#1a1a15" stroke-width="0.9" opacity="0.45"/>
      <circle cx="55" cy="65" r="3.5" fill="none" stroke="#1a1a15" stroke-width="0.9" opacity="0.4"/>
    </svg>`;
    moonMini.innerHTML = mmSvg;
  }

  // v88.8.6 Д1: компактна lunar phase іконка у hero (під G ring) — постійно видима.
  // Той самий phaseDeg/illum алгоритм як moonMini, але 32x32 розмір.
  const heroMoon = document.getElementById('heroMoonPhaseIcon');
  const heroMoonSvg = document.getElementById('heroMoonSvg');
  const heroMoonLabel = document.getElementById('heroMoonLabel');
  if (heroMoon && heroMoonSvg && heroMoonLabel && isFinite(phaseDeg)) {
    const phaseShort = (phaseName || '?').length > 14
      ? (phaseName || '?').substring(0, 13) + '…'
      : (phaseName || '?');
    const illumPct = Math.round(illum * 100);
    const compactSvg = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="width:32px;height:32px">
      <circle cx="16" cy="16" r="14" fill="#0a0a08" stroke="${moonPhaseWarning?'#ff9933':'#2a3050'}" stroke-width="1"/>
      ${phaseDeg <= 180
        ? `<rect x="16" y="2" width="14" height="28" fill="#c0c0b0" clip-path="url(#hmpClip)"/>
           <ellipse cx="16" cy="16" rx="${Math.abs(14*Math.cos(phaseDeg*Math.PI/180)).toFixed(1)}" ry="14" fill="${illum<0.5?'#0a0a08':'#c0c0b0'}" clip-path="url(#hmpClip)"/>`
        : `<rect x="2" y="2" width="14" height="28" fill="#c0c0b0" clip-path="url(#hmpClip)"/>
           <ellipse cx="16" cy="16" rx="${Math.abs(14*Math.cos(phaseDeg*Math.PI/180)).toFixed(1)}" ry="14" fill="${illum<0.5?'#0a0a08':'#c0c0b0'}" clip-path="url(#hmpClip)"/>`
      }
      <defs><clipPath id="hmpClip"><circle cx="16" cy="16" r="14"/></clipPath></defs>
    </svg>`;
    heroMoonSvg.innerHTML = compactSvg;
    heroMoonLabel.innerHTML = `${illumPct}% освітл.`;
    heroMoon.title = `🌙 ${phaseName || '—'}\nОсвітлення: ${illumPct}%\nКут фази: ${phaseDeg.toFixed(1)}°\n\nВплив на Lᵢ (геомагніт-чутливість):\n• Амавасья → Lᵢ=−3 (авторська дослідницька вага)\n• Перша / Остання чверть → Lᵢ=0\n• Пурніма → Lᵢ=−2 при Kp≥7; −1 при 5≤Kp<7; інакше 0 (дослідницька гіпотеза)\n• Решта днів → Lᵢ=0`;
    heroMoon.style.display = '';
  } else if (heroMoon) {
    heroMoon.style.display = 'none';
  }

  // ── Анімація планет — подвійний rAF: 1й — layout reflow, 2й — offsetWidth вже коректний ──
  requestAnimationFrame(() => requestAnimationFrame(() => renderPlanetAnimation(kp, phaseDeg, G, _lastPanchCtx, _lastAstroCtx)));
}/* NR_FN_END 295 */

/* NR_FN_BEGIN 297 */function renderPlanetAnimation(kp, moonPhaseDeg, G, panchCtx, astroCtx) {
  let canv = document.getElementById('planetCanvas');
  if (!canv) {
    const wrap = document.getElementById('gaugeMoonWrapTop');
    if (!wrap) return;
    canv = document.createElement('canvas');
    canv.id = 'planetCanvas';
    canv.style.cssText = 'display:block;width:100%;max-width:100%;box-sizing:border-box;margin-top:8px;border-radius:10px;background:#060d1a;cursor:crosshair';
    wrap.appendChild(canv);

    // v54: hover tooltip
    let _hoverTip = null;
    let _tipDiv = document.getElementById('planetTooltip');
    if (!_tipDiv) {
      _tipDiv = document.createElement('div');
      _tipDiv.id = 'planetTooltip';
      _tipDiv.style.cssText = 'position:fixed;display:none;background:#0a1628;border:1px solid #1e3560;border-radius:6px;padding:5px 9px;font-size:11px;color:#c8d8f0;pointer-events:none;z-index:9999;max-width:180px;line-height:1.5';
      document.body.appendChild(_tipDiv);
    }

    canv.addEventListener('mousemove', function(ev) {
      const rect = canv.getBoundingClientRect();
      const scX = (ev.clientX - rect.left) * (canv.width / rect.width / (window.devicePixelRatio||1));
      const scY = (ev.clientY - rect.top)  * (canv.height / rect.height / (window.devicePixelRatio||1));
      const _W2 = rect.width, _H2 = rect.height;
      const _CX2 = _W2/2, _CY2 = _H2/2;
      const _maxR2 = Math.min(_CX2, _CY2) - 22;
      const _minR2 = _maxR2 * 0.10;
      const _logO2 = PLANET_DEF.map((_p,_i) => Math.round(_minR2 * Math.pow(_maxR2/_minR2, _i/(PLANET_DEF.length-1))));
      let found = null;
      PLANET_DEF.forEach((_p, _i) => {
        const _ang = ((_planetPhase[_p.name]||0)) * Math.PI/180; // approx static pos for hit test
        const _ox = _CX2 + _logO2[_i] * Math.cos(_ang);
        const _oy = _CY2 + _logO2[_i] * Math.sin(_ang);
        const _mx = (ev.clientX - rect.left), _my = (ev.clientY - rect.top);
        const _dist = Math.hypot(_mx - _ox, _my - _oy);
        if (_dist < (_p.r + 10) * 1.5) found = _p;
      });
      if (found) {
        const _imp2 = PLANET_IMPACT[found.name];
        const _ret2 = isRetrograde(found.name, new Date());
        const _de = _ret2 === null ? NaN : _imp2 ? (_ret2 ? _imp2.eiRetro : _imp2.eiNorm) : 0;
        const _ctx2 = _ret2 === null ? 'Немає перевірених даних про рух' : _ret2 ? _imp2?.retro : _imp2?.norm;
        const _deStr = !Number.isFinite(_de) ? '—' : _de > 0 ? `<span style="color: var(--ok)">+${_de}</span>` : _de < 0 ? `<span style="color: var(--bad)">${_de}</span>` : `<span style="color:var(--faint)">0</span>`;
        _tipDiv.innerHTML = `<b style="color:${found.color}">${found.symbol} ${found.ua}</b><br>ΔEᵢ = ${_deStr}<br><span style="color:#7a90b0">${_ctx2||'—'}</span>${_ret2?'<br><span style="color:'+found.retroColor+'">℞ ретроградна</span>':''}`;
        _tipDiv.style.display = 'block';
        _tipDiv.style.left = (ev.clientX + 14) + 'px';
        _tipDiv.style.top  = (ev.clientY - 10) + 'px';
      } else {
        _tipDiv.style.display = 'none';
      }
    });
    canv.addEventListener('mouseleave', () => { _tipDiv.style.display='none'; });

    const leg = document.createElement('div');
    let legTop = document.getElementById('planetLegendTop');
    if(!legTop){
      legTop = document.createElement('div');
      legTop.id = 'planetLegendTop';
      wrap.appendChild(legTop);
    }
    legTop.style.cssText = 'margin-top:6px;background:#070f1e;border-radius:8px;overflow:hidden;border:1px solid #1a2540';
    canv._justCreated = true;
  }

  // v57: якщо canvas щойно створений — ще один rAF щоб браузер виміряв layout
  if (canv._justCreated) {
    canv._justCreated = false;
    requestAnimationFrame(() => renderPlanetAnimation(kp, moonPhaseDeg, G, panchCtx, astroCtx));
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  // v57: getBoundingClientRect().width точніший ніж offsetWidth на мобільному
  const _bcr = canv.getBoundingClientRect();
  const W = (_bcr.width > 10 ? _bcr.width : (canv.parentElement?.getBoundingClientRect().width || window.innerWidth * 0.9 || 400));
  const H = Math.round(Math.min(220, window.innerHeight * 0.30)); // v57: cap 220px, 30% висоти
  canv.width  = W * dpr;
  canv.height = H * dpr;
  canv.style.height = H + 'px';
  const ctx = canv.getContext('2d');
  ctx.scale(dpr, dpr);

  const CX = W / 2, CY = H / 2;
  const now = new Date();
  const toRad = d => d * Math.PI / 180;

  // ── Log-scale орбіти: r = minR * (maxR/minR)^(i/5) ──
  // Максимальний радіус: вписати Сатурн з запасом
  const maxR = Math.min(CX, CY) - 22;
  const minR = maxR * 0.10; // Меркурій ≈ 10% від Сатурна
  const logOrbits = PLANET_DEF.map((p, i) => Math.round(minR * Math.pow(maxR / minR, i / (PLANET_DEF.length - 1))));

  // ── Ініціалізація фаз: реальні геліоцентричні довготи J2000 ──
  // L0 = середня довгота на J2000.0 (2000-01-01 12:00 TT), n = °/day
  // Джерело: Meeus "Astronomical Algorithms" Ch.31 (VSOP87 спрощена)
  if (!_planetPhase._init) {
    const J2000 = 2451545.0;
    const jde = (now.getTime() / 86400000) + 2440587.5; // JDE поточний
    const T = (jde - J2000) / 36525; // Julian centuries
    // [L0 degrees at J2000, n °/day]
    const J2000_ELEMENTS = {
      Mercury: [252.251,  4.0923344],
      Venus:   [181.980,  1.6021302],
      Earth:   [100.464,  0.9856474],
      Mars:    [355.433,  0.5240207],
      Jupiter: [ 34.351,  0.0830853],
      Saturn:  [ 50.077,  0.0334652],
    };
    const daysSinceJ2000 = jde - J2000;
    PLANET_DEF.forEach(p => {
      const el = J2000_ELEMENTS[p.name];
      if (el) {
        _planetPhase[p.name] = ((el[0] + el[1] * daysSinceJ2000) % 360 + 360) % 360;
      } else {
        _planetPhase[p.name] = 0;
      }
    });
    _planetPhase.moon = moonPhaseDeg;
    _planetPhase._init = true;
  }
  // P2: завжди оновлюємо фазу Місяця (без ACCEL-зсуву від попередньої ініціалізації)
  _planetPhase.moon = moonPhaseDeg;

  // ── Зорі: seeded псевдорандом (стабільні) ──
  if (!_planetPhase._stars) {
    const rng = (seed) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; }; };
    const r = rng(20260329);
    _planetPhase._stars = Array.from({length:70}, () => ({
      x: r() * 2000, y: r() * 600,  // нормалізуємо нижче
      rad: r() * 0.85 + 0.25,
      a: r() * 0.55 + 0.15
    }));
  }

  // ── PLANET_IMPACT ──
  const PLANET_IMPACT = {
    Mercury: { norm: 'Зв\u02bcязок, планування',    retro: 'Збої зв\u02bcязку, перевір накази',  eiNorm: 0,  eiRetro: -1 },
    Venus:   { norm: 'Координація, тил',             retro: 'Логістичні затримки, тертя',         eiNorm: 0,  eiRetro: -1 },
    Earth:   { norm: 'Стабільний фон',               retro: '\u2014',                             eiNorm: 0,  eiRetro:  0 },
    Mars:    { norm: 'Активна дія, атака',           retro: 'Підвищена агресія / помилки',       eiNorm: +1, eiRetro: -1 },
    Jupiter: { norm: 'Сприятливо, захист',           retro: 'Затримки рішень, бюрократія',       eiNorm: +1, eiRetro: -1 },
    Saturn:  { norm: 'Дисципліна, витривал.',        retro: 'Виснаження, уповільнення',          eiNorm: 0,  eiRetro: -1 },
  };

  if (_planetAnimFrame) cancelAnimationFrame(_planetAnimFrame);
  if (_planetAnimTimer) clearTimeout(_planetAnimTimer);
  _planetAnimFrame = null;
  _planetAnimTimer = null;
  _planetLastPaint = 0;

  // ── Швидкість анімації: базовий ACCEL ──
  // Меркурій (87.97 дні) = еталон. Всі інші пропорційно.
  // ACCEL: 1 секунда реального часу ≈ скільки діб орбіти
  const ACCEL = 18; // °/сек для Меркурія = 360/87.97*18 ≈ 73.7°/с — плавно помітний рух

  let t0 = null;

  function draw(ts) {
    // fp379: the planet canvas sits far below the fold. Do not spend a full
    // animation frame on it until it is actually near the visible viewport.
    const _view = canv.getBoundingClientRect();
    const _nearViewport = _view.bottom >= -120 && _view.top <= window.innerHeight + 120;
    if (document.hidden || !_nearViewport) {
      _planetAnimFrame = null;
      _planetAnimTimer = setTimeout(() => {
        _planetAnimTimer = null;
        if (!_planetAnimFrame) _planetAnimFrame = requestAnimationFrame(draw);
      }, 500);
      return;
    }
    // 20 fps is sufficient for this explanatory visual and avoids monopolising
    // the main thread on slower phones.
    if (_planetLastPaint && ts - _planetLastPaint < 50) {
      _planetAnimFrame = requestAnimationFrame(draw);
      return;
    }
    _planetLastPaint = ts;
    if (!t0) t0 = ts;
    const dt = (ts - t0) / 1000; // секунди від старту
    // v57: recalc W кожен кадр для підтримки повороту екрану
    const _bcr2 = canv.getBoundingClientRect();
    if (_bcr2.width > 10 && Math.abs(_bcr2.width - W) > 2) {
      // Розмір змінився — рестарт з новими W/H
      canv._justCreated = true;
      renderPlanetAnimation(kp, moonPhaseDeg, G, panchCtx, astroCtx);
      return;
    }

    ctx.clearRect(0, 0, W, H);

    // ── Зорі ──
    _planetPhase._stars.forEach(s => {
      ctx.beginPath();
      ctx.arc((s.x / 2000) * W, (s.y / 600) * H, s.rad, 0, Math.PI*2);
      ctx.fillStyle = `rgba(180,200,255,${s.a})`;
      ctx.fill();
    });

    // ── Орбіти ──
    logOrbits.forEach((r, i) => {
      const p = PLANET_DEF[i];
      const retro = isRetrograde(p.name, now);
      const dasaLord = astroCtx?.dasa?.mahaLord;
      const antarLord = astroCtx?.antar?.antarLord;
      const GRAHA_MAP = { Mercury:'Mercury', Venus:'Venus', Mars:'Mars', Jupiter:'Jupiter', Saturn:'Saturn', Earth:null };
      const isDasa  = dasaLord  && GRAHA_MAP[p.name] === dasaLord;
      const isAntar = antarLord && GRAHA_MAP[p.name] === antarLord;

      ctx.beginPath();
      ctx.arc(CX, CY, r, 0, Math.PI*2);

      // v54: колір орбіти = індивідуальний ΔEᵢ планети (ретро/норма), Earth → Lᵢ
      const aiC = panchCtx?.aiComponents;
      let orbitAiVal = null;
      if (p.name === 'Earth') {
        orbitAiVal = (aiC != null) ? (aiC.Li ?? 0) : null;
      } else {
        const _imp = PLANET_IMPACT[p.name];
        orbitAiVal = _imp && retro !== null ? (retro ? _imp.eiRetro : _imp.eiNorm) : null;
      }

      if (isDasa) {
        // Dasa-лорд: суцільна золота лінія (пріоритет)
        ctx.strokeStyle = 'rgba(255,200,80,0.55)';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([]);
      } else if (isAntar) {
        // Antar-лорд: блакитна пунктирна
        ctx.strokeStyle = 'rgba(100,180,255,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3,4]);
      } else if (orbitAiVal != null && orbitAiVal !== 0) {
        // ΣAᵢ-компонента: зелена(>0) або червона(<0), інтенсивність пропорційна |val|
        const alpha = Math.min(0.7, 0.25 + Math.abs(orbitAiVal) * 0.12);
        ctx.strokeStyle = orbitAiVal > 0
          ? `rgba(43,212,125,${alpha})`   // зелена — сприятливо
          : `rgba(255,80,80,${alpha})`;   // червона — несприятливо
        ctx.lineWidth = 0.8 + Math.min(1.2, Math.abs(orbitAiVal) * 0.3);
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = 'rgba(30,50,90,0.65)';
        ctx.lineWidth = 0.6;
        ctx.setLineDash([2,4]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // ── Сонце ──
    const kpNorm = Math.min(1, kp / 9);
    const gAlertMode = (typeof G === 'number' && isFinite(G) && G <= -2 && kp < 5);
    const sunR = 11 + kpNorm * 4;
    const sunPulse = gAlertMode ? 1 + 0.13 * Math.sin(ts * 0.004)
                   : kp >= 5    ? 1 + 0.11 * Math.sin(ts * 0.005)
                   :              1 + 0.07 * Math.sin(ts * 0.003);
    const sunColor = kp >= 5 ? '#ff4444' : gAlertMode ? '#ff8833' : kp >= 3 ? '#ffaa33' : '#ffe066';
    const sunGlow  = kp >= 5 ? '#ff2222' : gAlertMode ? '#ff6600' : kp >= 3 ? '#ff8800' : '#ffdd00';

    // Glow
    const grd = ctx.createRadialGradient(CX, CY, 0, CX, CY, sunR * 2.8 * sunPulse);
    grd.addColorStop(0, sunGlow + '99');
    grd.addColorStop(0.5, sunGlow + '33');
    grd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(CX, CY, sunR * 2.8 * sunPulse, 0, Math.PI*2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Тіло
    const sunGrd2 = ctx.createRadialGradient(CX - sunR*0.3, CY - sunR*0.3, 0, CX, CY, sunR * sunPulse);
    sunGrd2.addColorStop(0, '#fff8e0');
    sunGrd2.addColorStop(0.4, sunColor);
    sunGrd2.addColorStop(1, sunGlow);
    ctx.beginPath();
    ctx.arc(CX, CY, sunR * sunPulse, 0, Math.PI*2);
    ctx.fillStyle = sunGrd2;
    ctx.fill();

    // Промені (тільки при Kp≥3 або буря)
    if (kp >= 3 || gAlertMode) {
      const nRays = 6 + Math.round(kpNorm * 6);
      for (let i = 0; i < nRays; i++) {
        const a = toRad((i * 360/nRays + dt * 12) % 360);
        const r1 = sunR * sunPulse + 2;
        const r2 = r1 + 5 + kpNorm * 9;
        ctx.beginPath();
        ctx.moveTo(CX + r1*Math.cos(a), CY + r1*Math.sin(a));
        ctx.lineTo(CX + r2*Math.cos(a), CY + r2*Math.sin(a));
        ctx.strokeStyle = sunColor;
        ctx.lineWidth = 0.8 + kpNorm;
        ctx.globalAlpha = 0.35 + kpNorm * 0.35;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // ── Планети ──
    const retroStatus = [];
    PLANET_DEF.forEach((p, i) => {
      const retro = isRetrograde(p.name, now);
      const orbitR = logOrbits[i];
      // Кут: початкова фаза + накопичений рух (°/сек * ACCEL)
      const angSpeed = (360 / p.period) * ACCEL; // °/сек
      const angle = toRad((_planetPhase[p.name] + dt * angSpeed) % 360);
      const px = CX + orbitR * Math.cos(angle);
      const py = CY + orbitR * Math.sin(angle);
      const col = retro ? p.retroColor : p.color;

      // Glow для ретро та Dasa-лорда
      const GRAHA_MAP = { Mercury:'Mercury', Venus:'Venus', Mars:'Mars', Jupiter:'Jupiter', Saturn:'Saturn', Earth:null };
      const isDasa = astroCtx?.dasa?.mahaLord && GRAHA_MAP[p.name] === astroCtx.dasa.mahaLord;
      const taaraDanger = astroCtx?.taara?.danger;
      const critStack = taaraDanger && retro && isDasa;

      // ΔE pulse: планети з ненульовим внеском — пульсуючий ореол
      const _pImp = PLANET_IMPACT[p.name];
      const _pDeltaE = _pImp ? (retro ? _pImp.eiRetro : _pImp.eiNorm) : 0;
      if (_pDeltaE !== 0 && !isDasa && !retro) {
        const _pulse = 0.5 + 0.5 * Math.abs(Math.sin(ts * 0.002 + i));
        const _pCol = _pDeltaE > 0 ? `rgba(43,212,125,${0.18 * _pulse})` : `rgba(255,80,80,${0.18 * _pulse})`;
        const _pGrd = ctx.createRadialGradient(px, py, p.r * 0.5, px, py, p.r * 3.5);
        _pGrd.addColorStop(0, _pCol);
        _pGrd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(px, py, p.r * 3.5, 0, Math.PI*2);
        ctx.fillStyle = _pGrd;
        ctx.fill();
      }

      if (retro || isDasa) {
        const gr2 = ctx.createRadialGradient(px, py, 0, px, py, p.r * (isDasa ? 4 : 3));
        gr2.addColorStop(0, col + (isDasa ? 'bb' : '88'));
        gr2.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(px, py, p.r * (isDasa ? 4 : 3), 0, Math.PI*2);
        ctx.fillStyle = gr2;
        ctx.fill();
      }

      // Critical stack: пульсуючий червоний glow
      if (critStack) {
        const csPulse = 0.5 + 0.5 * Math.sin(ts * 0.005);
        const csGrd = ctx.createRadialGradient(px, py, p.r, px, py, p.r * 5);
        csGrd.addColorStop(0, `rgba(255,50,50,${0.55 * csPulse})`);
        csGrd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(px, py, p.r * 5, 0, Math.PI*2);
        ctx.fillStyle = csGrd;
        ctx.fill();
      }

      // Тіло планети (радіальний градієнт — 3D ефект)
      const pGrd = ctx.createRadialGradient(px - p.r*0.35, py - p.r*0.35, 0, px, py, p.r);
      pGrd.addColorStop(0, col + 'ff');
      pGrd.addColorStop(1, col + '88');
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI*2);
      ctx.fillStyle = pGrd;
      ctx.fill();

      // v54: Earth G-ring — колір = поточний G-індекс
      if (p.name === 'Earth') {
        const _gCol = (typeof G === 'number' && isFinite(G))
          ? (G >= 2 ? '#2bd47d' : G >= 0 ? '#63be7b' : G >= -2 ? '#ffcc00' : '#ff6b6b')
          : '#6b82aa';
        const _gRingPulse = 1 + 0.12 * Math.sin(ts * 0.003);
        // Outer glow
        const _gRingGrd = ctx.createRadialGradient(px, py, p.r, px, py, p.r * 2.8 * _gRingPulse);
        _gRingGrd.addColorStop(0, _gCol + '44');
        _gRingGrd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(px, py, p.r * 2.8 * _gRingPulse, 0, Math.PI*2);
        ctx.fillStyle = _gRingGrd;
        ctx.fill();
        // Ring stroke
        ctx.beginPath();
        ctx.arc(px, py, p.r + 4 * _gRingPulse, 0, Math.PI*2);
        ctx.strokeStyle = _gCol + 'aa';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      // Taara danger: червоний контур навколо Dasa-лорда
      if (taaraDanger && isDasa) {
        ctx.beginPath();
        ctx.arc(px, py, p.r + 3.5, 0, Math.PI*2);
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Кільця Сатурна
      if (p.name === 'Saturn') {
        ctx.beginPath();
        ctx.ellipse(px, py, p.r * 2.1, p.r * 0.55, toRad(22), 0, Math.PI*2);
        ctx.strokeStyle = col + 'aa';
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }

      // Ретро: пунктирне коло + символ ℞
      if (retro) {
        ctx.beginPath();
        ctx.arc(px, py, p.r + 5, 0, Math.PI*2);
        ctx.strokeStyle = col + 'cc';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([2,3]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = 'bold 8px serif';
        ctx.fillStyle = col;
        ctx.textAlign = 'center';
        ctx.fillText('\u211e', px, py - p.r - 6);
        retroStatus.push({ ua: p.ua, symbol: p.symbol, color: col });
      }

      // Місяць навколо Землі
      if (p.name === 'Earth') {
        const moonAngSpeed = (360 / 27.32) * ACCEL;
        const moonAng = toRad((_planetPhase.moon + dt * moonAngSpeed) % 360);
        const moonOrb = 13;
        const mox = px + moonOrb * Math.cos(moonAng);
        const moy = py + moonOrb * Math.sin(moonAng);

        // ── Tithi→колір орбіти Місяця ──
        const tithiType = panchCtx?.tithi?.score ?? 0;
        const moonOrbitColor =
          tithiType >= 1  ? 'rgba(43,212,125,0.55)'   // позитивна: зелена
          : tithiType === 0 ? 'rgba(150,170,210,0.35)' // нейтральна: блакитна
          :                   'rgba(255,100,100,0.50)'; // негативна: червона

        // Орбіта місяця (кольорова залежно від Tithi)
        ctx.beginPath();
        ctx.arc(px, py, moonOrb, 0, Math.PI*2);
        ctx.strokeStyle = moonOrbitColor;
        ctx.lineWidth = 0.9;
        ctx.setLineDash([1,2]);
        ctx.stroke();
        ctx.setLineDash([]);

        // ── Rahu Kalam дуга на орбіті Місяця ──
        const rahu = panchCtx?.rahu;
        if (rahu && rahu.start && rahu.end) {
          const parseH = t => { const [h,m] = t.split(':').map(Number); return h + m/60; };
          const rStartH = parseH(rahu.start);
          const rEndH   = parseH(rahu.end);
          // v45: дуга прив'язана до реального світлового дня (SR→SS), не до 24 год
          const { srH: _rkSrH, ssH: _rkSsH } = calcSunTimes(new Date());
          const _rkDayLen = Math.max(_rkSsH - _rkSrH, 6); // мін. 6 год захист
          const hToAng  = h => ((h - _rkSrH) / _rkDayLen) * Math.PI * 2 - Math.PI / 2;
          const aStart  = hToAng(rStartH);
          const aEnd    = hToAng(rEndH);
          ctx.beginPath();
          ctx.arc(px, py, moonOrb, aStart, aEnd);
          ctx.strokeStyle = rahu.active
            ? `rgba(255,80,80,${0.7 + 0.25 * Math.sin(ts * 0.005)})`  // активний — пульсує
            : 'rgba(255,140,0,0.65)';
          ctx.lineWidth = 2.2;
          ctx.setLineDash([]);
          ctx.stroke();
          // Мітка "ℛ" на початку дуги
          const lx = px + (moonOrb + 5) * Math.cos(aStart);
          const ly = py + (moonOrb + 5) * Math.sin(aStart);
          ctx.font = 'bold 7px serif';
          ctx.fillStyle = rahu.active ? '#ff5555' : '#ff9933';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('\u211e', lx, ly);
        }

        // Місяць
        ctx.beginPath();
        ctx.arc(mox, moy, 2.5, 0, Math.PI*2);
        ctx.fillStyle = '#9bb1dc';
        ctx.fill();
      }

      // ── Підпис: символ + назва (завжди видимі) ──
      // Smart-position: відштовхуємо від центру
      const labelDist = p.r + 12;
      const lAngle = angle; // той же кут що планета
      const lx = px + labelDist * Math.cos(lAngle);
      const ly = py + labelDist * Math.sin(lAngle);
      ctx.font = `${retro ? 'bold ' : ''}9px system-ui,sans-serif`;
      ctx.fillStyle = retro ? col : 'rgba(160,185,225,0.85)';
      ctx.textAlign = lx >= CX ? 'left' : 'right';
      ctx.textBaseline = ly >= CY ? 'top' : 'bottom';
      ctx.fillText(`${p.symbol} ${p.ua}`, lx, ly);
      // P2: семантичний підпис (норма/ретро) під назвою планети
      if (p.name !== 'Earth') {
        const _imp2 = PLANET_IMPACT[p.name];
        if (_imp2) {
          const _semTxt = retro ? _imp2.retro : _imp2.norm;
          const _semAlpha = retro ? 0.75 : 0.42;
          const _semColor = retro ? `rgba(255,153,100,${_semAlpha})` : `rgba(150,175,220,${_semAlpha})`;
          ctx.font = '7.5px system-ui,sans-serif';
          ctx.fillStyle = _semColor;
          const _lineH = ly >= CY ? 11 : -11;
          ctx.fillText(_semTxt, lx, ly + _lineH);
        }
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
    });

    // ── Легенда: Kp статус (лівий верхній кут) ──
    ctx.font = '9px system-ui,sans-serif';
    ctx.fillStyle = 'rgba(100,130,180,0.7)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const kpLabel = `Kp ${kp.toFixed(1)}`;
    ctx.fillStyle = kp >= 5 ? '#ff6b6b' : kp >= 3 ? '#ffcc00' : '#7f99c4';
    ctx.fillText(kpLabel, 8, 8);

    // G індекс (правий верхній кут)
    ctx.textAlign = 'right';
    const gLabel = isFinite(G) ? `G ${G.toFixed(1)}` : 'G —';
    ctx.fillStyle = G <= -2 ? '#ff6b6b' : G <= 0 ? '#ffcc00' : '#2bd47d';
    ctx.fillText(gLabel, W - 8, 8);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // ── Yoga critical: пульсуючий банер знизу ──
    if (panchCtx?.yoga?.isCritical) {
      const pulse = 0.55 + 0.45 * Math.abs(Math.sin(ts * 0.0025));
      ctx.save();
      ctx.globalAlpha = pulse * 0.85;
      ctx.fillStyle = '#1a0808';
      ctx.fillRect(0, H - 18, W, 18);
      ctx.globalAlpha = 1;
      ctx.font = 'bold 10px system-ui,sans-serif';
      ctx.fillStyle = `rgba(255,${80 + Math.round(60*pulse)},80,${0.8 + 0.2*pulse})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u26a0 YOGA CRITICAL: ' + (panchCtx.yoga.name) + ' \u2014 \u211e retro_end \u22123', W/2, H - 9);
      ctx.restore();
    }

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      _planetAnimFrame = null;
      return;
    }
    _planetAnimFrame = requestAnimationFrame(draw);
  }
  _planetAnimFrame = requestAnimationFrame(draw);

  // ── Таблиця планетного впливу — рендериться ОДИН РАЗ (не в draw-loop) ──
  const legEl = document.getElementById('planetLegendTop');
  if (legEl) {
    let totalPlanetEi = 0;
    let rows = '';
    for (const p of PLANET_DEF) {
      if (p.name === 'Earth') continue;
      const retro = isRetrograde(p.name, now);
      const imp = PLANET_IMPACT[p.name];
      const ei = retro ? imp.eiRetro : imp.eiNorm;
      totalPlanetEi += ei;
      const col = retro ? p.retroColor : p.color;
      const eiStr = ei > 0 ? `<span style="color: var(--ok);font-weight:700">+${ei}</span>`
                  : ei < 0 ? `<span style="color: var(--bad);font-weight:700">${ei}</span>`
                  :          `<span style="color:var(--faint)">0</span>`;
      const statusBadge = retro
        ? `<span style="background:#3a1a1a;color:${p.retroColor};border-radius:4px;padding:1px 5px;font-size:10px">\u211e ретро</span>`
        : `<span style="background:#0d2010;color: var(--ok);border-radius:4px;padding:1px 5px;font-size:10px">\u25b6 норма</span>`;
      const tip = retro ? imp.retro : imp.norm;
      rows += `<tr style="border-bottom:1px solid #0d1a30">
        <td style="padding:3px 5px;white-space:nowrap">
          <span style="color:${col};font-size:13px">${p.symbol}</span>
          <span style="color:${col};font-size:11px;margin-left:3px">${p.ua}</span>
        </td>
        <td style="padding:3px 5px">${statusBadge}</td>
        <td style="padding:3px 5px;text-align:center">${eiStr}</td>
        <td style="padding:3px 5px;color:#7a90b0;font-size:10px;max-width:140px">${tip}</td>
      </tr>`;
    }
    const totalCol = totalPlanetEi > 0 ? '#2bd47d' : totalPlanetEi < 0 ? '#ff6b6b' : '#6b82aa';
    const totalStr = totalPlanetEi > 0 ? `+${totalPlanetEi}` : `${totalPlanetEi}`;
    legEl.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead>
          <tr style="color:var(--faint);border-bottom:1px solid #1a2540">
            <th style="padding:2px 5px;text-align:left;font-weight:500">Планета</th>
            <th style="padding:2px 5px;text-align:left;font-weight:500">Статус</th>
            <th style="padding:2px 5px;text-align:center;font-weight:500">\u0394e\u1d62</th>
            <th style="padding:2px 5px;text-align:left;font-weight:500">Оперативний контекст</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:3px 5px;color: var(--dim);font-size:10px">Планетний внесок \u03a3\u0394e\u1d62:</td>
            <td style="padding:3px 5px;text-align:center;font-size:13px;font-weight:700;color:${totalCol}">${totalStr}</td>
            <td style="padding:3px 5px;color:var(--faint);font-size:10px">Advisory / R&D \u2014 не впливає на G автоматично</td>
          </tr>
          ${(astroCtx && astroCtx.taara.danger && PLANET_DEF.some(pl => isRetrograde(pl.name, now) && pl.name === astroCtx.dasa.mahaLord)) ? `<tr style="background:#1a0808"><td colspan="4" style="padding:3px 8px;color: var(--bad);font-size:10px;font-weight:600">\u26a0 Критичне стекування: Taara ${astroCtx.taara.group} (${astroCtx.taara.name}) + Dasa-лорд \u211e \u2014 максимальна обережність</td></tr>` : ''}
        </tfoot>
      </table>`;
  }
}/* NR_FN_END 297 */

/* NR_FN_BEGIN 302 */function renderPersonal() {
  const data = getSlotData(_activeSlot);
  const resEl = document.getElementById('personalResult');
  const nameLabel = document.getElementById('pNameLabel');
  if (!data) {
    resEl.innerHTML = '<div class="muted small">Натисніть «✎ Дані» і введіть дату народження.</div>';
    if (nameLabel) nameLabel.textContent = '';
    return;
  }
  if (nameLabel) nameLabel.textContent = '— ' + (data.name || '');

  // Попередження ±1 Nakshatra якщо час народження не вказано (HANDOFF Level 1)
  const noTime = !data.time || data.time.trim() === '';
  const noTimeWarnHtml = noTime
    ? `<div style="font-size:11px;color:#e8b84b;background:#1a1400;border-left:3px solid #e8b84b;border-radius:4px;padding:4px 8px;margin-bottom:6px">⚠ Час народження не вказано → розрахунок від 12:00. Можлива похибка ±1 стоянка Місяця. Вкажіть час для точного результату.</div>`
    : '';

  const birthJDE = dateToJDE(data.date, data.time, data.utcOff);
  const nowJDE   = Date.now() / 86400000 + 2440587.5;

  const natal   = calcNakshatra(calcMoonLongitude(__nrUtcJdToTt(birthJDE)), birthJDE);
  const nowNak  = calcNakshatra(calcMoonLongitude(__nrUtcJdToTt(nowJDE)), nowJDE);
  const taara   = calcTaara(natal.idx, nowNak.idx);
  const dasa    = calcCurrentDasa(natal.idx, natal.fraction, birthJDE, nowJDE);
  const antar   = calcAntardasha(dasa, nowJDE);
  const hora    = calcHora(new Date());
  const transit = calcMoonTransit(nowJDE, nowNak.fraction);

  // Зберегти контекст для планетної анімації (renderPlanetAnimation)
  _lastAstroCtx = {
    taara: { group: taara.group, name: taara.name, danger: !!taara.danger },
    dasa:  { mahaLord: dasa.lordName },
    antar: { antarLord: antar ? antar.lordName : null, pratyaLord: antar ? antar.pratyaLordName : null },
    nowNak: { idx: nowNak.idx, name: nowNak.name }
  };

  const danger  = taara.danger;
  const col     = danger ? '#ff6b6b' : '#2bd47d';

  // Taara G-mod для сьогодні
  const taaraGmod = danger ? -1 : (taara.group === 2||taara.group===4||taara.group===6||taara.group===8||taara.group===9) ? +1 : 0;

  const TAARA_INFO = {
    1: {detail:'Janma — фізичний відпочинок, огляд спорядження, мін. навантажень',  short:'Janma — відпочинок, уникати навантажень'},
    2: {detail:'Sampat — планувати постачання і логістику, ресурсна фаза',          short:'Sampat — планувати ресурси і логістику'},
    3: {detail:'Vipat — заборона підписувати накази, не вступати в конфлікти',      short:'Vipat — не підписувати, не конфліктувати'},
    4: {detail:'Kshema — стабільність: приймати стратегічні рішення',               short:'Kshema — приймати стратегічні рішення'},
    5: {detail:'Pratyak — зупинити нові ініціативи, очікування і витримка',         short:'Pratyak — зупинитись, не починати нічого нового'},
    6: {detail:'Sadhana — активна фаза: досягати цілей, наступальні дії',           short:'Sadhana — активно діяти, досягати цілей'},
    7: {detail:'Naidhana — смерть-таара: уникати операцій, не виходити на передову', short:'Naidhana — жодних активних дій'},
    8: {detail:'Mitra — координація з союзниками, обмін розвідданими.',             short:'Mitra — координація і переговори'},
    9: {detail:'Atimitra — пік сприятливості: діяти сміливо по всіх фронтах',       short:'Atimitra — оптимальний день, діяти по всіх фронтах'},
  };
  const _ti = TAARA_INFO[taara.group];
  const taaraDetail   = _ti ? _ti.detail : taara.name;

  // G-mod рядок
  const gmodSign = taaraGmod > 0 ? `+${taaraGmod}` : `${taaraGmod}`;
  const gmodHtml = taaraGmod !== 0
    ? `<div style="font-size:11px;color:${col};margin-top:4px">Taara G-mod: <strong>${gmodSign}</strong></div>`
    : '';

  // Human summary
  const _ph = PERSONAL_HUMAN[taara.group] || PERSONAL_HUMAN[0];
  const _phMod = _personalModPhrase(taaraGmod);
  const _phBg = danger ? 'rgba(255,107,107,.08)' : taaraGmod>0 ? 'rgba(43,212,125,.08)' : 'rgba(255,255,255,.03)';
  const _phBrd = danger ? 'rgba(255,107,107,.22)' : taaraGmod>0 ? 'rgba(43,212,125,.22)' : 'rgba(255,255,255,.08)';
  const _phCol = danger ? '#ff8e8e' : taaraGmod>0 ? '#7fe3a6' : '#cfe0ff';

  // v85b-F7 (CRIT): Risk override — коли глобальний G ≤ -1, Taara-optimism не може домінувати.
  // Показуємо розділений вигляд: "Ваш цикл" + "Глобальний фон" + "Висновок"
  // v85b-F9: default-deny — якщо G невідомий, не кидаємо optimistic (безпечно)
  // v88.7.6 BUG-3 fix (Варіант А): додаємо ІНВЕРСНИЙ випадок — фон сприятливий (G ≥ 0),
  // але особистий цикл несе ризик (danger=Vipat/Pratyak/Naidhana або taaraGmod ≤ -1).
  // Раніше при G=+0.7 і Taara=Vipat hero казало "Можна діяти", а personal block — "День напружений".
  // Без banner оператор бачив суперечність без пояснення, що це різні шари (фон vs особистий).
  const _globalG = (function(){try{return _v73G();}catch(e){ globalThis.NRDiagnostics?.record('catch.246','recoverable'); return NaN;}})();
  // fp408: action authority is the resolved operational verdict, not raw G.
  // A raw value such as -0.83 may resolve to operational -1 because the
  // verified daily reference and safety rules are applied separately.  The
  // personal layer must therefore follow decisionScore or it can render a
  // green "very favorable" card beside an amber/red canonical verdict.
  const _operationalPersonal408 = (function(){
    try {
      const _kp408 = Number(window.__uiState?.kpNow);
      return (typeof resolveDaySignal_v88825 === 'function') ? resolveDaySignal_v88825(new Date(todayKyivStr()+'T12:00:00Z'), _globalG, _kp408, {isToday:true}) : null;
    } catch (_e408) { globalThis.NRDiagnostics?.record('catch.247','recoverable');  return null; }
  })();
  const _operationalScore408 = Number(_operationalPersonal408?.decisionScore);
  const _operationalKnown408 = Number.isFinite(_operationalScore408);
  const _globalRisk = _operationalKnown408 ? _operationalScore408 < 0 : false;
  const _globalSafe = _operationalKnown408 ? _operationalScore408 >= 0 : false;
  const _globalUnknown = !_operationalKnown408;
  // v88.8.36-fp56-P10: слово фону — з канонічної шкали (раніше хардкоди «ризик»/«сприятливо»
  // розходились із classifyG: G=+0.2 = 'neutral', а напис казав «сприятливо»).
  const _gWord = _operationalKnown408
    ? (_operationalScore408 >= 1 ? 'сприятливий' : _operationalScore408 === 0 ? 'нейтральний' : _operationalScore408 === -1 ? 'обережний' : 'несприятливий')
    : 'стан не визначено';
  const _personalRisk = danger || taaraGmod <= -1;
  let _riskBannerHtml = '';
  let _effectivePhCol = _phCol, _effectivePhBg = _phBg, _effectivePhBrd = _phBrd;
  let _effectivePhState = _ph.state;
  let _effectivePhMod = _phMod;
  let _effectiveWork = _ph.work, _effectiveDec = _ph.decisions, _effectiveComms = _ph.comms;
  if (_globalRisk) {
    const _taaraLabel = _ti ? _ti.short.split(' — ')[0] : taara.name;
    const _cycleIsPositive = taaraGmod > 0 && !danger;
    _riskBannerHtml = `<div style="padding:8px 12px;margin-bottom:6px;border-radius:10px;border:1px solid rgba(255,165,80,.28);background:rgba(255,165,80,.08);display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;line-height:1.35">
      <div><div style="color:var(--faint);font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Ваш цикл · локальний шар</div><div style="color:${_cycleIsPositive?'#cfb6ff':danger?'#ff8e8e':'#cfe0ff'};font-weight:700">${_taaraLabel}${_cycleIsPositive?' · підтримує, але не є дозволом':danger?' · обережний':' · нейтральний'}</div></div>
      <div><div style="color:var(--faint);font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Оперативний стан</div><div style="color:#ffb36a;font-weight:700">${_operationalKnown408 ? (_operationalScore408 >= 0 ? '+' : '') + _operationalScore408 : '—'} · ${_gWord}</div></div>
    </div>`;
    // Override optimistic state if cycle is positive but global is risk
    if (_cycleIsPositive) {
      _effectivePhCol = '#ffd6ad';
      _effectivePhBg = 'rgba(255,165,80,.06)';
      _effectivePhBrd = 'rgba(255,165,80,.22)';
      _effectivePhState = 'Ваш цикл позитивний, але фон тисне';
      _effectivePhMod = ' Дій повільно, без форсування.';
      _effectiveWork = 'тільки перевірені дії';
      _effectiveDec = 'не починати нових важливих кроків';
      _effectiveComms = 'м\'яко, без конфлікту і тиску';
    }
  } else if (_globalSafe && _personalRisk) {
    // v88.7.6 BUG-3 (інверсний випадок): фон OK, але особистий цикл небезпечний.
    // Hero показує "Можна діяти" → personal block показує "День напружений" → потрібне пояснення.
    const _taaraLabel = _ti ? _ti.short.split(' — ')[0] : taara.name;
    _riskBannerHtml = `<div style="padding:8px 12px;margin-bottom:6px;border-radius:10px;border:1px solid rgba(180,140,255,.28);background:rgba(180,140,255,.08);display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;line-height:1.35" title="Фон зараз (Kp + Панчанга) і особистий цикл (Taara від вашої натальної стоянки) — різні шари аналізу. Hero G показує загальний космофізичний фон. Особистий блок показує ваш цикл відносно дня народження. Розбіжність — норма, не баг.">
      <div><div style="color:var(--faint);font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Фон зараз</div><div style="color:#7fe3a6;font-weight:700">G = ${_globalG >= 0 ? '+' : ''}${_globalG.toFixed(1)} · ${_gWord}</div></div>
      <div><div style="color:var(--faint);font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Ваш цикл</div><div style="color:${danger?'#ff8e8e':'#ffd6ad'};font-weight:700">${_taaraLabel} · ${danger?'обережний':'тиск'}</div></div>
      <div style="grid-column:1/-1;padding-top:4px;border-top:1px solid rgba(180,140,255,.18);color:#cfb6ff;font-size:11px;line-height:1.4">⚠ Шари дають різний сигнал. Загальні справи — дозволено (фон сприяє). Особисто важливі рішення — відкласти (цикл проти).</div>
    </div>`;
    // М'який override: state не перетираємо повністю (це особистий блок),
    // лише підкреслюємо двозначність у phMod.
    _effectivePhMod = (_effectivePhMod || '') + ' Загальний фон сприяє, але особисто — обережно.';
  } else if (_globalUnknown && taaraGmod > 0 && !danger) {
    // v85b-F9: при невідомому G — не показувати optimistic (default-deny)
    _effectivePhCol = '#cfe0ff';
    _effectivePhBg = 'rgba(255,255,255,.03)';
    _effectivePhBrd = 'rgba(255,255,255,.08)';
    _effectivePhState = 'Персональний цикл сприятливий';
    _effectivePhMod = ' (загальний фон уточнюється)';
  }

  // v88.8.35-fp11 V: PDF/Engine hard-cap для Personal block.
  // Якщо денний verdict ≤ -2 (особливо несприятливий), переписуємо effective Work/Dec/Comms
  // на рутину. Без цього при сприятливому Taara/Dasa бачимо "Активно діяти / Оптимально / ідеально"
  // при PDF/Engine = -3 — прямий конфлікт із Hero/3-day.
  // Тригер на PDF/Engine ≤ -2 (не -1), щоб не перетирати помірний день.
  let _pdfHardCapApplied = false;
  let _pdfHardCapScore = null;
  try {
    const _eTd = (typeof getEngineScore === 'function') ? getEngineScore(new Date(todayKyivStr()+'T12:00:00Z')) : null;
    const _eTdScore = (_eTd && isFinite(_eTd.eng)) ? Number(_eTd.eng) : null;
    if (_eTdScore !== null && _eTdScore <= -2) {
      _pdfHardCapScore = _eTdScore;
      _pdfHardCapApplied = true;
      // Жорстко перетираємо рекомендації — особистий шар не може дозволити дію, яку забороняє денний verdict.
      _effectivePhCol = '#ffb36a';
      _effectivePhBg = 'rgba(255,107,107,.08)';
      _effectivePhBrd = 'rgba(255,107,107,.28)';
      _effectivePhState = 'Персональна підтримка є, але день критичний';
      _effectivePhMod = ` (PDF/Engine = ${_eTdScore})`;
      _effectiveWork = 'тільки рутина і відомі задачі';
      _effectiveDec = 'важливі рішення відкласти';
      _effectiveComms = 'обмежено, без нових домовленостей';
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.214','recoverable'); }

  // v88.8.35-fp10 T: якщо PDF/Engine для дня негативний (≤-1), а персональний блок
  // зеленіть → додати явну note що персональна підтримка НЕ скасовує PDF/Engine денний verdict.
  // v88.8.35-fp11 V: показуємо note ТІЛЬКИ якщо hard-cap (PDF/Engine ≤ -2) НЕ спрацював,
  // інакше дублювання (hard-cap уже переписав state і Work/Dec/Comms).
  let _pdfOverrideNote = '';
  if (!_pdfHardCapApplied) {
    try {
      const _eTd = (typeof getEngineScore === 'function') ? getEngineScore(new Date(todayKyivStr()+'T12:00:00Z')) : null;
      const _eTdScore = (_eTd && isFinite(_eTd.eng)) ? Number(_eTd.eng) : null;
      // Тригер: PDF/Engine = -1 AND персональний state виглядає сприятливо (зелений колір).
      // Випадок ≤ -2 уже накритий hard-cap вище.
      const _personalLooksGreen = (_effectivePhCol === '#2bd47d' || _effectivePhCol === '#63be7b'
                                  || (typeof _effectivePhState === 'string' && _effectivePhState.includes('сприятлив')));
      if (_eTdScore !== null && _eTdScore === -1 && _personalLooksGreen) {
        _pdfOverrideNote = `<div style="margin-top:6px;padding:6px 8px;border-radius:6px;background:rgba(255,170,51,.08);border-left:3px solid #ffaa33;font-size:11px;color:#ffd2a0;line-height:1.4">⚠ Персональна підтримка не скасовує PDF/Engine дня (${_eTdScore >= 0 ? '+' : ''}${_eTdScore}). Особистий цикл — це додатковий шар, не заміна денного verdict-у.</div>`;
      }
    } catch(e){ window.NRDiagnostics?.record('legacy.catch.215','recoverable'); }
  }

  resEl.innerHTML = `${noTimeWarnHtml}${_riskBannerHtml}<div style="padding:8px 10px;border-radius:10px;border:1px solid ${_effectivePhBrd};background:${_effectivePhBg}"><div style="font-size:14px;font-weight:700;line-height:1.3;color:${_effectivePhCol}">${_effectivePhState}${_effectivePhMod}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;margin-top:6px;font-size:12px;line-height:1.5;color: var(--text3)"><span style="color:var(--dim)">Робота:</span><span>${_effectiveWork}</span><span style="color:var(--dim)">Рішення:</span><span>${_effectiveDec}</span><span style="color:var(--dim)">Комунікації:</span><span>${_effectiveComms}</span></div>${_pdfOverrideNote}</div><details style="margin-top:6px"><summary class="small muted" style="cursor:pointer;font-size:11px">▶ Показати персональний розклад</summary>${gmodHtml}<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:6px">
      <tr>
        <td class="muted" style="padding:3px 0;width:45%;border-bottom:1px solid #1a2540">Стоянка народження</td>
        <td style="padding:3px 0;border-bottom:1px solid #1a2540"><strong>${NAKSHATRA_UA[natal.idx]}</strong> <span class="muted">(${NAKSHATRA_NAMES[natal.idx]}, P${natal.pada})</span></td>
      </tr>
      <tr>
        <td class="muted" style="padding:3px 0;border-bottom:1px solid #1a2540">Стоянка сьогодні</td>
        <td style="padding:3px 0;border-bottom:1px solid #1a2540"><strong>${NAKSHATRA_UA[nowNak.idx]}</strong> <span class="muted">(${NAKSHATRA_NAMES[nowNak.idx]}, P${nowNak.pada})</span></td>
      </tr>
      <tr>
        <td class="muted" style="padding:3px 0;border-bottom:1px solid #1a2540">Taara (поз. ${taara.group}/9)</td>
        <td style="padding:3px 0;border-bottom:1px solid #1a2540;color:${col}"><strong>${taaraDetail}</strong></td>
      </tr>
      <tr>
        <td class="muted" style="padding:3px 0;border-bottom:1px solid #1a2540">Маха-даша</td>
        <td style="padding:3px 0;border-bottom:1px solid #1a2540"><strong>${dasa.lordName}</strong> <span class="muted">(залишок ${dasa.remainStr})</span></td>
      </tr>
      <tr>
        <td class="muted" style="padding:3px 0;border-bottom:1px solid #1a2540">Антар-даша</td>
        <td style="padding:3px 0;border-bottom:1px solid #1a2540">
          <strong>${antar.lordName}</strong> <span class="muted">(залишок ${antar.remainStr})</span>
          <div style="margin-top:3px;background:#0a1428;border-radius:4px;height:5px;width:100%;overflow:hidden">
            <div style="width:${Math.round(antar.progress*100)}%;height:100%;background:linear-gradient(90deg,#37a7ff,#2bd47d);border-radius:4px;transition:width .4s"></div>
          </div>
          <div style="font-size:10px;color:var(--faint);margin-top:1px">${Math.round(antar.progress*100)}% пройдено → ${antar.nextLordName}</div>
        </td>
      </tr>
      <tr>
        <td class="muted" style="padding:3px 0;border-bottom:1px solid #1a2540">→ Вплив Антар-даша</td>
        <td style="padding:3px 0;border-bottom:1px solid #1a2540">${(() => {
          const _w = PLANET_PCL_WEIGHT[antar.lord];
          const _note = PLANET_PCL_NOTE[antar.lord] || '';
          const _col2 = _w > 0.3 ? '#7ee787' : _w < -0.3 ? '#ff9999' : 'var(--dim)';
          const _sign2 = _w > 0 ? '+' : '';
          return `<span style="color:${_col2};font-weight:700">${_sign2}${(isFinite(_w)?_w:0).toFixed(1)} PCL-preview</span> <span class="muted" style="font-size:11px">· ${_note}</span> <span style="font-size:9px;color:var(--faint)" title="Advisory display only — НЕ входить у canonical G/Pᵢ/final_score. Джерело: Posibnyk §II.3.1">(не в G · advisory)</span>`;
        })()}</td>
      </tr>
      <tr>
        <td class="muted" style="padding:3px 0;border-bottom:1px solid #1a2540">Пратьянтар</td>
        <td style="padding:3px 0;border-bottom:1px solid #1a2540"><strong>${antar.pratyaLordName}</strong> <span class="muted">(залишок ${antar.pratyaRemStr})</span> <span style="color:var(--faint);font-size:11px">→ ${antar.pratyaNextLordName}</span></td>
      </tr>
      <tr>
        <td class="muted" style="padding:3px 0;border-bottom:1px solid #1a2540">Hora зараз</td>
        <td style="padding:3px 0;border-bottom:1px solid #1a2540"><strong>${hora.planet}</strong> <span class="muted">(до ${hora.end}, ще ${hora.minLeft}хв)</span></td>
      </tr>
      <tr>
        <td class="muted" style="padding:3px 0;border-bottom:none">Транзит Місяця</td>
        <td style="padding:3px 0;border-bottom:none">зміна стоянки через <strong>${transit.str}</strong></td>
      </tr>
    </table>
    <div class="small muted" style="margin-top:6px">R&D · Meeus Ch.47 · Lahiri · BPHS · ±0.5 стоянки без точного часу</div>
    <div id="taaraRingWrap" style="margin-top:10px"></div>
    <div id="taara7dWrap" style="margin-top:10px"></div>
    </details>
  `;

  // v85b-F9 PATCH 3: fail-safe regex — навіть якщо override не спрацював (NaN G, race condition,
  // інші гілки, старий кеш) — прибрати явні optimistic-фрази при глобальному ризику
  if (_globalRisk || _globalUnknown) {
    resEl.innerHTML = resEl.innerHTML
      .replace(/✔\s*Сприятливо(?!\s+є\s+додаткова\s+підтримка\s+фону)/gu, '⚠ Обережно')
      .replace(/✔\s*Загалом сприятливо/gu, '⚠ Обережно, фон тисне')
      .replace(/✔\s*Дуже сприятливо/gu, '⚠ Цикл сильний, але фон тисне')
      .replace(/🌟\s*Дуже сприятливо/gu, '⚠ Цикл сильний, але фон тисне')
      .replace(/Є додаткова підтримка фону\./gu, 'Глобальний фон обмежує локальну підтримку.')
      .replace(/Фон для вас особливо сприятливий\./gu, 'Локальна підтримка є, але глобальний фон тисне.')
      .replace(/OK,\s*діяти впевнено/gu, 'тільки перевірені дії')
      .replace(/OK,\s*можна активно/gu, 'тільки перевірені дії')
      .replace(/Активно діяти/gu, 'обережно, без форсування');
  }

  renderTaaraRing(document.getElementById('taaraRingWrap'), taara.group, natal.idx, nowNak.idx);
  renderTaara7d(document.getElementById('taara7dWrap'), natal.idx, nowJDE);
}/* NR_FN_END 302 */

/* NR_FN_BEGIN 303 */function renderTaara7d(wrap, natalIdx, nowJDE) {
  if (!wrap) return;
  const TAARA_SHORT = {
    1:'Janma ⚠',2:'Sampat ✓',3:'Vipat ⚠',4:'Kshema ✓',
    5:'Pratyak ⚠',6:'Sadhana ✓',7:'Naidhana ⚠',8:'Mitra ✓',9:'Atimitra ✓'
  };
  const TAARA_DANGER_SET = new Set([1,3,5,7]);

  // Крок: Місяць проходить ~1 накшатру / ~0.9 дня (360°/27/13.2°/day)
  // Точно: calcNakshatra кожного дня (12:00 UTC)
  let rows = '';
  for(let d=0;d<7;d++){
    const jde = nowJDE + d; // полудень +d днів
    const moonLon = calcMoonLongitude(__nrUtcJdToTt(jde));
    const nak = calcNakshatra(moonLon, jde);
    const t = calcTaara(natalIdx, nak.idx);
    const isDanger = TAARA_DANGER_SET.has(t.group);
    const col = isDanger ? '#ff6b6b' : '#2bd47d';
    const gmod = isDanger ? '−1' : (t.group===2||t.group===4||t.group===6||t.group===8||t.group===9) ? '+1' : '0';
    const gmodCol = isDanger ? '#ff6b6b' : gmod==='+1' ? '#2bd47d' : '#6b82aa';
    // Дата
    const dt = kyivDayDate(d);
    const ds = dt.toLocaleDateString('uk-UA',{weekday:'short',month:'numeric',day:'numeric',timeZone:'Europe/Kyiv'});
    rows += `<tr>
      <td style="padding:2px 6px;font-size:12px;color: var(--muted);border-bottom:1px solid #1a2540">${d===0?'Сьогодні':ds}</td>
      <td style="padding:2px 6px;font-size:12px;border-bottom:1px solid #1a2540;color:${col}">${TAARA_SHORT[t.group]||''} (${t.group}/9)</td>
      <td style="padding:2px 6px;font-size:12px;border-bottom:1px solid #1a2540;color:${gmodCol};font-weight:700">${gmod}</td>
      <td style="padding:2px 6px;font-size:11px;color:var(--faint);border-bottom:1px solid #1a2540">${NAKSHATRA_UA[nak.idx]}</td>
    </tr>`;
  }
  wrap.innerHTML = `
    <details style="margin-top:4px">
      <summary style="font-size:12px;color: var(--dim);cursor:pointer;list-style:none">▶ Taara 7 днів</summary>
      <table style="width:100%;border-collapse:collapse;margin-top:6px">
        <thead><tr>
          <th style="font-size:11px;color:var(--faint);text-align:left;padding:2px 6px">День</th>
          <th style="font-size:11px;color:var(--faint);text-align:left;padding:2px 6px">Taara</th>
          <th style="font-size:11px;color:var(--faint);text-align:left;padding:2px 6px">G±</th>
          <th style="font-size:11px;color:var(--faint);text-align:left;padding:2px 6px">Накшатра</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="small muted" style="margin-top:4px">G± = особистий Taara-модифікатор (R&D)</div>
    </details>`;
}/* NR_FN_END 303 */

/* NR_FN_BEGIN 304 */function renderTaaraRing(wrap, activeGroup, natalIdx, nowIdx) {
  if (!wrap) return;
  const LABELS = ['','Janma','Sampat','Vipat','Kshema','Pratyak','Sadhana','Naidhana','Mitra','Atimitra'];
  const DANGER = [false,true,false,true,false,true,false,true,false,false]; // 1-indexed, pos 1/3/5/7 = danger
  const N = 9;
  const cx=90, cy=90, R=68, r=34;
  const slice = (2*Math.PI)/N;
  const startOffset = -Math.PI/2; // 12 o'clock = position 1 = natal

  let paths = '', texts = '';
  for(let i=1; i<=N; i++){
    const a0 = startOffset + (i-1)*slice;
    const a1 = a0 + slice;
    const aMid = (a0+a1)/2;
    const isActive = (i === activeGroup);
    const isDanger = DANGER[i];
    const baseColor = isDanger ? '#5a1a1a' : '#0d3020';
    const activeColor = isDanger ? '#ff6b6b' : '#2bd47d';
    const strokeColor = isActive ? activeColor : (isDanger ? '#7a2a2a' : '#1a3a28');
    const fillColor = isActive ? (isDanger ? 'rgba(255,107,107,.25)' : 'rgba(43,212,125,.2)') : baseColor;
    const sw = isActive ? 2.5 : 1;

    // Arc path (donut)
    const x0o=cx+R*Math.cos(a0), y0o=cy+R*Math.sin(a0);
    const x1o=cx+R*Math.cos(a1), y1o=cy+R*Math.sin(a1);
    const x0i=cx+r*Math.cos(a1), y0i=cy+r*Math.sin(a1);
    const x1i=cx+r*Math.cos(a0), y1i=cy+r*Math.sin(a0);
    paths += `<path d="M${x0o},${y0o} A${R},${R} 0 0,1 ${x1o},${y1o} L${x0i},${y0i} A${r},${r} 0 0,0 ${x1i},${y1i} Z"
      fill="${fillColor}" stroke="${strokeColor}" stroke-width="${sw}" style="transition:fill .3s"/>`;

    // Label placement (mid-ring radius)
    const rMid=(R+r)/2+4, tx=cx+rMid*Math.cos(aMid), ty=cy+rMid*Math.sin(aMid);
    const col = isActive ? activeColor : (isDanger ? '#8a4444' : '#4a7a60');
    texts += `<text x="${tx.toFixed(1)}" y="${(ty+1).toFixed(1)}" text-anchor="middle" dominant-baseline="middle"
      fill="${col}" font-size="${isActive?8.5:7.5}" font-weight="${isActive?'700':'400'}">${i}</text>`;

    // Outer label (short name) — only active + neighbors
    if(isActive){
      const lx=cx+(R+14)*Math.cos(aMid), ly=cy+(R+14)*Math.sin(aMid);
      texts += `<text x="${lx.toFixed(1)}" y="${(ly+1).toFixed(1)}" text-anchor="middle" dominant-baseline="middle"
        fill="${activeColor}" font-size="7.5" font-weight="700">${LABELS[i]}</text>`;
    }
  }

  // Natal marker (triangle at 12 o'clock on outer rim)
  const natalAngle = startOffset;
  const mx=cx+R*Math.cos(natalAngle), my=cy+R*Math.sin(natalAngle);
  const markerPts = `${mx.toFixed(1)},${my.toFixed(1)} ${(mx-4).toFixed(1)},${(my-9).toFixed(1)} ${(mx+4).toFixed(1)},${(my-9).toFixed(1)}`;

  const svgW=180, svgH=180;
  wrap.innerHTML = `<div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
    <svg viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg" style="width:${svgW}px;max-width:${svgW}px;flex-shrink:0">
      ${paths}${texts}
      <!-- Center label -->
      <text x="${cx}" y="${cy-6}" text-anchor="middle" fill="#9bb1dc" font-size="8.5" font-weight="700">Taara</text>
      <text x="${cx}" y="${cy+6}" text-anchor="middle" fill="${DANGER[activeGroup]?'#ff6b6b':'#2bd47d'}" font-size="11" font-weight="800">${activeGroup}/9</text>
      <!-- Natal triangle -->
      <polygon points="${markerPts}" fill="#37a7ff" opacity=".9"/>
      <text x="${mx.toFixed(1)}" y="${(my-12).toFixed(1)}" text-anchor="middle" fill="#37a7ff" font-size="7">Janma</text>
    </svg>
    <div style="font-size:11px;color:var(--text3);line-height:1.6;padding-top:4px">
      <div style="margin-bottom:6px;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:.05em">Позиції Taara (9-цикл)</div>
      ${[1,2,3,4,5,6,7,8,9].map(i=>{
        const isAct=(i===activeGroup), isd=DANGER[i];
        const c=isAct?(isd?'#ff6b6b':'#2bd47d'):(isd?'#7a3333':'#3a5a48');
        const fw=isAct?'700':'400';
        return `<div style="color:${c};font-weight:${fw}">${isd?'⚠':'✓'} ${i}. ${LABELS[i]}${isAct?' ◀':''}</div>`;
      }).join('')}
      <div style="margin-top:6px;font-size:10px;color:var(--faint)">▲ = стоянка народження</div>
    </div>
  </div>`;
}/* NR_FN_END 304 */

/* NR_FN_BEGIN 310 */function renderSlotTabs(){
  const wrap = document.getElementById('profileSlots');
  if(!wrap) return;
  let html = '';
  let hasAny = false;
  for(let i=0;i<MAX_SLOTS;i++){
    const d = getSlotData(i);
    const isActive = i === _activeSlot;
    const col = SLOT_COLORS[i];
    const border = isActive ? `2px solid ${col}` : '2px solid #1e2a44';
    const bg = isActive ? `rgba(${hexToRgb(col)},0.12)` : '#0a1428';
    const label = d ? (d.name || `Особа ${i+1}`) : `+ Особа ${i+1}`;
    const style = `font-size:11px;padding:4px 10px;border-radius:8px;border:${border};background:${bg};color:${d?col:'var(--faint)'};cursor:pointer;font-weight:${isActive?700:400}`;
    html += `<button onclick="switchSlot(${i})" style="${style}">${escapeHtml(label)}</button>`;
    if(d) hasAny = true;
  }
  wrap.innerHTML = html;
  wrap.style.display = hasAny ? 'flex' : 'none';
}/* NR_FN_END 310 */

/* NR_FN_BEGIN 315 */function draw27Chart(){
  if(!_27dComputed || !_27dComputed.length) return;
  const canvas = document.getElementById('chart27');
  if(!canvas) return;

  // Підгонка під реальний розмір
  const dpr = window.devicePixelRatio || 1;
  const _bcr27 = canvas.getBoundingClientRect();
  const W = (_bcr27.width > 10 ? _bcr27.width : (canvas.parentElement?.getBoundingClientRect().width || 460));
  const H = 200;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const data = [..._27dComputed].sort((a,b)=>a.ds<b.ds?-1:1);
  const showRawAudit = document.body.classList.contains('audit-mode');
  const todayStr = todayKyivStr();
  const n = data.length;
  if(!n) return;

  // Масштаб
  const PAD_L=42, PAD_R=16, PAD_T=36, PAD_B=36;
  // v88.8.34: масштаб обчислюється тільки з raw continuous G. PDF/Engine score — overlay, не вісь G.
  const gValues = data.map(d=>d.G).filter(v=>isFinite(v)); // automatic G is the primary forecast
  const gMin = Math.min(-3, ...gValues) - 0.5;
  const gMax = Math.max(3,  ...gValues) + 0.5;
  const xOf = i => PAD_L + (i/(n-1)) * (W - PAD_L - PAD_R);
  const yOf = g => PAD_T + (1 - (g - gMin)/(gMax - gMin)) * (H - PAD_T - PAD_B);
  const y0  = yOf(0);

  // ── Зони кольору ──
  const zones = [
    {from:2.5, to:gMax, color:'rgba(127,156,255,0.075)'},
    {from:0.5, to:2.5,  color:'rgba(85,183,200,0.055)'},
    {from:-0.5,to:0.5,  color:'rgba(155,177,220,0.045)'},
    {from:-2.5,to:-0.5, color:'rgba(240,163,58,0.055)'},
    {from:gMin,to:-2.5, color:'rgba(255,91,104,0.075)'}
  ];
  zones.forEach(z=>{
    const y1 = yOf(Math.min(z.to, gMax));
    const y2 = yOf(Math.max(z.from, gMin));
    ctx.fillStyle = z.color;
    ctx.fillRect(PAD_L, y1, W-PAD_L-PAD_R, y2-y1);
  });

  // ── Нульова лінія ──
  ctx.strokeStyle = '#2a3b61';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([4,3]);
  ctx.beginPath(); ctx.moveTo(PAD_L, y0); ctx.lineTo(W-PAD_R, y0); ctx.stroke();
  ctx.setLineDash([]);

  // ── Сьогодні — вертикальна лінія ──
  const todayIdx = data.findIndex(d=>d.ds===todayStr);
  if(todayIdx>=0){
    const tx = xOf(todayIdx);
    ctx.strokeStyle = 'rgba(55,167,255,0.5)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(tx, PAD_T); ctx.lineTo(tx, H-PAD_B); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#37a7ff';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('сьогодні', tx, PAD_T-4);
  }

  // ── Осі Y (мітки) ──
  ctx.fillStyle = '#7f99c4';
  ctx.font = '9px system-ui';
  ctx.textAlign = 'right';
  [-3,-2,-1,0,1,2,3].forEach(v=>{
    if(v < gMin || v > gMax) return;
    const y = yOf(v);
    ctx.strokeStyle = 'rgba(30,47,82,0.5)';
    ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W-PAD_R, y); ctx.stroke();
    ctx.fillText(v>0?'+'+v:v, PAD_L-4, y+3);
  });

  ctx.font = '8px system-ui';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7f99c4';
  ctx.fillText('КАЛ', PAD_L-4, 13);
  ctx.fillText('РІШ', PAD_L-4, 25);

  // ── Лінія G RAW (довідкова, не рішення) ──
  // v88.8.34: лінія малюється тільки по raw continuous G. PDF/Engine day-score — overlay marker only. v88.8.34 label fix: axis is G_day raw, not current Hero G.
  // fp316: raw is a deliberately faint audit rail. It is never the primary forecast.
  if(showRawAudit){
  ctx.save();
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';
  ctx.setLineDash([4,4]);
  ctx.strokeStyle = 'rgba(79,143,202,0.55)';
  ctx.beginPath();
  let first = true;
  data.forEach((d,i)=>{
    const _gForChart = d.G;
    const x = xOf(i), y = isFinite(_gForChart) ? yOf(_gForChart) : NaN;
    if(first){ ctx.moveTo(x,y); first=false; } else ctx.lineTo(x,y);
  });
  ctx.stroke();
  ctx.restore();
  }

  // fp386: color restores scanability without using verdict-green. The continuous
  // line remains raw G context; PDF/Engine reference stays a separate square marker.
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.2;
  for(let i=1;i<data.length;i++){
    const a=data[i-1], b=data[i];
    if(!Number.isFinite(a.G) || !Number.isFinite(b.G)) continue;
    ctx.strokeStyle = rawContextColor((a.G + b.G) / 2);
    ctx.beginPath();
    ctx.moveTo(xOf(i-1), yOf(a.G));
    ctx.lineTo(xOf(i), yOf(b.G));
    ctx.stroke();
  }
  data.forEach((d,i)=>{
    if(!Number.isFinite(d.G)) return;
    const col=rawContextColor(d.G);
    ctx.fillStyle=col;
    ctx.beginPath();
    ctx.arc(xOf(i),yOf(d.G),d.ds===todayStr?5:3.5,0,Math.PI*2);
    ctx.fill();
    if(d._decisionAuthority==='verified_pdf'){
      ctx.strokeStyle='#ffd166';
      ctx.lineWidth=1.4;
      ctx.stroke();
    }
  });
  ctx.restore();

  // ── Точки з кольором ──
  // v88.8.34: find best/worst по raw G
  let bestIdx=-1, worstIdx=-1, bestG=-Infinity, worstG=Infinity;
  data.forEach((d,i)=>{
    const _gForChart = d.G; // v88.8.34: raw continuous G only
    if(!isFinite(_gForChart)) return;
    if(_gForChart>bestG){bestG=_gForChart;bestIdx=i;}
    if(_gForChart<worstG){worstG=_gForChart;worstIdx=i;}
  });
  data.forEach((d,i)=>{
    const _gForChart = d.G; // v88.8.34: raw continuous G only
    if(!isFinite(_gForChart)) return;
    const x = xOf(i), y = yOf(_gForChart);
    const col = rawContextColor(_gForChart); // raw context, never a verdict-green
    const isBest=i===bestIdx, isWorst=i===worstIdx;
    if(showRawAudit && isFinite(y)){
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, d.ds===todayStr?4:isBest||isWorst?4:2.5, 0, Math.PI*2);
      ctx.fill();
    }
    // v88.8.18 ★ EXPERT OVERRIDE marker (v88.8.35-fp14 BB FIX): зірка PDF/Engine
    // повинна стояти на власній y-координаті expert_eng (бо легенда обіцяє
    // "★ Зірка: PDF/Engine score (експертна оцінка дня)").
    // До fp14: малювалась `y-10` від raw точки → візуально expert=−3 збігався з raw=−1.4
    // і користувач не міг прочитати реальний експертний verdict з графіка.
    if(d.calendarAdvisory && d.calendarAdvisory.level !== 'unknown'){
      const _calCol = d.calendarAdvisory.level==='high_risk'?'#ff4d5e':d.calendarAdvisory.level==='caution'?'#ffaa33':d.calendarAdvisory.level==='mixed'?'#b88cff':'#9fd1ff';
      ctx.fillStyle = _calCol;
      ctx.beginPath();
      ctx.arc(x, 10, 3.0, 0, Math.PI*2);
      ctx.fill();
    }
    if(Number.isFinite(d._decisionEng)){
      const _decCol = d._decisionEng >= 1 ? '#cfb6ff' : d._decisionEng <= -1 ? '#ff6b6b' : '#9bb1dc';
      ctx.fillStyle = _decCol;
      ctx.fillRect(x-3.2, 19, 6.4, 6.4);
      if(d._decisionAuthority === 'verified_pdf'){
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 1;
        ctx.strokeRect(x-4.2, 18, 8.4, 8.4);
      }
    }
    if (showRawAudit && isFinite(y) && d._hasOverride) {
      // Золоте кільце залишаємо на raw точці — це маркер "тут є override"
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 5.5, 0, Math.PI*2);
      ctx.stroke();
      // Зірка — на координаті expert_eng (clamped до видимого діапазону графіка)
      let _starY = y - 10; // fallback на старе positionування
      if (Number.isFinite(d._expertEng)) {
        const _expClamped = Math.max(gMin, Math.min(gMax, d._expertEng));
        _starY = yOf(_expClamped);
        // Якщо raw і expert майже збігаються — зсунемо зірку на 10 пікс вгору, щоб не злилась з точкою
        if (Math.abs(_starY - y) < 6) _starY = y - 10;
      }
      const _decisionCol = d._expertEng >= 1 ? '#cfb6ff' : d._expertEng <= -1 ? '#ff6b6b' : '#9bb1dc';
      ctx.fillStyle = _decisionCol;
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('★', x, _starY + 4);
      ctx.font = 'bold 9px system-ui';
      ctx.fillText((d._expertEng>=0?'+':'')+d._expertEng, x, _starY - 7);
      // Тонка пунктирна вертикальна лінія від raw до expert (тільки якщо різниця ≥1 пункт)
      if (Number.isFinite(d._expertEng) && Math.abs(d._expertEng - _gForChart) >= 1) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,209,102,0.45)';
        ctx.setLineDash([2,3]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, _starY);
        ctx.stroke();
        ctx.restore();
      }
    }
    // v75: best/worst labels
    if(showRawAudit && isBest){
      ctx.fillStyle='#8fb5ff';ctx.font='bold 9px system-ui';ctx.textAlign='center';
      ctx.fillText('▲ max raw '+_gForChart.toFixed(1), x, y-8);
    }
    if(showRawAudit && isWorst){
      ctx.fillStyle='#8fb5ff';ctx.font='bold 9px system-ui';ctx.textAlign='center';
      ctx.fillText('▼ min raw '+_gForChart.toFixed(1), x, y+16);
    }
  });

  // ── Вісь X (дати кожні 7 днів) ──
  ctx.fillStyle = '#7f99c4';
  ctx.font = '9px system-ui';
  ctx.textAlign = 'center';
  data.forEach((d,i)=>{
    if(i%7===0 || i===n-1){
      const x = xOf(i);
      ctx.fillText(d.ds.slice(5), x, H-PAD_B+14);
    }
  });

  // v74: hover tooltip
  canvas.onmousemove = function(evt){
    const rect=canvas.getBoundingClientRect();
    const mx=(evt.clientX-rect.left)*(canvas.width/dpr/rect.width);
    const tip=document.getElementById('chart27Tooltip');
    if(!tip) return;
    // Find nearest point by raw G
    let best=-1, bestDist=Infinity;
    data.forEach((d,i)=>{
      const _gEff = d.G; // v88.8.34: raw continuous G only
      if(!isFinite(_gEff)) return;
      const dx=Math.abs(xOf(i)-mx);
      if(dx<bestDist){bestDist=dx;best=i;}
    });
    if(best>=0 && bestDist<20){
      const d=data[best];
      const _gEff = d.G; // v88.8.34: raw continuous G only
      const cat=_gEff>=2?'🟢 raw-фон сильний':_gEff>=0.5?'🟢 raw-фон сприятливий':_gEff>=-0.5?'⚪ raw-фон нейтральний':_gEff>=-2.5?'🟠 raw-фон обережний':'🔴 raw-фон важкий';
      const _calInfo = d.calendarAdvisory && d.calendarAdvisory.level !== 'unknown'
        ? `<div style="font-size:10px;margin-top:2px;color:${d.calendarAdvisory.level==='high_risk'?'#ff6b6b':d.calendarAdvisory.level==='caution'?'#ffaa33':d.calendarAdvisory.level==='mixed'?'#b88cff':'#2bd47d'}">Calendar: ${escapeHtml(calendarAdvisoryText(d.calendarAdvisory))} - advisory only</div>`
        : '';
      const _ovInfo = d._hasOverride
        ? `<div style="color:#ffd166;font-size:10px;margin-top:2px">★ PDF/Engine Day_score: ${d._expertEng>=0?'+':''}${d._expertEng} · G_day raw=${d.G>=0?'+':''}${d.G.toFixed(2)}</div>`
        : '';
      tip.innerHTML=`<div style="font-weight:700">${d.ds}</div><div>G_day raw = <span style="font-weight:700;color:${_gEff>=0.5?'#2bd47d':_gEff>=-0.5?'#9bb1dc':_gEff>=-2.5?'#ffaa33':'#ff4444'}">${_gEff>=0?'+':''}${_gEff.toFixed(1)}</span>${d._hasOverride?' ★':''}</div><div style="color: var(--muted)">${cat}</div>${_ovInfo}${_calInfo}`;
      const tx=evt.clientX-rect.left, ty=evt.clientY-rect.top;
      tip.style.display='block';
      tip.style.left=Math.min(tx+12, rect.width-140)+'px';
      tip.style.top=Math.max(ty-50,0)+'px';
    } else {
      tip.style.display='none';
    }
  };
  canvas.onmouseleave=function(){
    const tip=document.getElementById('chart27Tooltip');
    if(tip) tip.style.display='none';
  };
}/* NR_FN_END 315 */

/* NR_FN_BEGIN 318 */function renderHoraTimeline(dateUTC, kp, G) {
  const wrap = el('horaTimeline');
  const legend = el('horaLegend');
  const axis = el('horaAxis');
  if(!wrap) return;
  // v87.26: оновити лейбл координат/TZ при кожному рендері (offset/DST може змінитися)
  try{ _updateHoraCoordLabel(); }catch(e){ globalThis.NRDiagnostics?.record('catch.249','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  const HORA_SYMBOLS = {
    'Сонце':'☀','Місяць':'☽','Марс':'♂','Меркурій':'☿','Юпітер':'♃','Венера':'♀','Сатурн':'♄'
  };

  const { slots, srH, ssH } = calcAllHoras(dateUTC);
  if(!slots.length){
    wrap.textContent='Хори недоступні: немає визначеного інтервалу сходу та заходу для цих координат.';
    if(legend)legend.textContent='';
    if(axis)axis.textContent='';
    return;
  }
  const nowH = dateUTC.getUTCHours() + dateUTC.getUTCMinutes()/60 + dateUTC.getUTCSeconds()/3600;
  const toPercent = h => ((h % 24 + 24) % 24) / 24 * 100;

  let html = '';
  // Day background
  const srPct = toPercent(srH).toFixed(2);
  const ssPct = toPercent(ssH).toFixed(2);
  html += `<div style="position:absolute;left:${srPct}%;width:${(ssPct-srPct).toFixed(2)}%;top:0;height:100%;background:rgba(255,220,100,0.06);pointer-events:none"></div>`;

  for(const s of slots) {
    const startNorm = ((s.startH % 24) + 24) % 24;
    const endNorm   = ((s.endH   % 24) + 24) % 24;
    const left  = (startNorm / 24 * 100).toFixed(2);
    const width = ((endNorm - startNorm + 24) % 24 / 24 * 100).toFixed(2);
    const col = HORA_COLORS[s.planet] || '#445566';
    const isNow = nowH >= s.startH && nowH < s.endH;
    const score = HORA_SCORE_MAP[s.planet] ?? 0;
    const opacity = s.isDay ? '1' : '0.5';
    const nowCls = isNow ? ' hora-now hora-seg-active' : '';
    const sym = HORA_SYMBOLS[s.planet] || s.planet.slice(0,1);
    const widthNum = parseFloat(width);
    // Show symbol if segment wide enough, else just number
    const label = widthNum > 5 ? sym : (widthNum > 2.5 ? sym : '');
    const activeStyle = isNow ? `box-shadow:inset 0 0 0 2px rgba(255,255,255,0.7);z-index:6;` : '';
    html += `<div class="hora-seg${nowCls}" style="left:${left}%;width:${width}%;background:${col};opacity:${opacity};${activeStyle}" title="${s.planet} ${toHHMM_utc(s.startH)}–${toHHMM_utc(s.endH)} UTC · PCL ${score>0?'+':''}${score}"><span class="hora-label" style="font-size:12px">${label}</span></div>`;
  }

  // "Now" line
  const nowPct = (nowH / 24 * 100).toFixed(2);
  html += `<div style="position:absolute;left:${nowPct}%;top:0;width:2px;height:100%;background:rgba(255,255,255,0.85);pointer-events:none;z-index:10"></div>`;
  wrap.innerHTML = html;

  // UTC axis: ticks every 6 hours
  if(axis) {
    let axHtml = '';
    for(let h=0;h<=24;h+=6){
      const pct=(h/24*100).toFixed(1);
      axHtml+=`<span style="position:absolute;left:${pct}%;transform:translateX(-50%)">${String(h).padStart(2,'0')}:00</span>`;
    }
    axis.innerHTML=axHtml;
  }

  // Legend
  const cur = slots.find(s => nowH >= s.startH && nowH < s.endH);
  const nxt = slots.find(s => s.startH > (cur ? cur.startH : nowH));
  // Наступна сприятлива (score >= 1.5 = Юпітер денний або Сонце/Меркурій/Венера денні)
  const nextFav = slots.find(s => s.startH > nowH && (HORA_SCORE_MAP[s.planet] ?? 0) + (s.isDay ? 0.5 : 0) >= 1.5);
  if(cur && legend) {
    const minLeft = Math.round((cur.endH - nowH) * 60);
    const col = HORA_COLORS[cur.planet] || '#9bb1dc';
    const score = HORA_SCORE_MAP[cur.planet] ?? 0;
    const sym = HORA_SYMBOLS[cur.planet] || '';
    const nxtStr = nxt ? ` → <strong>${HORA_SYMBOLS[nxt.planet]||''} ${nxt.planet}</strong> ${toHHMM_utc(nxt.startH)} UTC` : '';
    const HORA_ENABLED_PROFILES = ['mil','trader'];
    const horaActive = HORA_ENABLED_PROFILES.includes(_activeProfile);
    const horaEiStr = horaActive
      ? ` · <span style="color:#7ab8d4;font-size:10px">eᵢ ${score*0.2>=0?'+':''}${(score*0.2).toFixed(1)} (×0.2 ${_activeProfile})</span>`
      : '';
    const favStr = nextFav
      ? `<span style="color:#cfb6ff;font-size:10px"> ⏩ Наступна локально підтримувальна Hora: <strong>${HORA_SYMBOLS[nextFav.planet]||''} ${nextFav.planet}</strong> о ${toHHMM_utc(nextFav.startH)} UTC · не змінює загальний G</span>`
      : `<span style="color:var(--faint);font-size:10px"> — сприятливих більше немає сьогодні</span>`;
    legend.innerHTML = `Зараз: <strong style="color:${col}">${sym} ${cur.planet}</strong> <span style="color:${col};font-size:10px">PCL ${score>0?'+':''}${score}</span> · до ${toHHMM_utc(cur.endH)} UTC (ще <span id="horaCountdown" style="color:${col};font-weight:700">${minLeft}хв</span>)${nxtStr}${horaEiStr}<br>${favStr}`;
    // P2-ux: live Hora countdown
    if (window._horaCountTimer) clearInterval(window._horaCountTimer);
    window._horaCountTimer = setInterval(function() {
      var _cd = document.getElementById('horaCountdown');
      if (!_cd) { clearInterval(window._horaCountTimer); return; }
      var _n = new Date();
      var _nh = _n.getUTCHours() + _n.getUTCMinutes()/60 + _n.getUTCSeconds()/3600;
      var _ml = Math.round((cur.endH - _nh) * 60);
      if (_ml <= 0) { clearInterval(window._horaCountTimer); renderHoraTimeline(new Date(), kp, G); return; }
      _cd.textContent = _ml + 'хв';
    }, 30000);
  }
}/* NR_FN_END 318 */

/* NR_FN_BEGIN 320 */function renderGDecomp(G, kp, ai) {
  const block = document.getElementById('gDecompBlock');
  const bar   = document.getElementById('gDecompBar');
  const facts = document.getElementById('gDecompFactors');
  if(!block || !bar || !facts) return;
  if(!isFinite(G) || kp == null) { block.style.display='none'; return; }
  block.style.display='block';

  // ── Stacked bar: 2−Kp vs ΣAᵢ ──
  const kpPart = kpDayTerm(kp);
  const aiPart = ai.Ai;
  const absMax = Math.max(Math.abs(kpPart) + Math.abs(aiPart), 1);
  const kpW = Math.max(12, Math.abs(kpPart) / absMax * 100);
  const aiW = Math.max(12, Math.abs(aiPart) / absMax * 100);
  const kpCol = kpPart >= 0 ? 'rgba(55,167,255,0.7)' : 'rgba(255,107,107,0.6)';
  const aiCol = aiPart >= 0 ? 'rgba(43,212,125,0.6)' : 'rgba(255,170,51,0.6)';
  const gCol  = G<=-2.5?'#ff4444':G<=-0.5?'#ffaa33':G>=0.5?'#2bd47d':'#9bb1dc';
  // Анімуємо bar при оновленні
  if(bar._lastG !== undefined && bar._lastG !== G) {
    bar.style.animation = 'none';
    bar.offsetHeight; // reflow
    bar.style.animation = 'flowRight .4s ease-out';
  }
  bar._lastG = G;

  bar.innerHTML = `
    <div class="gd-label" style="min-width:40px">2−Kp</div>
    <div class="gd-seg" style="max-width:${kpW.toFixed(0)}%;flex:1 1 auto;background:${kpCol};color:#fff">${kpPart>=0?'+':''}${kpPart.toFixed(1)}</div>
    <div class="gd-label" style="min-width:16px;text-align:center;color:var(--faint)">+</div>
    <div class="gd-label" style="min-width:24px">ΣAᵢ</div>
    <div class="gd-seg" style="max-width:${aiW.toFixed(0)}%;flex:1 1 auto;background:${aiCol};color:#fff">${aiPart>=0?'+':''}${aiPart.toFixed(1)}</div>
    <div class="gd-label" style="min-width:16px;text-align:center;color:var(--faint)">=</div>
    <div style="font-size:16px;font-weight:800;color:${gCol};min-width:44px">G ${G.toFixed(1)}</div>
  `;

  // ── Factor chips: Lᵢ, Mᵢ, eᵢ, Pᵢ ──
  const factors = [
    {name:'Lᵢ', label:'Тітхі',     val:ai.Li, tip:ai.lTip},
    {name:'Mᵢ' + (ai.eclipseUnverified?' ⚠':''), label:'Затемн.',    val:ai.Mi, tip:ai.mTip},
    {name:'eᵢ', label:'Події',      val:ai.ei, tip:ai.eTip},
    ...(ai.horaEi !== 0 ? [{name:'Hora', label:'Hora×0.2', val:ai.horaEi, tip:`Hora внесок у eᵢ (профіль ${_activeProfile})`}] : []),
    {name:'Pᵢ', label:'Панчанга',   val:ai.Pi, tip:ai.pTip||''},
    ...(ai.Di !== 0 ? [{name:'Dᵢ', label:'Dst-буря', val:ai.Di, tip:ai.diTip||''}] : [])
  ];
  let html = '';
  for(let fi=0; fi<factors.length; fi++) {
    const f = factors[fi];
    const cls = f.val > 0 ? 'pos' : f.val < 0 ? 'neg' : 'neu';
    const col = f.val > 0 ? '#2bd47d' : f.val < 0 ? '#ff6b6b' : '#6b82aa';
    const sign = f.val > 0 ? '+' : '';
    const delay = `animation-delay:${fi*0.08}s`;
    const gWithout = (G - f.val).toFixed(1);
    const dgLabel = 'Без цього: G=' + (gWithout>=0?'+':'') + gWithout;
    html += `<div class="gd-chip ${cls} hint animated" tabindex="0" style="${delay}" data-dg="${dgLabel}" data-val="${f.val}">
      <span class="gd-chip-val" style="color:${col}">${sign}${f.val}</span>
      <span class="gd-chip-name">${f.name} ${f.label}</span>
      <span class="hint-pop" style="white-space:pre;font-size:12px">${escapeHtml(f.tip)}\nΔG вклад: ${sign}${f.val} → ${dgLabel}</span>
    </div>`;
    if(fi < factors.length - 1) html += `<span class="gd-flow-arrow">›</span>`;
  }
  // Сума ΣAᵢ
  const sumCol = aiPart > 0 ? '#2bd47d' : aiPart < 0 ? '#ff6b6b' : '#6b82aa';
  html += `<span class="gd-flow-arrow" style="font-size:16px;font-weight:700">=</span>
  <div class="gd-chip" style="border-color:${sumCol};background:#0a1020">
    <span class="gd-chip-val" style="color:${sumCol};font-size:13px">${aiPart>=0?'+':''}${aiPart.toFixed(1)}</span>
    <span class="gd-chip-name">ΣAᵢ</span>
  </div>`;
  facts.innerHTML = html;

  // ── Decomposition table ──
  const tbl = document.getElementById('gDecompTable');
  const tbody = document.getElementById('gDecompTableBody');
  if(tbl && tbody) {
    // table always visible via CSS
    const valCol = v => v > 0 ? '#2bd47d' : v < 0 ? '#ff6b6b' : '#6b82aa';
    const sign = v => v > 0 ? '+' + v : '' + v;
    const rows = [
      {name:'🌐 2−Kp', val:kpPart,
        desc: kpPart >= 2  ? `Шторм G${Math.round(kp)-4} — висока геомагнітна активність`
            : kpPart >= 1  ? 'Підвищена геомагнітна активність'
            : kpPart >= 0  ? 'Геомагніт спокійний'
            : kpPart >= -1 ? 'Геомагніт нижче норми'
            :                'Дуже спокійне поле'},
      {name:'🌙 Lᵢ', val:ai.Li,
        desc: ai.Li === -3 ? `Амавасья — новоління (${ai.phaseName})`
            : ai.Li === 0  ? `${ai.phaseName} — нейтральна фаза (Purnima=0 v14.2)`
            :                `${ai.phaseName}`},
      {name:'🌑 Mᵢ', val:ai.Mi,
        desc: ai.Mi <= -3 ? 'Активне затемнення (eclipse day)'
            : ai.Mi === -1 ? 'Залишковий вплив затемнення (±3 дні)'
            :                'Немає активних затемнень'},
      {name:'📅 eᵢ', val:ai.ei,
        desc: ai.ei <= -2 ? 'Live-шар подій: сильний негативний внесок у G_now'
            : ai.ei === -1 ? 'Live-шар подій: помірний негативний внесок у G_now'
            : ai.ei === 0  ? 'Нейтральний день — подій не виявлено'
            : ai.ei === 1  ? 'Помірно сприятливі події'
            :                'Live-шар подій: позитивний внесок у G_now'},
      {name:'🕉 Pᵢ', val:ai.Pi,
        desc: ai.Pi <= -1  ? 'Несприятлива Панчанга (поєднання негативних факторів)'
            : ai.Pi < -0.3 ? 'Помірно несприятлива Панчанга'
            : ai.Pi > 1    ? 'Дуже сприятлива Панчанга'
            : ai.Pi >= 0.3 ? 'Сприятлива Панчанга'
            :                'Нейтральна Панчанга'},
      {name:'🧲 Dᵢ', val:ai.Di,
        desc: ai.Di <= -2 ? `Значна геомагнітна буря (Dst≤−100 нТл)`
            : ai.Di === -1 ? `Підтверджена буря (Dst≤−50 нТл, engine v18.5)`
            :                'Dst норма — без штрафу'}
    ];
    let thtml = '';
    for(const r of rows) {
      const c = valCol(r.val);
      const rowId='row_'+r.name.replace(/[^a-zA-Z]/g,'');
      thtml += `<tr id="${rowId}" style="transition:background .2s">
        <td style="padding:3px 8px;border-top:1px solid #1a2540;font-weight:600;color: var(--text2)">${r.name}</td>
        <td style="padding:3px 8px;border-top:1px solid #1a2540;text-align:center;font-weight:700;color:${c};font-variant-numeric:tabular-nums">${typeof r.val==='number'&&!Number.isInteger(r.val)?sign(r.val.toFixed(1)):sign(r.val)}</td>
        <td style="padding:3px 8px;border-top:1px solid #1a2540;color:#7a9acc;word-break:break-word;overflow-wrap:break-word">${r.desc}</td>
      </tr>`;
    }
    // Підсумковий рядок
    thtml += `<tr style="border-top:2px solid #2a3b61">
      <td style="padding:4px 8px;font-weight:800;color: var(--text2)">⚡ G</td>
      <td style="padding:4px 8px;text-align:center;font-weight:800;font-size:14px;color:${gCol}">${G>=0?'+':''}${G.toFixed(1)}</td>
      <td style="padding:4px 8px;font-weight:600;color:${gCol};word-break:break-word">${classifyG(G)}</td>
    </tr>`;
    tbody.innerHTML = thtml;
  }
  // Запустити flow анімацію
  startGFlowAnimation(G, kp, ai);
}/* NR_FN_END 320 */

/* NR_FN_BEGIN 323 */function renderGFlowCanvas(G, kp, ai) {
  const cv = document.getElementById('gFlowCanvas');
  if(!cv) return;
  const H = 90;
  const cw = Math.round(cv.getBoundingClientRect().width) || 460;
  if(cv.width !== cw) cv.width = cw;
  if(cv.height !== H) cv.height = H;
  const W = cv.width;
  const ctx = cv.getContext('2d');
  const now = performance.now();

  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.rect(0, 0, W, H);
  ctx.clip();

  const {comps, particles} = _gFlowState;
  if(!comps) return;

  const PAD = 12;
  const gX = W - PAD - 18;
  const gY = H / 2;
  const n = comps.length;
  const segW = (gX - PAD - 40) / n;

  // ── Фон лінії-стрижня ──
  ctx.beginPath();
  ctx.moveTo(PAD + 20, gY);
  ctx.lineTo(gX - 20, gY);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── Компоненти (вузлові точки) ──
  // ── Вузли компонентів + лінії до G ──
  comps.forEach((c, i) => {
    const cx = PAD + 20 + i * segW + segW/2;
    const cy = gY;
    const col = _gFlowColor(c.val);
    const sign = c.val > 0 ? '+' : '';
    const valStr = sign + (Number.isInteger(c.val) ? c.val : c.val.toFixed(1));
    const r = c.val === 0 ? 4 : 6 + Math.min(6, Math.abs(c.val)*1.8);

    // Лінія до G
    if(c.val !== 0) {
      const grad = ctx.createLinearGradient(cx+r, cy, gX-18, cy);
      grad.addColorStop(0, col + '55');
      grad.addColorStop(1, col + '11');
      ctx.beginPath();
      ctx.moveTo(cx + r, cy);
      ctx.lineTo(gX - 18, cy);
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.abs(c.val) > 1 ? 2 : 1;
      ctx.stroke();
    }

    // Коло вузла
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fillStyle = c.val === 0 ? 'rgba(74,96,128,0.15)' : col + '28';
    ctx.fill();
    ctx.strokeStyle = c.val === 0 ? 'rgba(74,96,128,0.4)' : col;
    ctx.lineWidth = c.val === 0 ? 1 : 1.5;
    ctx.stroke();

    // Значення над вузлом
    ctx.fillStyle = c.val === 0 ? '#7f99c4' : col;
    ctx.font = `bold 10px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(valStr, cx, cy - r - 4);

    // Підпис під вузлом
    ctx.fillStyle = c.val === 0 ? 'rgba(74,96,128,0.6)' : 'rgba(150,175,210,0.8)';
    ctx.font = '8px sans-serif';
    ctx.fillText(c.label, cx, cy + r + 10);
  });

  // ── Частинки: летять від вузла → G по параболі ──
  particles.forEach(p => {
    p.progress = (p.progress + p.speed) % 1;
    const c = comps[p.ci];
    const cx = PAD + 20 + p.ci * segW + segW/2;
    const r0 = 6 + Math.min(6, Math.abs(c.val)*1.8);
    const targetX = gX - 18;
    // Парабола: вигин вгору для позитивних, вниз для негативних
    const px = cx + (targetX - cx) * p.progress;
    const arc = Math.sin(p.progress * Math.PI) * (c.val > 0 ? -8 : 8);
    const py = gY + arc;
    const alpha = Math.sin(p.progress * Math.PI) * 0.9;

    // Трейл
    ctx.beginPath();
    ctx.arc(px - (targetX-cx)*0.03, py, p.r*0.4, 0, Math.PI*2);
    ctx.fillStyle = p.col + Math.floor(alpha*25).toString(16).padStart(2,'0');
    ctx.fill();

    // Частинка
    ctx.beginPath();
    ctx.arc(px, py, p.r, 0, Math.PI*2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.col;
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // ── G-бейдж (destination) ──
  const gCol = G <= -2.5 ? '#ff4444' : G <= -0.5 ? '#ffaa33' : G >= 0.5 ? '#2bd47d' : '#9bb1dc';
  const pulse = 0.85 + 0.15 * Math.sin(now * 0.0025);
  const gR = 18 * pulse;
  // Glow
  const grad = ctx.createRadialGradient(gX, gY, 0, gX, gY, gR*1.8);
  grad.addColorStop(0, gCol + '55');
  grad.addColorStop(1, gCol + '00');
  ctx.beginPath();
  ctx.arc(gX, gY, gR*1.8, 0, Math.PI*2);
  ctx.fillStyle = grad;
  ctx.fill();
  // Коло
  ctx.beginPath();
  ctx.arc(gX, gY, gR, 0, Math.PI*2);
  ctx.fillStyle = '#0d1b35';
  ctx.fill();
  ctx.strokeStyle = gCol;
  ctx.lineWidth = 2;
  ctx.stroke();
  // G число
  const gSign = G >= 0 ? '+' : '';
  ctx.fillStyle = gCol;
  ctx.font = `bold ${isFinite(G) && Math.abs(G) >= 10 ? 10 : 12}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(isFinite(G) ? gSign + G.toFixed(1) : '?', gX, gY + 4);
  ctx.restore();
}/* NR_FN_END 323 */

/* NR_FN_BEGIN 325 */function renderBestTime(dateUTC, kp, G, panchPCL) {
  const wrap = document.getElementById('bestTimeBlock');
  const content = document.getElementById('bestTimeContent');
  if(!wrap || !content) return;
  // fp412: Hora is timing context only and never grants permission.
  wrap.style.display='block';
  const _bestLabel412=document.getElementById('bestTimeLabel');
  if(_bestLabel412) _bestLabel412.textContent='⏱ Hora — інформаційні часові вікна';
  content.innerHTML = '<div class="muted small">Традиційний часовий контекст. score_effect=0; не є дозволом, забороною або рекомендацією дії. Оперативне рішення — лише у головному блоці.</div>';
  return;

  // v88.8.35-fp6 D: paralelno з G перевіряємо PDF/Engine для дня — якщо PDF/Engine ≤ −2,
  // навіть при G_now > −1.5 показуємо попередження і НЕ рекомендуємо позитивні слоти.
  let _todayEng = null;
  try {
    const _e = (typeof getEngineScore === 'function') ? getEngineScore(dateUTC) : null;
    if (_e && isFinite(_e.eng)) _todayEng = Number(_e.eng);
  } catch(e){ globalThis.NRDiagnostics?.record('catch.250','recoverable');  _todayEng = null; }

  // Якщо G < -1 — взагалі несприятливо, показуємо попередження
  if(isFinite(G) && G <= -1.5) {
    wrap.style.display = 'block';
    const _engNote = (_todayEng !== null)
      ? ` PDF/Engine для дня: ${_todayEng >= 0 ? '+' : ''}${_todayEng}.`
      : '';
    content.innerHTML = `<div style="color:#ff9f9f;font-size:13px;padding:6px 10px;background:rgba(255,80,80,0.08);border-left:3px solid #ff6b6b;border-radius:6px">⚠ Сьогодні G_now = ${G.toFixed(1)} — фон важкий, утриматись від активних дій.${_engNote}</div>`;
    return;
  }

  // v88.8.35-fp6 D: новий gate — якщо PDF/Engine ≤ −2 (експертно несприятливий день),
  // не показуємо зелені слоти першорядно, навіть якщо live-фон зараз позитивний.
  // Зберігаємо warning як префікс — content.innerHTML встановиться нижче з усім html.
  let _pdfEngineWarn = '';
  if (_todayEng !== null && _todayEng <= -2) {
    _pdfEngineWarn = `<div style="color:#ffd2a0;font-size:13px;padding:6px 10px;background:rgba(255,170,51,0.08);border-left:3px solid #ffaa33;border-radius:6px;margin-bottom:8px">⚠ PDF/Engine для дня: ${_todayEng >= 0 ? '+' : ''}${_todayEng} (експертна оцінка). Фон зараз G_now = ${isFinite(G) ? (G >= 0 ? '+' : '') + G.toFixed(1) : '—'} — live-фон може дозволяти точкові дії, але рішення дня лишається за PDF/Engine. Hora-вікна нижче — тільки для тактичних задач, не для важливих рішень.</div>`;
  }

  const { slots, srH, ssH } = calcAllHoras(dateUTC);
  const nowH = dateUTC.getUTCHours() + dateUTC.getUTCMinutes()/60;

  // Оцінюємо кожен слот: score = HORA_SCORE + бонус за денний час + G-фактор
  const scored = slots.map(s => {
    const hs = HORA_SCORE_MAP[s.planet] ?? 0;
    const isDayBonus = s.isDay ? 0.5 : 0;            // денна Hora краща
    const isFuture = s.endH > nowH + 0.25;           // не в минулому
    const isSoon   = s.startH < nowH + 8;             // в найближчі 8 годин
    const total = hs + isDayBonus;
    return { ...s, horaScore: hs, total, isFuture, isSoon };
  })
  .filter(s => s.isFuture && s.total >= 1.0)
  .sort((a,b) => b.total - a.total || a.startH - b.startH);

  wrap.style.display = 'block';

  if(!scored.length) {
    content.innerHTML = _pdfEngineWarn + `<div class="muted small">Сьогодні немає явно сприятливих Hora-вікон. Оберіть Юпітера (Чт) або Меркурія (Ср) у наступний день.</div>`;
    return;
  }

  // fp115: при dayScore <= -2 — label "найменш ризикове вікно", слоти жовті
  const _isDayNeg = _todayEng !== null && _todayEng <= -2;
  const _bestLabel = document.getElementById('bestTimeLabel');
  if (_bestLabel) {
    _bestLabel.textContent = _isDayNeg
      ? '⚠ Найменш ризикове вікно (день несприятливий)'
      : '⏱ Найкращий час дії сьогодні';
    _bestLabel.style.color = _isDayNeg ? '#ffaa33' : '';
  }

  // Топ-2
  const top = scored.slice(0, 2);
  let html = '<div style="display:flex;flex-wrap:wrap;gap:0">';
  top.forEach((s, i) => {
    // fp115: при несприятливому дні слоти жовті, не зелені
    const col = _isDayNeg ? '#ffaa33' : (HORA_COLORS[s.planet] || '#37a7ff');
    const isCurrent = nowH >= s.startH && nowH < s.endH;
    const timeStr = isCurrent
      ? `🟢 Зараз — до ${toHHMM_utc(s.endH)} UTC`
      : `${toHHMM_utc(s.startH)}–${toHHMM_utc(s.endH)} UTC`;
    const scoreStr = `PCL ${s.horaScore > 0 ? '+' : ''}${s.horaScore}`;
    html += `<div class="best-slot${i===0?' top1':''}">
      <span style="width:10px;height:10px;border-radius:50%;background:${col};display:inline-block;flex-shrink:0"></span>
      <span class="bs-time">${timeStr}</span>
      <span class="bs-planet">${s.planet}</span>
      <span class="bs-score">${scoreStr}</span>
    </div>`;
  });
  html += '</div>';

  // Align27-стиль: найкращий день найближчих 7 днів
  if(_27dComputed && _27dComputed.length) {
    const todayStr = todayKyivStr();
    const future7 = _27dComputed
      .filter(d => d.ds >= todayStr)
      .slice(0, 7)
      .sort((a,b) => b.G - a.G);
    if(future7.length && future7[0].G > 0) {
      const best = future7[0];
      html += `<div style="margin-top:8px;font-size:12px;color:#7a9acc" title="G_day raw — добовий continuous фон (2 − Kp_day + ΣAᵢ). Це НЕ PDF/Engine reference і не команда. Для оперативної дії дивись Hero/safety-контур.">
        📅 Найвищий raw-фон (7 днів): <strong style="color: var(--ok)">${best.ds}</strong>
        G_day raw = <strong style="color: var(--ok)">${best.G.toFixed(1)}</strong>
        · ${classifyG(best.G)}
        <span style="color:var(--faint);font-size:10px">· контекст, не рішення</span>
      </div>`;
    }
  }

  content.innerHTML = _pdfEngineWarn + html;
}/* NR_FN_END 325 */

/* NR_FN_BEGIN 328 */function _showToast(msg) {
  let t = document.getElementById('_gToast');
  if (!t) {
    t = document.createElement('div'); t.id = '_gToast';
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e3a5f;color: var(--text2);padding:8px 18px;border-radius:10px;font-size:13px;z-index:9999;pointer-events:none;border:1px solid #2a5080;transition:opacity .3s';
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 2500);
}/* NR_FN_END 328 */

/* NR_FN_BEGIN 337 */function renderMilRec(G, prof) {
  const adj    = getAgeAdj('mil');
  const Geff   = G + adj.gShift;          // ефективний G з поправкою на вік
  // v83f: use canonical stateKey
  const _milKeyMap = { tense:'≤-3', unstable:'-1', neutral:'0', good:'1', favorable:'≥2' };
  const key    = _milKeyMap[classifyStateByG(Geff)] || '0';
  const baseRec = prof.recs[key] || prof.recs['-2'] || prof.recs['0'];

  // Taara + Dasa контекст
  const ps = getTaaraState();
  let taaraLine = '';
  let dasaLine  = '';
  if (ps) {
    const tDanger = ps.taara.danger;
    const tCol    = tDanger ? '#ff6b6b' : '#2bd47d';
    const tIcon   = tDanger ? '⚠' : '✓';
    const tName   = ps.taara.name || `поз.${ps.taara.group}/9`;
    taaraLine = `<div style="margin-top:5px;font-size:12px">
      <span style="color:${tCol}">${tIcon} Taara ${ps.taara.group}/9 — ${tName}:</span>
      ${tDanger
        ? 'особиста Таара в зоні ризику — підвищити ротацію, уникати одноосібних рішень'
        : 'особиста Таара сприятлива — когнітивний стан особового складу стабільний'}
    </div>`;

    // Dasa-контекст для mil
    const DASA_MIL = {
      'Ketu':    '⚡ Кету-даша: непередбачувані рішення, перевіряти накази',
      'Venus':   '♀ Венера-даша: схильність до дипломатії, менш агресивний режим',
      'Sun':     '☀ Сонце-даша: лідерство, чітке командування — оптимально для офіцерів',
      'Moon':    '☾ Місяць-даша: емоційна реактивність, увага до стресу підлеглих',
      'Mars':    '♂ Марс-даша: висока бойова активність, ризик імпульсивних дій',
      'Rahu':    '☊ Раху-даша: аномалії та сюрпризи, обережно з розвідданими',
      'Jupiter': '♃ Юпітер-даша: стратегічне мислення, час для планування',
      'Saturn':  '♄ Сатурн-даша: виснаження, необхідна ротація і відпочинок',
      'Mercury': '☿ Меркурій-даша: точність і зв\'язок, добре для брифінгів',
    };
    const dLord = ps.dasa.lordName || '';
    const dText = DASA_MIL[dLord] || '';
    if (dText) dasaLine = `<div style="margin-top:4px;font-size:12px;color: var(--text3)">${dText} (залишок ${ps.dasa.remainStr})</div>`;
  }

  // Вікова поправка — лінія
  let ageLine = '';
  if (adj.label) {
    const shiftSign = adj.gShift > 0 ? `+${adj.gShift}` : adj.gShift < 0 ? `${adj.gShift}` : '±0';
    const effStr    = Geff !== G ? ` → G_personal=${Geff.toFixed(1)}` : ''; // personal/profile adjusted, not raw G
    ageLine = `<div style="margin-top:4px;font-size:11px;color:var(--faint)">${adj.label} | поправка: G${shiftSign}${effStr}</div>`;
  }

  return `<span style="font-weight:700;color:${prof.color}">${prof.label}:</span> ${baseRec}${taaraLine}${dasaLine}${ageLine}`;
}/* NR_FN_END 337 */

/* NR_FN_BEGIN 338 */function renderAviationSwxLine(){
  const kp = (window.__uiState && isFinite(window.__uiState.kpNow)) ? Number(window.__uiState.kpNow) : NaN;
  if(!isFinite(kp)) return '';
  let st, col;
  if(kp >= 9)      { st = 'ICAO SEV (Kp≥9) — HF-advisory, найвищий рівень'; col = '#ff6b6b'; }
  else if(kp >= 8) { st = 'ICAO MOD (Kp≥8) — HF-advisory'; col = '#ff6b6b'; }
  else if(kp >= 5) { st = 'БпЛА: обережність — ручний режим де можливо, перевір RTH, не калібруй компас'; col = '#ffaa33'; }
  else if(kp >= 4) { st = 'БпЛА: увага — можливі похибки GPS/компаса, перебої телеметрії'; col = '#ffd166'; }
  else             { st = 'норма — нижче порогів БпЛА (4/5) та ICAO (8/9)'; col = 'var(--ok)'; }
  // fp56-P11b: вплив на ОБЛАДНАННЯ (Doc 10100: 1.2.3e, 1.3.1c, 2.5.8, 2.3.11, 2.4.6) — показуємо з Kp≥4
  const eq = (kp >= 4)
    ? `<span style="display:block;margin-top:2px;color:#ffd166">Обладнання: можливі перезавантаження електроніки (SEU), збої SATCOM L-діапазону (&lt;2 ГГц), аномалії ADS-B, шум радарів, похибки GNSS-синхронізації часу</span>`
    : '';
  return `<div style="margin-top:5px;font-size:11px;color:var(--faint);border-top:1px solid rgba(255,255,255,.07);padding-top:4px">`
       + `✈ Космопогода для авіації: <span style="color:${col};font-weight:700">Kp ${kp.toFixed(2)} · ${st}</span>${eq}`
       + `<span style="display:block;margin-top:2px">Пороги: БпЛА 4/5 (наша рекомендація) · велика авіація 8/9 (ICAO Doc 10100, Annex 3 Amd 78)</span></div>`;
}/* NR_FN_END 338 */

/* NR_FN_BEGIN 339 */function renderProfileRec() {
  const el_ = document.getElementById('profileRec');
  if(!el_) return;
  if(_activeProfile === 'off') { el_.style.display='none'; return; }

  const prof = PROFILE_TEXT[_activeProfile];
  if(!prof) { el_.style.display='none'; return; }

  const gEl   = document.getElementById('nowG');
  const gText = gEl ? gEl.textContent.replace('G','').trim() : '';
  const G     = parseFloat(gText);
  if(!isFinite(G)) { el_.style.display='none'; return; }

  el_.style.display    = 'block';
  el_.style.background = prof.bg;
  el_.style.borderLeft = `3px solid ${prof.border}`;
  el_.style.color      = '#cfe0ff';

  // mil — розширений рендер з Taara + Dasa + ageAdj
  if (_activeProfile === 'mil') {
    el_.innerHTML = renderMilRec(G, prof) + renderAviationSwxLine(); // fp56-P11
    return;
  }

  // Всі інші профілі — ageAdj з PROFILE_TEXT
  const adj   = getAgeAdj(_activeProfile);
  const Geff  = G + adj.gShift;
  // v83f: use canonical stateKey for profile rec lookup (aligned with GLOBAL_STATES)
  const _profStateKey = classifyStateByG(Geff);
  const _profKeyMap = { tense:'≤-3', unstable:'-1', neutral:'0', good:'1', favorable:'≥2' };
  const key = _profKeyMap[_profStateKey] || '0';
  // fallback: if profile doesn't have this key, try nearby
  const rec = prof.recs[key] || prof.recs['-2'] || prof.recs['0'];

  // Вікова мітка (показувати тільки якщо є зсув)
  const ageLine = (adj.gShift !== 0 && adj.label)
    ? `<div style="margin-top:4px;font-size:11px;color:var(--faint)">${adj.label} | поправка G${adj.gShift > 0 ? '+'+adj.gShift : adj.gShift} → G_personal=${Geff.toFixed(1)}</div>`
    : '';

  el_.innerHTML = `<span style="font-weight:700;color:${prof.color}">${prof.label}:</span> ${rec}${ageLine}`
                + (_activeProfile === 'pilot' ? renderAviationSwxLine() : ''); // fp56-P11
}/* NR_FN_END 339 */

/* NR_FN_BEGIN 353 */function _renderSolarWindBadge(data){
  const box = document.getElementById('solarWindBadge');
  if(!box) return;
  if(!data || !isFinite(data.bz) || !isFinite(data.speed)){
    box.style.display = 'none';
    return;
  }
  // Раннє попередження: південний (від'ємний) Bz + швидкий вітер = ризик росте
  // ДО того, як Kp це покаже. Пороги — загальновживані в space weather com'юніті
  // (не наукова точна межа, орієнтовний рівень).
  let level, color, note;
  if (data.bz <= -10 && data.speed >= 500) {
    level = 'ВИСОКИЙ'; color = '#ff6b6b';
    note = 'Південний Bz + швидкий вітер — умови сприятливі для бурі найближчими годинами, ще ДО зростання Kp.';
  } else if (data.bz <= -5 || data.speed >= 500) {
    level = 'ПОМІТНИЙ'; color = '#ffb347';
    note = 'Один із факторів (південний Bz або швидкий вітер) підвищений — варто стежити.';
  } else {
    level = 'НИЗЬКИЙ'; color = '#9bd49e';
    note = 'IMF і швидкість вітру в спокійному діапазоні.';
  }
  const minsAgo = data.time ? Math.round((Date.now() - new Date(data.time.replace(' ','T')+'Z').getTime())/60000) : null;
  box.style.display = 'block';
  box.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid ${color}55;border-radius:8px;background:${color}10;font-size:11px">
      <span>🌊</span>
      <span style="font-weight:700;color:${color}">${level}</span>
      <span style="color:var(--dim)">Bz ${data.bz>=0?'+':''}${data.bz.toFixed(1)}nT · вітер ${Math.round(data.speed)}км/с${minsAgo!=null && minsAgo<60 ? ' · '+minsAgo+'хв тому' : ''}</span>
      <span class="hint" tabindex="0" style="cursor:help;color:var(--faint);border:1px solid var(--faint);border-radius:50%;width:11px;height:11px;display:inline-flex;align-items:center;justify-content:center;font-size:7px;font-style:normal;margin-left:auto;flex:0 0 auto">і<span class="hint-pop">${_escHtml(note)}<br><br>Bz — напрям міжпланетного магнітного поля (супутник DSCOVR, точка L1). Південний (від'ємний) Bz "відкриває" магнітосферу Землі для сонячного вітру — це попереджає про бурю за 15-60хв ДО того, як Kp відреагує (Kp — ретроспективний 3-год індекс, не прогноз).<br><span style="opacity:.6;font-size:10px">Джерело: NOAA SWPC DSCOVR real-time. Довідковий рівень, не точна наукова межа.</span></span></span>
    </div>`;
}/* NR_FN_END 353 */

/* NR_FN_BEGIN 356 */function _renderNoaaAlertBanner(events){
  const box = document.getElementById('noaaAlertBanner');
  if (!box) return;
  const cutoff = Date.now() - 48*3600*1000;
  const recent = (events || [])
    .filter(e => e.issued && new Date(e.issued).getTime() >= cutoff)
    .filter(e => e.type !== 'other') // 'other' занадто шумний для банера
    .sort((a,b) => new Date(b.issued) - new Date(a.issued));
  if (!recent.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
  const top = recent[0];
  const meta = _NOAA_LEVEL_STYLE[top.type] || _NOAA_LEVEL_STYLE.other;
  let color = _noaaSeverityColor(top.level);
  const hoursAgo = Math.round((Date.now() - new Date(top.issued).getTime()) / 3600000);
  // v88.9.07-fp188: подія 40+г тому виглядала як ПОТОЧНА буря (Kyrylo: "чому +,
  // коли сьогодні буря" — а бурі вже не було, Kp=2.0). Якщо сповіщення старе
  // (≥6г) і поточний Kp < 5 — явно кажемо, що буря не активна зараз.
  const _kpNowB = (window.__uiState && isFinite(window.__uiState.kpNow)) ? window.__uiState.kpNow : NaN;
  const _isAged = hoursAgo >= 6;
  const _isHistorical = _isAged && isFinite(_kpNowB) && _kpNowB < 5;
  // An old bulletin must never look like a live status while Kp is still loading.
  if (_isAged) color = '#9bb1dc';
  const _notActiveNote = _isHistorical
    ? `<div style="margin-top:3px;font-size:11px;color:#9bd49e"><strong>Не активна зараз:</strong> Kp=${_kpNowB.toFixed(1)}. Це історичний бюлетень про подію ${hoursAgo}г тому.</div>`
    : _isAged
      ? `<div style="margin-top:3px;font-size:11px;color:var(--dim)">Поточний статус визначається окремо за live Kp у рядку нижче.</div>`
      : '';
  const moreCount = recent.length - 1;
  box.style.display = 'block';
  const plainExplain = _noaaPlainExplain(top.type, top.level);
  box.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid ${color}55;border-radius:10px;background:${color}14">
      <span style="font-size:18px;line-height:1">${meta.icon}</span>
      <div style="flex:1">
        <div style="font-weight:700;color:${color}">${_isHistorical ? 'Історична подія NOAA' : _isAged ? `Бюлетень NOAA ${hoursAgo}г тому` : meta.label}${top.level ? ' '+top.level : ''} — ${_isHistorical ? 'не активна зараз' : _isAged ? 'опис події, не поточний статус' : plainExplain}</div>
        <div style="margin-top:2px;font-size:11px;color:var(--dim)">Офіційне сповіщення NOAA (не прогноз G-Index) · ${hoursAgo<1?'щойно':hoursAgo+'г тому'}${moreCount>0 ? ' · ще '+moreCount+' поді'+(moreCount===1?'я':'й')+' за 48г' : ''}</div>${_notActiveNote}
        <div style="margin-top:2px;font-size:9px;color:var(--faint)">Код бюлетеня NOAA: ${_escHtml(top.summary || '')}</div>
      </div>
    </div>`;
}/* NR_FN_END 356 */
