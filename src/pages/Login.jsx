import { useState } from 'react';
import { Contact, Download, Eye, EyeOff, Lock, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useInstallPrompt } from '../hooks/useApi.js';

export default function Login() {
  const { login } = useAuth();
  const { canInstall, install, installed, showIOSHint } = useInstallPrompt();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Enter your employee number and password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await login(username, password);
      // Ask for location once up front: attendance needs it.
      navigator.geolocation?.getCurrentPosition(() => {}, () => {}, { timeout: 5000 });
    } catch (err) {
      setError(err.status === 401 || err.status === 400 ? 'Incorrect employee number or password.' : err.message);
      setBusy(false);
    }
  }

  // Same layout and sizes as the mobile app's login screen (HTAttendanceApp/app/index.jsx)
  return (
    <main className="plogin">
      <div className="plogin-brand">
        <h1 className="plogin-title">
          Home<span>Town</span> <em>OnTrack</em>
        </h1>
        <p className="plogin-tag">
          <Sparkles size={13} /> Smart Retail Workforce Platform
        </p>
      </div>

      <form className="plogin-card" onSubmit={onSubmit} noValidate>
        <span className="plogin-badge" aria-hidden="true">
          <Contact size={24} />
        </span>
        <p className="plogin-portal">TEAM PORTAL</p>
        <h2 className="plogin-heading">Staff Login</h2>
        <p className="plogin-sub">{busy ? 'Verifying your credentials…' : 'Enter your employee number and password'}</p>

        <label htmlFor="emp" className="plogin-label">Employee Number</label>
        <div className="plogin-field">
          <Contact size={20} />
          <input
            id="emp"
            name="username"
            autoComplete="username"
            autoCapitalize="characters"
            autoCorrect="off"
            placeholder="Enter Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={busy}
          />
        </div>

        <label htmlFor="pw" className="plogin-label">Password</label>
        <div className="plogin-field">
          <Lock size={20} />
          <input
            id="pw"
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
          <button type="button" className="plogin-eye" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((v) => !v)}>
            {show ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
        </div>

        <div className="plogin-note">
          <MapPin size={14} /> Location permissions required for attendance tracking
        </div>
        {error && (
          <p className="plogin-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="plogin-btn" disabled={busy}>
          {busy ? <span className="spinner spinner--white" /> : 'Open Staff Dashboard →'}
        </button>
        <p className="plogin-foot-text">Use your assigned HomeTown employee credentials.</p>
      </form>

      <footer className="plogin-bottom">
        <strong>
          Home<span>Town</span> OnTrack Workforce App
        </strong>
        <a href="https://www.hometown.in/" target="_blank" rel="noopener noreferrer">Visit hometown.in</a>
        <p>
          <ShieldCheck size={12} /> Secure Login • Terms of Service • Privacy Policy
        </p>
        <q>Empowering every store team to learn, perform and grow.</q>
        {!installed && canInstall && (
          <button type="button" className="plogin-install" onClick={install}>
            <Download size={14} /> Install app
          </button>
        )}
        {showIOSHint && <p className="plogin-hint">To install: tap Share, then “Add to Home Screen”.</p>}
      </footer>
    </main>
  );
}
