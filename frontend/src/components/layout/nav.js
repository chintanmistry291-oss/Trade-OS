import {
  LayoutDashboard, ChartArea, Search, Wallet, Activity, ChartPie, Sparkles,
  TrendingUp, Receipt, BookOpen, PenLine,
} from "lucide-react";

export const NAV = [
  { k: "overview", label: "Overview", icon: LayoutDashboard, group: "market" },
  { k: "indices", label: "Indices", icon: ChartArea, group: "market" },
  { k: "stocks", label: "Stocks", icon: Search, group: "market" },
  { k: "watchlist", label: "Watchlist", icon: Wallet, group: "market" },
  { k: "movers", label: "Movers", icon: Activity, group: "market" },
  { k: "options", label: "Option Chain", icon: ChartPie, group: "market" },
  { k: "ipo", label: "IPO Pulse", icon: Sparkles, group: "market" },
  { k: "accounts", label: "Capital", icon: Wallet, group: "ledger" },
  { k: "swing", label: "Swing", icon: TrendingUp, group: "ledger" },
  { k: "ledger_options", label: "Options Log", icon: ChartArea, group: "ledger" },
  { k: "mutualFunds", label: "Mutual Funds", icon: ChartPie, group: "ledger" },
  { k: "expensesTrading", label: "Trade Expenses", icon: Receipt, group: "ledger" },
  { k: "expensesPersonal", label: "Personal Expenses", icon: Receipt, group: "ledger" },
  { k: "strategies", label: "Playbook", icon: BookOpen, group: "ledger" },
  { k: "journal", label: "Journal", icon: PenLine, group: "ledger" },
];

export const LEDGER_KEYS = new Set([
  "accounts", "swing", "ledger_options", "mutualFunds",
  "expensesTrading", "expensesPersonal", "strategies", "journal",
]);

export function ledgerKindFromNav(navKey) {
  return navKey === "ledger_options" ? "options" : navKey;
}
