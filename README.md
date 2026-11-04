# Revive — Software Engineering, Fall 2026

Revive is a web marketplace that connects owners of broken or unwanted electronics with verified local repair shops. Owners post a repair or trade-in request, receive quotes or offers, and track the job until handover.

**Team:** Susheel Kumar (30935) · Muhammad Alam (30592) · Rohan Lohana (31686)

| | Link |
|---|---|
| Trello board (backlog, Sprint 1, Definition of Done) | https://trello.com/b/jFQGdQdh/revive-software-engineering |
| Repository | https://github.com/susheel123-sketch/SE_Project |
| Live web app | https://se-project-indol.vercel.app |
| Live backend health check | https://revive-api-p12o.onrender.com/api/health |

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite, React Router, Leaflet + OpenStreetMap |
| Backend | Node.js + Express (REST API), JWT login, bcrypt password hashing |
| Database | PostgreSQL (our own schema; photos stored in the database) |
| Hosting | Backend on Render · Web app on Vercel · PostgreSQL on Neon |

No no-code tools and no managed backends (such as Firebase): the Express backend is ours and talks to PostgreSQL directly, as the Sprint 1 brief requires.

## Folder layout

```
backend/            Express API
  src/schema.sql    all tables (matches the ERD)
  src/routes/       auth, shops, admin, requests, photos
  src/seed.js       demo accounts and shops
  tests/            automated API tests (TC-01 … TC-36)
frontend/           React web app
  src/pages/        one file per screen
```

## Sprint 1 increment — what works

| Story | Screens / API |
|---|---|
| Sign up with a role, log in and out | `/signup`, `/login` · `POST /api/auth/signup`, `POST /api/auth/login` |
| Shop creates and edits its profile | `/shop/profile` · `GET/POST/PUT /api/shops/me` |
| Shop adds, edits and removes services | `/shop/services` · `/api/shops/me/services` |
| Admin verifies or unverifies a shop | `/admin/shops` · `GET /api/admin/shops`, `PATCH /api/admin/shops/:id/verify` |
| Owner creates a repair request with photos | `/requests/new` · `POST /api/requests` |
| Owner views, edits and cancels requests | `/requests`, `/requests/:id/edit` · `GET /api/requests/mine`, `PUT /api/requests/:id`, `PATCH /api/requests/:id/cancel` |

Public verified-shop page: `/shops/:id` · `GET /api/shops/:id`.

## Run it on your computer

You need Node.js 18+ and a PostgreSQL database (local, or a free Neon database).

```bash
# 1. Backend
cd backend
cp .env.example .env        # then put your DATABASE_URL and a JWT_SECRET in .env
npm install
npm run seed                # creates tables + demo data
npm run dev                 # API on http://localhost:4000

# 2. Web app (second terminal)
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:4000
npm install
npm run dev                 # open http://localhost:5173
```

**Demo accounts** (password `Revive@2026`): `admin@revive.demo`, `owner@revive.demo`, `fixit@revive.demo`, `laptopcare@revive.demo`, `gadgetclinic@revive.demo` (this last shop is unverified, for the admin demo).

## Tests

```bash
cd backend
DATABASE_URL=postgresql://…/a_throwaway_db npm test
```

⚠️ The tests **wipe the database they run on**. Never point them at the live database.

## Branching

- `main` — always deployable; updated from `develop` by a reviewed pull request at the end of a sprint
- `develop` — integration branch for the current sprint
- `feature/<card-number>-<short-name>` — one branch per Trello story, merged into `develop` by pull request with one review

## Deployment

See [DEPLOY.md](DEPLOY.md).
