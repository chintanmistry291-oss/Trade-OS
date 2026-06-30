import { NAV } from "./nav";

function SidebarBtn({ n, active, onSelect }) {
  const Icon = n.icon;
  return (
    <button onClick={() => onSelect(n.k)} data-testid={`nav-${n.k}`}
            className="w-full text-left px-3 py-2 my-0.5 rounded-lg flex items-center gap-2.5 text-[13px] transition"
            style={{
              background: active === n.k ? "var(--wine700)" : "transparent",
              color: active === n.k ? "#fff" : "var(--ink)",
              fontWeight: active === n.k ? 600 : 500,
            }}>
      <Icon size={14} />
      {n.label}
    </button>
  );
}

export default function Sidebar({ active, onSelect }) {
  const marketItems = NAV.filter(n => n.group === "market");
  const ledgerItems = NAV.filter(n => n.group === "ledger");
  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r p-3 overflow-y-auto"
           style={{
             background: "var(--card)", borderColor: "var(--line)",
             minHeight: "100vh", maxHeight: "100vh", position: "sticky", top: 0,
           }}>
      <div className="px-2 py-3 mb-1 border-b" style={{ borderColor: "var(--line)" }}>
        <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--inkSoft)" }}>
          Live Market
        </div>
      </div>
      {marketItems.map(n => <SidebarBtn key={n.k} n={n} active={active} onSelect={onSelect} />)}
      <div className="px-2 py-3 mt-2 mb-1 border-t border-b" style={{ borderColor: "var(--line)" }}>
        <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--inkSoft)" }}>
          Trading Ledger
        </div>
      </div>
      {ledgerItems.map(n => <SidebarBtn key={n.k} n={n} active={active} onSelect={onSelect} />)}
      <div className="mt-auto pt-3 text-[10px]" style={{ color: "var(--inkSoft)" }}>
        Yahoo delayed ~15min. For informational use only.
      </div>
    </aside>
  );
}
