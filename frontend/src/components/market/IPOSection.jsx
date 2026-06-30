import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Sparkles, RefreshCw } from "lucide-react";
import axios, { API } from "@/lib/api";

const FILTERS = ["all", "open", "upcoming", "listing"];

function IpoRow({ ipo }) {
  const gmpUp = (ipo.gmp_value ?? 0) > 0;
  const status = (ipo.status || "").toLowerCase();
  const statusChip = status.includes("open") ? "chip-up"
    : status.includes("listing") ? "chip-gold" : "chip-neutral";
  return (
    <tr data-testid={`ipo-row-${ipo.name}`}>
      <td className="font-semibold">{ipo.name}</td>
      <td>
        <span className={`chip ${gmpUp ? "chip-up" : ipo.gmp_value === 0 ? "chip-neutral" : "chip-down"}`}>
          {ipo.gmp}
        </span>
      </td>
      <td className="mono">{ipo.price_band}</td>
      <td className="mono" style={{ color: gmpUp ? "var(--profit)" : "var(--inkSoft)" }}>
        {ipo.est_listing}
      </td>
      <td className="text-xs">{ipo.date}</td>
      <td><span className="chip chip-neutral">{ipo.type}</span></td>
      <td><span className={`chip ${statusChip}`}>{ipo.status}</span></td>
    </tr>
  );
}

export default function IPOSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/ipo/gmp`);
      setData(r.data);
    } catch (e) {
      console.error("IPO load failed", e);
      toast.error("IPO data unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <div className="card-wine p-5"><div className="shimmer h-64 w-full" /></div>;
  if (!data?.items?.length) {
    return <div className="card-wine p-8 text-center" style={{ color: "var(--inkSoft)" }}>No IPO data right now.</div>;
  }

  const filtered = data.items.filter(i =>
    filter === "all" ? true : (i.status || "").toLowerCase().includes(filter)
  );

  return (
    <div className="fade-in" data-testid="ipo-section">
      <div className="card-wine p-5 mb-5 gradient-hero">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} style={{ color: "var(--gold)" }} />
              <h2 className="serif text-2xl">IPO Pulse — Live GMP</h2>
            </div>
            <p className="text-xs" style={{ color: "var(--inkSoft)" }}>
              Source: {data.source} · Fetched {new Date(data.fetched_at).toLocaleTimeString("en-IN")}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                      className={filter === f ? "btn-primary" : "btn-ghost"}
                      style={{ fontSize: 11, padding: "5px 11px", textTransform: "capitalize" }}
                      data-testid={`ipo-filter-${f}`}>{f}</button>
            ))}
            <button onClick={load} className="btn-ghost" data-testid="ipo-refresh"><RefreshCw size={13} /></button>
          </div>
        </div>
      </div>
      <div className="card-wine overflow-x-auto">
        <table className="tl">
          <thead>
            <tr>
              <th>IPO</th><th>GMP</th><th>Price Band</th><th>Est. Listing</th>
              <th>Date</th><th>Type</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(ipo => <IpoRow key={ipo.name} ipo={ipo} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
