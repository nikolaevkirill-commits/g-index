/* SkyRhythm · «Довідник» (FP569n, Claude 09.11.2026): every term the app uses, in one place, in plain words.
   Each entry says what it is, how it is obtained (measured / computed / tradition) and whether it changes the score. */
(()=>{'use strict';
const I=['uk','en'],L=()=>(window.NRLocale?.language==='uk'||!window.NRLocale?.language)?0:1;
const H=[['Довідник: як читати SkyRhythm','Glossary: how to read SkyRhythm'],['Основні терміни застосунку простими словами. Позначки: 📡 вимірювання, 🧮 розрахунок, 📜 традиція.','Key terms in plain words. Marks: 📡 measured, 🧮 computed, 📜 tradition.'],['Пошук терміна','Search a term']];
const G=[
 ['Оцінка дня (−3…+3)','Day score (−3…+3)','🧮📜','Підсумок дня: експертна оцінка, якщо вона є, інакше — формула з календаря Джйотіш і космічної погоди. Знак: + сприятливо, 0 нейтрально, − обережно. Точність передбачень не доведена.','The day summary: the expert score when available, otherwise a formula from the Jyotish calendar and space weather. + favourable, 0 neutral, − caution. Predictive accuracy is not established.'],
 ['Експертна оцінка','Expert score','📜','Оцінка з бюлетенів експерта. Має вищий пріоритет за формулу; якщо вони розходяться на 2 і більше, у «Чому так» це видно.','A score from the expert bulletins. It overrides the formula; a gap of 2+ is shown in “Why”.'],
 ['Kp-індекс','Kp index','📡','Сила геомагнітного збурення від 0 до 9 (NOAA). Kp 5 і вище — магнітна буря G1–G5.','Geomagnetic disturbance strength 0–9 (NOAA). Kp 5+ is a G1–G5 storm.'],
 ['Шкала G (G0–G5)','G scale (G0–G5)','📡','Рівень магнітної бурі NOAA: G1 слабка … G5 екстремальна. G0 — позначка застосунку для рівня нижче G1, якщо є дані.','NOAA storm level: G1 minor … G5 extreme. The app uses G0 for values below G1 when data is available.'],
 ['27-денний орієнтир NOAA','NOAA 27-day outlook','📡','Довгостроковий орієнтир сонячної та геомагнітної активності; не попередження про конкретну бурю. Тому з нього не оцінюємо сяйво.','A long-range background, not a storm forecast; aurora is not estimated from it.'],
 ['Сидеричний зодіак (Лахірі)','Sidereal zodiac (Lahiri)','🧮','Знаки, прив’язані до зір (як у Джйотіш). Відрізняються від «газетних» приблизно на 24°, тому Сонце може бути в іншому знаку.','Signs tied to the stars (as in Jyotish), about 24° from the Western ones, so the Sun may be in another sign.'],
 ['Ретроградний рух','Retrograde motion','🧮','З Землі здається, що планета рухається назад. Це ефект перспективи; у традиції — час переглядати, а не починати.','Seen from Earth a planet appears to move backwards — a perspective effect; traditionally a time to review.'],
 ['Тітхі — місячний день','Tithi — lunar day','🧮📜','Місяць відходить від Сонця на кожні 12° — новий місячний день (30 за місяць). У традиції кожен має свою «тему».','Every 12° the Moon gains on the Sun starts a lunar day (30 a month), each with a traditional theme.'],
 ['Накшатра — сузір’я Місяця','Nakshatra — Moon’s star group','🧮📜','27 ділянок неба по 13°20′. Місяць проходить одну приблизно за добу.','27 sky sections of 13°20′; the Moon crosses one in about a day.'],
 ['Йога дня','Day yoga','🧮📜','Сума довгот Сонця й Місяця, поділена на 27 частин; змінюється ≈ раз на добу.','The Sun+Moon longitude sum in 27 parts; changes about daily.'],
 ['Карана — половина місячного дня','Karana — half lunar day','🧮📜','Половина тітхі, ≈ 12 годин.','Half a tithi, about 12 hours.'],
 ['Знак Місяця при народженні','Natal Moon sign','🧮📜','Де був Місяць у мить народження. Від нього рахують особисті переходи (Тара Бала, Саде Саті, Юпітер).','Where the Moon was at birth; personal transits are counted from it.'],
 ['Тара Бала','Tara Bala','📜','Сумісність «зірки дня» з вашою зіркою народження; 9 видів по колу, частина обережні.','How the day’s star relates to your birth star; nine kinds, some cautious.'],
 ['Саде Саті','Sade Sati','📜','≈ 7,5 року, поки Сатурн проходить біля вашого натального Місяця. Час навантаження, а не прогноз подій.','About 7.5 years of Saturn near your natal Moon; a time of load, not an event forecast.'],
 ['Зближення / з’єднання','Approach / conjunction','🧮','Зближення — мала різниця довгот. У точному з’єднанні довготи збігаються; це не означає, що об’єкти накладаються на небі.','An approach has a small longitude difference. At exact conjunction the longitudes match; the bodies need not overlap in the sky.'],
 ['Сяйво','Aurora','📡🧮','Можливе, коли буря сильна, а ваша геомагнітна широта достатньо висока. Хмари й засвітку застосунок не знає.','Possible when the storm is strong and your geomagnetic latitude high enough. Clouds and light pollution are unknown to the app.'],
 ['Типове місце','Default place','—','Якщо місце не обране, небо показується для Києва з підписом «типове місце». Ваших координат без дозволу ми не беремо.','With no place chosen the sky is shown for Kyiv, labelled “default place”. Your coordinates are never taken without permission.']
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function html(){const l=L();return `<section class="nr-card sr-glossary" data-glossary data-lang="${l}" aria-labelledby="srGlossTitle"><h2 id="srGlossTitle">${esc(H[0][l])}</h2><p class="sr-gl-hint">${esc(H[1][l])}</p><div class="sr-gl-search"><input type="search" data-glossary-search aria-label="${esc(H[2][l])}" placeholder="${esc(H[2][l])}…"></div><div class="sr-gl-list">${G.map(e=>`<details data-term="${esc((e[0]+' '+e[1]).toLowerCase())}"><summary><span>${esc(e[l])}</span><i aria-hidden="true">${e[2]}</i></summary><p>${esc(e[3+l])}</p></details>`).join('')}</div></section>`}
const STYLE=`.sr-glossary{margin:16px 0;padding:16px 18px}.sr-glossary h2{margin:0 0 6px}.sr-gl-hint{margin:0 0 10px;opacity:.82;line-height:1.45}
.sr-gl-search input{width:100%;min-height:44px;padding:0 12px;border-radius:12px;border:1px solid rgba(185,163,227,.35);background:rgba(255,255,255,.05);color:inherit;font:inherit;box-sizing:border-box}
.sr-gl-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.sr-gl-list{margin-top:10px}.sr-gl-list details{border-top:1px solid rgba(185,163,227,.18)}
.sr-gl-list summary{display:flex;justify-content:space-between;gap:10px;align-items:center;min-height:44px;cursor:pointer;font-weight:600}
.sr-gl-list summary i{font-style:normal;opacity:.85}.sr-gl-list p{margin:0 0 12px;line-height:1.5;opacity:.92}`;
function render(){
 if(!document.getElementById('srGlossStyle')){const s=document.createElement('style');s.id='srGlossStyle';s.textContent=STYLE;document.head.append(s)}
 const more=document.getElementById('nrRoute-more');if(!more)return;
 const old=more.querySelector('[data-glossary]');if(old&&old.dataset.lang===String(L()))return;
 const tmp=document.createElement('div');tmp.innerHTML=html();const el=tmp.firstElementChild;
 if(old)old.replaceWith(el);else{const kpt=more.querySelector('[data-kp-threshold-settings]');(kpt?kpt.after(el):more.append(el));}
}
document.addEventListener('input',e=>{const i=e.target.closest?.('[data-glossary-search]');if(!i)return;const q=i.value.trim().toLowerCase();for(const d of i.closest('[data-glossary]').querySelectorAll('details')){const hit=!q||d.dataset.term.includes(q)||d.textContent.toLowerCase().includes(q);d.hidden=!hit;if(q&&hit)d.open=true}});
let pending=0;const soon=()=>{clearTimeout(pending);pending=setTimeout(()=>{try{render()}catch(err){console.warn('glossary',err)}},250)};
for(const ev of ['hashchange','nr:locale'])window.addEventListener(ev,soon);
function watch(){const r=document.getElementById('nrRoute-more');if(!r){setTimeout(watch,400);return}new MutationObserver(soon).observe(r,{childList:true});soon()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
window.SRGlossary=Object.freeze({render,terms:G.length});
})();
