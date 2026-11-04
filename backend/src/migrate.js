// Creates all tables. Safe to run more than once.
const fs = require('fs');
const path = require('path');
const db = require('./db');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await db.query(sql);
}

module.exports = migrate;

if (require.main === module) {
  migrate()
    .then(() => { console.log('Schema is up to date.'); return db.pool.end(); })
    .catch((err) => { console.error('Migration failed:', err.message); process.exit(1); });
}
