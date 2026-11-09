/* Live product demos: small simulated interfaces that show what each product does.
 * All content is synthetic and illustrative (no real patients, no real clinicians).
 *
 *   const demo = BilobeDemos.mount(element, 'moss' | 'fireweed' | 'mangrove');
 *   demo.play(); demo.pause(); demo.restart(); demo.cycle  // ms of one autoplay loop
 *
 * Autoplay loops until the visitor interacts; then the demo stays where they left it.
 * prefers-reduced-motion: the final state, no autoplay, interactions still work.
 */
(() => {
  'use strict';

  // The logo sits in each interface's header (brand: tagline-free logo, at least 96px wide).
  const script = document.currentScript;
  const LOGO = new URL('../logos/bilobe-logo-no-tagline.svg', script ? script.src : location.href).href;

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STOP = Symbol('stop');

  // A sleep that respects pause; it rejects when the loop that called it has been replaced
  // (restart, or the visitor took over). rAF also pauses in background tabs.
  function sleep(ms, ctl) {
    const gen = ctl.gen;
    return new Promise((resolve, reject) => {
      let left = ms;
      let last = performance.now();
      function tick(now) {
        if (ctl.gen !== gen) return reject(STOP);
        if (!ctl.paused) left -= now - last;
        last = now;
        if (left <= 0) resolve(); else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  const ICON = {
    lock: '<svg class="dw-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    file: '<svg class="dw-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    arrow: '<svg class="dw-icon dw-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    check: '<svg class="dw-icon dw-icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg>',
    book: '<svg class="dw-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/></svg>',
  };

  function windowChrome(title, right = '') {
    return `<div class="dw__bar"><img class="dw__logo" src="${LOGO}" alt="Bilobe" width="96" height="26">
      <span class="dw__sep" aria-hidden="true"></span><span class="dw__title">${title}</span>${right}</div>`;
  }

  // ---------------------------------------------------------------- Moss
  function moss(root, ctl) {
    const pii = (cat, original, pseudo) =>
      `<span class="pii" data-cat="${cat}"><span class="pii__o">${original}</span><span class="pii__p">${pseudo}</span></span>`;
    root.innerHTML = `
      <div class="dw dw--moss">
        ${windowChrome(`${ICON.file}<span>discharge_summary_0417.txt</span>`, `<span class="dw__badge">${ICON.lock}On-premise</span>`)}
        <div class="moss__policy" role="group" aria-label="Categories to pseudonymize">
          <span class="moss__policy-label">Pseudonymize</span>
          <button type="button" class="dchip is-on" data-cat="name" aria-pressed="true">Names</button>
          <button type="button" class="dchip is-on" data-cat="date" aria-pressed="true">Dates</button>
          <button type="button" class="dchip is-on" data-cat="place" aria-pressed="true">Places</button>
          <button type="button" class="dchip is-on" data-cat="contact" aria-pressed="true">Contacts</button>
          <button type="button" class="dchip is-on" data-cat="id" aria-pressed="true">IDs</button>
        </div>
        <div class="moss__doc">
          <p>${pii('name', 'Giulia Marchetti', 'PATIENT_01')}, born ${pii('date', '14/03/1961', 'DATE_01')}, was admitted to
          ${pii('place', 'Ospedale Riva Verde', 'HOSPITAL_01')} on ${pii('date', '18/02/2024', 'DATE_02')} with chest pain
          and shortness of breath.</p>
          <p>Coronary angiography showed a 70% stenosis of the right coronary artery, treated with a drug-eluting stent.
          Discharged on day 4 in stable condition.</p>
          <p>Record no. ${pii('id', 'PV-2231-884', 'ID_01')} · Contact ${pii('contact', '+39 0382 555 0198', 'PHONE_01')}<br>
          Attending physician ${pii('name', 'Dr Paolo Ferri', 'CLINICIAN_01')}</p>
        </div>
        <div class="dw__foot">
          <span>${ICON.lock}0 bytes sent outside your network</span>
          <span class="moss__count"><b>0</b> of 7 identifiers replaced</span>
        </div>
      </div>`;

    const spans = Array.from(root.querySelectorAll('.pii'));
    const chips = Array.from(root.querySelectorAll('.dchip'));
    const count = root.querySelector('.moss__count b');
    const on = new Set(chips.map(c => c.dataset.cat));

    const update = () => { count.textContent = String(spans.filter(s => s.classList.contains('is-masked')).length); };
    // Animate each value's width so the text closes up around the shorter pseudonym.
    const size = () => {
      spans.forEach(sp => {
        // layout widths: unaffected by transforms such as a scaled-down preview
        const o = sp.querySelector('.pii__o').offsetWidth;
        const ps = sp.querySelector('.pii__p').offsetWidth;
        if (!o || !ps) return;
        sp.style.setProperty('--wo', `${o}px`);
        sp.style.setProperty('--wp', `${ps}px`);
        sp.classList.add('is-sized');
      });
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(size)); else size();
    const apply = () => {
      spans.forEach(s => s.classList.toggle('is-masked', on.has(s.dataset.cat)));
      chips.forEach(c => { const v = on.has(c.dataset.cat); c.classList.toggle('is-on', v); c.setAttribute('aria-pressed', String(v)); });
      update();
    };
    const toggle = cat => { if (on.has(cat)) on.delete(cat); else on.add(cat); apply(); };

    chips.forEach(c => c.addEventListener('click', () => { ctl.takeOver(); toggle(c.dataset.cat); }));

    const finalState = () => { spans.forEach(sp => sp.classList.remove('is-scanning')); chips.forEach(c => on.add(c.dataset.cat)); apply(); };
    return {
      cycle: 15000,
      final: finalState,
      settle: finalState,
      async run() {
        chips.forEach(c => on.add(c.dataset.cat));
        spans.forEach(s => s.classList.remove('is-masked', 'is-scanning'));
        chips.forEach(c => { c.classList.add('is-on'); c.setAttribute('aria-pressed', 'true'); });
        update();
        await sleep(700, ctl);
        for (const s of spans) {
          s.classList.add('is-scanning');
          await sleep(260, ctl);
          s.classList.remove('is-scanning');
          s.classList.add('is-masked');
          update();
          await sleep(200, ctl);
        }
        await sleep(3200, ctl);
        // Customisable: keep dates visible, then mask them again.
        const dates = chips.find(c => c.dataset.cat === 'date');
        dates.classList.add('is-pressing');
        await sleep(220, ctl);
        dates.classList.remove('is-pressing');
        toggle('date');
        await sleep(2600, ctl);
        dates.classList.add('is-pressing');
        await sleep(220, ctl);
        dates.classList.remove('is-pressing');
        toggle('date');
        await sleep(3000, ctl);
      },
    };
  }

  // ------------------------------------------------------------ Fireweed
  function fireweed(root, ctl) {
    const FIELDS = [
      { name: 'AF after surgery', type: 'yes / no', f: 0.71, ev: 'On postoperative day 2 the patient developed <mark>atrial fibrillation</mark> with rapid ventricular response.' },
      { name: 'Days to onset', edited: 'Postoperative day of onset', type: 'integer, 0–30', f: 0.58, ev: 'Sinus rhythm until <mark>POD 3</mark>, when AF was first documented on telemetry.' },
      { name: 'Rhythm control', type: 'amiodarone · beta-blocker · cardioversion', f: 0.49, ev: 'Started on <mark>amiodarone</mark> 300 mg IV, then oral loading.' },
      { name: 'Anticoagulation at discharge', type: 'yes / no + drug', f: 0.44, ev: 'Discharged on <mark>apixaban 5 mg</mark> twice daily.' },
      { name: 'LVEF before surgery', type: '%, 10–80', f: 0.38, ev: 'Preoperative echocardiogram: <mark>LVEF 55%</mark>, no significant valve disease.' },
    ];
    const EXTRA = { name: 'Stroke within 30 days', type: 'yes / no + date', f: 0.07, ev: 'No neurological events during admission; <mark>no stroke</mark> at the 30-day visit.', added: true };

    root.innerHTML = `
      <div class="dw dw--fireweed">
        ${windowChrome('New study · <b>eCRF draft</b>', '<span class="dw__badge fw__agents"><i></i>Agents working</span>')}
        <div class="fw">
          <div class="fw__left">
            <div class="dmsg dmsg--user" data-step="ask"><span class="dmsg__who">Clinician</span>
              <p>I want to study atrial fibrillation after cardiac surgery.</p></div>
            <div class="fw__read" data-step="read">
              <span class="fw__read-label">Clinical notes read</span>
              <b class="fw__n">0</b>
              <div class="fw__bars" aria-hidden="true">${Array.from({ length: 28 }, (_, k) => `<i style="--i:${k}"></i>`).join('')}</div>
            </div>
            <div class="dmsg dmsg--user" data-step="add"><span class="dmsg__who">Clinician</span>
              <p>Add stroke within 30 days.</p></div>
            <div class="fw__evidence" aria-live="polite">
              <span class="fw__evidence-label">Found in the notes</span>
              <p class="fw__evidence-text">Point at a field to see where it comes from.</p>
            </div>
          </div>
          <div class="fw__form">
            <div class="fw__form-head"><span>Variables</span><span class="fw__count">0 fields</span></div>
            <ul class="fw__fields"></ul>
          </div>
        </div>
      </div>`;

    const list = root.querySelector('.fw__fields');
    const n = root.querySelector('.fw__n');
    const countEl = root.querySelector('.fw__count');
    const evText = root.querySelector('.fw__evidence-text');
    const steps = Object.fromEntries(Array.from(root.querySelectorAll('[data-step]')).map(el => [el.dataset.step, el]));
    const agents = root.querySelector('.fw__agents');

    function fieldEl(fd) {
      const li = document.createElement('li');
      li.innerHTML = `<button type="button" class="field">
          <span class="field__name"><span class="field__name-a">${fd.name}</span>${fd.edited ? `<span class="field__name-b">${fd.edited}</span>` : ''}</span>
          <span class="field__type">${fd.type}</span>
          <span class="field__freq"><i style="--f:${fd.f}"></i><span>${Math.round(fd.f * 100)}% of notes</span></span>
          ${fd.edited ? '<span class="field__tag field__tag--edit">Edited by clinician</span>' : ''}
          ${fd.added ? '<span class="field__tag">Added on request</span>' : ''}
        </button>`;
      const btn = li.firstElementChild;
      const show = () => {
        list.querySelectorAll('.field').forEach(f => f.classList.toggle('is-current', f === btn));
        evText.innerHTML = fd.ev;
        evText.parentElement.classList.add('is-on');
      };
      btn.addEventListener('mouseenter', () => { ctl.takeOver(); show(); });
      btn.addEventListener('focus', () => { ctl.takeOver(); show(); });
      btn.addEventListener('click', () => { ctl.takeOver(); show(); });
      return li;
    }

    const setCount = k => { countEl.textContent = `${k} field${k === 1 ? '' : 's'}`; };

    function reset() {
      list.innerHTML = '';
      Object.values(steps).forEach(s => s.classList.remove('is-in'));
      evText.parentElement.classList.remove('is-on');
      evText.textContent = 'Point at a field to see where it comes from.';
      n.textContent = '0';
      setCount(0);
      root.querySelector('.fw__read').classList.remove('is-reading');
      agents.classList.remove('is-on');
    }

    function addField(fd, show = true) {
      const li = fieldEl(fd);
      list.appendChild(li);
      if (show) requestAnimationFrame(() => li.classList.add('is-in')); else li.classList.add('is-in');
      setCount(list.children.length);
      return li;
    }

    return {
      cycle: 17000,
      final() {
        reset();
        Object.values(steps).forEach(s => s.classList.add('is-in'));
        n.textContent = '1,248';
        FIELDS.forEach(fd => addField(fd, false));
        list.children[1].querySelector('.field').classList.add('is-edited');
        addField(EXTRA, false);
      },
      async run() {
        reset();
        await sleep(500, ctl);
        steps.ask.classList.add('is-in');
        await sleep(900, ctl);
        steps.read.classList.add('is-in');
        root.querySelector('.fw__read').classList.add('is-reading');
        agents.classList.add('is-on');
        const t0 = performance.now();
        const total = 1248;
        let fi = 0;
        while (true) {
          const p = Math.min(1, (performance.now() - t0) / 3600);
          n.textContent = Math.round(total * (1 - Math.pow(1 - p, 2))).toLocaleString('en-GB');
          if (fi < FIELDS.length && p > 0.12 + fi * 0.17) {
            const li = addField(FIELDS[fi++]);
            const fd = FIELDS[fi - 1];
            evText.innerHTML = fd.ev;
            evText.parentElement.classList.add('is-on');
          }
          if (p >= 1 && fi >= FIELDS.length) break;
          await sleep(60, ctl);
        }
        root.querySelector('.fw__read').classList.remove('is-reading');
        await sleep(1400, ctl);
        // The clinician renames a variable.
        const second = list.children[1].querySelector('.field');
        second.classList.add('is-current');
        await sleep(700, ctl);
        second.classList.add('is-edited');
        await sleep(1500, ctl);
        second.classList.remove('is-current');
        // ...and asks for a new one.
        steps.add.classList.add('is-in');
        await sleep(1100, ctl);
        const extra = addField(EXTRA);
        extra.querySelector('.field').classList.add('is-current');
        evText.innerHTML = EXTRA.ev;
        await sleep(1200, ctl);
        agents.classList.remove('is-on');
        await sleep(3200, ctl);
      },
    };
  }

  // ------------------------------------------------------------ Mangrove
  function mangrove(root, ctl) {
    const ANSWER = 'Every 3 to 6 months, tailored to the person, until HbA1c is stable on unchanging therapy. Once HbA1c and treatment are stable, every 6 months.';
    root.innerHTML = `
      <div class="dw dw--mangrove">
        ${windowChrome('Mangrove Navigator', `<span class="mg__tiers" role="group" aria-label="Where the model runs">
            <button type="button" data-tier="0" aria-pressed="false">Cloud</button>
            <button type="button" data-tier="1" aria-pressed="true" class="is-on">EU cloud</button>
            <button type="button" data-tier="2" aria-pressed="false">On-premise</button></span>`)}
        <div class="mg">
          <div class="mg__chat">
            <div class="dmsg dmsg--user" data-step="q"><span class="dmsg__who">GP</span>
              <p>How often should HbA1c be measured in an adult with type 2 diabetes?</p></div>
            <div class="mg__path" data-step="path" aria-label="Concepts followed in the knowledge graph">
              <span>Type 2 diabetes</span>${ICON.arrow}<span>HbA1c measurement</span>${ICON.arrow}<span>Monitoring interval</span>
            </div>
            <div class="dmsg dmsg--ai" data-step="a"><span class="dmsg__who">Mangrove</span>
              <p><span class="mg__answer"></span> <button type="button" class="mg__cite" aria-expanded="false">1</button></p></div>
          </div>
          <aside class="mg__source" aria-label="Source">
            <span class="mg__source-label">${ICON.book}Source 1</span>
            <p class="mg__source-title">NICE NG28 · Type 2 diabetes in adults: blood glucose management</p>
            <p class="mg__source-text">Measure adults' HbA1c levels at: <mark>3 to 6-monthly intervals (tailored to individual needs), until the HbA1c is stable on unchanging therapy</mark>; <mark>6-monthly intervals once the HbA1c level and blood glucose lowering therapy are stable.</mark></p>
            <p class="mg__source-foot">${ICON.check}Curated and approved by the medical team</p>
          </aside>
        </div>
        <div class="dw__foot"><span>Illustrative example</span><span class="mg__where">Running in an EU cloud</span></div>
      </div>`;

    const steps = Object.fromEntries(Array.from(root.querySelectorAll('[data-step]')).map(el => [el.dataset.step, el]));
    const answer = root.querySelector('.mg__answer');
    const cite = root.querySelector('.mg__cite');
    const source = root.querySelector('.mg__source');
    const where = root.querySelector('.mg__where');
    const tiers = Array.from(root.querySelectorAll('.mg__tiers button'));
    const WHERE = ['Running in an international cloud', 'Running in an EU cloud', 'Running on your own servers'];

    const setSource = open => { source.classList.toggle('is-open', open); cite.setAttribute('aria-expanded', String(open)); };
    const setTier = i => {
      tiers.forEach((b, k) => { b.classList.toggle('is-on', k === i); b.setAttribute('aria-pressed', String(k === i)); });
      where.textContent = WHERE[i];
    };
    cite.addEventListener('click', () => { ctl.takeOver(); setSource(!source.classList.contains('is-open')); });
    tiers.forEach((b, i) => b.addEventListener('click', () => { ctl.takeOver(); setTier(i); }));

    function reset() {
      Object.values(steps).forEach(s => s.classList.remove('is-in'));
      root.querySelectorAll('.mg__path > *').forEach(el => el.classList.remove('is-in'));
      answer.textContent = '';
      cite.classList.remove('is-in');
      setSource(false);
      setTier(1);
    }

    function finalState() {
      reset();
      Object.values(steps).forEach(st => st.classList.add('is-in'));
      root.querySelectorAll('.mg__path > *').forEach(el => el.classList.add('is-in'));
      answer.textContent = ANSWER;
      cite.classList.add('is-in');
    }
    return {
      cycle: 16000,
      settle: finalState,
      final() {
        reset();
        Object.values(steps).forEach(s => s.classList.add('is-in'));
        root.querySelectorAll('.mg__path > *').forEach(el => el.classList.add('is-in'));
        answer.textContent = ANSWER;
        cite.classList.add('is-in');
        setSource(true);
      },
      async run() {
        reset();
        await sleep(500, ctl);
        steps.q.classList.add('is-in');
        await sleep(1000, ctl);
        steps.path.classList.add('is-in');
        for (const el of root.querySelectorAll('.mg__path > *')) { el.classList.add('is-in'); await sleep(230, ctl); }
        await sleep(500, ctl);
        steps.a.classList.add('is-in');
        const words = ANSWER.split(' ');
        for (let i = 1; i <= words.length; i++) { answer.textContent = words.slice(0, i).join(' '); await sleep(55, ctl); }
        cite.classList.add('is-in');
        await sleep(900, ctl);
        setSource(true);
        await sleep(4200, ctl);
        setTier(2);
        await sleep(1800, ctl);
        setTier(1);
        await sleep(2600, ctl);
      },
    };
  }

  const FACTORIES = { moss, fireweed, mangrove };

  function mount(el, type) {
    const ctl = {
      gen: 0,
      paused: true,
      user: false,
      settle: null,
      // The visitor acts: stop the autoplay where it is (or at its final state) and hand over.
      takeOver() {
        if (this.user) return;
        this.user = true;
        this.gen += 1;
        if (this.settle) this.settle();
      },
    };
    const demo = FACTORIES[type](el, ctl);
    ctl.settle = demo.settle || null;
    let active = -1;

    async function loop() {
      const my = ctl.gen;
      active = my;
      try {
        while (!ctl.user && ctl.gen === my) await demo.run();
      } catch (e) { if (e !== STOP) throw e; }
      if (active === my) active = -1;
    }

    if (reduced()) demo.final();

    return {
      cycle: demo.cycle,
      play() {
        if (reduced()) { demo.final(); return; }
        ctl.paused = false;
        if (active !== ctl.gen && !ctl.user) loop();
      },
      pause() { ctl.paused = true; },
      restart() {
        ctl.gen += 1;
        ctl.user = false;
        ctl.paused = false;
        if (reduced()) demo.final(); else loop();
      },
      get interacted() { return ctl.user; },
    };
  }

  window.BilobeDemos = { mount };
})();
