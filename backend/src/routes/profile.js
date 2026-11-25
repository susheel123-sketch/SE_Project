const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { EMAIL_RE, required, respondIfErrors } = require('../validate');

const router = express.Router();

const publicUser = (u) => ({ id: u.user_id, name: u.name, email: u.email, phone: u.phone, role: u.role });

// GET /api/profile — view my own profile
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE user_id = $1', [req.user.id]);
    if (!rows[0]) return res.status(401).json({ error: 'Please log in.' });
    return res.json({ user: publicUser(rows[0]) });
  } catch (err) { return next(err); }
});

// PUT /api/profile — edit my name, email, phone
router.put('/', requireAuth, async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    const errors = required(req.body, { name: 'Name', email: 'Email' });
    if (email && !EMAIL_RE.test(String(email).trim())) errors.email = 'Enter a valid email address.';
    if (respondIfErrors(res, errors)) return;

    const cleanEmail = String(email).trim().toLowerCase();

    // If the email changed, make sure nobody else already has it.
    const existing = await db.query(
      'SELECT 1 FROM users WHERE email = $1 AND user_id != $2',
      [cleanEmail, req.user.id],
    );
    if (existing.rowCount) {
      return res.status(409).json({ error: 'An account with this email already exists.', fields: { email: 'This email is already registered.' } });
    }

    const { rows } = await db.query(
      `UPDATE users SET name = $1, email = $2, phone = $3 WHERE user_id = $4 RETURNING *`,
      [String(name).trim(), cleanEmail, phone || null, req.user.id],
    );
    return res.json({ user: publicUser(rows[0]) });
  } catch (err) { return next(err); }
});

module.exports = router;const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { EMAIL_RE, required, respondIfErrors } = require('../validate');

const router = express.Router();

const publicUser = (u) => ({ id: u.user_id, name: u.name, email: u.email, phone: u.phone, role: u.role });

// GET /api/profile — view my own profile
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE user_id = $1', [req.user.id]);
    if (!rows[0]) return res.status(401).json({ error: 'Please log in.' });
    return res.json({ user: publicUser(rows[0]) });
  } catch (err) { return next(err); }
});

// PUT /api/profile — edit my name, email, phone
router.put('/', requireAuth, async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    const errors = required(req.body, { name: 'Name', email: 'Email' });
    if (email && !EMAIL_RE.test(String(email).trim())) errors.email = 'Enter a valid email address.';
    if (respondIfErrors(res, errors)) return;

    const cleanEmail = String(email).trim().toLowerCase();

    // If the email changed, make sure nobody else already has it.
    const existing = await db.query(
      'SELECT 1 FROM users WHERE email = $1 AND user_id != $2',
      [cleanEmail, req.user.id],
    );
    if (existing.rowCount) {
      return res.status(409).json({ error: 'An account with this email already exists.', fields: { email: 'This email is already registered.' } });
    }

    const { rows } = await db.query(
      `UPDATE users SET name = $1, email = $2, phone = $3 WHERE user_id = $4 RETURNING *`,
      [String(name).trim(), cleanEmail, phone || null, req.user.id],
    );
    return res.json({ user: publicUser(rows[0]) });
  } catch (err) { return next(err); }
});

module.exports = router;