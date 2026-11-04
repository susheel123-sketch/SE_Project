# Deploying Revive (about 30 minutes, all free)

You will create three free accounts: **Neon** (database), **Render** (backend), **Vercel** (web app). Sign in to each one with your GitHub account, which makes connecting the repo easy.

Do the steps in this order: the backend needs the database address, and the web app needs the backend address.

---

## Step 1 — Database on Neon

1. Go to **neon.tech** → Sign up with GitHub.
2. **Create project** → name it `revive`, pick the region closest to Pakistan (e.g. Singapore or Frankfurt) → Create.
3. On the dashboard, find **Connection string** and copy it. It looks like:
   `postgresql://neondb_owner:xxxx@ep-xxxx.aws.neon.tech/neondb?sslmode=require`
4. Keep it somewhere safe. **This is a password: never commit it to GitHub.**

## Step 2 — Backend on Render

1. Go to **render.com** → Sign up with GitHub.
2. **New + → Web Service** → connect the `SE_Project` repository.
3. Fill in:
   - **Name:** `revive-api`
   - **Branch:** `develop`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free
4. Under **Environment Variables** add:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Neon connection string from Step 1 |
   | `JWT_SECRET` | any long random string (e.g. mash the keyboard for 40+ characters) |
   | `CORS_ORIGIN` | `http://localhost:5173` for now — you will change it in Step 4 |
   | `SEED_PASSWORD` | `Revive@2026` |

5. Click **Create Web Service** and wait for "Live" (2–5 minutes). The tables are created automatically on start-up.
6. Open `https://revive-api-XXXX.onrender.com/api/health` (your own URL). You should see `"database":"connected"`. ✅ **Your backend is deployed online.**
7. **Load the demo data:** in Render, open your service → **Shell** tab → run `npm run seed`.
   (If Shell is not available on the free plan, run it from your laptop instead: in `backend/.env` put the Neon `DATABASE_URL`, then `npm install && npm run seed`.)

> **Free-tier note:** Render's free service goes to sleep after about 15 minutes without traffic, and the first request after that can take up to about a minute. **Open the health-check URL a few minutes before every demo** to wake it up.

## Step 3 — Web app on Vercel

1. Go to **vercel.com** → Sign up with GitHub.
2. **Add New → Project** → import `SE_Project`.
3. Fill in:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (detected automatically)
4. Under **Environment Variables** add:
   - `VITE_API_URL` = your Render URL, e.g. `https://revive-api-XXXX.onrender.com` (no slash at the end)
5. **Deploy.** You get a URL like `https://se-project-xxxx.vercel.app`.
6. In Vercel → Settings → Git, set the **Production Branch** to `develop` (or merge `develop` into `main`).

## Step 4 — Connect the two

1. Back in **Render** → your service → **Environment** → change `CORS_ORIGIN` to your Vercel URL, e.g. `https://se-project-xxxx.vercel.app` → Save (Render redeploys).
2. Open the Vercel URL, log in as `admin@revive.demo` / `Revive@2026`. If you see the Verify Shops page, everything is connected. ✅

## Step 5 — Update the links

- Put the **web app URL** and **health-check URL** in the README table.
- Add both to the Trello `[Setup]` card and tick its checklist.

---

## If something goes wrong

| Problem | Fix |
|---|---|
| Health check says `database: unreachable` | `DATABASE_URL` is wrong. Copy it again from Neon (it must end with `?sslmode=require`). |
| Web app says "Cannot reach the server" | `VITE_API_URL` in Vercel is wrong, or the backend is asleep. Open the health URL, then **Redeploy** on Vercel after fixing the variable. |
| Login works locally but not online (CORS error in the browser console) | `CORS_ORIGIN` in Render must exactly equal the Vercel URL (https, no trailing slash). |
| Page refresh on Vercel shows 404 | `frontend/vercel.json` must be in the repo (it is). |
| Render build fails | Root Directory must be `backend`; Start Command must be `npm start`. |
