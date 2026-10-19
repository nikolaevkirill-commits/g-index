(function(root){'use strict';
const copy={
 uk:['Чому обрано дату свята','Дослідні правила; бал прогнозу не змінюється.','Найближча подія для обраного місця','Розрахувати','Дата пошуку','Немає достатніх даних. Задайте місце в налаштуваннях.','Методики обирають різні дати','Дата чутлива до конвенції','Недостатньо доказів','Перевірене рішення','За опублікованим календарем Drik','Докладний протокол · UTC та місцевий час','Відстань до межі не є похибкою. Класичні правила та фізична невизначеність не підтверджені.','Дата не визначена','Зберегти рішення · JSON','Обґрунтовані сценарії','Тітхі','Дослідний розрахунок','Архівні випадки мають власні координати; це не ваше поточне місце.','Схід Сонця','Схід Місяця','Інтервал Nishita','Причина','Джерело правила','Часове розділення, с','Сценарій','Розбіжність із календарем джерела'],
 en:['Why this festival date','Research rules; the forecast score is unchanged.','Next event for the selected location','Calculate','Search date','Insufficient data. Set your location in settings.','Rules select different dates','Date depends on convention','Insufficient evidence','Verified decision','Published Drik calendar','Detailed trace · UTC and local time','Distance to a boundary is not an error estimate. Classical rules and physical uncertainty remain unverified.','Date unresolved','Save decision · JSON','Documented scenarios','Tithi','Research calculation','Archived cases use their own coordinates, not your current location.','Sunrise','Moonrise','Nishita interval','Reason','Rule source','Time separation, s','Scenario','Disagreement with source calendar'],
 es:['Por qué se eligió esta fecha','Reglas de investigación; la puntuación no cambia.','Próximo evento para la ubicación elegida','Calcular','Fecha de búsqueda','Datos insuficientes. Configura tu ubicación.','Las reglas eligen fechas distintas','Fecha sensible a la convención','Evidencia insuficiente','Decisión verificada','Calendario publicado de Drik','Registro detallado · UTC y hora local','La distancia al límite no es un error estimado. Las reglas clásicas y la incertidumbre física no están verificadas.','Fecha sin resolver','Guardar decisión · JSON','Escenarios documentados','Tithi','Cálculo de investigación','Los casos archivados usan sus propias coordenadas, no tu ubicación actual.','Salida del Sol','Salida de la Luna','Intervalo Nishita','Motivo','Fuente de la regla','Separación temporal, s','Escenario','Discrepancia con el calendario fuente'],
 fr:['Pourquoi cette date de fête','Règles de recherche ; le score reste inchangé.','Prochain événement pour le lieu choisi','Calculer','Date de recherche','Données insuffisantes. Définissez votre lieu.','Les règles choisissent des dates différentes','Date sensible à la convention','Preuves insuffisantes','Décision vérifiée','Calendrier publié de Drik','Détail du calcul · UTC et heure locale','La distance à une limite n’est pas une estimation d’erreur. Les règles classiques et l’incertitude physique restent non vérifiées.','Date indéterminée','Enregistrer · JSON','Scénarios documentés','Tithi','Calcul de recherche','Les cas archivés utilisent leurs propres coordonnées, pas votre lieu actuel.','Lever du Soleil','Lever de la Lune','Intervalle Nishita','Motif','Source de la règle','Séparation temporelle, s','Scénario','Désaccord avec le calendrier source']};
const boxes=new Map();
const names={'shastra-sankashti':'Shastra Panchangam · Sankashti','panchangtime-sankashti':'PanchangTime · Sankashti','nava-sankashti':'Nava Panchangam · Sankashti','panchangtime-monthly':'PanchangTime · Masik Shivaratri','shastra-monthly':'Shastra Panchangam · Masik Shivaratri'};
const reasons={
 single_anchor:['Тітхі охоплює один потрібний момент або інтервал.','The tithi covers one qualifying anchor.','El tithi cubre un único momento válido.','Le tithi couvre un seul repère admissible.'],
 kshaya_sunrise:['Жоден потрібний момент не охоплений; кандидат обрано за тітхі на сході Сонця.','No anchor qualifies; the candidate uses tithi at sunrise.','Ningún momento es válido; se usa el tithi al amanecer.','Aucun repère admissible ; le candidat utilise le tithi au lever du Soleil.'],
 kshaya_prior_moonrise:['Тітхі між двома сходами Місяця; обрано день попереднього сходу.','The tithi lies between moonrises; the preceding moonrise day is selected.','El tithi está entre dos salidas lunares; se elige el día anterior.','Le tithi est entre deux levers lunaires ; le jour précédent est choisi.'],
 kshaya_unresolved:['Джерело не визначає правило за відсутності потрібного моменту.','The source does not specify a missing-anchor rule.','La fuente no define una regla sin momento válido.','La source ne définit pas de règle sans repère admissible.'],
 vriddhi_unresolved:['Джерело не визначає вибір між двома придатними днями.','The source does not specify a two-day tie-break.','La fuente no define el desempate entre dos días.','La source ne définit pas le départage entre deux jours.'],
 vriddhi_first:['Два придатні моменти; обрано перший.','Two qualifying anchors; choose the first.','Dos momentos válidos; se elige el primero.','Deux repères admissibles ; choisir le premier.'],
 vriddhi_last:['Два придатні інтервали; обрано пізніший.','Two qualifying intervals; choose the later.','Dos intervalos válidos; se elige el posterior.','Deux intervalles admissibles ; choisir le dernier.'],
 vriddhi_greater:['Обрано більшу тривалість покриття Nishita; за рівності — ранішу ніч.','Greater Nishita coverage; an equal span selects the earlier night.','Mayor cobertura de Nishita; igualdad: noche anterior.','Couverture de Nishita supérieure ; égalité : nuit précédente.'],
 vriddhi_ghatika:['Обрано більше покриття першої гхатіки після сходу Місяця.','Greater coverage of the first ghatika after moonrise.','Mayor cobertura de la primera ghatika tras la salida lunar.','Couverture supérieure de la première ghatika après le lever lunaire.'],
 ghatika_tie_not_specified:['Покриття гхатіки однакове; джерело не визначає вибір.','Equal ghatika coverage; the source gives no tie-break.','Cobertura igual; la fuente no define el desempate.','Couverture égale ; aucun départage dans la source.'],
 missing_anchor:['Не всі потрібні астрономічні події доступні.','Required astronomical events are missing.','Faltan eventos astronómicos necesarios.','Des événements astronomiques nécessaires manquent.'],
 sunrise_fallback_ambiguous:['Немає єдиного дня тітхі на сході Сонця.','No unique sunrise day.','No hay un día de amanecer único.','Aucun jour unique au lever du Soleil.'],
 kshaya_not_bracketed:['Немає обох сходів Місяця для обмеження інтервалу.','Both bracketing moonrises are unavailable.','Faltan las salidas lunares que delimitan el intervalo.','Les levers lunaires encadrant l’intervalle manquent.']};
function language(){return root.NRLocale?.language||'uk';}
function add(host,tag,text){const n=document.createElement(tag);n.textContent=text;host.append(n);return n;}
function loc(){try{const x=JSON.parse(localStorage.getItem('gindex_local_context_v1'));return root.NRLocalContext?.valid(x)?x:null;}catch(_){return null;}}
function render(box){
 const w=copy[language()]||copy.uk,out=box.querySelector('[data-result]');out.replaceChildren();
 box.querySelector('summary').textContent=w[0];box.querySelector('[data-note]').textContent=w[1];box.querySelector('[data-label]').textContent=w[4];box.querySelector('[data-run]').textContent=w[3];box.querySelector('[data-cases] option').textContent=w[2];
 const id=box.querySelector('[data-cases]').value;let item;
 try{
  if(id==='live'){
   const place=loc();if(!place)throw Error('MISSING_LOCATION');
   const event=box.querySelector('[data-event]').value,input=root.SRFestivalAstronomy.build({...place,date:box.querySelector('input').value},event);
   item={input,rule_ids:event==='sankashti'?['panchangtime-sankashti','nava-sankashti','shastra-sankashti']:['panchangtime-monthly','shastra-monthly'],scenarios:[]};
  }else item=root.SRFestivalEvidence.cases.find(c=>c.id===id);
  const result=root.SRFestivalDecision.compare(item.input,item.rule_ids,item.scenarios),place=item.input.place;
  box._decision={input:item.input,reference:item.reference||null,result};out.dataset.status=result.status;
  add(out,'p',(place.name?place.name+' · ':'')+place.zone+' · '+place.lat.toFixed(6)+', '+place.lon.toFixed(6));
  if(id!=='live')add(out,'small',w[18]);
  const statuses={CONFLICTING_RULES:w[6],BOUNDARY_SENSITIVE:w[7],INSUFFICIENT_EVIDENCE:w[8],VERIFIED:w[9]};
  add(out,'strong',(result.flags.length?result.flags:['VERIFIED']).map(k=>statuses[k]).join(' · '));
  if(item.reference){add(out,'p',w[10]+': '+item.reference.published_dates.join(', '));if(result.decisions.some(d=>d.selected_date&&!item.reference.published_dates.includes(d.selected_date)))add(out,'p',w[26]);}
  const fmt=t=>new Intl.DateTimeFormat(language(),{timeZone:place.zone,dateStyle:'short',timeStyle:'long'}).format(t)+' · '+new Date(t).toISOString();
  for(const d of result.decisions){
   const row=add(out,'div','');row.dataset.rule=d.rule_id;row.className='sr-festival-rule';
   add(row,'p',w[17]+' · '+(names[d.rule_id]||d.rule_id)+' → '+(d.selected_date||w[13]));
   const a=add(row,'a',w[23]+' · '+d.source_id);a.href=d.source_url;a.target='_blank';a.rel='noopener noreferrer';
   const detail=add(row,'details','');add(detail,'summary',w[11]);
   add(detail,'p',d.rule_id+' v'+d.rule_version+' · '+d.status);
   for(const e of d.rule_evidence||[]){const labels={uk:['Книжкове джерело','сторінка PDF','друкована','Підтверджує лише тітхі та схід Місяця; вибір між днями тут не визначено.','Підтверджує назву й тітхі щомісячного свята; правило вибору ночі тут не визначено.'],en:['Book source','PDF page','printed','Supports only the tithi and moonrise anchor; no day tie-break in this passage.','Supports monthly festival identity and tithi only; no night-selection rule in this passage.'],es:['Fuente bibliográfica','página PDF','impresa','Confirma solo el tithi y la salida lunar; no define el desempate.','Confirma solo la fiesta mensual y su tithi; no define la elección de noche.'],fr:['Source bibliographique','page PDF','imprimée','Confirme seulement le tithi et le lever lunaire ; aucun départage dans ce passage.','Confirme seulement la fête mensuelle et son tithi ; aucun choix de nuit dans ce passage.']}[language()]||['Book source','PDF page','printed','Anchor only','Identity only'];add(detail,'p',labels[0]+': '+e.title+' · '+labels[1]+' '+e.pdf_page+' ('+labels[2]+' '+e.printed_page+'). '+labels[d.event==='sankashti'?3:4]);add(detail,'small','SHA256: '+e.file_sha256);}
   add(detail,'p',w[22]+': '+(reasons[d.reason]?.[['uk','en','es','fr'].indexOf(language())]||d.reason));
   add(detail,'p',w[16]+': '+fmt(d.tithi_interval.start)+' — '+fmt(d.tithi_interval.end));
   add(detail,'p',d.astronomy.engine+' · '+d.astronomy.convention);
   for(const day of d.days){add(detail,'h4',day.date);for(const [key,label] of [['sunrise',19],['moonrise',20]])add(detail,'p',w[label]+': '+(day[key]===null?'—':fmt(day[key])));add(detail,'p',w[21]+': '+(day.nishita?day.nishita.map(fmt).join(' — '):'—'));add(detail,'p',w[24]+': '+(day.anchor_minus_start_ms===null?'—':(day.anchor_minus_start_ms/1000).toFixed(3)));}
  }
  if(result.scenarios.length){const d=add(out,'details','');add(d,'summary',w[15]);for(const s of result.scenarios){add(d,'p',w[25]+': '+s.id);add(d,'p',s.rationale);for(const decision of s.decisions){add(d,'p',(names[decision.rule_id]||decision.rule_id)+' → '+(decision.selected_date||w[13]));add(d,'p',decision.astronomy.convention);for(const day of decision.days)add(d,'p',day.date+' · '+(decision.event==='sankashti'?(day.moonrise===null?'—':fmt(day.moonrise)):(day.nishita?day.nishita.map(fmt).join(' — '):'—')));}const a=add(d,'a',s.source_url);a.href=s.source_url;a.target='_blank';a.rel='noopener noreferrer';}}
  add(out,'p',w[12]);const save=add(out,'button',w[14]);save.type='button';save.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(box._decision,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='SkyRhythm-festival-decision.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 }catch(error){box._decision=null;out.dataset.status='INSUFFICIENT_EVIDENCE';add(out,'p',w[5]);add(out,'small',String(error.message));}
}
function mount(){
 for(const route of ['today','panch']){
  const host=document.getElementById('nrRoute-'+route);if(!host||boxes.has(route))continue;
  // Wait for the Today overview to finish wrapping legacy content.
  if(route==='today'&&!host.querySelector('.nr-overview'))continue;
  const box=document.createElement('details');box.className='sr-festival-decision';box.dataset.festivalRoute=route;box.setAttribute('translate','no');
  box.innerHTML='<summary></summary><p data-note></p><label><span data-label></span><input type="date"></label><select data-cases aria-label="Research case"><option value="live"></option></select><select data-event aria-label="Festival"><option value="sankashti">Sankashti Chaturthi</option><option value="masik_shivaratri">Masik Shivaratri</option></select><button type="button" data-run></button><div data-result role="status"></div>';
  for(const c of root.SRFestivalEvidence.cases){const o=add(box.querySelector('[data-cases]'),'option',c.input.place.name+' · '+c.id);o.value=c.id;}
  const place=loc();box.querySelector('input').value=root.SRFestivalDecision.civil(Date.now(),place?.zone||'Europe/Kyiv');
  box._liveDate=box.querySelector('input').value;box._liveEvent='sankashti';
  box.querySelector('[data-run]').onclick=()=>render(box);box.querySelector('[data-cases]').onchange=()=>{const id=box.querySelector('[data-cases]').value,live=id==='live';box.querySelector('input').disabled=!live;box.querySelector('[data-event]').disabled=!live;if(live){box.querySelector('input').value=box._liveDate;box.querySelector('[data-event]').value=box._liveEvent;}else{const c=root.SRFestivalEvidence.cases.find(c=>c.id===id);box.querySelector('input').value=root.SRFestivalDecision.civil(c.input.start,c.input.place.zone);box.querySelector('[data-event]').value=c.input.event;}render(box);};
  box.querySelector('[data-event]').onchange=()=>{box._liveEvent=box.querySelector('[data-event]').value;render(box);};box.querySelector('input').onchange=()=>{box._liveDate=box.querySelector('input').value;render(box);};
  box.addEventListener('toggle',()=>{if(box.open&&!box._decision)render(box);});
  host.append(box);boxes.set(route,box);
  const w=copy[language()]||copy.uk;box.querySelector('summary').textContent=w[0];box.querySelector('[data-note]').textContent=w[1];box.querySelector('[data-label]').textContent=w[4];box.querySelector('[data-run]').textContent=w[3];box.querySelector('[data-cases] option').textContent=w[2];
 }
}
function start(){mount();const observer=new MutationObserver(()=>{mount();if(boxes.size===2)observer.disconnect();});if(boxes.size<2)observer.observe(document.body,{childList:true,subtree:true});root.addEventListener('nr:locale',()=>boxes.forEach(render));root.addEventListener('storage',e=>{if(e.key==='gindex_local_context_v1')boxes.forEach(render);});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})(window);
