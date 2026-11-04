-- Revive database schema (PostgreSQL)
-- Matches the Sprint 0 ERD. Sprint 1 uses: users, shops, services, requests, request_photos.
-- The remaining tables are created now so later sprints do not need risky schema changes.

CREATE TABLE IF NOT EXISTS users (
  user_id        SERIAL PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  phone          VARCHAR(30),
  role           VARCHAR(10)  NOT NULL CHECK (role IN ('owner', 'shop', 'admin')),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shops (
  shop_id        SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  shop_name      VARCHAR(120) NOT NULL,
  address        VARCHAR(255) NOT NULL,
  latitude       DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude      DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  opening_hours  VARCHAR(120),
  phone          VARCHAR(30),
  is_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  avg_rating     NUMERIC(2,1) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  service_id       SERIAL PRIMARY KEY,
  shop_id          INTEGER NOT NULL REFERENCES shops(shop_id) ON DELETE CASCADE,
  service_name     VARCHAR(120) NOT NULL,
  device_category  VARCHAR(60)  NOT NULL,
  starting_price   NUMERIC(10,2) NOT NULL CHECK (starting_price > 0),
  turnaround_days  INTEGER NOT NULL CHECK (turnaround_days > 0),
  is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS requests (
  request_id       SERIAL PRIMARY KEY,
  owner_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  request_type     VARCHAR(10) NOT NULL DEFAULT 'repair' CHECK (request_type IN ('repair', 'trade_in')),
  device_type      VARCHAR(60)  NOT NULL,
  brand_model      VARCHAR(120) NOT NULL,
  description      TEXT NOT NULL,
  condition        VARCHAR(20),
  imei_serial      VARCHAR(40),
  seller_declared  BOOLEAN NOT NULL DEFAULT FALSE,
  status           VARCHAR(12) NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'open', 'accepted', 'cancelled', 'closed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Photos are stored in the database itself (bytea) so the app needs no third-party
-- storage service. Demo scale only: max 5 photos x 5 MB per request.
CREATE TABLE IF NOT EXISTS request_photos (
  photo_id    SERIAL PRIMARY KEY,
  request_id  INTEGER NOT NULL REFERENCES requests(request_id) ON DELETE CASCADE,
  mime_type   VARCHAR(20) NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png')),
  data        BYTEA NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- Used from Sprint 2 onward ----
CREATE TABLE IF NOT EXISTS request_shops (
  request_id  INTEGER NOT NULL REFERENCES requests(request_id) ON DELETE CASCADE,
  shop_id     INTEGER NOT NULL REFERENCES shops(shop_id) ON DELETE CASCADE,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (request_id, shop_id)
);

CREATE TABLE IF NOT EXISTS quote_offers (
  quote_id         SERIAL PRIMARY KEY,
  request_id       INTEGER NOT NULL REFERENCES requests(request_id) ON DELETE CASCADE,
  shop_id          INTEGER NOT NULL REFERENCES shops(shop_id) ON DELETE CASCADE,
  type             VARCHAR(6) NOT NULL CHECK (type IN ('quote', 'offer')),
  price            NUMERIC(10,2) NOT NULL CHECK (price > 0),
  adjusted_price   NUMERIC(10,2),
  turnaround_days  INTEGER,
  note             TEXT,
  status           VARCHAR(12) NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, shop_id)
);

CREATE TABLE IF NOT EXISTS jobs (
  job_id                SERIAL PRIMARY KEY,
  quote_id              INTEGER NOT NULL UNIQUE REFERENCES quote_offers(quote_id) ON DELETE CASCADE,
  slot_time             TIMESTAMPTZ,
  status                VARCHAR(12) NOT NULL DEFAULT 'booked',
  erase_checklist_done  BOOLEAN NOT NULL DEFAULT FALSE,
  outcome               VARCHAR(20),
  closed_at             TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS job_status_logs (
  log_id      SERIAL PRIMARY KEY,
  job_id      INTEGER NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
  status      VARCHAR(12) NOT NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  review_id   SERIAL PRIMARY KEY,
  job_id      INTEGER NOT NULL UNIQUE REFERENCES jobs(job_id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_owner ON requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_services_shop ON services(shop_id);
CREATE INDEX IF NOT EXISTS idx_photos_request ON request_photos(request_id);
