import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Crown, Store, UserCircle, X } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { BannerHeader, ErrorState, OfflineNote, Spinner } from '../components/ui.jsx';
import { fmtDayMonth, inr } from '../utils/format.js';

const PAGE_SIZE = 50;

function achievement(row) {
  if (!row.target) return { label: 'No target', tone: 'none' };
  const p = Math.round(row.achievementPercentage ?? (row.achieved / row.target) * 100);
  return { label: `${p}% of target`, tone: p >= 100 ? 'ok' : p >= 75 ? 'warn' : 'bad' };
}

function Rank({ rank }) {
  if (rank > 3) return <span className="rank">{rank}</span>;
  return (
    <span className={`medal medal--${rank}`} aria-label={`Rank ${rank}`}>
      <Crown size={20} fill="currentColor" className="medal-crown" />
      <b>{rank}</b>
    </span>
  );
}

// One entry per storeId. The API spells some store names differently across
// rows, so use the most common spelling (same as the mobile app).
function buildStoreList(rows) {
  const byId = {};
  rows.forEach((r) => {
    if (r.storeId == null) return;
    const id = String(r.storeId);
    const e = (byId[id] = byId[id] || { storeId: id, count: 0, names: {} });
    e.count += 1;
    const name = String(r.storeName || '').trim();
    if (name) e.names[name] = (e.names[name] || 0) + 1;
  });
  return Object.values(byId)
    .map((s) => ({
      storeId: s.storeId,
      count: s.count,
      name: Object.entries(s.names).sort((a, b) => b[1] - a[1])[0]?.[0] || `Store ${s.storeId}`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default function Leaderboard() {
  const { user } = useAuth();
  const { data, loading, error, fromCache, reload } = useApi(() => api.leaderboard(), []);
  // "all" | "store" (my store) | "pick" (store chosen from the list)
  const [scope, setScope] = useState('all');
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const allRows = useMemo(() => data?.leaderboard ?? [], [data]);
  const stores = useMemo(() => buildStoreList(allRows), [allRows]);
  const myStoreId = user.storeId != null ? String(user.storeId) : null;

  // Store currently filtered on (null = all stores)
  const activeStoreId = scope === 'store' ? myStoreId : scope === 'pick' ? selectedStoreId : null;
  const activeStore = stores.find((s) => s.storeId === String(activeStoreId));

  // Filter to one store and re-rank within it
  const rows = useMemo(() => {
    if (activeStoreId == null) return allRows;
    return allRows.filter((r) => String(r.storeId) === String(activeStoreId)).map((r, i) => ({ ...r, rank: i + 1 }));
  }, [allRows, activeStoreId]);

  const me = rows.find((r) => String(r.employeeId) === String(user.employeeId));

  useEffect(() => setLimit(PAGE_SIZE), [scope, selectedStoreId]);

  // Close the sheet with Escape
  useEffect(() => {
    if (!pickerOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setPickerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickerOpen]);

  const pickStore = (id) => {
    setSelectedStoreId(id);
    setScope('pick');
    setPickerOpen(false);
  };

  const tabs = [
    { key: 'all', label: 'All Stores', show: true },
    { key: 'store', label: 'My Store', show: myStoreId != null },
    { key: 'pick', label: 'Select Store', show: stores.length > 0 },
  ].filter((t) => t.show);

  const range = data?.startDate && data?.endDate ? `${fmtDayMonth(data.startDate)} – ${fmtDayMonth(data.endDate)}` : '';

  return (
    <>
      <BannerHeader eyebrow="SALES LEADERBOARD" title="Leaderboard" subtitle={`${range ? `${range} · ` : ''}ranked by sales achieved`} />
      <div className="page">
        <div className="tabs" role="tablist" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={scope === t.key}
              className={scope === t.key ? 'active' : ''}
              onClick={() => (t.key === 'pick' ? setPickerOpen(true) : setScope(t.key))}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Chosen store — tap to change */}
        {scope === 'pick' && activeStore && (
          <button type="button" className="store-chip" onClick={() => setPickerOpen(true)}>
            <Store size={18} />
            <span className="store-chip-name">{activeStore.name}</span>
            <span className="store-chip-change">Change</span>
            <ChevronDown size={16} />
          </button>
        )}

        <OfflineNote show={fromCache} />
        {loading && !data && <Spinner />}
        {error && !data && <ErrorState error={error} onRetry={reload} />}

        {data && (
          <>
            <div className="card you">
              <UserCircle size={34} />
              <div>
                <strong>
                  {me
                    ? `Your rank #${me.rank} of ${rows.length}`
                    : scope === 'pick'
                      ? `${rows.length} staff in this store`
                      : "You're not on this leaderboard yet"}
                </strong>
                {me && (
                  <p className="muted you-sub">
                    {inr(me.achieved)}
                    {me.target ? ` · ${Math.round(me.achievementPercentage ?? 0)}% of target` : ''}
                  </p>
                )}
              </div>
            </div>
            <ol className="lb-list">
              {rows.slice(0, limit).map((r) => {
                const a = achievement(r);
                const mine = String(r.employeeId) === String(user.employeeId);
                return (
                  <li key={`${scope}-${r.employeeId}-${r.rank}`} className={`lb-row ${mine ? 'lb-row--me' : ''}`}>
                    <Rank rank={r.rank} />
                    <div className="lb-info">
                      <strong>{r.employeeName}{mine ? '  (You)' : ''}</strong>
                      {/* Within one store the department is more useful than the store name */}
                      <span>{activeStoreId != null ? r.department || r.storeName : r.storeName}</span>
                    </div>
                    <div className="lb-score">
                      <strong>{inr(r.achieved)}</strong>
                      <span className={`ach ach--${a.tone}`}>{a.label}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
            {rows.length === 0 && <p className="muted center">No data for this period.</p>}
            {rows.length > limit && (
              <button type="button" className="btn btn--outline btn--block" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                Show more
              </button>
            )}
          </>
        )}
      </div>

      {/* Store picker (bottom sheet, like the app) */}
      {pickerOpen && (
        <div className="sheet-wrap" onClick={() => setPickerOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="pick-title" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <h2 id="pick-title">Select Store</h2>
              <button type="button" className="icon-btn icon-btn--dark" aria-label="Close" onClick={() => setPickerOpen(false)}>
                <X size={22} />
              </button>
            </div>
            <ul className="sheet-list">
              {stores.map((s) => {
                const selected = scope === 'pick' && s.storeId === String(selectedStoreId);
                const isMine = myStoreId != null && s.storeId === myStoreId;
                return (
                  <li key={s.storeId}>
                    <button type="button" className={`store-row ${selected ? 'store-row--on' : ''}`} onClick={() => pickStore(s.storeId)}>
                      <Store size={20} />
                      <span className="store-row-main">
                        <strong>{s.name}</strong>
                        <span>{s.count} staff{isMine ? ' · Your store' : ''}</span>
                      </span>
                      {selected && <CheckCircle2 size={22} className="store-row-check" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
