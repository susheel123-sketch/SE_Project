const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();

// Only the deployed web app (and local dev) may call the API from a browser.
const allowed = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(cors({ origin: allowed }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/shops', require('./routes/shops'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/photos', require('./routes/photos'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Last-resort error handler: log the details, show the user a plain message.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
  console.error(err);
  return res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

module.exports = app;
