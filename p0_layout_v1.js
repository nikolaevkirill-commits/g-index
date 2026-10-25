/* Presentation only. All scores remain owned by NRConsumerAuthority.resolveFinal. */
(function(){'use strict';
const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
function noonKyiv(ds){let d=new Date(ds+'T12:00:00Z');const h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Kyiv',hour:'2-digit',hourCycle:'h23'}).format(d));return new Date(d.getTime()+(12-h)*3600000);}
function moon(at){const {k,waxing}=SkyMoon.moonIllumination(at),r=35,c=40,rx=r*Math.abs(2*k-1),limb=waxing?1:0,term=k>=.5?(waxing?1:0):(waxing?0:1),pct=Math.round(k*100);return `<svg viewBox="0 0 80 80" role="img" aria-label="Місяць: освітлено ${pct}%, ${waxing?'зростає':'спадає'}" data-moon-k="${k}" data-moon-waxing="${waxing}"><circle cx="40" cy="40" r="35" fill="#26335a"/><path d="M${c},${c-r} A${r},${r} 0 0 ${limb} ${c},${c+r} A${rx.toFixed(3)},${r} 0 0 ${term} ${c},${c-r} Z" fill="#f3e9cf"/></svg><span>${pct}% · ${waxing?'зростає':'спадає'}<small>Розрахована фаза Місяця</small></span>`;}
const compared=new Set();
function resolvedFor(ds){return window.fp469ConsumerForDate?.({ds})||{consumer:{score:null,available:false}};}
function paintScore(node,result){const v=result?.available?result.score:null,kind=SkyScore.scoreClass(v),sem=SkyScore.SEMANTIC[kind];node.dataset.scoreTone=kind;node.textContent=sem.icon+' '+SkyScore.formatScore(v);node.setAttribute('aria-label',SkyScore.describe(v));}
function pick(root,ds){const select=root.querySelector('select');if(!select)return;if(![...select.options].some(x=>x.value===ds))select.add(new Option(ds,ds));select.value=ds;select.dispatchEvent(new Event('change',{bubbles:true}));}
function extras(root,ds){
 const route=root.dataset.overview;
 for(const btn of root.querySelectorAll('[data-day]')){const value=resolvedFor(btn.dataset.day).consumer;btn.dataset.scoreTone=SkyScore.scoreClass(value?.available?value.score:null);}
 if(route==='forecast'){
  let controls=root.querySelector('[data-p0-forecast-tabs]');if(!controls){controls=make('div','sr-p0-tabs');controls.dataset.p0ForecastTabs='';for(const [name,count]of [['День',1],['Тиждень',7]]){const b=make('button','',name);b.type='button';b.onclick=()=>{root.dataset.forecastCount=String(count);extras(root,ds);};controls.append(b);}const month=make('button','','Місяць — згодом');month.disabled=true;controls.append(month);root.querySelector('.nr-o-horizon-list')?.before(controls);}
  [...root.querySelectorAll('.nr-o-horizon-list [data-day]')].forEach((b,i)=>b.hidden=i>=Number(root.dataset.forecastCount||7));
 }
 if(route!=='calendar')return;
 let box=root.querySelector('[data-p0-month]');if(!box){box=make('section','sr-p0-month');box.dataset.p0Month='';root.querySelector('.nr-o-hero').after(box);}
 const key=box.dataset.month||ds.slice(0,7);box.dataset.month=key;const [y,m]=key.split('-').map(Number),count=new Date(Date.UTC(y,m,0)).getUTCDate(),offset=(new Date(key+'-01T12:00:00Z').getUTCDay()+6)%7;
 box.replaceChildren();const header=make('div','sr-p0-month-head');for(const [text,delta]of [['‹',-1],[new Intl.DateTimeFormat('uk-UA',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(key+'-01T12:00:00Z')),0],['›',1]]){const e=make(delta?'button':'h2','',text);if(delta){e.type='button';e.setAttribute('aria-label',delta<0?'Попередній місяць':'Наступний місяць');e.onclick=()=>{box.dataset.month=new Date(Date.UTC(y,m-1+delta,1,12)).toISOString().slice(0,7);extras(root,ds);};}header.append(e);}box.append(header);
 const grid=make('div','sr-p0-month-grid');for(const name of ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'])grid.append(make('span','',name));for(let i=0;i<offset;i++)grid.append(make('span',''));
 for(let d=1;d<=count;d++){const date=key+'-'+String(d).padStart(2,'0'),result=resolvedFor(date).consumer,b=make('button','');b.type='button';b.dataset.calendarDate=date;b.append(make('span','',String(d)));const val=make('strong','sr-p0-value');paintScore(val,result);const words=val.textContent.split(' ');val.replaceChildren(...words.map(word=>make('span','',word)));b.append(val);b.setAttribute('aria-label',date+' · '+SkyScore.describe(result?.available?result.score:null));b.setAttribute('aria-pressed',String(date===ds));b.onclick=()=>pick(root,date);grid.append(b);}box.append(grid,make('p','sr-p0-legend','▲ Позитивна · ● Нейтральна · ▼ Негативна · ○ Немає оцінки'));
 let compare=root.querySelector('[data-p0-compare]');if(!compare){compare=make('section','sr-p0-compare');compare.dataset.p0Compare='';box.after(compare);}compare.replaceChildren(make('h2','','Порівняти до трьох дат'));
 const add=make('button','','Додати обрану дату');add.type='button';add.disabled=compared.size>=3||compared.has(ds);add.onclick=()=>{compared.add(ds);extras(root,ds);};compare.append(add);
 for(const date of compared){const data=resolvedFor(date),card=make('article','sr-p0-compare-card');card.append(make('h3','',date));const score=make('strong','sr-p0-value');paintScore(score,data.consumer);card.append(score,make('p','',data.consumer?.authority==='expert_pdf'?'Експертна оцінка':data.consumer?.available?'Формула джерела':'Оцінка недоступна'));
 const parts=make('details','');parts.append(make('summary','','Надані складові'));for(const f of data.feed?.channels?.source_formula?.factors||[])parts.append(make('p','',String(f.factor)+': '+(Number.isFinite(f.value)?String(f.value).replace('.',','):'—')));card.append(parts);const remove=make('button','','Прибрати');remove.type='button';remove.onclick=()=>{compared.delete(date);extras(root,ds);};card.append(remove);compare.append(card);}
}
function apply(root,ds,resolved){
 extras(root,ds);if(root.dataset.overview!=='today')return;
 root.classList.add('sr-p0-today');const hero=root.querySelector('.nr-o-hero');if(!hero)return;
 let details=root.querySelector(':scope > [data-p0-details]');
 if(!details){details=make('details','sr-p0-details');details.dataset.p0Details='';details.append(make('summary','','Детально: джерела, розрахунок і календар'));root.append(details);}
 let signals=root.querySelector(':scope > [data-p0-signals]');
 if(!signals){signals=make('nav','sr-p0-signals');signals.dataset.p0Signals='';signals.setAttribute('aria-label','Три складові дня');for(const [name,selector]of [['Астрономія й NOAA','.nr-o-spaceweather'],['Панчанга','.nr-o-panch-preview'],['Оцінка дня','.nr-o-reasons']]){const btn=make('button','',name);btn.type='button';btn.onclick=()=>{details.open=true;const target=root.querySelector(selector);target?.scrollIntoView({block:'start'});if(target){target.tabIndex=-1;target.focus({preventScroll:true});}};signals.append(btn);}hero.after(signals);}
 let visual=hero.querySelector('[data-p0-moon]');if(!visual){visual=make('div','sr-p0-moon');visual.dataset.p0Moon='';hero.append(visual);}
 const now=new Date(),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(now),at=ds===today?now:noonKyiv(ds);visual.innerHTML=moon(at);visual.dataset.source='astronomy';visual.title='Геоцентричний розрахунок освітленої частки · '+at.toISOString();
 let sentence=hero.querySelector('[data-p0-sentence]');if(!sentence){sentence=make('p','sr-p0-sentence');sentence.dataset.p0Sentence='';hero.append(sentence);}
 const topic=root.querySelector('.nr-o-practical h2')?.textContent;sentence.textContent=resolved.available?(topic?'Теми дня за календарем джерела: '+topic.replace(/[.!?]+$/,'')+'.':'Перегляньте календарні теми й підстави оцінки дня.'):'Актуальної оцінки немає. Порожнє значення не означає нейтральний день.';
 let chip=hero.querySelector('[data-p0-source]');if(!chip){chip=make('button','sr-p0-source');chip.dataset.p0Source='';chip.type='button';chip.onclick=()=>{details.open=true;root.querySelector('[data-score-source]')?.scrollIntoView({block:'center'});};hero.append(chip);}
 chip.textContent=resolved.authority==='expert_pdf'?'Джерело: експертна оцінка':resolved.available?'Джерело: формула календаря':'Оцінка недоступна';
 const label=hero.querySelector(':scope > label');if(label){label.childNodes.forEach(n=>{if(n.nodeType===3)n.textContent='Дата · Київ';});label.dataset.p0Date='';}
 // Keep the original accessible route heading, while removing duplicate visual chrome.
 const heading=root.querySelector('.nr-o-heading');if(heading)root.prepend(heading);
 for(const e of [...hero.children])if(!e.matches('[data-p0-date],[data-p0-moon],[data-p0-sentence],.nr-o-verdict,[data-p0-source],.sr-p0-accessible-heading'))details.append(e);
 const source=root.querySelector('[data-score-source]');if(source)details.prepend(source);
 for(const e of [...root.children])if(e!==hero&&e!==details&&e!==signals&&!e.matches('.sr-dayline,.nr-o-journey,.nr-o-heading'))details.append(e);
 // Hide duplicate weather summaries only by putting them in the existing details; no data are dropped.
 const line=root.querySelector('.sr-dayline');if(line){signals.after(line);let explore=line.querySelector('[data-p0-explore]');if(!explore){explore=make('details','sr-p0-explore');explore.dataset.p0Explore='';explore.append(make('summary','','Усі події, час і традиційні образи'));line.append(explore);}
 for(const selector of ['.sr-dl-actions','label','[data-moment]','figure','[data-events]','[data-method]','[data-scope]']){const item=line.querySelector(':scope > '+selector);if(item)explore.append(item);}}
 const journey=root.querySelector('.nr-o-journey');if(journey){(line||signals).after(journey);}root.append(details);
 for(const child of [...root.parentElement.children])if(child!==root&&child.matches('details'))details.append(child);
}
window.SRP0Layout=Object.freeze({apply,noonKyiv,moon});
})();
