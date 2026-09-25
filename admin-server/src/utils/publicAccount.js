// Account rows are used internally for authentication. Strip credentials at every response
// boundary, including admin-only provisioning/list/edit endpoints; never mutate the DB row.
const privateFields = new Set([
  'password', 'password_hash', 'passwordHash', 'temporaryPassword',
  'access_token', 'accessToken', 'refresh_token', 'refreshToken', 'token', 'token_hash',
  'refresh_token_version', 'refreshTokenVersion', 'credential_hash', 'refresh_token_hash',
  'handoff_secret', 'handoffSecret',
]);

export function toPublicAccount(account) {
  if (!account) return account;
  return Object.fromEntries(Object.entries(account).filter(([key]) => !privateFields.has(key)));
}

export function toPublicApplication(application) {
  if (!application) return application;
  const { id, name, slug, description, url, created_at } = application;
  return { id, name, slug, description, url, created_at };
}
