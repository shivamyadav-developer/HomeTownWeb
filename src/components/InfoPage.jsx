// Building blocks for the About / Settings / Contact / Help pages — the web
// version of the mobile app's components/InfoPage.jsx.
import { ChevronRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, TopBar } from './ui.jsx';

export function InfoPage({ title, subtitle, children }) {
  const navigate = useNavigate();
  return (
    <>
      <TopBar title={title} onBack={() => navigate('/profile')} />
      <div className="page page--narrow info-page">
        {subtitle && <p className="info-sub">{subtitle}</p>}
        {children}
      </div>
    </>
  );
}

export function InfoCard({ title, children }) {
  return (
    <Card className="info-card">
      {title && <h2 className="card-title">{title}</h2>}
      {children}
    </Card>
  );
}

export function InfoText({ children }) {
  return <p className="info-text">{children}</p>;
}

/**
 * One row: icon, label, optional value.
 * href → link (external links open in a new tab); to → in-app page; right → custom control.
 */
export function InfoRow({ icon: Icon, label, value, href, to, onClick, right }) {
  const navigate = useNavigate();
  const external = href?.startsWith('http');
  const body = (
    <>
      <span className="info-ico">{Icon && <Icon size={20} />}</span>
      <span className="info-main">
        <strong>{label}</strong>
        {value && <span>{value}</span>}
      </span>
      {right ??
        (href || to || onClick ? (
          external ? <ExternalLink size={18} className="info-chev" /> : <ChevronRight size={20} className="info-chev" />
        ) : null)}
    </>
  );

  if (href) {
    return (
      <a className="info-row info-row--link" href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {body}
      </a>
    );
  }
  if (to || onClick) {
    return (
      <button type="button" className="info-row info-row--link" onClick={onClick ?? (() => navigate(to))}>
        {body}
      </button>
    );
  }
  return <div className="info-row">{body}</div>;
}
