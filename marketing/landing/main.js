// Retail Profit Check landing page.
// - Picks the hero variant from ?v=a|b|c (one per ad pitch) and the language from ?lang=en|zh.
// - Builds WhatsApp click-to-chat links with a prefilled message that carries a short
//   reference code (variant + source, e.g. "B-fb"), so leads can be attributed WITHOUT trackers.
// No cookies, no storage, no network requests.
(function () {
  'use strict';

  // ---- PLACEHOLDERS: replace before publishing (see marketing/README.md) ----
  var CONFIG = {
    // Country code + number, digits only, no "+" or spaces. 60000000000 is a deliberate dummy.
    whatsappNumber: '60000000000',
    // Google Form share link.
    formUrl: 'https://forms.gle/REPLACE_WITH_YOUR_FORM_ID',
  };

  var VARIANTS = ['a', 'b', 'c'];
  var LANGS = ['en', 'zh'];
  var SOURCE_PATTERN = /^[a-z0-9_-]{1,20}$/;

  var TITLES = {
    en: 'Retail Profit Check — accountant-checked health check for retail shops',
    zh: 'Retail Profit Check — 会计师复核的零售店数字体检',
  };

  function message(lang, ref) {
    if (lang === 'zh') {
      return '你好！我看到 Retail Profit Check 的网页（ref ' + ref + '），想看 5 分钟演示，也想了解 RM300 试点。';
    }
    return "Hi! I saw the Retail Profit Check page (ref " + ref + "). I'd like a 5-minute demo and to hear about the RM300 pilot.";
  }

  function pick(value, allowed, fallback) {
    return allowed.indexOf(value) >= 0 ? value : fallback;
  }

  var params = new URLSearchParams(window.location.search);
  var variant = pick((params.get('v') || '').toLowerCase(), VARIANTS, 'a');
  var browserLang = (navigator.language || '').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
  var lang = pick((params.get('lang') || '').toLowerCase(), LANGS, browserLang);
  var rawSource = (params.get('src') || '').toLowerCase();
  var source = SOURCE_PATTERN.test(rawSource) ? rawSource : 'web';
  var ref = variant.toUpperCase() + '-' + source;

  var root = document.documentElement;

  function applyLinks() {
    var text = encodeURIComponent(message(lang, ref));
    var waHref = 'https://wa.me/' + CONFIG.whatsappNumber + '?text=' + text;
    document.querySelectorAll('a[data-wa]').forEach(function (a) { a.href = waHref; });
    document.querySelectorAll('a[data-form]').forEach(function (a) { a.href = CONFIG.formUrl; });
  }

  function applyLang() {
    root.dataset.lang = lang;
    root.lang = lang === 'zh' ? 'zh-Hans' : 'en';
    document.title = TITLES[lang];
    document.querySelectorAll('[data-set-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-set-lang') === lang));
    });
    document.querySelectorAll('img[data-img]').forEach(function (img) {
      img.src = 'assets/' + lang + '-' + img.getAttribute('data-img') + '.webp';
    });
    applyLinks();
  }

  function rememberInUrl() {
    var next = new URLSearchParams(window.location.search);
    next.set('lang', lang);
    try {
      history.replaceState(null, '', window.location.pathname + '?' + next.toString() + window.location.hash);
    } catch (e) {
      // file:// pages may refuse replaceState; the toggle still works without it.
    }
  }

  root.dataset.v = variant;
  applyLang();

  document.querySelectorAll('[data-set-lang]').forEach(function (button) {
    button.addEventListener('click', function () {
      lang = pick(button.getAttribute('data-set-lang'), LANGS, 'en');
      applyLang();
      rememberInUrl();
    });
  });
})();
