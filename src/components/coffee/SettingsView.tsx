import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Stamp from "./Stamp";

interface AllowedUser {
  id: string;
  email: string;
  created_at: string;
}

interface PendingUser {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
}

const SettingsView = () => {
  const { user, isAdmin } = useAuth();
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
  }, []);

  const fetchAllowed = async () => {
    const { data } = await supabase
      .from("allowed_users")
      .select("id, email, created_at")
      .order("created_at", { ascending: true });
    setAllowedUsers(data || []);
  };

  const fetchPending = async () => {
    const { data } = await supabase
      .from("pending_approvals")
      .select("id, user_id, email, created_at")
      .order("created_at", { ascending: true });
    setPendingUsers(data || []);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAllowed();
      fetchPending();
    }
  }, [isAdmin]);

  const approveUser = async (pending: PendingUser) => {
    setError(null);
    // Add to allowed_users, then remove from pending
    const { error: insertErr } = await supabase
      .from("allowed_users")
      .insert({ email: pending.email, added_by: user?.id });
    if (insertErr && !insertErr.message.includes("duplicate")) {
      setError(insertErr.message);
      return;
    }
    await supabase.from("pending_approvals").delete().eq("id", pending.id);
    setSuccess(`${pending.email} approved`);
    fetchAllowed();
    fetchPending();
    setTimeout(() => setSuccess(null), 3000);
  };

  const rejectUser = async (id: string) => {
    await supabase.from("pending_approvals").delete().eq("id", id);
    fetchPending();
  };

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    const { error: insertErr } = await supabase
      .from("allowed_users")
      .insert({ email: newEmail.trim().toLowerCase(), added_by: user?.id });

    if (insertErr) {
      setError(insertErr.message.includes("duplicate") ? "Email already added" : insertErr.message);
    } else {
      setSuccess(`${newEmail.trim()} added`);
      setNewEmail("");
      fetchAllowed();
    }
    setLoading(false);
    setTimeout(() => setSuccess(null), 3000);
  };

  const removeUser = async (id: string, email: string) => {
    if (email === user?.email) return; // Can't remove yourself
    const { error: delErr } = await supabase.from("allowed_users").delete().eq("id", id);
    if (delErr) {
      setError(delErr.message);
    } else {
      fetchAllowed();
    }
  };

  const appearanceSection = (
    <div className="bg-washi bg-washi-texture border border-border rounded-2xl p-6 mb-4" style={{ boxShadow: "var(--shadow-elevated)" }}>
      <div className="flex items-center gap-2 mb-3">
        <p className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] font-bold font-mono">Appearance</p>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-mono text-foreground font-medium">Dark Mode</p>
          <p className="text-[11px] text-muted-foreground font-mono">Switch to a darker palette</p>
        </div>
        <button
          onClick={toggleDarkMode}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer border-none ${darkMode ? "bg-copper" : "bg-muted"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-cream shadow transition-transform duration-200 ${darkMode ? "translate-x-5" : "translate-x-0"}`}
          />
        </button>
      </div>
    </div>
  );

  if (!isAdmin) {
    return (
      <div className="px-5 pb-12 max-w-2xl mx-auto">
        <div className="text-center mt-10 mb-6">
          <h2 className="font-display text-foreground text-[22px] tracking-tight">Settings</h2>
          <p className="text-muted-foreground text-[12px] font-mono mt-1">Preferences</p>
        </div>
        {appearanceSection}
      </div>
    );
  }

  return (
    <div className="px-5 pb-12 max-w-2xl mx-auto">
      <div className="text-center mt-10 mb-6">
        <h2 className="font-display text-foreground text-[22px] tracking-tight">Settings</h2>
        <p className="text-muted-foreground text-[12px] font-mono mt-1">
          Manage who can access Morning Coffee
        </p>
      </div>

      {appearanceSection}

      <div className="bg-washi bg-washi-texture border border-border rounded-2xl p-6" style={{ boxShadow: "var(--shadow-elevated)" }}>
        {/* Add user form */}
        <div className="flex items-center gap-2 mb-2">
          <p className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] font-bold font-mono">Add User</p>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={addUser} className="flex gap-2 mb-6">
          <input
            type="email"
            placeholder="colleague@ahrefs.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-cream-warm/30 text-foreground text-sm font-mono focus:outline-none focus:border-copper focus:ring-1 focus:ring-copper/30"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-lg border-2 border-copper-glow/80 font-mono font-extrabold text-[11px] text-cream cursor-pointer disabled:opacity-50 uppercase tracking-wider"
            style={{ background: "linear-gradient(135deg, hsl(26 72% 42%), hsl(30 80% 54%))" }}
          >
            {loading ? "..." : "Add"}
          </button>
        </form>

        {error && <p className="text-destructive text-[12px] mb-4 font-mono">⚠ {error}</p>}
        {success && <p className="text-green-tea text-[12px] mb-4 font-mono">✓ {success}</p>}

        {/* Pending approvals */}
        {pendingUsers.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] font-bold font-mono">
                Pending Approval ({pendingUsers.length})
              </p>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="flex flex-col gap-1.5 mb-6">
              {pendingUsers.map((pu) => (
                <div
                  key={pu.id}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-copper/30 bg-copper/[0.06]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-foreground font-medium">{pu.email}</span>
                    <Stamp variant="orange">Pending</Stamp>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => approveUser(pu)}
                      className="text-green-tea hover:text-green-tea/80 text-[11px] font-mono font-bold cursor-pointer bg-transparent border-none transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectUser(pu.id)}
                      className="text-destructive/60 hover:text-destructive text-[11px] font-mono font-bold cursor-pointer bg-transparent border-none transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex items-center gap-2 mb-3">
          <p className="text-[9px] text-muted-foreground uppercase tracking-[1.5px] font-bold font-mono">
            Allowed Users ({allowedUsers.length})
          </p>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex flex-col gap-1.5">
          {allowedUsers.map((au) => (
            <div
              key={au.id}
              className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border bg-cream-warm/40"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-foreground font-medium">{au.email}</span>
                {au.email === user?.email && (
                  <Stamp variant="green">You</Stamp>
                )}
              </div>
              {au.email !== user?.email && (
                <button
                  onClick={() => removeUser(au.id, au.email)}
                  className="text-destructive/60 hover:text-destructive text-[11px] font-mono font-bold cursor-pointer bg-transparent border-none transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {allowedUsers.length === 0 && (
            <p className="text-muted-foreground text-[12px] font-mono py-4 text-center">
              No users added yet. Add your email first!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
