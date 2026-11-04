const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/photos/:id — the request's owner and admins can see it.
// (From Sprint 2, shops that received the request will also be allowed.)
router.get('/:id(\\d+)', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT p.mime_type, p.data, r.owner_id FROM request_photos p
       JOIN requests r ON r.request_id = p.request_id WHERE p.photo_id=$1`, [req.params.id]);
    const photo = rows[0];
    if (!photo || (photo.owner_id !== req.user.id && req.user.role !== 'admin')) {
      return res.status(404).json({ error: 'Photo not found.' });
    }
    res.set('Content-Type', photo.mime_type);
    res.set('Cache-Control', 'private, max-age=3600');
    return res.send(photo.data);
  } catch (err) { return next(err); }
});

module.exports = router;
