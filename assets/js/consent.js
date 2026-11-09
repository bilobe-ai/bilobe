/* Cookie consent, shared by every page.
 *
 * DISABLED: the site sets no cookies and loads no analytics, so under the Italian Garante's
 * guidelines (June 2021) no banner is needed. Set ENABLED to true only together with a
 * non-technical tool (for example Google Analytics), and update privacy.html at the same time.
 *
 * Preview while disabled: add ?consent=preview to any page address.
 *
 * Rules followed (Garante, Linee guida cookie 2021):
 * - Accept and Reject have the same weight; closing the banner with the X counts as Reject.
 * - Nothing non-technical runs before consent. Scripts that need consent are written as
 *     <script type="text/plain" data-consent="analytics" src="..."></script>
 *   and are activated only after Accept.
 * - The choice is stored for 6 months, then the banner asks again.
 * - Any element with [data-consent-open] reopens the banner (the footer's "Cookie settings").
 */
(() => {
  'use strict';

  const ENABLED = false;
  const KEY = 'bilobe-consent';
  const MAX_AGE = 1000 * 60 * 60 * 24 * 183;   // six months

  const preview = /[?&]consent=preview\b/.test(location.search);
  if (!ENABLED && !preview) return;

  const inArticle = /\/articles\//.test(location.pathname);
  const privacyHref = (inArticle ? '../' : '') + 'privacy.html';

  const TEXT = {
    en: {
      title: 'Your privacy',
      body: 'We would like to use analytics cookies to understand how visitors use this site. They are off unless you accept. The site works the same either way.',
      more: 'Privacy & cookies',
      accept: 'Accept',
      reject: 'Reject',
      close: 'Close and reject',
      region: 'Cookie consent'
    },
    it: {
      title: 'La tua privacy',
      body: 'Vorremmo usare cookie analitici per capire come i visitatori usano questo sito. Restano disattivati se non li accetti. Il sito funziona allo stesso modo in entrambi i casi.',
      more: 'Privacy e cookie',
      accept: 'Accetta',
      reject: 'Rifiuta',
      close: 'Chiudi e rifiuta',
      region: 'Consenso ai cookie'
    }
  };
  const lang = () => (document.documentElement.lang === 'it' ? 'it' : 'en');

  // ---------- Stored choice ----------
  const read = () => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      if (v && typeof v.analytics === 'boolean' && Date.now() - v.date < MAX_AGE) return v;
    } catch (e) { /* storage unavailable or corrupted: ask again */ }
    return null;
  };
  const write = analytics => {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, analytics, date: Date.now() })); } catch (e) { /* keep the choice for this page only */ }
  };

  // ---------- Scripts that wait for consent ----------
  const activate = () => {
    document.querySelectorAll('script[type="text/plain"][data-consent="analytics"]').forEach(old => {
      const s = document.createElement('script');
      Array.from(old.attributes).forEach(a => { if (a.name !== 'type') s.setAttribute(a.name, a.value); });
      s.text = old.text;
      old.replaceWith(s);
    });
  };

  // ---------- Banner ----------
  let banner = null;

  function render() {
    const t = TEXT[lang()];
    banner.setAttribute('aria-label', t.region);
    banner.innerHTML = `
      <div class="wrap consent__inner">
        <div class="consent__text">
          <p class="consent__title" id="consent-title">${t.title}</p>
          <p class="consent__body">${t.body} <a href="${privacyHref}">${t.more}</a></p>
        </div>
        <div class="consent__actions">
          <button type="button" class="btn btn--pill consent__btn" data-choice="reject">${t.reject}</button>
          <button type="button" class="btn btn--pill consent__btn" data-choice="accept">${t.accept}</button>
        </div>
        <button type="button" class="consent__close" data-choice="reject" aria-label="${t.close}">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>`;
  }

  function open() {
    if (!banner) {
      banner = document.createElement('section');
      banner.className = 'consent';
      banner.setAttribute('aria-labelledby', 'consent-title');
      render();
      banner.addEventListener('click', e => {
        const b = e.target.closest('[data-choice]');
        if (!b) return;
        const ok = b.dataset.choice === 'accept';
        if (!preview) write(ok);
        if (ok && !preview) activate();
        close();
      });
      document.body.appendChild(banner);
      new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }
    banner.hidden = false;
    requestAnimationFrame(() => banner.classList.add('is-open'));
  }

  function close() {
    if (!banner) return;
    banner.classList.remove('is-open');
    const done = () => { banner.hidden = true; };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) done();
    else setTimeout(done, 400);
  }

  window.BilobeConsent = { open, get: read };

  document.querySelectorAll('[data-consent-open]').forEach(el => {
    el.hidden = false;
    el.addEventListener('click', e => { e.preventDefault(); open(); });
  });

  const saved = preview ? null : read();
  if (saved && saved.analytics) activate();
  if (!saved) open();
})();
