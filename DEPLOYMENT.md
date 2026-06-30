# Trade OS — Deployment Guide

Personal trading dashboard with live Indian market data (Yahoo Finance), option chain (niftytrader.in), IPO GMP (ipowatch.in), Emergent Google Auth, and a complete trading ledger.

---

## Architecture

| Layer | Tech | Recommended Host |
|-------|------|------------------|
| Frontend | React 19 (CRA) | **Vercel** |
| Backend | FastAPI (Python 3.11) | **Railway** or **Render** |
| Database | MongoDB | **MongoDB Atlas** (free M0) |

> ⚠️ **Why not full Vercel?** Vercel Serverless Functions have a 10-second timeout (Hobby plan) and cold-start delays — both bad for our Yahoo + niftytrader scraping. Use Railway/Render for the backend.

---

## Step-by-Step Deployment

### 1️⃣ Database — MongoDB Atlas (Free)

1. Go to https://cloud.mongodb.com → Sign up
2. Create a free cluster (**M0 free tier**, AWS Mumbai region for India)
3. **Database Access** → Add a database user (note username + password)
4. **Network Access** → Add IP `0.0.0.0/0` (allow from anywhere)
5. **Connect** → **Drivers** → copy connection string. Looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net
   ```
6. Replace `<password>` with your actual password. Save this URL — you'll need it.

---

### 2️⃣ Backend — Railway (Recommended) OR Render

#### Option A: Railway (Easier — $5 free credit, ~500 hrs/mo)

1. Push the `backend/` folder to a GitHub repo (or use the full repo with backend as subdirectory)
2. Go to https://railway.app → Sign in with GitHub
3. **New Project** → **Deploy from GitHub repo** → select your repo
4. Settings → **Root Directory**: `backend` (if backend is in a subfolder)
5. **Variables** tab → add:
   ```
   MONGO_URL = <your Atlas connection string>
   DB_NAME   = trade_os
   CORS_ORIGINS = https://YOUR-VERCEL-URL.vercel.app,http://localhost:3000
   ```
6. Railway auto-deploys. Copy the generated URL like `https://trade-os-production-xxxx.up.railway.app`

#### Option B: Render (Always-free tier, sleeps after 15 min idle)

1. Push backend to GitHub
2. Go to https://render.com → New → Web Service → connect repo
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. **Environment** → add `MONGO_URL`, `DB_NAME=trade_os`, `CORS_ORIGINS`
5. Deploy. Copy the URL like `https://trade-os-backend.onrender.com`

> ✅ **Test backend**: open `https://YOUR-BACKEND-URL/api/market/indices` — you should see JSON with Nifty/Sensex prices.

---

### 3️⃣ Frontend — Vercel

1. Push the `frontend/` folder to GitHub
2. Go to https://vercel.com → **Add New Project** → import your repo
3. Settings:
   - **Framework Preset**: `Create React App` (auto-detected via `vercel.json`)
   - **Root Directory**: `frontend` (if frontend is in subfolder)
   - **Build Command**: `yarn build` (in `vercel.json`)
   - **Output Directory**: `build`
   - **Install Command**: `yarn install --frozen-lockfile`
4. **Environment Variables** → add:
   ```
   REACT_APP_BACKEND_URL = https://YOUR-RAILWAY-OR-RENDER-URL
   WDS_SOCKET_PORT = 443
   ```
   ⚠️ NO trailing slash on the URL.
5. Click **Deploy**. You'll get `https://trade-os-xxxxx.vercel.app`.
6. **Go back to Railway/Render** and update `CORS_ORIGINS` to include your new Vercel URL.

---

### 4️⃣ Seed a Test User (Optional)

If you want to skip Google login during testing:

```bash
# From MongoDB Atlas → Database → Browse Collections → use mongosh:
use('trade_os');
db.users.insertOne({
  user_id: 'user_test01',
  email: 'you@example.com',
  name: 'Your Name',
  picture: '',
  created_at: new Date().toISOString()
});
db.user_sessions.insertOne({
  user_id: 'user_test01',
  session_token: 'my_test_token_2026',
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
```

Then in browser DevTools console (on your Vercel URL):
```js
document.cookie = 'session_token=my_test_token_2026; path=/; secure; samesite=none';
location.reload();
```

For real production, just click **"Sign in with Google"** on the login page.

---

## Common Vercel Deployment Errors & Fixes

### ❌ "Module not found" during build
- Check `frontend/package.json` has all dependencies listed
- Run `yarn install` locally first to regenerate `yarn.lock`

### ❌ Blank page after deploy / "Failed to fetch"
- `REACT_APP_BACKEND_URL` is missing or wrong in Vercel env vars
- Backend URL has trailing slash — remove it
- Backend `CORS_ORIGINS` doesn't include your Vercel URL

### ❌ "Cannot resolve '@/lib/api'" or similar alias errors
- Vercel needs the `@/` alias too. Check that `frontend/jsconfig.json` and `frontend/craco.config.js` are pushed to git.
- The `vercel.json` framework should be `create-react-app` so craco hooks in automatically.

### ❌ Build succeeds but login redirects to wrong URL
- The login button uses `window.location.origin` — should auto-pick up Vercel URL
- Check that `auth.emergentagent.com` accepts your Vercel domain (default: any HTTPS domain)

### ❌ 401 errors on /api/auth/me after login
- Backend cookie is set with `samesite=none, secure=true` — needs HTTPS on both ends ✅ (Vercel + Railway/Render are both HTTPS)
- Check that frontend sends `credentials: 'include'` — already configured via `axios.defaults.withCredentials = true`

---

## Local Development

### Backend
```bash
cd backend
cp .env.example .env  # then edit with your MongoDB URL
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend
```bash
cd frontend
cp .env.example .env  # set REACT_APP_BACKEND_URL=http://localhost:8001
yarn install
yarn start
```

App opens at http://localhost:3000.

---

## API Endpoints

All endpoints prefixed with `/api`.

### Public
- `GET /market/indices` — Nifty50, BankNifty, Sensex, FinNifty, Nifty IT, Nifty Auto
- `GET /market/quote?symbols=RELIANCE.NS,TCS.NS` — Multi-symbol quote
- `GET /market/history?symbol=^NSEI&range=1mo&interval=1d` — Candles for charts
- `GET /market/movers` — Top gainers + losers
- `GET /market/search?q=reliance` — Symbol search
- `GET /market/options?symbol=NIFTY&above=10&below=10` — Live option chain (CE+PE)
- `GET /ipo/gmp` — Live IPO GMP from ipowatch.in

### Auth
- `POST /auth/session` `{session_id}` — Exchange Emergent OAuth code → cookie
- `GET /auth/me` — Current user
- `POST /auth/logout` — Clear session

### Authenticated
- `GET/POST /watchlist`, `DELETE /watchlist/{symbol}`
- `GET/POST/PUT/DELETE /ledger/{kind}/{id?}` where kind ∈ `{accounts, swing, options, mutualFunds, expensesTrading, expensesPersonal, strategies, journal}`

---

## Stack Summary
- **Frontend:** React 19, Tailwind CSS, Recharts, Sonner toasts, axios, lucide-react icons, Fraunces + Inter + IBM Plex Mono fonts
- **Backend:** FastAPI, httpx (async), BeautifulSoup4 + lxml, motor (async MongoDB)
- **Auth:** Emergent-managed Google OAuth → httpOnly cookies → 7-day MongoDB sessions
- **External APIs (all free, no key):** Yahoo Finance v8 chart API, niftytrader.in webapi, ipowatch.in scraping
