import { useEffect, useState } from 'react';
import { api } from '../api';
import { Alert, AuthImage, StatusBadge } from '../components';

// Shop sees the repair / trade-in requests that owners have sent to it.
export default function ShopInbox() {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.incomingRequests().then((d) => setRequests(d.requests)).catch((e) => setError(e.message));
  }, []);

  return (
    <section>
      <h1>Incoming Requests</h1>
      <p className="muted">Requests that device owners have sent to your shop.</p>
      <Alert>{error}</Alert>
      {requests === null && !error && <p className="muted">Loading…</p>}
      {requests?.length === 0 && <div className="empty"><p>No requests yet. Owners can only send requests to verified shops.</p></div>}
      <div className="list">
        {requests?.map((r) => (
          <article key={r.request_id} className="card request-card">
            <div className="thumbs">
              {r.photo_ids.slice(0, 3).map((id) => <AuthImage key={id} photoId={id} alt={`Photo of ${r.brand_model}`} />)}
              {r.photo_ids.length > 3 && <div className="thumb-more">+{r.photo_ids.length - 3}</div>}
            </div>
            <div className="request-body">
              <div className="row-between">
                <h3>{r.brand_model}</h3>
                <StatusBadge status={r.status} />
              </div>
              <p className="muted small">
                {r.request_type === 'repair' ? 'Repair' : 'Trade-in'} · {r.device_type}{r.condition ? ` · ${r.condition}` : ''} · from {r.owner_name} · received {new Date(r.sent_at).toLocaleDateString()}
              </p>
              <p className="desc">{r.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}