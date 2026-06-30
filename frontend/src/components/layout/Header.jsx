import { RefreshCw, Sun, Moon, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Header({ theme, onToggleTheme, onRefresh, fetchedAt }) {
  const { user, logout } = useAuth();
  return (
    <header className="flex items-center justify-between mb-5 pb-4 border-b flex-wrap gap-3"
            style={{ borderColor: "var(--line)" }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center serif text-xl text-white"
             style={{ background: "var(--wine700)" }}>T</div>
        <div>
          <h1 className="serif text-2xl leading-none">Trade OS</h1>
          <div className="text-[11px]" style={{ color: "var(--inkSoft)" }}>
            Live · {fetchedAt ? new Date(fetchedAt).toLocaleTimeString("en-IN") : "—"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {user?.picture && <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />}
        <div className="text-xs hidden sm:block" style={{ color: "var(--inkSoft)" }}>
          {user?.name || user?.email}
        </div>
        <button onClick={onRefresh} className="btn-ghost" data-testid="header-refresh">
          <RefreshCw size={14} />
        </button>
        <button onClick={onToggleTheme} className={`theme-slider ${theme === "dark" ? "dark" : ""}`}
                data-testid="theme-toggle">
          <span className="theme-label theme-label-light"><Sun size={11} style={{ display: "inline" }} /></span>
          <span className="theme-label theme-label-dark"><Moon size={11} style={{ display: "inline" }} /></span>
          <span className="knob" />
        </button>
        <button onClick={logout} className="btn-ghost" data-testid="logout-btn"
                style={{ color: "var(--loss)" }}>
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
}
