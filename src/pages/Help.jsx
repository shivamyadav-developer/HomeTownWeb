import { useState } from 'react';
import { ChevronDown, ChevronUp, Headset } from 'lucide-react';
import { InfoCard, InfoPage, InfoRow } from '../components/InfoPage.jsx';

// Same questions as the mobile app's Help & Support page
const FAQS = [
  {
    question: 'I cannot mark my attendance',
    answer:
      'Make sure location permission is allowed for the app and your phone’s location is turned on. You also need to be at your assigned work location.',
  },
  {
    question: 'I cannot log in',
    answer:
      'Check your employee number and password. If the problem continues, ask your store manager to verify that your account is active.',
  },
  {
    question: 'My data is not loading',
    answer:
      'Check your internet connection, then refresh the page. If it still does not load, close the app and open it again.',
  },
  {
    question: 'My targets or leads look wrong',
    answer: 'Refresh so the latest data is loaded. If the numbers are still incorrect, report it to your store manager.',
  },
  {
    question: 'The app is asking for location permission',
    answer:
      'Location is used only for attendance and task tracking during work. Choose Allow so attendance can be recorded correctly.',
  },
  {
    question: 'How do I log out?',
    answer: 'Open the Profile tab and tap Log out at the bottom of the page.',
  },
];

export default function Help() {
  const [open, setOpen] = useState(0); // index of the open question (null = all closed)

  return (
    <InfoPage title="Help & Support" subtitle="Answers to common questions">
      <InfoCard title="Frequently Asked Questions">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.question} className="faq">
              <button type="button" className="faq-q" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
                <span>{f.question}</span>
                {isOpen ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
              </button>
              {isOpen && <p className="faq-a">{f.answer}</p>}
            </div>
          );
        })}
      </InfoCard>

      <InfoCard title="Still Need Help?">
        <InfoRow icon={Headset} label="Contact Us" value="Call or email the support team" to="/contact" />
      </InfoCard>
    </InfoPage>
  );
}
