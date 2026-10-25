'use strict';
// Execute the actual application's NOAA validator, not a replacement implementation.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../../consumer_overview_v1.js'),'utf8');
const start=source.indexOf('function weatherStatus('),end=source.indexOf('window.NRSpaceWeather=');
assert(start>=0&&end>start,'NOAA validator must be locatable');
const status=vm.runInNewContext(source.slice(start,end)+';weatherStatus');
const now=Date.parse('2026-10-25T11:00:00Z');
const good={'0':{DateStamp:'2026-10-25',TimeStamp:'10:00:00',G:{Scale:'0'},S:{Scale:'0'},R:{Scale:'0'}}};
const badTime=structuredClone(good);badTime['0'].TimeStamp=null;
const badG=structuredClone(good);badG['0'].G.Scale=null;
for(const data of [null,undefined,{},badTime,badG])assert.equal(status(data,now).state,'unavailable');
assert.equal(status(good,now).state,'available');
assert.equal(status(good,now-7200000).state,'unavailable');
assert.equal(status(good,now+9*3600000).state,'unavailable');
console.log('PASS NOAA missing data: 8 cases; null/time/G fail closed, fresh/stale/future validated');
