// Checklist rules shared by the list and the form — the same rules as the
// mobile app (HTAttendanceApp/utils/checklists).
import { keys } from '../api/session.js';
import { todayIST } from './format.js';

export const sameRole = (a, b) => !!a && !!b && String(a).toUpperCase() === String(b).toUpperCase();

// Card names used in the app (matched on the template title)
const TITLES = [
  [/store karta/i, 'Staff Checklist'],
  [/\bvm\b|visual merch/i, 'VM Checklist'],
  [/store staff|daily store|store operation|floor walk/i, 'Daily Store Operation'],
];
export const checklistTitle = (t) => TITLES.find(([re]) => re.test(t?.title || ''))?.[1] ?? t?.title ?? 'Checklist';

// The compliant answer for a YES_NO item: "YES" unless the template says otherwise
export const expectedAnswer = (item) => String(item?.expected || 'YES').toUpperCase();
export const isScore = (item) => item?.answerType === 'SCORE' || item?.answerType === 'RATING';
export const maxScoreOf = (item) => Number(item?.maxScore) || 5;

// A remark is required for every answer that is not compliant
export const remarkRequired = (item, answer) => !isScore(item) && !!answer && answer !== expectedAnswer(item);

// What is still missing for one item, or null when it is complete
export function itemProblem(item, a = {}) {
  if (isScore(item) ? a.score == null : !a.answer) return 'Answer this point.';
  if (remarkRequired(item, a.answer) && !a.remark?.trim()) return 'Remark required';
  if (item.imageRequired && !a.imageUrl) return 'A photo is required.';
  return null;
}

// Points: YES_NO = maxScore when the answer matches `expected`; SCORE = chosen value
export function scoreOf(template, answers) {
  let achieved = 0;
  let max = 0;
  (template?.sections ?? []).forEach((s) =>
    (s.items ?? []).forEach((it) => {
      const m = Number(it.maxScore) || 0;
      max += m;
      const a = answers[it._id] ?? {};
      if (isScore(it)) achieved += Math.min(Number(a.score) || 0, m);
      else if (a.answer && a.answer === expectedAnswer(it)) achieved += m;
    }),
  );
  return { achieved, max };
}

// "Submitted today" marker, so the same checklist isn't sent twice a day
const submittedKey = (empId, templateId) => `${keys.DRAFT_PREFIX}${empId}.${templateId}.${todayIST()}.submitted`;

export function readSubmitted(empId, templateId) {
  try {
    return JSON.parse(localStorage.getItem(submittedKey(empId, templateId)) || 'null');
  } catch {
    return null;
  }
}

export function saveSubmitted(empId, templateId, result) {
  try {
    localStorage.setItem(
      submittedKey(empId, templateId),
      JSON.stringify({ at: result?.submittedAt || new Date().toISOString(), stats: result?.stats ?? null }),
    );
  } catch {
    /* ignore */
  }
}
