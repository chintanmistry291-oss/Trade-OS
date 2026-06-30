import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import axios, { API } from "@/lib/api";

/**
 * Polls indices + movers every 30s. Returns { indices, movers, fetchedAt, refresh }.
 */
export function useLiveMarket() {
  const [indices, setIndices] = useState(null);
  const [movers, setMovers] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [idx, mv] = await Promise.all([
        axios.get(`${API}/market/indices`),
        axios.get(`${API}/market/movers`),
      ]);
      setIndices(idx.data.indices);
      setMovers(mv.data);
      setFetchedAt(idx.data.fetched_at);
    } catch (e) {
      console.error("loadAll failed", e);
      toast.error("Live data fetch failed");
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  return { indices, movers, fetchedAt, refresh };
}
