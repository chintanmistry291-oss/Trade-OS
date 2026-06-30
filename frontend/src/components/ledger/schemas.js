import {
  Wallet, TrendingUp, ChartArea, ChartPie, Receipt, BookOpen, PenLine,
} from "lucide-react";

export const LEDGER_SCHEMAS = {
  accounts: {
    label: "Capital Accounts", icon: Wallet,
    fields: [
      { key: "name", label: "Account Name", type: "text", required: true },
      { key: "broker", label: "Broker", type: "text" },
      { key: "balance", label: "Balance (₹)", type: "number" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  swing: {
    label: "Swing Trades", icon: TrendingUp,
    fields: [
      { key: "symbol", label: "Symbol", type: "text", required: true },
      { key: "qty", label: "Quantity", type: "number" },
      { key: "buy_price", label: "Buy Price", type: "number" },
      { key: "sell_price", label: "Sell Price", type: "number" },
      { key: "buy_date", label: "Buy Date", type: "date" },
      { key: "sell_date", label: "Sell Date", type: "date" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  options: {
    label: "Options Trades", icon: ChartArea,
    fields: [
      { key: "symbol", label: "Symbol", type: "text", required: true },
      { key: "type", label: "CE / PE", type: "text" },
      { key: "strike", label: "Strike", type: "number" },
      { key: "lots", label: "Lots", type: "number" },
      { key: "entry", label: "Entry Premium", type: "number" },
      { key: "exit", label: "Exit Premium", type: "number" },
      { key: "expiry", label: "Expiry", type: "date" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  mutualFunds: {
    label: "Mutual Funds", icon: ChartPie,
    fields: [
      { key: "fund", label: "Fund Name", type: "text", required: true },
      { key: "units", label: "Units", type: "number" },
      { key: "nav", label: "Avg NAV", type: "number" },
      { key: "invested", label: "Invested (₹)", type: "number" },
      { key: "current", label: "Current Value (₹)", type: "number" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  expensesTrading: {
    label: "Trading Expenses", icon: Receipt,
    fields: [
      { key: "item", label: "Item", type: "text", required: true },
      { key: "amount", label: "Amount (₹)", type: "number" },
      { key: "date", label: "Date", type: "date" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  expensesPersonal: {
    label: "Personal Expenses", icon: Receipt,
    fields: [
      { key: "item", label: "Item", type: "text", required: true },
      { key: "amount", label: "Amount (₹)", type: "number" },
      { key: "category", label: "Category", type: "text" },
      { key: "date", label: "Date", type: "date" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  strategies: {
    label: "Playbook", icon: BookOpen,
    fields: [
      { key: "name", label: "Strategy Name", type: "text", required: true },
      { key: "setup", label: "Setup", type: "textarea" },
      { key: "entry", label: "Entry Rules", type: "textarea" },
      { key: "exit", label: "Exit Rules", type: "textarea" },
    ],
  },
  journal: {
    label: "Journal", icon: PenLine,
    fields: [
      { key: "date", label: "Date", type: "date", required: true },
      { key: "title", label: "Title", type: "text" },
      { key: "mood", label: "Mood", type: "text" },
      { key: "entry", label: "Entry", type: "textarea" },
    ],
  },
};
