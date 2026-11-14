'use strict';
// FP572: the OVATION panel separates daylight, twilight and darkness at the model valid time, wraps the
// 180° meridian onto the 0..359 grid and rejects empty or malformed frames instead of showing a value.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'..','..','sky_ovation_v1.js'),'utf8');
(async()=>{
 const O=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
 let checks=0;const eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
 eq(O.skyLight(10),'day');eq(O.skyLight(-50/60),'day');eq(O.skyLight(-0.84),'twilight');eq(O.skyLight(-6),'twilight');
 eq(O.skyLight(-12),'twilight');eq(O.skyLight(-12.01),'dark');eq(O.skyLight(-40),'dark');eq(O.skyLight(NaN),'unknown');
 for(const lang of ['twilight','daylight'])assert.equal((source.match(new RegExp('^  '+lang+':\\[','m'))||[]).length,1);
 // Frame validation: a complete 360×181 grid is required; an empty answer is not a zero.
 const stamp=t=>new Date(t).toISOString().replace('.000Z','Z'),now=Date.UTC(2026,10,13,20,0,0);
 const coordinates=[];for(let y=-90;y<=90;y++)for(let x=0;x<360;x++)coordinates.push([x,y,x===180&&y===70?77:x===0&&y===70?5:0]);
 const doc={'Observation Time':stamp(now),'Forecast Time':stamp(now+40*60000),type:'MultiPoint','Data Format':'[Longitude, Latitude, Aurora]',coordinates};
 const frame=O.parseFrame(doc);assert.ok(frame);checks++;
 eq(O.parseFrame({...doc,coordinates:[]}),null,'empty grid');eq(O.parseFrame({...doc,coordinates:coordinates.slice(1)}),null,'incomplete grid');
 eq(O.parseFrame({...doc,'Forecast Time':stamp(now-60000)}),null,'valid time before observation');eq(O.parseFrame({}),null,'empty answer');
 eq(O.frameStatus(frame,now+5*60000),'forecast');eq(O.frameStatus(frame,now+31*60000),'stale');eq(O.frameStatus(frame,now-1),'unavailable');
 // Grid index used by atPlace: longitudes just west and east of the antimeridian share the 180° column.
 const column=lon=>(Math.round(lon)+360)%360;
 eq(column(179.6),180);eq(column(-179.6),180);eq(column(-180),180);eq(column(180),180);eq(column(-0.4),0);eq(column(-0.6),359);
 eq(frame.grid[(70+90)*360+column(-179.6)],77,'antimeridian cell');eq(frame.grid[(70+90)*360+column(-0.4)],5,'prime meridian cell');
 console.log(JSON.stringify({status:'PASS',checks,scope:'OVATION is a model grid; the label describes the Sun altitude only, not clouds or visibility'}));
})().catch(error=>{console.error(error);process.exitCode=1;});
