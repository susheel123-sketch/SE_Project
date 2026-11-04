require('dotenv').config();
const app = require('./app');
const migrate = require('./migrate');

const PORT = process.env.PORT || 4000;

// Create tables on start-up (safe to repeat), then start listening.
migrate()
  .then(() => app.listen(PORT, () => console.log(`Revive API listening on port ${PORT}`)))
  .catch((err) => {
    console.error('Could not start: database migration failed:', err.message);
    process.exit(1);
  });
