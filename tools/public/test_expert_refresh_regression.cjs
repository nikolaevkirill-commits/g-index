'use strict';
// FP541 regression, updated in FP542: a refresh failure keeps the last validated snapshot;
// a schema-valid document with two different decisions for one date is a conflict (no score),
// never the stale snapshot and never the formula; recovery must actually swap the value.
const assert=require('node:assert/strict');
global.location={href:'http://127.0.0.1:8886/index.html'};
const base='http://127.0.0.1:8886/';
const feed=require('../../consumer_cloud/forecast.json');
let mode='valid';const date='2026-10-19';
const decision=score=>({date,score,source_sha256:'a'.repeat(64),source_page:1,decision_id:'regression-only'});
const docs={valid:{schema:'consumer-final-decisions-v1',decisions:[decision(2)]},
 duplicate:{schema:'consumer-final-decisions-v1',decisions:[decision(2),decision(-2)]},
 schema:{schema:'broken',decisions:[]},
 recovered:{schema:'consumer-final-decisions-v1',decisions:[decision(1)]}};
global.fetch=async (url)=>{
 const u=String(url);
 if(u.endsWith('/forecast.json'))return {ok:true,redirected:false,type:'basic',url:u,headers:{get:()=>null},json:async()=>feed};
 if(mode==='offline')throw Error('network offline');
 return {ok:true,redirected:false,type:'basic',url:u,json:async()=>docs[mode]};
};
const api=require('../../consumer_authority_v1.js');
(async()=>{
 await api.loadFeeds(base);assert.equal(api.expertFor(date)?.score,2);assert.equal(api.registryStatus().status,'ok');
 mode='offline';await api.loadFeeds(base);assert.equal(api.expertFor(date)?.score,2,'offline refresh must not erase trusted snapshot');assert.equal(api.registryStatus().status,'stale');
 mode='schema';await api.loadFeeds(base);assert.equal(api.expertFor(date)?.score,2,'rejected document must not erase trusted snapshot');assert.equal(api.registryStatus().status,'stale');
 mode='duplicate';await api.loadFeeds(base);assert.equal(api.expertFor(date),null,'conflicting decisions must not keep the old value');
 const r=api.resolveFinal(null,date,Date.parse('2026-10-19T10:00:00Z'));assert.equal(r.state,'expert_conflict');assert.equal(r.score,null);assert.equal(r.available,false);
 mode='recovered';await api.loadFeeds(base);assert.equal(api.expertFor(date)?.score,1,'a new validated document must replace the snapshot');assert.equal(api.registryStatus().status,'ok');
 console.log('PASS expert refresh: offline/schema keep snapshot, conflict withholds, recovery swaps');
})().catch(e=>{console.error(e);process.exitCode=1});
