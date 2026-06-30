import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { fmt, fmtSigned } from "@/lib/format";

function IndexCard({ idx, onSelect }) {
  const up = (idx.change_pct ?? 0) >= 0;
  return (
    <button
      onClick={() => onSelect(idx.symbol)}
      data-testid={`index-card-${idx.symbol}`}
      className="card-wine p-5 text-left hover:shadow-lg transition fade-in"
      style={{ borderLeft: `3px solid ${up ? "var(--profit)" : "var(--loss)"}` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--inkSoft)" }}>
            {idx.display_name}
          </div>
          <div className="text-[10px] mono mt-0.5" style={{ color: "var(--inkSoft)" }}>{idx.symbol}</div>
        </div>
        <span className={`chip ${up ? "chip-up" : "chip-down"}`}>
          {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {fmtSigned(idx.change_pct, 2)}%
        </span>
      </div>
      <div className="serif text-3xl font-semibold mb-1">{fmt(idx.price)}</div>
      <div className="text-xs mono" style={{ color: up ? "var(--profit)" : "var(--loss)" }}>
        {fmtSigned(idx.change, 2)} today
      </div>
      <div className="flex justify-between mt-3 pt-3 border-t text-[11px]"
           style={{ borderColor: "var(--line)", color: "var(--inkSoft)" }}>
        <span>H: <span className="mono" style={{ color: "var(--ink)" }}>{fmt(idx.day_high)}</span></span>
        <span>L: <span className="mono" style={{ color: "var(--ink)" }}>{fmt(idx.day_low)}</span></span>
        <span>Prev: <span className="mono" style={{ color: "var(--ink)" }}>{fmt(idx.previous_close)}</span></span>
      </div>
    </button>
  );
}

export default function IndicesGrid({ indices, onSelect }) {
  if (!indices?.length) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`skeleton-${i}`} className="card-wine p-5" data-testid="indices-loading">
            <div className="shimmer h-4 w-24 mb-3" />
            <div className="shimmer h-8 w-32 mb-2" />
            <div className="shimmer h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="indices-grid">
      {indices.map(i => <IndexCard key={i.symbol} idx={i} onSelect={onSelect} />)}
    </div>
  );
}
