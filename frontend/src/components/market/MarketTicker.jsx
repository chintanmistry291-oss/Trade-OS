import { fmt, fmtSigned } from "@/lib/format";

export default function MarketTicker({ indices }) {
  if (!indices?.length) {
    return (
      <div className="card-wine px-4 py-3 mb-5" data-testid="ticker-loading">
        <div className="shimmer h-5 w-full" />
      </div>
    );
  }
  const items = [...indices, ...indices];
  return (
    <div className="card-wine mb-5 overflow-hidden" data-testid="market-ticker">
      <div className="flex items-center gap-3 px-4 py-2 border-b" style={{ borderColor: "var(--line)" }}>
        <span className="pulse-dot" />
        <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--inkSoft)" }}>
          Live · Yahoo Finance · refreshing every 30s
        </span>
      </div>
      <div className="overflow-hidden whitespace-nowrap py-2">
        <div className="animate-marquee">
          <div className="tick-row px-4">
            {items.map((i, idx) => {
              const up = (i.change_pct ?? 0) >= 0;
              return (
                <span className="tick-item" key={`${i.symbol}-${idx}`}>
                  <span className="tick-name">{i.display_name}</span>
                  <span className="tick-price">{fmt(i.price)}</span>
                  <span className={`tick-change ${up ? "tick-up" : "tick-down"}`}>
                    {fmtSigned(i.change, 2)} ({fmtSigned(i.change_pct, 2)}%)
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
