import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Search, Plus } from "lucide-react";
import axios, { API } from "@/lib/api";

function useDebouncedSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debRef = useRef(null);

  const runSearch = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const r = await axios.get(`${API}/market/search`, { params: { q } });
      setResults(r.data.results || []);
    } catch (e) {
      console.error("search failed", e);
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => runSearch(query), 350);
    return () => {
      if (debRef.current) clearTimeout(debRef.current);
    };
  }, [query, runSearch]);

  return { results, loading, clear: () => setResults([]) };
}

function ResultRow({ r, onSelect, onAdd }) {
  return (
    <div className="p-2.5 rounded-lg border flex justify-between items-center gap-2"
         style={{ borderColor: "var(--line)" }} data-testid={`search-result-${r.symbol}`}>
      <button onClick={() => onSelect(r.symbol)} className="text-left flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{r.name}</div>
        <div className="text-[11px] mono truncate" style={{ color: "var(--inkSoft)" }}>
          {r.symbol} · {r.exchange || "—"}
        </div>
      </button>
      {onAdd && (
        <button onClick={() => onAdd(r.symbol)} className="btn-ghost"
                style={{ padding: "4px 8px" }} data-testid={`add-${r.symbol}`}>
          <Plus size={12} />
        </button>
      )}
    </div>
  );
}

export default function StockSearch({ onSelect, onAdd }) {
  const [q, setQ] = useState("");
  const { results, loading, clear } = useDebouncedSearch(q);

  const handleSelect = (sym) => {
    onSelect(sym);
    setQ("");
    clear();
  };

  return (
    <div className="card-wine p-4 mb-5" data-testid="stock-search">
      <div className="flex items-center gap-2 mb-3">
        <Search size={16} style={{ color: "var(--wine700)" }} />
        <h3 className="serif text-lg">Search Stocks (Yahoo)</h3>
      </div>
      <input className="input-base" value={q} onChange={e => setQ(e.target.value)}
             placeholder='Try "Reliance", "TCS", "AAPL"…' data-testid="stock-search-input" />
      {loading && <div className="text-xs mt-2" style={{ color: "var(--inkSoft)" }}>Searching…</div>}
      {results.length > 0 && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2" data-testid="search-results">
          {results.slice(0, 10).map(r => (
            <ResultRow key={r.symbol} r={r} onSelect={handleSelect} onAdd={onAdd} />
          ))}
        </div>
      )}
    </div>
  );
}
