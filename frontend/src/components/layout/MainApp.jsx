import { useState } from "react";
import { toast } from "sonner";
import axios, { API } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { useLiveMarket } from "@/hooks/useLiveMarket";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { NAV, LEDGER_KEYS, ledgerKindFromNav } from "@/components/layout/nav";
import MarketTicker from "@/components/market/MarketTicker";
import IndicesGrid from "@/components/market/IndicesGrid";
import MoversTable from "@/components/market/MoversTable";
import StockSearch from "@/components/market/StockSearch";
import Watchlist from "@/components/market/Watchlist";
import OptionChain from "@/components/market/OptionChain";
import IPOSection from "@/components/market/IPOSection";
import ChartModal from "@/components/market/ChartModal";
import LedgerSection from "@/components/ledger/LedgerSection";

function HeroBanner() {
  return (
    <div className="card-wine p-6 gradient-hero">
      <div className="text-[11px] uppercase tracking-widest font-bold mb-2" style={{ color: "var(--inkSoft)" }}>
        Welcome to Trade OS
      </div>
      <h1 className="serif text-3xl md:text-4xl leading-tight mb-2">Your personal trading desk.</h1>
      <p className="text-sm max-w-xl" style={{ color: "var(--inkSoft)" }}>
        Live Nifty, Sensex, BankNifty, full option chain, IPO GMP &amp; complete trading ledger — all in one place.
      </p>
    </div>
  );
}

function MobileNav({ active, onSelect }) {
  return (
    <div className="md:hidden flex gap-2 mb-4 overflow-x-auto pb-2">
      {NAV.map(n => (
        <button key={n.k} onClick={() => onSelect(n.k)} data-testid={`mnav-${n.k}`}
                className={active === n.k ? "btn-primary" : "btn-ghost"}
                style={{ fontSize: 11, whiteSpace: "nowrap" }}>
          {n.label}
        </button>
      ))}
    </div>
  );
}

function ActiveView({ active, indices, movers, onSelect }) {
  if (active === "overview") {
    return (
      <div className="fade-in space-y-5" data-testid="overview-section">
        <HeroBanner />
        <IndicesGrid indices={indices} onSelect={onSelect} />
        <MoversTable movers={movers} onSelect={onSelect} />
      </div>
    );
  }
  if (active === "indices") {
    return (
      <div className="fade-in">
        <h2 className="serif text-2xl mb-4">Major Indices</h2>
        <IndicesGrid indices={indices} onSelect={onSelect} />
      </div>
    );
  }
  if (active === "stocks") {
    const handleAdd = async (sym) => {
      try {
        await axios.post(`${API}/watchlist`, { symbol: sym });
        toast.success(`${sym} added to watchlist`);
      } catch (e) {
        console.error("watchlist add failed", e);
        toast.error("Add failed");
      }
    };
    return (
      <div className="fade-in" data-testid="stocks-section">
        <h2 className="serif text-2xl mb-4">Stock Lookup</h2>
        <StockSearch onSelect={onSelect} onAdd={handleAdd} />
        <Watchlist onSelect={onSelect} />
      </div>
    );
  }
  if (active === "watchlist") {
    return (
      <div className="fade-in">
        <h2 className="serif text-2xl mb-4">My Watchlist</h2>
        <Watchlist onSelect={onSelect} />
      </div>
    );
  }
  if (active === "movers") {
    return (
      <div className="fade-in">
        <h2 className="serif text-2xl mb-4">Top Gainers &amp; Losers</h2>
        <MoversTable movers={movers} onSelect={onSelect} />
      </div>
    );
  }
  if (active === "options") return <OptionChain />;
  if (active === "ipo") return <IPOSection />;
  if (LEDGER_KEYS.has(active)) return <LedgerSection kind={ledgerKindFromNav(active)} />;
  return null;
}

export default function MainApp() {
  const { theme, toggle } = useTheme();
  const [active, setActive] = useState("overview");
  const [chartSym, setChartSym] = useState(null);
  const { indices, movers, fetchedAt, refresh } = useLiveMarket();

  return (
    <div className="App flex" data-testid="app-root">
      <Sidebar active={active} onSelect={setActive} />
      <main className="flex-1 p-4 md:p-7 min-w-0" data-testid="main-content">
        <Header theme={theme} onToggleTheme={toggle} onRefresh={refresh} fetchedAt={fetchedAt} />
        <MarketTicker indices={indices} />
        <MobileNav active={active} onSelect={setActive} />
        <ActiveView active={active} indices={indices} movers={movers} onSelect={setChartSym} />
      </main>
      {chartSym && <ChartModal symbol={chartSym} onClose={() => setChartSym(null)} />}
    </div>
  );
}
