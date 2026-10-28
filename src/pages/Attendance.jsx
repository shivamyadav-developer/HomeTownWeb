import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarCheck,
  CalendarDays,
  CalendarX2,
  Clock,
  LocateFixed,
  LogIn,
  LogOut,
  MapPin,
  MapPinOff,
  Repeat,
  Timer,
} from 'lucide-react';
import { api } from '../api/client.js';
import { keys } from '../api/session.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { BannerHeader, Card, ErrorState, OfflineNote, Spinner } from '../components/ui.jsx';
import { fmtDate, fmtDistance, fmtTime, haversine, todayIST } from '../utils/format.js';
import { MAX_DISTANCE, STORES } from '../utils/stores.js';

// Automatic attendance, same rules as the mobile app: within MAX_DISTANCE (100 m)
// of any store → check in; clearly outside (MAX_DISTANCE + 50 m) → check out.
// A website cannot run in the background, so this only works while this page
// is open. Fixes less accurate than this are ignored (e.g. laptop Wi-Fi location).
const MAX_ACCURACY = 100; // m
const EXIT_MARGIN = 50; // m

const nearestStore = (lat, lng) =>
  STORES.reduce(
    (best, st) => {
      const d = haversine(lat, lng, st.latitude, st.longitude);
      return d < best.distance ? { store: st, distance: d } : best;
    },
    { store: null, distance: Infinity },
  );

const t = (v) => (v ? new Date(v).getTime() || 0 : 0);

// Today's own check-in / check-out times, kept on the device (like the app's
// "todayPunch"). The server files a session under the day it STARTED, so right
// after a check-in/out the history may not show it under today yet.
const punchKey = (empId) => `${keys.DRAFT_PREFIX}${empId}.punch.${todayIST()}`;
const loadPunch = (empId) => {
  try {
    return JSON.parse(localStorage.getItem(punchKey(empId)) || 'null');
  } catch {
    return null;
  }
};
const savePunch = (empId, punch) => {
  try {
    localStorage.setItem(punchKey(empId), JSON.stringify(punch));
  } catch {
    /* ignore */
  }
};

// Same format as the app: "2h 15m 54s" while checked in, "2h 15m" when closed
function durationText(isCheckedIn, checkInISO, closedMinutes = 0) {
  if (!isCheckedIn) return `${Math.floor(closedMinutes / 60)}h ${closedMinutes % 60}m`;
  if (!checkInISO) return '0h 0m 0s';
  const total = closedMinutes * 60 + Math.max(0, Math.floor((Date.now() - t(checkInISO)) / 1000));
  return `${Math.floor(total / 3600)}h ${Math.floor((total % 3600) / 60)}m ${total % 60}s`;
}

// Only this ticks every second, not the whole page
const LiveDuration = memo(function LiveDuration({ isCheckedIn, checkInISO, closedMinutes }) {
  const [text, setText] = useState(() => durationText(isCheckedIn, checkInISO, closedMinutes));
  useEffect(() => {
    setText(durationText(isCheckedIn, checkInISO, closedMinutes));
    if (!isCheckedIn || !checkInISO) return undefined;
    const id = setInterval(() => setText(durationText(true, checkInISO, closedMinutes)), 1000);
    return () => clearInterval(id);
  }, [isCheckedIn, checkInISO, closedMinutes]);
  return <strong className="dur-value">{text}</strong>;
});

function SessionRow({ icon: Icon, label, value, tone }) {
  return (
    <div className="sess-row">
      <Icon size={16} />
      <span>{label}</span>
      <strong className={tone ?? ''}>{value}</strong>
    </div>
  );
}

export default function Attendance() {
  const { user } = useAuth();
  const hist = useApi(() => api.attendance(user.employeeId), [user.employeeId]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'ok' | 'error', text }
  const [distance, setDistance] = useState(null);
  const [storeName, setStoreName] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [punch, setPunch] = useState(() => loadPunch(user.employeeId));
  const lastAuto = useRef(0);

  const records = useMemo(() => (Array.isArray(hist.data) ? hist.data : []), [hist.data]);
  const today = records.find((r) => r.date === todayIST()) ?? null;

  // Status from the server history (same rules as the app)
  const latest = records[0];
  const historyOpen =
    today?.status === 'OPEN' ||
    (!!today?.oldestCheckIn && !today?.latestCheckOut) ||
    (!today && latest?.status === 'OPEN');
  const historyEventAt = Math.max(t(today?.latestCheckOut), historyOpen ? t(today?.oldestCheckIn ?? latest?.oldestCheckIn) : 0);

  // This page's own latest check-in/out wins when it is newer than the history
  const punchEventAt = Math.max(t(punch?.checkIn), t(punch?.checkOut));
  const usePunch = !!punch && punchEventAt >= historyEventAt;
  const checkedIn = usePunch ? !!punch.checkIn && !punch.checkOut : historyOpen;

  const act = useCallback(
    async (kind, pos) => {
      setBusy(true);
      setMsg(null);
      try {
        const { latitude, longitude } = pos.coords;
        const res = await (kind === 'in' ? api.checkIn : api.checkOut)(user.employeeId, latitude.toFixed(6), longitude.toFixed(6));
        const a = res?.data?.attendance;
        const now = new Date().toISOString();
        // Show the time right away; a new check-in clears the old check-out
        const next =
          kind === 'in'
            ? { checkIn: a?.checkIn || now, checkOut: null }
            : { ...(loadPunch(user.employeeId) ?? {}), checkOut: a?.checkOut || now, durationMinutes: a?.durationMinutes ?? null };
        savePunch(user.employeeId, next);
        setPunch(next);
        setMsg({
          type: 'ok',
          text:
            kind === 'in'
              ? res?.data?.action === 'ALREADY_CHECKED_IN'
                ? 'You are already checked in.'
                : `Checked in automatically at ${fmtTime(next.checkIn)}${storeName ? ` near ${storeName}` : ''}.`
              : `Checked out automatically at ${fmtTime(next.checkOut)}.`,
        });
        hist.reload();
      } catch (e) {
        setMsg({ type: 'error', text: e.message });
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user.employeeId, storeName],
  );

  // Watch the position while this page is open and check in/out automatically
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Location is not supported on this device.');
      return undefined;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError(null);
        const { store, distance: m } = nearestStore(pos.coords.latitude, pos.coords.longitude);
        setDistance(m);
        setStoreName(store?.name ?? null);
        if (pos.coords.accuracy > MAX_ACCURACY) return; // too rough to decide
        const now = Date.now();
        if (now - lastAuto.current < 60000 || busy || hist.loading) return;
        if (m <= MAX_DISTANCE && !checkedIn) {
          lastAuto.current = now;
          act('in', pos);
        } else if (m > MAX_DISTANCE + EXIT_MARGIN && checkedIn) {
          lastAuto.current = now;
          act('out', pos);
        }
      },
      (err) =>
        setGeoError(
          err.code === 1
            ? 'Location permission is off. Allow location for this site so attendance can be marked automatically.'
            : 'Could not get your location. Turn on GPS.',
        ),
      { enableHighAccuracy: true, maximumAge: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedIn, busy, act, hist.loading]);

  // Today's session card (same fields as the app)
  const hasToday = !!today || !!punch?.checkIn;
  const checkInISO = checkedIn ? (usePunch ? punch.checkIn : today?.oldestCheckIn ?? latest?.oldestCheckIn) : null;
  const closedMinutes = today?.totalDurationMinutes || (!today && punch?.durationMinutes) || 0;
  const firstCheckIn = today?.oldestCheckIn ?? punch?.checkIn;
  const lastCheckOut = usePunch ? punch?.checkOut : today?.latestCheckOut;
  const sessions = (today?.totalSessions || 0) + (usePunch && !today ? 1 : 0) || 1;
  const statusLabel = checkedIn ? 'Checked In' : 'Not In';

  const recent = records.filter((r) => r.date !== todayIST()).slice(0, 10);
  const inside = distance != null && distance <= MAX_DISTANCE;

  return (
    <>
      <BannerHeader eyebrow="ATTENDANCE HUB" title="My Dashboard" subtitle="Track attendance and office status" />
      <div className="page">
        <OfflineNote show={hist.fromCache} />
        <div className="tiles-3">
          <Card className="mini">
            <Clock size={30} className="orange" />
            <span>Status</span>
            <strong className={checkedIn ? 'ok' : 'bad-strong'}>{statusLabel}</strong>
          </Card>
          <Card className="mini">
            <CalendarDays size={30} className="orange" />
            <span>Today</span>
            <strong>{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date())}</strong>
          </Card>
          <Card className="mini">
            {inside ? <MapPin size={30} className="ok" /> : <MapPinOff size={30} className="orange" />}
            <span>Distance</span>
            <strong>{fmtDistance(distance)}</strong>
          </Card>
        </div>

        <h2 className="section-title">Today's Session</h2>
        {hist.loading && !hist.data && !punch ? (
          <Card className="session"><Spinner /></Card>
        ) : hasToday ? (
          <Card className="session">
            <div className="sess-head">
              <strong>{todayIST()}</strong>
              <span className={`sess-pill ${checkedIn ? 'sess-pill--in' : 'sess-pill--out'}`}>
                <i /> {statusLabel}
              </span>
            </div>
            <div className="dur-block">
              <Timer size={20} />
              <span>{checkedIn ? 'Time in office' : 'Total duration'}</span>
              <LiveDuration isCheckedIn={checkedIn} checkInISO={checkInISO} closedMinutes={closedMinutes} />
            </div>
            <SessionRow icon={LogIn} label="Check In" value={fmtTime(checkedIn ? checkInISO : firstCheckIn) || '—'} />
            <SessionRow
              icon={LogOut}
              label="Check Out"
              value={checkedIn ? 'Active session' : fmtTime(lastCheckOut) || '—'}
              tone={checkedIn ? 'muted' : ''}
            />
            <SessionRow icon={Repeat} label="Sessions" value={sessions} />
            <SessionRow icon={CalendarCheck} label="Day Status" value="Present" tone="ok" />
          </Card>
        ) : (
          <Card className="session">
            <div className="empty-session">
              <CalendarX2 size={46} />
              <h3>No attendance recorded today</h3>
              <p>You will be checked in automatically when you reach the store.</p>
            </div>
          </Card>
        )}

        {msg && (
          <p className={msg.type === 'ok' ? 'note note--ok' : 'form-error'} role="status">
            {msg.text}
          </p>
        )}
        {hist.error && !hist.data && <ErrorState error={hist.error} onRetry={hist.reload} />}

        {/* No manual buttons — attendance is automatic, like the mobile app */}
        {geoError ? (
          <div className="note note--red note--tall" role="alert">
            <MapPinOff size={34} />
            <p>{geoError}</p>
          </div>
        ) : (
          <div className="note note--orange note--tall">
            <LocateFixed size={34} />
            <p>
              Auto tracking active — checked in/out automatically as you enter or leave the store
              {storeName && distance != null ? ` (nearest: ${storeName}, ${fmtDistance(distance)})` : ''}. Re-entry
              triggers a new session. On the website this works while this page is open; for automatic attendance in
              the background, use the HT-ontrack mobile app.
            </p>
          </div>
        )}

        <h2 className="section-title">Recent History</h2>
        <div className="history">
          {recent.map((r) => {
            const present = r.oldestCheckIn ? true : String(r.status).toLowerCase() === 'present';
            return (
              <Card key={r.date} className="hist-row">
                <div>
                  <strong>{fmtDate(r.date)}</strong>
                  <p className="muted">
                    {r.totalSessions || 1} session{(r.totalSessions || 1) === 1 ? '' : 's'}
                    {r.oldestCheckIn ? ` · ${fmtTime(r.oldestCheckIn)} – ${r.latestCheckOut ? fmtTime(r.latestCheckOut) : 'ongoing'}` : ''}
                  </p>
                </div>
                <div className="right">
                  <span className={`pill ${present ? 'pill--green' : 'pill--red'}`}>{present ? 'Present' : r.status}</span>
                  <p className="strong">{r.totalDurationFormatted || '0h 0m'}</p>
                </div>
              </Card>
            );
          })}
          {hist.data && recent.length === 0 && <p className="muted">No earlier records.</p>}
        </div>
      </div>
    </>
  );
}
