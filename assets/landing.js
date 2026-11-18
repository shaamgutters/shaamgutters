'use strict';
// Campaign landing page estimate form.
// The site CSP blocks form posts (form-action 'none'), so the details are not sent
// anywhere by this page. On submit they are copied into the existing SHAAM Google
// Form as pre-filled answers and that form opens in a new tab for the visitor to submit.
// The open goes through the page's normal quote link, so privacy.js still adds the
// consented quote reference and site.js still emits the quote_form_open action.
(() => {
  const form = document.querySelector('[data-lp-form]');
  const quoteLink = document.querySelector('[data-lp-quote-link]');
  if (!form || !quoteLink) return;

  const entries = {
    name: 'entry.2005620554',
    email: 'entry.1045781291',
    address: 'entry.1065046570',
    phone: 'entry.1166974658',
    service: 'entry.839337160'
  };
  const city = form.dataset.lpCity || '';
  const status = form.querySelector('[data-lp-status]');
  const select = form.querySelector('select[name="service"]');
  let prefill = null;

  // Warm up privacy.js's quote reference as soon as the visitor starts the form.
  form.addEventListener('focusin', () => {
    quoteLink.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
  }, {once: true});

  // Runs after privacy.js's capture listener has reset the href, before navigation.
  quoteLink.addEventListener('click', () => {
    if (!prefill) return;
    const url = new URL(quoteLink.href);
    url.searchParams.set('usp', 'pp_url');
    Object.keys(prefill).forEach(key => {
      if (prefill[key]) url.searchParams.set(entries[key], prefill[key]);
    });
    quoteLink.href = url.href;
    prefill = null;
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const v = name => (form.elements[name].value || '').trim();
    const details = v('details');
    prefill = {
      name: [v('first_name'), v('last_name')].filter(Boolean).join(' '),
      email: v('email'),
      address: v('address'),
      phone: v('phone'),
      service: [v('service'), details, city ? '(' + city + ' campaign page)' : '']
        .filter(Boolean).join(' - ')
    };
    quoteLink.click();
    if (status) {
      status.hidden = false;
      status.textContent = 'Your details are filled in on our Google Form in a new tab. Press Submit there to send your request.';
    }
  });

  // "Get quote" links on service cards pre-select the service and jump to the form.
  document.querySelectorAll('[data-lp-service]').forEach(link => {
    link.addEventListener('click', () => {
      if (select) select.value = link.dataset.lpService;
      const first = form.querySelector('input');
      if (first) setTimeout(() => first.focus({preventScroll: true}), 350);
    });
  });
})();
