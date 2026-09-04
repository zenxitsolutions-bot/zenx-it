const TOKEN_KEY = 'zenx.token'

/**
 * "Remember me" decides where the token lives: localStorage survives a browser
 * restart, sessionStorage is dropped when the tab closes.
 */
export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const setToken = (token, remember) => {
  try {
    clearToken()
    const store = remember ? localStorage : sessionStorage
    store.setItem(TOKEN_KEY, token)
  } catch {
    // Storage can be unavailable (private mode); the session then lasts until reload.
  }
}

export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nothing to clean up.
  }
}
