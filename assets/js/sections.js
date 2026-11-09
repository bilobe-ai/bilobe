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
})();
