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

// ── i18n ────────────────────────────────────────────────
const TRANSLATIONS = {
  en: {
    nav_features: 'Features', nav_partners: 'Partners', nav_products: 'Products',
    nav_insights: 'Insights', nav_about: 'About', nav_people: 'People',
    nav_contact: 'Contact', nav_book_demo: 'Book a demo',
    hero_title_1: 'Trustworthy.', hero_title_2: 'for Healthcare.',
    hero_sub: 'We build compliant, explainable AI that empowers clinicians, protects patients, and transforms healthcare delivery.',
    stat_research: 'Years of research', stat_founders: 'Expert founders', stat_partners: 'Research partners',
    features_label: 'Our Capabilities', features_h2: 'Built for the complexity\nof clinical data.',
    partners_label: 'Research Partners',
    feat1_h3: 'Handling Unstructured Data',
    feat1_p: 'Is your health institution data mostly unstructured — text, images, biosignals — but filled with valuable insights? Bilobe leverages modern AI to unlock what\'s hidden in clinical data.',
    feat2_h3: 'Trustworthy, Compliant & Secure',
    feat2_p: 'Our AI solutions are built with trustworthiness at their core — compliant with EU MDR, GDPR, and the AI Act, with data protection and explainability at every layer.',
    feat3_h3: 'Human-Centered Interaction',
    feat3_p: 'Clinical evaluation practices and human-AI collaboration designed to keep practitioners in control — achieving the best of both human expertise and AI synergy.',
    products_label: 'Our Products', products_h2: 'Purpose-built tools\nfor clinical practice.',
    ingredients_label: 'The Ingredients',
    orientamed_desc: 'An advanced conversational decision-support system grounded in medical guidelines. Deployable across multiple clinical scenarios — from triage support for general practitioners to treatment adherence monitoring in hospital wards.',
    ing_europe_title: 'Europe First', ing_europe_desc: 'Models hosted exclusively on European servers, with three sovereignty tiers: international cloud, European cloud, or fully on-premise.',
    ing_guideline_title: 'Guideline-Grounded, Human-Validated', ing_guideline_desc: 'Knowledge sourced exclusively from guidelines and procedures carefully curated and approved by our medical team.',
    ing_rag_title: 'Not Just a RAG', ing_rag_desc: 'Knowledge graphs built on established medical ontologies for retrieval guided by real clinical entity relationships — not just semantics.',
    elicita_desc: 'An AI agent system that elicits an eCRF in a data-driven way — turning a clinician\'s high-level description into a structured variable registry grounded in the actual content of clinical notes.',
    ing_human_title: 'For the Human, Through the Human', ing_human_desc: 'Starts with the clinician\'s description and a brief conversation, then loops back at every step so the user can edit variables or add new requirements.',
    ing_databased_title: 'Data-Based, Not Eminence-Based', ing_databased_desc: 'Fields emerge directly from real-world data, not from abstract theory. Ambiguity stays with the decision maker — not the data-entry person.',
    bionymizer_desc: 'A highly customizable pseudonymization system purpose-built for the biomedical context. Designed to run entirely on-premise, with no data ever transmitted outside your institution.',
    ing_yourdata_title: 'Your Data, Your Service', ing_yourdata_desc: 'Runs fully on-premise with zero data transmitted outside your infrastructure.',
    ing_plug_title: 'Plug & Play', ing_plug_desc: 'Drag and drop files directly into the interface for instant pseudonymization — no setup needed for one-off use.',
    ing_pipeline_title: 'Pipeline-Ready Middle Layer', ing_pipeline_desc: 'Connect it directly into your existing data streams as transparent middleware — it runs silently in the background.',
    insights_label: 'Insights', insights_h2: 'News, ideas &\nresearch updates.', insights_view_all: 'View all',
    tag_research: 'Research', tag_policy: 'Policy', tag_technology: 'Technology',
    insight1_h3: 'Explainable AI in Clinical Decision Support', insight1_p: 'How XAI techniques are reshaping clinician trust — and why transparency is the next frontier for medical AI adoption.',
    insight2_h3: 'EU AI Act: What It Means for HealthTech Startups', insight2_p: 'A practical guide to navigating the new EU AI Act requirements for high-risk medical AI systems — from risk classification to conformity assessment.',
    insight3_h3: 'ViraLingo: Predicting Viral Variants with Pan-Viral LLMs', insight3_p: 'Our collaboration with the University of Florida on a large language model trained across HIV, Hepatitis, and Coronavirus genomes to predict dangerous variants.',
    read_more: 'Read more',
    about_label: 'About Us', about_h2: 'Born from 40 years of biomedical informatics research.', about_location: 'Pavia, Italy',
    about_p1: 'Born in Pavia, Italy from the 40-year tradition of the Biomedical Informatics Lab "Mario Stefanelli", Bilobe is the melting pot of cutting-edge academic research and real-world implementation in healthcare.',
    about_p2: 'Our mission is to support healthcare practitioners, enhance patient outcomes, and improve healthcare organizations with innovative technology — turning complex, unstructured data into actionable insights through transparent and trustworthy solutions.',
    about_p3: 'By combining advanced algorithms with deep medical domain expertise, we make healthcare more efficient, accessible, and personalized.',
    people_label: 'Our Team', people_h2: 'The people behind',
    role_ceo: 'CEO, Co-Founder · Ph.D.', role_cto: 'CTO, Co-Founder · Ph.D.', role_cfo: 'CFO, Co-Founder · MEng',
    role_scientific: 'Scientific Consultant & Co-Founder · Ph.D.',
    contact_label: 'Contact Us', contact_title_1: 'Let\'s get', contact_title_2: 'in touch.',
    contact_intro: 'Whether you\'re looking to integrate AI into your clinical workflow, explore a research collaboration, or simply learn more about what we do — we\'d love to hear from you.',
    contact_service1: 'AI solutions for healthcare organizations', contact_service2: 'Regulatory-compliant deployments (EU MDR, GDPR, AI Act)',
    contact_service3: 'Research collaborations and partnerships', contact_service4: 'Custom NLP and XAI for clinical data',
    trust_response: 'Response within 2 business days', trust_confidential: 'Confidential by default',
    contact_card_label: 'Direct line', contact_compose: 'Compose email', contact_copy: 'Copy email',
    cookie_text: 'We use essential cookies to keep the site running and analytics cookies to understand how visitors use it.',
    cookie_policy_link: 'Cookie Policy', cookie_decline: 'Decline', cookie_accept: 'Accept all',
  },
  it: {
    nav_features: 'Caratteristiche', nav_partners: 'Partner', nav_products: 'Prodotti',
    nav_insights: 'Approfondimenti', nav_about: 'Chi Siamo', nav_people: 'Team',
    nav_contact: 'Contatti', nav_book_demo: 'Prenota una demo',
    hero_title_1: 'Affidabile.', hero_title_2: 'per la Sanità.',
    hero_sub: 'Costruiamo soluzioni AI conformi e spiegabili che potenziano i clinici, proteggono i pazienti e trasformano l\'erogazione delle cure.',
    stat_research: 'Anni di ricerca', stat_founders: 'Fondatori esperti', stat_partners: 'Partner di ricerca',
    features_label: 'Le Nostre Competenze', features_h2: 'Costruito per la complessità\ndei dati clinici.',
    partners_label: 'Partner di Ricerca',
    feat1_h3: 'Gestione dei Dati Non Strutturati',
    feat1_p: 'I dati della tua struttura sanitaria sono prevalentemente non strutturati — testi, immagini, biosegnali — ma ricchi di informazioni preziose? Bilobe sfrutta l\'IA moderna per estrarre ciò che è nascosto nei dati clinici.',
    feat2_h3: 'Affidabile, Conforme e Sicuro',
    feat2_p: 'Le nostre soluzioni AI sono costruite con la fiducia al centro — conformi a EU MDR, GDPR e AI Act, con protezione dei dati e spiegabilità a ogni livello.',
    feat3_h3: 'Interazione Centrata sull\'Uomo',
    feat3_p: 'Pratiche di valutazione clinica e collaborazione umano-IA progettate per mantenere i professionisti in controllo — combinando il meglio dell\'expertise umana e della sinergia con l\'IA.',
    products_label: 'I Nostri Prodotti', products_h2: 'Strumenti progettati\nper la pratica clinica.',
    ingredients_label: 'Gli Ingredienti',
    orientamed_desc: 'Un sistema avanzato di supporto decisionale conversazionale basato su linee guida mediche. Implementabile in diversi scenari clinici — dal supporto al triage per i medici di base al monitoraggio dell\'aderenza terapeutica nei reparti ospedalieri.',
    ing_europe_title: 'Europa Prima', ing_europe_desc: 'Modelli ospitati esclusivamente su server europei, con tre livelli di sovranità: cloud internazionale, cloud europeo, o completamente on-premise.',
    ing_guideline_title: 'Basato su Linee Guida, Validato Umanamente', ing_guideline_desc: 'Conoscenza proveniente esclusivamente da linee guida e procedure accuratamente curate e approvate dal nostro team medico.',
    ing_rag_title: 'Non Solo un RAG', ing_rag_desc: 'Grafi di conoscenza costruiti su ontologie mediche consolidate per un recupero guidato da relazioni reali tra entità cliniche — non solo dalla semantica.',
    elicita_desc: 'Un sistema di agenti AI che elicita un eCRF in modo data-driven — trasformando la descrizione ad alto livello di un clinico in un registro di variabili strutturato basato sul contenuto reale delle note cliniche.',
    ing_human_title: 'Per l\'Uomo, Attraverso l\'Uomo', ing_human_desc: 'Parte dalla descrizione del clinico e da una breve conversazione, poi torna ad ogni passaggio per permettere all\'utente di modificare le variabili o aggiungere nuovi requisiti.',
    ing_databased_title: 'Basato sui Dati, Non sull\'Eminenza', ing_databased_desc: 'I campi emergono direttamente dai dati reali, non dalla teoria astratta. L\'ambiguità rimane al decisore — non all\'addetto all\'inserimento dati.',
    bionymizer_desc: 'Un sistema di pseudonimizzazione altamente personalizzabile progettato per il contesto biomedico. Progettato per funzionare interamente on-premise, senza che i dati vengano mai trasmessi fuori dalla tua istituzione.',
    ing_yourdata_title: 'I Tuoi Dati, Il Tuo Servizio', ing_yourdata_desc: 'Funziona completamente on-premise senza che alcun dato venga trasmesso fuori dalla tua infrastruttura.',
    ing_plug_title: 'Plug & Play', ing_plug_desc: 'Trascina e rilascia i file direttamente nell\'interfaccia per una pseudonimizzazione istantanea — nessuna configurazione necessaria per un uso occasionale.',
    ing_pipeline_title: 'Middleware Pronto per la Pipeline', ing_pipeline_desc: 'Collegalo direttamente ai flussi di dati esistenti come middleware trasparente — funziona silenziosamente in background.',
    insights_label: 'Approfondimenti', insights_h2: 'Notizie, idee &\naggiornamenti dalla ricerca.', insights_view_all: 'Vedi tutti',
    tag_research: 'Ricerca', tag_policy: 'Normativa', tag_technology: 'Tecnologia',
    insight1_h3: 'IA Spiegabile nel Supporto alle Decisioni Cliniche', insight1_p: 'Come le tecniche XAI stanno ridefinendo la fiducia dei clinici — e perché la trasparenza è la prossima frontiera per l\'adozione dell\'IA medica.',
    insight2_h3: 'EU AI Act: Cosa Significa per le Startup HealthTech', insight2_p: 'Una guida pratica per navigare i nuovi requisiti dell\'EU AI Act per sistemi di IA medica ad alto rischio — dalla classificazione del rischio alla valutazione di conformità.',
    insight3_h3: 'ViraLingo: Previsione delle Varianti Virali con LLM Pan-Virali', insight3_p: 'La nostra collaborazione con l\'Università della Florida su un modello di linguaggio addestrato su genomi di HIV, Epatite e Coronavirus per prevedere varianti pericolose.',
    read_more: 'Leggi di più',
    about_label: 'Chi Siamo', about_h2: 'Nati da 40 anni di ricerca in informatica biomedica.', about_location: 'Pavia, Italia',
    about_p1: 'Nati a Pavia, Italia dalla tradizione quarantennale del Laboratorio di Informatica Biomedica "Mario Stefanelli", Bilobe è il punto di incontro tra la ricerca accademica all\'avanguardia e l\'implementazione pratica in sanità.',
    about_p2: 'La nostra missione è supportare i professionisti sanitari, migliorare gli esiti dei pazienti e potenziare le organizzazioni sanitarie con tecnologia innovativa — trasformando dati complessi e non strutturati in informazioni utili attraverso soluzioni trasparenti e affidabili.',
    about_p3: 'Combinando algoritmi avanzati con una profonda expertise nel dominio medico, rendiamo la sanità più efficiente, accessibile e personalizzata.',
    people_label: 'Il Nostro Team', people_h2: 'Le persone dietro',
    role_ceo: 'CEO, Co-Fondatore · Ph.D.', role_cto: 'CTO, Co-Fondatore · Ph.D.', role_cfo: 'CFO, Co-Fondatrice · MEng',
    role_scientific: 'Consulente Scientifico & Co-Fondatore · Ph.D.',
    contact_label: 'Contattaci', contact_title_1: 'Mettiamoci', contact_title_2: 'in contatto.',
    contact_intro: 'Che tu voglia integrare l\'IA nel tuo flusso di lavoro clinico, esplorare una collaborazione di ricerca, o semplicemente saperne di più su ciò che facciamo — ci farebbe piacere sentirti.',
    contact_service1: 'Soluzioni AI per organizzazioni sanitarie', contact_service2: 'Implementazioni conformi alla normativa (EU MDR, GDPR, AI Act)',
    contact_service3: 'Collaborazioni e partnership di ricerca', contact_service4: 'NLP e XAI personalizzati per dati clinici',
    trust_response: 'Risposta entro 2 giorni lavorativi', trust_confidential: 'Riservato per impostazione predefinita',
    contact_card_label: 'Contatto diretto', contact_compose: 'Scrivi email', contact_copy: 'Copia email',
    cookie_text: 'Utilizziamo cookie essenziali per mantenere il sito operativo e cookie analitici per capire come i visitatori lo utilizzano.',
    cookie_policy_link: 'Informativa sui Cookie', cookie_decline: 'Rifiuta', cookie_accept: 'Accetta tutti',
  }
};

function detectDefaultLang() {
  const saved = localStorage.getItem('bilobe-lang');
  if (saved) return saved;
  const preferred = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  return preferred.toLowerCase().startsWith('it') ? 'it' : 'en';
}

let currentLang = detectDefaultLang();

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('bilobe-lang', lang);
  document.documentElement.lang = lang;
  const t = TRANSLATIONS[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (t[key] !== undefined) el.textContent = t[key];
  });
  document.querySelectorAll('.lang-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.lang === lang);
  });
}

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

  if (hero) {
    const heroObserver = new IntersectionObserver(([entry]) => {
      navbar.classList.toggle('light', !entry.isIntersecting);
    }, { threshold: 0.05 });
    heroObserver.observe(hero);
  }

  // ── Language toggle ─────────────────────────────────────
  applyLanguage(currentLang);

  document.getElementById('lang-toggle').addEventListener('click', e => {
    const clicked = e.target.closest('.lang-option');
    if (clicked) applyLanguage(clicked.dataset.lang);
  });

  // ── Products dropdown ────────────────────────────────────
  const dropdownItem = document.querySelector('.nav-item-dropdown');
  if (dropdownItem) {
    dropdownItem.querySelectorAll('.nav-dropdown a').forEach(a => {
      a.addEventListener('click', () => dropdownItem.classList.remove('open'));
    });
    document.addEventListener('click', e => {
      if (!dropdownItem.contains(e.target)) dropdownItem.classList.remove('open');
    });
    dropdownItem.querySelector('.nav-dropdown-trigger').addEventListener('click', e => {
      if (window.innerWidth <= 768) return;
      e.preventDefault();
      dropdownItem.classList.toggle('open');
    });
  }

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

  if (banner && modal) {
    function hideBanner() { banner.hidden = true; }
    function showBanner() { banner.hidden = false; }
    function hideModal() { modal.hidden = true; }
    function showModal() { modal.hidden = false; }

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

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !modal.hidden) hideModal();
    });
  }

  // ── Copy email button ────────────────────────────────────
  const copyBtn = document.getElementById('copy-email-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText('info@bilobe.eu').then(() => {
        copyBtn.innerHTML = '<span class="material-symbols-outlined">check</span> ' + (currentLang === 'it' ? 'Copiato!' : 'Copied!');
        setTimeout(() => {
          copyBtn.innerHTML = '<span class="material-symbols-outlined">content_copy</span><span data-i18n="contact_copy">' + (currentLang === 'it' ? 'Copia email' : 'Copy email') + '</span>';
        }, 2000);
      });
    });
  }

});
