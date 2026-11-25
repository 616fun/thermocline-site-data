// Offers a translated copy of the page when the browser prefers its language (never redirects).
// The page lists its translations in <link rel="alternate" hreflang> tags; the choice to close
// the notice is remembered per language. Pages without translations show nothing.
(function () {
  var NOTE = {
    de: ["Diese Seite auf Deutsch lesen", "Schließen"], es: ["Leer esta página en español", "Cerrar"],
    fr: ["Lire cette page en français", "Fermer"], it: ["Leggi questa pagina in italiano", "Chiudi"],
    ja: ["このページを日本語で読む", "閉じる"], "pt-BR": ["Ler esta página em português", "Fechar"],
    pl: ["Przeczytaj tę stronę po polsku", "Zamknij"], nl: ["Lees deze pagina in het Nederlands", "Sluiten"],
    ko: ["이 페이지를 한국어로 보기", "닫기"], "zh-Hans": ["阅读本页的简体中文版", "关闭"],
    "zh-Hant": ["閱讀本頁的繁體中文版", "關閉"], sv: ["Läs den här sidan på svenska", "Stäng"],
    cs: ["Přečíst tuto stránku česky", "Zavřít"], ru: ["Читать эту страницу на русском", "Закрыть"],
    nb: ["Les denne siden på norsk", "Lukk"], da: ["Læs denne side på dansk", "Luk"],
    fi: ["Lue tämä sivu suomeksi", "Sulje"], en: ["Read this page in English", "Close"]
  };
  var alts = {};
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(function (l) {
    var h = l.getAttribute("hreflang");
    if (h !== "x-default") alts[h.toLowerCase()] = { code: h, href: l.getAttribute("href") };
  });
  if (Object.keys(alts).length < 2) return;
  // The browser's languages in order, mapped to ours: zh-TW/HK/MO → zh-Hant, zh-CN/SG → zh-Hans,
  // no/nn → nb, pt → pt-BR, es-MX/es-ES → es.
  function ours(tag) {
    var t = tag.toLowerCase(), base = t.split("-")[0];
    if (base === "zh") return /hant|tw|hk|mo/.test(t) ? "zh-hant" : "zh-hans";
    if (base === "no" || base === "nn" || base === "nb") return "nb";
    if (base === "pt") return "pt-br";
    return alts[t] ? t : base;
  }
  var here = ours(document.documentElement.lang || "en");
  var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
  var want = null;
  for (var i = 0; i < langs.length; i++) {
    var k = ours(langs[i]);
    if (k === here) return; // already reading a preferred language
    if (alts[k]) { want = alts[k]; break; }
  }
  if (!want) return;
  var key = "langNote:" + want.code;
  try { if (localStorage.getItem(key)) return; } catch (e) {}
  var text = NOTE[want.code] || NOTE[want.code.split("-")[0]] || NOTE.en;
  var bar = document.createElement("div");
  bar.className = "lang-note";
  bar.setAttribute("lang", want.code);
  var a = document.createElement("a");
  a.href = want.href; a.hreflang = want.code; a.textContent = text[0];
  var x = document.createElement("button");
  x.type = "button"; x.className = "lang-note-close"; x.setAttribute("aria-label", text[1]); x.textContent = "×";
  x.addEventListener("click", function () {
    try { localStorage.setItem(key, "1"); } catch (e) {}
    bar.remove();
  });
  bar.appendChild(a); bar.appendChild(x);
  var header = document.querySelector(".site-header");
  if (header) header.parentNode.insertBefore(bar, header); else document.body.prepend(bar);
})();
