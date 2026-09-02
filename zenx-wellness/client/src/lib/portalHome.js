// Every role currently lands on the same "overview" route (which renders role-specific content
// itself — see OverviewPage). Kept as a lookup rather than a literal so a future phase can give
// a role its own distinct landing route without touching every redirect call site.
const PORTAL_HOME_BY_ROLE = {
  client: 'overview',
  dietitian: 'overview',
  admin: 'overview',
};

export function getPortalHome(role, companySlug) {
  const page = PORTAL_HOME_BY_ROLE[role] ?? 'overview';
  if (!companySlug) return '/login';
  return `/${companySlug}/app/${page}`;
}
