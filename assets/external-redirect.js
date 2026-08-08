/* ============================================================
 *  external-redirect.js
 *  把页面上的外部链接重写到安全中转页。
 *  可直接通过 <script src=".../external-redirect.js"></script> 引入。
 *
 *  可选配置（在引入本脚本之前定义）：
 *    window.SAFE_REDIRECT_CONFIG = {
 *      goUrl: 'https://你的域名/go.html', // 不传则自动按脚本地址推导
 *      whitelist: ['a.com', '.a.com'],    // 精确/子域白名单，命中则不中转
 *      selector: 'a[href]',               // 自定义链接选择器
 *      sameSiteAlso: false                // 同源链接是否也中转（一般 false）
 *    };
 * ============================================================ */
(function () {
  'use strict';

  var CFG = window.SAFE_REDIRECT_CONFIG || {};

  // 自动推导 go.html 地址（脚本同目录的上级 go.html）
  function detectGoUrl() {
    if (CFG.goUrl) return CFG.goUrl;
    try {
      var s = document.currentScript && document.currentScript.src;
      if (s) {
        // 形如 https://xxx/assets/external-redirect.js -> https://xxx/go.html
        var a = document.createElement('a');
        a.href = s;
        return a.origin + a.pathname.replace(/\/assets\/[^/]*$/, '') + '/go.html';
      }
    } catch (e) {}
    return '/go.html';
  }

  var GO_URL = detectGoUrl();
  var WHITELIST = CFG.whitelist || [];
  var SELECTOR = CFG.selector || 'a[href]';
  var EXCLUDE = CFG.exclude || 'a:has(img), a[href$=".png"], a[href$=".jpg"], a[href$=".jpeg"], a[href$=".gif"], a[href$=".webp"], a[href$=".svg"], a[href$=".bmp"], a[href$=".ico"], a[href$=".mp4"], a[href$=".webm"], a[href$=".ogg"], a[href$=".mp3"], a[href$=".pdf"], a[href$=".zip"], a[href$=".rar"]';
  var SAME_SITE_ALSO = !!CFG.sameSiteAlso;
  var EXTRA = CFG.extraParams || ''; // 附加参数，如 &ref=blog

  function isWhitelisted(host) {
    host = host.toLowerCase();
    return WHITELIST.some(function (d) {
      d = d.toLowerCase();
      return d.charAt(0) === '.'
        ? host === d.slice(1) || host.endsWith(d)
        : host === d;
    });
  }

  function shouldRedirect(url) {
    if (!url) return false;
    // 只处理 http/https
    if (!/^https?:\/\//i.test(url)) return false;

    var u;
    try { u = new URL(url, location.href); } catch (e) { return false; }

    // 自己的中转页地址，不再重复包一层
    if (u.pathname.replace(/\/+$/, '').endsWith('/go.html')) return false;

    if (!SAME_SITE_ALSO && u.hostname === location.hostname) return false;
    if (isWhitelisted(u.hostname)) return false;

    return true;
  }

  function makeGoUrl(original) {
    var sep = GO_URL.indexOf('?') > -1 ? '&' : '?';
    return GO_URL + sep + 'url=' + encodeURIComponent(original) + EXTRA;
  }

  function processLink(a) {
    if (!a || a.dataset.redirectProcessed) return;
    // 排除匹配的元素
    if (EXCLUDE && a.matches(EXCLUDE)) {
      a.dataset.redirectProcessed = '1';
      return;
    }
    var href = a.getAttribute('href');
    if (!shouldRedirect(href)) {
      a.dataset.redirectProcessed = '1';
      return;
    }
    a.href = makeGoUrl(href);
    a.dataset.redirectProcessed = '1';
    // 新标签打开，更友好
    if (!a.target) a.target = '_blank';
    a.rel = (a.rel ? a.rel + ' ' : '') + 'noopener noreferrer';
  }

  function processAll(root) {
    (root || document).querySelectorAll(SELECTOR).forEach(processLink);
  }

  function init() {
    processAll(document);

    // 监听动态插入的链接（PJAX / 评论 / 无限加载等）
    if ('MutationObserver' in window) {
      var mo = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          m.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            if (node.matches && node.matches(SELECTOR)) processLink(node);
            if (node.querySelectorAll) processAll(node);
          });
        });
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }

    // PJAX 完成时再处理一遍（butterfly 用 pjax）
    document.addEventListener('pjax:complete', function () { processAll(document); });
    document.addEventListener('DOMContentLoaded', function () { processAll(document); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
