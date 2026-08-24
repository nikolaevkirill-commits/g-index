const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const canonicalAutomationPresent = [
  'verify_system_health.py', 'daily_chain.bat', 'refresh_live_context_fp377.cmd'
].every(p => fs.existsSync(p));

function must(re, msg, text=html){ if(!re.test(text)) throw new Error(msg); }
function mustNot(re, msg, text=html){ if(re.test(text)) throw new Error(msg); }

must(/const _opAvailableDL = !!\(_opSigDL && _opSigDL\.decisionAvailable && isFinite\(_opSigDL\.decisionScore\)\)/,
  'A-01 Decision Layer lacks canonical verdict gate');
must(/if \(!_opAvailableDL\)[\s\S]{0,500}G_raw — довідковий фон, не дозвіл до дії/,
  'A-01 fail-closed action copy missing');
mustNot(/const kpMax\s*=\s*fmtDate\(d\.date\)[\s\S]{0,120}lastWWV\.kNow/,
  'D-01 current Kp still replaces 3-day daily maximum');
must(/const kpMax\s*=\s*d\.kpMax;/, 'D-01 3-day rail does not use daily kpMax');
must(/fluxStatus:\s*fluxValid \? 'verified_range' : 'conflicting_outlier'/,
  'X-01 F10.7 outlier quarantine missing');
must(/SN_d_tot_V2\.0\.csv/, 'X-02 documented SILSO daily CSV missing');
mustNot(/EISN_current\.json|SN_d_tot_V2\.0\.json/, 'X-02 dead SILSO JSON endpoint remains');

const parse27 = html.match(/function parse27Day\(text\)\{[\s\S]*?\n\}/);
if(!parse27) throw new Error('parse27Day extraction failed');
const c27={console}; vm.createContext(c27); vm.runInContext(parse27[0],c27);
const rows=c27.parse27Day('2026 Sep 01 1151 8 3\n2026 Sep 02 120 8 3');
if(rows[0].flux !== null || rows[0].fluxRaw !== 1151 || rows[0].fluxStatus !== 'conflicting_outlier')
  throw new Error('X-01 1151 was not quarantined');
if(rows[1].flux !== 120 || rows[1].fluxStatus !== 'verified_range') throw new Error('X-01 valid F10.7 rejected');

const parseSn = html.match(/function parseWolfSn\(json\)\{[\s\S]*?\n\}/);
if(!parseSn) throw new Error('parseWolfSn extraction failed');
const cs={}; vm.createContext(cs); vm.runInContext(parseSn[0],cs);
const sn=cs.parseWolfSn('2026;08;24;2026.646;118;5.0;12;1');
if(!sn || sn.sn !== 118 || sn.dateStr !== '2026-08-24') throw new Error('X-02 SILSO CSV parse failed');

if(canonicalAutomationPresent){
  const health = fs.readFileSync('verify_system_health.py', 'utf8');
  const daily = fs.readFileSync('daily_chain.bat', 'utf8');
  const live = fs.readFileSync('refresh_live_context_fp377.cmd', 'utf8');
  must(/scheduled_task_failed:/, 'O-01 scheduler failure is not hard', health);
  must(/PROGNOZ_prospective_evidence/, 'O-01 prospective scheduler missing from health', health);
  must(/scheduled_task_missed_cadence:/, 'O-01 per-job cadence missing', health);
  must(/current_pipeline_failed:/, 'O-03 current failure marker missing', health);
  for(const [name,text] of [['daily',daily],['live',live]]){
    must(/\^pid=\(\\d\+\)\$/, `O-02 ${name} lock lacks owner PID`, text);
    must(/Get-Process -Id/, `O-02 ${name} lock lacks liveness test`, text);
  }
  must(/publish_health_status\.ps1/, 'O-03 isolated failure telemetry publish missing', daily);
}

console.log('PASS fp428 A-01 canonical Decision Layer gate');
console.log('PASS fp428 D-01 daily Kp_max separation');
console.log('PASS fp428 X-01 F10.7 quarantine');
console.log('PASS fp428 X-02 SILSO documented CSV parser');
console.log(canonicalAutomationPresent
  ? 'PASS fp428 O-01/O-02/O-03 scheduler health and lock closure'
  : 'SKIP fp428 O-01/O-02/O-03: canonical automation files are not part of public runtime');
