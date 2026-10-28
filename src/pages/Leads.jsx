import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Phone, Search, Users } from 'lucide-react';
import { useLeads } from '../context/LeadsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, ErrorState, Header, OfflineNote, Spinner, StatusPill } from '../components/ui.jsx';
import { fmtDateTime, LEAD_STATUS, LEAD_STATUS_ORDER, statusLabel } from '../utils/format.js';

// Leads are shown 20 at a time; "Show more" reveals the next 20
const STEP = 20;

export default function Leads() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { leads, meta, loading, error, fromCache, hasMore, loadMore, reload, queued, startCall } = useLeads();
  const [q, setQ] = useState('');
  const [stage, setStage] = useState('ALL');
  const [visible, setVisible] = useState(STEP);

  // A new search or filter starts again from the first 20
  useEffect(() => setVisible(STEP), [q, stage]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...leads]
      .sort((a, b) => new Date(b.submittedAt ?? b.createdAt) - new Date(a.submittedAt ?? a.createdAt))
      .filter((l) => stage === 'ALL' || (l.crmStatus ?? 'NEW') === stage)
      .filter(
        (l) =>
          !needle ||
          `${l.customerName ?? ''} ${l.mobile ?? ''} ${(l.products ?? []).join(' ')} ${l.salesmanName ?? ''}`.toLowerCase().includes(needle),
      );
  }, [leads, q, stage]);

  const stages = LEAD_STATUS_ORDER.filter((s) => (meta.stageCounts?.[s] ?? 0) > 0);

  return (
    <>
      <Header className="hdr--leads">
        <div className="hdr-row">
          <div className="min0">
            <h1 className="hdr-title">Leads</h1>
            <p className="hdr-sub ellipsis">
              {user.storeName ?? 'Your store'}
              {user.storeId ? ` • ${user.storeId}` : ''}
            </p>
          </div>
          <div className="count-box">
            <strong>{meta.total || leads.length}</strong>
            <span>Total</span>
          </div>
        </div>
      </Header>

      <div className="page">
        <OfflineNote show={fromCache} />
        {queued > 0 && <div className="note note--orange">{queued} new lead{queued > 1 ? 's' : ''} waiting to sync.</div>}
        <div className="search">
          <Search size={22} />
          <input type="search" placeholder="Search name, mobile or product" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search leads" />
        </div>

        {stages.length > 0 && (
          <div className="chips-scroll" role="group" aria-label="Filter by status">
            <button type="button" className={`filter-chip ${stage === 'ALL' ? 'active' : ''}`} onClick={() => setStage('ALL')}>All</button>
            {stages.map((s) => (
              <button key={s} type="button" className={`filter-chip ${stage === s ? 'active' : ''}`} onClick={() => setStage(s)}>
                {LEAD_STATUS[s].label} ({meta.stageCounts[s]})
              </button>
            ))}
          </div>
        )}

        {!user.storeId && <ErrorState error={{ message: 'Your store could not be determined, so leads cannot be loaded.' }} />}
        {loading && leads.length === 0 && <Spinner />}
        {error && leads.length === 0 && <ErrorState error={error} onRetry={reload} />}

        <div className="lead-grid">
          {filtered.slice(0, visible).map((l) => {
            const name = l.customerName && !String(l.customerName).includes('*') ? l.customerName : 'Customer';
            const n = l.products?.length ?? 0;
            return (
              <div key={l._id} className="lead card" role="button" tabIndex={0} onClick={() => navigate(`/leads/${l._id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/leads/${l._id}`)}>
                <span className="avatar">{name[0]?.toUpperCase()}</span>
                <div className="lead-main">
                  <div className="lead-top">
                    <strong>{name}</strong>
                    <StatusPill status={l.crmStatus ?? 'NEW'} />
                  </div>
                  <p className="lead-phone">{l.mobile}</p>
                  <p className="lead-meta">
                    <Archive size={14} /> {n} product{n === 1 ? '' : 's'} <i>•</i> {fmtDateTime(l.submittedAt ?? l.createdAt)}
                  </p>
                  {l.salesmanName && <p className="lead-by">By {String(l.salesmanName).toUpperCase()}</p>}
                </div>
                <button
                  type="button"
                  className="call-fab"
                  aria-label={`Call ${name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    startCall(l);
                  }}
                >
                  <Phone size={18} fill="currentColor" />
                </button>
              </div>
            );
          })}
        </div>

        {!loading && !error && filtered.length === 0 && (
          <EmptyState icon={Users} title="No leads found" text={q || stage !== 'ALL' ? `Nothing matches${stage !== 'ALL' ? ` “${statusLabel(stage)}”` : ''}.` : 'New walk-in leads will show up here.'} />
        )}
        {filtered.length > 0 && (
          <p className="list-count muted">
            Showing {Math.min(visible, filtered.length)} of {q || stage !== 'ALL' ? filtered.length : meta.total || filtered.length}
          </p>
        )}
        {(visible < filtered.length || (hasMore && !q && stage === 'ALL')) && (
          <button
            type="button"
            className="btn btn--outline btn--block"
            disabled={loading}
            onClick={() => {
              // Fetch the next page from the server only when everything loaded is already shown
              if (visible + STEP > filtered.length && hasMore && !q && stage === 'ALL') loadMore();
              setVisible((v) => v + STEP);
            }}
          >
            {loading ? 'Loading…' : 'Show more'}
          </button>
        )}
      </div>
    </>
  );
}

