(function(){
'use strict';
const records=new WeakMap(),attributes=new WeakMap();
// Only application-owned overview text is translated. Forms, user notes,
// identifiers, values and the historical/research surface are excluded.
const roots='.nr-route:not(#nrRoute-expert),#headerTitle,#headerSub,#mobileNav,#nrTopNav';
function translate(root){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){
  if(node.parentElement.closest('script,style,svg,textarea,input,.nr-legacy-details,#nrProfileLive,[translate="no"],#nrLocaleControl'))continue;
  let old=records.get(node);if(!old||node.nodeValue!==old.output)old={source:node.nodeValue};
  const output=NRLocale.text(old.source);records.set(node,{source:old.source,output});if(node.nodeValue!==output)node.nodeValue=output;
 }
 for(const el of [root,...root.querySelectorAll('[aria-label],[title],[placeholder]')]){
  if(el.closest('.nr-legacy-details,#nrProfileLive,[translate="no"],#nrLocaleControl'))continue;
  let saved=attributes.get(el)||{};
  for(const attr of ['aria-label','title','placeholder']){if(!el.hasAttribute(attr))continue;const current=el.getAttribute(attr);let old=saved[attr];if(!old||current!==old.output)old={source:current};const output=NRLocale.text(old.source);saved[attr]={source:old.source,output};if(current!==output)el.setAttribute(attr,output)}attributes.set(el,saved);
 }
}
function mount(){
 const settings=document.querySelector('.nr-o-settings');
 if(settings&&!document.getElementById('nrSettingsLanguage')){
  const label=document.createElement('label');label.htmlFor='nrSettingsLanguage';label.textContent='Мова інтерфейсу';
  const select=document.createElement('select');select.id='nrSettingsLanguage';select.setAttribute('translate','no');
  select.innerHTML='<option value="auto">Auto · мова пристрою</option><option value="uk">Українська</option><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option>';
  select.onchange=e=>NRLocale.set(e.target.value);settings.querySelector('h1').after(label,select);
 }
 const header=document.getElementById('headerTitle')?.parentElement;if(!header||document.getElementById('nrLocaleControl'))return;
 const label=document.createElement('label');label.id='nrLocaleControl';label.style.cssText='display:inline-flex;align-items:center;gap:8px;font:13px system-ui;margin:8px 0;color:var(--nr-copy)';label.innerHTML='<span lang="en">Language</span><select aria-label="Interface language" style="font:inherit;min-height:44px;background:var(--nr-panel);color:var(--nr-copy);border:1px solid var(--nr-line);border-radius:6px;padding:6px 10px"><option value="uk">Українська</option><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option></select><span role="status"></span>';
 header.append(label);label.querySelector('select').value=NRLocale.language;label.querySelector('select').onchange=e=>{const saved=NRLocale.set(e.target.value);label.querySelector('[role=status]').textContent=saved?'':{uk:'Лише на цей сеанс',en:'This session only',es:'Solo esta sesión',fr:'Pour cette session uniquement'}[NRLocale.language]};
 label.querySelector('select').prepend(new Option('Auto · мова пристрою','auto'));
 document.addEventListener('click',e=>{if(e.target.closest('#btnLang')){e.preventDefault();e.stopImmediatePropagation();const all=NRLocale.supported;NRLocale.set(all[(all.indexOf(NRLocale.language)+1)%all.length])}},true);
}
let queued=false;
function refresh(){queued=false;mount();document.documentElement.lang=NRLocale.language;document.querySelectorAll(roots).forEach(translate);for(const c of document.querySelectorAll('#nrLocaleControl select,#nrSettingsLanguage')){c.value=NRLocale.choice;const autoLabel={uk:'Авто · мова пристрою',en:'Auto · device language',es:'Auto · idioma del dispositivo',fr:'Auto · langue de l’appareil'}[NRLocale.language];const option=c.querySelector('[value="auto"]');if(option.textContent!==autoLabel)option.textContent=autoLabel;const label={uk:'Мова',en:'Language',es:'Idioma',fr:'Langue'}[NRLocale.language];if(c.closest('#nrLocaleControl')&&c.previousElementSibling.textContent!==label)c.previousElementSibling.textContent=label;c.setAttribute('aria-label',{uk:'Мова інтерфейсу',en:'Interface language',es:'Idioma de la interfaz',fr:'Langue de l’interface'}[NRLocale.language]);}}
function queue(){if(!queued){queued=true;queueMicrotask(refresh)}}
window.addEventListener('nr:locale',refresh);
function start(){refresh();new MutationObserver(queue).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-hidden']});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.NRLocaleOverviewRefresh=refresh;
})();
