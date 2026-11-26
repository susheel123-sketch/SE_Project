import { useEffect, useState } from 'react';
import { api } from '../api';
import { Alert, Field } from '../components';

const EMPTY = { name: '', email: '', phone: '' };

export default function Profile() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.myProfile().then(({ user }) => {
      setForm({ name: user.name, email: user.email, phone: user.phone || '' });
      setLoading(false);
    }).catch((e) => { setMessage(e.message); setLoading(false); });
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage('');
    setSaved('');
    try {
      const { user } = await api.updateProfile(form);
      setForm({ name: user.name, email: user.email, phone: user.phone || '' });
      setSaved('Profile updated.');
    } catch (err) {
      setErrors(err.fields || {});
      setMessage(err.message);
    } finally { setBusy(false); }
  };

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <div className="page-head">
        <h1>My profile</h1>
      </div>
      <Alert>{message}</Alert>
      <Alert kind="success">{saved}</Alert>
      <Field label="Name" error={errors.name}><input value={form.name} onChange={set('name')} /></Field>
      <Field label="Email" error={errors.email}><input value={form.email} onChange={set('email')} /></Field>
      <Field label="Phone"><input value={form.phone} onChange={set('phone')} /></Field>
      <div className="actions">
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
    </form>
  );
}