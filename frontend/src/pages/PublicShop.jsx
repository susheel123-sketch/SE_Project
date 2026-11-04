import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Alert, MapView, pkr } from '../components';

export default function PublicShop() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.publicShop(id).then(setData).catch((e) => setError(e.message)); }, [id]);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <p className="muted">Loading…</p>;
  const { shop, services } = data;

  return (
    <section className="panel">
      <div className="page-head">
        <h1>{shop.shop_name}</h1>
        <span className="badge badge-verified">✓ Verified</span>
      </div>
      <p>{shop.address}</p>
      <p className="muted small">{shop.opening_hours}{shop.phone ? ` · ${shop.phone}` : ''}</p>
      <MapView lat={shop.latitude} lng={shop.longitude} />
      <h2>Services</h2>
      {services.length === 0 ? <p className="muted">This shop has not listed any services yet.</p> : (
        <table className="table">
          <thead><tr><th>Service</th><th>Category</th><th>From</th><th>Turnaround</th></tr></thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.service_id}><td>{s.service_name}</td><td>{s.device_category}</td><td>{pkr(s.starting_price)}</td><td>{s.turnaround_days} day{s.turnaround_days > 1 ? 's' : ''}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
