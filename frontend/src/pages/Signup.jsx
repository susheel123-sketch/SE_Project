import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { homeFor, useAuth } from '../auth';
import { Alert, Field } from '../components';

export default function Signup() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'owner' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (form.password.length < 8) local.password = 'Password must be at least 8 characters.';
    if (Object.keys(local).length) { setErrors(local); setMessage('Please fix the highlighted fields.'); return; }
    setBusy(true);
    setErrors({});
    setMessage('');
    try {
      const data = await api.signup(form);
      signIn(data);
      navigate(homeFor(data.user.role));
    } catch (err) {
      setErrors(err.fields);
      setMessage(err.message);
    } finally { setBusy(false); }
  };

  return (
    <form className="panel narrow" onSubmit={submit} noValidate>
      <h1>Create your account</h1>
      <Alert>{message}</Alert>
      <fieldset className="role-choice">
        <legend className="field-label">I am a…</legend>
        {[['owner', 'Device Owner', 'I want a device repaired or traded in'], ['shop', 'Repair Shop', 'I repair or buy devices']].map(([v, t, d]) => (
          <label key={v} className={`role-option${form.role === v ? ' selected' : ''}`}>
            <input type="radio" name="role" value={v} checked={form.role === v} onChange={set('role')} />
            <strong>{t}</strong><span>{d}</span>
          </label>
        ))}
        {errors.role && <span className="error-text">{errors.role}</span>}
      </fieldset>
      <Field label={form.role === 'shop' ? 'Your name (shop contact)' : 'Full name'} error={errors.name}>
        <input value={form.name} onChange={set('name')} autoComplete="name" />
      </Field>
      <Field label="Email" error={errors.email}>
        <input type="email" value={form.email} onChange={set('email')} autoComplete="email" />
      </Field>
      <Field label="Phone (optional)">
        <input value={form.phone} onChange={set('phone')} autoComplete="tel" />
      </Field>
      <Field label="Password" error={errors.password} hint="At least 8 characters">
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} autoComplete="new-password" />
          <button type="button" className="btn ghost small" onClick={() => setShowPw(!showPw)}>{showPw ? 'Hide' : 'Show'}</button>
        </div>
      </Field>
      <button className="btn full" disabled={busy}>{busy ? 'Creating account…' : 'Sign up'}</button>
      <p className="muted small">Already have an account? <Link to="/login">Log in</Link></p>
    </form>
  );
}
