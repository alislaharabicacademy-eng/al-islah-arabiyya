/* Al Islah Arabic Academy public-only GA4 integration.
 * Consent is optional, explicit and revocable. Never load the Google tag on
 * admin/student/teacher pages or send query strings/form contents to Analytics.
 */
(() => {
  'use strict';
  const MEASUREMENT_ID = 'G-XQEL7QXFLD';
  const CONSENT_KEY = 'alia-public-analytics-consent-v1';
  const PUBLIC_FILES = new Set(['', 'index.html', 'all-courses.html', 'admission.html', 'courses.html']);
  const filename = (location.pathname.split('/').pop() || '').toLowerCase();
  if (!PUBLIC_FILES.has(filename)) return;

  let memoryChoice = null;
  let loaded = false;
  let notice = null;
  const readChoice = () => {
    try {
      const stored = window.localStorage.getItem(CONSENT_KEY);
      return stored === 'yes' || stored === 'no' ? stored : memoryChoice;
    } catch (_) {
      return memoryChoice;
    }
  };
  const writeChoice = value => {
    memoryChoice = value;
    try { window.localStorage.setItem(CONSENT_KEY, value); } catch (_) {}
  };
  const safeReferrer = () => {
    try {
      const url = new URL(document.referrer);
      return url.origin;
    } catch (_) {
      return '';
    }
  };
  function startTracking() {
    if (loaded || readChoice() !== 'yes') return;
    loaded = true;
    window['ga-disable-' + MEASUREMENT_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID, {
      send_page_view: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: location.origin + location.pathname,
      page_referrer: safeReferrer(),
      page_title: document.title
    });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
    tag.onerror = () => { /* blockers must never break the website */ };
    document.head.append(tag);
  }
  function stopTracking() {
    window['ga-disable-' + MEASUREMENT_ID] = true;
    // Best-effort cleanup of GA cookies written on this browser/origin.
    try {
      document.cookie.split(';').forEach(part => {
        const key = part.trim().split('=')[0];
        if (!/^_ga(?:_|$)/.test(key)) return;
        document.cookie = key + '=; Max-Age=0; path=/; SameSite=Lax';
        document.cookie = key + '=; Max-Age=0; path=' + (location.pathname.substring(0, location.pathname.lastIndexOf('/') + 1) || '/') + '; SameSite=Lax';
      });
    } catch (_) {}
  }
  function drawChoice() {
    if (notice) notice.hidden = readChoice() !== null;
  }
  function setChoice(value) {
    writeChoice(value);
    if (value === 'yes') startTracking();
    else stopTracking();
    drawChoice();
  }
  function boot() {
    const prompt = document.createElement('aside');
    prompt.id = 'aliaAnalyticsConsent';
    prompt.setAttribute('aria-label', 'Optional website analytics');
    prompt.innerHTML = '<strong>Help us improve our academy website</strong>' +
      '<p>Allow Google Analytics on public pages only? We do not track student, teacher or admin portals, and we do not send form answers. உங்கள் விருப்பப்படி தேர்ந்தெடுக்கலாம்.</p>' +
      '<div class="alia-analytics-buttons"><button type="button" data-analytics-choice="no">No, thanks</button><button type="button" data-analytics-choice="yes">Allow analytics</button></div>';
    prompt.addEventListener('click', event => {
      const button = event.target.closest('button[data-analytics-choice]');
      if (button) setChoice(button.dataset.analyticsChoice);
    });
    notice = prompt;
    document.body.append(prompt);
    const manage = document.createElement('button');
    manage.id = 'aliaAnalyticsSettings';
    manage.type = 'button';
    manage.textContent = 'Privacy choices';
    manage.setAttribute('aria-label', 'Change optional Analytics privacy choice');
    manage.addEventListener('click', () => {
      prompt.hidden = false;
      prompt.querySelector('button')?.focus();
    });
    document.body.append(manage);
    drawChoice();
    if (readChoice() === 'yes') startTracking();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.addEventListener('storage', event => {
    if (event.key !== CONSENT_KEY) return;
    if (event.newValue === 'no') stopTracking();
    if (event.newValue === 'yes') startTracking();
    drawChoice();
  });
})();
