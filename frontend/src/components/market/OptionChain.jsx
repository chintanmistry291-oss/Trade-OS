import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ChartArea, ChartPie, RefreshCw } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import axios, { API } from "@/lib/api";
import { fmt, fmtCompact } from "@/lib/format";

const OPTION_SYMBOLS = ["NIFTY", "BANKNIFTY", "FINNIFTY", "RELIANCE", "TCS", "HDFCBANK", "INFY", "SBIN"];

function useOptionChain(sym) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/market/options`, { params: { symbol: sym, above: 10, below: 10 } });
      setData(r.data);
    } catch (e) {
      console.error("options load failed", e);
      toast.error(`Options load failed: ${e.response?.data?.detail || e.message}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [sym]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);
  return { data, loading, reload: load };
}

function SymbolPicker({ sym, setSym, onRefresh, loading }) {
  return (
    <div className="card-wine p-5 mb-5 gradient-hero">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ChartArea size={16} style={{ color: "var(--gold)" }} />
            <h2 className="serif text-2xl">Live Option Chain</h2>
          </div>
          <p className="text-xs" style={{ color: "var(--inkSoft)" }}>
            Source: niftytrader.in · Refreshes every 30s
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {OPTION_SYMBOLS.map(s => (
            <button key={s} onClick={() => setSym(s)} data-testid={`oc-sym-${s}`}
                    className={sym === s ? "btn-primary" : "btn-ghost"}
                    style={{ fontSize: 11, padding: "5px 10px" }}>{s}</button>
          ))}
          <button onClick={onRefresh} className="btn-ghost" data-testid="oc-refresh">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCards({ data }) {
  const itmPcr = (data.totals.itm_calls_oi && data.totals.itm_puts_oi)
    ? fmt(data.totals.itm_puts_oi / data.totals.itm_calls_oi, 2)
    : "—";
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      <div className="card-wine p-4">
        <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--inkSoft)" }}>Spot</div>
        <div className="serif text-2xl mt-1">{fmt(data.spot)}</div>
      </div>
      <div className="card-wine p-4">
        <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--inkSoft)" }}>ATM Strike</div>
        <div className="serif text-2xl mt-1" style={{ color: "var(--gold)" }}>{fmt(data.atm, 0)}</div>
      </div>
      <div className="card-wine p-4">
        <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--inkSoft)" }}>Expiry</div>
        <div className="serif text-lg mt-1">
          {data.expiry ? new Date(data.expiry).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
        </div>
      </div>
      <div className="card-wine p-4">
        <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--inkSoft)" }}>OI PCR (ITM)</div>
        <div className="serif text-2xl mt-1">{itmPcr}</div>
      </div>
    </div>
  );
}

function OIChart({ rows }) {
  const oiChartData = (rows || []).map(r => ({
    strike: r.strike,
    callOI: r.ce.oi || 0,
    putOI: r.pe.oi || 0,
  }));
  return (
    <div className="card-wine p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="serif text-lg flex items-center gap-2"><ChartPie size={14} /> Open Interest by Strike</h3>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span style={{ background: "var(--profit)", width: 10, height: 10, display: "inline-block", borderRadius: 2 }} />
            Call OI
          </span>
          <span className="flex items-center gap-1">
            <span style={{ background: "var(--loss)", width: 10, height: 10, display: "inline-block", borderRadius: 2 }} />
            Put OI
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={oiChartData}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
          <XAxis dataKey="strike" stroke="var(--inkSoft)" fontSize={10} />
          <YAxis stroke="var(--inkSoft)" fontSize={10} tickFormatter={fmtCompact} />
          <Tooltip
            contentStyle={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }}
            formatter={v => fmtCompact(v)}
          />
          <Bar dataKey="callOI" fill="var(--profit)" />
          <Bar dataKey="putOI" fill="var(--loss)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function OptionRow({ row, isATM }) {
  return (
    <tr data-testid={`oc-row-${row.strike}`}
        style={{ background: isATM ? "var(--goldSoft)" : undefined, fontWeight: isATM ? 600 : 400 }}>
      <td className="mono">{fmtCompact(row.ce.oi)}</td>
      <td className={`mono ${(row.ce.change_oi ?? 0) >= 0 ? "tick-up" : "tick-down"}`}>{fmtCompact(row.ce.change_oi)}</td>
      <td className="mono">{fmtCompact(row.ce.volume)}</td>
      <td className="mono font-semibold">{fmt(row.ce.ltp)}</td>
      <td style={{ textAlign: "center", background: isATM ? "var(--gold)" : "var(--paper)", color: isATM ? "#fff" : "var(--ink)" }}
          className="font-bold mono">{fmt(row.strike, 0)}</td>
      <td className="mono font-semibold">{fmt(row.pe.ltp)}</td>
      <td className="mono">{fmtCompact(row.pe.volume)}</td>
      <td className={`mono ${(row.pe.change_oi ?? 0) >= 0 ? "tick-up" : "tick-down"}`}>{fmtCompact(row.pe.change_oi)}</td>
      <td className="mono">{fmtCompact(row.pe.oi)}</td>
    </tr>
  );
}

function OptionTable({ data }) {
  return (
    <div className="card-wine overflow-x-auto">
      <table className="tl" style={{ fontSize: 12 }}>
        <thead>
          <tr>
            <th colSpan="4" style={{ textAlign: "center", color: "var(--profit)" }}>CALLS</th>
            <th style={{ textAlign: "center" }}>STRIKE</th>
            <th colSpan="4" style={{ textAlign: "center", color: "var(--loss)" }}>PUTS</th>
          </tr>
          <tr>
            <th>OI</th><th>Chg OI</th><th>Vol</th><th>LTP</th>
            <th style={{ textAlign: "center" }}>Strike</th>
            <th>LTP</th><th>Vol</th><th>Chg OI</th><th>OI</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map(r => <OptionRow key={r.strike} row={r} isATM={r.strike === data.atm} />)}
        </tbody>
      </table>
    </div>
  );
}

export default function OptionChain() {
  const [sym, setSym] = useState("NIFTY");
  const { data, loading, reload } = useOptionChain(sym);
  return (
    <div className="fade-in" data-testid="options-section">
      <SymbolPicker sym={sym} setSym={setSym} onRefresh={reload} loading={loading} />
      {!data
        ? <div className="card-wine p-5"><div className="shimmer h-80 w-full" /></div>
        : <>
            <SummaryCards data={data} />
            <OIChart rows={data.rows} />
            <OptionTable data={data} />
          </>
      }
    </div>
  );
}
