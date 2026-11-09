/* Site chrome shared by every page: header hairline on scroll, mobile menu,
   and the reading progress bar on article pages. */
(() => {
  'use strict';

  // ---------- Header: hairline once the page scrolls ----------
  const header = document.getElementById('site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ---------- Mobile menu ----------
  const burger = document.querySelector('.site-nav__burger');
  const siteNav = document.getElementById('site-nav');
  if (burger && siteNav) {
    const setOpen = open => {
      siteNav.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    burger.addEventListener('click', () => setOpen(!siteNav.classList.contains('open')));
    siteNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  }

  // ---------- Article reading progress ----------
  const progress = document.querySelector('.read-progress');
  const prose = document.querySelector('.prose');
  if (progress && prose) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = prose.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.3 - r.top) / Math.max(1, total)));
      progress.style.setProperty('--p', p.toFixed(4));
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // ---------- Copy link buttons ----------
  document.querySelectorAll('[data-copy-link]').forEach(btn => {
    const label = btn.querySelector('span');
    const original = label ? label.textContent : '';
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(location.href); } catch (e) { return; }
      if (label) { label.textContent = btn.dataset.copied || 'Link copied'; setTimeout(() => { label.textContent = original; }, 2000); }
    });
  });
})();
