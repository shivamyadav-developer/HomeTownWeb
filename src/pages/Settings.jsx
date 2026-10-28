import { useEffect, useState } from 'react';
import { CircleHelp, Info, Languages, MapPin, ShieldCheck } from 'lucide-react';
import { InfoCard, InfoPage, InfoRow } from '../components/InfoPage.jsx';
import { APP_VERSION, PRIVACY_POLICY_URL } from '../utils/support.js';

const LOCATION_TEXT = {
  granted: 'Allowed — required for attendance tracking',
  prompt: 'Not asked yet — allow it on the Attend page',
  denied: 'Blocked — allow location for this site in your browser settings',
};

// Same sections as the mobile app's Settings page. The app's "Push
// Notifications" switch is left out: the website sends no notifications.
export default function Settings() {
  const [locationState, setLocationState] = useState(null);

  useEffect(() => {
    let status;
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((s) => {
        status = s;
        setLocationState(s.state);
        s.onchange = () => setLocationState(s.state);
      })
      .catch(() => {});
    return () => {
      if (status) status.onchange = null;
    };
  }, []);

  return (
    <InfoPage title="Settings" subtitle="Manage your app preferences">
      <InfoCard title="Permissions">
        <InfoRow
          icon={MapPin}
          label="Location Access"
          value={LOCATION_TEXT[locationState] ?? 'Required for attendance tracking'}
          to="/attend"
        />
      </InfoCard>

      <InfoCard title="General">
        <InfoRow icon={Languages} label="Language" value="English" />
        <InfoRow icon={ShieldCheck} label="Privacy Policy" href={PRIVACY_POLICY_URL} />
        <InfoRow icon={CircleHelp} label="Help & Support" to="/help" />
        <InfoRow icon={Info} label="App Version" value={APP_VERSION} />
      </InfoCard>
    </InfoPage>
  );
}
