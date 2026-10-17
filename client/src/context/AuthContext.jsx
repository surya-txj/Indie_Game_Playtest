import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TOKEN_KEY } from '../api/client.js';
import * as endpoints from '../api/endpoints.js';

const AuthContext = createContext(null);
const STUDIO_KEY = 'pti.activeStudioId';
const GAME_KEY = 'pti.activeGameId';

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => read(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(Boolean(read(TOKEN_KEY)));
  const [activeStudioId, setActiveStudioIdState] = useState(() => read(STUDIO_KEY));
  const [activeGameId, setActiveGameIdState] = useState(() => read(GAME_KEY));

  const setActiveStudioId = useCallback((id) => {
    setActiveStudioIdState(id);
    if (id) localStorage.setItem(STUDIO_KEY, id);
    else localStorage.removeItem(STUDIO_KEY);
  }, []);
  const setActiveGameId = useCallback((id) => {
    setActiveGameIdState(id);
    if (id) localStorage.setItem(GAME_KEY, id);
    else localStorage.removeItem(GAME_KEY);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setStudios([]);
    queryClient.clear();
  }, [queryClient]);

  const refreshMe = useCallback(async () => {
    const data = await endpoints.me();
    setUser(data.user);
    setStudios(data.studios);
    return data;
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    refreshMe()
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [token, refreshMe, logout]);

  useEffect(() => {
    const onLogout = () => logout();
    window.addEventListener('pti:logout', onLogout);
    return () => window.removeEventListener('pti:logout', onLogout);
  }, [logout]);

  const startSession = useCallback(
    (data) => {
      queryClient.clear();
      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);
      setToken(data.token);
    },
    [queryClient],
  );

  const login = useCallback(async (body) => startSession(await endpoints.login(body)), [startSession]);
  const register = useCallback(async (body) => startSession(await endpoints.register(body)), [startSession]);

  const value = useMemo(
    () => ({
      token, user, studios, loading, login, register, logout, refreshMe,
      activeStudioId, setActiveStudioId, activeGameId, setActiveGameId,
      isMember: user?.role === 'developer' || user?.role === 'coordinator',
    }),
    [token, user, studios, loading, login, register, logout, refreshMe, activeStudioId, setActiveStudioId, activeGameId, setActiveGameId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
