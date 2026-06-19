// ── h2 pixel-scramble: on-view (once) + per-word hover ──
// Set to true to re-enable title scramble animations.
const TITLE_ANIMATIONS_ENABLED = false;

(function () {
  const GLYPHS = '■□▪▫●▮▯▰▱•';
  const STEP = 18;

  function rand() {
    return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }

  // Collect non-empty text nodes from an element
  function textNodes(el) {
    const list = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = walker.nextNode())) {
      if (n.nodeValue.trim()) list.push({ node: n, original: n.nodeValue });
    }
    return list;
  }

  // Animate nodes from scrambled → revealed over `duration` ms.
  // Returns a cancel function.
  function scramble(nodes, duration) {
    let timer = null;
    function restore() {
      clearTimeout(timer);
      nodes.forEach(({ node, original }) => { node.nodeValue = original; });
    }
    const t0 = Date.now();
    function tick() {
      const p = Math.min((Date.now() - t0) / duration, 1);
      nodes.forEach(({ node, original }) => {
        node.nodeValue = original.split('').map((ch, i) => {
          if (ch === ' ' || ch === '\n') return ch;
          return i / original.length < p ? ch : rand();
        }).join('');
      });
      if (p < 1) timer = setTimeout(tick, STEP);
      else restore();
    }
    tick();
    return restore;
  }

  // Wrap every word in a text node (preserving sibling elements) with a span
  function wrapWords(el) {
    Array.from(el.childNodes).forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = child.nodeValue.split(/(\s+)/);
        if (parts.length <= 1) return;
        const frag = document.createDocumentFragment();
        parts.forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
          } else {
            const span = document.createElement('span');
            span.className = 'h2-word';
            span.textContent = part;
            frag.appendChild(span);
          }
        });
        el.replaceChild(frag, child);
      } else if (child.nodeType === Node.ELEMENT_NODE && !child.classList.contains('h2-word')) {
        wrapWords(child);
      }
    });
  }

  document.querySelectorAll('h2').forEach(h2 => {
    wrapWords(h2);

    let cancelInitial = null;

    if (TITLE_ANIMATIONS_ENABLED) {
      // Per-word hover
      h2.querySelectorAll('.h2-word').forEach(word => {
        let cancelWord = null;
        word.addEventListener('mouseenter', () => {
          if (cancelInitial) { cancelInitial(); cancelInitial = null; }
          if (cancelWord) cancelWord();
          cancelWord = scramble(textNodes(word), 180);
        });
        word.addEventListener('mouseleave', () => {
          if (cancelWord) { cancelWord(); cancelWord = null; }
        });
      });

      // First-view animation (once, after reveal completes)
      let fired = false;
      const io = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !fired) {
          fired = true;
          io.unobserve(h2);
          setTimeout(() => {
            cancelInitial = scramble(textNodes(h2), 450);
          }, 500);
        }
      }, { threshold: 0.5 });
      io.observe(h2);
    }
  });
})();

// ── Hero particle network ────────────────────────────────
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const LINK_DIST = 160;
  const MOUSE_RADIUS = 200;
  const SPEED = 0.35;
  const particles = [];
  const mouse = { x: null, y: null };

  function particleCount() {
    return Math.min(Math.floor((canvas.width * canvas.height) / 7500), 145);
  }

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    particles.length = 0;
    for (let i = 0; i < particleCount(); i++) particles.push(new Particle());
  }

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * SPEED;
      this.vy = (Math.random() - 0.5) * SPEED;
      this.r = Math.random() * 1.4 + 0.5;
    }
    update() {
      // Soft wall bounce
      if (this.x <= 0 || this.x >= canvas.width) this.vx *= -1;
      if (this.y <= 0 || this.y >= canvas.height) this.vy *= -1;

      // Mouse repulsion
      if (mouse.x !== null) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = ((MOUSE_RADIUS - dist) / MOUSE_RADIUS) * 0.025;
          this.vx += (dx / dist) * force;
          this.vy += (dy / dist) * force;
          const spd = Math.hypot(this.vx, this.vy);
          if (spd > 1.8) { this.vx = (this.vx / spd) * 1.8; this.vy = (this.vy / spd) * 1.8; }
        }
      }

      this.x += this.vx;
      this.y += this.vy;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fill();
    }
  }

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      const pi = particles[i];

      // Particle–particle links
      for (let j = i + 1; j < particles.length; j++) {
        const pj = particles[j];
        const dist = Math.hypot(pi.x - pj.x, pi.y - pj.y);
        if (dist < LINK_DIST) {
          const alpha = (1 - dist / LINK_DIST) * 0.28;
          ctx.beginPath();
          ctx.moveTo(pi.x, pi.y);
          ctx.lineTo(pj.x, pj.y);
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }

      // Particle–mouse links (teal accent)
      if (mouse.x !== null) {
        const dist = Math.hypot(pi.x - mouse.x, pi.y - mouse.y);
        if (dist < MOUSE_RADIUS) {
          const alpha = (1 - dist / MOUSE_RADIUS) * 0.7;
          ctx.beginPath();
          ctx.moveTo(pi.x, pi.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(13,195,161,${alpha})`;
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawConnections();
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  }

  // Track mouse on the hero section, not the canvas (canvas has pointer-events:none)
  const hero = document.getElementById('hero');
  hero.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  hero.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });

  window.addEventListener('resize', resize);
  resize();
  animate();
})();

document.addEventListener('DOMContentLoaded', () => {

  // ── Scroll reveal ───────────────────────────────────────
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // ── Navbar: switch to light when leaving dark hero ──────
  const navbar = document.getElementById('navbar');
  const hero = document.getElementById('hero');

  const heroObserver = new IntersectionObserver(([entry]) => {
    navbar.classList.toggle('light', !entry.isIntersecting);
  }, { threshold: 0.05 });

  heroObserver.observe(hero);

  // ── Mobile nav ──────────────────────────────────────────
  const burger = document.querySelector('.nav-burger');
  const navLinks = document.querySelector('.nav-links');

  burger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });

  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });

  // ── Cookie consent ──────────────────────────────────────
  const banner = document.getElementById('cookie-banner');
  const modal = document.getElementById('cookie-modal');
  const backdrop = document.getElementById('cookie-modal-backdrop');

  function hideBanner() { banner.hidden = true; }
  function showBanner() { banner.hidden = false; }
  function hideModal() { modal.hidden = true; }
  function showModal() { modal.hidden = false; }

  // Show banner only if consent not yet recorded
  if (!localStorage.getItem('cookie-consent')) showBanner();

  document.getElementById('cookie-accept').addEventListener('click', () => {
    localStorage.setItem('cookie-consent', 'accepted');
    hideBanner();
  });

  document.getElementById('cookie-decline').addEventListener('click', () => {
    localStorage.setItem('cookie-consent', 'declined');
    hideBanner();
  });

  document.getElementById('open-cookie-policy').addEventListener('click', showModal);
  document.getElementById('close-cookie-modal').addEventListener('click', hideModal);
  backdrop.addEventListener('click', hideModal);

  document.getElementById('modal-cookie-accept').addEventListener('click', () => {
    localStorage.setItem('cookie-consent', 'accepted');
    hideModal(); hideBanner();
  });

  document.getElementById('modal-cookie-decline').addEventListener('click', () => {
    localStorage.setItem('cookie-consent', 'declined');
    hideModal(); hideBanner();
  });

  // Close modal on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) hideModal();
  });

  // ── Copy email button ────────────────────────────────────
  const copyBtn = document.getElementById('copy-email-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText('info@bilobe.ai').then(() => {
        copyBtn.innerHTML = '<span class="material-symbols-outlined">check</span> Copied!';
        setTimeout(() => {
          copyBtn.innerHTML = '<span class="material-symbols-outlined">content_copy</span> Copy email';
        }, 2000);
      });
    });
  }

});
