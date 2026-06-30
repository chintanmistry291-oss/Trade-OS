import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero" data-testid="login-page">
      <div className="card-wine p-10 max-w-md w-full text-center fade-in">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center serif text-3xl text-white mx-auto mb-4"
             style={{ background: "var(--wine700)" }}>T</div>
        <h1 className="serif text-3xl mb-2">Trade OS</h1>
        <p className="text-sm mb-8" style={{ color: "var(--inkSoft)" }}>
          Your personal trading desk — live Nifty, options chain, IPO GMP &amp; a complete ledger.
        </p>
        <button onClick={login} data-testid="google-login-btn" className="btn-primary w-full"
                style={{ padding: "12px 16px", fontSize: 14 }}>
          Sign in with Google
        </button>
        <div className="mt-6 text-[10.5px]" style={{ color: "var(--inkSoft)" }}>
          Secure session · 7-day cookie · No password stored
        </div>
      </div>
    </div>
  );
}
