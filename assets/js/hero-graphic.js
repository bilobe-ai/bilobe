/* Bilobe hero: "From text to data", live.
 *
 * A canvas port of website-kit/graphics/source/text_to_data.py (hero settings: 980 x 600,
 * split 0.52, row height 28, bars 8, ent_p 0.075) that keeps the graphic's rules:
 * plain text on the left that reaches a lime reading line, extracted values in four typed
 * columns marked by icons, a thin line from each value through the reading line to its column,
 * no words, no blur, fixed entity colours, nothing under the headline.
 *
 * What moves:
 * - The notes flow upward like a record being read. When a row reaches the reading level its
 *   entities take their colour, the value travels along its line, marks the reading line and
 *   lands in its column.
 * - Pointer: a soft reading lamp lifts the notes near the cursor; the row under the cursor is
 *   emphasised from note to cell; hovering a column isolates that entity type, click pins it.
 *   The flow slows down while the pointer is on the graphic; page scroll speeds it up.
 * - prefers-reduced-motion: no flow and no intro, a still frame that still answers the pointer.
 */
(() => {
  'use strict';

  const hero = document.querySelector('.hero');
  const box = hero && hero.querySelector('.hero__graphic');
  if (!box) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) { document.documentElement.classList.remove('js'); return; }
  box.appendChild(canvas);

  // ---------- Constants (graphic units: the 980 x 600 hero viewBox) ----------

  const SEED = 4;
  const G = { H: 600, table: 470.4, rowh: 28, y0: 70, bh: 8, x0: 24, colPad: 36, rulePad: 12, iconScale: 1.25 };
  const TYPES = ['dx', 'rx', 'lab', 'date'];             // diagnosis, medication, lab value, date
  const COLOR = { dx: '#8cd687', rx: '#30b092', lab: '#4a9be8', date: '#d6f7cf' };
  const CW = [0.78, 0.84, 0.66, 0.5];                      // cell width as a share of the column
  const WORDS = [12, 16, 22, 28, 34, 40, 48, 58, 70, 86];
  const LIME = '#8cd687';

  const SPEED = 0.42;          // rows per second
  const TRIGGER = 0.86;         // a row is read when it rises past this share of the height
  const READ_MS = 1500;        // one entity: colour, travel, land
  const STAGGER_MS = 140;      // between entities of the same row
  const PING_MS = 800;

  const ICONS = {
    dx: [new Path2D('M6.5 1.5h5v5h5v5h-5v5h-5v-5h-5v-5h5z')],
    rx: [new Path2D('M4.5 5.5h9a3.5 3.5 0 0 1 0 7h-9a3.5 3.5 0 0 1 0-7z'), new Path2D('M9 5.5v7')],
    lab: [new Path2D('M5.5 1.5h7M6.5 1.5v11.5a2.5 2.5 0 0 0 5 0V1.5'), new Path2D('M6.5 9h5')],
    date: [new Path2D('M4 3h10a2.5 2.5 0 0 1 2.5 2.5v8.5a2.5 2.5 0 0 1-2.5 2.5H4a2.5 2.5 0 0 1-2.5-2.5V5.5A2.5 2.5 0 0 1 4 3z'),
      new Path2D('M1.5 7.5h15M5.5 1v3.5M12.5 1v3.5')],
  };

  // ---------- Helpers ----------

  const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const RGB = Object.fromEntries(TYPES.map(t => [t, hexRgb(COLOR[t])]));
  const mix = (rgb, t) => `rgb(${Math.round(lerp(255, rgb[0], t))},${Math.round(lerp(255, rgb[1], t))},${Math.round(lerp(255, rgb[2], t))})`;

  function pill(x, y, w, h, r) {
    if (w <= 0) return;
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else {
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    ctx.fill();
  }

  // ---------- Document model ----------

  // Paragraph structure does not depend on the layout: generate it once, row by row.
  const meta = [];
  const metaRng = mulberry32(SEED);
  const randint = (a, b) => a + Math.floor(metaRng() * (b - a + 1));
  let paraLeft = randint(3, 6);
  function rowMeta(k) {
    while (meta.length <= k) {
      paraLeft -= 1;
      if (paraLeft < 0) { paraLeft = randint(3, 6); meta.push({ blank: true }); continue; }
      meta.push({ blank: false, last: paraLeft === 0, indent: paraLeft >= 5 });
    }
    return meta[k];
  }

  let L = null;                 // layout, rebuilt on resize
  let rows = new Map();         // k -> tokens and entities (layout-dependent cache)
  const readAt = new Map();     // k -> time the row was read (survives resizes)

  function buildRow(k) {
    const m = rowMeta(k);
    const row = { k, tokens: [], ents: [] };
    if (m.blank) return row;
    const r = mulberry32((SEED * 2654435761) ^ Math.imul(k + 1, 40503));
    const u = L.u;
    let x = L.x0 + (m.indent && r() < 0.5 ? 22 * u : 0);
    const end = m.last ? L.x0 + (0.3 + r() * 0.45) * (L.lineX - L.x0) : L.lineX - 3 * u;
    const found = new Set();
    while (x < end) {
      const w = WORDS[Math.floor(r() * WORDS.length)] * (0.85 + r() * 0.3) * u;
      if (m.last && x + w > end) break;
      const canBeEntity = found.size < 3 && x > L.entMinX && x + w < L.lineX - 3 * u;
      if (r() < L.entP && canBeEntity) {
        const free = TYPES.filter(t => !found.has(t));
        const type = free[Math.floor(r() * free.length)];
        found.add(type);
        const ci = TYPES.indexOf(type);
        const ent = { type, ci, x, w, cw: CW[ci] * L.step * (0.55 + r() * 0.45), op: 0.13 + 0.05 * r(), pinged: 0 };
        row.ents.push(ent);
        row.tokens.push({ x, w, ent });
      } else {
        const t = clamp01((x - L.fadeStart) / Math.max(1, L.lineX - L.fadeStart));
        row.tokens.push({ x, w, op: (0.11 + 0.07 * r()) * (0.8 + 0.6 * t) });
      }
      x += w + (7 + r() * 4) * u;
    }
    // Draw the lines to the farthest columns first, as the static graphic does.
    row.ents.sort((a, b) => b.ci - a.ci);
    return row;
  }

  function getRow(k) {
    let row = rows.get(k);
    if (!row) { row = buildRow(k); rows.set(k, row); }
    return row;
  }

  // ---------- Layout ----------

  let dpr = 1;
  let overlay = true;           // desktop: canvas behind the copy; else graphic below the copy

  function copyRight(boxRect) {
    let right = 0;
    const els = hero.querySelectorAll('.hero__title span, .hero__lead, .hero__actions .btn');
    els.forEach(el => {
      if (el.classList.contains('btn')) { right = Math.max(right, el.getBoundingClientRect().right); return; }
      const range = document.createRange();
      range.selectNodeContents(el);
      for (const rect of range.getClientRects()) right = Math.max(right, rect.right);
    });
    return right - boxRect.left;
  }

  function layout() {
    const rect = box.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    if (W < 2 || H < 2) return false;
    overlay = getComputedStyle(box).position === 'absolute';
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    // Beside the copy the graphic is sized by the hero's height; stacked above the copy
    // (portrait screens) it is sized by the width, so the rows stay legible in a short strip.
    const u = overlay ? H / G.H : Math.min(1, Math.max(0.6, W / 560));
    let lineX = W - G.table * u;
    let fadeStart, fadeEnd;
    if (overlay) {
      const cr = copyRight(rect);
      // Keep the notes clear of the headline; on narrow desktops shift the line right and
      // tighten the columns (the generator sizes them from the space left of the line too).
      lineX = Math.max(lineX, Math.min(cr + 240 * u, W - 300 * u));
      fadeStart = cr + 24 * u;
      fadeEnd = Math.min(fadeStart + 120 * u, lineX - 60 * u);
      fadeStart = Math.min(fadeStart, fadeEnd - 40 * u);
    } else {
      // Stacked above the copy: on narrow screens keep enough notes left of the line.
      lineX = Math.max(lineX, W * 0.36);
      fadeStart = 0;
      fadeEnd = Math.min(W * 0.16, lineX * 0.8);
    }
    const step = (W - lineX - 50 * u) / 4;
    const cols = TYPES.map((_, k) => lineX + G.colPad * u + k * step);
    // Paragraphs start just before the visible area, so indents and short last lines read as text.
    const x0 = overlay ? Math.max(G.x0 * u, fadeStart - 70 * u) : G.x0 * u;
    // Values may start in the fade, never under the copy.
    const entMinX = Math.min(fadeStart + 45 * u, lineX - 60 * u);
    // About as many values per row as the approved mockup, whatever the visible width.
    const tokensInRange = Math.max(1, (lineX - 3 * u - entMinX) / (50.4 * u));
    const entP = Math.min(0.55, 1.25 / tokensInRange);

    L = { W, H, u, lineX, fadeStart, fadeEnd, step, cols, entMinX, entP,
      x0, rowh: G.rowh * u, y0: G.y0 * u, bh: G.bh * u, trigger: H * (overlay ? TRIGGER : 0.66),
      bottomFade: overlay ? 34 * u : Math.max(34 * u, H * 0.24) };
    rows = new Map();
    return true;
  }

  // ---------- State ----------

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let offset = 0;               // rows scrolled
  let speed = SPEED;
  let boost = 0;                // rows owed by page scroll
  let started = 0;              // intro start time
  let last = 0;
  let running = false;
  let visible = true;
  let frame = 0;

  const pointer = { x: 0, y: 0, in: false, presence: 0, touchUntil: 0 };
  let hoverCol = -1;
  let pinnedCol = -1;
  const emph = TYPES.map(() => 1);  // per-type emphasis, eased
  let plainDim = 1;                  // plain tokens dim while a type is isolated

  function rowY(k) { return L.y0 + (k - offset) * L.rowh; }

  function colAt(x, y) {
    if (!L || x < L.lineX + 6 * L.u || y < 0 || y > L.H) return -1;
    for (let k = 3; k >= 0; k--) if (x >= L.cols[k] - G.rulePad * L.u) return k;
    return -1;
  }

  // ---------- Drawing ----------

  function draw(now) {
    const { W, H, u, lineX, rowh, bh } = L;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const intro = reduced.matches ? 1 : clamp01((now - started) / 900);
    const introLine = easeInOut(intro);
    const activeCol = pinnedCol >= 0 ? pinnedCol : hoverCol;
    const pr = pointer.presence;

    const fadeX = x => smooth(L.fadeStart, L.fadeEnd, x);
    const fadeY = y => smooth(L.y0 - 26 * u, L.y0 + 6 * u, y) * smooth(H + 4 * u, H - L.bottomFade, y);
    const rowFocus = y => (pr > 0 ? pr * clamp01(1 - Math.abs(y - pointer.y) / (1.15 * rowh)) : 0);
    const lamp = (x, y) => {
      if (pr <= 0) return 0;
      const d = Math.hypot(x - pointer.x, (y - pointer.y) * 1.4);
      const l = clamp01(1 - d / (170 * u));
      return pr * l * l;
    };

    const kFirst = Math.floor(offset - (L.y0 / rowh)) - 1;
    const kLast = Math.ceil(offset + (H - L.y0) / rowh) + 1;
    const visibleRows = [];
    for (let k = Math.max(0, kFirst); k <= kLast; k++) {
      const y = rowY(k);
      if (y < L.y0 - 30 * u || y > H + 10 * u) continue;
      visibleRows.push(getRow(k));
    }

    // Read rows as they rise past the reading level.
    for (const row of visibleRows) {
      if (row.ents.length && !readAt.has(row.k) && rowY(row.k) <= L.trigger) readAt.set(row.k, now);
    }

    // 1. Notes (clipped at the reading line, as in the static file)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, lineX - 3 * u, H);
    ctx.clip();
    for (const row of visibleRows) {
      const y = rowY(row.k);
      const fy = fadeY(y) * clamp01((now - started - (y / H) * 500) / 500 + (reduced.matches ? 1 : 0));
      if (fy <= 0.003) continue;
      const rf = rowFocus(y);
      const t0 = readAt.get(row.k);
      for (const tk of row.tokens) {
        const cx = tk.x + tk.w / 2;
        const fx = fadeX(cx);
        if (fx <= 0.003) continue;
        const lp = lamp(cx, y);
        if (tk.ent) {
          const e = tk.ent;
          const j = row.ents.indexOf(e);
          const p = t0 === undefined ? 0 : reduced.matches ? 1 : clamp01((now - t0 - j * STAGGER_MS) / (READ_MS * 0.2));
          const c = easeOut(p);
          const em = lerp(1, emph[e.ci], c);
          // halo
          if (c > 0) {
            ctx.globalAlpha = 0.18 * c * fx * fy * em * (1 + 0.6 * rf);
            ctx.fillStyle = COLOR[e.type];
            const grow = lerp(0.4, 1, c);
            pill(tk.x - 3 * u * grow, y - bh / 2 - 3 * u * grow, tk.w + 6 * u * grow, bh + 6 * u * grow, (bh + 6 * u) / 2);
          }
          ctx.globalAlpha = lerp(e.op * (1 + 0.9 * lp + 0.5 * rf) * plainDim, 1 * em, c) * fx * fy;
          ctx.fillStyle = mix(RGB[e.type], c);
          pill(tk.x, y - bh / 2, tk.w, bh, bh / 2);
        } else {
          ctx.globalAlpha = Math.min(0.75, tk.op * plainDim * (1 + 1.3 * lp + 0.7 * rf)) * fx * fy;
          ctx.fillStyle = '#ffffff';
          pill(tk.x, y - bh / 2, tk.w, bh, bh / 2);
        }
      }
    }
    ctx.restore();

    // 2. Light that gathers at the reading line, and the line itself
    ctx.globalAlpha = introLine;
    let g = ctx.createLinearGradient(lineX - 140 * u, 0, lineX, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(140,214,135,0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(lineX - 140 * u, 0, 140 * u, H);
    g = ctx.createLinearGradient(lineX - 50 * u, 0, lineX + 50 * u, 0);
    g.addColorStop(0, 'rgba(140,214,135,0)');
    g.addColorStop(0.5, 'rgba(140,214,135,0.5)');
    g.addColorStop(1, 'rgba(140,214,135,0)');
    ctx.fillStyle = g;
    ctx.fillRect(lineX - 50 * u, 0, 100 * u, H);

    // column rules
    for (let k = 0; k < 4; k++) {
      const x = Math.round(L.cols[k] - G.rulePad * u) + 0.5;
      ctx.globalAlpha = (activeCol === k ? 0.2 : 0.08) * introLine;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, L.y0 - 40 * u);
      ctx.lineTo(x, L.y0 - 40 * u + (H - L.y0 + 40 * u) * introLine);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = LIME;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lineX, 0);
    ctx.lineTo(lineX, H * introLine);
    ctx.stroke();

    // 3. Extraction: lines, travelling values, marks on the reading line, cells
    for (const row of visibleRows) {
      const t0 = readAt.get(row.k);
      if (t0 === undefined) continue;
      const y = rowY(row.k);
      const fy = fadeY(y);
      if (fy <= 0.003) continue;
      const rf = rowFocus(y);
      row.ents.forEach((e, j) => {
        const p = reduced.matches ? 1 : clamp01((now - t0 - j * STAGGER_MS) / READ_MS);
        if (p <= 0) return;
        const em = emph[e.ci];
        const color = COLOR[e.type];
        const xa = e.x + e.w + 4 * u;
        const xb = L.cols[e.ci] - 4 * u;
        const travel = easeInOut(clamp01((p - 0.15) / 0.5));
        const xh = lerp(xa, xb, travel);

        if (travel > 0) {
          ctx.globalAlpha = (0.45 + 0.45 * rf) * fy * em * fadeX(xa);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.1 + 0.6 * rf;
          ctx.beginPath();
          ctx.moveTo(xa, y);
          ctx.lineTo(xh, y);
          ctx.stroke();
        }

        // the value on its way
        if (travel > 0 && travel < 1) {
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.22 * fy * em;
          ctx.beginPath(); ctx.arc(xh, y, 6.5 * u, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = fy * em;
          pill(xh - 9 * u, y - 2.5 * u, 12 * u, 5 * u, 2.5 * u);
        }

        // where it crosses the reading line
        if (xh >= lineX) {
          if (!e.pinged) e.pinged = reduced.matches || p >= 1 ? -1 : now;
          if (e.pinged > 0) {
            const q = (now - e.pinged) / PING_MS;
            if (q < 1) {
              ctx.globalAlpha = 0.9 * (1 - q) * fy * em;
              ctx.strokeStyle = color;
              ctx.lineWidth = 1.2;
              ctx.beginPath(); ctx.arc(lineX, y, 3.2 * u + 13 * u * easeOut(q), 0, Math.PI * 2); ctx.stroke();
              const gl = ctx.createLinearGradient(0, y - 40 * u, 0, y + 40 * u);
              gl.addColorStop(0, 'rgba(140,214,135,0)');
              gl.addColorStop(0.5, `rgba(140,214,135,${0.55 * (1 - q)})`);
              gl.addColorStop(1, 'rgba(140,214,135,0)');
              ctx.globalAlpha = fy;
              ctx.fillStyle = gl;
              ctx.fillRect(lineX - 1.5 * u, y - 40 * u, 3 * u, 80 * u);
            }
          }
          ctx.globalAlpha = fy * em;
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(lineX, y, 3.2 * u * (1 + 0.35 * rf), 0, Math.PI * 2); ctx.fill();
        }

        // the cell
        const c = easeOut(clamp01((p - 0.62) / 0.38));
        if (c > 0) {
          const cx = L.cols[e.ci];
          if (c < 1 || rf > 0) {
            ctx.globalAlpha = (0.3 * (1 - c) + 0.2 * rf) * fy * em;
            ctx.fillStyle = color;
            pill(cx - 3 * u, y - bh / 2 - 3 * u, e.cw * c + 6 * u, bh + 6 * u, 4 * u);
          }
          ctx.globalAlpha = fy * em;
          ctx.fillStyle = color;
          pill(cx, y - bh / 2, e.cw * c, bh, 2 * u);
        }
      });
    }

    // 4. Column icons, centred between the rules
    for (let k = 0; k < 4; k++) {
      const type = TYPES[k];
      const a = reduced.matches ? 1 : easeOut(clamp01((now - started - 350 - k * 110) / 500));
      if (a <= 0) continue;
      const s = G.iconScale * u;
      const ix = L.cols[k] - G.rulePad * u + L.step / 2 - 9 * s;
      const iy = L.y0 - 50 * u;
      if (activeCol === k) {
        ctx.globalAlpha = 0.16 * a;
        ctx.fillStyle = COLOR[type];
        ctx.beginPath(); ctx.arc(ix + 9 * s, iy + 9 * s, 17 * u, 0, Math.PI * 2); ctx.fill();
      }
      ctx.save();
      ctx.globalAlpha = a * lerp(0.35, 1, emph[k]);
      ctx.translate(ix, iy);
      ctx.scale(s, s);
      ctx.strokeStyle = COLOR[type];
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (type === 'rx') { ctx.translate(9, 9); ctx.rotate(-Math.PI / 4); ctx.translate(-9, -9); }
      ICONS[type].forEach(path => ctx.stroke(path));
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // Stacked above the copy: fade everything (the reading line and its light too) into the copy.
    if (!overlay) {
      ctx.globalCompositeOperation = 'destination-in';
      const gm = ctx.createLinearGradient(0, H - L.bottomFade, 0, H);
      gm.addColorStop(0, 'rgba(0,0,0,1)');
      gm.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gm;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }

    // Forget rows that have scrolled away.
    if (frame++ % 120 === 0) {
      for (const k of rows.keys()) if (k < kFirst - 4) rows.delete(k);
      for (const k of readAt.keys()) if (k < kFirst - 4) readAt.delete(k);
    }
  }

  // ---------- Loop ----------

  function tick(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // pointer presence and emphasis ease toward their targets
    const touchActive = now < pointer.touchUntil;
    const targetPresence = pointer.in || touchActive ? 1 : 0;
    const k = 1 - Math.exp(-dt * 9);
    pointer.presence = lerp(pointer.presence, targetPresence, k);
    if (Math.abs(pointer.presence - targetPresence) < 0.002) pointer.presence = targetPresence;
    const activeCol = pinnedCol >= 0 ? pinnedCol : hoverCol;
    TYPES.forEach((_, i) => { emph[i] = lerp(emph[i], activeCol < 0 || activeCol === i ? 1 : 0.18, k); });
    plainDim = lerp(plainDim, activeCol < 0 ? 1 : 0.5, k);

    if (!reduced.matches) {
      const targetSpeed = SPEED * (pointer.in || touchActive ? 0.22 : 1);
      speed = lerp(speed, targetSpeed, 1 - Math.exp(-dt * 3));
      const take = boost * (1 - Math.exp(-dt * 6));
      boost -= take;
      offset += speed * dt + take;
    }

    draw(now);
    requestAnimationFrame(tick);
  }

  function start() {
    if (running || !visible || document.hidden || !L) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  }

  function stop() { running = false; }

  function stillFrame() {
    // reduced motion: draw once now, and again after any easing settles
    if (!L) return;
    const now = performance.now();
    const activeCol = pinnedCol >= 0 ? pinnedCol : hoverCol;
    TYPES.forEach((_, i) => { emph[i] = activeCol < 0 || activeCol === i ? 1 : 0.18; });
    plainDim = activeCol < 0 ? 1 : 0.5;
    pointer.presence = pointer.in || now < pointer.touchUntil ? 1 : 0;
    draw(now);
  }

  function refresh() {
    if (reduced.matches) { stop(); stillFrame(); } else start();
  }

  function init() {
    if (!layout()) return;
    started = performance.now();
    if (reduced.matches) {
      // Everything already read, nothing moves.
      for (let k = 0; k < 40; k++) readAt.set(k, -Infinity);
    } else {
      // Intro: rows above the reading level are read in a cascade, top to bottom.
      let i = 0;
      for (let k = 0; rowY(k) <= L.trigger; k++) {
        if (getRow(k).ents.length) readAt.set(k, started + 650 + i++ * 85);
      }
    }
    refresh();
  }

  // ---------- Events ----------

  function setPointer(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    pointer.in = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= rect.width && pointer.y <= rect.height &&
      (!overlay || pointer.x > L.fadeStart);
    const col = pointer.in ? colAt(pointer.x, pointer.y) : -1;
    if (col !== hoverCol) {
      hoverCol = col;
      hero.classList.toggle('is-over-column', col >= 0);
    }
  }

  hero.addEventListener('pointermove', e => {
    if (!L || e.pointerType === 'touch') return;
    setPointer(e);
    if (reduced.matches) stillFrame();
  }, { passive: true });

  hero.addEventListener('pointerleave', () => {
    pointer.in = false;
    hoverCol = -1;
    hero.classList.remove('is-over-column');
    if (reduced.matches) stillFrame();
  });

  hero.addEventListener('pointerdown', e => {
    if (!L || e.target.closest('a, button')) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    if (e.pointerType === 'touch') {
      pointer.x = x; pointer.y = y;
      pointer.touchUntil = performance.now() + 2600;
    }
    const col = colAt(x, y);
    pinnedCol = col >= 0 && col !== pinnedCol ? col : -1;
    if (reduced.matches) stillFrame();
  });

  let lastScroll = window.scrollY;
  window.addEventListener('scroll', () => {
    const d = Math.abs(window.scrollY - lastScroll);
    lastScroll = window.scrollY;
    if (L && visible && !reduced.matches) boost = Math.min(boost + (d / L.rowh) * 0.35, 4);
  }, { passive: true });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) refresh(); else stop();
  }).observe(hero);

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : refresh()));

  if (reduced.addEventListener) reduced.addEventListener('change', () => { stop(); init(); });

  let resizeTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (layout()) { if (!started) init(); else refresh(); } }, 60);
  }).observe(box);

  // Wait for the display font: the headline's width sets where the notes may start.
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => {
    if (!started) init(); else if (layout()) refresh();
  });
})();
