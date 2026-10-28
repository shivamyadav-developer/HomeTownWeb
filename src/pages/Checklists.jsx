import { useNavigate } from 'react-router-dom';
import { ChevronRight, ClipboardCheck } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { BannerHeader, EmptyState, ErrorState, OfflineNote, Spinner } from '../components/ui.jsx';
import { checklistTitle, readSubmitted, sameRole } from '../utils/checklist.js';

// Same rule as the mobile app: a user only sees the templates whose role
// equals their own login role (STORE_MANAGER → Staff Checklist, VM → VM
// Checklist, STORE_STAFF → Daily Store Operation). New templates the backend
// adds appear automatically for their role.
export default function Checklists() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, fromCache, reload } = useApi(() => api.templates(), []);

  const list = (data ?? []).filter((t) => t.isActive !== false && sameRole(t.role, user.role));
  const roleLabel = user.role ? String(user.role).replace(/_/g, ' ') : '';

  return (
    <>
      <BannerHeader eyebrow="STORE CHECKLISTS" title="Checklist" subtitle="Choose a checklist to fill in for today" />
      <div className="page">
        <OfflineNote show={fromCache} />
        {loading && !data && <Spinner />}
        {error && !data && <ErrorState error={error} onRetry={reload} />}
        <div className="course-grid">
          {list.map((t) => {
            const items = (t.sections ?? []).reduce((n, s) => n + (s.items?.length ?? 0), 0);
            const done = readSubmitted(user.employeeId, t._id);
            return (
              <button key={t._id} type="button" className="course" onClick={() => navigate(`/checklist/${t._id}`)}>
                <ClipboardCheck size={44} strokeWidth={1.6} className="course-ico" />
                <span className="course-body">
                  <strong>{checklistTitle(t)}</strong>
                  <span className="course-desc">{t.title}</span>
                  <span className="course-meta">
                    <span className="qs">
                      {t.sections?.length ?? 0} sections · {items} items · scored
                    </span>
                    {done ? (
                      <span className="pill pill--green">
                        Completed
                        {done.stats?.compliancePercentage != null ? ` · ${Math.round(done.stats.compliancePercentage)}%` : ''}
                      </span>
                    ) : (
                      <span className="pill pill--grey">Not started</span>
                    )}
                  </span>
                </span>
                <span className="go"><ChevronRight size={28} /></span>
              </button>
            );
          })}
        </div>
        {data && list.length === 0 && (
          <EmptyState
            icon={ClipboardCheck}
            title="No checklist for your role"
            text={
              roleLabel
                ? `There is no checklist assigned to ${roleLabel}. Contact your manager if you think this is wrong.`
                : 'Your role is not set.'
            }
          />
        )}
      </div>
    </>
  );
}
