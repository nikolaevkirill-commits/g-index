const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
let checks = 0;
function has(value, label) { if (!html.includes(value)) throw new Error(`FAIL ${label}: missing ${value}`); checks++; }
function lacks(value, label) { if (html.includes(value)) throw new Error(`FAIL ${label}: unexpected ${value}`); checks++; }
has('v88.9.243-fp438-UNIFIED-FORECAST', 'document version');
has('Прогноз 3 · 7 · 27', 'single forecast navigation');
has("fp434Go('forecast',true)", 'forecast navigation target');
has('id="nrChart3"', '3-day chart');
has('id="nrChart7"', '7-day chart');
has('id="nrChart27"', '27-day chart');
has('id="nrBalanceScore"', 'balance summary');
has("chart('nrChart3',3);chart('nrChart7',7);chart('nrChart27',27);", 'shared chart renderer');
has('3 official · 4 scenario', 'horizon provenance');
has('Джерела, таблиці та перевірка даних', 'collapsed technical detail');
has("head('LEGACY DASHBOARD','Старий dashboard — окремо'", 'separate legacy dashboard');
lacks('data-route="calendar" onclick="fp434Go(\'calendar\'', 'old seven-day top route');
console.log(`PASS fp438 unified forecast: ${checks} checks`);
