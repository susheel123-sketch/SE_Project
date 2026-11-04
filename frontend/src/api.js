// One place for every call to the backend.
const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export const getToken = () => localStorage.getItem('revive_token');
export const setToken = (t) => (t ? localStorage.setItem('revive_token', t) : localStorage.removeItem('revive_token'));

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

async function call(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form; // FormData: the browser sets the multipart header itself
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) { setToken(null); window.dispatchEvent(new Event('revive:logout')); }
    throw new ApiError(data.error || 'Something went wrong.', res.status, data.fields);
  }
  return data;
}

// Photos need the login token, so they are fetched as blobs and shown via object URLs.
export async function photoUrl(photoId) {
  const res = await fetch(`${BASE}/api/photos/${photoId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error('photo');
  return URL.createObjectURL(await res.blob());
}

export const api = {
  signup: (b) => call('/api/auth/signup', { method: 'POST', body: b }),
  login: (b) => call('/api/auth/login', { method: 'POST', body: b }),
  me: () => call('/api/auth/me'),

  myShop: () => call('/api/shops/me'),
  createShop: (b) => call('/api/shops/me', { method: 'POST', body: b }),
  updateShop: (b) => call('/api/shops/me', { method: 'PUT', body: b }),
  myServices: () => call('/api/shops/me/services'),
  addService: (b) => call('/api/shops/me/services', { method: 'POST', body: b }),
  updateService: (id, b) => call(`/api/shops/me/services/${id}`, { method: 'PUT', body: b }),
  deleteService: (id) => call(`/api/shops/me/services/${id}`, { method: 'DELETE' }),
  publicShop: (id) => call(`/api/shops/${id}`),

  adminShops: (status) => call(`/api/admin/shops?status=${status}`),
  verifyShop: (id, verified) => call(`/api/admin/shops/${id}/verify`, { method: 'PATCH', body: { verified } }),

  myRequests: () => call('/api/requests/mine'),
  getRequest: (id) => call(`/api/requests/${id}`),
  createRequest: (form) => call('/api/requests', { method: 'POST', form }),
  updateRequest: (id, form) => call(`/api/requests/${id}`, { method: 'PUT', form }),
  cancelRequest: (id) => call(`/api/requests/${id}/cancel`, { method: 'PATCH' }),
};
