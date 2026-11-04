// Demo data: 1 admin, 3 shops (2 verified, 1 unverified) with services, and 1 device owner.
// Safe to run more than once: existing demo accounts are skipped.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');
const migrate = require('./migrate');

const PASSWORD = process.env.SEED_PASSWORD || 'Revive@2026';

const shops = [
  {
    user: { name: 'Fixit Mobile Lab', email: 'fixit@revive.demo' },
    shop: { shop_name: 'Fixit Mobile Lab', address: 'Shop 12, Saddar Electronics Market, Karachi', latitude: 24.8556, longitude: 67.0222, opening_hours: 'Mon–Sat 11am–9pm', phone: '0300-1112233', is_verified: true },
    services: [['Screen replacement', 'Phone', 4500, 1], ['Battery replacement', 'Phone', 2500, 1], ['Charging port repair', 'Phone', 1500, 2]],
  },
  {
    user: { name: 'Gulshan Laptop Care', email: 'laptopcare@revive.demo' },
    shop: { shop_name: 'Gulshan Laptop Care', address: 'Block 13-D, Gulshan-e-Iqbal, Karachi', latitude: 24.9180, longitude: 67.0971, opening_hours: 'Mon–Fri 10am–8pm', phone: '0321-4445566', is_verified: true },
    services: [['Keyboard replacement', 'Laptop', 6000, 2], ['Motherboard diagnosis', 'Laptop', 2000, 3], ['SSD upgrade', 'Laptop', 3000, 1]],
  },
  {
    user: { name: 'Clifton Gadget Clinic', email: 'gadgetclinic@revive.demo' },
    shop: { shop_name: 'Clifton Gadget Clinic', address: 'Block 5, Clifton, Karachi', latitude: 24.8138, longitude: 67.0300, opening_hours: 'Daily 12pm–10pm', phone: '0333-7778899', is_verified: false },
    services: [['Tablet screen repair', 'Tablet', 5500, 2]],
  },
];

async function ensureUser(name, email, role, hash) {
  const found = await db.query('SELECT user_id FROM users WHERE email=$1', [email]);
  if (found.rowCount) return { id: found.rows[0].user_id, created: false };
  const { rows } = await db.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING user_id', [name, email, hash, role]);
  return { id: rows[0].user_id, created: true };
}

async function seed() {
  await migrate();
  const hash = await bcrypt.hash(PASSWORD, 10);

  await ensureUser('Revive Admin', 'admin@revive.demo', 'admin', hash);
  await ensureUser('Demo Owner', 'owner@revive.demo', 'owner', hash);

  for (const s of shops) {
    const u = await ensureUser(s.user.name, s.user.email, 'shop', hash);
    if (!u.created) continue;
    const sh = s.shop;
    const { rows } = await db.query(
      `INSERT INTO shops (user_id, shop_name, address, latitude, longitude, opening_hours, phone, is_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING shop_id`,
      [u.id, sh.shop_name, sh.address, sh.latitude, sh.longitude, sh.opening_hours, sh.phone, sh.is_verified]);
    for (const [name, cat, price, days] of s.services) {
      await db.query(
        'INSERT INTO services (shop_id, service_name, device_category, starting_price, turnaround_days) VALUES ($1,$2,$3,$4,$5)',
        [rows[0].shop_id, name, cat, price, days]);
    }
  }
  console.log(`Demo data ready. All demo accounts use the password: ${PASSWORD}`);
  console.log('  admin@revive.demo | owner@revive.demo | fixit@revive.demo | laptopcare@revive.demo | gadgetclinic@revive.demo');
}

seed()
  .then(() => db.pool.end())
  .catch((err) => { console.error('Seeding failed:', err.message); process.exit(1); });
