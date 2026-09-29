import datetime as dt,json,subprocess,tempfile,shutil,sys
from pathlib import Path
H=Path(__file__).resolve().parent; B=H.parent.parent;results={}
cases=['valid','late','timezone_missing','date_invalid','duplicate_snapshot','duplicate_outcome','out_of_range','fraction','bool','empty','missing','both_channels_missing','one_channel_missing','invalid_prediction','mixed']
for case in cases:
 with tempfile.TemporaryDirectory(prefix='nebo-pair-fixed-') as tmp:
  root=Path(tmp)
  for name in ['pair_tanita_real_outcomes.py','outcome_score_contract.py']:shutil.copy2(B/name,root/name)
  control=root/'outputs/data_control';control.mkdir(parents=True);snapshots=[];outcomes=[]
  for i in range(30):
   day=dt.date(2026,1,1)+dt.timedelta(days=i)
   frozen=(day-dt.timedelta(days=1)).isoformat()+'T12:00:00+00:00'
   if case=='late' or case=='mixed' and i==0:frozen=day.isoformat()+'T12:00:00+00:00'
   if case=='timezone_missing':frozen=frozen[:-6]
   actual={'out_of_range':999,'fraction':1.5,'bool':True,'empty':'','missing':None}.get(case,1)
   snapshots.append(dict(target_date=day.isoformat() if case!='date_invalid' else '2026-13-01',frozen_at=frozen,tanita_shadow={'score':None if case in ['both_channels_missing','one_channel_missing'] else 99 if case=='invalid_prediction' else 1},final_prediction_reference={'score':None if case=='both_channels_missing' else 1}))
   outcomes.append(dict(date=day.isoformat(),outcome_type='real_user_outcome',actual_score=actual,provenance_verified=True,outcome_intake_sha256='a'*64,actual_source='validated_outcome_intake_v1'))
  if case=='duplicate_snapshot':snapshots+=list(reversed(snapshots))
  if case=='duplicate_outcome':outcomes+=list(reversed(outcomes))
  (control/'TANITA_PROSPECTIVE_SNAPSHOTS_v1.jsonl').write_text(''.join(json.dumps(x)+'\n' for x in snapshots))
  (root/'outputs/REAL_OUTCOME_LEDGER_v1.jsonl').write_text(''.join(json.dumps(x)+'\n' for x in outcomes))
  before={p:p.read_bytes() for p in [control/'TANITA_PROSPECTIVE_SNAPSHOTS_v1.jsonl',root/'outputs/REAL_OUTCOME_LEDGER_v1.jsonl']}
  p=subprocess.run([sys.executable,'-B',str(root/'pair_tanita_real_outcomes.py')],capture_output=True,text=True)
  assert (control/'TANITA_REAL_OUTCOME_PAIR_STATUS_v1.json').exists(),p.stderr
  status=json.loads((control/'TANITA_REAL_OUTCOME_PAIR_STATUS_v1.json').read_text())
  assert all(p.read_bytes()==data for p,data in before.items()),'inputs mutated'
  if case=='valid':assert p.returncode==0 and status['promotion_gate']['eligible_for_review'] and status['tanita_shadow']['n']==30
  elif case=='one_channel_missing':assert status['paired_independent_outcomes']==30 and not status['promotion_gate']['eligible_for_review'] and status['baseline_frozen']['n']==30
  elif case=='mixed':assert p.returncode==1 and status['paired_independent_outcomes']==29 and status['tanita_shadow']['n']==0 and not status['promotion_gate']['eligible_for_review']
  else:assert status['paired_independent_outcomes']==0 and status['tanita_shadow']['n']==0 and not status['promotion_gate']['eligible_for_review'],(case,status)
  results[case]={'exit':p.returncode,'pairs':status['paired_independent_outcomes'],'failures':len(status['hard_failures']),'gate':status['promotion_gate']}
(H/'PAIRING_ACCEPTANCE.json').write_text(json.dumps({'status':'PASS','synthetic_only':True,'cases':results},indent=2))
print('PASS',len(results),'synthetic pairing cases; all input bytes unchanged')
