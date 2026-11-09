/* Chapters: the vertical scroll moves a pinned section horizontally through full-screen panels.
 * Each panel pauses (HOLD) before the next slides in (MOVE). While a panel arrives its outline
 * mark draws itself (--draw), titles and marks move at different speeds (--d, parallax), and the
 * list items appear one by one. Stacked, static layout on portrait or narrow screens and with
 * prefers-reduced-motion. Markup: see assets/css/chapters.css.
 */
(() => {
  'use strict';

  const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const HOLD = 1;
  const MOVE = 0.7;
  const SCREEN_PER_UNIT = 0.8;   // page heights of scrolling per unit
  const staticMQ = window.matchMedia('(max-width: 899px), (max-aspect-ratio: 1/1), (prefers-reduced-motion: reduce)');

  function init(section) {
    const pin = section.querySelector('.chapters__pin');
    const track = section.querySelector('.chapters__track');
    const panels = Array.from(section.querySelectorAll('.chapters__panel'));
    const N = panels.length;
    if (!pin || !track || N < 2) return;
    const UNITS = N * HOLD + (N - 1) * MOVE;

    const nav = document.createElement('nav');
    nav.className = 'chapters__progress';
    nav.setAttribute('aria-label', section.dataset.navLabel || 'Chapters');
    nav.innerHTML = panels.map((p, i) => `<button type="button" data-i="${i}"><span${p.dataset.labelI18n ? ` data-i18n="${p.dataset.labelI18n}"` : ''}>${p.dataset.label || i + 1}</span><i></i></button>`).join('');
    pin.appendChild(nav);
    const steps = Array.from(nav.querySelectorAll('button'));

    let isStatic = false;
    const stickyTop = () => parseFloat(getComputedStyle(pin).top) || 0;
    // Space above the pinned story (section padding): it scrolls by before the story starts.
    const padTop = () => parseFloat(getComputedStyle(section).paddingTop) || 0;

    function position(u) {
      for (let i = 0; i < N; i++) {
        const holdStart = i * (HOLD + MOVE);
        const holdEnd = holdStart + HOLD;
        if (u <= holdEnd) return i;
        if (i < N - 1 && u < holdEnd + MOVE) return i + ease((u - holdEnd) / MOVE);
      }
      return N - 1;
    }

    function layout() {
      isStatic = staticMQ.matches;
      section.classList.toggle('chapters--static', isStatic);
      if (isStatic) {
        section.style.height = '';
        track.style.transform = '';
        panels.forEach(pn => {
          pn.style.removeProperty('--d');
          pn.style.setProperty('--draw', 1);
          pn.querySelectorAll('.chapters__list li').forEach(li => li.classList.add('is-in'));
        });
        return;
      }
      const pinH = pin.offsetHeight;
      section.style.height = `${padTop() + pinH + UNITS * pinH * SCREEN_PER_UNIT}px`;
      update();
    }

    function update() {
      if (isStatic) return;
      const total = section.offsetHeight - padTop() - pin.offsetHeight;
      // During an anchor scroll (chrome.js) show the panel of the arrival position, so the page
      // does not run horizontally through the story on its way to another section.
      const root = document.documentElement;
      const anchorY = root.classList.contains('is-anchoring') ? parseFloat(root.dataset.anchorY) : NaN;
      const sectionTop = section.getBoundingClientRect().top + padTop();
      const scrolled = stickyTop() - (Number.isNaN(anchorY) ? sectionTop : sectionTop + window.scrollY - anchorY);
      const u = clamp01(scrolled / total) * UNITS;
      const pos = Number.isNaN(anchorY) ? position(u) : Math.round(position(u));
      track.style.transform = `translate3d(${-pos * 100}%, 0, 0)`;
      panels.forEach((pn, k) => {
        const start = k * (HOLD + MOVE);
        pn.style.setProperty('--d', (k - pos).toFixed(4));
        pn.style.setProperty('--draw', clamp01((u - (start - MOVE)) / (MOVE + HOLD * 0.5)).toFixed(4));
        const local = clamp01((u - start) / HOLD);
        pn.querySelectorAll('.chapters__list li').forEach((li, j, all) => {
          li.classList.toggle('is-in', local > (j + 0.4) / (all.length + 1) || k < Math.floor(pos));
        });
      });
      const active = Math.round(pos);
      steps.forEach((b, i) => {
        b.setAttribute('aria-current', String(i === active));
        b.style.setProperty('--fill', clamp01(pos - i + 1).toFixed(3));
      });
    }

    steps.forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.i;
      if (isStatic) { panels[i].scrollIntoView({ behavior: 'smooth' }); return; }
      const total = section.offsetHeight - padTop() - pin.offsetHeight;
      const u = i * (HOLD + MOVE) + HOLD * 0.35;
      const y = window.scrollY + section.getBoundingClientRect().top + padTop() - stickyTop() + (u / UNITS) * total;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }));

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; update(); });
    }, { passive: true });
    window.addEventListener('resize', layout);
    if (staticMQ.addEventListener) staticMQ.addEventListener('change', layout);
    layout();
  }

  document.querySelectorAll('.chapters').forEach(init);
})();
