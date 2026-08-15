import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map(value => {
  const [key, ...rest] = value.replace(/^--/, '').split('=');
  return [key, rest.join('=')];
}));
const input = resolve(args.input || 'product/contracts/hero-state.example.json');
const output = resolve(args.output || 'product/app/mobile-snapshot.json');
const sourceRole = args['source-role'] || 'DEMO_NOT_PRODUCTION';
const allowedRoles = new Set(['DEMO_NOT_PRODUCTION', 'PRODUCTION_CANONICAL']);
const allowedDecision = new Set(['ACT', 'CAUTION', 'HOLD', 'UNKNOWN']);
const allowedFreshness = new Set(['LIVE', 'DELAYED', 'LAST_GOOD', 'STALE']);
const fail = message => { throw new Error(`mobile snapshot rejected: ${message}`); };
const cleanText = (value, field) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 160) fail(`invalid ${field}`);
  return value.trim();
};
const optionalArray = (value, field, max) => {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > max) fail(`invalid ${field}`);
  return value;
};

if (!allowedRoles.has(sourceRole)) fail('invalid source role');
const hero = JSON.parse(await readFile(input, 'utf8'));
if (hero.schema !== 'neborytm_hero_state_v1') fail('unexpected input schema');
if (!allowedDecision.has(hero.decision)) fail('invalid decision');
if (!allowedFreshness.has(hero.freshness)) fail('invalid freshness');
if (!hero.source_id || !hero.generated_at || !hero.valid_until) fail('provenance timestamps/source missing');
if (hero.research?.tanita_score_effect !== 0 || hero.research?.v19_2_score_effect !== 0) fail('research candidate has score effect');

const generated = Date.parse(hero.generated_at);
const validUntil = Date.parse(hero.valid_until);
if (!Number.isFinite(generated) || !Number.isFinite(validUntil) || validUntil <= generated) fail('invalid validity interval');
if (sourceRole === 'PRODUCTION_CANONICAL' && /fixture|example|demo|synthetic/i.test(hero.source_id)) fail('demo source cannot be production');
const evaluatedAt = args.at ? Date.parse(args.at) : Date.now();
if (!Number.isFinite(evaluatedAt)) fail('invalid evaluation time');
if (sourceRole === 'PRODUCTION_CANONICAL' && (validUntil <= evaluatedAt || generated > evaluatedAt + 300000)) fail('production snapshot is expired or future-dated');

const nextChange = hero.next_change_at ? new Date(hero.next_change_at).toISOString().slice(11, 16) : '—';
const timeline = optionalArray(hero.timeline, 'timeline', 24).map((item, index) => {
  if (!item || !allowedDecision.has(item.state)) fail(`invalid timeline[${index}].state`);
  const at = Date.parse(item.at);
  if (!Number.isFinite(at)) fail(`invalid timeline[${index}].at`);
  return { at: new Date(at).toISOString(), state: item.state, label: cleanText(item.label, `timeline[${index}].label`) };
});
const allowedSkyRoles = new Set(['OBSERVED', 'FORECAST', 'CALCULATED', 'INFORMATIONAL']);
const sky = optionalArray(hero.sky, 'sky', 12).map((item, index) => {
  if (!item || !allowedSkyRoles.has(item.role)) fail(`invalid sky[${index}].role`);
  const scoreEffect = Number(item.score_effect);
  if (!Number.isFinite(scoreEffect)) fail(`invalid sky[${index}].score_effect`);
  if (['CALCULATED', 'INFORMATIONAL'].includes(item.role) && scoreEffect !== 0) fail(`informational sky[${index}] has score effect`);
  return {kind:cleanText(item.kind,`sky[${index}].kind`),label:cleanText(item.label,`sky[${index}].label`),value:cleanText(item.value,`sky[${index}].value`),role:item.role,source_id:cleanText(item.source_id,`sky[${index}].source_id`),observed_at:item.observed_at||null,score_effect:scoreEffect};
});
const context27 = optionalArray(hero.context_27d, 'context_27d', 27).map((item, index) => {
  const raw = Number(item?.raw);
  if (!item || typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Number.isFinite(raw)) fail(`invalid context_27d[${index}]`);
  return { date: item.date, raw };
});
const snapshot = {
  schema: 'neborythm_mobile_snapshot_v1',
  snapshot_id: `${hero.generated_at}_${hero.source_id}`,
  decision: hero.decision,
  freshness: hero.freshness,
  age_minutes: Number.isFinite(hero.age_minutes) ? hero.age_minutes : null,
  observed_at: hero.observed_at || null,
  generated_at: hero.generated_at,
  valid_until: hero.valid_until,
  evaluated_at: new Date(evaluatedAt).toISOString(),
  next_change: nextChange,
  source_id: hero.source_id,
  source_role: sourceRole,
  confidence: hero.confidence || 'UNKNOWN',
  timeline,
  sky,
  context_27d: context27,
  detail_status: timeline.length || sky.length || context27.length ? 'PARTIAL_OR_AVAILABLE' : 'UNAVAILABLE',
  research: { tanita_score_effect: 0, v19_2_score_effect: 0 },
};

await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`WROTE ${output} (${sourceRole})`);
