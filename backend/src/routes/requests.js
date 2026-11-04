const express = require('express');
const multer = require('multer');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { required, respondIfErrors } = require('../validate');

const router = express.Router();

const MAX_PHOTOS = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png'];
const EDITABLE = ['draft', 'open']; // no quote/offer accepted yet

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: MAX_PHOTOS },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    const err = new Error('Only JPG and PNG photos are allowed.');
    err.status = 400;
    return cb(err);
  },
}).array('photos', MAX_PHOTOS);

// Turn multer errors into friendly 400 responses.
function handleUpload(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Each photo must be 5 MB or smaller.', fields: { photos: 'Each photo must be 5 MB or smaller.' } });
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ error: `You can upload at most ${MAX_PHOTOS} photos.`, fields: { photos: `At most ${MAX_PHOTOS} photos.` } });
    if (err.status === 400) return res.status(400).json({ error: err.message, fields: { photos: err.message } });
    return next(err);
  });
}

function validateRequest(body) {
  return required(body, { device_type: 'Device type', brand_model: 'Brand / model', description: 'Problem description' });
}

async function photoIds(requestId) {
  const { rows } = await db.query('SELECT photo_id FROM request_photos WHERE request_id=$1 ORDER BY photo_id', [requestId]);
  return rows.map((r) => r.photo_id);
}

async function savePhotos(client, requestId, files) {
  for (const f of files) {
    await client.query('INSERT INTO request_photos (request_id, mime_type, data) VALUES ($1,$2,$3)', [requestId, f.mimetype, f.buffer]);
  }
}

// Owner-only access; returns the request or sends 404 (we do not reveal other owners' requests).
async function loadOwnRequest(req, res) {
  const { rows } = await db.query('SELECT * FROM requests WHERE request_id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
  if (!rows[0]) { res.status(404).json({ error: 'Request not found.' }); return null; }
  return rows[0];
}

router.use(requireAuth);

// POST /api/requests — create a repair request (multipart form with 1–5 photos)
router.post('/', requireRole('owner'), handleUpload, async (req, res, next) => {
  const errors = validateRequest(req.body);
  const files = req.files || [];
  if (files.length < 1) errors.photos = 'Add at least one photo.';
  if (respondIfErrors(res, errors)) return;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const b = req.body;
    const { rows } = await client.query(
      `INSERT INTO requests (owner_id, request_type, device_type, brand_model, description)
       VALUES ($1, 'repair', $2, $3, $4) RETURNING *`,
      [req.user.id, b.device_type.trim(), b.brand_model.trim(), b.description.trim()],
    );
    await savePhotos(client, rows[0].request_id, files);
    await client.query('COMMIT');
    res.status(201).json({ request: { ...rows[0], photo_ids: await photoIds(rows[0].request_id) } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

// GET /api/requests/mine — My Requests list
router.get('/mine', requireRole('owner'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, COALESCE(ARRAY_AGG(p.photo_id ORDER BY p.photo_id) FILTER (WHERE p.photo_id IS NOT NULL), '{}') AS photo_ids
       FROM requests r LEFT JOIN request_photos p ON p.request_id = r.request_id
       WHERE r.owner_id=$1 GROUP BY r.request_id ORDER BY r.created_at DESC`,
      [req.user.id],
    );
    res.json({ requests: rows });
  } catch (err) { next(err); }
});

// GET /api/requests/:id
router.get('/:id(\\d+)', requireRole('owner'), async (req, res, next) => {
  try {
    const r = await loadOwnRequest(req, res);
    if (!r) return;
    res.json({ request: { ...r, photo_ids: await photoIds(r.request_id) } });
  } catch (err) { next(err); }
});

// PUT /api/requests/:id — edit text, add new photos, remove photos (only while editable)
// multipart fields: device_type, brand_model, description, remove_photo_ids (comma list), photos[]
router.put('/:id(\\d+)', requireRole('owner'), handleUpload, async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const r = await loadOwnRequest(req, res);
    if (!r) return;
    if (!EDITABLE.includes(r.status)) {
      return res.status(409).json({ error: `This request is ${r.status} and can no longer be edited.` });
    }
    const errors = validateRequest(req.body);
    const remove = String(req.body.remove_photo_ids || '').split(',').map(Number).filter(Boolean);
    const current = await photoIds(r.request_id);
    const keep = current.filter((id) => !remove.includes(id));
    const total = keep.length + (req.files || []).length;
    if (total < 1) errors.photos = 'A request needs at least one photo.';
    if (total > MAX_PHOTOS) errors.photos = `A request can have at most ${MAX_PHOTOS} photos.`;
    if (respondIfErrors(res, errors)) return;

    await client.query('BEGIN');
    const b = req.body;
    const { rows } = await client.query(
      `UPDATE requests SET device_type=$2, brand_model=$3, description=$4, updated_at=NOW()
       WHERE request_id=$1 RETURNING *`,
      [r.request_id, b.device_type.trim(), b.brand_model.trim(), b.description.trim()],
    );
    if (remove.length) {
      await client.query('DELETE FROM request_photos WHERE request_id=$1 AND photo_id = ANY($2::int[])', [r.request_id, remove]);
    }
    await savePhotos(client, r.request_id, req.files || []);
    await client.query('COMMIT');
    res.json({ request: { ...rows[0], photo_ids: await photoIds(r.request_id) } });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally { client.release(); }
});

// PATCH /api/requests/:id/cancel
router.patch('/:id(\\d+)/cancel', requireRole('owner'), async (req, res, next) => {
  try {
    const r = await loadOwnRequest(req, res);
    if (!r) return;
    if (!EDITABLE.includes(r.status)) {
      return res.status(409).json({ error: `This request is ${r.status} and cannot be cancelled.` });
    }
    const { rows } = await db.query(
      "UPDATE requests SET status='cancelled', updated_at=NOW() WHERE request_id=$1 RETURNING *", [r.request_id]);
    res.json({ request: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
