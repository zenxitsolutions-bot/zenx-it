// Queues and audit APIs are not credential stores. Authentication links are created
// by the worker at delivery time and live only in the rendered message in memory.
const CREDENTIAL_KEY = /password|secret|token|(?:reset|setup|set_password)_url|authorization/i;
const CREDENTIAL_URL = /[?&#](?:token|password|secret|code|access_token|refresh_token)=/i;
const WELCOME_KEYS = ['client_name', 'company_name', 'dietitian_name', 'plan_name', 'plan_duration', 'login_url'];

export function welcomeQueueParams(params = {}) {
  return Object.fromEntries(WELCOME_KEYS.filter((key) => params[key] !== undefined).map((key) => [key, params[key]]));
}

export function assertSafeQueueParams(params) {
  function inspect(value) {
    if (typeof value === 'string' && CREDENTIAL_URL.test(value)) throw new Error('Authentication links cannot be stored in the email queue');
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (CREDENTIAL_KEY.test(key)) throw new Error('Credentials cannot be stored in the email queue');
      inspect(child);
    }
  }
  inspect(params);
}

// Only explicit, non-secret metadata is returned. This also protects legacy rows
// that already contain passwords or links, without mutating their stored records.
export function publicEmailLog(row) {
  if (!row) return null;
  const keys = ['id', 'to', 'templateKey', 'subject', 'relatedEntity', 'status', 'attempts', 'maxAttempts',
    'nextAttemptAt', 'sentAt', 'createdAt', 'updatedAt'];
  return {
    ...Object.fromEntries(keys.map((key) => [key, row[key]])),
    error: row.error ? 'Delivery failed. Check the email service configuration and retry.' : null,
  };
}

// Never preserve SQL statements, SMTP responses, rendered email bodies, or tokens
// supplied by third-party exceptions. Operators can correlate via email_log.id.
export function safeEmailFailure() {
  return 'Email delivery failed';
}

export function isSensitiveMessage({ sensitive, html = '', text = '' }) {
  return sensitive === true || CREDENTIAL_URL.test(html) || CREDENTIAL_URL.test(text);
}
