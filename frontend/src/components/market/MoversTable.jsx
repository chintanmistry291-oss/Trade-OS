import { TrendingUp, TrendingDown } from "lucide-react";
import { fmt, fmtSigned } from "@/lib/format";

function MoverSection({ title, rows, up, onSelect }) {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return (
      <div className="card-wine p-5">
        <h3 className="serif text-lg mb-2">{title}</h3>
        <div className="shimmer h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="card-wine overflow-hidden" data-testid={up ? "gainers-section" : "losers-section"}>
      <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: "var(--line)" }}>
        {up
          ? <TrendingUp size={16} style={{ color: "var(--profit)" }} />
          : <TrendingDown size={16} style={{ color: "var(--loss)" }} />}
        <h3 className="serif text-lg">{title}</h3>
      </div>
      <table className="tl">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Price</th>
            <th style={{ textAlign: "right" }}>Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr 
              key={r.symbol} 
              onClick={() => onSelect(r.symbol)}
              style={{ cursor: "pointer" }} 
              data-testid={`mover-${r.symbol}`}
            >
              <td>
                <div className="font-semibold text-[13px]">
                  {r.symbol?.replace(".NS", "") || "N/A"}
                </div>
                <div className="text-[10.5px]" style={{ color: "var(--inkSoft)" }}>
                  {r.name?.slice(0, 28) || "Unknown"}
                </div>
              </td>
              <td className="mono">{fmt(r.price)}</td>
              <td style={{ textAlign: "right" }}>
                <span className={`chip ${r.change_pct >= 0 ? "chip-up" : "chip-down"}`}>
                  {fmtSigned(r.change_pct, 2)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MoversTable({ movers, onSelect }) {
  if (!movers) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card-wine p-5"><div className="shimmer h-40 w-full" /></div>
        <div className="card-wine p-5"><div className="shimmer h-40 w-full" /></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <MoverSection 
        title="Top Gainers" 
        rows={movers.gainers} 
        up={true} 
        onSelect={onSelect} 
      />
      <MoverSection 
        title="Top Losers" 
        rows={movers.losers} 
        up={false} 
        onSelect={onSelect} 
      />
    </div>
  );
}