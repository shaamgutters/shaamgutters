/** @OnlyCurrentDoc */
const GA4_ID = 'G-5SJNMG6B1C';

function installQuoteTracking() {
  const form = FormApp.getActiveForm();
  const secret = PropertiesService.getScriptProperties().getProperty('GA4_API_SECRET');
  if (!form || !secret || !secret.trim()) throw new Error('Form or secret missing.');
  if (!form.getItems(FormApp.ItemType.TEXT).some(item => item.getTitle() === 'Quote reference')) {
    throw new Error('Quote reference field missing.');
  }
  const matches = ScriptApp.getProjectTriggers().filter(trigger =>
    trigger.getHandlerFunction() === 'onQuoteSubmit' && trigger.getTriggerSourceId() === form.getId());
  if (!matches.length) ScriptApp.newTrigger('onQuoteSubmit').forForm(form).onFormSubmit().create();
  matches.slice(1).forEach(trigger => ScriptApp.deleteTrigger(trigger));
  console.log('Submission trigger ready. Existing responses stay unchanged.');
}

function onQuoteSubmit(e) {
  if (!e || !e.response) throw new Error('Submit the form to run this function.');
  const response = e.response;
  const reference = response.getItemResponses().find(answer =>
    answer.getItem().getTitle() === 'Quote reference');
  const text = reference ? String(reference.getResponse()).trim() : '';
  const match = /^SG1\|(\d{1,20}\.\d{1,20})\|(\d{1,13})\|(\d{13})\|([a-f0-9]{32})\|(live|test)$/.exec(text);
  if (!match) { console.log('Skipped: no valid website reference.'); return; }
  const now = Date.now();
  const submitted = response.getTimestamp().getTime();
  const issued = Number(match[3]);
  const session = Number(match[2]);
  const day = 86400000;
  if (!Number.isSafeInteger(session) || session <= 0 ||
      submitted > now + 300000 || now - submitted > day ||
      issued > submitted + 300000 || submitted - issued > day ||
      session * 1000 > issued + 300000 || submitted - session * 1000 > day) {
    console.log('Skipped: reference expired or invalid.'); return;
  }
  const responseId = response.getId();
  if (!responseId) throw new Error('Submission ID missing.');
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, responseId)
    .map(value => ('0' + ((value + 256) % 256).toString(16)).slice(-2)).join('');
  const marker = 'quote_sent_' + digest;
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const properties = PropertiesService.getScriptProperties();
    if (properties.getProperty(marker)) { console.log('Skipped: already attempted.'); return; }
    const secret = properties.getProperty('GA4_API_SECRET');
    if (!secret || !secret.trim()) throw new Error('GA4_API_SECRET missing.');
    const payload = {
      client_id: match[1],
      timestamp_micros: submitted * 1000,
      consent: {ad_user_data: 'DENIED', ad_personalization: 'DENIED'},
      events: [{name: 'generate_lead', params: {
        session_id: session, form_name: 'shaam_quote', lead_source: 'website'
      }}]
    };
    const suffix = '?measurement_id=' + GA4_ID + '&api_secret=' + encodeURIComponent(secret.trim());
    if (match[5] === 'test') {
      payload.validation_behavior = 'ENFORCE_RECOMMENDATIONS';
      const validation = postAnalytics('/debug/mp/collect' + suffix, payload);
      let report;
      try { report = JSON.parse(validation.getContentText()); }
      catch (_) { throw new Error('Validation response unreadable.'); }
      if (!Array.isArray(report.validationMessages) || report.validationMessages.length) {
        throw new Error('Analytics payload validation failed.');
      }
      delete payload.validation_behavior;
      payload.events[0].name = 'quote_tracking_test';
      payload.events[0].params.debug_mode = 1;
      console.log('Lead payload validation passed. Sending a test event only.');
    }
    // Mark before sending. An uncertain network result must not create a duplicate.
    properties.setProperty(marker, String(now));
    Object.entries(properties.getProperties()).forEach(([name, value]) => {
      if (name.startsWith('quote_sent_') && Number(value) < now - 30 * day) properties.deleteProperty(name);
    });
    postAnalytics('/mp/collect' + suffix, payload);
    console.log(match[5] === 'test' ? 'Test request accepted. Confirm in Analytics.' : 'Lead request accepted.');
  } finally { lock.releaseLock(); }
}

function postAnalytics(path, payload) {
  let result;
  try {
    result = UrlFetchApp.fetch('https://www.google-analytics.com' + path, {
      method: 'post', contentType: 'application/json', payload: JSON.stringify(payload),
      muteHttpExceptions: true, followRedirects: false
    });
  } catch (_) { throw new Error('Analytics network error. Check execution status before any retry.'); }
  const code = result.getResponseCode();
  if (code < 200 || code >= 300) throw new Error('Analytics HTTP error: ' + code);
  return result;
}
