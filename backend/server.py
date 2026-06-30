"""Trade OS — FastAPI backend.
Live market data (Yahoo) + Options chain (niftytrader.in) + IPO GMP scraping +
Emergent Google Auth (httpOnly cookies) + per-user Watchlist & Trading Ledger.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Query, Request, Response, Depends, Body
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bs4 import BeautifulSoup
import os
import re
import time
import uuid
import asyncio
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------------- Mongo ----------------
mongo_url = os.environ["MONGO_URL"]
mongo = AsyncIOMotorClient(mongo_url)
db = mongo[os.environ["DB_NAME"]]

# ---------------- App ----------------
app = FastAPI(title="Trade OS API")
api = APIRouter(prefix="/api")

# ---------------- Cache ----------------
_CACHE: Dict[str, Any] = {}


def cache_get(key: str):
    item = _CACHE.get(key)
    if not item:
        return None
    if item["exp"] < time.time():
        _CACHE.pop(key, None)
        return None
    return item["data"]


def cache_set(key: str, data, ttl: int):
    _CACHE[key] = {"data": data, "exp": time.time() + ttl}


# ---------------- HTTP ----------------
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Accept": "application/json,text/plain,*/*",
    "Accept-Language": "en-US,en;q=0.9",
}


async def http_get_json(url: str, headers: Optional[dict] = None, timeout: float = 12.0):
    async with httpx.AsyncClient(timeout=timeout, headers=headers or DEFAULT_HEADERS) as c:
        r = await c.get(url)
        r.raise_for_status()
        return r.json()


async def http_get_text(url: str, headers: Optional[dict] = None, timeout: float = 15.0):
    async with httpx.AsyncClient(timeout=timeout, headers=headers or DEFAULT_HEADERS) as c:
        r = await c.get(url)
        r.raise_for_status()
        return r.text


# ===================================================================
# Yahoo Finance (live indices/quotes/history)
# ===================================================================
YF_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval={interval}&range={rng}"
YF_SEARCH = "https://query2.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=10&newsCount=0"


def _compute_current_price(meta: dict, closes: list) -> Optional[float]:
    current = meta.get("regularMarketPrice")
    if current is None and closes:
        current = closes[-1]
    return current


def _compute_prev_close(meta: dict, closes: list) -> Optional[float]:
    prev = meta.get("chartPreviousClose") or meta.get("previousClose")
    if prev is None and len(closes) >= 2:
        prev = closes[-2]
    return prev


def _compute_change(current: Optional[float], prev: Optional[float]) -> tuple:
    if current is None or not prev:
        return None, None
    change = round(current - prev, 4)
    change_pct = round((change / prev) * 100, 4)
    return change, change_pct


def _parse_chart(payload: dict) -> Optional[dict]:
    res = (payload.get("chart") or {}).get("result")
    if not res:
        return None
    r = res[0]
    meta = r.get("meta") or {}
    ind = (r.get("indicators") or {}).get("quote") or [{}]
    q = ind[0] if ind else {}
    closes = [c for c in (q.get("close") or []) if c is not None]
    current = _compute_current_price(meta, closes)
    prev = _compute_prev_close(meta, closes)
    change, change_pct = _compute_change(current, prev)

    return {
        "symbol": meta.get("symbol"),
        "name": meta.get("longName") or meta.get("shortName") or meta.get("symbol"),
        "currency": meta.get("currency"),
        "exchange": meta.get("exchangeName"),
        "price": current,
        "previous_close": prev,
        "change": change,
        "change_pct": change_pct,
        "day_high": meta.get("regularMarketDayHigh"),
        "day_low": meta.get("regularMarketDayLow"),
        "fifty_two_week_high": meta.get("fiftyTwoWeekHigh"),
        "fifty_two_week_low": meta.get("fiftyTwoWeekLow"),
        "timestamps": r.get("timestamp") or [],
        "closes": closes,
        "opens": list(q.get("open") or []),
        "highs": list(q.get("high") or []),
        "lows": list(q.get("low") or []),
        "volumes": list(q.get("volume") or []),
    }


async def fetch_yahoo_quote(symbol: str, interval: str = "1d", rng: str = "5d") -> Optional[dict]:
    url = YF_CHART.format(sym=symbol, interval=interval, rng=rng)
    try:
        data = await http_get_json(url)
        return _parse_chart(data)
    except Exception as e:
        logging.warning(f"Yahoo fetch failed for {symbol}: {e}")
        return None


INDICES = [
    {"symbol": "^NSEI", "name": "NIFTY 50"},
    {"symbol": "^NSEBANK", "name": "BANK NIFTY"},
    {"symbol": "^BSESN", "name": "SENSEX"},
    {"symbol": "NIFTY_FIN_SERVICE.NS", "name": "FIN NIFTY"},
    {"symbol": "^CNXIT", "name": "NIFTY IT"},
    {"symbol": "^CNXAUTO", "name": "NIFTY AUTO"},
]
DEFAULT_WATCHLIST = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "BHARTIARTL.NS", "SBIN.NS", "LT.NS", "HINDUNILVR.NS", "ITC.NS",
    "BAJFINANCE.NS", "KOTAKBANK.NS", "ADANIENT.NS", "TATAMOTORS.NS", "AXISBANK.NS",
]


@api.get("/")
async def root():
    return {"message": "Trade OS API", "version": "2.0.0", "time": datetime.now(timezone.utc).isoformat()}


@api.get("/market/indices")
async def market_indices():
    cached = cache_get("indices")
    if cached:
        return cached
    tasks = [fetch_yahoo_quote(idx["symbol"], "5m", "1d") for idx in INDICES]
    results = await asyncio.gather(*tasks)
    out = []
    for meta, data in zip(INDICES, results):
        if not data or data.get("price") is None:
            continue
        out.append({
            "symbol": meta["symbol"], "display_name": meta["name"],
            "price": data["price"], "previous_close": data["previous_close"],
            "change": data["change"], "change_pct": data["change_pct"],
            "day_high": data.get("day_high"), "day_low": data.get("day_low"),
            "currency": data.get("currency"),
        })
    response = {"indices": out, "fetched_at": datetime.now(timezone.utc).isoformat()}
    cache_set("indices", response, ttl=30)
    return response


@api.get("/market/quote")
async def market_quote(symbols: str = Query(...)):
    syms = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not syms:
        raise HTTPException(400, "No symbols provided")
    if len(syms) > 30:
        raise HTTPException(400, "Max 30 symbols")
    key = f"quote:{','.join(sorted(syms))}"
    cached = cache_get(key)
    if cached:
        return cached
    tasks = [fetch_yahoo_quote(s, "5m", "1d") for s in syms]
    results = await asyncio.gather(*tasks)
    quotes = []
    for s, d in zip(syms, results):
        if not d:
            quotes.append({"symbol": s, "error": "Not found"})
            continue
        quotes.append({
            "symbol": d.get("symbol") or s, "name": d.get("name"),
            "price": d.get("price"), "previous_close": d.get("previous_close"),
            "change": d.get("change"), "change_pct": d.get("change_pct"),
            "currency": d.get("currency"), "exchange": d.get("exchange"),
            "day_high": d.get("day_high"), "day_low": d.get("day_low"),
            "fifty_two_week_high": d.get("fifty_two_week_high"),
            "fifty_two_week_low": d.get("fifty_two_week_low"),
        })
    response = {"quotes": quotes, "fetched_at": datetime.now(timezone.utc).isoformat()}
    cache_set(key, response, ttl=20)
    return response


@api.get("/market/history")
async def market_history(symbol: str = Query(...), interval: str = "1d", range: str = "1mo"):
    key = f"hist:{symbol}:{interval}:{range}"
    cached = cache_get(key)
    if cached:
        return cached
    data = await fetch_yahoo_quote(symbol, interval, range)
    if not data:
        raise HTTPException(404, f"Symbol '{symbol}' not found")
    candles = []
    ts = data.get("timestamps") or []
    closes = data.get("closes") or []
    opens = data.get("opens") or []
    highs = data.get("highs") or []
    lows = data.get("lows") or []
    vols = data.get("volumes") or []
    for i, t in enumerate(ts):
        if i >= len(closes) or closes[i] is None:
            continue
        candles.append({
            "t": t,
            "o": opens[i] if i < len(opens) else None,
            "h": highs[i] if i < len(highs) else None,
            "l": lows[i] if i < len(lows) else None,
            "c": closes[i],
            "v": vols[i] if i < len(vols) else None,
        })
    response = {
        "symbol": data.get("symbol"), "name": data.get("name"),
        "currency": data.get("currency"), "price": data.get("price"),
        "previous_close": data.get("previous_close"),
        "change": data.get("change"), "change_pct": data.get("change_pct"),
        "candles": candles,
    }
    cache_set(key, response, ttl=60)
    return response


@api.get("/market/movers")
async def market_movers():
    cached = cache_get("movers")
    if cached:
        return cached
    tasks = [fetch_yahoo_quote(s, "5m", "1d") for s in DEFAULT_WATCHLIST]
    results = await asyncio.gather(*tasks)
    quotes = []
    for s, d in zip(DEFAULT_WATCHLIST, results):
        if not d or d.get("price") is None or d.get("change_pct") is None:
            continue
        quotes.append({
            "symbol": s, "name": d.get("name"),
            "price": d.get("price"), "change": d.get("change"),
            "change_pct": d.get("change_pct"),
        })
    sorted_q = sorted(quotes, key=lambda x: x["change_pct"], reverse=True)
    response = {
        "gainers": sorted_q[:5],
        "losers": list(reversed(sorted_q[-5:])),
        "watchlist": quotes,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    cache_set("movers", response, ttl=45)
    return response


@api.get("/market/search")
async def market_search(q: str = Query(..., min_length=1)):
    key = f"search:{q.lower()}"
    cached = cache_get(key)
    if cached:
        return cached
    try:
        data = await http_get_json(YF_SEARCH.format(q=q))
    except Exception as e:
        raise HTTPException(502, f"Search failed: {e}")
    quotes = data.get("quotes") or []
    results = []
    for it in quotes:
        sym = it.get("symbol")
        if not sym:
            continue
        results.append({
            "symbol": sym,
            "name": it.get("longname") or it.get("shortname") or sym,
            "exchange": it.get("exchange") or it.get("exchDisp"),
            "type": it.get("quoteType") or it.get("typeDisp"),
        })
    response = {"results": results}
    cache_set(key, response, ttl=600)
    return response


# ===================================================================
# Options Chain — niftytrader.in (FREE public API)
# ===================================================================
NT_OC = "https://webapi.niftytrader.in/webapi/option/option-chain-data"


def _parse_option_leg(r: dict, side: str) -> dict:
    prefix = "calls" if side == "ce" else "puts"
    return {
        "ltp": r.get(f"{prefix}_ltp"),
        "change": r.get(f"{prefix}_net_change"),
        "change_pct": r.get(f"{prefix}_ltp_per"),
        "oi": r.get(f"{prefix}_oi"),
        "change_oi": r.get(f"{prefix}_change_oi"),
        "volume": r.get(f"{prefix}_volume"),
        "iv": r.get(f"{prefix}_iv"),
        "bid": r.get(f"{prefix}_bid_price"),
        "ask": r.get(f"{prefix}_ask_price"),
        "builtup": r.get(f"{prefix}_builtup"),
    }


def _parse_option_row(r: dict) -> dict:
    return {
        "strike": r.get("strike_price"),
        "expiry": r.get("expiry_date"),
        "ce": _parse_option_leg(r, "ce"),
        "pe": _parse_option_leg(r, "pe"),
        "pcr": r.get("pcr"),
    }


def _find_atm(spot: Optional[float], strikes: list) -> Optional[float]:
    if not (spot and strikes):
        return None
    return min(strikes, key=lambda s: abs(s - spot))


@api.get("/market/options")
async def options_chain(
    symbol: str = Query("NIFTY", description="NIFTY, BANKNIFTY, FINNIFTY, or stock symbol like RELIANCE"),
    above: int = Query(10, ge=1, le=30, description="Strikes above ATM"),
    below: int = Query(10, ge=1, le=30, description="Strikes below ATM"),
):
    """Live option chain (CE+PE) from niftytrader.in."""
    sym = symbol.upper().strip()
    key = f"oc:{sym}:{above}:{below}"
    cached = cache_get(key)
    if cached:
        return cached
    try:
        data = await http_get_json(
            f"{NT_OC}?symbol={sym}&exchange=nse&expiryDate=&atmBelow={below}&atmAbove={above}",
            timeout=18,
        )
    except Exception as e:
        raise HTTPException(502, f"Options source unavailable: {e}")

    rd = (data or {}).get("resultData") or {}
    rows = rd.get("opDatas") or []
    if not rows:
        raise HTTPException(404, f"No option chain for {sym}")

    spot = rows[0].get("index_close")
    expiry = rows[0].get("expiry_date")
    strikes = [r.get("strike_price") for r in rows if r.get("strike_price") is not None]
    atm = _find_atm(spot, strikes)
    parsed_rows = [_parse_option_row(r) for r in rows]
    totals = rd.get("opTotals") or {}

    response = {
        "symbol": sym,
        "spot": spot,
        "atm": atm,
        "expiry": expiry,
        "rows": parsed_rows,
        "totals": {
            "itm_calls_oi": (totals.get("itm_total_calls") or {}).get("itm_total_calls_oi"),
            "itm_puts_oi": (totals.get("itm_total_puts") or {}).get("itm_total_puts_oi"),
            "otm_calls_oi": (totals.get("otm_total_calls") or {}).get("otm_total_calls_oi"),
            "otm_puts_oi": (totals.get("otm_total_puts") or {}).get("otm_total_puts_oi"),
        },
        "source": "niftytrader.in",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    cache_set(key, response, ttl=30)
    return response


# ===================================================================
# IPO GMP
# ===================================================================
def _parse_gmp_value(gmp_raw: str) -> Optional[float]:
    m = re.search(r"-?\d+(?:\.\d+)?", gmp_raw.replace(",", ""))
    if not m:
        return None
    try:
        return float(m.group(0))
    except (ValueError, TypeError):
        return None


def _parse_ipo_row(headers: list, cells: list) -> Optional[dict]:
    if not cells or len(cells) < 3:
        return None
    rec: Dict[str, Any] = {}
    for i, h in enumerate(headers):
        if i < len(cells):
            rec[h] = cells[i]
    gmp_raw = rec.get("ipo gmp") or rec.get("gmp") or (cells[1] if len(cells) > 1 else "")
    return {
        "name": rec.get("ipo name") or rec.get("ipo") or cells[0],
        "gmp": gmp_raw,
        "gmp_value": _parse_gmp_value(gmp_raw),
        "price_band": rec.get("price band") or "",
        "est_listing": rec.get("est. listing") or rec.get("listing") or "",
        "date": rec.get("date") or "",
        "type": rec.get("type") or "",
        "status": rec.get("status") or "",
        "last_updated": rec.get("last updated") or "",
    }


def _parse_ipowatch(html: str) -> List[dict]:
    soup = BeautifulSoup(html, "lxml")
    tables = soup.find_all("table")
    if not tables:
        return []
    rows = tables[0].find_all("tr")
    if len(rows) < 2:
        return []
    headers = [h.get_text(strip=True).lower() for h in rows[0].find_all(["th", "td"])]
    out = []
    for row in rows[1:]:
        cells = [c.get_text(strip=True) for c in row.find_all(["td", "th"])]
        parsed = _parse_ipo_row(headers, cells)
        if parsed:
            out.append(parsed)
    return out


@api.get("/ipo/gmp")
async def ipo_gmp():
    cached = cache_get("ipo_gmp")
    if cached:
        return cached
    try:
        html = await http_get_text("https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/", timeout=18)
    except Exception as e:
        raise HTTPException(502, f"IPO source unavailable: {e}")
    items = _parse_ipowatch(html)
    response = {"source": "ipowatch.in", "items": items, "fetched_at": datetime.now(timezone.utc).isoformat()}
    cache_set("ipo_gmp", response, ttl=300)
    return response


# ===================================================================
# Emergent Google Auth
# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
# ===================================================================
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
SESSION_DAYS = 7


class SessionPayload(BaseModel):
    session_id: str


def _extract_session_token(request: Request) -> Optional[str]:
    """Pull session token from cookie or Authorization Bearer header."""
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:].strip()
    return token


def _is_session_expired(sess: dict) -> bool:
    exp = sess.get("expires_at")
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    return bool(exp and exp < datetime.now(timezone.utc))


async def get_current_user(request: Request) -> dict:
    """Read session_token from cookie or Authorization header."""
    token = _extract_session_token(request)
    if not token:
        raise HTTPException(401, "Not authenticated")
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        raise HTTPException(401, "Invalid session")
    if _is_session_expired(sess):
        raise HTTPException(401, "Session expired")
    user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


async def _exchange_emergent_session(session_id: str) -> dict:
    """Call Emergent auth endpoint to exchange session_id for user data."""
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": session_id})
    except Exception as e:
        raise HTTPException(502, f"Auth provider error: {e}")
    if r.status_code != 200:
        raise HTTPException(401, f"Emergent auth failed: {r.status_code}")
    return r.json()


async def _upsert_user(email: str, name: Optional[str], picture: Optional[str]) -> str:
    """Insert or update user record. Returns user_id."""
    now_iso = datetime.now(timezone.utc).isoformat()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture, "last_login": now_iso}},
        )
        return user_id
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    await db.users.insert_one({
        "user_id": user_id, "email": email, "name": name, "picture": picture,
        "created_at": now_iso, "last_login": now_iso,
    })
    return user_id


@api.post("/auth/session")
async def auth_session(payload: SessionPayload, response: Response):
    """Exchange Emergent session_id for app session cookie."""
    data = await _exchange_emergent_session(payload.session_id)
    email = data.get("email")
    if not email:
        raise HTTPException(401, "No email returned from auth")
    session_token = data.get("session_token")
    if not session_token:
        raise HTTPException(401, "No session_token returned")
    name = data.get("name")
    picture = data.get("picture")

    user_id = await _upsert_user(email, name, picture)
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=SESSION_DAYS * 24 * 3600,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    return {"user_id": user_id, "email": email, "name": name, "picture": picture}


@api.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user.get("name"),
        "picture": user.get("picture"),
    }


@api.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = _extract_session_token(request)
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie(key="session_token", path="/", samesite="none", secure=True)
    return {"ok": True}


# ===================================================================
# Per-user Watchlist
# ===================================================================
class WatchlistItem(BaseModel):
    symbol: str


@api.get("/watchlist")
async def watchlist_get(user: dict = Depends(get_current_user)):
    docs = await db.watchlists.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(200)
    syms = [d["symbol"] for d in docs]
    if not syms:
        return {"items": []}
    # Hydrate with live quotes
    cached_key = f"wl_quotes:{','.join(sorted(syms))}"
    cached = cache_get(cached_key)
    if cached:
        return {"items": cached}
    tasks = [fetch_yahoo_quote(s, "5m", "1d") for s in syms]
    results = await asyncio.gather(*tasks)
    items = []
    for s, d in zip(syms, results):
        if not d:
            items.append({"symbol": s, "error": "Not found"})
            continue
        items.append({
            "symbol": s, "name": d.get("name"),
            "price": d.get("price"), "previous_close": d.get("previous_close"),
            "change": d.get("change"), "change_pct": d.get("change_pct"),
            "day_high": d.get("day_high"), "day_low": d.get("day_low"),
        })
    cache_set(cached_key, items, ttl=20)
    return {"items": items}


@api.post("/watchlist")
async def watchlist_add(item: WatchlistItem, user: dict = Depends(get_current_user)):
    sym = item.symbol.strip().upper()
    if not sym:
        raise HTTPException(400, "Symbol required")
    existing = await db.watchlists.find_one({"user_id": user["user_id"], "symbol": sym})
    if existing:
        return {"ok": True, "symbol": sym, "already": True}
    await db.watchlists.insert_one({
        "user_id": user["user_id"], "symbol": sym,
        "added_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "symbol": sym}


@api.delete("/watchlist/{symbol}")
async def watchlist_remove(symbol: str, user: dict = Depends(get_current_user)):
    sym = symbol.upper().strip()
    res = await db.watchlists.delete_one({"user_id": user["user_id"], "symbol": sym})
    return {"ok": True, "deleted": res.deleted_count}


# ===================================================================
# Trading Ledger — generic CRUD per kind
# ===================================================================
LEDGER_KINDS = {
    "accounts", "swing", "options", "ipo", "mutualFunds",
    "expensesTrading", "expensesPersonal", "strategies", "journal",
}


@api.get("/ledger/{kind}")
async def ledger_list(kind: str, user: dict = Depends(get_current_user)):
    if kind not in LEDGER_KINDS:
        raise HTTPException(400, f"Unknown kind '{kind}'")
    docs = await db[f"ledger_{kind}"].find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return {"items": docs}


@api.post("/ledger/{kind}")
async def ledger_create(kind: str, payload: Dict[str, Any] = Body(...), user: dict = Depends(get_current_user)):
    if kind not in LEDGER_KINDS:
        raise HTTPException(400, f"Unknown kind '{kind}'")
    doc = {**payload}
    doc["id"] = str(uuid.uuid4())
    doc["user_id"] = user["user_id"]
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db[f"ledger_{kind}"].insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/ledger/{kind}/{item_id}")
async def ledger_update(kind: str, item_id: str, payload: Dict[str, Any] = Body(...), user: dict = Depends(get_current_user)):
    if kind not in LEDGER_KINDS:
        raise HTTPException(400, f"Unknown kind '{kind}'")
    payload.pop("_id", None)
    payload.pop("id", None)
    payload.pop("user_id", None)
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db[f"ledger_{kind}"].update_one(
        {"id": item_id, "user_id": user["user_id"]},
        {"$set": payload},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    doc = await db[f"ledger_{kind}"].find_one({"id": item_id, "user_id": user["user_id"]}, {"_id": 0})
    return doc


@api.delete("/ledger/{kind}/{item_id}")
async def ledger_delete(kind: str, item_id: str, user: dict = Depends(get_current_user)):
    if kind not in LEDGER_KINDS:
        raise HTTPException(400, f"Unknown kind '{kind}'")
    res = await db[f"ledger_{kind}"].delete_one({"id": item_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ===================================================================
# Register & CORS
# ===================================================================
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


@app.on_event("shutdown")
async def shutdown():
    mongo.close()
