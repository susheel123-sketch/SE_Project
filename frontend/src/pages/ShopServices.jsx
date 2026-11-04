import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Alert, Field, pkr } from '../components';

const EMPTY = { service_name: '', device_category: 'Phone', starting_price: '', turnaround_days: '' };
const CATEGORIES = ['Phone', 'Laptop', 'Tablet', 'Desktop', 'Smartwatch', 'Other'];

export default function ShopServices() {
  const [hasShop, setHasShop] = useState(null);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  const load = () => api.myServices().then((d) => setServices(d.services)).catch((e) => setMessage(e.message));
  useEffect(() => {
    api.myShop().then(({ shop }) => { setHasShop(Boolean(shop)); if (shop) load(); }).catch((e) => setMessage(e.message));
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const reset = () => { setForm(EMPTY); setEditingId(null); setErrors({}); };

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      if (editingId) await api.updateService(editingId, form);
      else await api.addService(form);
      reset();
      load();
    } catch (err) { setErrors(err.fields); setMessage(err.message); }
  };

  const edit = (s) => {
    setEditingId(s.service_id);
    setErrors({});
    setForm({ service_name: s.service_name, device_category: s.device_category, starting_price: String(Number(s.starting_price)), turnaround_days: String(s.turnaround_days) });
  };

  const remove = async (s) => {
    if (!window.confirm(`Remove "${s.service_name}"? Owners will no longer see it.`)) return;
    try { await api.deleteService(s.service_id); if (editingId === s.service_id) reset(); load(); } catch (err) { setMessage(err.message); }
  };

  if (hasShop === null && !message) return <p className="muted">Loading…</p>;
  if (hasShop === false) {
    return <div className="empty"><p>Create your shop profile before adding services.</p><Link to="/shop/profile" className="btn">Set up shop profile</Link></div>;
  }

  return (
    <section>
      <h1>My services</h1>
      <p className="muted">List what you repair and your starting price. Owners see this on your shop page.</p>
      <Alert>{message}</Alert>
      <form className="panel service-form" onSubmit={submit} noValidate>
        <h2>{editingId ? 'Edit service' : 'Add a service'}</h2>
        <div className="grid-4">
          <Field label="Service name" error={errors.service_name}><input value={form.service_name} onChange={set('service_name')} placeholder="e.g. Screen replacement" /></Field>
          <Field label="Device category" error={errors.device_category}>
            <select value={form.device_category} onChange={set('device_category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
          <Field label="Starting price (Rs)" error={errors.starting_price}><input type="number" min="1" value={form.starting_price} onChange={set('starting_price')} /></Field>
          <Field label="Turnaround (days)" error={errors.turnaround_days}><input type="number" min="1" step="1" value={form.turnaround_days} onChange={set('turnaround_days')} /></Field>
        </div>
        <div className="actions">
          <button className="btn">{editingId ? 'Save service' : 'Add service'}</button>
          {editingId && <button type="button" className="btn ghost" onClick={reset}>Cancel edit</button>}
        </div>
      </form>

      {services.length === 0 ? <p className="muted">No services yet. Add your first one above.</p> : (
        <table className="table">
          <thead><tr><th>Service</th><th>Category</th><th>Starting price</th><th>Turnaround</th><th /></tr></thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.service_id}>
                <td>{s.service_name}</td>
                <td>{s.device_category}</td>
                <td>{pkr(s.starting_price)}</td>
                <td>{s.turnaround_days} day{s.turnaround_days > 1 ? 's' : ''}</td>
                <td className="right">
                  <button type="button" className="btn ghost small" onClick={() => edit(s)}>Edit</button>{' '}
                  <button type="button" className="btn danger small" onClick={() => remove(s)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
