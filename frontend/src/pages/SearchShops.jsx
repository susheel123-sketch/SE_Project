import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Alert } from '../components';

export default function SearchShops() {
  const [search, setSearch] = useState('');
  const [deviceCategory, setDeviceCategory] = useState('');
  const [shops, setShops] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (params = {}) => {
    setLoading(true);
    setMessage('');
    try {
      const { shops: results } = await api.searchShops(params);
      setShops(results);
    } catch (err) {
      setMessage(err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = (e) => {
    e.preventDefault();
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (deviceCategory.trim()) params.device_category = deviceCategory.trim();
    load(params);
  };

  return (
    <section className="panel">
      <h1>Find a repair shop</h1>
      <form onSubmit={submit} className="grid-2" noValidate>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by shop name"
        />
        <input
          value={deviceCategory}
          onChange={(e) => setDeviceCategory(e.target.value)}
          placeholder="Device category (e.g. Phone, Laptop)"
        />
        <button className="btn" type="submit">Search</button>
      </form>
      <Alert>{message}</Alert>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : shops.length === 0 ? (
        <p className="muted">No shops match your search.</p>
      ) : (
        <div className="hero-cards">
          {shops.map((s) => (
            <div key={s.shop_id} className="card">
              <h3>{s.shop_name}</h3>
              <p>{s.address}</p>
              <p className="muted small">{s.opening_hours}{s.phone ? ` · ${s.phone}` : ''}</p>
              <Link to={`/shops/${s.shop_id}`} className="btn ghost">View shop →</Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}