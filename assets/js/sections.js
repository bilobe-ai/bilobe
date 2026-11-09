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

  // ---------- People: all names on one line, or all of them on two ----------
  const people = document.querySelector('.people');
  const names = people ? Array.from(people.querySelectorAll('.person__name')) : [];
  if (names.length) {
    const fit = () => {
      people.classList.remove('people--names-split');
      // With the names on one line (nowrap per part), a name wider than its column means a wrap.
      const tooLong = names.some(n => n.scrollWidth > n.clientWidth + 1 || n.getClientRects().length > 1 ||
        n.querySelector('.person__last').offsetTop > n.querySelector('.person__first').offsetTop);
      people.classList.toggle('people--names-split', tooLong);
    };
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(people.querySelector('.people__groups') || people);
    else window.addEventListener('resize', fit);
  }

  // ---------- People: entrance, and natural colour at the centre of the screen on touch ----------
  const peopleLists = Array.from(document.querySelectorAll('.people__list'));
  if (peopleLists.length && 'IntersectionObserver' in window) {
    const enter = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        enter.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -2% 0px' });
    peopleLists.forEach(list => enter.observe(list));

    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) {
      const lit = new IntersectionObserver(entries => {
        entries.forEach(entry => entry.target.classList.toggle('is-lit', entry.isIntersecting));
      }, { rootMargin: '-38% 0px -38% 0px' });
      document.querySelectorAll('.person').forEach(p => lit.observe(p));
    }
  }

  // ---------- Contact: the canopy glow grows out of the corner as the section arrives ----------
  const contact = document.querySelector('.contact');
  if (contact && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let ticking = false;
    const rise = () => {
      ticking = false;
      const r = contact.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.85)));
      contact.style.setProperty('--rise', (1 - Math.pow(1 - p, 3)).toFixed(4));
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(rise); } }, { passive: true });
    window.addEventListener('resize', rise);
    rise();

    if ('IntersectionObserver' in window && contact.getBoundingClientRect().top > window.innerHeight) {
      contact.classList.add('is-pending');
      const io = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        contact.classList.remove('is-pending');
        io.disconnect();
      }, { rootMargin: '0px 0px -30% 0px' });
      io.observe(contact);
    }
  }

  // ---------- Partners: endless row ----------
  const track = document.querySelector('.partners__track');
  if (track && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const original = Array.from(track.children);
    const SPEED = 36;   // px per second
    const build = () => {
      track.classList.remove('is-rolling');
      Array.from(track.children).forEach(li => { if (!original.includes(li)) li.remove(); });
      const setWidth = track.scrollWidth;
      if (!setWidth) return;
      // Half of the track must be at least as wide as the screen: repeat the set, then double it.
      const copies = Math.max(1, Math.ceil(window.innerWidth / setWidth));
      const half = [];
      for (let k = 0; k < copies; k++) half.push(...original.map(li => (k === 0 ? li : li.cloneNode(true))));
      half.slice(original.length).forEach(li => track.appendChild(li));
      half.forEach(li => {
        const clone = li.cloneNode(true);
        track.appendChild(clone);
      });
      // Only the first set is announced; the repeats are decoration.
      Array.from(track.children).slice(original.length).forEach(li => {
        li.setAttribute('aria-hidden', 'true');
        li.querySelectorAll('img').forEach(img => { img.alt = ''; });
      });
      track.style.setProperty('--roll', `${(setWidth * copies) / SPEED}s`);
      track.classList.add('is-rolling');
    };
    let lastW = window.innerWidth;
    const imgs = original.flatMap(li => Array.from(li.querySelectorAll('img')));
    imgs.forEach(img => { img.loading = 'eager'; });
    build();
    window.addEventListener('resize', () => { if (Math.abs(window.innerWidth - lastW) > 40) { lastW = window.innerWidth; build(); } });
  }
})();
