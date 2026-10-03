

// ── Safe localStorage — canonical block is above (v83) ──

// ── Mobile Bottom Nav ─────────────────────────────────────
const MNAV_SECTIONS = {
  now:      ['heroCard','daySentenceCard','decisionStrip','decisionTiming','impactBlock','astroGrid','wf3SignalSummary','profileBar','profileRec','mainGrid','swipeHint3','threeCard'],
  panch:    ['heroCard','daySentenceCard','decisionStrip','wf3SignalSummary','mainGrid','panchCard','swipeHint3','threeCard'],
  fcst:     ['threeCard','swipeHint27','twentysevenCard','backtestCard'],
  personal: ['heroCard','daySentenceCard','decisionStrip','personalCard']
};

function _isMobileProductViewport(){
  return window.innerWidth <= 700 || (window.innerWidth <= 900 && window.innerHeight <= 500);
}

function mnavGo(tab, scroll) {
  if (!_isMobileProductViewport()) return; // desktop — show all

  // Toggle active button
  document.querySelectorAll('.mnav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('mnav' + tab.charAt(0).toUpperCase() + tab.slice(1))?.classList.add('active');

  // Sections to show for each tab
  const show = MNAV_SECTIONS[tab] || [];

  // All managed section IDs
  const all = ['heroCard','astroGrid','wf3SignalSummary','profileBar','profileRec','mainGrid',
               'swipeHint3','threeCard','swipeHint27','twentysevenCard',
               'backtestCard','panchCard','personalCard','scienceBar'];

  all.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = show.includes(id) ? '' : 'none';
  });

  // swipe hints — show only for table sections
  if (tab === 'panch' || tab === 'now') {
    const h = document.getElementById('swipeHint3');
    if (h) h.style.display = 'flex';
  }
  if (tab === 'fcst') {
    const h = document.getElementById('swipeHint27');
    if (h) h.style.display = 'flex';
  }

  // Explicit mobile navigation must land on the selected content, not on Hero.
  if (scroll) {
    const targetId = tab === 'fcst' ? 'threeCard'
      : tab === 'panch' ? 'panchCard'
      : tab === 'personal' ? 'personalCard'
      : 'heroCard';
    requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }

  // Save state
  lsSet('mnavTab', tab);
}

// Init: restore last tab or default 'now'
function mnavInit() {
  if (!_isMobileProductViewport()) {
    // Desktop: show everything
    ['heroCard','astroGrid','opsGrid','decisionCard','radarCard','gTopRow','profileBar','profileRec','mainGrid','threeCard',
     'twentysevenCard','backtestCard','panchCard','scienceBar']
      .forEach(id => { const el = document.getElementById(id); if(el) el.style.display = ''; });
    return;
  }
  const saved = lsGet('mnavTab', 'now');
  mnavGo(saved);
}

// Re-init on resize — ігноруємо якщо змінилась тільки висота (iOS Safari address bar)
let _mnavResizeTimer;
let _mnavLastW = window.innerWidth;
window.addEventListener('resize', () => {
  const newW = window.innerWidth;
  if (newW === _mnavLastW) return; // тільки висота змінилась — ігноруємо
  _mnavLastW = newW;
  clearTimeout(_mnavResizeTimer);
  _mnavResizeTimer = setTimeout(mnavInit, 200);
});

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(mnavInit, 100); // after dashboard renders
  // fp293: notification deep links must reveal the actual target, not merely
  // load the page with a hidden/closed section.
  setTimeout(() => {
    try {
      const pushKind = new URLSearchParams(location.search).get('push');
      if (!pushKind) return;
      if (pushKind === 'storm') {
        const kpPanel = document.getElementById('kpHourlyPanel');
        if (kpPanel) {
          kpPanel.open = true;
          kpPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const summary = document.getElementById('kpHourlySummary');
          if (summary) {
            summary.setAttribute('tabindex', '-1');
            summary.focus({ preventScroll: true });
          }
        }
      } else {
        if (window.innerWidth <= 700) mnavGo('now');
        const hero = document.getElementById('heroCard');
        if (hero) {
          hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
          hero.setAttribute('tabindex', '-1');
          hero.focus({ preventScroll: true });
        }
      }
      const clean = location.pathname + location.hash;
      history.replaceState(null, '', clean);
    } catch(_e){ window.NRDiagnostics?.record('legacy.catch.245','recoverable'); }
  }, 900);
});
{const panel=document.getElementById('__cpPanel');if(panel)panel.textContent += '\nCP block-end @line20806';}
