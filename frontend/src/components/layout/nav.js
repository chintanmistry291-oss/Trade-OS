import {
  LayoutDashboard, ChartArea, Search, Wallet, Activity, ChartPie, Sparkles,
  TrendingUp, Receipt, BookOpen, PenLine, Target, BarChart2, PieChart
} from "lucide-react";

export const NAV = [
  // --- LIVE MARKET ---
  { k: "overview", label: "Overview", icon: LayoutDashboard, group: "market" },
  { k: "indices", label: "Indices", icon: ChartArea, group: "market" },
  { k: "stocks", label: "Stocks", icon: Search, group: "market" },
  { k: "watchlist", label: "Watchlist", icon: Wallet, group: "market" },
  { k: "movers", label: "Movers", icon: Activity, group: "market" },
  { k: "options", label: "Option Chain", icon: ChartPie, group: "market" },
  { k: "ipo", label: "IPO Pulse", icon: Sparkles, group: "market" },

  /// --- TRADING LEDGER (Your Old Menu Options) ---
  { k: "accounts", label: "Capital", icon: Wallet, group: "ledger" },
  { k: "swing", label: "Swing", icon: TrendingUp, group: "ledger" },
  { k: "mutualFunds", label: "Mutual Funds", icon: PieChart, group: "ledger" },
  { k: "ledger_options", label: "Options", icon: Target, group: "ledger" },
  { k: "expensesTrading", label: "Expenses", icon: Receipt, group: "ledger" },
  // { k: "pnl", label: "P&L", icon: BarChart2, group: "ledger" },
  { k: "strategies", label: "Playbook", icon: BookOpen, group: "ledger" },
  { k: "journal", label: "Journal", icon: PenLine, group: "ledger" },
];
export const LEDGER_KEYS = new Set([
  "accounts", "swing", "ledger_options", "mutualFunds",
  "expensesTrading", "strategies", "journal",
]);

export function ledgerKindFromNav(navKey) {
  return navKey === "ledger_options" ? "options" : navKey;
}