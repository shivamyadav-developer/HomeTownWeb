import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, readCache, unwrap, writeCache } from '../api/client.js';
import { keys } from '../api/session.js';
import { useAuth } from './AuthContext.jsx';

const LeadsContext = createContext(null);
export const useLeads = () => useContext(LeadsContext);

const PAGE = 100;

/* ---- Offline queue for new leads (stored locally until the network is back) ---- */
const readQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(keys.QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};
const writeQueue = (q) => {
  try {
    localStorage.setItem(keys.QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* ignore */
  }
};

export function LeadsProvider({ children }) {
  const { user } = useAuth();
  const storeId = user?.storeId;
  const [leads, setLeads] = useState([]);
  const [meta, setMeta] = useState({ total: 0, stageCounts: {}, page: 0 });
  const [state, setState] = useState({ loading: false, error: null, fromCache: false });
  const [queued, setQueued] = useState(() => readQueue().length);
  const syncing = useRef(false);

  const cachePath = `leads.${storeId}`;

  const load = useCallback(
    async (page = 1) => {
      if (!storeId) return;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const d = unwrap(await api.leads(storeId, page, PAGE));
        const rows = d?.data ?? [];
        const total = d?.pagination?.total ?? rows.length;
        setLeads((prev) => {
          const next = page === 1 ? rows : [...prev, ...rows.filter((r) => !prev.some((p) => p._id === r._id))];
          if (page === 1) writeCache(cachePath, null, { rows, total, stageCounts: d?.stageCounts ?? {} });
          return next;
        });
        setMeta({ total, stageCounts: d?.stageCounts ?? meta.stageCounts, page });
        setState({ loading: false, error: null, fromCache: false });
      } catch (error) {
        if (error.offline && page === 1) {
          const hit = readCache(cachePath, null);
          if (hit) {
            setLeads(hit.data.rows);
            setMeta({ total: hit.data.total, stageCounts: hit.data.stageCounts, page: 1 });
            setState({ loading: false, error: null, fromCache: true });
            return;
          }
        }
        setState((s) => ({ ...s, loading: false, error }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeId, cachePath],
  );

  useEffect(() => {
    setLeads([]);
    if (storeId) load(1);
  }, [storeId, load]);

  const loadMore = useCallback(() => load(meta.page + 1), [load, meta.page]);
  const hasMore = leads.length < meta.total;

  /** Change status / record a call. Updates the local copy once the server accepts it. */
  const updateLead = useCallback(async (id, patch) => {
    const res = await api.updateLead(id, patch);
    setLeads((prev) =>
      prev.map((l) =>
        l._id === id
          ? {
              ...l,
              ...(patch.crmStatus ? { crmStatus: patch.crmStatus } : {}),
              ...(patch.mobileCall ? { mobileCall: { ...l.mobileCall, ...patch.mobileCall } } : {}),
              ...(unwrap(res)?._id === id ? unwrap(res) : {}),
            }
          : l,
      ),
    );
    return res;
  }, []);

  /** Create a lead now, or queue it if the device is offline. Returns 'sent' | 'queued'. */
  const createLead = useCallback(
    async (lead) => {
      try {
        await api.createLead(lead);
        load(1);
        return 'sent';
      } catch (err) {
        if (!err.offline) throw err;
        const q = [...readQueue(), lead];
        writeQueue(q);
        setQueued(q.length);
        return 'queued';
      }
    },
    [load],
  );

  const syncQueue = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    try {
      let q = readQueue();
      while (q.length) {
        try {
          await api.createLead(q[0]);
          q = q.slice(1);
          writeQueue(q);
          setQueued(q.length);
        } catch (err) {
          if (err.offline) break; // try again later
          q = q.slice(1); // rejected by the server: drop it rather than retry forever
          writeQueue(q);
          setQueued(q.length);
        }
      }
      if (!q.length) load(1);
    } finally {
      syncing.current = false;
    }
  }, [load]);

  useEffect(() => {
    if (!user) return undefined;
    const run = () => syncQueue();
    run();
    window.addEventListener('online', run);
    return () => window.removeEventListener('online', run);
  }, [user, syncQueue]);

  const value = useMemo(
    () => ({ leads, meta, ...state, hasMore, loadMore, reload: () => load(1), updateLead, createLead, queued, syncQueue }),
    [leads, meta, state, hasMore, loadMore, load, updateLead, createLead, queued, syncQueue],
  );
  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}
