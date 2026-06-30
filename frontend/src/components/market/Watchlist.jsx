import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Wallet, RefreshCw, X } from "lucide-react";
import axios, { API } from "@/lib/api";
import { fmt, fmtSigned } from "@/lib/format";

function WatchlistRow({ q, onSelect, onRemove }) {
  if (q.error) {
    return (
      <tr key={q.symbol}>
        <td className="font-semibold mono">{q.symbol}</td>
        <td colSpan="4" style={{ color: "var(--loss)" }}>Not found</td>
        <td><button onClick={() => onRemove(q.symbol)} className="btn-ghost"><X size={12} /></button></td>
      </tr>
    );
  }
  const up = (q.change_pct ?? 0) >= 0;
  return (
    <tr style={{ cursor: "pointer" }} data-testid={`watch-row-${q.symbol}`}>
      <td onClick={() => onSelect(q.symbol)}>
        <div className="font-semibold text-[13px]">{q.symbol.replace(".NS", "")}</div>
        <div className="text-[10.5px]" style={{ color: "var(--inkSoft)" }}>{q.name?.slice(0, 26)}</div>
      </td>
      <td className="mono font-semibold" onClick={() => onSelect(q.symbol)}>{fmt(q.price)}</td>
      <td className={`mono ${up ? "tick-up" : "tick-down"}`} onClick={() => onSelect(q.symbol)}>
        {fmtSigned(q.change, 2)}
      </td>
      <td onClick={() => onSelect(q.symbol)}>
        <span className={`chip ${up ? "chip-up" : "chip-down"}`}>{fmtSigned(q.change_pct, 2)}%</span>
      </td>
      <td className="text-[11px] mono" onClick={() => onSelect(q.symbol)} style={{ color: "var(--inkSoft)" }}>
        {fmt(q.day_low)} – {fmt(q.day_high)}
      </td>
      <td>
        <button onClick={() => onRemove(q.symbol)} className="btn-ghost" style={{ padding: 4 }}
                data-testid={`watch-remove-${q.symbol}`}>
          <X size={12} />
        </button>
      </td>
    </tr>
  );
}

function useWatchlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/watchlist`);
      setItems(r.data.items || []);
    } catch (e) {
      console.error("watchlist load failed", e);
      toast.error("Watchlist load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const add = useCallback(async (sym) => {
    const v = (sym || "").trim().toUpperCase();
    if (!v) return;
    try {
      const r = await axios.post(`${API}/watchlist`, { symbol: v });
      if (r.data.already) toast.info(`${v} already in watchlist`);
      else toast.success(`Added ${v}`);
      load();
    } catch (e) {
      console.error("watchlist add failed", e);
      toast.error("Add failed");
    }
  }, [load]);

  const remove = useCallback(async (sym) => {
    try {
      await axios.delete(`${API}/watchlist/${encodeURIComponent(sym)}`);
      load();
    } catch (e) {
      console.error("watchlist remove failed", e);
      toast.error("Remove failed");
    }
  }, [load]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  return { items, loading, add, remove, refresh: load };
}

export default function Watchlist({ onSelect }) {
  const { items, loading, add, remove, refresh } = useWatchlist();
  const [addSym, setAddSym] = useState("");

  const handleAdd = () => {
    add(addSym);
    setAddSym("");
  };

  return (
    <div className="card-wine overflow-hidden" data-testid="watchlist">
      <div className="p-4 border-b flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-center gap-2">
          <Wallet size={16} style={{ color: "var(--wine700)" }} />
          <h3 className="serif text-lg">My Watchlist</h3>
          <span className="chip chip-neutral">{items.length}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input value={addSym} onChange={e => setAddSym(e.target.value.toUpperCase())}
                 onKeyDown={e => e.key === "Enter" && handleAdd()}
                 placeholder="e.g. ADANIENT.NS" className="input-base"
                 style={{ width: 180, padding: "6px 10px", fontSize: 12 }}
                 data-testid="watchlist-add-input" />
          <button onClick={handleAdd} className="btn-primary" style={{ fontSize: 12 }} data-testid="watchlist-add-btn">Add</button>
          <button onClick={refresh} className="btn-ghost" data-testid="watchlist-refresh">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="tl">
          <thead>
            <tr><th>Symbol</th><th>Price</th><th>Change</th><th>%</th><th>Day Range</th><th></th></tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr><td colSpan="6" style={{ textAlign: "center", padding: 24, color: "var(--inkSoft)" }}>
                Add a symbol to begin tracking
              </td></tr>
            )}
            {items.map(q => (
              <WatchlistRow key={q.symbol} q={q} onSelect={onSelect} onRemove={remove} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
