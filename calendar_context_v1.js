(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.NRCalendarContext=api;
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const version='venus-context-v1';
 const zone='Europe/Kyiv';
 const dayFmt=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});
 const timeFmt=new Intl.DateTimeFormat('uk-UA',{timeZone:zone,day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const validDay=ds=>typeof ds==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(ds)&&Number.isFinite(Date.parse(ds))&&new Date(ds).toISOString().slice(0,10)===ds;
 const tips={
  love:['Обговоріть очікування, межі та спільні плани.','До давніх питань повертайтеся за взаємною згодою; рішення про стосунки приймайте за реальними обставинами.'],
  money:['Перегляньте бюджет, підписки й заплановані покупки.','Перед дорогою покупкою звірте потребу, повну ціну та умови повернення.'],
  business:['Уточніть умови домовленостей і незавершені завдання.','Перед новим зобов’язанням перевірте строки, ресурси та відповідальність сторін.'],
  general:['Обговоріть спільні плани й незавершені питання без поспіху.','Перегляньте бюджет та умови запланованих покупок.','Для гардероба чи оселі спочатку оцініть, що вже маєте і що справді потрібно.']
 };
 function context(ephemeris,ds,now=Date.now()){
  const unknown={version,state:'unknown',date:ds,period:null,scoreAdjustment:0};
  if(!validDay(ds)||!Number.isFinite(now)||!Array.isArray(ephemeris?.coverage)||!Array.isArray(ephemeris?.periods?.Venus))return unknown;
  const [lo,hi]=ephemeris.coverage.map(Date.parse);
  if(!Number.isFinite(lo)||!Number.isFinite(hi)||lo>=hi||ds<dayFmt.format(lo)||ds>=dayFmt.format(hi))return unknown;
  // A partially covered first Kyiv day is not evidence for the whole day.
  if(ds===dayFmt.format(lo)&&new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(lo)!=='00:00:00')return unknown;
  const periods=ephemeris.periods.Venus.map(p=>Array.isArray(p)?p.map(Date.parse):[]);
  if(periods.some(p=>p.length!==2||!p.every(Number.isFinite)||p[0]>=p[1]||p[0]<lo||p[1]>hi))return unknown;
  periods.sort((a,b)=>a[0]-b[0]);
  const active=periods.find(([s,e])=>dayFmt.format(s)<=ds&&dayFmt.format(e-1)>=ds);
  const next=periods.find(([s])=>dayFmt.format(s)>ds&&Date.parse(dayFmt.format(s))-Date.parse(ds)<=14*86400000);
  const p=active||next;
  if(!p)return {...unknown,state:'none'};
  const [start,end]=p,startDay=dayFmt.format(start),endDay=dayFmt.format(end);
  return {...unknown,state:active?'period':'upcoming',period:{start,end,startDay,endDay},
   transition:ds===startDay?'starts':ds===endDay?'ends':null,
   current:ds===dayFmt.format(now)?(now<start?'before':now>=end?'after':'active'):null};
 }
 function markup(ephemeris,ds,category='general',now=Date.now()){
  if(!Object.hasOwn(tips,category))return '';
  const c=context(ephemeris,ds,now);
  const common='Календарний контекст · Венера';
  if(c.state==='unknown')return `<section class="nr-calendar-context" data-context-state="unknown"><h3>${common}</h3><p>Дані для цієї дати не підтверджені. Поза покриттям календаря стан Венери не визначаємо.</p></section>`;
  if(c.state==='none')return '';
  const p=c.period,fmt=t=>timeFmt.format(t);
  const headline=c.state==='upcoming'?'Попереду ретроградний період':c.transition==='starts'?'Цього дня починається ретроградний період':c.transition==='ends'?'Цього дня завершується ретроградний період':'Дата в ретроградному періоді';
  const current=c.current==='before'?'Зараз період ще не почався.':c.current==='after'?'Зараз період уже завершився.':c.current==='active'?'Зараз період триває.':'';
  return `<section class="nr-calendar-context" data-context-state="${c.state}" data-context-date="${esc(ds)}" data-context-version="${version}"><h3>${common}</h3><p><strong>${headline}.</strong> ${current}</p><p>${esc(fmt(p.start))} — ${esc(fmt(p.end))} · Київ. Час приблизний до хвилини.</p><p>Традиційна тема: перегляд стосунків, цінностей і покупок. Цей блок не додає бала й не змінює рішення дня.</p><details><summary>Практичні підказки та джерело</summary><p>За бажанням використайте як привід для перевірки планів:</p><ul>${tips[category].map(t=>`<li>${esc(t)}</li>`).join('')}</ul><p>Це не підстава переносити весілля, відмовлятися від потрібної покупки чи змінювати медичні рішення.</p><p>Дати: наявний календар станцій Swiss Ephemeris. Астрологічне тлумачення — окремий традиційний контекст; його точність щодо життєвих подій у нашій системі не підтверджено.</p></details></section>`;
 }
 function render(host,ephemeris,ds,category='general',now=Date.now()){
  if(!host)return;
  const html=markup(ephemeris,ds,category,now),open=host.querySelector('details')?.open;
  if(host.__contextMarkup!==html){host.innerHTML=html;host.__contextMarkup=html;if(open&&host.querySelector('details'))host.querySelector('details').open=true;}
  host.hidden=!html;
 }
 return {version,context,markup,render};
});
