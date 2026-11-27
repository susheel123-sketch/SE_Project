const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { respondIfErrors } = require('../validate');

const router = express.Router();
router.use(requireAuth);

// Checks price (PKR, > 0), turnaround (whole days, 0–60, optional) and note (optional, max 500 chars).
function validateQuote(body) {
  const errors = {};
  const price = Number(body.price);
  if (body.price === undefined || body.price === '' || !Number.isFinite(price) || price <= 0) {
    errors.price = 'Price must be a number greater than 0.';
  }
  if (body.turnaround_days !== undefined && body.turnaround_days !== '' && body.turnaround_days !== null) {
    const days = Number(body.turnaround_days);
    if (!Number.isInteger(days) || days < 0 || days > 60) errors.turnaround_days = 'Turnaround must be 0 to 60 days.';
  }
  if (body.note && String(body.note).length > 500) errors.note = 'Note must be 500 characters or fewer.';
  return errors;
}

// POST /api/quotes — a shop sends one quote (repair) or offer (trade-in) on a request sent to it
// body: { "request_id": 5, "price": 4500, "turnaround_days": 3, "note": "Screen replacement" }
router.post('/', requireRole('shop'), async (req, res, next) => {
  try {
    if (respondIfErrors(res, validateQuote(req.body))) return;
    const { rows } = await db.query(
      `SELECT r.request_id, r.request_type, r.status, s.shop_id
       FROM requests r
       JOIN request_shops rs ON rs.request_id = r.request_id
       JOIN shops s ON s.shop_id = rs.shop_id
       WHERE r.request_id = $1 AND s.user_id = $2`,
      [Number(req.body.request_id) || 0, req.user.id],
    );
    const r = rows[0];
    if (!r) return res.status(404).json({ error: 'Request not found.' });
    if (r.status !== 'open') {
      return res.status(409).json({ error: 'This request is no longer open for quotes.' });
    }
    const type = r.request_type === 'trade_in' ? 'offer' : 'quote';
    const days = req.body.turnaround_days === undefined || req.body.turnaround_days === '' ? null : Number(req.body.turnaround_days);
    const { rows: created } = await db.query(
      `INSERT INTO quote_offers (request_id, shop_id, type, price, turnaround_days, note)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [r.request_id, r.shop_id, type, Number(req.body.price), days, req.body.note?.trim() || null],
    );
    return res.status(201).json({ quote: created[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'You have already sent a quote for this request. Edit it instead.' });
    return next(err);
  }
});
// Loads a quote that belongs to the logged-in shop, with its request's status. Sends 404 and returns null if not found.
async function loadOwnQuote(req, res) {
  const { rows } = await db.query(
    `SELECT q.*, r.status AS request_status
     FROM quote_offers q
     JOIN shops s ON s.shop_id = q.shop_id
     JOIN requests r ON r.request_id = q.request_id
     WHERE q.quote_id = $1 AND s.user_id = $2`,
    [req.params.id, req.user.id],
  );
  if (!rows[0]) {
    res.status(404).json({ error: 'Quote not found.' });
    return null;
  }
  return rows[0];
}

// A quote can be changed only while it is pending and the owner has not accepted any quote yet.
function canChange(q, res) {
  if (q.status !== 'pending' || q.request_status !== 'open') {
    res.status(409).json({ error: 'This quote can no longer be changed.' });
    return false;
  }
  return true;
}

// PUT /api/quotes/:id — the shop edits its own pending quote   body: { "price": 4000, "turnaround_days": 2, "note": "..." }
router.put('/:id(\\d+)', requireRole('shop'), async (req, res, next) => {
  try {
    const q = await loadOwnQuote(req, res);
    if (!q || !canChange(q, res)) return;
    if (respondIfErrors(res, validateQuote(req.body))) return;
    const days = req.body.turnaround_days === undefined || req.body.turnaround_days === '' ? null : Number(req.body.turnaround_days);
    const { rows } = await db.query(
      'UPDATE quote_offers SET price = $2, turnaround_days = $3, note = $4 WHERE quote_id = $1 RETURNING *',
      [q.quote_id, Number(req.body.price), days, req.body.note?.trim() || null],
    );
    return res.json({ quote: rows[0] });
  } catch (err) { return next(err); }
});

// PATCH /api/quotes/:id/withdraw — the shop withdraws its own pending quote
router.patch('/:id(\\d+)/withdraw', requireRole('shop'), async (req, res, next) => {
  try {
    const q = await loadOwnQuote(req, res);
    if (!q || !canChange(q, res)) return;
    const { rows } = await db.query(
      "UPDATE quote_offers SET status = 'withdrawn' WHERE quote_id = $1 RETURNING *", [q.quote_id]);
    return res.json({ quote: rows[0] });
  } catch (err) { return next(err); }
});
// GET /api/quotes?request_id=5 — the request's owner sees every quote that is not withdrawn (cheapest first);
// a shop sees only its own quote on that request.
router.get('/', requireRole('owner', 'shop'), async (req, res, next) => {
  try {
    const requestId = Number(req.query.request_id) || 0;
    if (req.user.role === 'owner') {
      const own = await db.query('SELECT 1 FROM requests WHERE request_id = $1 AND owner_id = $2', [requestId, req.user.id]);
      if (!own.rows[0]) return res.status(404).json({ error: 'Request not found.' });
      const { rows } = await db.query(
        `SELECT q.*, s.shop_name, s.address
         FROM quote_offers q JOIN shops s ON s.shop_id = q.shop_id
         WHERE q.request_id = $1 AND q.status <> 'withdrawn'
         ORDER BY q.price ASC, q.created_at ASC`,
        [requestId],
      );
      return res.json({ quotes: rows });
    }
    const { rows } = await db.query(
      `SELECT q.* FROM quote_offers q JOIN shops s ON s.shop_id = q.shop_id
       WHERE q.request_id = $1 AND s.user_id = $2`,
      [requestId, req.user.id],
    );
    return res.json({ quotes: rows });
  } catch (err) { return next(err); }
});
module.exports = router;