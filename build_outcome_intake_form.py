#!/usr/bin/env python3
"""Build an offline, fail-closed editor for independent outcome intake.

The form never invents an outcome and never changes production scores. It only
exports a CSV with the exact schema consumed by validate/import scripts.
"""
from __future__ import annotations

import csv
import html
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTROL = ROOT / "outputs" / "data_control"
QUEUE = CONTROL / "OUTCOME_INTAKE_QUEUE_v1.csv"
FORM = CONTROL / "OUTCOME_INTAKE_FORM_v1.html"
STATUS = CONTROL / "OUTCOME_INTAKE_FORM_STATUS_v1.json"


def main() -> int:
    CONTROL.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, str]] = []
    fields: list[str] = []
    if QUEUE.exists():
        with QUEUE.open(newline="", encoding="utf-8-sig") as handle:
            reader = csv.DictReader(handle)
            fields = list(reader.fieldnames or [])
            rows = list(reader)

    required = [
        "date", "prediction_score", "prediction_created_at", "prediction_model",
        "forecast_seen", "actual_score", "actual_class", "domain",
        "event_summary", "confidence_actual", "notes", "instruction",
    ]
    if fields and fields != required:
        raise SystemExit(f"unexpected queue schema: {fields}")
    if not fields:
        fields = required

    payload = json.dumps(rows, ensure_ascii=False).replace("</", "<\\/")
    field_payload = json.dumps(fields, ensure_ascii=False)
    generated = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    page = f"""<!doctype html>
<html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>G-Index · незалежні результати</title>
<style>
body{{font:15px system-ui;background:#081326;color:#dce8ff;margin:0;padding:20px}}main{{max-width:1100px;margin:auto}}
h1{{font-size:22px}}.note{{padding:12px;border:1px solid #b88322;background:#2a2418;border-radius:10px}}
.row{{margin:14px 0;padding:14px;border:1px solid #294365;border-radius:12px;background:#0d1c33}}
.meta{{color:#9db0ce;font-size:12px;margin-bottom:10px}}label{{display:block;margin:8px 0 3px}}
input,select,textarea{{box-sizing:border-box;width:100%;padding:8px;border:1px solid #3d5578;border-radius:7px;background:#071225;color:#fff}}
.grid{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}}button{{padding:11px 16px;border:0;border-radius:8px;background:#27b978;color:#04170f;font-weight:800;cursor:pointer}}
#status{{margin-left:10px;color:#ffc45c}}@media(max-width:700px){{.grid{{grid-template-columns:1fr}}}}
</style></head><body><main>
<h1>Незалежні результати після дня</h1>
<div class="note"><b>Не дивіться PDF/Excel/експертний прогноз під час оцінки.</b> Заповнюйте лише фактичний досвід після завершення дня. Порожні рядки не імпортуються. Згенеровано: {html.escape(generated)}.</div>
<div id="rows"></div><button id="save">Завантажити заповнений OUTCOME_INTAKE_QUEUE_v1.csv</button><span id="status"></span>
<script>
const rows={payload}, fields={field_payload};
const labels={{'-3':'AVOID','-2':'AVOID','-1':'CAUTION','0':'NORMAL','1':'FAVORABLE','2':'BEST_WINDOW','3':'BEST_WINDOW'}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}}[c]));
document.getElementById('rows').innerHTML=rows.map((r,i)=>`<section class="row" data-i="${{i}}"><div class="meta"><b>${{esc(r.date)}}</b> · прогноз був заморожений ${{esc(r.prediction_created_at)}} · модель ${{esc(r.prediction_model)}}. Значення прогнозу приховано до експорту.</div><div class="grid">
<div><label>Бачили прогноз до оцінки?</label><select data-k="forecast_seen"><option value="">—</option><option value="0">Ні (blind)</option><option value="1">Так</option></select></div>
<div><label>Фактичний бал −3…+3</label><select data-k="actual_score"><option value="">—</option>${{[-3,-2,-1,0,1,2,3].map(v=>`<option>${{v}}</option>`).join('')}}</select></div>
<div><label>Сфера</label><select data-k="domain"><option value="">—</option>${{['work','health','travel','finance','communication','other'].map(v=>`<option>${{v}}</option>`).join('')}}</select></div>
</div><label>Що фактично сталося (мінімум 8 символів)</label><textarea data-k="event_summary" rows="2">${{esc(r.event_summary)}}</textarea>
<div class="grid"><div><label>Впевненість</label><select data-k="confidence_actual"><option value="">—</option><option>LOW</option><option>MED</option><option>HIGH</option></select></div><div style="grid-column:span 2"><label>Примітка без згадок PDF/Excel/експерта</label><input data-k="notes" value="${{esc(r.notes)}}"></div></div></section>`).join('')||'<p>Черга порожня — завершених заморожених прогнозів без outcome немає.</p>';
document.querySelectorAll('.row').forEach((box)=>{{const r=rows[+box.dataset.i]; box.querySelectorAll('[data-k]').forEach(el=>{{if(r[el.dataset.k])el.value=r[el.dataset.k]; el.addEventListener('change',()=>{{r[el.dataset.k]=el.value;if(el.dataset.k==='actual_score')r.actual_class=labels[el.value]||'';}});}});}});
const csvCell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
document.getElementById('save').onclick=()=>{{document.querySelectorAll('.row').forEach(box=>box.querySelectorAll('[data-k]').forEach(el=>rows[+box.dataset.i][el.dataset.k]=el.value)); rows.forEach(r=>r.actual_class=labels[r.actual_score]||r.actual_class||''); const text='\ufeff'+fields.map(csvCell).join(',')+'\r\n'+rows.map(r=>fields.map(k=>csvCell(r[k])).join(',')).join('\r\n')+'\r\n'; const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{{type:'text/csv;charset=utf-8'}}));a.download='OUTCOME_INTAKE_QUEUE_v1.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);document.getElementById('status').textContent='CSV створено. Замініть ним файл у outputs/data_control.';}};
</script></main></body></html>"""
    FORM.write_text(page, encoding="utf-8")
    status = {
        "schema": "outcome_intake_form_status_v1",
        "generated_at": generated,
        "pending_rows": len(rows),
        "form": str(FORM.relative_to(ROOT)).replace("\\", "/"),
        "queue": str(QUEUE.relative_to(ROOT)).replace("\\", "/"),
        "automatic_values": False,
        "score_effect": 0,
        "production_change": False,
        "rule": "The form only captures independent after-day evidence; values are never inferred from PDF/Excel/expert labels.",
    }
    STATUS.write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(status, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
