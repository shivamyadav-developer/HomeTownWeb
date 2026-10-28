import { AlertTriangle, ArrowLeft, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { statusLabel, statusTone } from '../utils/format.js';

export function Spinner({ full = false, label = 'Loading' }) {
  return (
    <div className={full ? 'spinner-full' : 'spinner-inline'} role="status" aria-label={label}>
      <span className="spinner" />
    </div>
  );
}

/** Navy curved page header. Children go inside a width-limited inner container. */
export function Header({ children, className = '' }) {
  return (
    <header className={`hdr ${className}`}>
      <div className="hdr-inner">{children}</div>
    </header>
  );
}

export function BannerHeader({ eyebrow, title, subtitle, right }) {
  return (
    <Header className="hdr--banner">
      <div className="hdr-row">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="hdr-title">{title}</h1>
          {subtitle && <p className="hdr-sub">{subtitle}</p>}
        </div>
        {right}
      </div>
    </Header>
  );
}

export function TopBar({ title, onBack, backIcon, right }) {
  const navigate = useNavigate();
  const Icon = backIcon ?? ArrowLeft;
  return (
    <Header className="hdr--topbar">
      <div className="topbar">
        <button type="button" className="icon-btn" aria-label={backIcon ? 'Close' : 'Back'} onClick={onBack ?? (() => navigate(-1))}>
          <Icon size={26} />
        </button>
        <h1 className="topbar-title">{title}</h1>
        {right}
      </div>
    </Header>
  );
}

export function Card({ children, className = '', ...rest }) {
  return (
    <section className={`card ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function ProgressBar({ value, tone }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className="bar" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <span className={`bar-fill ${tone ?? ''}`} style={{ width: `${v}%` }} />
    </div>
  );
}

export function StatusPill({ status }) {
  return <span className={`pill pill--${statusTone(status)}`}>{statusLabel(status)}</span>;
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state state--error" role="alert">
      <AlertTriangle size={28} />
      <p>{error?.message || 'Something went wrong.'}</p>
      {onRetry && (
        <button type="button" className="btn btn--outline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="state">
      {Icon && <Icon size={40} />}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
    </div>
  );
}

export function OfflineNote({ show }) {
  if (!show) return null;
  return (
    <div className="note note--offline" role="status">
      <WifiOff size={16} /> You're offline — showing your last saved data.
    </div>
  );
}
