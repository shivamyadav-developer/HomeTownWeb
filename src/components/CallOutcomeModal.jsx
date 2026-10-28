// "Call Conversation" popup — shown when the user comes back from a call,
// same as the mobile app: call outcome (CRM status) + conversation notes.
// Save and Skip both record the call on the server (PATCH /api/qrleads/:id).
import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { fmtCallDuration, statusAfterCall, useLeads } from '../context/LeadsContext.jsx';
import { LEAD_STATUS, LEAD_STATUS_ORDER } from '../utils/format.js';

// Statuses offered after a call (NEW makes no sense once you've called)
const OUTCOMES = LEAD_STATUS_ORDER.filter((s) => s !== 'NEW');

// Chip colour by stage, same as the app: in progress = blue, closed = green
const CLOSED = new Set(['NOT_INTERESTED', 'WRONG_NUMBER', 'CONVERTED', 'LOST']);
const stageOf = (s) => (CLOSED.has(s) ? 'closed' : 'progress');

export default function CallOutcomeModal() {
  const { finishedCall, finishCall } = useLeads();
  const [status, setStatus] = useState('CONTACTED');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // New call → reset the form with the default outcome
  useEffect(() => {
    if (!finishedCall) return;
    setStatus(statusAfterCall(finishedCall.lead));
    setNotes('');
    setError('');
  }, [finishedCall]);

  if (!finishedCall) return null;

  const done = async (withNotes) => {
    setSaving(true);
    setError('');
    try {
      await finishCall(status, withNotes ? notes : '');
    } catch (e) {
      // finishCall already closed the popup; tell the user the update failed
      window.alert(`Lead not updated. ${e?.message || 'Please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sheet-wrap" role="presentation">
      <div className="call-sheet" role="dialog" aria-modal="true" aria-labelledby="call-title">
        <span className="call-grip" aria-hidden="true" />
        <h2 id="call-title" className="call-title">Call Conversation</h2>
        <p className="call-sub">
          {finishedCall.customerName || 'Customer'}
          {finishedCall.mobile ? `  •  ${finishedCall.mobile}` : ''}
        </p>
        <p className="call-meta">Approx. call time: {fmtCallDuration(finishedCall.durationSeconds)}</p>

        <p className="call-label">Call outcome</p>
        <div className="call-statuses" role="radiogroup" aria-label="Call outcome">
          {OUTCOMES.map((s) => {
            const on = status === s;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={on}
                className={`call-chip ${on ? `call-chip--on call-chip--${stageOf(s)}` : ''}`}
                onClick={() => setStatus(s)}
              >
                {on && <Check size={14} />} {LEAD_STATUS[s].label}
              </button>
            );
          })}
        </div>

        <textarea
          className="call-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did the customer say? Add conversation notes..."
          maxLength={500}
        />
        {error && <p className="form-error">{error}</p>}

        <div className="call-actions">
          <button type="button" className="call-skip" disabled={saving} onClick={() => done(false)}>
            Skip
          </button>
          <button type="button" className="call-save" disabled={saving} onClick={() => done(true)}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
