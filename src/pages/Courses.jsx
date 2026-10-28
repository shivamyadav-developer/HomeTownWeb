import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Check, ChevronRight, Circle, GraduationCap, Search, X } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { BannerHeader, Card, ErrorState, OfflineNote, Spinner } from '../components/ui.jsx';

export const COURSE_STATUS = {
  NOT_STARTED: { label: 'Not Started', icon: Circle, tone: 'grey' },
  IN_PROGRESS: { label: 'In Progress', icon: Circle, tone: 'orange' },
  COMPLETED: { label: 'Completed', icon: Check, tone: 'green' },
  PASSED: { label: 'Passed', icon: Check, tone: 'green' },
  FAILED: { label: 'Failed', icon: X, tone: 'red' },
};

/** Derive a display status from the progress record. */
export function courseStatus(p) {
  if (!p) return 'NOT_STARTED';
  if (p.passed) return 'PASSED';
  if (p.status === 'COMPLETED' || (p.completedAttempts > 0 && !p.passed)) return 'FAILED';
  return COURSE_STATUS[p.status] ? p.status : 'NOT_STARTED';
}

export default function Courses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const courses = useApi(() => api.courses(), []);
  const progress = useApi(() => api.progress(user.employeeId), [user.employeeId]);
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('All');

  const pmap = useMemo(() => new Map((progress.data?.courses ?? []).map((c) => [c.courseId, c])), [progress.data]);
  const list = courses.data ?? [];
  const depts = useMemo(() => ['All', ...new Set(list.map((c) => c.department).filter(Boolean))], [list]);

  const summary = useMemo(() => {
    const s = progress.data?.summary;
    const total = s?.totalCourses ?? list.length;
    return {
      total,
      completed: s?.completedCourses ?? 0,
      inProgress: s?.inProgressCourses ?? 0,
      passed: s?.passedCourses ?? 0,
      failed: s?.failedCourses ?? 0,
      overall: s?.overallProgress ?? (total ? Math.round(((s?.completedCourses ?? 0) / total) * 100) : 0),
    };
  }, [progress.data, list.length]);

  const filtered = list.filter(
    (c) =>
      (dept === 'All' || c.department === dept) &&
      (!q.trim() || `${c.title} ${c.description ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())),
  );

  return (
    <>
      <BannerHeader eyebrow="LEARNING HUB" title="My Learning" subtitle="Complete courses and grow your retail skills." />
      <div className="page">
        <OfflineNote show={courses.fromCache || progress.fromCache} />

        <Card className="overall">
          <div>
            <p className="muted">Overall Progress</p>
            <strong className="overall-pct">{Math.round(summary.overall)}%</strong>
            <p className="muted">
              {summary.completed} of {summary.total} courses completed
            </p>
          </div>
          <span className="fab-icon">
            <GraduationCap size={44} />
          </span>
        </Card>

        <div className="stat-tiles">
          {[
            ['Courses', summary.total],
            ['In Progress', summary.inProgress],
            ['Passed', summary.passed],
            ['Failed', summary.failed],
          ].map(([label, n]) => (
            <div key={label} className="stat-tile">
              <strong>{n}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <h2 className="section-title">Available Courses</h2>
        <div className="search">
          <Search size={20} />
          <input type="search" placeholder="Search courses" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search courses" />
        </div>
        {depts.length > 2 && (
          <div className="chips-scroll" role="group" aria-label="Department">
            {depts.map((d) => (
              <button key={d} type="button" className={`filter-chip ${dept === d ? 'active' : ''}`} onClick={() => setDept(d)}>
                {d}
              </button>
            ))}
          </div>
        )}

        {courses.loading && !courses.data && <Spinner />}
        {courses.error && !courses.data && <ErrorState error={courses.error} onRetry={courses.reload} />}

        <div className="course-grid">
          {filtered.map((c) => {
            const st = COURSE_STATUS[courseStatus(pmap.get(c._id))];
            const StIcon = st.icon;
            return (
              <button key={c._id} type="button" className="course" onClick={() => navigate(`/lms/${c._id}`)}>
                <BookOpen size={44} strokeWidth={1.6} className="course-ico" />
                <span className="course-body">
                  <strong>{c.title}</strong>
                  <span className="course-desc">{c.description}</span>
                  <span className="course-meta">
                    <span className="tag">{c.department}</span>
                    <span className="pass">Pass: {c.passingPercentage}%</span>
                    <span className="qs">{c.questionCount} Qs</span>
                  </span>
                  <span className={`status status--${st.tone}`}>
                    <StIcon size={14} /> {st.label}
                  </span>
                </span>
                <span className="go">
                  <ChevronRight size={28} />
                </span>
              </button>
            );
          })}
        </div>
        {courses.data && filtered.length === 0 && <p className="muted center">No courses match.</p>}
      </div>
    </>
  );
}
