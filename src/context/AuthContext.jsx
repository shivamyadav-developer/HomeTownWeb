import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api/client.js';
import { clearSession, loadSession, saveSession, UNAUTHORIZED_EVENT } from '../api/session.js';
import { extractToken, mergeMissing, normalizeUser } from '../api/user.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

/** The login response may omit store details, so look them up from endpoints that carry them. */
async function enrich(user) {
  const needsStore = !user.storeId || !user.storeName || !user.name;
  if (!needsStore) return user;
  let merged = user;
  try {
    const { data } = await api.leaderboard();
    const row = data?.leaderboard?.find((r) => String(r.employeeId) === user.employeeId);
    if (row) {
      merged = mergeMissing(merged, {
        name: row.employeeName,
        department: row.department,
        storeId: row.storeId,
        storeName: row.storeName,
      });
    }
  } catch {
    /* optional */
  }
  if (!merged.storeName || !merged.name || !merged.role) {
    try {
      const { data } = await api.attendance(user.employeeId);
      const info = Array.isArray(data) ? data.find((d) => d.employeeInfo)?.employeeInfo : null;
      if (info) {
        merged = mergeMissing(merged, {
          name: info.name,
          role: info.role,
          storeName: info.location,
          email: info.email && !String(info.email).includes('*') ? info.email : undefined,
          mobile: info.phone && !String(info.phone).includes('*') ? info.phone : undefined,
        });
      }
    } catch {
      /* optional */
    }
  }
  return merged;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession());

  const persist = useCallback((next) => {
    setSession(next);
    if (next) saveSession(next);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  // A 401 from any request ends the session everywhere.
  useEffect(() => {
    const onUnauthorized = () => setSession(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  // Keep tabs in sync (logout in one tab logs out the others).
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'ontrack.session.v1') setSession(loadSession());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback(
    async (username, password) => {
      const resp = await api.login(username.trim(), password);
      const token = extractToken(resp);
      let user = normalizeUser(resp, username.trim());
      // Save first so cached enrichment calls are stored under this user.
      saveSession({ token, user });
      user = await enrich(user);
      persist({ token, user });
      return user;
    },
    [persist],
  );

  // Complete a partial profile for sessions restored from storage.
  useEffect(() => {
    if (!session?.user || (session.user.storeId && session.user.storeName && session.user.name)) return;
    let live = true;
    enrich(session.user).then((user) => {
      if (live) persist({ ...session, user });
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.employeeId]);

  const value = useMemo(
    () => ({ user: session?.user ?? null, isAuthenticated: !!session?.user, login, logout }),
    [session, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { unwrap };
