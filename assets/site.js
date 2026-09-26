'use strict';
(() => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');
  const desktop = window.matchMedia('(min-width: 981px)');
  function closeNav() {
    if (!nav || !toggle) return;
    nav.dataset.open = 'false';
    toggle.setAttribute('aria-expanded', 'false');
  }
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      nav.dataset.open = String(!isOpen);
      toggle.setAttribute('aria-expanded', String(!isOpen));
    });
    nav.addEventListener('click', e => {
      if (e.target.closest('a') && !desktop.matches) closeNav();
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.site-header')) {
        closeNav();
        document.querySelectorAll('.nav-list details[open]').forEach(d => d.open = false);
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const menuWasOpen = toggle.getAttribute('aria-expanded') === 'true';
      closeNav();
      document.querySelectorAll('.nav-list details[open]').forEach(d => {
        d.open = false;
        if (!menuWasOpen) d.querySelector('summary').focus();
      });
      if (menuWasOpen) toggle.focus();
    });
    desktop.addEventListener('change', closeNav);
  }
  document.querySelectorAll('[data-year]').forEach(node => { node.textContent = String(Math.max(2026, new Date().getFullYear())); });
  // These browser events are optional integration hooks, not lead or call counts.
  // No analytics endpoint, advertising tag, personal-data capture or storage runs here.
  document.addEventListener('click', e => {
    const link = e.target.closest('a[data-action]');
    if (!link) return;
    window.dispatchEvent(new CustomEvent('shaam:contact-action', {
      detail: {action: link.dataset.action, page: window.location.pathname}
    }));
  });
})();
