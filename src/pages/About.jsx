import { CalendarCheck, Flag, Globe, GraduationCap, ShieldCheck, Store, Truck, Users } from 'lucide-react';
import { InfoCard, InfoPage, InfoRow, InfoText } from '../components/InfoPage.jsx';
import { APP_VERSION, PRIVACY_POLICY_URL, WEBSITE_URL } from '../utils/support.js';

// Same content as the mobile app's About page
const FEATURES = [
  { icon: CalendarCheck, label: 'Attendance', value: 'Mark check-in and check-out from your work location' },
  { icon: Flag, label: 'Targets', value: 'Track your daily sales targets and progress' },
  { icon: Users, label: 'Leads', value: 'Capture customer leads and follow up on them' },
  { icon: GraduationCap, label: 'Learning', value: 'Complete courses and assessments' },
  { icon: Truck, label: 'Delivery & Fitting', value: 'Manage delivery, fitting and shipment tasks' },
];

export default function About() {
  return (
    <InfoPage title="About" subtitle="Know more about this app">
      <div className="about-hero">
        <span className="about-logo"><Store size={34} /></span>
        <h2 className="about-brand">
          <span>Home</span><b>Town</b><span> OnTrack</span>
        </h2>
        <p className="muted">Smart Retail Workforce Platform</p>
        <span className="pill pill--orange">Version {APP_VERSION}</span>
      </div>

      <InfoCard title="About the App">
        <InfoText>
          HomeTown OnTrack is the workforce app for HomeTown store, delivery, fitter and shipment teams. It brings
          attendance, targets, leads, learning and field tasks together in one place, so every team member can stay on
          top of their day.
        </InfoText>
      </InfoCard>

      <InfoCard title="What You Can Do">
        {FEATURES.map((f) => (
          <InfoRow key={f.label} icon={f.icon} label={f.label} value={f.value} />
        ))}
      </InfoCard>

      <InfoCard title="More">
        <InfoRow icon={Globe} label="Website" value="www.hometown.in" href={WEBSITE_URL} />
        <InfoRow icon={ShieldCheck} label="Privacy Policy" href={PRIVACY_POLICY_URL} />
      </InfoCard>

      <p className="info-footer">© {new Date().getFullYear()} HomeTown. All rights reserved.</p>
    </InfoPage>
  );
}
