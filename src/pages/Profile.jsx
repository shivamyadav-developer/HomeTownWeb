import {
  AppWindow,
  BadgeCheck,
  Banknote,
  Briefcase,
  Building,
  Building2,
  CalendarDays,
  CircleHelp,
  CreditCard,
  FileText,
  Headset,
  Home,
  Info,
  Layers,
  LogOut,
  Mail,
  Map,
  MapPin,
  Phone,
  Settings as SettingsIcon,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Tag,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, Header } from '../components/ui.jsx';
import { InfoRow } from '../components/InfoPage.jsx';
import { initials } from '../api/user.js';
import { fmtLongDate } from '../utils/format.js';
import { PRIVACY_POLICY_URL } from '../utils/support.js';

function Row({ icon: Icon, label, value }) {
  return (
    <div className="kv">
      <span className="kv-ico"><Icon size={22} /></span>
      <span className="kv-label">{label}</span>
      <strong className="kv-value">{value || 'N/A'}</strong>
    </div>
  );
}

// Same pages as the mobile app's Profile → Help & Information
const INFO_PAGES = [
  { label: 'About', icon: Info, to: '/about' },
  { label: 'Settings', icon: SettingsIcon, to: '/settings' },
  { label: 'Contact Us', icon: Headset, to: '/contact' },
  { label: 'Help & Support', icon: CircleHelp, to: '/help' },
];

// Same layout and fields as the mobile app's Profile screen
export default function Profile() {
  const { user, logout } = useAuth();
  const designation = user.designation ?? user.role;
  const pair = (a, b) => `${a || 'N/A'} · ${b || 'N/A'}`;
  const date = (v) => (v ? fmtLongDate(v) : '');

  const confirmLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) logout();
  };

  return (
    <>
      <Header className="hdr--profile">
        <div className="profile-hero">
          <span className="avatar-ring">{initials(user.name ?? user.employeeId)}</span>
          <div className="min0">
            <h1 className="profile-name">{user.name ?? user.employeeId}</h1>
            <div className="chips">
              {designation && <span className="chip chip--orange">{String(designation).toUpperCase()}</span>}
              <span className="chip chip--blue chip--status">
                <i className={`dot ${user.active === false ? 'dot--off' : ''}`} /> {user.active === false ? 'Inactive' : 'Active'}
              </span>
            </div>
          </div>
        </div>
      </Header>

      <div className="page grid-2">
        <Card>
          <h2 className="card-title">Store &amp; Manager</h2>
          <Row icon={Store} label="STORE" value={user.storeName} />
          <Row icon={MapPin} label="STORE CODE · REGION" value={pair(user.storeId, user.city ?? user.region)} />
          <Row icon={Building2} label="CITY · STATE" value={pair(user.city, user.state)} />
          <Row icon={Users} label="REPORTING MANAGER" value={user.managerName} />
          <Row icon={CreditCard} label="MANAGER EMP. NO." value={user.managerId} />
        </Card>

        <Card>
          <h2 className="card-title">Employee Details</h2>
          <Row icon={CreditCard} label="EMPLOYEE CODE" value={user.employeeId} />
          <Row icon={Phone} label="MOBILE" value={user.mobile} />
          <Row icon={Mail} label="EMAIL" value={user.email} />
          <Row icon={Building} label="DEPARTMENT" value={user.department} />
          <Row icon={Layers} label="DEPARTMENT CATEGORY" value={user.departmentCategory} />
          <Row icon={Briefcase} label="DESIGNATION" value={designation} />
          <Row icon={CalendarDays} label="JOINING DATE" value={date(user.joiningDate)} />
          {user.exitDate && <Row icon={CalendarDays} label="EXIT DATE" value={date(user.exitDate)} />}
        </Card>

        <Card>
          <h2 className="card-title">Additional Information</h2>
          <Row icon={MapPin} label="LOCATION" value={user.location ?? user.storeName} />
          <Row icon={TrendingUp} label="BAND" value={user.band} />
          <Row icon={User} label="WORKER TYPE" value={user.workerType} />
          <Row icon={BadgeCheck} label="EMPLOYMENT STATUS" value={user.employmentStatus} />
          <Row icon={Home} label="FORMAT" value={user.format} />
          <Row icon={Layers} label="SUB FORMAT" value={user.subFormat} />
          <Row icon={AppWindow} label="FUNCTIONS" value={user.functions} />
          <Row icon={SlidersHorizontal} label="SUB FUNCTION" value={user.subFunction} />
          <Row icon={Map} label="EMPLOYEE ZONE" value={user.employeeZone} />
          <Row icon={Banknote} label="COST CENTER NO" value={user.costCenterNo} />
          <Row icon={FileText} label="COST CENTER DESCRIPTION" value={user.costCenterDescription} />
          <Row icon={Tag} label="PROFIT CENTRE" value={user.profitCentre} />
        </Card>

        <Card>
          <h2 className="card-title">Help &amp; Information</h2>
          {INFO_PAGES.map((p) => (
            <InfoRow key={p.to} icon={p.icon} label={p.label} to={p.to} />
          ))}
          <InfoRow icon={ShieldCheck} label="Privacy Policy" href={PRIVACY_POLICY_URL} />
        </Card>

        <button type="button" className="btn btn--outline btn--block span-all logout-btn" onClick={confirmLogout}>
          <LogOut size={20} /> Log out
        </button>
      </div>
    </>
  );
}
