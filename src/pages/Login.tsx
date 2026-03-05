import { useState } from "react";
import { motion } from "framer-motion";
import { Navigate } from "react-router-dom";
import CoffeeCup from "@/components/coffee/CoffeeCup";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";

const Login = () => {
  const { user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      if (mode === "signup") {
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpErr) throw signUpErr;
        setMessage("Account created! You can now sign in.");
        setMode("login");
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInErr) throw signInErr;
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError(result.error.message || "Google sign-in failed");
      }
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      <div className="fixed inset-0 z-0 bg-kissaten" />
      <div className="fixed inset-0 z-0 opacity-[0.04] bg-grain pointer-events-none" />
      <div className="fixed top-0 left-0 right-0 h-1 z-[3] border-kintsugi" />
      <div className="fixed top-0 left-0 right-0 h-40 z-0 pointer-events-none" style={{ background: "var(--gradient-warm-glow)" }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-[1] w-full max-w-sm px-5"
      >
        <div className="text-center mb-8">
          <CoffeeCup size={80} steam />
          <h1 className="font-display text-foreground text-3xl mt-4 mb-1 tracking-tight">Morning Coffee</h1>
          <p className="text-muted-foreground text-[11px] tracking-[4px] uppercase font-bold font-mono">
            Daily Candidate Report
          </p>
        </div>

        <div className="bg-washi bg-washi-texture border border-border rounded-2xl p-6" style={{ boxShadow: "var(--shadow-elevated)" }}>
          {/* Google button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border-2 border-copper/30 bg-cream-warm/50 hover:bg-copper/[0.08] transition-all font-mono font-bold text-[13px] text-foreground cursor-pointer disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-copper/20" />
            <span className="text-copper/40 text-[10px] font-mono tracking-widest uppercase">or</span>
            <div className="h-px flex-1 bg-copper/20" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="px-4 py-2.5 rounded-lg border border-border bg-cream-warm/30 text-foreground text-sm font-mono focus:outline-none focus:border-copper focus:ring-1 focus:ring-copper/30"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="px-4 py-2.5 rounded-lg border border-border bg-cream-warm/30 text-foreground text-sm font-mono focus:outline-none focus:border-copper focus:ring-1 focus:ring-copper/30"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 rounded-lg border-2 border-copper-glow/80 font-mono font-bold text-[13px] text-cream cursor-pointer disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg, hsl(26 72% 42%), hsl(30 80% 54%))" }}
            >
              {submitting ? "..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          {error && <p className="text-destructive text-[12px] mt-3 font-mono">{error}</p>}
          {message && <p className="text-green-tea text-[12px] mt-3 font-mono">{message}</p>}

          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); setMessage(null); }}
            className="mt-4 w-full text-center text-copper-muted text-[11px] font-mono cursor-pointer bg-transparent border-none hover:text-copper transition-colors"
          >
            {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

        <p className="text-center text-muted-foreground text-[10px] mt-5 font-mono">
          Access restricted · Admin approval required
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
