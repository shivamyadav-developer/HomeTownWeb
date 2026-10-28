import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, X, XCircle } from 'lucide-react';
import { api, unwrap } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorState, Header, Spinner } from '../components/ui.jsx';

const LETTERS = 'ABCDEFGH';

export default function Quiz() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // questionId -> selected index
  const [phase, setPhase] = useState('loading'); // loading | quiz | submitting | result | error
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const begin = useCallback(async () => {
    setPhase('loading');
    setError(null);
    setAnswers({});
    setIndex(0);
    try {
      const [c, q] = await Promise.all([api.course(id), api.questions(id)]);
      // Starting an attempt needs the network; offline cached copies of the questions are not enough.
      const started = unwrap(await api.startAttempt(id, user.employeeId));
      const aid = started?.attemptId ?? started?._id ?? started?.attempt?._id ?? started?.id;
      if (!aid) throw new Error('Could not start the quiz. Please try again.');
      setCourse(c.data);
      setQuestions(q.data);
      setAttemptId(aid);
      // Resume previously saved answers if the server returns them.
      const saved = started?.answers ?? started?.attempt?.answers;
      if (Array.isArray(saved)) {
        setAnswers(Object.fromEntries(saved.filter((a) => a.questionId != null).map((a) => [a.questionId, a.selectedAnswer])));
      }
      setPhase('quiz');
    } catch (e) {
      setError(e);
      setPhase('error');
    }
  }, [id, user.employeeId]);

  useEffect(() => {
    begin();
  }, [begin]);

  const q = questions[index];
  const selected = q ? answers[q._id] : undefined;
  const last = index === questions.length - 1;

  async function choose(optionIdx) {
    if (!q || saving) return;
    const prev = answers[q._id];
    setAnswers((a) => ({ ...a, [q._id]: optionIdx }));
    setSaving(true);
    try {
      await api.submitAnswer(attemptId, q._id, optionIdx);
    } catch (e) {
      setAnswers((a) => ({ ...a, [q._id]: prev }));
      setError(e);
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    setPhase('submitting');
    try {
      const r = unwrap(await api.finishAttempt(attemptId));
      setResult(r);
      setPhase('result');
    } catch (e) {
      setError(e);
      setPhase('quiz');
    }
  }

  const header = (
    <Header className="hdr--topbar hdr--quiz">
      <div className="topbar">
        <button type="button" className="icon-btn" aria-label="Exit quiz" onClick={() => (phase === 'quiz' ? setConfirmExit(true) : navigate(`/lms/${id}`, { replace: true }))}>
          <X size={26} />
        </button>
        <h1 className="topbar-title">{course?.title ?? 'Quiz'}</h1>
        {phase === 'quiz' && questions.length > 0 && <span className="counter">{index + 1}/{questions.length}</span>}
      </div>
    </Header>
  );

  if (phase === 'loading' || phase === 'submitting') {
    return (
      <div className="quiz">
        {header}
        <Spinner />
      </div>
    );
  }
  if (phase === 'error') {
    return (
      <div className="quiz">
        {header}
        <div className="quiz-body"><ErrorState error={error} onRetry={begin} /></div>
      </div>
    );
  }

  if (phase === 'result') {
    const pctScore = Math.round(result?.percentage ?? result?.score ?? 0);
    const passed = result?.passed ?? pctScore >= (course?.passingPercentage ?? 0);
    const obtained = result?.obtainedMarks ?? result?.marksObtained;
    const total = result?.totalMarks;
    return (
      <div className="quiz">
        {header}
        <div className="quiz-body">
          <div className="card result">
            {passed ? <CheckCircle2 size={64} className="ok" /> : <XCircle size={64} className="bad" />}
            <h2>{passed ? 'Congratulations, you passed!' : 'Not passed this time'}</h2>
            <strong className="result-pct">{pctScore}%</strong>
            {obtained != null && total != null && <p className="muted">{obtained} of {total} marks</p>}
            <p className="muted">Pass mark: {course?.passingPercentage}%</p>
            <div className="result-actions">
              <button type="button" className="btn btn--outline" onClick={begin}>
                <RotateCcw size={18} /> Retake
              </button>
              <button type="button" className="btn btn--primary" onClick={() => navigate('/lms', { replace: true })}>
                Back to courses
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz">
      {header}
      <div className="quiz-body">
        {error && <p className="form-error" role="alert">{error.message}</p>}
        <section className="card question">
          <p className="q-num">Question {index + 1}</p>
          <h2>{q?.question}</h2>
        </section>

        <div className="options" role="radiogroup" aria-label="Answer options">
          {q?.options?.map((opt, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={selected === i}
              className={`option ${selected === i ? 'selected' : ''}`}
              onClick={() => choose(i)}
            >
              <span className="letter">{LETTERS[i]}</span>
              <span>{opt}</span>
            </button>
          ))}
        </div>

        <div className="quiz-nav">
          <button type="button" className="btn btn--slate btn--lg" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            <ArrowLeft size={20} /> Previous
          </button>
          {last ? (
            <button type="button" className="btn btn--primary btn--lg" disabled={selected === undefined || saving} onClick={finish}>
              Finish <CheckCircle2 size={20} />
            </button>
          ) : (
            <button type="button" className="btn btn--primary btn--lg" disabled={selected === undefined || saving} onClick={() => setIndex((i) => i + 1)}>
              Next <ArrowRight size={20} />
            </button>
          )}
        </div>
      </div>

      {confirmExit && (
        <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Exit quiz">
          <div className="modal">
            <h3>Leave this quiz?</h3>
            <p className="muted">Your saved answers stay on the attempt, but you'll need to start again to finish it.</p>
            <div className="modal-actions">
              <button type="button" className="btn btn--outline" onClick={() => setConfirmExit(false)}>Keep going</button>
              <button type="button" className="btn btn--primary" onClick={() => navigate(`/lms/${id}`, { replace: true })}>Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
