'use strict';
// Campaign measurement tags: two Google Tag Manager containers and Microsoft Clarity.
// These load on the live site only, so local previews and test hosts stay out of reports.
// Search Console verification is a meta tag in each page head, not part of this file.
(function (w, d) {
  var live = w.location.protocol === 'https:' &&
    ['shaamgutters.ca', 'www.shaamgutters.ca'].indexOf(w.location.hostname) !== -1;
  if (!live) return;

  function load(src) {
    var s = d.createElement('script');
    s.async = true;
    s.src = src;
    var first = d.getElementsByTagName('script')[0];
    first.parentNode.insertBefore(s, first);
  }

  // Google Tag Manager
  w.dataLayer = w.dataLayer || [];
  ['GTM-KK38HBDD', 'GTM-NLM8NKF9'].forEach(function (id) {
    w.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
    load('https://www.googletagmanager.com/gtm.js?id=' + id);
  });

  // Microsoft Clarity
  w.clarity = w.clarity || function () { (w.clarity.q = w.clarity.q || []).push(arguments); };
  load('https://www.clarity.ms/tag/z9iceygrxr');
})(window, document);
