const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { isBlank, required, respondIfErrors } = require('../validate');

const router = express.Router();

function validateShop(body) {
  const errors = required(body, { shop_name: 'Shop name', address: 'Address' });
  const lat = Number(body.latitude);
  const lng = Number(body.longitude);
  if (isBlank(body.latitude) || isBlank(body.longitude) || Number.isNaN(lat) || Number.isNaN(lng)) {
    errors.location = 'Pick your shop location on the map.';
  } else if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    errors.location = 'That location is not valid.';
  }
  return errors;
}

function validateService(body) {
  const errors = required(body, { service_name: 'Service name', device_category: 'Device category' });
  const price = Number(body.starting_price);
  const days = Number(body.turnaround_days);
  if (isBlank(body.starting_price) || Number.isNaN(price) || price <= 0) errors.starting_price = 'Price must be a positive number.';
  if (isBlank(body.turnaround_days) || !Number.isInteger(days) || days <= 0) errors.turnaround_days = 'Turnaround must be a whole number of days (1 or more).';
  return errors;
}

async function myShop(userId) {
  const { rows } = await db.query('SELECT * FROM shops WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

// ---------- Public: verified shops only ----------

// GET /api/shops — list verified shops (full search & filters come in Sprint 2)
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT shop_id, shop_name, address, latitude, longitude, opening_hours, phone, avg_rating
       FROM shops WHERE is_verified = TRUE ORDER BY shop_name`,
    );
    res.json({ shops: rows });
  } catch (err) { next(err); }
});

// ---------- Shop owner: my profile (/me routes must come before /:id) ----------

router.get('/me', requireAuth, requireRole('shop'), async (req, res, next) => {
  try { res.json({ shop: await myShop(req.user.id) }); } catch (err) { next(err); }
});

// POST /api/shops/me — create my profile (one per shop account)
router.post('/me', requireAuth, requireRole('shop'), async (req, res, next) => {
  try {
    if (respondIfErrors(res, validateShop(req.body))) return;
    if (await myShop(req.user.id)) return res.status(409).json({ error: 'You already have a shop profile. Edit it instead.' });
    const b = req.body;
    const { rows } = await db.query(
      `INSERT INTO shops (user_id, shop_name, address, latitude, longitude, opening_hours, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, b.shop_name.trim(), b.address.trim(), Number(b.latitude), Number(b.longitude), b.opening_hours || null, b.phone || null],
    );
    res.status(201).json({ shop: rows[0] }); // new shops start unverified (DB default)
  } catch (err) { next(err); }
});

// PUT /api/shops/me — edit my profile (a shop can only ever edit its own)
router.put('/me', requireAuth, requireRole('shop'), async (req, res, next) => {
  try {
    if (respondIfErrors(res, validateShop(req.body))) return;
    const b = req.body;
    const { rows } = await db.query(
      `UPDATE shops SET shop_name=$2, address=$3, latitude=$4, longitude=$5, opening_hours=$6, phone=$7, updated_at=NOW()
       WHERE user_id=$1 RETURNING *`,
      [req.user.id, b.shop_name.trim(), b.address.trim(), Number(b.latitude), Number(b.longitude), b.opening_hours || null, b.phone || null],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Create your shop profile first.' });
    res.json({ shop: rows[0] });
  } catch (err) { next(err); }
});

// ---------- Shop owner: my services ----------

router.get('/me/services', requireAuth, requireRole('shop'), async (req, res, next) => {
  try {
    const shop = await myShop(req.user.id);
    if (!shop) return res.json({ services: [] });
    const { rows } = await db.query(
      'SELECT * FROM services WHERE shop_id=$1 AND is_deleted=FALSE ORDER BY created_at', [shop.shop_id]);
    res.json({ services: rows });
  } catch (err) { next(err); }
});

router.post('/me/services', requireAuth, requireRole('shop'), async (req, res, next) => {
  try {
    const shop = await myShop(req.user.id);
    if (!shop) return res.status(400).json({ error: 'Create your shop profile before adding services.' });
    if (respondIfErrors(res, validateService(req.body))) return;
    const b = req.body;
    const { rows } = await db.query(
      `INSERT INTO services (shop_id, service_name, device_category, starting_price, turnaround_days)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [shop.shop_id, b.service_name.trim(), b.device_category.trim(), Number(b.starting_price), Number(b.turnaround_days)],
    );
    res.status(201).json({ service: rows[0] });
  } catch (err) { next(err); }
});

router.put('/me/services/:serviceId', requireAuth, requireRole('shop'), async (req, res, next) => {
  try {
    if (respondIfErrors(res, validateService(req.body))) return;
    const b = req.body;
    const { rows } = await db.query(
      `UPDATE services s SET service_name=$3, device_category=$4, starting_price=$5, turnaround_days=$6
       FROM shops sh
       WHERE s.service_id=$1 AND s.shop_id=sh.shop_id AND sh.user_id=$2 AND s.is_deleted=FALSE
       RETURNING s.*`,
      [req.params.serviceId, req.user.id, b.service_name.trim(), b.device_category.trim(), Number(b.starting_price), Number(b.turnaround_days)],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Service not found.' });
    res.json({ service: rows[0] });
  } catch (err) { next(err); }
});

// Soft delete: the row stays for history, but owners no longer see it.
router.delete('/me/services/:serviceId', requireAuth, requireRole('shop'), async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      `UPDATE services s SET is_deleted=TRUE FROM shops sh
       WHERE s.service_id=$1 AND s.shop_id=sh.shop_id AND sh.user_id=$2 AND s.is_deleted=FALSE`,
      [req.params.serviceId, req.user.id],
    );
    if (!rowCount) return res.status(404).json({ error: 'Service not found.' });
    res.status(204).end();
  } catch (err) { next(err); }
});

// ---------- Public shop page ----------

// GET /api/shops/:id — a verified shop's public page with its services
router.get('/:id(\\d+)', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT shop_id, shop_name, address, latitude, longitude, opening_hours, phone, avg_rating, is_verified
       FROM shops WHERE shop_id=$1`, [req.params.id]);
    const shop = rows[0];
    if (!shop || !shop.is_verified) return res.status(404).json({ error: 'Shop not found.' });
    const services = await db.query(
      `SELECT service_id, service_name, device_category, starting_price, turnaround_days
       FROM services WHERE shop_id=$1 AND is_deleted=FALSE ORDER BY service_name`, [shop.shop_id]);
    res.json({ shop, services: services.rows });
  } catch (err) { next(err); }
});

module.exports = router;
