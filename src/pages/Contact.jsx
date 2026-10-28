import { Clock, Globe, Mail, MapPin, Phone } from 'lucide-react';
import { InfoCard, InfoPage, InfoRow, InfoText } from '../components/InfoPage.jsx';
import { OFFICE_ADDRESS, SUPPORT_EMAIL, SUPPORT_HOURS, SUPPORT_PHONE, WEBSITE_URL } from '../utils/support.js';

// Same content as the mobile app's Contact Us page
export default function Contact() {
  return (
    <InfoPage title="Contact Us" subtitle="We are here to help">
      <div className="contact-actions">
        <a className="contact-action" href={`tel:${SUPPORT_PHONE}`}>
          <span className="contact-ico contact-ico--green"><Phone size={22} /></span>
          <strong>Call Us</strong>
          <span className="muted">Talk to support</span>
        </a>
        <a className="contact-action" href={`mailto:${SUPPORT_EMAIL}`}>
          <span className="contact-ico contact-ico--orange"><Mail size={22} /></span>
          <strong>Email Us</strong>
          <span className="muted">Reply in 24 hours</span>
        </a>
      </div>

      <InfoCard title="Support Details">
        <InfoRow icon={Phone} label="Helpline" value={SUPPORT_PHONE} href={`tel:${SUPPORT_PHONE}`} />
        <InfoRow icon={Mail} label="Email" value={SUPPORT_EMAIL} href={`mailto:${SUPPORT_EMAIL}`} />
        <InfoRow icon={Clock} label="Availability" value={SUPPORT_HOURS} />
        <InfoRow icon={MapPin} label="Office" value={OFFICE_ADDRESS} />
      </InfoCard>

      <InfoCard title="Online">
        <InfoRow icon={Globe} label="Website" value="www.hometown.in" href={WEBSITE_URL} />
      </InfoCard>

      <InfoCard>
        <InfoText>
          For attendance or login issues, please contact your store manager first. They can raise a request with the
          support team on your behalf.
        </InfoText>
      </InfoCard>
    </InfoPage>
  );
}
