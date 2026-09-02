function clientOrigin() {
  return process.env.CLIENT_ORIGIN || 'http://localhost:5173';
}

export function companyLoginUrl(userOrSlug) {
  const slug = typeof userOrSlug === 'string' ? userOrSlug : userOrSlug?.companySlug;
  return slug ? `${clientOrigin()}/${slug}/login` : `${clientOrigin()}/login`;
}

export function portalPathUrl(user, path) {
  const slug = user?.companySlug;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return slug ? `${clientOrigin()}/${slug}${clean}` : `${clientOrigin()}${clean}`;
}
