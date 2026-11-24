import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { homeFor, useAuth } from '../auth';
import { Alert, Field } from '../components';

export default function ForgotPassword() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { message, demoToken? }
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setBusy(true);
    try {
      setResult(await api.forgotPassword({ email }));
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  };

  return (
    <form className="panel narrow" onSubmit={submit} noValidate>
      <h1>Forgot your password?</h1>
      <p className="muted">Enter your account email and we will create a reset token.</p>
      <Alert>{error}</Alert>
      <Field label="Email">
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <button className="btn full" disabled={busy}>{busy ? 'Please wait…' : 'Get reset token'}</button>

      {result && (
        <>
          <Alert kind="success">{result.message}</Alert>
          {/* DEMO ONLY: no emails are sent, so the token is shown on screen. */}
          {result.demoToken && (
            <div className="panel" style={{ marginTop: '1rem' }}>
              <p className="small muted">Demo only: your reset token (valid for 30 minutes)</p>
              <code style={{ wordBreak: 'break-all' }}>{result.demoToken}</code>
              <button
                type="button"
                className="btn full"
                style={{ marginTop: '1rem' }}
                onClick={() => navigate('/reset-password', { state: { token: result.demoToken } })}
              >
                Continue to set a new password
              </button>
            </div>
          )}
        </>
      )}

      <p className="muted small"><Link to="/login">Back to Log in</Link></p>
    </form>
  );
}