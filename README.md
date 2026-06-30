# Trade OS

> Personal trading dashboard — Live Nifty/Sensex/BankNifty, options chain, IPO GMP, and a complete trading ledger.

![Stack](https://img.shields.io/badge/stack-React%2019%20%2B%20FastAPI%20%2B%20MongoDB-blueviolet)

## Features
- 📈 **Live Indices** — Nifty 50, Bank Nifty, Sensex, FinNifty, Nifty IT, Nifty Auto (Yahoo Finance, 30s refresh)
- 🔍 **Stock Search & Charts** — Search any global symbol, view 1D–5Y price history
- 💰 **Per-User Watchlist** — Add/remove stocks, server-hydrated quotes
- 📊 **Live Option Chain** — NIFTY/BANKNIFTY/FINNIFTY/RELIANCE etc. with OI bar chart, ATM highlight, full CE+PE table (niftytrader.in)
- 🚀 **IPO Pulse** — Live GMP, price band, est. listing, status filters (ipowatch.in)
- 📒 **Trading Ledger** (8 sections per user)
  - Capital Accounts · Swing Trades · Options Log · Mutual Funds
  - Trading Expenses · Personal Expenses · Playbook · Journal
- 🔐 **Emergent Google Auth** — httpOnly cookies, 7-day sessions
- 🎨 **Light/Dark theme** with wine/cream brand palette

## Live Demo
Open the deployed URL → Sign in with Google → start tracking.

## Quick Start (Local)

```bash
# 1. Backend
cd backend
cp .env.example .env  # edit MONGO_URL
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# 2. Frontend (in new terminal)
cd frontend
cp .env.example .env  # set REACT_APP_BACKEND_URL=http://localhost:8001
yarn install
yarn start
```

Open http://localhost:3000.

## Deploy to Production

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for full instructions:
- **Frontend** → Vercel
- **Backend** → Railway / Render
- **Database** → MongoDB Atlas

All have free tiers. Total cost: **₹0 / month** for moderate usage.

## Tech Stack
- **Frontend:** React 19 · Tailwind · Recharts · Sonner · Axios · Lucide
- **Backend:** FastAPI · httpx · BeautifulSoup · Motor (async MongoDB)
- **External (free):** Yahoo Finance v8, niftytrader.in, ipowatch.in
- **Auth:** Emergent Google OAuth

## License
MIT
