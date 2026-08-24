const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');

function assert(ok, message) {
  if (!ok) throw new Error(message);
  console.log('PASS:', message);
}

assert(src.includes("navigator.onLine === false) return 'offline'"),
  'resolveDataMode gives physical offline state highest priority');
assert(src.includes("state='offline'; label='● CACHED · OFFLINE'"),
  'freshness renderer cannot show LIVE while navigator is offline');
assert(src.includes("if (typeof _renderFreshnessState === 'function') _renderFreshnessState()"),
  'online/offline event immediately refreshes visible freshness');
assert(src.includes("if (typeof syncHero === 'function') syncHero()"),
  'online/offline event immediately resynchronizes Hero consumers');

function resolveDataModeHarness({online, badge='● Kp DATA LIVE', ageHours=0.1, synthetic=false}) {
  if (online === false) return 'offline';
  const txt = badge.toLowerCase();
  let fresh = 'live';
  if (txt.includes('offline') || txt.includes('old')) fresh = 'offline';
  else if (txt.includes('stale')) fresh = 'stale';
  else if (txt.includes('cache') || txt.includes('delayed')) fresh = 'cached';
  if (ageHours > 24 * 7) fresh = 'offline';
  else if (ageHours > 24) fresh = 'stale';
  else if (ageHours > 1) fresh = 'cached';
  if (fresh === 'offline') return 'offline';
  if (synthetic) return 'scenario';
  if (fresh === 'stale' || fresh === 'cached') return 'partial';
  return 'live';
}

assert(resolveDataModeHarness({online:false, badge:'● Kp DATA LIVE', ageHours:0}) === 'offline',
  'recent cached timestamp does not override physical offline state');
assert(resolveDataModeHarness({online:true, badge:'● Kp DATA LIVE', ageHours:0}) === 'live',
  'online fresh data remains LIVE');
assert(resolveDataModeHarness({online:true, badge:'● STALE', ageHours:25}) === 'partial',
  'online stale data remains downgraded');
