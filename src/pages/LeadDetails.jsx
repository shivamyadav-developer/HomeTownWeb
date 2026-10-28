import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Check, ChevronDown, IdCard, Mail, Package, Phone, Store, MessageSquare, History } from 'lucide-react';
import { useLeads } from '../context/LeadsContext.jsx';
import { Card, EmptyState, Spinner, StatusPill, TopBar } from '../components/ui.jsx';
import { fmtDateTime, LEAD_STATUS, LEAD_STATUS_ORDER, statusLabel } from '../utils/format.js';

function Row({ icon: Icon, label, value }) {
  return (
    <div className="info-row">
      <span className="info-ico"><Icon size={22} /></span>
      <div>
        <span className="info-label">{label}</span>
        <strong className="info-value">{value || '—'}</strong>
      </div>
    </div>
  );
}

export default function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { leads, loading, hasMore, loadMore, updateLead, startCall } = useLeads();
  const [menu, setMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const menuRef = useRef(null);

  const lead = leads.find((l) => l._id === id);

  // Opened directly (e.g. after a reload): keep paging until the lead turns up.
  useEffect(() => {
    if (!lead && hasMore && !loading) loadMore();
  }, [lead, hasMore, loading, loadMore]);

  useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  if (!lead) {
    return (
      <>
        <TopBar title="Lead Details" onBack={() => navigate('/leads')} />
        <div className="page">{loading || hasMore ? <Spinner /> : <EmptyState title="Lead not found" text="It may have been removed or belongs to another store." />}</div>
      </>
    );
  }

  const name = lead.customerName && !String(lead.customerName).includes('*') ? lead.customerName : 'Customer';
  const status = lead.crmStatus ?? 'NEW';

  async function change(next) {
    setMenu(false);
    if (next === status) return;
    setSaving(true);
    setError('');
    try {
      await updateLead(lead._id, { crmStatus: next, ...(comment.trim() ? { comment: comment.trim() } : {}) });
      setComment('');
    } catch (e) {
      setError(e.offline ? "You're offline. Connect to update the status." : e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <TopBar title="Lead Details" onBack={() => navigate('/leads')} />
      <div className="page page--narrow page--cta lead-detail">
        <Card className="lead-hero">
          <span className="avatar avatar--lg">{name[0]?.toUpperCase()}</span>
          <h2>{name}</h2>
          <p className="muted big">{lead.mobile}</p>
          <StatusPill status={status} />
          <div className="dropdown" ref={menuRef}>
            <button type="button" className="btn btn--outline btn--pill" aria-haspopup="listbox" aria-expanded={menu} disabled={saving} onClick={() => setMenu((m) => !m)}>
              {saving ? 'Saving…' : 'Change Status'} <ChevronDown size={18} />
            </button>
            {menu && (
              <ul className="menu" role="listbox">
                {LEAD_STATUS_ORDER.map((s) => (
                  <li key={s}>
                    <button type="button" role="option" aria-selected={s === status} onClick={() => change(s)}>
                      {LEAD_STATUS[s].label} {s === status && <Check size={16} />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <input className="input input--sm" placeholder="Optional note with the next status change" value={comment} onChange={(e) => setComment(e.target.value)} aria-label="Status note" maxLength={200} />
          {error && <p className="form-error" role="alert">{error}</p>}
        </Card>

        <Card>
          <h2 className="card-title">Lead Information</h2>
          <Row icon={CalendarDays} label="Created On" value={fmtDateTime(lead.submittedAt ?? lead.createdAt)} />
          <Row icon={Store} label="Store" value={`${lead.storeName ?? ''}${lead.storeId ? ` (${lead.storeId})` : ''}`} />
          <Row icon={IdCard} label="Salesman" value={`${lead.salesmanName ?? ''}${lead.salesmanId ? ` (${lead.salesmanId})` : ''}`} />
          <Row icon={Mail} label="Salesman Email" value={lead.salesmanEmail && !String(lead.salesmanEmail).includes('*') ? lead.salesmanEmail : ''} />
          {lead.remarks && !String(lead.remarks).includes('****') && <Row icon={MessageSquare} label="Remarks" value={lead.remarks} />}
        </Card>

        <Card>
          <h2 className="card-title with-count">
            Scanned Products <span className="count">{lead.products?.length ?? 0}</span>
          </h2>
          {(lead.products ?? []).length === 0 ? (
            <p className="muted">No products scanned.</p>
          ) : (
            <ul className="sku-list">
              {lead.products.map((sku, i) => (
                <li key={`${sku}-${i}`}>
                  <Package size={20} /> <span>{sku}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {Array.isArray(lead.crmHistory) && lead.crmHistory.length > 0 && (
          <Card>
            <h2 className="card-title">History</h2>
            <ul className="timeline">
              {[...lead.crmHistory].reverse().map((h, i) => (
                <li key={i}>
                  <History size={18} />
                  <div>
                    <strong>{statusLabel(h.crmStatus ?? h.status ?? h.to)}</strong>
                    {h.comment && <p>{h.comment}</p>}
                    <small>{fmtDateTime(h.at ?? h.createdAt ?? h.date)}</small>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div className="sticky-cta lead-detail-cta">
        <button type="button" className="btn btn--green btn--block btn--lg" onClick={() => startCall(lead)}>
          <Phone size={24} fill="currentColor" /> Call {lead.mobile}
        </button>
      </div>
    </>
  );
}
