import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Alert } from '../components';

const MAX = 3;

// Owner picks up to 3 verified shops and sends a draft request to them.
export default function SendRequest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [shops, setShops] = useState(null);
  const [picked, setPicked] = useState([]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Promise.all([api.getRequest(id), api.verifiedShops()])
      .then(([r, s]) => { setRequest(r.request); setShops(s.shops); })
      .catch((e) => setError(e.message));
  }, [id]);

  const toggle = (shopId) => {
    setError('');
    if (picked.includes(shopId)) setPicked(picked.filter((x) => x !== shopId));
    else if (picked.length < MAX) setPicked([...picked, shopId]);
    else setError(`You can choose at most ${MAX} shops.`);
  };

  const send = async () => {
    setSending(true);
    setError('');
    try {
      await api.sendRequest(id, picked);
      navigate('/requests', { state: { notice: `Request sent to ${picked.length} shop${picked.length === 1 ? '' : 's'}.` } });
    } catch (e) { setError(e.message); setSending(false); }
  };

  if (error && !request) return <section><Alert>{error}</Alert><Link to="/requests">Back to My Requests</Link></section>;
  if (!request || !shops) return <p className="muted">Loading…</p>;
  if (request.status !== 'draft') {
    return <section><p className="muted">This request has already been sent to shops.</p><Link to="/requests">Back to My Requests</Link></section>;
  }

  return (
    <section>
      <h1>Send to shops</h1>
      <p className="muted">{request.brand_model} · choose up to {MAX} verified shops ({picked.length}/{MAX} chosen)</p>
      <Alert>{error}</Alert>
      {shops.length === 0 && <p className="muted">No verified shops yet. Please try again later.</p>}
      <div className="list">
        {shops.map((s) => (
          <label key={s.shop_id} className="card row-between" style={{ cursor: 'pointer' }}>
            <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={picked.includes(s.shop_id)} onChange={() => toggle(s.shop_id)} />
              <span>
                <strong>{s.shop_name}</strong>
                <div className="muted small">{s.address}{s.opening_hours ? ` · ${s.opening_hours}` : ''}</div>
              </span>
            </span>
            <Link to={`/shops/${s.shop_id}`} target="_blank" className="small">View shop</Link>
          </label>
        ))}
      </div>
      <div className="actions">
        <button type="button" className="btn" disabled={picked.length === 0 || sending} onClick={send}>
          {sending ? 'Sending…' : `Send to ${picked.length || ''} shop${picked.length === 1 ? '' : 's'}`}
        </button>
        <Link to="/requests" className="btn ghost">Cancel</Link>
      </div>
    </section>
  );
}