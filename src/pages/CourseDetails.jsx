import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Award, Building2, CheckCircle2, CircleHelp, ExternalLink, FileText, Play, Video } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { Card, ErrorState, OfflineNote, Spinner, TopBar } from '../components/ui.jsx';
import { courseStatus } from './Courses.jsx';

/**
 * contentText arrives as plain text. Short lines without sentence punctuation (or markdown
 * headings) become section headings; everything else becomes a ticked list item.
 */
export function parseContent(text = '') {
  const sections = [];
  let current = null;
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const isHeading = (l) => /^#{1,4}\s/.test(l) || /^\*\*[^*]+\*\*:?$/.test(l) || (l.length <= 60 && !/[.:;]$/.test(l) && !/^[-•*\d]/.test(l) && /^[A-Z]/.test(l) && l.split(' ').length <= 8);
  lines.forEach((raw) => {
    if (isHeading(raw)) {
      current = { heading: raw.replace(/^#{1,4}\s/, '').replace(/\*\*/g, '').replace(/:$/, ''), items: [] };
      sections.push(current);
      return;
    }
    if (!current) {
      current = { heading: null, items: [] };
      sections.push(current);
    }
    current.items.push(raw.replace(/^[-•*]\s*/, '').replace(/\*\*/g, ''));
  });
  return sections;
}

export default function CourseDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const course = useApi(() => api.course(id), [id]);
  const questions = useApi(() => api.questions(id), [id]);
  const progress = useApi(() => api.progress(user.employeeId), [user.employeeId]);

  const c = course.data;
  const p = progress.data?.courses?.find((x) => x.courseId === id);
  const status = courseStatus(p);
  const sections = useMemo(() => parseContent(c?.contentText), [c]);
  const qCount = questions.data?.length ?? p?.totalQuestions ?? 0;

  return (
    <>
      <TopBar title="Course Details" />
      <div className="page page--narrow">
        <OfflineNote show={course.fromCache} />
        {course.loading && !c && <Spinner />}
        {course.error && !c && <ErrorState error={course.error} onRetry={course.reload} />}
        {c && (
          <>
            <Card>
              <span className="fab-icon fab-icon--soft">
                <FileText size={32} />
              </span>
              <h2 className="course-title">{c.title}</h2>
              <p className="muted">{c.description}</p>
              {p && p.totalAttempts > 0 && (
                <p className="small">
                  Best score: <strong>{Math.round(p.bestPercentage)}%</strong> · {p.totalAttempts} attempt{p.totalAttempts > 1 ? 's' : ''}
                  {status === 'PASSED' ? ' · Passed' : status === 'FAILED' ? ' · Not passed yet' : ''}
                </p>
              )}
            </Card>

            <div className="info-tiles">
              <div className="info-tile"><Building2 size={22} /><strong>{c.department}</strong><span>Department</span></div>
              <div className="info-tile"><Award size={22} /><strong>{c.passingPercentage}%</strong><span>To Pass</span></div>
              <div className="info-tile"><CircleHelp size={22} /><strong>{qCount}</strong><span>Questions</span></div>
            </div>

            {(c.pdfUrl || c.videoUrl) && (
              <div className="links">
                {c.pdfUrl && (
                  <a className="btn btn--outline" href={c.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <FileText size={18} /> Open PDF <ExternalLink size={14} />
                  </a>
                )}
                {c.videoUrl && (
                  <a className="btn btn--outline" href={c.videoUrl} target="_blank" rel="noopener noreferrer">
                    <Video size={18} /> Watch video <ExternalLink size={14} />
                  </a>
                )}
              </div>
            )}

            {sections.length > 0 && (
              <Card>
                <h2 className="card-title">What You'll Learn</h2>
                {sections.map((s, i) => (
                  <div key={i} className="learn-section">
                    {s.heading && (
                      <h3 className="learn-heading">
                        <span>{s.heading}</span>
                      </h3>
                    )}
                    <ul className="learn-list">
                      {s.items.map((it, j) => (
                        <li key={j}>
                          <CheckCircle2 size={24} />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </Card>
            )}

            <div className="sticky-cta sticky-cta--plain">
              <button
                type="button"
                className="btn btn--primary btn--block btn--lg"
                disabled={qCount === 0}
                onClick={() => navigate(`/lms/${id}/quiz`)}
              >
                <Play size={20} /> {p?.totalAttempts > 0 ? 'Retake Quiz' : p?.status === 'IN_PROGRESS' ? 'Continue Quiz' : 'Start Quiz'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
