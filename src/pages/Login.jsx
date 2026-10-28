import { useState } from 'react';
import { ArrowRight, Contact, Download, Eye, EyeOff, Lock, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
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

  return (
    <main className="login">
      <div className="login-brand">
        <div className="login-logo">
          <img src="/logo.png" alt="HomeTown" />
        </div>
        <h1 className="login-title">
          Home<span>Town</span> <em>OnTrack</em>
        </h1>
        <p className="login-chip">
          <Sparkles size={16} /> Smart Retail Workforce Platform
        </p>
      </div>

      <form className="login-card" onSubmit={onSubmit} noValidate>
        <div className="login-card-head">
          <div>
            <p className="eyebrow eyebrow--orange">TEAM PORTAL</p>
            <h2>Staff Login</h2>
            <p className="muted">Enter your employee number and password</p>
          </div>
          <span className="badge-icon">
            <Contact size={26} />
          </span>
        </div>

        <label htmlFor="emp" className="label">Employee Number</label>
        <div className="field">
          <Contact size={22} className="field-icon" />
          <input
            id="emp"
            name="username"
            inputMode="numeric"
            autoComplete="username"
            autoCapitalize="none"
            placeholder="Enter Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <label htmlFor="pw" className="label">Password</label>
        <div className="field">
          <Lock size={22} className="field-icon" />
          <input
            id="pw"
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" className="field-toggle" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)}>
            {show ? <Eye size={24} /> : <EyeOff size={24} />}
          </button>
        </div>

        <div className="note note--orange">
          <MapPin size={18} /> Location permissions required for attendance tracking
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy}>
          {busy ? 'Signing in…' : (<>Open Staff Dashboard <ArrowRight size={22} /></>)}
        </button>
        <p className="muted center small">Use your assigned HomeTown employee credentials.</p>
      </form>

      <footer className="login-foot">
        <strong>
          Home<span>Town</span> OnTrack Workforce App
        </strong>
        <a href="https://hometown.in" target="_blank" rel="noopener noreferrer">Visit hometown.in</a>
        <p>
          <ShieldCheck size={16} /> Secure Login · Terms of Service · Privacy Policy
        </p>
        <q>Empowering every store team to learn, perform and grow.</q>
        {!installed && canInstall && (
          <button type="button" className="btn btn--ghost" onClick={install}>
            <Download size={18} /> Install app
          </button>
        )}
        {showIOSHint && <p className="small">To install: tap Share, then “Add to Home Screen”.</p>}
      </footer>
    </main>
  );
}
