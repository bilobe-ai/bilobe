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

  // ---------- In-page anchors ----------
  // The target lands right under the sticky header. Scrolling is done here rather than left to the
  // browser because content above the target can still change height after the jump (web fonts,
  // the About chapters, lazy images): Chrome corrects for that, Safari does not. After the scroll
  // the position is checked again and corrected.
  if (header) {
    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targetOf = hash => {
      if (!hash || hash === '#') return null;
      try { return document.getElementById(decodeURIComponent(hash.slice(1))); } catch (e) { return null; }
    };
    // Sections open with generous empty space. Instead of aligning the section's edge, align its
    // first line of text a short, fixed distance under the header. An explicit scroll-margin-top
    // on the target (capability statements) keeps the edge alignment it asks for.
    const GAP_WIDE = 48;
    const GAP_NARROW = 32;
    const firstTextTop = el => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: n => (n.nodeValue.trim() && n.parentElement.getClientRects().length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
      });
      const node = walker.nextNode();
      if (!node) return null;
      // Sticky ancestors (a pinned intro column, the About chapters) may currently be held under
      // the header; release them for the measurement so the text is read at its place in the flow.
      const released = [];
      for (let p = node.parentElement; p && p !== el.parentElement; p = p.parentElement) {
        if (getComputedStyle(p).position === 'sticky') { released.push([p, p.style.position]); p.style.position = 'static'; }
      }
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = range.getClientRects()[0];
      released.forEach(([p, v]) => { p.style.position = v; });
      return r ? r.top : null;
    };
    const destination = el => {
      const head = header.getBoundingClientRect().height;
      const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      const edge = el.getBoundingClientRect().top;
      let top = edge - margin;
      if (!margin) {
        const text = firstTextTop(el);
        const gap = window.innerWidth >= 900 ? GAP_WIDE : GAP_NARROW;
        if (text !== null && text > edge) top = Math.max(edge, text - gap);
      }
      return Math.max(0, Math.round(top + window.scrollY - head));
    };

    // An immediate jump in every browser: behavior 'instant' is not understood everywhere (older
    // Safari rejects it), and 'auto' would follow the page's CSS smooth scrolling.
    const jump = y => {
      const root = document.documentElement;
      const before = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, y);
      root.style.scrollBehavior = before;
    };

    // While an anchor scroll runs, html.is-anchoring and data-anchor-y (the scroll position it
    // will stop at) let scroll-driven sections (the About chapters) show the state they will have
    // on arrival instead of animating through everything in between.
    const root = document.documentElement;
    let settleTimer = null;
    const finish = () => {
      clearTimeout(settleTimer);
      if (!root.classList.contains('is-anchoring')) return;
      root.classList.remove('is-anchoring');
      delete root.dataset.anchorY;
      window.dispatchEvent(new Event('scroll'));
    };
    // The visitor takes over: stop correcting and let the sections animate again.
    ['wheel', 'touchstart', 'keydown'].forEach(t => window.addEventListener(t, finish, { passive: true }));

    const align = (el, smooth) => {
      const dest = destination(el);
      root.dataset.anchorY = String(dest);   // where the page will stop
      root.classList.add('is-anchoring');
      if (smooth && !reducedMotion()) {
        // A long way to go: cut to one screen before the target, then glide the rest, so the page
        // does not run through everything in between.
        const dist = dest - window.scrollY;
        const vh = window.innerHeight;
        if (Math.abs(dist) > vh * 1.2) jump(dest - Math.sign(dist) * vh);
        window.scrollTo({ top: destination(el), behavior: 'smooth' });
      } else {
        jump(dest);
      }
      // Re-check once the scroll has stopped, and again a little later for late layout changes.
      clearTimeout(settleTimer);
      let last = -1;
      let checks = 0;
      const settle = () => {
        const y = Math.round(window.scrollY);
        if (y !== last) { last = y; settleTimer = setTimeout(settle, 120); return; }
        const want = destination(el);
        root.dataset.anchorY = String(want);
        if (Math.abs(want - y) > 2) jump(want);
        if (++checks < 3) { last = -1; settleTimer = setTimeout(settle, 400); }
        else finish();
      };
      settleTimer = setTimeout(settle, 120);
    };

    document.addEventListener('click', e => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('a[href*="#"]');
      if (!a || a.target === '_blank' || a.hasAttribute('data-consent-open')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return;
      const el = targetOf(url.hash);
      if (!el) return;
      e.preventDefault();
      if (location.hash !== url.hash) {
        history.pushState(null, '', url.hash);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
      align(el, true);
    });

    // Arriving from another page with an address such as index.html#people.
    if (targetOf(location.hash)) {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      const arrive = () => { const el = targetOf(location.hash); if (el) align(el, false); };
      const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      if (document.readyState === 'complete') fontsReady.then(arrive);
      else window.addEventListener('load', () => fontsReady.then(() => requestAnimationFrame(arrive)), { once: true });
    }

    // Back and forward between anchors on the same page.
    window.addEventListener('popstate', () => { const el = targetOf(location.hash); if (el) align(el, false); });
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

  // ---------- Copy buttons: [data-copy-link] copies the page address, [data-copy-text] its own text ----------
  document.querySelectorAll('[data-copy-text]').forEach(btn => {
    const label = btn.querySelector('span');
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(btn.dataset.copyText); } catch (e) { return; }
      if (!label) return;
      const original = label.textContent;
      const it = document.documentElement.lang === 'it';
      label.textContent = (it && btn.dataset.copiedIt) || btn.dataset.copied || 'Copied';
      btn.classList.add('is-done');
      setTimeout(() => { label.textContent = original; btn.classList.remove('is-done'); }, 2000);
    });
  });

  // ---------- Copy link ----------
  document.querySelectorAll('[data-copy-link]').forEach(btn => {
    const label = btn.querySelector('span');
    const original = label ? label.textContent : '';
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(location.href); } catch (e) { return; }
      if (label) { label.textContent = btn.dataset.copied || 'Link copied'; setTimeout(() => { label.textContent = original; }, 2000); }
    });
  });
})();
