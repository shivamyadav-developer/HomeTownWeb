import { CalendarDays, CalendarRange, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { Card, ErrorState, Header, OfflineNote, ProgressBar, Spinner } from '../components/ui.jsx';
import { fmtDayLabel, greeting, inr, pct } from '../utils/format.js';

function Metric({ icon: Icon, tone, title, sub, target, achieved, weekOff, targetLabel = 'Target', achievedLabel = 'Achieved', footer }) {
  const p = pct(achieved, target);
  return (
    <Card className="metric">
      <div className="metric-head">
        {Icon && (
          <span className={`metric-icon metric-icon--${tone}`}>
            <Icon size={28} />
          </span>
        )}
        <div className="metric-title">
          <h2>{title}</h2>
          {sub && <p>{sub}{weekOff ? ' · Week off' : ''}</p>}
        </div>
        <strong className={`metric-pct ${p >= 100 ? 'ok' : 'bad'}`}>{p}%</strong>
      </div>
      <div className="metric-row">
        <div>
          <span>{targetLabel}</span>
          <strong>{inr(target)}</strong>
        </div>
        <div className="right">
          <span>{achievedLabel}</span>
          <strong>{inr(achieved)}</strong>
        </div>
      </div>
      <ProgressBar value={p} tone={p >= 100 ? 'green' : 'orange'} />
      {footer}
    </Card>
  );
}

export default function Target() {
  const { user } = useAuth();
  const { data: d, loading, error, fromCache, reload } = useApi(() => api.dashboard(user.employeeId), [user.employeeId]);

  const mtdGap = d ? (d.mtdAchieved ?? d.monthlyAchieved ?? 0) - (d.mtdTarget ?? 0) : 0;
  const mtdAchieved = d?.mtdAchieved ?? d?.monthlyAchieved ?? 0;
  // Server fields: targetDate / targetAmount / achievement / isWeekOff (same mapping as the app)
  const days = (Array.isArray(d?.monthlyData) ? d.monthlyData : []).map((r) => ({
    date: r.targetDate ?? r.date,
    target: Number(r.targetAmount ?? r.target) || 0,
    achieved: Number(r.achievement ?? r.achieved) || 0,
    weekOff: r.isWeekOff === true,
  }));

  return (
    <>
      <Header className="hdr--hero">
        <div className="hero">
          <button
            type="button"
            className="icon-btn menu-btn"
            aria-label="Open menu"
            onClick={() => window.dispatchEvent(new Event('ontrack:open-menu'))}
          >
            <Menu size={28} />
          </button>
          <div>
            <p className="hero-greet">{greeting()},</p>
            <h1 className="hero-name">{user.name ?? user.employeeId}</h1>
            <div className="chips">
              {(user.role || user.designation) && (
                <span className="chip chip--orange">
                  {String(user.role ?? user.designation).replace(/_/g, ' ').toUpperCase()}
                </span>
              )}
              <span className="chip chip--blue">ID: {user.employeeId}</span>
            </div>
          </div>
        </div>
      </Header>

      <div className="page grid-2">
        <OfflineNote show={fromCache} />
        {loading && !d && <Spinner />}
        {error && !d && <ErrorState error={error} onRetry={reload} />}
        {d && (
          <>
            <Metric
              icon={CalendarDays}
              tone="blue"
              title="Today"
              sub={fmtDayLabel(d.todayDate)}
              weekOff={d.todayWeekOff}
              target={d.todayTarget}
              achieved={d.todayAchieved}
            />
            <Metric
              icon={CalendarRange}
              tone="orange"
              title="Yesterday"
              sub={fmtDayLabel(d.yesterdayDate)}
              weekOff={d.yesterdayWeekOff}
              target={d.yesterdayTarget}
              achieved={d.yesterdayAchieved}
            />
            <Metric
              title="Month to Date"
              targetLabel="MTD Target"
              achievedLabel="MTD Achieved"
              target={d.mtdTarget}
              achieved={mtdAchieved}
              footer={
                <p className={`gap ${mtdGap >= 0 ? 'ok' : 'bad'}`}>
                  {mtdGap >= 0 ? 'Ahead by' : 'Behind by'} {inr(Math.abs(mtdGap))}
                </p>
              }
            />
            <Metric
              title="Monthly Progress"
              target={d.monthlyTarget}
              achieved={d.monthlyAchieved}
              footer={
                d.monthlyTarget > 0 ? (
                  <p className="gap muted">
                    {d.monthlyTarget - d.monthlyAchieved > 0
                      ? `${inr(d.monthlyTarget - d.monthlyAchieved)} left to reach the monthly target`
                      : 'Monthly target achieved 🎉'}
                  </p>
                ) : null
              }
            />
            {days.length > 0 && (
              <Card className="span-all">
                <h2 className="card-title">Daily breakdown</h2>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th className="right">Target</th>
                        <th className="right">Achieved</th>
                        <th className="right">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((row, i) => {
                        const isToday = row.date === d.todayDate;
                        const future = !!d.todayDate && row.date > d.todayDate;
                        const p = pct(row.achieved, row.target);
                        return (
                          <tr key={row.date ?? i} className={isToday ? 'row--today' : future ? 'row--future' : ''}>
                            <td>
                              {row.date ? fmtDayLabel(row.date) : `Day ${i + 1}`}
                              {row.weekOff && <span className="pill pill--grey row-tag">Week off</span>}
                            </td>
                            <td className="right">{row.weekOff ? '—' : inr(row.target)}</td>
                            <td className="right">{inr(row.achieved)}</td>
                            <td className={`right ${future || row.weekOff ? 'muted' : p >= 100 ? 'ok' : 'bad'}`}>
                              {future || row.weekOff ? '—' : `${p}%`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}
