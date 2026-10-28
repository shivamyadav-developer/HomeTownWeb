import { loadSession, clearSession, UNAUTHORIZED_EVENT, keys } from './session.js';

const DEFAULT_BASE = 'https://xnrrpsi8wu.ap-south-1.awsapprunner.com';
// In dev the Vite proxy handles /api, so we use same-origin requests (no CORS).
const BASE = (import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? '' : DEFAULT_BASE)).replace(/\/$/, '');
const TIMEOUT_MS = 20000;

export class ApiError extends Error {
  constructor(message, { status = 0, offline = false, body = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.offline = offline;
    this.body = body;
  }
}

function buildUrl(path, query) {
  const url = `${BASE}${path}`;
  if (!query) return url;
  const qs = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const s = qs.toString();
  return s ? `${url}?${s}` : url;
}

/** Core request helper: JSON in/out, timeout, bearer token (when the server issued one), 401 handling. */
export async function request(path, { method = 'GET', body, query, form, auth = true, signal } = {}) {
  const headers = { Accept: 'application/json' };
  const session = loadSession();
  if (auth && session?.token) headers.Authorization = `Bearer ${session.token}`;

  let payload;
  if (form) {
    payload = form; // browser sets the multipart boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  if (signal) signal.addEventListener('abort', () => ctrl.abort(), { once: true });

  let res;
  try {
    res = await fetch(buildUrl(path, query), { method, headers, body: payload, signal: ctrl.signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    const timedOut = ctrl.signal.aborted;
    throw new ApiError(timedOut ? 'The server took too long to respond.' : 'Network error. Check your connection.', {
      offline: true,
    });
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text.slice(0, 200) };
    }
  }

  if (!res.ok || data?.success === false) {
    if (res.status === 401 && auth) {
      clearSession();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(data?.message || data?.error || `Request failed (${res.status})`, { status: res.status, body: data });
  }
  return data;
}

export const unwrap = (r) => (r && typeof r === 'object' && 'data' in r ? r.data : r);

/* ---------- Offline-tolerant GET: network first, per-user local copy as fallback ---------- */
function cacheKey(path, query) {
  const uid = loadSession()?.user?.employeeId ?? 'anon';
  return `${keys.CACHE_PREFIX}${uid}.${path}${query ? `?${new URLSearchParams(query)}` : ''}`;
}

export function readCache(path, query) {
  try {
    const raw = localStorage.getItem(cacheKey(path, query));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeCache(path, query, data) {
  try {
    localStorage.setItem(cacheKey(path, query), JSON.stringify({ t: Date.now(), data }));
  } catch {
    /* quota exceeded: skip caching */
  }
}

/** Returns { data, fromCache, cachedAt }. Falls back to the saved copy only when the network is unreachable. */
export async function cachedGet(path, { query, transform } = {}) {
  try {
    const res = unwrap(await request(path, { query }));
    const data = transform ? transform(res) : res;
    writeCache(path, query, data);
    return { data, fromCache: false };
  } catch (err) {
    if (err.offline) {
      const hit = readCache(path, query);
      if (hit) return { data: hit.data, fromCache: true, cachedAt: hit.t };
    }
    throw err;
  }
}

const enc = encodeURIComponent;

/* ----------------------------- Endpoints (see API documentation) ----------------------------- */
export const api = {
  // 1. Login
  login: (username, password) =>
    request('/api/users/login-ontrack', { method: 'POST', body: { username, password }, auth: false }),

  // 2. Target / dashboard
  dashboard: (empId) => cachedGet(`/api/ontrack/emp-dashboard/${enc(empId)}`),

  // 3. Leaderboard
  leaderboard: () => cachedGet('/api/ontrack/target/staff/leaderboard'),

  // 4-7. LMS reads. The course list is trimmed before caching so answer keys are never persisted.
  courses: () =>
    cachedGet('/api/ontrack/lms/course', {
      transform: (list) =>
        (Array.isArray(list) ? list : []).map(({ questions, ...c }) => ({
          ...c,
          questionCount: c.questionCount ?? questions?.length ?? 0,
        })),
    }),
  course: (id) => cachedGet(`/api/ontrack/lms/course/${enc(id)}`),
  questions: (id) =>
    cachedGet(`/api/ontrack/lms/course/${enc(id)}/question`, {
      transform: (list) => (Array.isArray(list) ? list : []).map(({ correctAnswer, ...q }) => q),
    }),
  progress: (empId) => cachedGet(`/api/ontrack/lms/employee/${enc(empId)}/progress`),

  // 8-10. Quiz attempt
  startAttempt: (courseId, employeeId) =>
    request('/api/ontrack/lms/course/attempt/start', { method: 'POST', body: { courseId, employeeId } }),
  submitAnswer: (attemptId, questionId, selectedAnswer) =>
    request('/api/ontrack/lms/course/attempt/answer', { method: 'POST', body: { attemptId, questionId, selectedAnswer } }),
  finishAttempt: (attemptId) => request('/api/ontrack/lms/course/attempt/submit', { method: 'POST', body: { attemptId } }),

  // 11-13. Attendance
  checkIn: (employeeId, lat, lang) =>
    request('/api/ontrack/attendance/check-in', { method: 'POST', body: { employeeId, lat: String(lat), lang: String(lang) } }),
  checkOut: (employeeId, lat, lang) =>
    request('/api/ontrack/attendance/check-out', { method: 'POST', body: { employeeId, lat: String(lat), lang: String(lang) } }),
  attendance: (empId) => cachedGet(`/api/ontrack/attendance/${enc(empId)}`),

  // 14-16. Leads
  createLead: (lead) => request('/api/qrleads', { method: 'POST', body: lead }),
  leads: (storeId, page = 1, limit = 100) => request('/api/qrleads', { query: { storeId, limit, page } }),
  updateLead: (leadId, patch) => request(`/api/qrleads/${enc(leadId)}`, { method: 'PATCH', body: patch }),

  // 17-19. Checklists
  templates: () => cachedGet('/api/checklist/templates'),
  uploadChecklistImage: (blob, filename = 'photo.jpg') => {
    const form = new FormData();
    form.append(UPLOAD_FIELD, blob, filename);
    return request('/api/checklist/upload', { method: 'POST', form });
  },
  submitChecklist: (payload) => request('/api/checklist/submissions', { method: 'POST', body: payload }),
};

// The documentation does not name the multipart field for the image upload. Change here if the server expects another name.
export const UPLOAD_FIELD = 'image';
