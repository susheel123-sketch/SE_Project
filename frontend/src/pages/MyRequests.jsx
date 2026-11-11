import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Alert, AuthImage, StatusBadge } from '../components';

const EDITABLE = ['draft', 'open'];

export default function MyRequests() {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => api.myRequests().then((d) => setRequests(d.requests)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const cancel = async (r) => {
    if (!window.confirm(`Cancel your request for ${r.brand_model}? Shops will no longer be able to quote on it.`)) return;
    setError('');
    try {
      await api.cancelRequest(r.request_id);
      setNotice('Request cancelled.');
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <section>
      <div className="page-head">
        <h1>My Requests</h1>
        <Link to="/requests/new" className="btn">+ New repair request</Link>
      </div>
      <Alert>{error}</Alert>
      <Alert kind="success">{notice}</Alert>
      {requests === null && !error && <p className="muted">Loading…</p>}
      {requests?.length === 0 && (
        <div className="empty">
          <p>You have no requests yet.</p>
          <Link to="/requests/new" className="btn">Create your first repair request</Link>
        </div>
      )}
      <div className="list">
        {requests?.map((r) => (
          <article key={r.request_id} className="card request-card">
            <div className="thumbs">
              {r.photo_ids.slice(0, 3).map((id) => <AuthImage key={id} photoId={id} alt={`Photo of ${r.brand_model}`} />)}
            </div>
            <div className="request-body">
              <div className="row-between">
                <h3>{r.brand_model}</h3>
                <StatusBadge status={r.status} />
              </div>
              <p className="muted small">
                  {r.request_type === 'repair' ? 'Repair' : 'Trade-in'} · {r.device_type} · {r.photo_ids.length} photo{r.photo_ids.length === 1 ? '' : 's'} · created {new Date(r.created_at).toLocaleDateString()}              </p>
              <p className="desc">{r.description}</p>
              {EDITABLE.includes(r.status) && (
                <div className="actions">
                  <Link to={`/requests/${r.request_id}/edit`} className="btn ghost small">Edit</Link>
                  <button type="button" className="btn danger small" onClick={() => cancel(r)}>Cancel request</button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
