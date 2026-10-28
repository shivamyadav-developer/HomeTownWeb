const TZ = 'Asia/Kolkata';

export const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export const pct = (achieved, target) => {
  const t = Number(target) || 0;
  if (t <= 0) return 0;
  return Math.max(0, Math.round(((Number(achieved) || 0) / t) * 100));
};

export function greeting(date = new Date()) {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: TZ }).format(date));
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/** "26 Oct 2026, 9:30 pm" */
export function fmtDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ,
  }).format(d);
}

/** "25 Oct 2026" */
export function fmtDate(value) {
  if (!value) return '—';
  const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+05:30`) : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }).format(d);
}

/** "Tue, 27 Oct" */
export function fmtDayLabel(value) {
  const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+05:30`) : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ }).format(d).replace(/,?\s/, ', ');
}

/** "Mon, Oct 14, 2024" */
export function fmtLongDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: TZ }).format(d);
}

/** "12:58 PM" */
export function fmtTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ }).format(d);
}

/** Today as YYYY-MM-DD in India time */
export const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

/** "1 Oct" for ranges like the leaderboard header */
export function fmtDayMonth(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: TZ }).format(d);
}

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

export const fmtDistance = (m) => (m == null ? '—' : m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`);

export const LEAD_STATUS = {
  NEW: { label: 'New', tone: 'orange' },
  CONTACTED: { label: 'Contacted', tone: 'blue' },
  INTERESTED: { label: 'Interested', tone: 'green' },
  FOLLOW_UP: { label: 'Follow Up', tone: 'amber' },
  CALL_BACK: { label: 'Call Back', tone: 'amber' },
  NOT_REACHABLE: { label: 'Not Reachable', tone: 'grey' },
  STORE_VISIT_SCHEDULED: { label: 'Store Visit Scheduled', tone: 'blue' },
  NOT_INTERESTED: { label: 'Not Interested', tone: 'red' },
  WRONG_NUMBER: { label: 'Wrong Number', tone: 'red' },
  CONVERTED: { label: 'Converted', tone: 'green' },
  LOST: { label: 'Lost', tone: 'red' },
};
export const LEAD_STATUS_ORDER = Object.keys(LEAD_STATUS);
export const statusLabel = (s) => LEAD_STATUS[s]?.label ?? (s ? String(s).replace(/_/g, ' ') : 'New');
export const statusTone = (s) => LEAD_STATUS[s]?.tone ?? 'orange';
