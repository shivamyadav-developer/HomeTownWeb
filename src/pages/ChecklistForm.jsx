import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, CheckCircle2, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { api, unwrap } from '../api/client.js';
import { keys } from '../api/session.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { Card, ErrorState, EmptyState, ProgressBar, Spinner, TopBar } from '../components/ui.jsx';
import { fmtTime, todayIST } from '../utils/format.js';
import {
  checklistTitle,
  expectedAnswer,
  isScore,
  itemProblem,
  maxScoreOf,
  readSubmitted,
  remarkRequired,
  saveSubmitted,
  scoreOf,
} from '../utils/checklist.js';

/** Shrink phone photos before upload (max 1280px, JPEG) to save data and time. */
async function compress(file) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.8));
    return blob ?? file;
  } catch {
    return file;
  }
}

const imageUrlFrom = (resp) => {
  const d = unwrap(resp);
  return d?.url ?? d?.imageUrl ?? d?.location ?? resp?.url ?? resp?.imageUrl ?? (typeof d === 'string' ? d : null);
};

// Submitted today: the form is cleared and this result is shown instead (same as the app)
function SubmittedCard({ title, done, onDone }) {
  const s = done.stats ?? {};
  return (
    <Card className="result">
      <CheckCircle2 size={64} className="ok" />
      <h2>Checklist submitted</h2>
      <p className="muted">Today at {fmtTime(done.at)}</p>
      {s.compliancePercentage != null && (
        <>
          <strong className="result-pct">{Math.round(s.compliancePercentage)}%</strong>
          <p className="muted">compliance</p>
          <p>{s.compliant ?? 0} compliant · {s.nonCompliant ?? 0} not compliant · {s.imagesAttached ?? 0} photos</p>
        </>
      )}
      <p className="muted">{title} — a new checklist opens tomorrow.</p>
      <button type="button" className="btn btn--primary" onClick={onDone}>Done</button>
    </Card>
  );
}

export default function ChecklistForm() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(() => api.templates(), []);
  const template = useMemo(() => (data ?? []).find((t) => t._id === id), [data, id]);

  const draftKey = `${keys.DRAFT_PREFIX}${user.employeeId}.${id}.${todayIST()}`;
  const [answers, setAnswers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(draftKey)) ?? {};
    } catch {
      return {};
    }
  });
  const [uploading, setUploading] = useState({});
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(() => readSubmitted(user.employeeId, id));

  useEffect(() => {
    if (done) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(answers));
    } catch {
      /* ignore */
    }
  }, [answers, draftKey, done]);

  const set = (itemId, patch) => setAnswers((a) => ({ ...a, [itemId]: { ...a[itemId], ...patch } }));

  const items = useMemo(() => (template?.sections ?? []).flatMap((s) => s.items ?? []), [template]);
  const complete = items.filter((it) => !itemProblem(it, answers[it._id])).length;
  const score = useMemo(() => scoreOf(template, answers), [template, answers]);
  const completePct = items.length ? Math.round((complete / items.length) * 100) : 0;

  async function onPhoto(itemId, file) {
    if (!file) return;
    setUploading((u) => ({ ...u, [itemId]: true }));
    setErrors((e) => ({ ...e, [itemId]: undefined }));
    try {
      const blob = await compress(file);
      const url = imageUrlFrom(await api.uploadChecklistImage(blob, `${itemId}.jpg`));
      if (!url) throw new Error('Upload succeeded but no image URL was returned.');
      set(itemId, { imageUrl: url });
    } catch (e) {
      setErrors((er) => ({ ...er, [itemId]: e.offline ? "You're offline. Photos need a connection." : e.message }));
    } finally {
      setUploading((u) => ({ ...u, [itemId]: false }));
    }
  }

  function validate() {
    const e = {};
    items.forEach((it) => {
      const p = itemProblem(it, answers[it._id]);
      if (p) e[it._id] = p;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    setFormError('');
    if (!validate()) {
      setFormError('Please complete the highlighted points.');
      return;
    }
    if (!user.storeId) {
      setFormError('Your profile has no store (siteId). Please log out and log in again, or contact admin.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.submitChecklist({
        templateId: template._id,
        storeId: Number(user.storeId) || user.storeId,
        storeName: user.storeName ?? '',
        date: todayIST(),
        department: '',
        filledByName: user.name ?? user.employeeId,
        submittedBy: { userId: user._id, name: user.name ?? user.employeeId, employeeId: user.employeeId, role: user.role },
        answers: items.map((it) => {
          const a = answers[it._id];
          return {
            itemId: it._id,
            ...(isScore(it) ? { score: a.score } : { answer: a.answer }),
            ...(a.imageUrl ? { imageUrl: a.imageUrl } : {}),
            ...(a.remark?.trim() ? { remark: a.remark.trim() } : {}),
          };
        }),
        submit: true,
      });
      // Sent — clear the answers and show today's result
      const result = unwrap(res);
      saveSubmitted(user.employeeId, template._id, result);
      localStorage.removeItem(draftKey);
      setAnswers({});
      setDone(readSubmitted(user.employeeId, template._id));
    } catch (e) {
      setFormError(e.offline ? "You're offline. Your answers are saved on this device — submit once you're back online." : e.message);
    } finally {
      setBusy(false);
    }
  }

  const back = () => navigate('/checklist');
  const title = template ? checklistTitle(template) : 'Checklist';

  if (loading && !data) return (<><TopBar title={title} onBack={back} /><Spinner /></>);
  if (error && !data) return (<><TopBar title={title} onBack={back} /><div className="page"><ErrorState error={error} onRetry={reload} /></div></>);
  if (!template) return (<><TopBar title={title} onBack={back} /><div className="page"><EmptyState title="Checklist not found" /></div></>);

  if (done) {
    return (
      <>
        <TopBar title={title} onBack={back} />
        <div className="page page--narrow">
          <SubmittedCard title={title} done={done} onDone={back} />
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title={title} onBack={back} />
      <div className="page page--narrow">
        <Card>
          <div className="ck-progress">
            <strong>{complete} of {items.length} complete</strong>
            <span className="orange">{completePct}%</span>
          </div>
          <ProgressBar value={completePct} tone="orange" />
          <div className="ck-score">
            <span className="muted">Score</span>
            <strong>{score.achieved} <span className="muted">/ {score.max}</span></strong>
          </div>
        </Card>

        {template.instructions?.length > 0 && (
          <Card>
            <h2 className="card-title">Instructions</h2>
            <ul className="plain-list">{template.instructions.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </Card>
        )}

        {template.sections.map((s) => (
          <Card key={s._id}>
            <h2 className="card-title">{s.name}</h2>
            {s.items.map((it) => {
              const a = answers[it._id] ?? {};
              const scoreItem = isScore(it);
              const needsRemark = remarkRequired(it, a.answer);
              const remarkMissing = needsRemark && !a.remark?.trim();
              return (
                <div key={it._id} className={`ck-item ${errors[it._id] ? 'ck-item--err' : ''}`}>
                  <p>{it.text}</p>
                  {!scoreItem && expectedAnswer(it) === 'NO' && <span className="ck-expected">Correct answer: No</span>}

                  {scoreItem ? (
                    <div className="ck-score-row" role="radiogroup" aria-label={it.text}>
                      {Array.from({ length: maxScoreOf(it) }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={a.score === n}
                          className={a.score === n ? 'on' : ''}
                          onClick={() => set(it._id, { score: n })}
                        >
                          {n}
                        </button>
                      ))}
                      <span className="muted">/ {maxScoreOf(it)}</span>
                    </div>
                  ) : (
                    <div className="seg" role="radiogroup" aria-label={it.text}>
                      {['YES', 'NO'].map((v) => (
                        <button key={v} type="button" role="radio" aria-checked={a.answer === v} className={`${a.answer === v ? (v === 'YES' ? 'on-yes' : 'on-no') : ''}`} onClick={() => set(it._id, { answer: v })}>
                          {v === 'YES' ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Remark: required (red) when the answer is not compliant, optional otherwise */}
                  {(a.answer || a.score != null) && (
                    <input
                      className={`input input--sm ${remarkMissing ? 'input--remark-missing' : ''}`}
                      placeholder={needsRemark ? 'Remark (required)' : 'Remark (optional)'}
                      value={a.remark ?? ''}
                      onChange={(e) => set(it._id, { remark: e.target.value })}
                      maxLength={300}
                    />
                  )}

                  {(it.imageRequired || a.imageUrl) && (
                    <div className="photo">
                      {a.imageUrl ? (
                        <>
                          <img src={a.imageUrl} alt="Attached proof" loading="lazy" />
                          <button type="button" className="icon-btn icon-btn--dark" aria-label="Remove photo" onClick={() => set(it._id, { imageUrl: undefined })}>
                            <Trash2 size={18} />
                          </button>
                        </>
                      ) : (
                        <label className="btn btn--outline">
                          {uploading[it._id] ? <Loader2 size={18} className="spin" /> : <Camera size={18} />}
                          {uploading[it._id] ? 'Uploading…' : it.imageRequired ? 'Add photo (required)' : 'Add photo'}
                          <input type="file" accept="image/*" capture="environment" hidden disabled={uploading[it._id]} onChange={(e) => { onPhoto(it._id, e.target.files?.[0]); e.target.value = ''; }} />
                        </label>
                      )}
                    </div>
                  )}
                  {!it.imageRequired && !a.imageUrl && (
                    <label className="link-btn">
                      <ImagePlus size={16} /> Attach photo
                      <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onPhoto(it._id, e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                  )}
                  {errors[it._id] && <p className="form-error">{errors[it._id]}</p>}
                </div>
              );
            })}
          </Card>
        ))}

        {formError && <p className="form-error" role="alert">{formError}</p>}
        <button type="button" className="btn btn--primary btn--block btn--lg" disabled={busy} onClick={submit}>
          {busy ? 'Submitting…' : 'Submit Checklist'}
        </button>
      </div>
    </>
  );
}
