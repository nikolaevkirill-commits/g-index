(function(host){
'use strict';
const VERSION='dayline-transitions-1',DB='sr-transition-control-v1';
function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{r.result.createObjectStore('settings');r.result.createObjectStore('seen');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function transaction(stores,mode,work){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(stores,mode);let result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('TRANSACTION_ABORT'));work(tx,v=>{result=v});});}finally{db.close();}}
function control(value){return transaction(['settings'],'readwrite',tx=>{if(value)tx.objectStore('settings').put(value,'active');else tx.objectStore('settings').delete('active');});}
function current(){return transaction(['settings'],'readonly',(tx,set)=>{const r=tx.objectStore('settings').get('active');r.onsuccess=()=>set(r.result||null);});}
function pendingCancellations(){return transaction(['settings'],'readonly',(tx,set)=>{const r=tx.objectStore('settings').get('pending_cancel');r.onsuccess=()=>set(r.result||[]);});}
function queueCancellation(){return transaction(['settings'],'readwrite',(tx,set)=>{const store=tx.objectStore('settings'),a=store.get('active');a.onsuccess=()=>{const r=store.get('pending_cancel');r.onsuccess=()=>{const pending=r.result||[];if(a.result?.endpoint&&!pending.includes(a.result.endpoint))pending.push(a.result.endpoint);store.put(pending,'pending_cancel');store.delete('active');set(pending);};};});}
function acknowledgeCancellation(endpoint){return transaction(['settings'],'readwrite',tx=>{const store=tx.objectStore('settings'),r=store.get('pending_cancel');r.onsuccess=()=>store.put((r.result||[]).filter(e=>e!==endpoint),'pending_cancel');});}
function valid(p,s,now=Date.now()){
 if(!p||!s||p.schema!==VERSION||p.category!=='astronomical_transition'||p.calculation_version!==VERSION||p.settings_id!==s.settings_id||s.valid_until<=now)return false;
 if(!/^[a-f0-9]{64}$/.test(p.event_id)||!['tithi','nakshatra','yoga','karana'].includes(p.kind)||p.physical_uncertainty_ms!==null||'score'in p)return false;
 const at=Date.parse(p.occurred_at),end=Date.parse(p.expires_at);
 if(!Number.isFinite(at)||!Number.isFinite(end)||at>now||end<=now||![1200000,2100000].includes(end-at))return false;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!Number.isFinite(Date.parse(p.date+'T12:00:00Z'))||new Date(p.date+'T12:00:00Z').toISOString().slice(0,10)!==p.date)return false;
 if(!p.place||!s.place||['lat','lon','zone'].some(k=>p.place[k]!==s.place[k]))return false;
 if(p.kind==='karana'){const names=['Kimstughna','Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti','Shakuni','Chatushpada','Naga'];if(!names.includes(p.from)||!names.includes(p.to))return false;}
 else {const max=p.kind==='tithi'?30:27;if(![p.from,p.to].every(v=>Number.isInteger(v)&&v>=1&&v<=max))return false;}
 if(p.related!==undefined){if(p.kind!=='tithi'||!Array.isArray(p.related)||p.related.length!==1)return false;const x=p.related[0];if(!x||x.kind!=='karana'||!Number.isFinite(Date.parse(x.occurred_at))||Math.abs(Date.parse(x.occurred_at)-at)>1||!valid({...p,...x,occurred_at:p.occurred_at,related:undefined},s,now))return false;}
 return p.from!==p.to;
}
async function claim(p){return transaction(['settings','seen'],'readwrite',(tx,set)=>{const settings=tx.objectStore('settings').get('active');settings.onsuccess=()=>{if(!valid(p,settings.result)){set(false);return;}const seen=tx.objectStore('seen'),r=seen.get(p.event_id);r.onsuccess=()=>{if(r.result){set(false);return;}seen.put(Date.parse(p.expires_at),p.event_id);set(true);};const cursor=seen.openCursor();cursor.onsuccess=()=>{const c=cursor.result;if(c){if(c.value<Date.now())c.delete();c.continue();}};};});}
async function receive(sw,p){
 if(!await claim(p))return false;
 const state=await current();if(!valid(p,state))return false;
 const kinds={uk:{tithi:'Тітхі',nakshatra:'Накшатра',yoga:'Йога',karana:'Карана'},en:{tithi:'Tithi',nakshatra:'Nakshatra',yoga:'Yoga',karana:'Karana'},es:{tithi:'Tithi',nakshatra:'Nakshatra',yoga:'Yoga',karana:'Karana'},fr:{tithi:'Tithi',nakshatra:'Nakshatra',yoga:'Yoga',karana:'Karana'}};
 const labels=kinds[state.language]||kinds.uk,items=[p,...(p.related||[])];
 const kind=items.map(x=>labels[x.kind]).join(' + ');
 const body=items.map(x=>labels[x.kind]+': '+(host.SkyRhythmI18n?.name(x.kind,x.from,state.language||'uk')||String(x.from))+' → '+(host.SkyRhythmI18n?.name(x.kind,x.to,state.language||'uk')||String(x.to))).join(' · ')+' · '+p.place.zone;
 const url=new URL('./',sw.registration.scope);url.searchParams.set('dlDate',p.date);url.searchParams.set('dlEvent',p.event_id);url.searchParams.set('dlAt',p.occurred_at);url.searchParams.set('dlKind',p.kind);url.hash='today';
 await sw.registration.showNotification('SkyRhythm · '+kind,{body,tag:'sr-transition-'+p.event_id,icon:'./icon192.png',data:{category:p.category,url:url.href,date:p.date,event_id:p.event_id},timestamp:Date.parse(p.occurred_at)});return true;
}
host.SRTransitionRuntime=Object.freeze({VERSION,control,current,valid,receive,pendingCancellations,queueCancellation,acknowledgeCancellation});
})(globalThis);
