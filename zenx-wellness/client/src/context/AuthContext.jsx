import { createContext, useCallback, useEffect, useState } from 'react';
import { setAccessToken } from '../api/tokenStore';
import { onPasswordChangeRequired } from '../api/authEvents';
import { loginRequest, handoffRequest, changePasswordRequest, logoutRequest, meRequest, refreshRequest } from '../api/auth.api';
import { useDeviceNotifications } from '../hooks/useDeviceNotifications';
import { useBrowserTimezone } from '../hooks/useBrowserTimezone.js';
import { updateMeRequest } from '../api/users.api';
import { canonicalTimezone, mergeDetectedTimezoneUpdate } from '../lib/timezone.js';
import { useQueryClient } from '@tanstack/react-query';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const detectedTimezone = useBrowserTimezone();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || user.mustChangePassword
      || canonicalTimezone(user.detectedTimezone) === canonicalTimezone(detectedTimezone)) return;
    let active = true;
    const requested = user;
    updateMeRequest({ detectedTimezone }).then((updated) => {
      if (!active) return;
      setUser((current) => mergeDetectedTimezoneUpdate(current, requested, updated));
      // First detection can initialize legacy UTC hours. Refresh any already-open queries.
      for (const queryKey of [['calls', 'available-slots'], ['insights'], ['users']]) {
        queryClient.invalidateQueries({ queryKey });
      }
    }).catch(() => {
      // Local conversion still works offline. Retry on the next login/reload.
    });
    return () => { active = false; };
  }, [user, detectedTimezone, queryClient]);

  useEffect(() => {
    refreshRequest()
      .then(({ accessToken }) => {
        setAccessToken(accessToken);
        return meRequest();
      })
      .then(({ user }) => setUser(user))
      .catch(() => setAccessToken(null))
      .finally(() => setIsLoading(false));
  }, []);

  // Admin reset (or a still-open session after one) 403s every protected call except
  // change-password / me / logout. Reload /auth/me so ProtectedRoute can send them there
  // immediately instead of leaving a half-working UI.
  useEffect(() => {
    return onPasswordChangeRequired(() => {
      meRequest()
        .then(({ user }) => setUser(user))
        .catch(() => {});
    });
  }, []);

  const login = useCallback(async (credentials) => {
    setAccessToken(null);
    const { user, accessToken } = await loginRequest(credentials);
    setAccessToken(accessToken);
    setUser(user);
    return user;
  }, []);

  const completeHandoff = useCallback(async (token, companySlug) => {
    const { user, accessToken } = await handoffRequest(token, companySlug);
    setAccessToken(accessToken);
    setUser(user);
    return user;
  }, []);

  const changePassword = useCallback(async (payload) => {
    const { user, accessToken } = await changePasswordRequest(payload);
    setAccessToken(accessToken);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest().catch(() => {});
    setAccessToken(null);
    setUser(null);
  }, []);

  // Lets a mutation that returns the updated user (e.g. PATCH /users/me) keep this context in
  // sync without a full page reload.
  const updateUser = useCallback((updated) => setUser(updated), []);

  return (
    <AuthProviderInner user={user} isLoading={isLoading} login={login} completeHandoff={completeHandoff} changePassword={changePassword} logout={logout} updateUser={updateUser}>
      {children}
    </AuthProviderInner>
  );
}

function AuthProviderInner({ user, isLoading, login, completeHandoff, changePassword, logout, updateUser, children }) {
  useDeviceNotifications(Boolean(user));

  return (
    <AuthContext.Provider value={{ user, isLoading, login, completeHandoff, changePassword, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
