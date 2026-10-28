// Session storage. Only the auth token and the (non-secret) user profile are kept.
// The password is never stored anywhere.
const KEY = 'ontrack.session.v1';
const CACHE_PREFIX = 'ontrack.cache.';
const QUEUE_KEY = 'ontrack.queue.leads';
const DRAFT_PREFIX = 'ontrack.draft.';

export const UNAUTHORIZED_EVENT = 'ontrack:unauthorized';

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage full or blocked: the session just won't survive a reload */
  }
}

/** Remove the session plus everything cached on behalf of the user. */
export function clearSession() {
  try {
    const doomed = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && (k === KEY || k === QUEUE_KEY || k.startsWith(CACHE_PREFIX) || k.startsWith(DRAFT_PREFIX))) {
        doomed.push(k);
      }
    }
    doomed.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  if (typeof caches !== 'undefined') {
    caches.keys().then((names) => names.filter((n) => n.startsWith('ontrack-api')).forEach((n) => caches.delete(n)));
  }
}

export const keys = { CACHE_PREFIX, QUEUE_KEY, DRAFT_PREFIX };
