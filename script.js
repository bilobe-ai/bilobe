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

// ── i18n ────────────────────────────────────────────────
const TRANSLATIONS = {
  en: {
    nav_features: 'Features', nav_partners: 'Partners', nav_products: 'Products',
    nav_insights: 'Insights', nav_about: 'About', nav_people: 'People',
    nav_contact: 'Contact', nav_book_demo: 'Book a demo',
    hero_title_1: 'Trustworthy.', hero_title_2: 'For healthcare.',
    hero_sub: 'Compliant, explainable AI for clinicians, patient protection and healthcare delivery.',
    hero_cta: 'Explore our products',
    hero_scroll: 'Explore',
    stat_research: 'Years of research', stat_founders: 'Expert founders', stat_partners: 'Research partners',
    features_label: 'Our capabilities',
    features_h2_1: 'Built for the complexity', features_h2_2: 'of clinical data.',
    cap1_label: 'Data', cap1_title: 'Unstructured data, made usable.',
    cap1_body: 'Most clinical information lives in free text, images and biosignals. We build AI that reads it and returns structured data your teams can search, count and analyse.',
    cap1_detail: 'Clinical notes · Reports · Images · Biosignals',
    cap2_label: 'Trust', cap2_title: 'Trustworthy by design.',
    cap2_body: 'We design for the European rules from the start: the EU MDR, the GDPR and the AI Act. Data protection and explainability are part of every layer, not added at the end.',
    cap2_detail: 'Explainable outputs · Data protection · European hosting',
    cap3_label: 'People', cap3_title: 'Clinicians stay in control.',
    cap3_body: 'Our tools support clinical judgement; they do not replace it. We evaluate them with clinicians and design each interaction so that the practitioner makes the final decision.',
    cap3_detail: 'Clinical evaluation · Human oversight · Fits existing workflows',
    partners_label: 'Research Partners',
    feat1_h3: 'Handling Unstructured Data',
    feat1_p: 'Is your health institution data mostly unstructured — text, images, biosignals — but filled with valuable insights? Bilobe leverages modern AI to unlock what\'s hidden in clinical data.',
    feat2_h3: 'Trustworthy, Compliant & Secure',
    feat2_p: 'Our AI solutions are built with trustworthiness at their core — compliant with EU MDR, GDPR, and the AI Act, with data protection and explainability at every layer.',
    feat3_h3: 'Human-Centered Interaction',
    feat3_p: 'Clinical evaluation practices and human-AI collaboration designed to keep practitioners in control — achieving the best of both human expertise and AI synergy.',
    products_label: 'Our products',
    products_h2_1: 'Purpose-built tools', products_h2_2: 'for clinical practice.',
    products_note: 'Illustrative example with synthetic data. Try it: every element responds.',
    kicker_mangrove: 'Decision support', kicker_fireweed: 'Study design', kicker_moss: 'Data protection',
    mangrove_tagline: 'Your expert guide through medical knowledge',
    mangrove_desc: 'A conversational decision-support system grounded in medical guidelines. It works across clinical scenarios, from triage support for general practitioners to treatment adherence monitoring on hospital wards.',
    ing_europe_title: 'Europe first', ing_europe_desc: 'Hosted on European servers, with three sovereignty tiers: international cloud, European cloud or fully on-premise.',
    ing_guideline_title: 'Guideline-grounded, human-validated', ing_guideline_desc: 'Knowledge comes only from guidelines and procedures curated and approved by our medical team.',
    ing_rag_title: 'Not just a RAG', ing_rag_desc: 'Knowledge graphs built on established medical ontologies guide retrieval through real relationships between clinical entities, not text similarity alone.',
    fireweed_tagline: 'Helps you discover and define structure in your clinical notes',
    fireweed_desc: 'An AI agent system that drafts an eCRF from the data. It turns a clinician\'s high-level description into a structured variable registry, grounded in what the clinical notes actually contain.',
    ing_human_title: 'For the human, through the human', ing_human_desc: 'It starts from the clinician\'s description and a short conversation, then checks back at every step so variables can be edited or added.',
    ing_databased_title: 'Data-based, not eminence-based', ing_databased_desc: 'Fields come from real-world data, not abstract theory. Ambiguity stays with the decision maker, not with the person entering the data.',
    moss_tagline: 'Making biomedical data ready for secondary use and sharing',
    moss_desc: 'A highly customisable pseudonymization system built for biomedical data. It runs entirely on-premise: no data ever leaves your institution.',
    ing_yourdata_title: 'Your data, your service', ing_yourdata_desc: 'Runs fully on-premise. Nothing is transmitted outside your infrastructure.',
    ing_plug_title: 'Plug and play', ing_plug_desc: 'Drag files into the interface for immediate pseudonymization. One-off use needs no setup.',
    ing_pipeline_title: 'Pipeline-ready middle layer', ing_pipeline_desc: 'Connect it to your existing data streams as transparent middleware that runs in the background.',
    insights_label: 'Insights', insights_h2: 'News, ideas &\nresearch updates.', insights_view_all: 'View all',
    tag_research: 'Research', tag_policy: 'Policy', tag_technology: 'Technology',
    insight1_h3: 'Explainable AI in Clinical Decision Support', insight1_p: 'How XAI techniques are reshaping clinician trust — and why transparency is the next frontier for medical AI adoption.',
    insight2_h3: 'EU AI Act: What It Means for HealthTech Startups', insight2_p: 'A practical guide to navigating the new EU AI Act requirements for high-risk medical AI systems — from risk classification to conformity assessment.',
    insight3_h3: 'ViraLingo: Predicting Viral Variants with Pan-Viral LLMs', insight3_p: 'Our collaboration with the University of Florida on a large language model trained across HIV, Hepatitis, and Coronavirus genomes to predict dangerous variants.',
    read_more: 'Read more',
    about_label: 'About us',
    about_h2_1: 'Born from 40 years',
    about_h2_2: 'of biomedical informatics research.',
    about_intro: 'A company from Pavia that brings academic research into everyday clinical work.',
    about_scroll: 'Scroll',
    about_nav: 'Overview',
    about_origins_nav: 'Origins',
    about_origins_kicker: 'Origins',
    about_origins_name1: 'Born',
    about_origins_name2: 'in Pavia.',
    about_origins_tagline: 'Forty years of biomedical informatics behind us.',
    about_origins_desc: 'Bilobe grew out of the Biomedical Informatics Lab “Mario Stefanelli” in Pavia and its forty-year research tradition. We bring that research into real-world healthcare.',
    about_origins_li1_t: 'Pavia, Italy',
    about_origins_li1_d: 'Where Bilobe was born and where it has its home.',
    about_origins_li2_t: 'Biomedical Informatics Lab “Mario Stefanelli”',
    about_origins_li2_d: 'Four decades of research in biomedical informatics.',
    about_origins_li3_t: 'Research and practice',
    about_origins_li3_d: 'Academic research, put to work in real clinical settings.',
    about_mission_nav: 'Mission',
    about_mission_kicker: 'Mission',
    about_mission_name1: 'From data',
    about_mission_name2: 'to care.',
    about_mission_tagline: 'Complex data, turned into information people can act on.',
    about_mission_desc: 'Our mission is to support healthcare practitioners, improve patient outcomes and help healthcare organisations work better, with technology that is transparent and trustworthy.',
    about_mission_li1_t: 'Practitioners',
    about_mission_li1_d: 'Support for clinical decisions and everyday work.',
    about_mission_li2_t: 'Patients',
    about_mission_li2_d: 'Better outcomes, with their data protected.',
    about_mission_li3_t: 'Organisations',
    about_mission_li3_d: 'Unstructured data, made usable for care and research.',
    about_approach_nav: 'Approach',
    about_approach_kicker: 'Approach',
    about_approach_name1: 'Algorithms',
    about_approach_name2: 'and medicine.',
    about_approach_tagline: 'Advanced methods, guided by clinical knowledge.',
    about_approach_desc: 'We combine advanced algorithms with deep medical domain expertise, so that healthcare becomes more efficient, more accessible and more personal.',
    about_approach_li1_t: 'Advanced algorithms',
    about_approach_li1_d: 'Methods from current research in AI and biomedical informatics.',
    about_approach_li2_t: 'Medical expertise',
    about_approach_li2_d: 'Knowledge of clinical practice built into how each tool works.',
    people_label: 'Our team', people_h2_1: 'The people', people_h2_2: 'behind Bilobe.',
    people_founders: 'Founders', people_board: 'Scientific consultants',
    role_ceo: 'CEO, co-founder · Ph.D.', role_cto: 'CTO, co-founder · Ph.D.', role_cfo: 'CFO, co-founder · MEng',
    role_sci_f: 'Scientific consultant, co-founder · Ph.D.', role_sci_m: 'Scientific consultant, co-founder · Ph.D.',
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
    hero_title_1: 'Affidabile.', hero_title_2: 'Per la sanità.',
    hero_sub: 'AI conforme e spiegabile per i clinici, la tutela dei pazienti e l\'erogazione delle cure.',
    hero_cta: 'Esplora i nostri prodotti',
    hero_scroll: 'Scopri',
    stat_research: 'Anni di ricerca', stat_founders: 'Fondatori esperti', stat_partners: 'Partner di ricerca',
    features_label: 'Le nostre competenze',
    features_h2_1: 'Costruiti per la complessità', features_h2_2: 'dei dati clinici.',
    cap1_label: 'Dati', cap1_title: 'Dati non strutturati, resi utilizzabili.',
    cap1_body: 'Gran parte dell\'informazione clinica sta in testi liberi, immagini e biosegnali. Costruiamo AI che la legge e restituisce dati strutturati, che i vostri team possono cercare, contare e analizzare.',
    cap1_detail: 'Note cliniche · Referti · Immagini · Biosegnali',
    cap2_label: 'Fiducia', cap2_title: 'Affidabile per progetto.',
    cap2_body: 'Progettiamo fin dall\'inizio per le regole europee: EU MDR, GDPR e AI Act. Protezione dei dati e spiegabilità fanno parte di ogni livello, non vengono aggiunte alla fine.',
    cap2_detail: 'Output spiegabili · Protezione dei dati · Hosting europeo',
    cap3_label: 'Persone', cap3_title: 'Il clinico resta al comando.',
    cap3_body: 'I nostri strumenti supportano il giudizio clinico, non lo sostituiscono. Li valutiamo insieme ai clinici e progettiamo ogni interazione perché sia il professionista a prendere la decisione finale.',
    cap3_detail: 'Valutazione clinica · Supervisione umana · Integrazione nei flussi di lavoro',
    partners_label: 'Partner di Ricerca',
    feat1_h3: 'Gestione dei Dati Non Strutturati',
    feat1_p: 'I dati della tua struttura sanitaria sono prevalentemente non strutturati — testi, immagini, biosegnali — ma ricchi di informazioni preziose? Bilobe sfrutta l\'IA moderna per estrarre ciò che è nascosto nei dati clinici.',
    feat2_h3: 'Affidabile, Conforme e Sicuro',
    feat2_p: 'Le nostre soluzioni AI sono costruite con la fiducia al centro — conformi a EU MDR, GDPR e AI Act, con protezione dei dati e spiegabilità a ogni livello.',
    feat3_h3: 'Interazione Centrata sull\'Uomo',
    feat3_p: 'Pratiche di valutazione clinica e collaborazione umano-IA progettate per mantenere i professionisti in controllo — combinando il meglio dell\'expertise umana e della sinergia con l\'IA.',
    products_label: 'I nostri prodotti',
    products_h2_1: 'Strumenti progettati', products_h2_2: 'per la pratica clinica.',
    products_note: 'Esempio illustrativo con dati sintetici. Provalo: ogni elemento risponde.',
    kicker_mangrove: 'Supporto decisionale', kicker_fireweed: 'Disegno dello studio', kicker_moss: 'Protezione dei dati',
    mangrove_tagline: 'La tua guida esperta nella conoscenza medica',
    mangrove_desc: 'Un sistema conversazionale di supporto decisionale basato sulle linee guida mediche. Funziona in diversi scenari clinici, dal supporto al triage per i medici di medicina generale al monitoraggio dell\'aderenza terapeutica nei reparti ospedalieri.',
    ing_europe_title: 'Prima l\'Europa', ing_europe_desc: 'Ospitato su server europei, con tre livelli di sovranità: cloud internazionale, cloud europeo o completamente on-premise.',
    ing_guideline_title: 'Basato su linee guida, validato da persone', ing_guideline_desc: 'La conoscenza viene solo da linee guida e procedure selezionate e approvate dal nostro team medico.',
    ing_rag_title: 'Non solo un RAG', ing_rag_desc: 'Grafi di conoscenza costruiti su ontologie mediche consolidate guidano il recupero attraverso relazioni reali tra entità cliniche, non solo per somiglianza testuale.',
    fireweed_tagline: 'Ti aiuta a scoprire e definire la struttura nelle tue note cliniche',
    fireweed_desc: 'Un sistema di agenti AI che costruisce un eCRF a partire dai dati. Trasforma la descrizione di alto livello di un clinico in un registro strutturato di variabili, fondato su ciò che le note cliniche contengono davvero.',
    ing_human_title: 'Per le persone, attraverso le persone', ing_human_desc: 'Parte dalla descrizione del clinico e da una breve conversazione, poi torna da lui a ogni passaggio perché le variabili possano essere modificate o aggiunte.',
    ing_databased_title: 'Basato sui dati, non sull\'autorità', ing_databased_desc: 'I campi nascono dai dati reali, non da teorie astratte. L\'ambiguità resta a chi decide, non a chi inserisce i dati.',
    moss_tagline: 'Rende i dati biomedici pronti per il riuso secondario e la condivisione',
    moss_desc: 'Un sistema di pseudonimizzazione altamente personalizzabile, pensato per i dati biomedici. Funziona interamente on-premise: nessun dato lascia mai la tua struttura.',
    ing_yourdata_title: 'I tuoi dati, il tuo servizio', ing_yourdata_desc: 'Funziona completamente on-premise. Nulla viene trasmesso fuori dalla tua infrastruttura.',
    ing_plug_title: 'Pronto all\'uso', ing_plug_desc: 'Trascina i file nell\'interfaccia per pseudonimizzarli subito. Per un uso occasionale non serve alcuna configurazione.',
    ing_pipeline_title: 'Middleware pronto per la pipeline', ing_pipeline_desc: 'Collegalo ai flussi di dati esistenti come middleware trasparente, che lavora in background.',
    insights_label: 'Approfondimenti', insights_h2: 'Notizie, idee &\naggiornamenti dalla ricerca.', insights_view_all: 'Vedi tutti',
    tag_research: 'Ricerca', tag_policy: 'Normativa', tag_technology: 'Tecnologia',
    insight1_h3: 'IA Spiegabile nel Supporto alle Decisioni Cliniche', insight1_p: 'Come le tecniche XAI stanno ridefinendo la fiducia dei clinici — e perché la trasparenza è la prossima frontiera per l\'adozione dell\'IA medica.',
    insight2_h3: 'EU AI Act: Cosa Significa per le Startup HealthTech', insight2_p: 'Una guida pratica per navigare i nuovi requisiti dell\'EU AI Act per sistemi di IA medica ad alto rischio — dalla classificazione del rischio alla valutazione di conformità.',
    insight3_h3: 'ViraLingo: Previsione delle Varianti Virali con LLM Pan-Virali', insight3_p: 'La nostra collaborazione con l\'Università della Florida su un modello di linguaggio addestrato su genomi di HIV, Epatite e Coronavirus per prevedere varianti pericolose.',
    read_more: 'Leggi di più',
    about_label: 'Chi siamo',
    about_h2_1: 'Nati da 40 anni',
    about_h2_2: 'di ricerca in informatica biomedica.',
    about_intro: 'Un\'azienda di Pavia che porta la ricerca accademica nel lavoro clinico di ogni giorno.',
    about_scroll: 'Scorri',
    about_nav: 'Introduzione',
    about_origins_nav: 'Origini',
    about_origins_kicker: 'Origini',
    about_origins_name1: 'Nati',
    about_origins_name2: 'a Pavia.',
    about_origins_tagline: 'Quarant\'anni di informatica biomedica alle spalle.',
    about_origins_desc: 'Bilobe nasce dal Laboratorio di Informatica Biomedica “Mario Stefanelli” di Pavia e dalla sua tradizione di ricerca quarantennale. Portiamo quella ricerca nella sanità reale.',
    about_origins_li1_t: 'Pavia, Italia',
    about_origins_li1_d: 'Dove Bilobe è nata e dove ha sede.',
    about_origins_li2_t: 'Laboratorio di Informatica Biomedica “Mario Stefanelli”',
    about_origins_li2_d: 'Quattro decenni di ricerca in informatica biomedica.',
    about_origins_li3_t: 'Ricerca e pratica',
    about_origins_li3_d: 'Ricerca accademica messa al lavoro in contesti clinici reali.',
    about_mission_nav: 'Missione',
    about_mission_kicker: 'Missione',
    about_mission_name1: 'Dai dati',
    about_mission_name2: 'alla cura.',
    about_mission_tagline: 'Dati complessi, trasformati in informazioni su cui agire.',
    about_mission_desc: 'La nostra missione è supportare i professionisti sanitari, migliorare gli esiti dei pazienti e aiutare le organizzazioni sanitarie a funzionare meglio, con una tecnologia trasparente e affidabile.',
    about_mission_li1_t: 'Professionisti',
    about_mission_li1_d: 'Supporto alle decisioni cliniche e al lavoro di ogni giorno.',
    about_mission_li2_t: 'Pazienti',
    about_mission_li2_d: 'Esiti migliori, con i loro dati protetti.',
    about_mission_li3_t: 'Organizzazioni',
    about_mission_li3_d: 'Dati non strutturati resi utilizzabili per la cura e la ricerca.',
    about_approach_nav: 'Approccio',
    about_approach_kicker: 'Approccio',
    about_approach_name1: 'Algoritmi',
    about_approach_name2: 'e medicina.',
    about_approach_tagline: 'Metodi avanzati, guidati dalla conoscenza clinica.',
    about_approach_desc: 'Uniamo algoritmi avanzati a una profonda competenza nel dominio medico, perché la sanità diventi più efficiente, più accessibile e più personale.',
    about_approach_li1_t: 'Algoritmi avanzati',
    about_approach_li1_d: 'Metodi dalla ricerca attuale in AI e informatica biomedica.',
    about_approach_li2_t: 'Competenza medica',
    about_approach_li2_d: 'La conoscenza della pratica clinica integrata nel funzionamento di ogni strumento.',
    people_label: 'Il nostro team', people_h2_1: 'Le persone', people_h2_2: 'dietro Bilobe.',
    people_founders: 'Fondatori', people_board: 'Consulenti scientifici',
    role_ceo: 'CEO, co-fondatore · Ph.D.', role_cto: 'CTO, co-fondatore · Ph.D.', role_cfo: 'CFO, co-fondatrice · MEng',
    role_sci_f: 'Consulente scientifica, co-fondatrice · Ph.D.', role_sci_m: 'Consulente scientifico, co-fondatore · Ph.D.',
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
  document.querySelectorAll('.lang-switch [data-lang]').forEach(opt => {
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

  // ── Header: hairline once the page scrolls ─────────────
  const header = document.getElementById('site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ── Language toggle ─────────────────────────────────────
  applyLanguage(currentLang);

  document.getElementById('lang-toggle').addEventListener('click', e => {
    const clicked = e.target.closest('[data-lang]');
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
