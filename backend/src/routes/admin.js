const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin')); // every admin route: 401 / 403 checked on the server

// GET /api/admin/shops?status=verified|unverified|all
router.get('/shops', async (req, res, next) => {
  try {
    const status = req.query.status || 'all';
    if (!['verified', 'unverified', 'all'].includes(status)) {
      return res.status(400).json({ error: 'status must be verified, unverified or all.' });
    }
    const where = status === 'all' ? '' : `WHERE s.is_verified = ${status === 'verified' ? 'TRUE' : 'FALSE'}`;
    const { rows } = await db.query(
      `SELECT s.shop_id, s.shop_name, s.address, s.phone, s.is_verified, s.created_at,
              u.name AS owner_name, u.email AS owner_email,
              (SELECT COUNT(*)::int FROM services v WHERE v.shop_id=s.shop_id AND v.is_deleted=FALSE) AS service_count
       FROM shops s JOIN users u ON u.user_id = s.user_id
       ${where} ORDER BY s.created_at DESC`,
    );
    return res.json({ shops: rows });
  } catch (err) { return next(err); }
});

// PATCH /api/admin/shops/:id/verify   body: { "verified": true | false }
router.patch('/shops/:id(\\d+)/verify', async (req, res, next) => {
  try {
    if (typeof req.body.verified !== 'boolean') {
      return res.status(400).json({ error: 'verified must be true or false.' });
    }
    const { rows } = await db.query(
      'UPDATE shops SET is_verified=$2, updated_at=NOW() WHERE shop_id=$1 RETURNING shop_id, shop_name, is_verified',
      [req.params.id, req.body.verified],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Shop not found.' });
    return res.json({ shop: rows[0] });
  } catch (err) { return next(err); }
});

module.exports = router;
