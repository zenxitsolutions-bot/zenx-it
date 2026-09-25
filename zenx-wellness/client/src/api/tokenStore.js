let accessToken = null;
let authGeneration = 0;
let authController = new AbortController();
let refreshAllowed = true; // Initial bootstrap may restore the HttpOnly cookie once.

export const getAccessToken = () => accessToken;
export const getAuthGeneration = () => authGeneration;
export const getAuthSignal = () => authController.signal;
export const canRefreshSession = () => refreshAllowed;
export const beginAuthTransition = () => {
  authGeneration += 1;
  accessToken = null;
  refreshAllowed = false;
  authController.abort();
  authController = new AbortController();
  return authGeneration;
};
export const setAccessToken = (token, expectedGeneration = authGeneration) => {
  if (expectedGeneration !== authGeneration) return false;
  accessToken = token;
  refreshAllowed = Boolean(token);
  return true;
};
