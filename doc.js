// Guide and troubleshooting pages. Everything here is an extra: without it, every table shows
// both devices, the contents list stays open and every answer can still be opened by hand.
(function () {
  // Text in the page's language, from site-strings.js; English when there's no translation.
  var LANG = document.documentElement.lang || 'en';
  var TR = (window.SITE_T && window.SITE_T[LANG]) || {};
  function tr(s) { return typeof TR[s] === 'string' ? TR[s] : s; }
  function count(key, n, en) {
    var v = TR[key], form = v && typeof v === 'object' ? (v[new Intl.PluralRules(LANG).select(n)] || v.other) : en;
    return form.split('{0}').join(n.toLocaleString(LANG === 'en' ? 'en-US' : LANG));
  }
  var root = document.documentElement;

  // ---- Device filter (guide): narrows the iPhone/Mac tables to one column. ----
  var pf = document.querySelector('.pf');
  if (pf) {
    var buttons = pf.querySelectorAll('button[data-plat]');
    function setPlat(p, save) {
      if (p === 'both') root.removeAttribute('data-plat'); else root.setAttribute('data-plat', p);
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.plat === p)); });
      if (save) { try { localStorage.setItem('thermocline-plat', p); } catch (e) {} }
    }
    var saved = 'both';
    try { saved = localStorage.getItem('thermocline-plat') || 'both'; } catch (e) {}
    if (!/^(both|ios|mac)$/.test(saved)) saved = 'both';
    setPlat(saved, false);
    buttons.forEach(function (b) { b.addEventListener('click', function () { setPlat(b.dataset.plat, true); }); });
    pf.hidden = false;
  }

  // ---- Contents: folded on phones, marks the section you're reading. ----
  var tocDetails = document.querySelector('.toc details');
  if (tocDetails && window.matchMedia('(max-width: 999px)').matches) tocDetails.open = false;
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc a[href^="#"]'));
  if (tocDetails) tocLinks.forEach(function (a) {
    a.addEventListener('click', function () { if (window.matchMedia('(max-width: 999px)').matches) tocDetails.open = false; });
  });
  var targets = tocLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  if ('IntersectionObserver' in window && targets.every(Boolean)) {
    var current = null;
    function mark() {
      var y = 120, best = targets[0];
      targets.forEach(function (t) { if (t.getBoundingClientRect().top <= y) best = t; });
      if (best === current) return;
      current = best;
      tocLinks.forEach(function (a, i) {
        if (targets[i] === best) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; mark(); }); }
    }, { passive: true });
    mark();
  }

  // ---- Troubleshooting: every answer opens from its link, and can be found by search. ----
  var faqs = Array.prototype.slice.call(document.querySelectorAll('.faq details[id]'));
  function openFromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    if (el && el.tagName === 'DETAILS') {
      el.hidden = false;
      el.open = true;
      el.scrollIntoView();
    }
  }
  if (faqs.length) {
    faqs.forEach(function (d) {
      var a = document.createElement('a');
      a.className = 'ans-link';
      a.href = '#' + d.id;
      a.textContent = tr('Link to this answer');
      d.appendChild(a);
    });
    window.addEventListener('hashchange', openFromHash);
    openFromHash();
    // Images and fonts arriving can push the answer down; settle on it again once they have.
    window.addEventListener('load', function () { if (location.hash) openFromHash(); });
  }

  var search = document.querySelector('.faq-search');
  if (search && faqs.length) {
    var input = search.querySelector('input');
    var status = search.querySelector('[role="status"]');
    var groups = Array.prototype.slice.call(document.querySelectorAll('.faq-group'));
    var text = faqs.map(function (d) { return d.textContent.toLowerCase(); });
    function run() {
      var words = input.value.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 1; });
      var shown = 0;
      faqs.forEach(function (d, i) {
        var hit = words.every(function (w) { return text[i].indexOf(w) !== -1; });
        d.hidden = !hit;
        if (words.length) d.open = hit; else d.open = false;
        if (hit) shown++;
      });
      groups.forEach(function (g) { g.hidden = words.length > 0 && !g.querySelector('.faq details:not([hidden])'); });
      status.textContent = !words.length ? '' : shown === 0
        ? tr('Nothing matches. Try another word, or send a report (below).')
        : count('{0} problems match.', shown, shown === 1 ? '{0} problem matches.' : '{0} problems match.');
      var send = document.getElementById('send-log-group');
      if (send) send.hidden = false;
    }
    input.addEventListener('input', run);
    search.hidden = false;
  }
})();
