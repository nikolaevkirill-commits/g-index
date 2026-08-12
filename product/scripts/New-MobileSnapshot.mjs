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
  research: { tanita_score_effect: 0, v19_2_score_effect: 0 },
};

await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`WROTE ${output} (${sourceRole})`);
