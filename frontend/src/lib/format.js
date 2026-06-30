export const fmt = (n, d = 2) =>
  n === null || n === undefined || Number.isNaN(n) || n === ""
    ? "—"
    : Number(n).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmtSigned = (n, d = 2) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const s = Number(n) >= 0 ? "+" : "";
  return s + fmt(n, d);
};

export const fmtCompact = (n) => {
  if (n === null || n === undefined || Number.isNaN(n) || n === "") return "—";
  const abs = Math.abs(n);
  if (abs >= 1e7) return (n / 1e7).toFixed(2) + "Cr";
  if (abs >= 1e5) return (n / 1e5).toFixed(2) + "L";
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toString();
};
