import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import { homeFor, useAuth } from '../auth';
import { Alert, Field } from '../components';

export default function ResetPassword() {
  const { user } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ token: location.state?.token || '', newPassword: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (!form.token.trim()) local.token = 'Enter your reset token.';
    if (form.newPassword.length < 8) local.newPassword = 'Password must be at least 8 characters.';
    if (Object.keys(local).length) { setErrors(local); setMessage('Please fix the highlighted fields.'); return; }
    setBusy(true);
    setErrors({});
    setMessage('');
    try {
      const data = await api.resetPassword({ token: form.token.trim(), newPassword: form.newPassword });
      setMessage(data.message);
      setDone(true);
    } catch (err) {
      setMessage(err.message);
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="panel narrow">
        <h1>Password changed</h1>
        <Alert kind="success">{message}</Alert>
        <Link to="/login" className="btn full">Go to Log in</Link>
      </div>
    );
  }

  return (
    <form className="panel narrow" onSubmit={submit} noValidate>
      <h1>Set a new password</h1>
      <Alert>{message}</Alert>
      <Field label="Reset token" error={errors.token}>
        <input value={form.token} onChange={set('token')} autoComplete="off" />
      </Field>
      <Field label="New password" error={errors.newPassword} hint="At least 8 characters">
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <input type={showPw ? 'text' : 'password'} value={form.newPassword} onChange={set('newPassword')} autoComplete="new-password" />
          <button type="button" className="btn ghost small" onClick={() => setShowPw(!showPw)}>{showPw ? 'Hide' : 'Show'}</button>
        </div>
      </Field>
      <button className="btn full" disabled={busy}>{busy ? 'Saving…' : 'Set new password'}</button>
      <p className="muted small"><Link to="/login">Back to Log in</Link></p>
    </form>
  );
}