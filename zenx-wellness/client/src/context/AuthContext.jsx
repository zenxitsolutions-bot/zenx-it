import { createContext, useCallback, useEffect, useState } from 'react';
import { setAccessToken } from '../api/tokenStore';
import { loginRequest, handoffRequest, changePasswordRequest, logoutRequest, meRequest, refreshRequest } from '../api/auth.api';
import { useDeviceNotifications } from '../hooks/useDeviceNotifications';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const login = useCallback(async (credentials) => {
    setAccessToken(null);
    const { user, accessToken } = await loginRequest(credentials);
    setAccessToken(accessToken);
    setUser(user);
    return user;
  }, []);

  const completeHandoff = useCallback(async (token) => {
    const { user, accessToken } = await handoffRequest(token);
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
