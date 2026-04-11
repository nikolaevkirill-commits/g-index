# HANDOFF — Dashboard v73 (11.04.2026)

## Session: v70.8d → v70.9 → v73

### Final state:
- **SW cache:** `g-index-shell-v73`
- **Engine:** v17.0 (unchanged)
- **CANONICAL_SPEC:** v1.8 (unchanged)

### Changes v70.9 (hero enhancement):
1. Hero G: 26→36px, ring 90→110px
2. `#heroTrend` — ↑/↓/→ під рингом
3. `#heroActionCmd` — ДІЙ/ПЛАНУЙ/УПОВІЛЬНИСЬ/СТОП в hero
4. `#heroTopDrivers` — top 3 factors chips
5. `#gTopRow` hidden (duplicate)
6. `#decisionNarrative` collapsed in `<details>`

### Changes v73 (product layer):
7. **AI Explain** (`#aiExplainCard`) — headline + reasons chips + advice text
8. **Confidence Breakdown** (`#confidenceBreakdownCard`) — 4 bar rows + note
9. **Pattern Alert** (`#anomalyCard`) — rare/contrarian/storm detector
10. **Scenario Strip** (`#scenarioStripCard`) — 3-day pills + 27-day narrative
11. CSS: 2-column grid, responsive, pill/chip/bar styles
12. JS: `refreshV73Layer()` hooked into `syncV702UI()`
13. SW cache → `g-index-shell-v73`

### Architecture:
- v73 layer reads existing DOM (nowG, nowKp, nowTag, riskLabelNow, heroConfidence, threeQuick, trend27Summary)
- No new data sources, no model changes
- Pure presentation/insight layer

### Deploy:
```bash
cp index.html sw.js → deploy/ → git commit -m "v73: AI Explain + Confidence + Pattern Alert + Scenario" → git push
```

### Next session TODO:
- Interactive explainability (hover factor → ΔG highlight)
- Live timeline with NOW marker
- 27-day chart: vertical line, color zones, hover tooltip
- Performance audit (rAF loops)
- Remove dead code (old gaugeMoonWrap)
- Confidence breakdown: derive from real data freshness timestamps, not heuristic
