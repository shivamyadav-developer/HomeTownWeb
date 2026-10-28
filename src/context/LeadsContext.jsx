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

/* ---- Call in progress (sessionStorage: survives a tab reload, not a new session) ---- */
const PENDING_CALL_KEY = 'ontrack.pendingCall';
const readPendingCall = () => {
  try {
    return JSON.parse(sessionStorage.getItem(PENDING_CALL_KEY) || 'null');
  } catch {
    return null;
  }
};
const writePendingCall = (call) => {
  try {
    if (call) sessionStorage.setItem(PENDING_CALL_KEY, JSON.stringify(call));
    else sessionStorage.removeItem(PENDING_CALL_KEY);
  } catch {
    /* ignore */
  }
};

// Same format as the app: "45s", "2m 10s"
export const fmtCallDuration = (seconds) => {
  if (seconds == null) return '-';
  const m = Math.floor(seconds / 60);
  return m > 0 ? `${m}m ${seconds % 60}s` : `${seconds % 60}s`;
};

// Default outcome after a call (same as the app): converted stays converted,
// NEW becomes CONTACTED, anything else keeps its current status
export const statusAfterCall = (lead) => {
  if (lead?.isConverted) return 'CONVERTED';
  const s = String(lead?.crmStatus || '').toUpperCase();
  return s && s !== 'NEW' ? s : 'CONTACTED';
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

  /* ---- Calling a customer (same flow as the app) ----
     Call → the phone dialer opens → when the user comes back to this page,
     the "Call Conversation" popup asks for the outcome and notes. The pending
     call is kept in sessionStorage so it survives the browser reloading the tab. */
  const [pendingCall, setPendingCall] = useState(() => readPendingCall());
  const [finishedCall, setFinishedCall] = useState(null); // shown in the popup

  const startCall = useCallback(
    (lead) => {
      if (!lead?.mobile) return;
      const call = {
        lead: { _id: lead._id, crmStatus: lead.crmStatus, isConverted: lead.isConverted },
        customerName: lead.customerName && !String(lead.customerName).includes('*') ? lead.customerName : '',
        mobile: lead.mobile,
        calledBy: user?.name ?? '',
        startedAt: Date.now(),
      };
      writePendingCall(call);
      setPendingCall(call);
      // Must happen inside the click handler, or the browser blocks it
      window.location.href = `tel:${lead.mobile}`;
    },
    [user?.name],
  );

  // Show the popup when the user returns from the dialer
  useEffect(() => {
    if (!pendingCall) return undefined;
    let wentAway = document.visibilityState === 'hidden';
    const finish = () => {
      const call = readPendingCall();
      if (!call) return;
      writePendingCall(null);
      setPendingCall(null);
      setFinishedCall({ ...call, durationSeconds: Math.max(0, Math.round((Date.now() - call.startedAt) / 1000)) });
    };
    const onVisible = () => {
      if (document.visibilityState === 'hidden') wentAway = true;
      else if (wentAway) finish();
    };
    const onFocus = () => wentAway && finish();
    const onBlur = () => {
      wentAway = true;
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    // Computers without a phone app never leave the page — ask after a moment anyway
    const fallback = setTimeout(() => !wentAway && finish(), 4000);
    // The page was reloaded after the call: ask straight away
    if (Date.now() - pendingCall.startedAt > 5000 && document.visibilityState === 'visible') finish();
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      clearTimeout(fallback);
    };
  }, [pendingCall]);

  /** Save (with status + notes) or Skip (status only) — both record the call on the server. */
  const finishCall = useCallback(
    async (crmStatus, notes = '') => {
      const call = finishedCall;
      setFinishedCall(null);
      if (!call?.lead?._id) return;
      const duration = fmtCallDuration(call.durationSeconds);
      const by = call.calledBy ? ` — ${call.calledBy}` : '';
      const comment = notes.trim()
        ? `${notes.trim()} (call ${duration}${by})`
        : `Called customer from app (call ${duration}${by})`;
      await updateLead(call.lead._id, { mobileCall: { called: true }, crmStatus, comment });
    },
    [finishedCall, updateLead],
  );

  const value = useMemo(
    () => ({
      leads,
      meta,
      ...state,
      hasMore,
      loadMore,
      reload: () => load(1),
      updateLead,
      createLead,
      queued,
      syncQueue,
      startCall,
      finishedCall,
      finishCall,
    }),
    [leads, meta, state, hasMore, loadMore, load, updateLead, createLead, queued, syncQueue, startCall, finishedCall, finishCall],
  );
  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}
