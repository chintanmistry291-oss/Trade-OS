import { useState, useEffect, useMemo } from "react";
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

// --- જૂનો ડેશબોર્ડ કોડ (તમારે આ જ જોઈતું હતું) ---
const fmt = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
function StatCard({ label, value, tone = "ink" }) {
  return (
    <div style={{ background: "var(--card)", borderRadius: 16, padding: "20px", border: "1px solid var(--line)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--inkSoft)", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function DashboardView({ data }) {
  const totalCapital = (data.accounts || []).reduce((s, a) => s + Number(a.balance || 0), 0);
  return (
    <div className="space-y-6">
      <h2 className="serif text-2xl">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard label="Total Capital" value={fmt(totalCapital)} />
      </div>
    </div>
  );
}

// --- મુખ્ય એપ લોજિક ---
function ActiveView({ active, indices, movers, onSelect, data, setData }) {
  if (active === "dashboard") return <DashboardView data={data} />;
  if (active === "overview") {
    return (
      <div className="fade-in space-y-5">
        <div className="card-wine p-6 gradient-hero">
          <h1 className="serif text-3xl">Your personal trading desk.</h1>
        </div>
        <IndicesGrid indices={indices} onSelect={onSelect} />
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
  const [data, setData] = useState({});
  const { indices, movers, fetchedAt, refresh } = useLiveMarket();

  useEffect(() => {
    // JSONBin માંથી ડેટા લોડ કરો
    const BIN_ID = process.env.REACT_APP_BIN_ID;
    const MASTER_KEY = process.env.REACT_APP_MASTER_KEY;
    if (BIN_ID) {
      fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } })
        .then(res => res.json())
        .then(json => json.record && setData(json.record))
        .catch(e => console.error("Cloud sync failed", e));
    }
  }, []);

  return (
    <div className="App flex" data-testid="app-root">
      <Sidebar active={active} onSelect={setActive} />
      <main className="flex-1 p-4 md:p-7 min-w-0">
        <Header theme={theme} onToggleTheme={toggle} onRefresh={refresh} fetchedAt={fetchedAt} />
        <MarketTicker indices={indices} />
        <ActiveView 
            active={active} 
            indices={indices} 
            movers={movers} 
            onSelect={setChartSym} 
            data={data} 
            setData={setData} 
        />
      </main>
      {chartSym && <ChartModal symbol={chartSym} onClose={() => setChartSym(null)} />}
    </div>
  );
}