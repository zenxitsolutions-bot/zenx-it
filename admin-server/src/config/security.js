import { isIP } from 'node:net';

// Validate before mysql2 sees a URI: its URL/parser errors and invalid-option
// warnings can otherwise print credentials during ESM import, before main().catch.
export function mysqlUri(name, fallback = '', { source = process.env, required = true } = {}) {
  const input = source[name] ?? (source.NODE_ENV === 'production' ? '' : fallback);
  if (typeof input !== 'string' || !input.trim()) {
    if (!required && (input === undefined || (typeof input === 'string' && !input.trim()))) return '';
    throw new Error(`Missing required env var: ${name}`);
  }
  const value = input.trim();
  const fail = () => { throw new Error(`${name} must be a valid mysql:// URL with a user, host and database, and supported connection options`); };
  try {
    if (/[\u0000-\u0020\u007f]/.test(value)) fail();
    const url = new URL(value);
    if (url.protocol !== 'mysql:' || !url.hostname || !url.username || url.hash) fail();
    const host = decodeURIComponent(url.hostname);
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const database = decodeURIComponent(url.pathname.slice(1));
    // Force malformed %-escapes to fail here rather than later inside mysql2.
    decodeURIComponent(url.search);
    if (!isIP(host.replace(/^\[|\]$/g, '')) && !/^[a-z0-9_][a-z0-9_.-]*$/i.test(host)) fail();
    if (!user || !database || /[\\/\u0000-\u001f\u007f]/.test(database) ||
        /[\u0000-\u001f\u007f]/.test(user + password) ||
        (url.port && (!/^\d+$/.test(url.port) || Number(url.port) < 1 || Number(url.port) > 65535))) fail();
    const numeric = { connectionLimit: [1, 1000], maxIdle: [0, 1000], queueLimit: [0, 100000],
      connectTimeout: [1, 120000], idleTimeout: [1, 3600000], keepAliveInitialDelay: [0, 3600000] };
    const booleans = new Set(['waitForConnections', 'enableKeepAlive', 'supportBigNumbers', 'bigNumberStrings', 'decimalNumbers']);
    const charsets = new Set(['UTF8', 'UTF8_GENERAL_CI', 'UTF8_UNICODE_CI', 'UTF8MB4',
      'UTF8MB4_GENERAL_CI', 'UTF8MB4_UNICODE_CI', 'LATIN1', 'LATIN1_SWEDISH_CI']);
    const seen = new Set();
    for (const [key, option] of url.searchParams) {
      if (seen.has(key)) fail();
      seen.add(key);
      if (Object.hasOwn(numeric, key)) {
        const [min, max] = numeric[key];
        if (!/^\d+$/.test(option) || Number(option) < min || Number(option) > max) fail();
      } else if (booleans.has(key)) {
        if (!['true', 'false'].includes(option)) fail();
      } else if (key === 'dateStrings') {
        const dates = JSON.parse(option);
        if (typeof dates !== 'boolean' && !(Array.isArray(dates) && dates.every((entry) => ['DATE', 'DATETIME', 'TIMESTAMP'].includes(entry)))) fail();
      } else if (key === 'charset') {
        if (!charsets.has(option.toUpperCase())) fail();
      } else if (key === 'timezone') {
        if (!/^(?:Z|local|[+ -](?:0\d|1[0-4]):[0-5]\d)$/.test(option)) fail();
      } else if (key === 'ssl') {
        // mysql2's named profile is fixed; arbitrary names are echoed by its parser.
        if (option === 'Amazon RDS' || option === 'false') continue;
        const tls = JSON.parse(option);
        if (!tls || Array.isArray(tls) || typeof tls !== 'object' ||
            Object.keys(tls).some((entry) => !['ca', 'rejectUnauthorized', 'minVersion', 'maxVersion'].includes(entry))) fail();
        if ('rejectUnauthorized' in tls && tls.rejectUnauthorized !== true) fail();
        if ('ca' in tls && !(typeof tls.ca === 'string' || (Array.isArray(tls.ca) && tls.ca.every((ca) => typeof ca === 'string')))) fail();
        for (const entry of ['minVersion', 'maxVersion']) {
          if (entry in tls && !['TLSv1.2', 'TLSv1.3'].includes(tls[entry])) fail();
        }
      } else fail(); // Disallow debug, multipleStatements, unknown keys, etc.
    }
    return value;
  } catch {
    // Do not attach the original error as a cause: URL errors retain input.
    fail();
  }
}


export function originList(name, fallback = '', { source = process.env, required = true, single = false } = {}) {
  const value = source[name] ?? (source.NODE_ENV === 'production' ? '' : fallback);
  if (!String(value).trim()) {
    if (required) throw new Error(`Missing required env var: ${name}`);
    return [];
  }
  const values = String(value).split(',').map((entry) => entry.trim());
  if (single && values.length !== 1) throw new Error(`${name} must contain one origin`);
  return [...new Set(values.map((entry) => {
    let url;
    try { url = new URL(entry); } catch { throw new Error(`${name} must contain valid HTTP(S) origins`); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash ||
        (url.pathname && url.pathname !== '/') || (source.NODE_ENV === 'production' && url.protocol !== 'https:')) {
      throw new Error(`${name} must contain origins without credentials, paths or queries; production requires HTTPS`);
    }
    return url.origin;
  }))];
}

export function boundedInteger(name, fallback, { source = process.env, min = 1, max = 1440 } = {}) {
  const value = source[name] ?? String(fallback);
  if (!/^\d+$/.test(String(value)) || Number(value) < min || Number(value) > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return Number(value);
}


// Development defaults are never accepted silently by a production process.
export function requiredEnv(name, fallback, source = process.env) {
  const value = source[name] ?? (source.NODE_ENV === 'production' ? undefined : fallback);
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing required env var: ${name}`);
  return value.trim();
}

export function secretEnv(name, fallback, source = process.env) {
  const value = requiredEnv(name, fallback, source);
  if (source.NODE_ENV === 'production' && (
    value.length < 32 || new Set(value).size < 8 ||
    /dev-|change[-_ ]?me|replace|example|your[-_ ]/i.test(value)
  )) throw new Error(`Use a unique, randomly generated secret of at least 32 characters for ${name}`);
  return value;
}

export function assertDistinctSecrets(secrets, source = process.env) {
  if (source.NODE_ENV === 'production' && new Set(secrets).size !== secrets.length) {
    throw new Error('Production access and refresh signing secrets must be distinct for every account realm');
  }
}

export function assertDemoSeedAllowed(source = process.env) {
  if (source.NODE_ENV === 'production') throw new Error('Demo seeding is disabled in production; use controlled account provisioning.');
}

// Trust only explicitly named reverse-proxy addresses; never trust arbitrary forwarded headers.
export function parseTrustProxy(value = '') {
  if (!value || value.trim() === 'false') return false;
  const addresses = value.split(',').map((part) => part.trim());
  for (const address of addresses) {
    if (address === 'loopback') continue;
    const [ip, prefix, extra] = address.split('/');
    const version = isIP(ip);
    if (!version || extra !== undefined ||
        (prefix !== undefined && (!/^\d+$/.test(prefix) || Number(prefix) < 1 || Number(prefix) > (version === 4 ? 32 : 128)))) {
      throw new Error('TRUST_PROXY must contain explicit proxy IPs/CIDRs or loopback; blanket trust is not allowed');
    }
  }
  return addresses;
}
