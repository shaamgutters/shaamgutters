'use strict';
(() => {
  const config = window.SHAAM_ANALYTICS || {};
  const id = typeof config.measurementId === 'string' ? config.measurementId.trim() : '';
  const configured = config.enabled === true && /^G-[A-Z0-9]{6,20}$/.test(id);
  const production = location.protocol === 'https:' && ['shaamgutters.ca', 'www.shaamgutters.ca'].includes(location.hostname);
  const enabled = configured && production;
  const key = 'shaam.analytics-choice.v2';
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  const banner = document.getElementById('analytics-banner');
  const dialog = document.getElementById('privacy-dialog');
  const status = document.querySelector('[data-consent-status]');
  const controls = document.querySelector('[data-consent-enabled]');
  const canonical = document.querySelector('link[rel="canonical"]');
  const robots = document.querySelector('meta[name="robots"]');
  const canonicalURL = canonical ? new URL(canonical.href) : null;
  const trackable = Boolean(canonicalURL && canonicalURL.hostname === 'shaamgutters.ca' && !(robots && /noindex/i.test(robots.content)));
  const cleanURL = canonicalURL ? canonicalURL.href : '';
  const actions = new Set(['quote_form_open', 'phone_click', 'email_click']);
  const quoteLinks = Array.from(document.querySelectorAll('a[data-action="quote_form_open"]'));
  const quoteBase = new Map(quoteLinks.map(link => [link, link.href]));
  const referenceEntry = 'entry.1379403889';
  let quoteIdentity = null;
  let identityPending = false;
  let identityGeneration = 0;
  let choice = null;
  let started = false;
  let loadFailed = false;
  let returnFocus = null;
  let storageWorked = true;

  function readChoice() {
    try {
      const data = JSON.parse(localStorage.getItem(key) || 'null');
      const now = Date.now();
      if (data && data.version === 2 && data.measurementId === id &&
          ['granted', 'denied'].includes(data.choice) && Number.isFinite(data.expires) &&
          data.expires > now && data.expires <= now + lifetime + 60000) return data.choice;
    } catch (_) { /* Unavailable or corrupt storage leaves optional analytics off. */ }
    return null;
  }

  function remember(next) {
    try {
      localStorage.setItem(key, JSON.stringify({version: 2, measurementId: id, choice: next, expires: Date.now() + lifetime}));
      storageWorked = true;
    } catch (_) { storageWorked = false; }
  }

  function tellVisitor() {
    let message;
    if (!enabled) message = 'Optional analytics is not active on this website.';
    else if (choice === 'granted') message = 'Analytics permission is on. Reject analytics at any time through these settings.';
    else if (choice === 'denied') message = 'Analytics is off. Browsing and estimates still work.';
    else message = 'Analytics is off until you choose Accept analytics.';
    if (enabled && choice && !storageWorked) message += ' Your browser did not save this choice, so we will ask again on another page.';
    if (loadFailed && choice === 'granted') message += ' The analytics service did not load. Browsing and quotes still work.';
    if (status) status.textContent = message;
    document.querySelectorAll('[data-analytics-status]').forEach(node => { node.textContent = message; });
    if (controls) controls.hidden = !enabled;
    if (banner) banner.hidden = !(enabled && choice === null);
  }

  function clearAnalyticsCookies() {
    const names = document.cookie.split(';').map(part => part.split('=')[0].trim()).filter(name => /^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name));
    const host = location.hostname;
    const domains = ['', host, '.' + host, 'shaamgutters.ca', '.shaamgutters.ca'];
    const pathParts = location.pathname.split('/').filter(Boolean);
    const paths = new Set(['/']);
    let prefix = '';
    pathParts.forEach(part => { prefix += '/' + part; paths.add(prefix); paths.add(prefix + '/'); });
    for (const name of names) for (const domain of domains) for (const path of paths) {
      document.cookie = name + '=; Max-Age=0; Path=' + path + (domain ? '; Domain=' + domain : '') + '; SameSite=Lax; Secure';
    }
  }

  function referralOrigin() {
    // Retain the referring website for acquisition reports without sharing its
    // path, query, fragment, credentials or the user's search terms.
    try {
      const ref = new URL(document.referrer);
      if (['https:', 'http:'].includes(ref.protocol)) return ref.origin + '/';
    } catch (_) { /* A missing referrer is normal for direct visits. */ }
    return '';
  }

  function campaignFields() {
    // Read only named marketing labels, after consent. Never use customer names,
    // email addresses, phone numbers or private tokens in UTM campaign labels.
    // Other URL parameters, including ad click identifiers, are not forwarded.
    const params = new URLSearchParams(location.search);
    const fields = {};
    const names = {
      utm_source: 'campaign_source', utm_medium: 'campaign_medium',
      utm_campaign: 'campaign_name', utm_id: 'campaign_id',
      utm_term: 'campaign_term', utm_content: 'campaign_content'
    };
    for (const [input, output] of Object.entries(names)) {
      const value = (params.get(input) || '').trim();
      // Conservative label validation is not a substitute for owner data hygiene.
      if (/^[A-Za-z][A-Za-z0-9 ._~-]{0,99}$/.test(value) &&
          value.replace(/\D/g, '').length < 7) fields[output] = value;
    }
    return fields;
  }

  function clearQuoteReferences() {
    quoteIdentity = null;
    identityPending = false;
    identityGeneration++;
    quoteLinks.forEach(link => { link.href = quoteBase.get(link); });
  }

  function updateQuoteReferences() {
    const allowed = enabled && choice === 'granted' && started && trackable && !loadFailed;
    const fresh = quoteIdentity && Date.now() - quoteIdentity.received < 60000;
    quoteLinks.forEach(link => {
      const url = new URL(quoteBase.get(link));
      if (allowed && fresh && window.crypto && window.crypto.getRandomValues) {
        const nonce = Array.from(window.crypto.getRandomValues(new Uint8Array(16)))
          .map(value => value.toString(16).padStart(2, '0')).join('');
        const mode = new URLSearchParams(location.search).get('quote_tracking_test') === '1' ? 'test' : 'live';
        url.searchParams.set('usp', 'pp_url');
        url.searchParams.set(referenceEntry, ['SG1', quoteIdentity.client, quoteIdentity.session,
          Date.now(), nonce, mode].join('|'));
      }
      link.href = url.href;
    });
  }

  function prepareQuoteReferences() {
    if (!enabled || choice !== 'granted' || !started || !trackable || loadFailed || identityPending) return;
    identityPending = true;
    const generation = ++identityGeneration;
    // Ignore delayed callbacks after withdrawal or a timed-out request.
    const timeout = setTimeout(() => {
      if (generation === identityGeneration) { identityPending = false; identityGeneration++; }
    }, 3000);
    window.gtag('get', id, 'client_id', client => {
      if (generation !== identityGeneration || choice !== 'granted') return;
      window.gtag('get', id, 'session_id', session => {
        if (generation !== identityGeneration || choice !== 'granted') return;
        clearTimeout(timeout);
        identityPending = false;
        const now = Date.now();
        const sessionNumber = Number(session);
        if (!/^\d{1,20}\.\d{1,20}$/.test(String(client)) ||
            !/^\d{1,13}$/.test(String(session)) || !Number.isSafeInteger(sessionNumber) ||
            sessionNumber <= 0 || sessionNumber * 1000 > now + 300000 ||
            now - sessionNumber * 1000 > 86400000) {
          quoteIdentity = null;
        } else { quoteIdentity = {client: String(client), session: String(session), received: now}; }
        updateQuoteReferences();
      });
    });
  }

  // Keep normal anchor navigation. If the tag is blocked or not ready, quotes
  // still open without a reference and no completed analytics event is sent.
  ['pointerover', 'pointerdown', 'focusin'].forEach(type => {
    document.addEventListener(type, event => {
      if (event.target.closest('a[data-action="quote_form_open"]')) prepareQuoteReferences();
    });
  });
  ['click', 'auxclick', 'contextmenu'].forEach(type => {
    document.addEventListener(type, event => {
      if (!event.target.closest('a[data-action="quote_form_open"]')) return;
      updateQuoteReferences();
      prepareQuoteReferences();
    }, true);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { updateQuoteReferences(); prepareQuoteReferences(); }
  });

  function startAnalytics() {
    if (!enabled || choice !== 'granted' || started || !trackable) return;
    started = true;
    window['ga-disable-' + id] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    // Basic consent: no Google tag or analytics request exists before acceptance.
    window.gtag('consent', 'default', {
      analytics_storage: 'denied', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('consent', 'update', {analytics_storage: 'granted'});
    // Use one config-generated page view per document. No separate manual
    // page_view event is sent, so Page views can remain enabled in GA4.
    // Keep canonical page URLs clean and preserve only a referrer's origin.
    const referrer = referralOrigin();
    const campaign = campaignFields();
    window.gtag('set', {page_location: cleanURL, page_referrer: referrer,
      allow_google_signals: false, allow_ad_personalization_signals: false});
    window.gtag('js', new Date());
    window.gtag('config', id, {
      ...campaign,
      ...(new URLSearchParams(location.search).get('quote_tracking_test') === '1' ? {debug_mode: true} : {}),
      send_page_view: true, page_location: cleanURL, page_title: document.title,
      page_referrer: referrer,
      allow_google_signals: false, allow_ad_personalization_signals: false,
      cookie_expires: lifetime / 1000, cookie_flags: 'SameSite=Lax;Secure'
    });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    tag.addEventListener('error', () => { loadFailed = true; clearQuoteReferences(); tellVisitor(); });
    document.head.append(tag);
    prepareQuoteReferences();
  }

  function closeDialog() {
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
    if (returnFocus && returnFocus.isConnected) returnFocus.focus();
  }

  function choose(next) {
    if (!enabled || !['granted', 'denied'].includes(next)) return;
    const wasStarted = started;
    choice = next;
    remember(next);
    if (next === 'granted') { try { sessionStorage.removeItem('shaam.analytics-denied'); } catch (_) { /* Storage optional. */ } }
    if (next === 'denied') {
      clearQuoteReferences();
      window['ga-disable-' + id] = true;
      clearAnalyticsCookies();
      tellVisitor();
      // Removing a script element does not stop code already loaded. Reload after
      // withdrawal so the next document never loads the tag. No denied-mode pings.
      if (wasStarted) {
        if (!storageWorked) {
          // A page-scoped denial survives reload via sessionStorage if available.
          try { sessionStorage.setItem('shaam.analytics-denied', id); } catch (_) { /* Browser-level blocking still applies. */ }
        }
        location.reload();
        return;
      }
    } else {
      startAnalytics();
      tellVisitor();
    }
    // Keep the preference dialog open so the real saved-state message is visible.
    if (document.activeElement && banner && banner.contains(document.activeElement)) {
      const fallback = document.querySelector('[data-privacy-settings]');
      if (fallback) fallback.focus({preventScroll: true});
    }
  }

  document.querySelectorAll('[data-privacy-settings]').forEach(button => {
    button.addEventListener('click', () => {
      if (!dialog) return;
      returnFocus = button;
      tellVisitor();
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      const close = dialog.querySelector('[data-consent-close]');
      if (close) close.focus();
    });
  });
  document.querySelectorAll('[data-consent-close]').forEach(button => button.addEventListener('click', closeDialog));
  document.querySelectorAll('[data-consent-choice]').forEach(button => button.addEventListener('click', () => choose(button.dataset.consentChoice)));
  if (dialog) {
    dialog.addEventListener('cancel', () => { if (returnFocus) returnFocus.focus(); });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog();
    });
  }
  window.addEventListener('shaam:contact-action', event => {
    const action = event.detail && event.detail.action;
    if (!enabled || choice !== 'granted' || !started || !trackable || !actions.has(action)) return;
    // Intent only. A link tap is never reported as a completed call or enquiry.
    window.gtag('event', action, {send_to: id, page_location: cleanURL});
  });
  window.addEventListener('storage', event => {
    if (!enabled || (event.key !== key && event.key !== null)) return;
    const next = readChoice();
    if (next === choice) return;
    choice = next;
    if (choice !== 'granted' && started) {
      clearQuoteReferences();
      window['ga-disable-' + id] = true;
      clearAnalyticsCookies();
      location.reload();
      return;
    }
    startAnalytics();
    tellVisitor();
  });
  if (enabled) {
    choice = readChoice();
    try { if (sessionStorage.getItem('shaam.analytics-denied') === id) choice = 'denied'; } catch (_) { /* Storage optional. */ }
    if (choice === 'denied') clearAnalyticsCookies();
    startAnalytics();
  }
  tellVisitor();
})();
