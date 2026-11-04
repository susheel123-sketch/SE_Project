import { useEffect, useState } from 'react';
import { api } from '../api';
import { Alert } from '../components';

const TABS = [['unverified', 'Waiting for verification'], ['verified', 'Verified'], ['all', 'All shops']];

export default function AdminShops() {
  const [status, setStatus] = useState('unverified');
  const [shops, setShops] = useState(null);
  const [error, setError] = useState('');

  const load = (s = status) => { setShops(null); api.adminShops(s).then((d) => setShops(d.shops)).catch((e) => setError(e.message)); };
  useEffect(() => { load(status); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (shop) => {
    setError('');
    try {
      const { shop: updated } = await api.verifyShop(shop.shop_id, !shop.is_verified);
      setShops(shops.map((s) => (s.shop_id === updated.shop_id ? { ...s, is_verified: updated.is_verified } : s)));
    } catch (e) { setError(e.message); }
  };

  return (
    <section>
      <h1>Verify shops</h1>
      <p className="muted">Only verified shops are shown to device owners.</p>
      <div className="tabs" role="tablist">
        {TABS.map(([v, label]) => (
          <button key={v} type="button" role="tab" aria-selected={status === v} className={status === v ? 'tab active' : 'tab'} onClick={() => setStatus(v)}>{label}</button>
        ))}
      </div>
      <Alert>{error}</Alert>
      {shops === null && !error && <p className="muted">Loading…</p>}
      {shops?.length === 0 && <p className="muted">No shops here.</p>}
      {shops?.length > 0 && (
        <table className="table">
          <thead><tr><th>Shop</th><th>Contact</th><th>Services</th><th>Status</th><th /></tr></thead>
          <tbody>
            {shops.map((s) => (
              <tr key={s.shop_id}>
                <td><strong>{s.shop_name}</strong><div className="muted small">{s.address}</div></td>
                <td>{s.owner_name}<div className="muted small">{s.owner_email}{s.phone ? ` · ${s.phone}` : ''}</div></td>
                <td>{s.service_count}</td>
                <td><span className={`badge ${s.is_verified ? 'badge-verified' : 'badge-unverified'}`}>{s.is_verified ? 'Verified' : 'Unverified'}</span></td>
                <td className="right">
                  <button type="button" className={s.is_verified ? 'btn ghost small' : 'btn small'} onClick={() => toggle(s)}>
                    {s.is_verified ? 'Unverify' : 'Verify'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
