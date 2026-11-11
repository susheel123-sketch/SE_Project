const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

// Hosted PostgreSQL (Neon, Render, etc.) needs SSL; a local database does not.
const isLocal = /localhost|127\.0\.0\.1|host=\/tmp/.test(process.env.DATABASE_URL);

// Remove ?sslmode=... from the URL and set SSL below instead.
// This stops pg's "SECURITY WARNING" about sslmode in the Render logs.
const connectionString = process.env.DATABASE_URL
  .replace(/([?&])sslmode=[^&]*&?/, '$1')
  .replace(/[?&]$/, '');

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: true },
  max: 10,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
