

// ── Safe localStorage — canonical block is above (v83) ──

// ── Mobile Bottom Nav ─────────────────────────────────────
const MNAV_COMPACT_LABELS = {
  uk: {today:'Сьог.',sky:'Небо',forecast:'Прогноз',calendar:'Календ.',more:'Ще'},
  en: {today:'Today',sky:'Sky',forecast:'Forecast',calendar:'Calendar',more:'More'},
  es: {today:'Hoy',sky:'Cielo',forecast:'Previsión',calendar:'Calend.',more:'Más'},
  fr: {today:'Auj.',sky:'Ciel',forecast:'Prévisions',calendar:'Calend.',more:'Plus'},
};
function mnavCompactLabels() {
  const locale = window.NRLocale;
  const copy = MNAV_COMPACT_LABELS[locale?.language] || MNAV_COMPACT_LABELS.uk;
  const largeText = Boolean(document.querySelector('#nrRoute-today [data-sr-large-text]'));
  document.querySelectorAll('#mobileNav [data-nav-compact]').forEach(label => {
    const short = copy[label.dataset.navCompact];
    if (label.textContent !== short) label.textContent = short;
    const button = label.parentElement;
    const source = button.dataset.navLabel;
    if (!source) return;
    const full = locale?.text(source) || source;
    const fullLabel = button.querySelector('[data-nav-full]');
    if (fullLabel.textContent !== full) fullLabel.textContent = full;
    if (largeText && short !== full) button.setAttribute('aria-label', short + ' ' + full);
    else button.removeAttribute('aria-label');
  });
}
window.addEventListener('nr:locale', mnavCompactLabels);
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
  mnavCompactLabels();
  const main = document.getElementById('mainContent');
  if (main) new MutationObserver(mnavCompactLabels).observe(main, {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-sr-large-text'],
  });
  setTimeout(mnavInit, 100); // after dashboard renders
  // fp293: notification deep links must reveal the actual target, not merely
  // load the page with a hidden/closed section.
  let attempts = 0;
  function revealNotification() {
    try {
      const pushKind = new URLSearchParams(location.search).get('push');
      if (!pushKind) return;
      // Consumer overview replaces the historical hero and Kp panel with a
      // separate visible surface. Never focus a hidden legacy descendant.
      if (typeof window.fp434Go === 'function') {
        const overview = document.querySelector('[data-overview="today"]');
        if (!overview) {
          if (++attempts < 100) setTimeout(revealNotification, 100);
          return;
        }
        window.fp434Go('today', false);
        const target = pushKind === 'storm'
          ? overview.querySelector('.nr-o-weather-top')
          : overview.querySelector('.nr-o-heading h1');
        if (!target) return;
        for(let parent=target.parentElement;parent&&parent!==overview;parent=parent.parentElement){if(parent.tagName==='DETAILS')parent.open=true;}
        target.scrollIntoView({ behavior: 'instant', block: 'center' });
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        const clean = new URL(location.href);
        clean.searchParams.delete('push');
        clean.hash = 'today';
        history.replaceState(null, '', clean.pathname + clean.search + clean.hash);
        return;
      }
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
      const clean = new URL(location.href);
      clean.searchParams.delete('push');
      history.replaceState(null, '', clean.pathname + clean.search + clean.hash);
    } catch(_e){ window.NRDiagnostics?.record('legacy.catch.245','recoverable'); }
  }
  setTimeout(revealNotification, 900);
});
{const panel=document.getElementById('__cpPanel');if(panel)panel.textContent += '\nCP block-end @line20806';}
