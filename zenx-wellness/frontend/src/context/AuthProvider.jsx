import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authService from '../services/authService.js'
import { clearToken, getToken, setToken } from '../utils/storage.js'
import { AuthContext } from './AuthContext.jsx'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initialising, setInitialising] = useState(true)

  // A token on its own proves nothing — always confirm it against /auth/me.
  useEffect(() => {
    let cancelled = false

    const restoreSession = async () => {
      if (!getToken()) {
        if (!cancelled) setInitialising(false)
        return
      }

      try {
        const currentUser = await authService.getCurrentUser()
        if (!cancelled) setUser(currentUser)
      } catch {
        clearToken()
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setInitialising(false)
      }
    }

    restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async ({ email, password, rememberMe }) => {
    const { user: loggedInUser, token } = await authService.login({ email, password, rememberMe })
    setToken(token, Boolean(rememberMe))
    setUser(loggedInUser)
    return loggedInUser
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    clearToken()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), initialising, login, logout }),
    [user, initialising, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
