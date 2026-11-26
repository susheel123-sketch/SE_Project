// Automated API tests for the Sprint 1 stories.
// Run against a THROWAWAY database:  DATABASE_URL=postgresql://... JWT_SECRET=test npm test
// Test IDs (TC-xx) match the Test Plan document.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../src/db');
const migrate = require('../src/migrate');
const app = require('../src/app');

// Tiny valid images (1x1 px) built in memory.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const BIG = Buffer.alloc(5 * 1024 * 1024 + 10, 1);

const api = () => request(app);
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const sha256 = (t) => crypto.createHash('sha256').update(t).digest('hex');
let ownerToken; let owner2Token; let shopToken; let shop2Token; let adminToken;

async function signup(name, email, role, password = 'password123') {
  const res = await api().post('/api/auth/signup').send({ name, email, password, role });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.token;
}
const shopBody = (over = {}) => ({ shop_name: 'Test Shop', address: 'Saddar, Karachi', latitude: 24.86, longitude: 67.01, opening_hours: '10-8', phone: '0300', ...over });
const svcBody = (over = {}) => ({ service_name: 'Screen', device_category: 'Phone', starting_price: 4500, turnaround_days: 1, ...over });

function newRequest(token, fields = {}, photos = [PNG]) {
  const r = api().post('/api/requests').set(auth(token));
  const body = { device_type: 'Phone', brand_model: 'Samsung A52', description: 'Cracked screen', ...fields };
  for (const [k, v] of Object.entries(body)) r.field(k, v);
  photos.forEach((p, i) => r.attach('photos', p.buf || p, { filename: p.name || `p${i}.png`, contentType: p.type || 'image/png' }));
  return r;
}

before(async () => {
  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate();
  ownerToken = await signup('Owner One', 'owner1@test.com', 'owner');
  owner2Token = await signup('Owner Two', 'owner2@test.com', 'owner');
  shopToken = await signup('Shop One', 'shop1@test.com', 'shop');
  shop2Token = await signup('Shop Two', 'shop2@test.com', 'shop');
  const hash = await bcrypt.hash('adminpass1', 10);
  await db.query("INSERT INTO users (name,email,password_hash,role) VALUES ('Admin','admin@test.com',$1,'admin')", [hash]);
  adminToken = (await api().post('/api/auth/login').send({ email: 'admin@test.com', password: 'adminpass1' })).body.token;
});
after(() => db.pool.end());

// ---------------- Story 1: Sign up / log in / roles ----------------
test('TC-01 sign up as owner returns token and role', async () => {
  const res = await api().post('/api/auth/signup').send({ name: 'Ali', email: 'ali@test.com', password: 'password123', role: 'owner' });
  assert.equal(res.status, 201);
  assert.ok(res.body.token);
  assert.equal(res.body.user.role, 'owner');
});
test('TC-02 admin cannot self-register', async () => {
  const res = await api().post('/api/auth/signup').send({ name: 'X', email: 'x@test.com', password: 'password123', role: 'admin' });
  assert.equal(res.status, 400);
  assert.ok(res.body.fields.role);
});
test('TC-03 duplicate email is rejected', async () => {
  const res = await api().post('/api/auth/signup').send({ name: 'Dup', email: 'OWNER1@test.com', password: 'password123', role: 'owner' });
  assert.equal(res.status, 409);
});
test('TC-04 password under 8 characters is rejected', async () => {
  const res = await api().post('/api/auth/signup').send({ name: 'S', email: 's@test.com', password: 'short', role: 'owner' });
  assert.equal(res.status, 400);
  assert.ok(res.body.fields.password);
});
test('TC-05 password is stored hashed, never plain', async () => {
  const { rows } = await db.query("SELECT password_hash FROM users WHERE email='owner1@test.com'");
  assert.notEqual(rows[0].password_hash, 'password123');
  assert.match(rows[0].password_hash, /^\$2[aby]\$/);
});
test('TC-06 correct login returns a token', async () => {
  const res = await api().post('/api/auth/login').send({ email: 'owner1@test.com', password: 'password123' });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
});
test('TC-07 wrong password and unknown email give the same generic error', async () => {
  const a = await api().post('/api/auth/login').send({ email: 'owner1@test.com', password: 'wrongpass1' });
  const b = await api().post('/api/auth/login').send({ email: 'nobody@test.com', password: 'wrongpass1' });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.equal(a.body.error, b.body.error);
});
test('TC-08 protected route without token returns 401', async () => {
  assert.equal((await api().get('/api/requests/mine')).status, 401);
  assert.equal((await api().get('/api/requests/mine').set(auth('garbage'))).status, 401);
});
test('TC-09 wrong role returns 403', async () => {
  assert.equal((await api().get('/api/requests/mine').set(auth(shopToken))).status, 403);
  assert.equal((await api().get('/api/admin/shops').set(auth(ownerToken))).status, 403);
});

// ---------------- Story 2: Shop profile ----------------
let shopId;
test('TC-10 shop creates its profile; it starts unverified', async () => {
  const res = await api().post('/api/shops/me').set(auth(shopToken)).send(shopBody());
  assert.equal(res.status, 201);
  assert.equal(res.body.shop.is_verified, false);
  shopId = res.body.shop.shop_id;
});
test('TC-11 missing name or location blocks saving', async () => {
  const res = await api().post('/api/shops/me').set(auth(shop2Token)).send(shopBody({ shop_name: '', latitude: '' }));
  assert.equal(res.status, 400);
  assert.ok(res.body.fields.shop_name);
  assert.ok(res.body.fields.location);
});
test('TC-12 a shop can only have one profile', async () => {
  assert.equal((await api().post('/api/shops/me').set(auth(shopToken)).send(shopBody())).status, 409);
});
test('TC-13 shop edits its profile and the change is saved', async () => {
  const res = await api().put('/api/shops/me').set(auth(shopToken)).send(shopBody({ shop_name: 'Renamed Shop' }));
  assert.equal(res.status, 200);
  assert.equal(res.body.shop.shop_name, 'Renamed Shop');
});
test('TC-14 a shop cannot edit another shop (only /me exists; owners get 403)', async () => {
  await api().post('/api/shops/me').set(auth(shop2Token)).send(shopBody({ shop_name: 'Shop Two' }));
  const mine = await api().get('/api/shops/me').set(auth(shop2Token));
  assert.equal(mine.body.shop.shop_name, 'Shop Two'); // shop 2 still sees only its own
  assert.equal((await api().put('/api/shops/me').set(auth(ownerToken)).send(shopBody())).status, 403);
});

// ---------------- Story 3: Services ----------------
let serviceId;
test('TC-15 shop adds a service', async () => {
  const res = await api().post('/api/shops/me/services').set(auth(shopToken)).send(svcBody());
  assert.equal(res.status, 201);
  serviceId = res.body.service.service_id;
});
test('TC-16 price must be positive and name is required', async () => {
  const res = await api().post('/api/shops/me/services').set(auth(shopToken)).send(svcBody({ starting_price: -5, service_name: ' ' }));
  assert.equal(res.status, 400);
  assert.ok(res.body.fields.starting_price);
  assert.ok(res.body.fields.service_name);
});
test('TC-17 shop edits its service', async () => {
  const res = await api().put(`/api/shops/me/services/${serviceId}`).set(auth(shopToken)).send(svcBody({ starting_price: 5000 }));
  assert.equal(res.status, 200);
  assert.equal(Number(res.body.service.starting_price), 5000);
});
test("TC-18 a shop cannot edit or delete another shop's service", async () => {
  assert.equal((await api().put(`/api/shops/me/services/${serviceId}`).set(auth(shop2Token)).send(svcBody())).status, 404);
  assert.equal((await api().delete(`/api/shops/me/services/${serviceId}`).set(auth(shop2Token))).status, 404);
});

// ---------------- Story 4: Admin verification ----------------
test('TC-19 unverified shop is hidden from the public', async () => {
  const list = await api().get('/api/shops');
  assert.ok(!list.body.shops.some((s) => s.shop_id === shopId));
  assert.equal((await api().get(`/api/shops/${shopId}`)).status, 404);
});
test('TC-20 admin filters shops by status', async () => {
  const res = await api().get('/api/admin/shops?status=unverified').set(auth(adminToken));
  assert.equal(res.status, 200);
  assert.ok(res.body.shops.every((s) => s.is_verified === false));
  assert.ok(res.body.shops.some((s) => s.shop_id === shopId));
});
test('TC-21 admin verifies a shop; it appears publicly with its services', async () => {
  const v = await api().patch(`/api/admin/shops/${shopId}/verify`).set(auth(adminToken)).send({ verified: true });
  assert.equal(v.status, 200);
  assert.equal(v.body.shop.is_verified, true);
  const page = await api().get(`/api/shops/${shopId}`);
  assert.equal(page.status, 200);
  assert.equal(page.body.services.length, 1);
});
test('TC-22 deleted service no longer shows to owners', async () => {
  assert.equal((await api().delete(`/api/shops/me/services/${serviceId}`).set(auth(shopToken))).status, 204);
  const page = await api().get(`/api/shops/${shopId}`);
  assert.equal(page.body.services.length, 0);
});
test('TC-23 admin unverifies a shop; it disappears again', async () => {
  await api().patch(`/api/admin/shops/${shopId}/verify`).set(auth(adminToken)).send({ verified: false });
  assert.equal((await api().get(`/api/shops/${shopId}`)).status, 404);
});
test('TC-24 only admins can verify', async () => {
  assert.equal((await api().patch(`/api/admin/shops/${shopId}/verify`).set(auth(shopToken)).send({ verified: true })).status, 403);
});

// ---------------- Story 5: Create repair request ----------------
let requestId;
test('TC-25 owner creates a repair request with a photo; saved as draft', async () => {
  const res = await newRequest(ownerToken);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.request.status, 'draft');
  assert.equal(res.body.request.photo_ids.length, 1);
  requestId = res.body.request.request_id;
});
test('TC-26 missing fields and no photo are rejected with field errors', async () => {
  const res = await newRequest(ownerToken, { device_type: '', description: '' }, []);
  assert.equal(res.status, 400);
  assert.ok(res.body.fields.device_type && res.body.fields.description && res.body.fields.photos);
});
test('TC-27 non-image files are rejected', async () => {
  const res = await newRequest(ownerToken, {}, [{ buf: Buffer.from('hello'), name: 'a.pdf', type: 'application/pdf' }]);
  assert.equal(res.status, 400);
});
test('TC-28 photos over 5 MB are rejected', async () => {
  const res = await newRequest(ownerToken, {}, [{ buf: BIG, name: 'big.png', type: 'image/png' }]);
  assert.equal(res.status, 400);
});
test('TC-29 more than 5 photos are rejected', async () => {
  const res = await newRequest(ownerToken, {}, [PNG, PNG, PNG, PNG, PNG, PNG]);
  assert.equal(res.status, 400);
});
test('TC-30 shops cannot create requests', async () => {
  assert.equal((await newRequest(shopToken)).status, 403);
});

// ---------------- Story 6: View / edit / cancel ----------------
test('TC-31 My Requests lists only my own requests', async () => {
  const mine = await api().get('/api/requests/mine').set(auth(ownerToken));
  assert.equal(mine.status, 200);
  assert.ok(mine.body.requests.some((r) => r.request_id === requestId));
  const other = await api().get('/api/requests/mine').set(auth(owner2Token));
  assert.ok(!other.body.requests.some((r) => r.request_id === requestId));
});
test("TC-32 another owner cannot view, edit, cancel or see photos of my request", async () => {
  assert.equal((await api().get(`/api/requests/${requestId}`).set(auth(owner2Token))).status, 404);
  assert.equal((await api().patch(`/api/requests/${requestId}/cancel`).set(auth(owner2Token))).status, 404);
  const mine = await api().get(`/api/requests/${requestId}`).set(auth(ownerToken));
  const photoId = mine.body.request.photo_ids[0];
  assert.equal((await api().get(`/api/photos/${photoId}`).set(auth(owner2Token))).status, 404);
  const ok = await api().get(`/api/photos/${photoId}`).set(auth(ownerToken));
  assert.equal(ok.status, 200);
  assert.equal(ok.headers['content-type'], 'image/png');
});
test('TC-33 owner edits text, adds a photo and removes the old one', async () => {
  const before = (await api().get(`/api/requests/${requestId}`).set(auth(ownerToken))).body.request.photo_ids;
  const res = await api().put(`/api/requests/${requestId}`).set(auth(ownerToken))
    .field('device_type', 'Phone').field('brand_model', 'Samsung A52 5G').field('description', 'Cracked screen, touch not working')
    .field('remove_photo_ids', String(before[0]))
    .attach('photos', PNG, { filename: 'new.png', contentType: 'image/png' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.request.brand_model, 'Samsung A52 5G');
  assert.equal(res.body.request.photo_ids.length, 1);
  assert.notEqual(res.body.request.photo_ids[0], before[0]);
});
test('TC-34 removing the last photo is blocked', async () => {
  const ids = (await api().get(`/api/requests/${requestId}`).set(auth(ownerToken))).body.request.photo_ids;
  const res = await api().put(`/api/requests/${requestId}`).set(auth(ownerToken))
    .field('device_type', 'Phone').field('brand_model', 'X').field('description', 'Y').field('remove_photo_ids', ids.join(','));
  assert.equal(res.status, 400);
});
test('TC-35 owner cancels; a cancelled request cannot be edited or cancelled again', async () => {
  const c = await api().patch(`/api/requests/${requestId}/cancel`).set(auth(ownerToken));
  assert.equal(c.status, 200);
  assert.equal(c.body.request.status, 'cancelled');
  const e = await api().put(`/api/requests/${requestId}`).set(auth(ownerToken))
    .field('device_type', 'Phone').field('brand_model', 'X').field('description', 'Y');
  assert.equal(e.status, 409);
  assert.equal((await api().patch(`/api/requests/${requestId}/cancel`).set(auth(ownerToken))).status, 409);
});

// ---------------- Setup ----------------
test('TC-36 health check reports the database is connected', async () => {
  const res = await api().get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.database, 'connected');
});

// ---------------- Added by Rohan Lohana (Sprint 1) ----------------
let fivePhotoRequestId;
test('TC-41 creating a request with exactly 5 photos is accepted', async () => {
  const res = await newRequest(ownerToken, {}, [PNG, PNG, PNG, PNG, PNG]);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.request.photo_ids.length, 5);
  fivePhotoRequestId = res.body.request.request_id;
});
test('TC-42 editing that request to add a 6th photo is rejected', async () => {
  const res = await api().put(`/api/requests/${fivePhotoRequestId}`).set(auth(ownerToken))
    .field('device_type', 'Phone').field('brand_model', 'Samsung A52').field('description', 'Cracked screen')
    .attach('photos', PNG, { filename: 'sixth.png', contentType: 'image/png' });
  assert.equal(res.status, 400);
});
// ---------------- Added by Muhammad Alam (Sprint 1) ----------------
test('TC-37 login with an empty email and password is rejected', async () => {
  const res = await api().post('/api/auth/login').send({ email: '', password: '' });
  assert.equal(res.status, 400);
});

test('TC-38 verifying a shop that does not exist returns 404', async () => {
  const res = await api().patch('/api/admin/shops/999999/verify')
    .set(auth(adminToken)).send({ verified: true });
  assert.equal(res.status, 404);
});

test('TC-39 the public page of an unverified shop returns 404', async () => {
  const token = await signup('Hidden Shop Owner', 'hidden-shop@test.com', 'shop');
  const created = await api().post('/api/shops/me').set(auth(token)).send(shopBody());
  assert.equal(created.status, 201);
  assert.equal(created.body.shop.is_verified, false);

  const res = await api().get(`/api/shops/${created.body.shop.shop_id}`);
  assert.equal(res.status, 404);
});

test('TC-40 a new shop with no profile cannot add a service', async () => {
  const token = await signup('No Profile Shop', 'no-profile@test.com', 'shop');
  const res = await api().post('/api/shops/me/services').set(auth(token)).send(svcBody());
  assert.equal(res.status, 400);
});
  
// ---------------- Added by Muhammad Alam (Sprint 2): #20 Profile ----------------
test('TC-49 view my own profile returns my details', async () => {
  const res = await api().get('/api/profile').set(auth(ownerToken));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.user.email, 'owner1@test.com');
  assert.equal(res.body.user.name, 'Owner One');
});

test('TC-50 viewing profile with no token is rejected', async () => {
  const res = await api().get('/api/profile');
  assert.equal(res.status, 401);
});

test('TC-51 editing name and phone updates the profile', async () => {
  const res = await api().put('/api/profile').set(auth(owner2Token))
    .send({ name: 'Owner Two Updated', email: 'owner2@test.com', phone: '03001234567' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.user.name, 'Owner Two Updated');
  assert.equal(res.body.user.phone, '03001234567');
});

test('TC-52 editing profile with a blank name is rejected', async () => {
  const res = await api().put('/api/profile').set(auth(owner2Token))
    .send({ name: '', email: 'owner2@test.com' });
  assert.equal(res.status, 400);
  assert.ok(res.body.fields.name);
});

test('TC-53 editing profile with an invalid email format is rejected', async () => {
  const res = await api().put('/api/profile').set(auth(owner2Token))
    .send({ name: 'Owner Two', email: 'not-an-email' });
  assert.equal(res.status, 400);
  assert.ok(res.body.fields.email);
});

test('TC-54 editing profile with an email already used by another user is rejected', async () => {
  const res = await api().put('/api/profile').set(auth(owner2Token))
    .send({ name: 'Owner Two', email: 'owner1@test.com' });
  assert.equal(res.status, 409);
});
