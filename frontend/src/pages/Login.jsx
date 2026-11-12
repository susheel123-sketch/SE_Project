import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { homeFor, useAuth } from '../auth';
import { Alert, Field } from '../components';

export default function Login() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api.login(form);
      signIn(data);
      navigate(homeFor(data.user.role));
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  };

  return (
    <form className="panel narrow" onSubmit={submit} noValidate>
      <h1>Log in</h1>
      <Alert>{error}</Alert>
      <Field label="Email">
        <input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </Field>
      <Field label="Password">
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <input type={showPw ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <button type="button" className="btn ghost small" onClick={() => setShowPw(!showPw)}>{showPw ? 'Hide' : 'Show'}</button>
        </div>
      </Field>
      <button className="btn full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      <p className="muted small">New to Revive? <Link to="/signup">Create an account</Link></p>
    </form>
  );
}
