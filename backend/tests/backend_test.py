"""Trade OS backend integration tests.

Covers:
- Market endpoints (indices, quote, history, movers, search, options)
- IPO GMP scraping
- Emergent Google Auth (Bearer token via pre-seeded session)
- Watchlist CRUD (per-user)
- Trading Ledger CRUD (per-user)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://code-review-session.preview.emergentagent.com").rstrip("/")
TOKEN = os.environ.get("TEST_SESSION_TOKEN", "chintan_test_session_2026")


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {TOKEN}"})
    return s


# ----------------- Market (public) -----------------
class TestMarket:
    def test_indices(self, client):
        r = client.get(f"{BASE_URL}/api/market/indices", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "indices" in data
        indices = data["indices"]
        assert len(indices) >= 4, f"Expected >=4 indices, got {len(indices)}"
        for i in indices[:4]:
            assert "price" in i and i["price"] is not None
            assert "change" in i
            assert "change_pct" in i

    def test_quote_multi(self, client):
        r = client.get(f"{BASE_URL}/api/market/quote?symbols=RELIANCE.NS,TCS.NS", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data["quotes"]) == 2
        for q in data["quotes"]:
            assert "symbol" in q
            assert q.get("price") is not None, f"Missing price for {q.get('symbol')}"

    def test_history(self, client):
        r = client.get(f"{BASE_URL}/api/market/history?symbol=^NSEI&range=1mo&interval=1d", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "candles" in data
        assert len(data["candles"]) > 5

    def test_movers(self, client):
        r = client.get(f"{BASE_URL}/api/market/movers", timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "gainers" in data and "losers" in data
        assert len(data["gainers"]) == 5
        assert len(data["losers"]) == 5

    def test_search(self, client):
        r = client.get(f"{BASE_URL}/api/market/search?q=reliance", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data["results"]) >= 1
        assert "symbol" in data["results"][0]

    def test_options_nifty(self, client):
        r = client.get(f"{BASE_URL}/api/market/options?symbol=NIFTY&above=5&below=5", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["symbol"] == "NIFTY"
        assert data.get("spot") is not None
        assert data.get("atm") is not None
        assert data.get("expiry") is not None
        rows = data.get("rows") or []
        assert len(rows) >= 5
        first = rows[0]
        assert "ce" in first and "pe" in first
        assert "ltp" in first["ce"] and "oi" in first["ce"]
        assert "ltp" in first["pe"] and "oi" in first["pe"]

    def test_options_banknifty(self, client):
        r = client.get(f"{BASE_URL}/api/market/options?symbol=BANKNIFTY", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["symbol"] == "BANKNIFTY"
        assert len(data.get("rows") or []) > 0


# ----------------- IPO -----------------
class TestIPO:
    def test_ipo_gmp(self, client):
        r = client.get(f"{BASE_URL}/api/ipo/gmp", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        items = data.get("items") or []
        assert len(items) >= 5, f"Expected >=5 IPO items, got {len(items)}"
        first = items[0]
        assert "name" in first
        assert "gmp" in first
        assert "status" in first


# ----------------- Auth -----------------
class TestAuth:
    def test_me_unauthenticated(self, client):
        r = client.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_with_bearer(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == "chintan.test@trade-os.in"
        assert data["user_id"] == "user_chintantest1"


# ----------------- Watchlist -----------------
class TestWatchlist:
    def test_add_get_delete(self, auth_client):
        # Cleanup pre
        auth_client.delete(f"{BASE_URL}/api/watchlist/ADANIENT.NS", timeout=15)
        # Add
        r = auth_client.post(f"{BASE_URL}/api/watchlist", json={"symbol": "ADANIENT.NS"}, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") == True
        # Get
        r = auth_client.get(f"{BASE_URL}/api/watchlist", timeout=60)
        assert r.status_code == 200, r.text
        items = r.json().get("items") or []
        syms = [i["symbol"] for i in items]
        assert "ADANIENT.NS" in syms
        found = next(i for i in items if i["symbol"] == "ADANIENT.NS")
        assert "price" in found
        # Delete
        r = auth_client.delete(f"{BASE_URL}/api/watchlist/ADANIENT.NS", timeout=15)
        assert r.status_code == 200, r.text
        assert r.json().get("deleted", 0) >= 1


# ----------------- Ledger -----------------
class TestLedger:
    swing_id = None
    accounts_id = None
    journal_id = None

    def test_swing_create(self, auth_client):
        payload = {
            "symbol": "INFY", "qty": 100, "buy_price": 1500,
            "sell_price": 1550, "buy_date": "2026-06-20",
        }
        r = auth_client.post(f"{BASE_URL}/api/ledger/swing", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert "id" in doc
        assert doc["symbol"] == "INFY"
        TestLedger.swing_id = doc["id"]

    def test_swing_list(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/ledger/swing", timeout=15)
        assert r.status_code == 200
        items = r.json().get("items") or []
        ids = [i.get("id") for i in items]
        assert TestLedger.swing_id in ids

    def test_swing_delete(self, auth_client):
        r = auth_client.delete(f"{BASE_URL}/api/ledger/swing/{TestLedger.swing_id}", timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") == True

    def test_accounts_create(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/ledger/accounts",
                             json={"name": "TEST_account", "balance": 100000}, timeout=15)
        assert r.status_code == 200, r.text
        TestLedger.accounts_id = r.json()["id"]

    def test_journal_create(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/ledger/journal",
                             json={"title": "TEST_journal", "mood": "good", "entry": "test"}, timeout=15)
        assert r.status_code == 200, r.text
        TestLedger.journal_id = r.json()["id"]

    def test_expensesTrading_create(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/ledger/expensesTrading",
                             json={"category": "TEST_brokerage", "amount": 50}, timeout=15)
        assert r.status_code == 200, r.text
        item_id = r.json()["id"]
        # cleanup
        auth_client.delete(f"{BASE_URL}/api/ledger/expensesTrading/{item_id}", timeout=15)

    def test_cleanup_ledger(self, auth_client):
        if TestLedger.accounts_id:
            auth_client.delete(f"{BASE_URL}/api/ledger/accounts/{TestLedger.accounts_id}", timeout=15)
        if TestLedger.journal_id:
            auth_client.delete(f"{BASE_URL}/api/ledger/journal/{TestLedger.journal_id}", timeout=15)
