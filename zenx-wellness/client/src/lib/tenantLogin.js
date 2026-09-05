const RESERVED = new Set([
  'login',
  'app',
  'unauthorized',
  'forgot-password',
  'reset-password',
  'change-password',
]);

/** Tenant login path for a pathname like /fitlife/app/overview → /fitlife/login. */
export function tenantLoginFromPath(pathname) {
  const segment = pathname.split('/').filter(Boolean)[0];
  if (segment && !RESERVED.has(segment)) return `/${segment}/login`;
  return '/login';
}
