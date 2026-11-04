const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');
const { EMAIL_RE, required, respondIfErrors } = require('../validate');

const router = express.Router();
const SELF_SIGNUP_ROLES = ['owner', 'shop']; // admin accounts cannot self-register

const publicUser = (u) => ({ id: u.user_id, name: u.name, email: u.email, phone: u.phone, role: u.role });

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const errors = required(req.body, { name: 'Name', email: 'Email', password: 'Password', role: 'Role' });
    if (email && !EMAIL_RE.test(String(email).trim())) errors.email = 'Enter a valid email address.';
    if (password && String(password).length < 8) errors.password = 'Password must be at least 8 characters.';
    if (role && !SELF_SIGNUP_ROLES.includes(role)) errors.role = 'Choose either Device Owner or Repair Shop.';
    if (respondIfErrors(res, errors)) return;

    const cleanEmail = String(email).trim().toLowerCase();
    const exists = await db.query('SELECT 1 FROM users WHERE email = $1', [cleanEmail]);
    if (exists.rowCount) {
      return res.status(409).json({ error: 'An account with this email already exists.', fields: { email: 'This email is already registered.' } });
    }

    const hash = await bcrypt.hash(String(password), 10);
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash, phone, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [String(name).trim(), cleanEmail, hash, phone || null, role],
    );
    const user = rows[0];
    return res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) { return next(err); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Enter your email and password.' });
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [String(email).trim().toLowerCase()]);
    const user = rows[0];
    const ok = user && (await bcrypt.compare(String(password), user.password_hash));
    // Same message whether the email or the password is wrong, so attackers cannot guess emails.
    if (!ok) return res.status(401).json({ error: 'Incorrect email or password.' });
    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) { return next(err); }
});

// GET /api/auth/me — who am I (used by the web app on page load)
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE user_id = $1', [req.user.id]);
    if (!rows[0]) return res.status(401).json({ error: 'Please log in.' });
    return res.json({ user: publicUser(rows[0]) });
  } catch (err) { return next(err); }
});

module.exports = router;
