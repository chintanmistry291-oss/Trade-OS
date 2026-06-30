import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import axios, { API } from "@/lib/api";
import { fmt, fmtSigned } from "@/lib/format";

const RANGES = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "5y"];

function intervalForRange(range) {
  if (range === "1d") return "5m";
  if (range === "5d") return "15m";
  return "1d";
}

function useChartData(symbol, range) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setLoading(true);
    const interval = intervalForRange(range);
    axios.get(`${API}/market/history`, { params: { symbol, range, interval } })
      .then(r => { if (!cancelled) setData(r.data); })
      .catch(e => {
        if (cancelled) return;
        console.error("history fetch failed", e);
        toast.error(`Chart load failed: ${e.response?.data?.detail || e.message}`);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, range]);
  return { data, loading };
}

function ChartHeader({ data, onClose }) {
  const up = (data?.change_pct ?? 0) >= 0;
  return (
    <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: "var(--line)" }}>
      <div>
        <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--inkSoft)" }}>
          {data?.name || ""}
        </div>
        <div className="serif text-3xl mt-1">{fmt(data?.price)}</div>
        <div className={`text-sm mono mt-1 ${up ? "tick-up" : "tick-down"}`}>
          {fmtSigned(data?.change, 2)} ({fmtSigned(data?.change_pct, 2)}%)
        </div>
      </div>
      <button onClick={onClose} className="btn-ghost" data-testid="chart-close">
        <X size={16} />
      </button>
    </div>
  );
}

function RangePicker({ range, setRange }) {
  return (
    <div className="flex gap-2 px-5 pt-4 flex-wrap">
      {RANGES.map(r => (
        <button key={r} onClick={() => setRange(r)} data-testid={`range-${r}`}
                className={range === r ? "btn-primary" : "btn-ghost"}
                style={{ fontSize: "11px", padding: "5px 11px" }}>
          {r.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function PriceChart({ data }) {
  const up = (data?.change_pct ?? 0) >= 0;
  const chartData = (data?.candles || []).map(c => ({
    t: new Date(c.t * 1000).toLocaleString("en-IN", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    }),
    price: c.c,
  }));
  if (chartData.length === 0) {
    return <div className="text-center py-16" style={{ color: "var(--inkSoft)" }}>No data</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={380}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={up ? "var(--profit)" : "var(--loss)"} stopOpacity={0.35} />
            <stop offset="100%" stopColor={up ? "var(--profit)" : "var(--loss)"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
        <XAxis dataKey="t" stroke="var(--inkSoft)" fontSize={10} minTickGap={40} />
        <YAxis stroke="var(--inkSoft)" fontSize={10} domain={["auto", "auto"]} />
        <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }} />
        <Area type="monotone" dataKey="price" stroke={up ? "var(--profit)" : "var(--loss)"} strokeWidth={2} fill="url(#grad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function ChartModal({ symbol, onClose }) {
  const [range, setRange] = useState("1mo");
  const { data, loading } = useChartData(symbol, range);
  if (!symbol) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: "rgba(0,0,0,.55)" }} onClick={onClose} data-testid="chart-modal">
      <div className="card-wine w-full max-w-4xl max-h-[90vh] overflow-auto"
           onClick={e => e.stopPropagation()} style={{ background: "var(--card)" }}>
        <ChartHeader data={data} onClose={onClose} />
        <RangePicker range={range} setRange={setRange} />
        <div className="p-5">
          {loading ? <div className="shimmer h-80 w-full" /> : <PriceChart data={data} />}
        </div>
      </div>
    </div>
  );
}
