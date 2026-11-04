const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

// Hosted PostgreSQL (Neon, Render, etc.) needs SSL; a local database does not.
const isLocal = /localhost|127\.0\.0\.1|host=\/tmp/.test(process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 10,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
