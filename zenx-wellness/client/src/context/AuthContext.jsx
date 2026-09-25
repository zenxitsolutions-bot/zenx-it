import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { setAccessToken, getAccessToken, getAuthGeneration, beginAuthTransition, canRefreshSession } from '../api/tokenStore';
import { onPasswordChangeRequired, onSessionEnded } from '../api/authEvents';
import { loginRequest, handoffRequest, changePasswordRequest, logoutRequest, meRequest, refreshRequest } from '../api/auth.api';
import { useDeviceNotifications } from '../hooks/useDeviceNotifications';
import { useBrowserTimezone } from '../hooks/useBrowserTimezone.js';
import { updateMeRequest } from '../api/users.api';
import { canonicalTimezone, mergeDetectedTimezoneUpdate } from '../lib/timezone.js';
import { useQueryClient } from '@tanstack/react-query';
import { accountIdentity, clearPrivateCache } from '../lib/authLifecycle.js';
import { permissionIdentity } from '../lib/permissions.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const detectedTimezone = useBrowserTimezone();
  const queryClient = useQueryClient();
  const userRef = useRef(null);

  const acceptUser = useCallback((nextUser, generation) => {
    if (generation !== getAuthGeneration()) return false;
    if (accountIdentity(userRef.current) !== accountIdentity(nextUser)
      || permissionIdentity(userRef.current) !== permissionIdentity(nextUser)) clearPrivateCache(queryClient);
    userRef.current = nextUser;
    setUser(nextUser);
    return true;
  }, [queryClient]);

  const startTransition = useCallback(() => {
    const generation = beginAuthTransition();
    clearPrivateCache(queryClient);
    userRef.current = null;
    setUser(null);
    setIsLoading(false);
    return generation;
  }, [queryClient]);

  useEffect(() => onSessionEnded(() => startTransition()), [startTransition]);

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
    // A child login/handoff effect may have started before this provider's mount effect.
    if (!canRefreshSession()) { setIsLoading(false); return; }
    let active = true;
    const generation = getAuthGeneration();
    async function restore() {
      try {
        const { accessToken } = await refreshRequest();
        if (!active || !setAccessToken(accessToken, generation)) return;
        const { user } = await meRequest();
        if (active) acceptUser(user, generation);
      } catch {
        if (active && generation === getAuthGeneration()) {
          setAccessToken(null, generation);
          acceptUser(null, generation);
        }
      } finally {
        if (active && generation === getAuthGeneration()) setIsLoading(false);
      }
    }
    restore();
    return () => { active = false; };
  }, [acceptUser]);

  // Admin reset (or a still-open session after one) 403s every protected call except
  // change-password / me / logout. Reload /auth/me so ProtectedRoute can send them there
  // immediately instead of leaving a half-working UI.
  useEffect(() => {
    return onPasswordChangeRequired(() => {
      const generation = getAuthGeneration();
      meRequest()
        .then(({ user }) => acceptUser(user, generation))
        .catch(() => {});
    });
  }, [acceptUser]);

  const login = useCallback(async (credentials) => {
    const generation = startTransition();
    const { user, accessToken } = await loginRequest(credentials);
    if (!setAccessToken(accessToken, generation) || !acceptUser(user, generation)) throw new Error('Sign-in cancelled');
    return user;
  }, [startTransition, acceptUser]);

  const completeHandoff = useCallback(async (token, companySlug) => {
    const generation = startTransition();
    const { user, accessToken } = await handoffRequest(token, companySlug);
    if (!setAccessToken(accessToken, generation) || !acceptUser(user, generation)) throw new Error('Sign-in cancelled');
    return user;
  }, [startTransition, acceptUser]);

  const changePassword = useCallback(async (payload) => {
    const generation = getAuthGeneration();
    const { user, accessToken } = await changePasswordRequest(payload);
    if (!setAccessToken(accessToken, generation) || !acceptUser(user, generation)) throw new Error('Session changed');
    return user;
  }, [acceptUser]);

  const logout = useCallback(async () => {
    const previousToken = getAccessToken();
    startTransition();
    await logoutRequest(previousToken).catch(() => {});
  }, [startTransition]);

  // Lets a mutation that returns the updated user (e.g. PATCH /users/me) keep this context in
  // sync without a full page reload.
  const updateUser = useCallback((updated) => {
    if (accountIdentity(updated) === accountIdentity(userRef.current)) acceptUser(updated, getAuthGeneration());
  }, [acceptUser]);

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
