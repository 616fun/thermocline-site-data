// Share button in the header. Phones (and Safari on the Mac) open the system share sheet
// with this page's title and link; elsewhere the link is copied and a short note confirms it.
(function () {
  var TR = (window.SITE_T && window.SITE_T[document.documentElement.lang || 'en']) || {};
  function tr(s) { return TR[s] || s; }
  var btn = document.getElementById('share-btn');
  if (!btn) return;
  var canonical = document.querySelector('link[rel="canonical"]');
  var url = canonical ? canonical.href : location.href.split('#')[0];
  var desc = document.querySelector('meta[name="description"]');

  function note(text) {
    var el = document.getElementById('share-note');
    if (!el) {
      el = document.createElement('div');
      el.id = 'share-note';
      el.className = 'share-note';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(note.t);
    note.t = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  function copy() {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(url);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = url;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      ok ? resolve() : reject();
    });
  }

  btn.addEventListener('click', function () {
    var data = { title: document.title, text: desc ? desc.content : '', url: url };
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      navigator.share(data).catch(function (e) {
        if (e && e.name !== 'AbortError') copy().then(function () { note(tr('Link copied')); });
      });
      return;
    }
    copy().then(function () { note(tr('Link copied')); },
                function () { note(url); });
  });
})();
