import { env } from '../config/env.js';
import { findApplicationBySlug } from '../models/Application.js';

// One source of truth for the displayed/copied URL and the welcome-email CTA.
// Dietitian grants (including mixed-app companies) use the direct Dietitian login.
// Other customers retain the ZenX launcher; never fall back to it for a missing
// Dietitian configuration, which would silently recreate the wrong-link bug.
export async function resolveCompanyLoginUrl({ companySlug, applicationSlugs = [] }) {
  if (!companySlug || ['.', '..'].includes(companySlug)) return null;
  let base = env.clientOrigins[0];
  if (applicationSlugs.includes('zenx-dietitian')) {
    const app = await findApplicationBySlug('zenx-dietitian');
    base = app?.url || env.zenxDietitianUrl;
  }
  try {
    const url = new URL(base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    if (env.nodeEnv === 'production' && url.protocol !== 'https:') return null;
    url.pathname = `/${encodeURIComponent(companySlug)}/login`;
    url.search = '';
    url.hash = '';
    return url.href;
  } catch { return null; }
}
