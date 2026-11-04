import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Alert, Field, MapPicker } from '../components';

const EMPTY = { shop_name: '', address: '', latitude: '', longitude: '', opening_hours: '', phone: '' };

export default function ShopProfile() {
  const [shop, setShop] = useState(undefined); // undefined = loading, null = no profile yet
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.myShop().then(({ shop: s }) => {
      setShop(s);
      if (s) setForm({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, s[k] ?? ''])) });
    }).catch((e) => setMessage(e.message));
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage('');
    setSaved('');
    try {
      const { shop: s } = shop ? await api.updateShop(form) : await api.createShop(form);
      setShop(s);
      setSaved(shop ? 'Changes saved.' : 'Shop profile created. An admin will verify it before owners can see it.');
    } catch (err) {
      setErrors(err.fields);
      setMessage(err.message);
    } finally { setBusy(false); }
  };

  if (shop === undefined && !message) return <p className="muted">Loading…</p>;

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <div className="page-head">
        <h1>{shop ? 'Shop profile' : 'Set up your shop'}</h1>
        {shop && (
          <span className={`badge ${shop.is_verified ? 'badge-verified' : 'badge-unverified'}`}>
            {shop.is_verified ? '✓ Verified' : 'Waiting for verification'}
          </span>
        )}
      </div>
      {!shop && <p className="muted">Owners will find you by this information. New shops are checked by an admin before they appear in search.</p>}
      <Alert>{message}</Alert>
      <Alert kind="success">{saved}</Alert>
      <div className="grid-2">
        <Field label="Shop name" error={errors.shop_name}><input value={form.shop_name} onChange={set('shop_name')} /></Field>
        <Field label="Phone"><input value={form.phone} onChange={set('phone')} /></Field>
      </div>
      <Field label="Address" error={errors.address}><input value={form.address} onChange={set('address')} placeholder="Shop no., market, area, city" /></Field>
      <Field label="Opening hours"><input value={form.opening_hours} onChange={set('opening_hours')} placeholder="e.g. Mon–Sat 11am–9pm" /></Field>
      <Field label="Location on map" error={errors.location} hint="Click on the map to place your shop's pin">
        <MapPicker lat={form.latitude} lng={form.longitude} onPick={(lat, lng) => setForm({ ...form, latitude: lat.toFixed(6), longitude: lng.toFixed(6) })} />
      </Field>
      {form.latitude && <p className="muted small">Pin: {form.latitude}, {form.longitude}</p>}
      <div className="actions">
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : shop ? 'Save changes' : 'Create shop profile'}</button>
        {shop && <Link to="/shop/services" className="btn ghost">Manage services →</Link>}
        {shop?.is_verified && <Link to={`/shops/${shop.shop_id}`} className="btn ghost">View public page</Link>}
      </div>
    </form>
  );
}
