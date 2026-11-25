/* Thermocline website: a live copy of the app's profile chart, on three real dives.
   Adapted from the profile-chart mockup. Needs dive-data.js (const DIVES) loaded first. */
(function () {
  const root = document.getElementById('demo');
  if (!root || typeof DIVES === 'undefined') return;
  root.classList.add('live');
  // The page's language: labels come from site-strings.js (the app's own words), numbers and dates
  // follow the language, and every language but English starts in metric, as the app does.
  const LANG = document.documentElement.lang || 'en';
  const TR = (window.SITE_T && window.SITE_T[LANG]) || {};
  const tr = (s, ...v) => { let r = TR[s] || s; v.forEach((x, i) => { r = r.split(`{${i}}`).join(x); }); return r; };
  const LOC = LANG === 'en' ? 'en-US' : LANG;

  const SERIES = {
    tank:   { label: tr('Tank'),   color: '--d-tank' },
    ndl:    { label: tr('NDL'),    color: '--d-ndl' },
    use:    { label: tr('SAC'),    color: '--d-use' },
    temp:   { label: tr('Temp'),   color: '--d-temp' },
    ppo2:   { label: 'ppO₂',   color: '--d-ppo2' },
    ascent: { label: tr('Ascent'), color: '--d-asc' },
  };
  // The app's order: safety values first, so on a phone they're the chips in view.
  const ORDER = ['tank', 'ppo2', 'ndl', 'use', 'temp', 'ascent'];
  const GASCOL = ['--d-blue', '--d-orange', '--d-teal', '--d-purple'];
  const st = { dive: 1, units: LANG === 'en' ? 'imp' : 'met', layout: 'overlay', chips: new Set(['tank', 'ppo2', 'ndl', 'use', 'temp']), t: null };
  const css = v => getComputedStyle(root).getPropertyValue(v).trim();
  const nf = (v, d = 0) => v.toLocaleString(LOC, { minimumFractionDigits: d, maximumFractionDigits: d });

  const FRESH = { 'Haigh Quarry': true };
  const ABOUT = {
    270: tr('Bonaire reef dive: one tank of EAN33 with a transmitter. Warm water, so the temperature barely moves.'),
    281: tr('Wreck dive off North Carolina: EAN30 with a transmitter, a switch to air from a second tank, then back. SAC leaves the air stretch blank rather than guess.'),
    213: tr('Cold quarry dive on a Predator, no transmitter, so there is no Tank or SAC. Watch the water drop through the thermocline.'),
  };

  const dives = DIVES.map(d => {
    const fresh = !!FRESH[d.site];
    const gasOrder = [];
    const s = d.samples.map(([t, ft, psi, f, pp, ndt]) => ({ t, m: ft / 3.28084, bar: psi ? psi / 14.5038 : null, c: f ? (f - 32) * 5 / 9 : null, pp: pp || null, ndt }));
    let gi = 0; const sw = d.switches.slice().sort((a, b) => a[0] - b[0]);
    let cur = d.gases[0].name;
    for (const x of s) { while (gi < sw.length && sw[gi][0] <= x.t) { cur = sw[gi][1]; gi++; } x.gas = cur; if (!gasOrder.includes(cur)) gasOrder.push(cur); }
    const tx = d.gases[0];
    const hasTank = s.some(x => x.bar);
    const waterL = tx.cuft && tx.wp ? tx.cuft * 28.3168 * 1.01325 / (tx.wp / 14.5038) : null;
    const amb = m => 1.01325 + m * (fresh ? 0.0981 : 0.1005);
    for (let i = 0; i < s.length; i++) {
      s[i].use = null;
      if (!hasTank || s[i].gas !== tx.name) continue;
      let lo = i, hi = i;
      while (lo > 0 && s[lo - 1].gas === s[i].gas && s[i].t - s[lo - 1].t <= 60) lo--;
      while (hi < s.length - 1 && s[hi + 1].gas === s[i].gas && s[hi + 1].t - s[i].t <= 60) hi++;
      let a = lo; while (a <= hi && s[a].bar == null) a++;
      let b = hi; while (b >= lo && s[b].bar == null) b--;
      if (!(b > a)) continue;
      const minutes = (s[b].t - s[a].t) / 60; if (minutes < 0.5) continue;
      const drop = s[a].bar - s[b].bar; if (drop < 0) continue;
      let am = 0; for (let k = a + 1; k <= b; k++) am += (s[k].t - s[k - 1].t) / 60 * amb((s[k].m + s[k - 1].m) / 2);
      s[i].use = waterL ? waterL * drop / am : null;
    }
    let drop = 0, am = 0;
    for (let i = 1; i < s.length; i++) {
      if (s[i - 1].bar == null || s[i].bar == null || s[i - 1].gas !== tx.name) continue;
      const dt = (s[i].t - s[i - 1].t) / 60; drop += s[i - 1].bar - s[i].bar; am += dt * amb((s[i].m + s[i - 1].m) / 2);
    }
    const avgUse = hasTank && waterL && drop > 0 ? waterL * drop / am : null;
    for (let i = 0; i < s.length; i++) { let j = i; while (j > 0 && s[i].t - s[j - 1].t <= 30) j--; const dt = (s[i].t - s[j].t) / 60; s[i].asc = dt > 0 ? Math.max(0, (s[j].m - s[i].m) / dt) : 0; }
    let cold = null; for (const x of s) { if (x.c != null && (cold == null || x.c < cold.c - 1e-9)) cold = x; }
    const deepest = s.reduce((a, b) => b.m > a.m ? b : a);
    const avail = { tank: hasTank, use: hasTank && !!waterL, temp: s.some(x => x.c != null), ppo2: s.some(x => x.pp > 0), ndl: s.some(x => x.ndt > 0), ascent: true };
    return { ...d, s, gasOrder, tx, avgUse, cold, deepest, avail, dur: s[s.length - 1].t };
  });

  const U = {
    depth: m => st.units === 'imp' ? `${nf(m * 3.28084)} ft` : `${nf(m, 1)} m`,
    dv: m => st.units === 'imp' ? m * 3.28084 : m,
    du: () => st.units === 'imp' ? 'ft' : 'm',
    pres: b => st.units === 'imp' ? `${nf(b * 14.5038)} psi` : `${nf(b)} bar`,
    pv: b => st.units === 'imp' ? b * 14.5038 : b,
    pu: () => st.units === 'imp' ? 'psi' : 'bar',
    use: l => st.units === 'imp' ? `${nf(l / 28.3168, 2)} ft³/min` : `${nf(l, 1)} L/min`,
    uv: l => st.units === 'imp' ? l / 28.3168 : l,
    temp: c => st.units === 'imp' ? `${nf(c * 9 / 5 + 32)} °F` : `${nf(c, 1)} °C`,
    tv: c => st.units === 'imp' ? c * 9 / 5 + 32 : c,
    tu: () => st.units === 'imp' ? '°F' : '°C',
    asc: m => st.units === 'imp' ? `${nf(m * 3.28084)} ft/min` : `${nf(m, 1)} m/min`,
  };
  const mmss = t => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;

  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs = {}, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function niceTicks(lo, hi, n) { const span = hi - lo || 1; const step0 = span / n; const mag = 10 ** Math.floor(Math.log10(step0)); const step = [1, 2, 2.5, 5, 10].map(x => x * mag).find(x => x >= step0); const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6)); return out; }
  function idxAt(t) { const s = dives[st.dive].s; let best = 0; for (let i = 1; i < s.length; i++) if (Math.abs(s[i].t - t) < Math.abs(s[best].t - t)) best = i; return best; }
  function pathOf(pts) { let p = '', pen = false; for (const q of pts) { if (q == null) { pen = false; continue; } p += (pen ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); pen = true; } return p; }
  function smooth(vals, k, median) {
    return vals.map((v, i) => {
      if (v == null) return null; const w = [];
      for (let j = Math.max(0, i - k); j <= Math.min(vals.length - 1, i + k); j++) if (vals[j] != null) w.push(vals[j]);
      if (median) { w.sort((a, b) => a - b); return w[w.length >> 1]; } return w.reduce((a, b) => a + b, 0) / w.length;
    });
  }

  const charts = [];
  function chart(container, { h, y0, y1, invert = false, draw, yFmt = v => nf(v), xAxis = false, cursorDots }) {
    const W = Math.max(280, container.clientWidth || 600), L = 34, R = 8, T = 8, B = xAxis ? 20 : 6;
    const svg = el('svg', { viewBox: `0 0 ${W} ${h}`, height: h, role: 'img', 'aria-label': xAxis ? tr('Dive profile. Drag across it, or use the arrow keys, to read any moment.') : tr('Strip chart') }); container.appendChild(svg);
    const d = dives[st.dive];
    const x = t => L + (t / d.dur) * (W - L - R);
    const y = v => invert ? T + (v - y0) / (y1 - y0) * (h - T - B) : h - B - (v - y0) / (y1 - y0) * (h - T - B);
    for (const v of niceTicks(Math.min(y0, y1), Math.max(y0, y1), invert ? 4 : 2)) {
      el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: css('--d-grid'), 'stroke-width': 1 }, svg);
      const tx = el('text', { x: L - 5, y: y(v) + 3, 'text-anchor': 'end' }, svg); tx.textContent = yFmt(v);
    }
    if (xAxis) for (const m of niceTicks(0, d.dur / 60, 6)) { const t = el('text', { x: x(m * 60), y: h - 5, 'text-anchor': 'middle' }, svg); t.textContent = m === 0 ? '0 min' : m; }
    draw(svg, x, y, W, L, R, T, B);
    const cur = el('g', {}, svg);
    const line = el('line', { y1: T, y2: h - B, stroke: css('--d-text'), 'stroke-opacity': .45, 'stroke-width': 1 }, cur);
    const dots = (cursorDots || []).map(c => ({ ...c, e: el('circle', { r: 3.5, fill: css(c.color), stroke: css('--d-card'), 'stroke-width': 1.5 }, cur) }));
    const c = {
      svg, update(t) {
        const i = idxAt(t); const sx = x(d.s[i].t); line.setAttribute('x1', sx); line.setAttribute('x2', sx);
        for (const k of dots) { const v = k.val(d.s[i]); if (v == null) { k.e.setAttribute('visibility', 'hidden'); continue; } k.e.setAttribute('visibility', 'visible'); k.e.setAttribute('cx', sx); k.e.setAttribute('cy', y(v)); }
      }
    };
    const pick = ev => { const r = svg.getBoundingClientRect(); const px = (ev.clientX - r.left) * (W / r.width); st.t = Math.max(0, Math.min(d.dur, (px - L) / (W - L - R) * d.dur)); hint(false); sync(); };
    if (xAxis) {
      // Keyboard: focus the main chart and use the arrow keys to step through the dive.
      svg.setAttribute('tabindex', '0');
      svg.addEventListener('keydown', ev => {
        const step = { ArrowRight: 1, ArrowLeft: -1, PageDown: 10, PageUp: -10 }[ev.key];
        if (ev.key === 'Home' || ev.key === 'End') st.t = ev.key === 'Home' ? 0 : d.dur;
        else if (step) { const i = idxAt(st.t == null ? d.deepest.t : st.t); st.t = d.s[Math.max(0, Math.min(d.s.length - 1, i + step))].t; }
        else return;
        ev.preventDefault(); hint(false); sync();
      });
    }
    svg.addEventListener('pointerdown', ev => { if (ev.pointerType === 'mouse') svg.setPointerCapture(ev.pointerId); pick(ev); });
    svg.addEventListener('pointermove', ev => { if (ev.buttons || ev.pointerType === 'mouse' || ev.pointerType === 'touch') pick(ev); });
    charts.push(c); return c;
  }

  const overlayOn = () => st.layout === 'overlay';
  const shownKeys = d => ORDER.filter(k => st.chips.has(k) && d.avail[k]);
  const narrow = () => root.clientWidth < 560;

  function seriesDef(key) {
    const d = dives[st.dive], s = d.s, col = SERIES[key].color;
    const f = { key, col, refs: [], step: false, extra: null };
    if (key === 'tank') {
      f.name = tr('Tank · {0}', U.pu()); f.vals = s.map(q => q.bar == null ? null : U.pv(q.bar)); f.fmt = q => U.pres(q.bar);
      const ps = s.filter(q => q.bar != null); f.sum = `${U.pres(ps[0].bar)} → ${U.pres(ps[ps.length - 1].bar)}`;
      f.y0 = 0; f.y1 = Math.max(...f.vals.filter(v => v != null)) * 1.05;
    }
    if (key === 'use') {
      f.name = tr('SAC · {0}', st.units === 'imp' ? 'ft³/min' : 'L/min'); f.vals = s.map(q => q.use == null ? null : U.uv(q.use)); f.fmt = q => `${tr('SAC')} ${U.use(q.use)}`;
      const vv = f.vals.filter(v => v != null); f.y0 = 0; f.y1 = Math.max(...vv, U.uv(d.avgUse)) * 1.1;
      f.sum = tr('dive average {0}', U.use(d.avgUse)); f.refs.push({ v: U.uv(d.avgUse), color: '--d-use', label: 'avg', overlay: true });
    }
    if (key === 'temp') {
      f.name = tr('Water · {0}', U.tu()); f.vals = s.map(q => q.c == null ? null : U.tv(q.c)); f.step = true; f.fmt = q => U.temp(q.c);
      const vv = f.vals.filter(v => v != null); const lo = Math.min(...vv), hi = Math.max(...vv); f.y0 = lo - Math.max(2, (hi - lo) * .25); f.y1 = hi + Math.max(1, (hi - lo) * .15);
      f.sum = tr('{0} coldest', U.temp(d.cold.c));
      f.extra = (svg, x, y, ov) => {
        const cx = x(d.cold.t), cy = y(U.tv(d.cold.c)); el('circle', { cx, cy, r: 4, fill: 'none', stroke: css(col), 'stroke-width': 2 }, svg);
        const t = el('text', ov ? { x: cx, y: cy + 16, 'text-anchor': 'middle', style: `fill:${css(col)}` } : { x: Math.min(cx + 7, x(d.dur) - 130), y: cy > 36 ? cy - 7 : cy + 13 }, svg);
        t.textContent = ov ? `❄︎ ${U.temp(d.cold.c)}` : tr('coldest {0} at {1}', U.temp(d.cold.c), U.depth(d.cold.m));
      };
    }
    if (key === 'ppo2') {
      f.name = 'ppO₂ · bar'; f.vals = s.map(q => q.pp); f.y0 = 0; f.y1 = Math.max(1.7, ...f.vals.filter(v => v != null)) * 1.02; f.fmt = q => `ppO₂ ${nf(q.pp, 2)}`;
      f.sum = tr('peak {0}', nf(Math.max(...f.vals.filter(v => v != null)), 2)); f.refs.push({ v: 1.4, color: '--d-yellow' }, { v: 1.6, color: '--d-red', overlay: true });
    }
    if (key === 'ndl') {
      // The computer's NDL; none while in deco, so the line breaks there. Shearwater shows 99 for longer.
      f.name = tr('NDL · min'); f.vals = s.map(q => q.ndt > 0 ? Math.min(q.ndt, 99) : null); f.step = true; f.y0 = 0; f.y1 = 104;
      f.fmt = q => q.ndt >= 99 ? `${tr('NDL')} 99+ min` : `${tr('NDL')} ${q.ndt} min`;
      const deep = s.filter(q => q.ndt > 0 && q.m > 3).map(q => q.ndt); f.sum = deep.length ? tr('shortest {0} min', Math.min(...deep)) : '';
    }
    if (key === 'ascent') {
      f.name = tr('Ascent · {0}/min', U.du()); f.vals = s.map(q => U.dv(q.asc)); f.y0 = 0; f.y1 = Math.max(U.dv(20), ...f.vals) * 1.05; f.fmt = q => `↑ ${U.asc(q.asc)}`;
      f.sum = tr('fastest {0}', U.asc(Math.max(...s.map(q => q.asc)))); f.refs.push({ v: U.dv(9), color: '--d-yellow' }, { v: U.dv(18), color: '--d-red' });
    }
    f.ov = { tank: f.vals, use: smooth(f.vals, 6, false), temp: smooth(f.vals, 4, true), ppo2: smooth(f.vals || [], 2, false), ndl: f.vals, ascent: smooth(f.vals, 2, false) }[key];
    if (key === 'temp') { const vv = f.vals.filter(v => v != null), lo = Math.min(...vv), hi = Math.max(...vv), sp = Math.max(hi - lo, 4); f.oy0 = lo - sp * .7; f.oy1 = hi + sp * .7; }
    f.points = (x, y, ov) => {
      const vals = ov ? f.ov : f.vals, step = f.step && !ov; const pts = [];
      for (let i = 0; i < s.length; i++) { if (vals[i] == null) { pts.push(null); continue; } if (step && i > 0 && vals[i - 1] != null) pts.push([x(s[i].t), y(vals[i - 1])]); pts.push([x(s[i].t), y(vals[i])]); }
      return pts;
    };
    return f;
  }

  function depthChart(box) {
    const d = dives[st.dive], maxV = U.dv(d.maxDepth / 3.28084) * 1.08, ov = overlayOn();
    const h = narrow() ? (ov ? 280 : 210) : (ov ? 380 : 280);
    const defs = ov ? shownKeys(d).map(seriesDef) : [];
    let geo;
    const c = chart(box, {
      h, y0: 0, y1: maxV, invert: true, xAxis: true,
      cursorDots: [{ color: '--d-text', val: x => U.dv(x.m) }],
      draw(svg, x, y, W, L, R, T, B) {
        geo = { x, y, W, L, R, T, B };
        const runs = []; let start = 0;
        for (let i = 1; i <= d.s.length; i++) if (i === d.s.length || d.s[i].gas !== d.s[start].gas) { runs.push([start, Math.min(i, d.s.length - 1)]); start = i; }
        for (const [a, b] of runs) {
          const col = css(GASCOL[d.gasOrder.indexOf(d.s[a].gas)]); const seg = d.s.slice(a, b + 1);
          const top = seg.map(q => [x(q.t), y(U.dv(q.m))]);
          el('path', { d: pathOf(top) + `L${x(seg[seg.length - 1].t)} ${y(0)}L${x(seg[0].t)} ${y(0)}Z`, fill: col, 'fill-opacity': ov ? .12 : .18 }, svg);
          el('path', { d: pathOf(top), fill: 'none', stroke: col, 'stroke-width': ov ? 2.6 : 2.2, 'stroke-linejoin': 'round' }, svg);
        }
        for (const [t, g] of d.switches) {
          const sx = x(t); el('line', { x1: sx, x2: sx, y1: y(0), y2: y(maxV), stroke: css('--d-sec'), 'stroke-dasharray': '3 3' }, svg);
          const tx = el('text', { x: sx + 3, y: y(maxV) - 5 }, svg); tx.textContent = '→ ' + g;
        }
        if (!ov) { const dp = d.deepest; const tx = el('text', { x: Math.min(x(dp.t) + 5, x(d.dur) - 40), y: y(U.dv(dp.m)) + 12 }, svg); tx.textContent = U.depth(dp.m); }
        for (const f of defs) {
          const a0 = f.oy0 ?? f.y0, a1 = f.oy1 ?? f.y1; f.ys = v => T + (1 - (v - a0) / (a1 - a0)) * (h - T - B);
          for (const r of f.refs.filter(r => r.overlay)) el('line', { x1: x(0), x2: x(d.dur), y1: f.ys(r.v), y2: f.ys(r.v), stroke: css(r.color), 'stroke-width': 1, 'stroke-dasharray': '4 3', 'stroke-opacity': .8 }, svg);
          el('path', { d: pathOf(f.points(x, f.ys, true)), fill: 'none', stroke: css(f.col), 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
          if (f.extra) f.extra(svg, x, f.ys, true);
        }
      }
    });
    if (!ov) return;
    const layer = el('g', {}, c.svg); const base = c.update;
    c.update = t => {
      base(t); layer.innerHTML = '';
      const q = d.s[idxAt(t)], sx = geo.x(q.t);
      const tags = [{ col: '--d-text', y: geo.y(U.dv(q.m)), txt: U.depth(q.m) }];
      for (const f of defs) {
        const v = f.ov[d.s.indexOf(q)]; if (v == null) continue; tags.push({ col: f.col, y: f.ys(v), txt: f.fmt(q) });
        el('circle', { cx: sx, cy: f.ys(v), r: 3.5, fill: css(f.col), stroke: css('--d-card'), 'stroke-width': 1.5 }, layer);
      }
      tags.sort((a, b) => a.y - b.y);
      for (let i = 0; i < tags.length; i++) tags[i].ty = Math.max(tags[i].y, i ? tags[i - 1].ty + 18 : geo.T + 9);
      const over = tags.length ? tags[tags.length - 1].ty - (h - geo.B - 9) : 0; if (over > 0) for (const g of tags) g.ty -= over;
      const left = sx > geo.W - 130;
      for (const g of tags) {
        const w = [...g.txt].reduce((a, ch) => a + (/[\u2E80-\u9FFF\uAC00-\uD7AF\uFF00-\uFFEF]/.test(ch) ? 11.5 : 6.6), 0) + 12, tx = left ? sx - 10 - w : sx + 10;
        if (Math.abs(g.ty - g.y) > 2) el('line', { x1: sx, y1: g.y, x2: left ? tx + w : tx, y2: g.ty, stroke: css(g.col), 'stroke-width': 1, 'stroke-opacity': .6 }, layer);
        el('rect', { x: tx, y: g.ty - 8.5, width: w, height: 17, rx: 8.5, fill: css('--d-card'), stroke: css(g.col), 'stroke-width': 1.3 }, layer);
        const t = el('text', { x: tx + w / 2, y: g.ty + 4, 'text-anchor': 'middle', style: `fill:${css(g.col)};font-weight:650;font-size:11px` }, layer); t.textContent = g.txt;
      }
    };
  }

  function strip(box, key) {
    const d = dives[st.dive], s = d.s, f = seriesDef(key), col = f.col;
    const wrap = document.createElement('div'); wrap.className = 'd-strip'; box.appendChild(wrap);
    const top = document.createElement('div'); top.className = 'd-top'; wrap.appendChild(top);
    top.innerHTML = `<span class="d-name"><span class="d-dot" style="background:var(${col})"></span>${f.name}</span><span class="d-sum">${f.sum}</span>`;
    const chartBox = document.createElement('div'); wrap.appendChild(chartBox);
    chart(chartBox, {
      h: 76, y0: f.y0, y1: f.y1, yFmt: v => key === 'use' && st.units === 'imp' ? nf(v, 1) : key === 'ppo2' ? nf(v, 1) : nf(v),
      cursorDots: [{ color: col, val: q => f.vals[s.indexOf(q)] }],
      draw(svg, x, y) {
        for (const r of f.refs) {
          el('line', { x1: x(0), x2: x(d.dur), y1: y(r.v), y2: y(r.v), stroke: css(r.color), 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }, svg);
          if (r.label === 'avg') { const t = el('text', { x: x(d.dur) - 2, y: y(r.v) - 3, 'text-anchor': 'end' }, svg); t.textContent = tr('avg'); }
        }
        el('path', { d: pathOf(f.points(x, y)), fill: 'none', stroke: css(col), 'stroke-width': 1.9, 'stroke-linejoin': 'round' }, svg);
        if (f.extra) f.extra(svg, x, y);
        if (key === 'use') {
          let a = null;
          for (let i = 0; i <= s.length; i++) {
            const gap = i < s.length && s[i].gas !== d.tx.name;
            if (gap && a == null) a = i;
            if (!gap && a != null) { const x0 = x(s[a].t), x1 = x(s[i - 1].t); el('rect', { x: x0, y: y(f.y1), width: x1 - x0, height: y(f.y0) - y(f.y1), fill: css('--d-fill') }, svg); const t = el('text', { x: (x0 + x1) / 2, y: y(f.y1) + 11, 'text-anchor': 'middle' }, svg); t.textContent = tr('{0}: no transmitter', s[a].gas); a = null; }
          }
        }
      }
    });
  }

  function readoutHTML() {
    const d = dives[st.dive]; const q = st.t == null ? d.deepest : d.s[idxAt(st.t)];
    const items = [[tr('Time'), mmss(q.t)], [tr('Depth'), U.depth(q.m)], [tr('Gas'), q.gas, GASCOL[d.gasOrder.indexOf(q.gas)]]];
    const on = k => st.chips.has(k) && d.avail[k];
    if (d.s.some(x => x.ndt > 0)) items.push([tr('NDL'), q.ndt >= 99 ? '99+ min' : q.ndt <= 0 && q.m > 3 ? tr('Deco') : `${q.ndt} min`, on('ndl') ? '--d-ndl' : undefined]);
    if (on('tank')) items.push([tr('Tank'), q.bar == null ? '—' : U.pres(q.bar), '--d-tank']);
    if (on('use')) items.push([tr('SAC'), q.use == null ? '—' : U.use(q.use), '--d-use']);
    if (on('temp')) items.push([tr('Water'), q.c == null ? '—' : U.temp(q.c), '--d-temp']);
    if (on('ppo2')) items.push(['ppO₂', q.pp == null ? '—' : nf(q.pp, 2), '--d-ppo2']);
    if (on('ascent')) items.push([tr('Ascent'), U.asc(q.asc), '--d-asc']);
    return items.map(([k, v, c]) => `<div class="d-kv"><i>${c ? `<span class="d-dot" style="background:var(${c})"></span>` : ''}${k}</i><b>${v}</b></div>`).join('');
  }

  let hintShown = true;
  function hint(show) { hintShown = show; const h = root.querySelector('.d-hint'); if (h) h.classList.toggle('gone', !show); }

  function seg(opts, val, onPick, label) {
    const e = document.createElement('div'); e.className = 'd-seg'; e.setAttribute('role', 'group'); e.setAttribute('aria-label', label);
    e.innerHTML = opts.map(([v, l]) => `<button type="button" aria-pressed="${val === v}" class="${val === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('');
    e.querySelectorAll('button').forEach(b => b.onclick = () => onPick(b.dataset.v));
    return e;
  }

  function render() {
    charts.length = 0;
    const d = dives[st.dive], ov = overlayOn();
    root.innerHTML = '';

    const head = document.createElement('div'); head.className = 'd-head';
    const date = new Date(d.date.replace(' ', 'T'));
    const title = document.createElement('div'); title.className = 'd-title';
    title.innerHTML = `<b>${d.site}</b><span>${date.toLocaleDateString(LOC, { month: 'short', year: 'numeric' })} · ${d.computer} · ${U.depth(d.maxDepth / 3.28084)} · ${Math.round(d.duration / 60)} min</span>`;
    const ctr = document.createElement('div'); ctr.className = 'd-controls';
    ctr.appendChild(seg(dives.map((x, i) => [String(i), x.site]), String(st.dive), v => { st.dive = +v; st.t = null; render(); }, tr('Choose a dive')));
    ctr.appendChild(seg([['imp', 'ft · psi'], ['met', 'm · bar']], st.units, v => { st.units = v; render(); }, tr('Units')));
    head.appendChild(title); head.appendChild(ctr); root.appendChild(head);

    const ro = document.createElement('div'); ro.className = 'd-readout'; ro.id = 'd-readout'; root.appendChild(ro);

    const depthBox = document.createElement('div'); depthBox.className = 'd-chart'; root.appendChild(depthBox);
    const h = document.createElement('div'); h.className = 'd-hint' + (hintShown ? '' : ' gone'); h.innerHTML = '<span>⟷</span> ' + tr('Drag across the dive'); depthBox.appendChild(h);

    // As in the app: Stacked/Overlay, then the chips on one line that never wraps. When they don't
    // fit, the row scrolls sideways and fades at an edge with more chips past it.
    const controls = document.createElement('div'); controls.className = 'd-chipbar';
    controls.appendChild(seg([['stacked', tr('Stacked')], ['overlay', tr('Overlay')]], st.layout, v => { st.layout = v; render(); }, tr('Layout')));
    const chips = document.createElement('div'); chips.className = 'd-chips'; chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', tr('Shown on the profile'));
    controls.appendChild(chips);
    const edges = () => {
      const more = chips.scrollWidth - chips.clientWidth > 2;
      chips.classList.toggle('fade-r', more && chips.scrollLeft < chips.scrollWidth - chips.clientWidth - 2);
      chips.classList.toggle('fade-l', more && chips.scrollLeft > 2);
    };
    chips.addEventListener('scroll', edges, { passive: true });
    for (const k of ORDER.filter(k => d.avail[k])) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'd-chip' + (st.chips.has(k) ? ' on' : '');
      b.setAttribute('aria-pressed', st.chips.has(k));
      b.innerHTML = `<span class="d-dot" style="background:var(${SERIES[k].color})"></span>${SERIES[k].label}`;
      b.onclick = () => { st.chips.has(k) ? st.chips.delete(k) : st.chips.add(k); render(); };
      chips.appendChild(b);
    }
    const legend = document.createElement('div'); legend.className = 'd-legend';
    legend.innerHTML = d.gasOrder.map((g, i) => `<span><span class="d-dot" style="background:var(${GASCOL[i]})"></span>${g}</span>`).join('') + (ov && shownKeys(d).length ? `<span class="d-note">${tr('Each line has its own scale; the tags give the values.')}</span>` : '');
    root.appendChild(legend);
    root.appendChild(controls);
    // On first layout and whenever the row or a chip changes size (fonts loading, a resize).
    if (window.ResizeObserver) { const ro = new ResizeObserver(edges); ro.observe(chips); for (const b of chips.children) ro.observe(b); } else requestAnimationFrame(edges);

    const strips = document.createElement('div'); root.appendChild(strips);
    depthChart(depthBox);
    if (!ov) {
      const shown = shownKeys(d);
      for (const k of shown) strip(strips, k);
      if (!shown.length) { const n = document.createElement('div'); n.className = 'd-note'; n.textContent = tr('No strips on. Tap a chip to add one.'); strips.appendChild(n); }
    }
    const about = document.createElement('p'); about.className = 'd-about'; about.textContent = ABOUT[d.number] || ''; root.appendChild(about);
    sync();
  }
  function sync() {
    const d = dives[st.dive]; const t = st.t == null ? d.deepest.t : st.t;
    for (const c of charts) c.update(t);
    const r = document.getElementById('d-readout'); if (r) r.innerHTML = readoutHTML();
  }

  let rz, lastW = root.clientWidth;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (root.clientWidth !== lastW) { lastW = root.clientWidth; render(); } }, 150); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', render);
  render();
})();
