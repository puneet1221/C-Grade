import { createContext, useCallback, useEffect, useState } from 'react';
import { authApi } from '../api/authApi.js';
import { registerAuthExpiredHandler, setAccessToken } from '../api/axiosClient.js';

export const AuthContext = createContext(null);

/**
 * Provides authentication state, in-memory JWT storage, silent cookie restoration,
 * and login/register/logout actions across the application.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    registerAuthExpiredHandler(clearSession);
    let active = true;

    async function bootstrapSession() {
      try {
        const res = await authApi.session();
        if (active && res?.data?.authenticated && res?.data?.accessToken) {
          setAccessToken(res.data.accessToken);
          setUser(res.data.user);
        } else if (active) {
          clearSession();
        }
      } catch {
        if (active) clearSession();
      } finally {
        if (active) setIsInitializing(false);
      }
    }

    bootstrapSession();
    return () => {
      active = false;
    };
  }, [clearSession]);

  const login = useCallback(async (credentials) => {
    const res = await authApi.login(credentials);
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await authApi.register(payload);
    return res.data;
  }, []);

  const verifyEmail = useCallback(async (payload) => {
    const res = await authApi.verifyEmail(payload);
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const resendVerification = useCallback(async (payload) => {
    const res = await authApi.resendVerification(payload);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refreshMe = useCallback(async () => {
    const res = await authApi.me();
    setUser(res.data.user);
    return res.data.user;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === 'admin',
        isInitializing,
        login,
        register,
        verifyEmail,
        resendVerification,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
