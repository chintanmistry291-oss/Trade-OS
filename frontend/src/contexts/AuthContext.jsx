import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import axios, { API } from "@/lib/api";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    // Skip /me when returning from OAuth callback — session must be exchanged first
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    try {
      const r = await axios.get(`${API}/auth/me`);
      setUser(r.data);
    } catch (e) {
      // 401 expected when not logged in — keep user null
      if (e?.response?.status !== 401) {
        console.error("auth/me failed", e);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(() => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post(`${API}/auth/logout`);
    } catch (e) {
      console.error("logout failed", e);
    }
    setUser(null);
    toast.success("Signed out");
  }, []);

  const finalizeSession = useCallback(async (sessionId) => {
    try {
      const r = await axios.post(`${API}/auth/session`, { session_id: sessionId });
      setUser(r.data);
      toast.success(`Welcome, ${r.data.name?.split(" ")[0] || "trader"}!`);
      return true;
    } catch (e) {
      console.error("finalizeSession failed", e);
      toast.error(`Auth failed: ${e.response?.data?.detail || e.message}`);
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, finalizeSession, refresh: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthCallback() {
  const { finalizeSession } = useAuth();
  const processed = useRef(false);
  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (m && m[1]) {
      finalizeSession(decodeURIComponent(m[1])).then(() => {
        window.history.replaceState(null, "", window.location.pathname);
        window.location.reload();
      });
    }
  }, [finalizeSession]);
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <div className="text-center">
        <div className="serif text-2xl mb-2">Signing you in…</div>
        <div className="text-sm" style={{ color: "var(--inkSoft)" }}>One moment</div>
      </div>
    </div>
  );
}
