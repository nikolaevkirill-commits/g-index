// Keep the TWA's policy boundary across same-origin legal-page navigation.
(function () {
  'use strict';
  const key = 'neborhythm.playChannel';
  let play = new URLSearchParams(location.search).get('channel') === 'play';
  try {
    play = play || sessionStorage.getItem(key) === 'play';
    if (play) sessionStorage.setItem(key, 'play');
  } catch (_) { /* Explicit links still carry the channel when storage is denied. */ }
  window.GINDEX_PLAY_CHANNEL = play;
  if (!play) return;
  const policy = document.createElement('meta');
  policy.httpEquiv = 'Content-Security-Policy';
  policy.content = "connect-src 'self' https://gindex-noaa-proxy.nikolaev-kirill.workers.dev https://services.swpc.noaa.gov https://kp.gfz.de https://sidc.be https://www.sidc.be https://corsproxy.io https://proxy.corsfix.com https://www.gi.alaska.edu https://www.timeanddate.com https://www.vaisnavacalendar.info https://ics.calendarlabs.com";
  document.head.appendChild(policy);
  document.documentElement.classList.add('play-channel');
  function preserve(link) {
    if (!link || !link.getAttribute('href')) return;
    const url = new URL(link.getAttribute('href'), location.href);
    if (url.origin !== location.origin || !/(?:\/|\/(?:index|privacy|terms|account-deletion)\.html)$/.test(url.pathname)) return;
    url.searchParams.set('channel', 'play');
    if (link.href !== url.href) link.href = url.href;
  }
  function decorate(root) {
    if (root.matches && root.matches('a[href]')) preserve(root);
    if (root.querySelectorAll) root.querySelectorAll('a[href]').forEach(preserve);
  }
  document.addEventListener('DOMContentLoaded', function () {
    decorate(document);
    new MutationObserver(records => records.forEach(record => {
      if (record.type === 'attributes') preserve(record.target);
      else record.addedNodes.forEach(decorate);
    })).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  }, { once: true });
})();
