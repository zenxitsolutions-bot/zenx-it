// Maps an axios error from an auth request into a message safe to show inline. Login and
// register share this: no business logic in components (CLAUDE.md §3).
export function getAuthErrorMessage(error, { fallback } = {}) {
  if (!error?.response) {
    return "Can't reach the server right now. Check your connection and try again.";
  }

  const { status, data } = error.response;

  if (status === 401) {
    return data?.error === 'Invalid email or password'
      ? "That email or password doesn't look right."
      : data?.error || "That email or password doesn't look right.";
  }
  // Authenticated fine, but not permitted here — a company-scoped login URL that isn't this
  // user's tenant, or a company that isn't active (auth.controller.js#login). The server's own
  // wording is the useful part, so pass it through.
  if (status === 403) return data?.error || 'This account cannot sign in here.';
  if (status === 409) return data?.error || data?.message || 'An account with that email already exists — try logging in instead.';
  if (status === 400) return data?.error || 'Please check the highlighted fields and try again.';
  if (status === 429) return data?.error || 'Too many attempts. Please wait a moment and try again.';

  return fallback || 'Something went wrong on our end. Please try again in a moment.';
}
