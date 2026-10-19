(function(root){
 'use strict';
 const words={
 uk:['Панчанга вашого місця','На схід Сонця','Дата','Змінити місце','Спочатку визначте місце в налаштуваннях нижче.','Тітхі','до','Накшатра','Йога','Карана','Для цієї місцевої дати немає сходу Сонця.','Розрахунок недоступний. Перевірте дату та місце.','Рушії розходяться біля межі тітхі. Показано номер astronomy-engine; назву не поєднуємо.','Тітхі на сході — характеристика дня, а не правило визначення свят. Цей блок не змінює бал прогнозу.','Схід','Сидеричні складові · аянамша Лахірі','Місце збережене на пристрої','Тітхі на світанку','Карана залежить від тітхі, тому біля межі не показується.'],
 en:['Panchanga for your location','At sunrise','Date','Change location','Set your location in the settings below first.','Tithi','until','Nakshatra','Yoga','Karana','There is no sunrise on this local date.','Calculation unavailable. Check the date and location.','The engines disagree near a tithi boundary. The number is from astronomy-engine; labels are not combined.','Sunrise tithi describes the day; it does not determine festivals. This section does not change the forecast score.','Sunrise','Sidereal components · Lahiri ayanamsha','Location saved on this device','Tithi at sunrise','Karana depends on the tithi, so it is not shown near the boundary.'],
 es:['Panchanga de tu ubicación','Al amanecer','Fecha','Cambiar ubicación','Primero configura tu ubicación en los ajustes de abajo.','Tithi','hasta','Nakshatra','Yoga','Karana','No hay amanecer en esta fecha local.','Cálculo no disponible. Comprueba la fecha y la ubicación.','Los motores difieren cerca de un límite de tithi. El número procede de astronomy-engine; no se combinan las etiquetas.','El tithi al amanecer describe el día; no determina las festividades. Esta sección no cambia la puntuación del pronóstico.','Amanecer','Componentes siderales · ayanamsha Lahiri','Ubicación guardada en este dispositivo','Tithi al amanecer','El karana depende del tithi; cerca del límite no se muestra.'],
 fr:['Panchanga de votre lieu','Au lever du soleil','Date','Changer de lieu','Définissez d’abord votre lieu dans les réglages ci-dessous.','Tithi','jusqu’à','Nakshatra','Yoga','Karana','Il n’y a pas de lever du soleil à cette date locale.','Calcul indisponible. Vérifiez la date et le lieu.','Les moteurs divergent près d’une limite de tithi. Le numéro vient d’astronomy-engine ; les noms ne sont pas combinés.','Le tithi au lever du soleil décrit le jour ; il ne détermine pas les fêtes. Cette section ne modifie pas le score prévisionnel.','Lever du soleil','Composantes sidérales · ayanamsha Lahiri','Lieu enregistré sur cet appareil','Tithi au lever du soleil','Le karana dépend du tithi ; il n’est pas affiché près de la limite.']};
 let selected=null,box,lastKey='',savedObserver;
 const key='gindex_local_context_v1';
 function location(){try{const x=JSON.parse(localStorage.getItem(key));return root.NRLocalContext?.valid(x)&&x.zone.trim()?x:null;}catch(_){return null;}}
 function render(force=false){
  if(!box)return;
  const lang=root.NRLocale?.language||'uk',w=words[lang]||words.uk,x=location();
  const date=selected??(x?root.SkyRhythmCivil.civilDay(new Date(),x.zone):'');
  const signature=JSON.stringify([lang,date,x]);if(!force&&lastKey===signature)return;lastKey=signature;
  box.querySelector('h2').textContent=w[0];box.querySelector('[data-eyebrow]').textContent=w[1];
  box.querySelector('[data-date-label]').textContent=w[2];box.querySelector('button').textContent=w[3];
  box.querySelector('input').value=date;box.querySelector('input').disabled=!x;
  box.querySelector('[data-foot]').textContent=w[13];
  const current=document.getElementById('nrPanchNow');
  if(current){let note=document.getElementById('srCurrentTimeNote');if(!note){note=document.createElement('p');note.id='srCurrentTimeNote';note.setAttribute('translate','no');current.before(note);}note.textContent=({uk:'Нижче — календарні складові на поточний момент; час показано в часовому поясі пристрою. Це інший момент, ніж схід Сонця обраної дати вище.',en:'Below: calendar components at the current instant, with times in the device time zone. This is a different instant from sunrise on the date selected above.',es:'Abajo: componentes del calendario en el momento actual, con horas de la zona del dispositivo. Es un momento distinto del amanecer de la fecha seleccionada arriba.',fr:'Ci-dessous : composantes du calendrier à l’instant présent, avec les heures du fuseau de l’appareil. Cet instant diffère du lever du soleil à la date sélectionnée ci-dessus.'})[lang]||'';}
  box.querySelector('[data-place]').textContent=x?w[16]+' · '+x.zone:w[4];
  const out=box.querySelector('[role=status]');out.replaceChildren();
  box.querySelector('.sr-civil-orbit').hidden=true;
  const intraday=box.querySelector('[data-intraday]');intraday.hidden=true;intraday.replaceChildren();
  if(!x){out.dataset.status='missing_location';return;}
  try{
   if(!date)throw new Error('BAD_DATE');
   const r=root.SkyRhythmPanchanga.resolve({...x,date});out.dataset.status=r.status;
   const dayFormatter=new Intl.DateTimeFormat(lang,{timeZone:x.zone,day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
   const dayClock=d=>dayFormatter.format(d);
   try{
   const timeline=root.SkyRhythmCivil.dayIntervals(date,x.zone);
   const labels=({uk:['Тітхі протягом цієї доби','Астрономічні інтервали, не дати релігійних свят.','Purnima · 15','Amavasya · 30'],en:['Tithis during this day','Astronomical intervals, not religious observance dates.','Purnima · 15','Amavasya · 30'],es:['Tithis durante este día','Intervalos astronómicos, no fechas de celebraciones religiosas.','Purnima · 15','Amavasya · 30'],fr:['Tithis au cours de cette journée','Intervalles astronomiques, pas des dates de fêtes religieuses.','Purnima · 15','Amavasya · 30']})[lang]||[];
   const summary=document.createElement('summary');summary.textContent=labels[0]+' · '+timeline.segments.map(s=>s.tithi).join(' → ');summary.style.cssText='min-height:44px;line-height:1.5;padding:10px 0;cursor:pointer';intraday.append(summary);
   for(const segment of timeline.segments){const p=document.createElement('p');p.textContent=(segment.tithi===15?labels[2]:segment.tithi===30?labels[3]:w[5]+' '+segment.tithi)+' · '+dayClock(segment.start)+' — '+dayClock(segment.end);intraday.append(p);}
   const scope=document.createElement('small');scope.textContent=labels[1];intraday.append(scope);intraday.hidden=false;
   }catch(_){intraday.hidden=true;intraday.replaceChildren();}
   if(!r.sunrise){out.textContent=w[10];}
   const precise=r.status==='conflicting';
   const clockFormatter=precise?new Intl.DateTimeFormat(lang,{timeZone:x.zone,day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}):dayFormatter;
   const clock=d=>clockFormatter.format(d);
   const add=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;out.append(el);return el;};
   if(r.status==='conflicting')add('p',w[12]);
   if(r.sunrise){
   add('p',w[14]+' · '+clock(r.sunrise));
   add('strong',w[17]+' '+r.tithi+'/30').className='sr-civil-tithi';
   if(r.end)add('p',w[6]+' '+clock(r.end));
   }
   if(root.SkyRhythmOwnCalendar){
    const own=root.SkyRhythmOwnCalendar.day({...x,date});
    const words=({uk:['Власний астрономічний календар','Розраховано для обраного місця без PDF. Це не дати релігійних свят.','Зберегти місяць · JSON','Схід Сонця','Захід Сонця','Схід Місяця','Захід Місяця','Сонячний полудень','Молодик','Перша чверть','Повня','Остання чверть'],en:['Own astronomical calendar','Calculated for the selected place without a PDF. These are not religious observance dates.','Save month · JSON','Sunrise','Sunset','Moonrise','Moonset','Solar noon','New moon','First quarter','Full moon','Last quarter'],es:['Calendario astronómico propio','Calculado para el lugar elegido sin PDF. No son fechas de festividades religiosas.','Guardar mes · JSON','Salida del Sol','Puesta del Sol','Salida de la Luna','Puesta de la Luna','Mediodía solar','Luna nueva','Cuarto creciente','Luna llena','Cuarto menguante'],fr:['Calendrier astronomique propre','Calculé pour le lieu choisi sans PDF. Ce ne sont pas des dates de fêtes religieuses.','Enregistrer le mois · JSON','Lever du Soleil','Coucher du Soleil','Lever de la Lune','Coucher de la Lune','Midi solaire','Nouvelle lune','Premier quartier','Pleine lune','Dernier quartier']})[lang];
    const panel=add('details','');panel.className='sr-own-calendar';const summary=document.createElement('summary');summary.textContent=words[0];summary.style.minHeight='44px';panel.append(summary);const note=document.createElement('p');note.textContent=words[1];panel.append(note);
    const kinds=['sunrise','sunset','moonrise','moonset','solar_transit','new_moon','first_quarter','full_moon','last_quarter'];
    for(const event of own.events){const line=document.createElement('p');line.textContent=words[3+kinds.indexOf(event.kind)]+' · '+clock(new Date(event.at));panel.append(line);}
    const save=document.createElement('button');save.type='button';save.className='nr-btn secondary';save.textContent=words[2];save.onclick=()=>{
     let url;
     try{
      const [year,month]=date.split('-').map(Number);
      const doc=root.SkyRhythmOwnCalendar.month({...x,year,month});
      url=URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download='SkyRhythm-calendar-'+date.slice(0,7)+'.json';a.hidden=true;
      panel.append(a);try{a.click();}finally{a.remove();}
     }catch(error){
      const messages={uk:'Не вдалося зберегти календар. Перевірте налаштування місця та дозвіл браузера на завантаження.',en:'Could not save the calendar. Check your location settings and browser download permissions.',es:'No se pudo guardar el calendario. Comprueba la ubicación y los permisos de descarga.',fr:'Impossible d’enregistrer le calendrier. Vérifiez le lieu et les autorisations de téléchargement.'};
      let notice=panel.querySelector('[data-calendar-export-error]');if(!notice){notice=document.createElement('p');notice.dataset.calendarExportError='';notice.setAttribute('role','alert');panel.append(notice);}
      notice.textContent=messages[lang]||messages.uk;
     }finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),1000);}
    };panel.append(save);
   }
   root.SRResearchObservances?.render(out,date,lang);
   if(!r.sunrise)return;
   const dl=add('dl','');
   const entries=[[w[7],r.components.nakshatra.name],[w[8],r.components.yoga.name],[w[9],r.status==='conflicting'?'—':(r.components.karana.nameEn||r.components.karana.name)]];
   for(const [label,value] of entries){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);}
   if(r.status==='conflicting')add('p',w[18]).className='sr-civil-note';
   const reg=root.SkyRhythmApprovedObservances,recs=root.SR_TANITA_OBSERVANCES;
   if(reg?.sourceLabelsFor&&Array.isArray(recs)){
    const ev=reg.sourceLabelsFor(date,recs);
    if(ev.length){const L=({uk:['Позначки джерела · календар Таніти для Києва','Це довідковий календар для Києва, не для визначеного місця. Правила свят і сторінки первинного PDF не підтверджені.','Збіг на сусідню дату, не підтвердження цієї доби.','Збіг тітхі в цю добу не підтверджує релігійне свято.','Походження позначки','Довідковий календар для Києва, не для визначеного місця. Позначки звірено зі сторінкою первинного PDF; правила свят обраної традиції не підтверджені.'],en:['Source labels · Tanita calendar for Kyiv','Reference calendar for Kyiv, not your detected location. Religious rules and original PDF pages are unverified.','Nearby-date match, not confirmation for this day.','A tithi match on this day does not verify a religious observance.','Label provenance','Reference calendar for Kyiv, not your detected location. Labels checked against the original PDF page; the religious rules of a tradition are not verified.'],es:['Etiquetas de la fuente · calendario de Tanita para Kyiv','Calendario de referencia para Kyiv, no para tu ubicación. Reglas religiosas y páginas del PDF original sin verificar.','Coincidencia en una fecha cercana, no confirmación de este día.','La coincidencia de tithi no verifica una festividad religiosa.','Procedencia','Calendario de referencia para Kyiv, no para tu ubicación. Etiquetas cotejadas con la página del PDF original; las reglas religiosas de una tradición no están verificadas.'],fr:['Indications de la source · calendrier de Tanita pour Kyiv','Calendrier de référence pour Kyiv, pas pour votre position. Règles religieuses et pages du PDF original non vérifiées.','Correspondance à une date voisine, pas une confirmation pour ce jour.','Une correspondance de tithi ne confirme pas une fête religieuse.','Provenance','Calendrier de référence pour Kyiv, pas pour votre position. Indications vérifiées sur la page du PDF original ; les règles religieuses d’une tradition ne sont pas vérifiées.']})[lang];
     add('p',L[0]).className='sr-civil-observance';add('small',ev.every(e=>e.review_status==='source_label_pdf_page_verified')?L[5]:L[1]);
     for(const e of ev){add('p',e.title);add('small',L[['sunrise','during_day','sunset','moonrise','night'].includes(e.astro_check)?3:2]);const detail=add('details','');const summary=document.createElement('summary');summary.textContent=L[4];summary.style.minHeight='44px';detail.append(summary);const text=document.createElement('p');text.textContent=e.provenance.original_tag+' · '+(e.provenance.pdf_page?e.provenance.primary_pdf+', p. '+e.provenance.pdf_page+' · ':'')+e.provenance.artifact+' #'+e.provenance.json_pointer+' · SHA-256 '+e.provenance.sha256;text.style.overflowWrap='anywhere';text.setAttribute('translate','no');detail.append(text);}
    }
   }
   add('small',w[15]);
   const orbit=box.querySelector('.sr-civil-orbit');orbit.hidden=false;root.SkyRhythmCivilScene?.(orbit,r.angle,r.tithi);
  }catch(_){out.dataset.status='error';out.textContent=w[11];}
 }
 function mount(){
  const host=document.getElementById('nrRoute-panch');if(!host)return false;
  box=document.createElement('section');box.id='srCivilPanel';box.className='nr-panch-section sr-civil-panel';
  box.innerHTML='<span data-eyebrow></span><h2></h2><p data-place></p><div class="sr-civil-controls"><label><span data-date-label></span><input type="date"></label><button type="button" class="nr-btn secondary"></button></div><div class="sr-civil-orbit" aria-hidden="true" hidden><i></i></div><div role="status" aria-live="polite"></div><details data-intraday hidden></details><p data-foot></p>';
  host.prepend(box);host.classList.add('sr-civil-enabled');
  box.querySelector('input').addEventListener('input',e=>{selected=e.target.value;lastKey='';render(true);});
  box.querySelector('button').onclick=()=>{const target=document.getElementById('nrLocalContext');if(!target)return;const details=target.querySelector('details');if(details)details.open=true;target.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});target.querySelector('input')?.focus({preventScroll:true});};
  render();return true;
 }
 function start(){
  const observer=new MutationObserver(()=>{if(!box)mount();const context=document.getElementById('nrLocalContext');if(context&&!savedObserver){savedObserver=new MutationObserver(()=>render());savedObserver.observe(context,{childList:true,subtree:true,characterData:true});}if(box&&savedObserver)observer.disconnect();});
  observer.observe(document.body,{childList:true,subtree:true});mount();
  root.addEventListener('focus',()=>render());root.addEventListener('nr:locale',()=>render(true));root.addEventListener('storage',e=>{if(e.key===key||e.key===null)render(true);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})(window);
