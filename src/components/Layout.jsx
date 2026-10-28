import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ClipboardCheck, CircleUser, CloudDownload, Crown, Download, Fingerprint, GraduationCap, LogOut, QrCode, Target, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLeads } from '../context/LeadsContext.jsx';
import { useInstallPrompt, useOnline } from '../hooks/useApi.js';
import CallOutcomeModal from './CallOutcomeModal.jsx';

export const NAV = [
  { to: '/target', label: 'Target', icon: Target },
  { to: '/leaders', label: 'Leaders', icon: Crown },
  { to: '/lms', label: 'LMS', icon: GraduationCap },
  { to: '/attend', label: 'Attend', icon: Fingerprint },
  { to: '/leads', label: 'Lead', icon: Users },
  { to: '/new-lead', label: 'NewLead', icon: QrCode },
  { to: '/profile', label: 'Profile', icon: CircleUser },
];

const EXTRA = [{ to: '/checklist', label: 'Checklist', icon: ClipboardCheck }];

export default function Layout() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { queued } = useLeads();
  const online = useOnline();
  const [drawer, setDrawer] = useState(false);
  const { canInstall, install, showIOSHint, installed } = useInstallPrompt();
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    // Look for a newly published version every 30 minutes, not only on reload
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => registration.update().catch(() => {}), 30 * 60 * 1000);
    },
  });

  // Course details and checklist forms are "focus" pages: no bottom bar on phones.
  const focus = /^\/lms\/[^/]+$/.test(pathname) || /^\/checklist\/[^/]+$/.test(pathname);

  useEffect(() => {
    setDrawer(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const open = () => setDrawer(true);
    window.addEventListener('ontrack:open-menu', open);
    return () => window.removeEventListener('ontrack:open-menu', open);
  }, []);

  useEffect(() => {
    if (!offlineReady) return undefined;
    const t = setTimeout(() => setOfflineReady(false), 4000);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  // Sidebar order: the tabs, then Checklist, with Profile always last
  const sideItems = [
    ...NAV.filter((n) => n.to !== '/profile'),
    ...EXTRA,
    ...NAV.filter((n) => n.to === '/profile'),
  ];
  const links = (
    <>
      {sideItems.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
          <Icon size={22} /> <span>{label === 'Lead' ? 'Leads' : label === 'NewLead' ? 'New Lead' : label}</span>
        </NavLink>
      ))}
    </>
  );

  const installBlock = !installed && (canInstall || showIOSHint) && (
    <div className="install-box">
      {canInstall ? (
        <button type="button" className="btn btn--outline btn--block" onClick={install}>
          <Download size={18} /> Install app
        </button>
      ) : (
        <p className="install-hint">To install: tap Share, then “Add to Home Screen”.</p>
      )}
    </div>
  );

  return (
    <div className={`shell ${focus ? 'shell--focus' : ''}`}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-brand">
          <img src="/logo.png" alt="HomeTown" />
          <span>OnTrack</span>
        </div>
        <nav className="sidebar-nav">{links}</nav>
        <div className="sidebar-foot">
          <div className="sidebar-user">
            <strong>{user?.name ?? user?.employeeId}</strong>
            <span>ID: {user?.employeeId}</span>
          </div>
          {installBlock}
          <button type="button" className="side-link side-link--btn" onClick={logout}>
            <LogOut size={22} /> <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="main">
        {!online && (
          <div className="banner banner--offline" role="status">
            You're offline. Saved data is shown{queued ? `; ${queued} new lead${queued > 1 ? 's' : ''} will sync when you're back online` : ''}.
          </div>
        )}

        {offlineReady && <div className="banner banner--update" role="status">Ready to work offline.</div>}
        <Outlet />
      </div>

      <nav className="bottom-nav" aria-label="Main navigation">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `bn-item ${isActive ? 'active' : ''}`}>
            <Icon size={26} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* "Call Conversation" popup after calling a customer (same as the app) */}
      <CallOutcomeModal />

      {/* Force update, like the mobile app: a new version blocks the app until updated.
          Drafts (checklists, queued leads) are kept in local storage, so nothing is lost. */}
      {needRefresh && (
        <div className="force-update" role="alertdialog" aria-modal="true" aria-labelledby="fu-title">
          <div className="force-update-card">
            <span className="force-update-ico"><CloudDownload size={46} /></span>
            <h2 id="fu-title">Update required</h2>
            <p>A new version of HomeTown OnTrack is available with important changes. Please update to continue.</p>
            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => updateServiceWorker(true)}>
              Update now
            </button>
          </div>
        </div>
      )}

      {drawer && (
        <div className="drawer-wrap" onClick={() => setDrawer(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()} aria-label="Menu">
            <div className="drawer-head">
              <img src="/logo.png" alt="HomeTown" />
              <button type="button" className="icon-btn icon-btn--dark" aria-label="Close menu" onClick={() => setDrawer(false)}>
                <X size={22} />
              </button>
            </div>
            <div className="drawer-user">
              <strong>{user?.name ?? user?.employeeId}</strong>
              <span>ID: {user?.employeeId}</span>
            </div>
            <nav className="drawer-nav">
              {EXTRA.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className="side-link">
                  <Icon size={22} /> <span>{label}</span>
                </NavLink>
              ))}
              <button type="button" className="side-link side-link--btn" onClick={logout}>
                <LogOut size={22} /> <span>Log out</span>
              </button>
            </nav>
            {installBlock}
          </aside>
        </div>
      )}
    </div>
  );
}
