/* Section behaviours for the redesigned site. */
(() => {
  'use strict';

  // ---------- Capabilities: reading focus and index ----------
  const items = Array.from(document.querySelectorAll('.capability'));
  if (items.length && 'IntersectionObserver' in window) {
    const links = Array.from(document.querySelectorAll('.capabilities__index a'));

    const setActive = id => {
      items.forEach(item => item.classList.toggle('is-active', item.id === id));
      links.forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + id ? 'true' : 'false'));
    };

    setActive(items[0].id);

    // The statement crossing the middle band of the viewport is the one being read.
    const focus = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: '-42% 0px -48% 0px' });

    // The canopy hairline draws once, when the statement arrives.
    const arrive = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-seen');
        arrive.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -25% 0px' });

    items.forEach(item => { focus.observe(item); arrive.observe(item); });
  }

  // ---------- Products: tabs and live stage ----------
  const products = document.querySelector('.products');
  if (products && window.BilobeDemos) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const items = Array.from(products.querySelectorAll('.products__item'));
    const screens = Object.fromEntries(Array.from(products.querySelectorAll('.products__screen')).map(el => [el.dataset.product, el]));
    const demos = Object.fromEntries(Object.entries(screens).map(([id, el]) => [id, window.BilobeDemos.mount(el, el.dataset.demo)]));
    const order = items.map(it => it.dataset.product);

    let current = order[0];
    let auto = !reduced.matches;     // products take turns until the visitor chooses one
    let visible = false;
    let elapsed = 0;
    let last = performance.now();

    const stopAuto = () => { auto = false; products.classList.add('is-manual'); };

    function select(id, byUser) {
      if (byUser) stopAuto();
      current = id;
      elapsed = 0;
      items.forEach(it => {
        const on = it.dataset.product === id;
        it.classList.toggle('is-active', on);
        it.querySelector('.products__tab').setAttribute('aria-expanded', String(on));
        it.style.setProperty('--p', 0);
      });
      Object.entries(screens).forEach(([k, el]) => el.classList.toggle('is-active', k === id));
      Object.entries(demos).forEach(([k, d]) => { if (k !== id) d.pause(); });
      if (visible) demos[id].restart();
    }

    items.forEach(it => it.querySelector('.products__tab').addEventListener('click', () => select(it.dataset.product, true)));

    // Links such as index.html#moss-anonymizer open that product.
    const fromHash = () => {
      const it = items.find(x => x.id && '#' + x.id === location.hash);
      if (it) select(it.dataset.product, true);
    };
    window.addEventListener('hashchange', fromHash);
    fromHash();

    function tick(now) {
      const dt = now - last;
      last = now;
      if (visible && auto) {
        if (demos[current].interacted) stopAuto();
        else {
          elapsed += dt;
          const p = elapsed / demos[current].cycle;
          items.find(it => it.dataset.product === current).style.setProperty('--p', Math.min(1, p));
          if (p >= 1) select(order[(order.indexOf(current) + 1) % order.length], false);
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    new IntersectionObserver(([entry]) => {
      const was = visible;
      visible = entry.isIntersecting;
      if (visible && !was) { last = performance.now(); demos[current].play(); }
      if (!visible) demos[current].pause();
    }, { threshold: 0.15 }).observe(products);
  }
})();
