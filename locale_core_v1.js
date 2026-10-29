(function(global){
'use strict';
const supported=['uk','en','es','fr'],key='gindex_locale_v1';
function detect(languages=navigator.languages||[navigator.language]){return languages.map(v=>String(v).toLowerCase().split(/[-_]/)[0]).find(v=>supported.includes(v))||'en';}
let choice='auto',language=detect();try{const v=localStorage.getItem(key)||localStorage.getItem('neborhythm_locale_v1');if(supported.includes(v)){choice=v;language=v;localStorage.setItem(key,v);}if(v)localStorage.removeItem('neborhythm_locale_v1')}catch{}
const messages=new Map(),untranslated=new Set();let pattern,dirty=false;
// FP542 (F1): translations are pure for a given language and registry, so results are memoised.
// The cache is cleared on registration or language change and bounded to avoid unbounded growth.
const memo=new Map(),MEMO_LIMIT=8000;let version=0;const CYR=/[А-Яа-яІіЇїЄєҐґ]/u;
function register(rows){for(const [uk,en,es,fr] of rows){if(!uk||![en,es,fr].every(x=>typeof x==='string'&&x.length))throw Error('Incomplete locale entry');if(messages.has(uk))throw Error('Duplicate locale entry: '+uk);messages.set(uk,{uk,en,es,fr})}dirty=true;memo.clear();version++;}
// The pattern is built once, on first use after registration, instead of after each of the 18 register() calls.
function build(){dirty=false;pattern=new RegExp([...messages.keys()].sort((a,b)=>b.length-a.length).map(s=>(/^\p{L}/u.test(s)?'(?<![\\p{L}\\p{M}])':'')+s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+(/\p{L}$/u.test(s)?'(?![\\p{L}\\p{M}])':'')).join('|'),'gu');}
function text(source){const s=String(source??'').replace(/\\n/g,'\n');if(language==='uk')return s;if(dirty)build();if(!pattern)return s;const hit=memo.get(s);if(hit!==undefined)return hit;
 // FP542 (F1): every registered key contains Cyrillic text; strings without it cannot match and are
 // returned unchanged without running the large alternation. A whole-string key is a direct lookup.
 if(!CYR.test(s))return s; // Unchanged strings need no cache entry; keep memory bounded.
 const exact=messages.get(s);
 if(exact){const out=exact[language];if(memo.size>=MEMO_LIMIT)memo.clear();memo.set(s,out);return out;}
 const out=s.replace(pattern,k=>messages.get(k)[language]).replace(/(\d)(г|хв|д)(?!\p{L})/gu,(_m,n,unit)=>n+({г:' h',хв:' min',д:' d'}[unit]));if(/[А-Яа-яІіЇїЄєҐґ]/u.test(out))untranslated.add(s);if(memo.size>=MEMO_LIMIT)memo.clear();memo.set(s,out);return out;}
function set(next){if(next!=='auto'&&!supported.includes(next))return false;choice=next;language=next==='auto'?detect():next;memo.clear();version++;let persisted=true;try{localStorage.setItem(key,next)}catch{persisted=false}document.documentElement.lang=language;global.dispatchEvent(new CustomEvent('nr:locale',{detail:{language,persisted}}));return persisted;}
global.addEventListener('languagechange',()=>{if(choice==='auto')set('auto')});
global.NRLocale={register,text,set,detect,get choice(){return choice},get language(){return language},get version(){return version},get locale(){return {uk:'uk-UA',en:'en-GB',es:'es-ES',fr:'fr-FR'}[language]},supported,missing:()=>[...untranslated],clearMissing:()=>untranslated.clear()};
})(window);
