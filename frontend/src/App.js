import { Toaster } from "sonner";
import { AuthProvider, AuthCallback, useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import LoginPage from "@/components/auth/LoginPage";
import MainApp from "@/components/layout/MainApp";
import "@/App.css";

function Gate() {
  const { user, loading } = useAuth();
  // OAuth callback path — process session_id before rendering anything else
  if (typeof window !== "undefined" && window.location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: "var(--bg)", color: "var(--ink)" }}>
        <div className="text-sm">Loading…</div>
      </div>
    );
  }
  if (!user) return <LoginPage />;
  return <MainApp />;
}

function AppShell() {
  const { theme } = useTheme();
  return (
    <>
      <Toaster position="top-right" richColors theme={theme} />
      <Gate />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
