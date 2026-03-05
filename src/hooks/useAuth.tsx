import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isAllowed: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  session: null,
  isAdmin: false,
  isAllowed: false,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkPermissions = useCallback(async (u: User | null) => {
    if (!u) {
      setIsAdmin(false);
      setIsAllowed(false);
      return;
    }

    // Check if user has admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.id);

    const admin = roles?.some((r: any) => r.role === "admin") ?? false;
    setIsAdmin(admin);

    // Check if email is in allowed_users (admin can always access)
    if (admin) {
      setIsAllowed(true);
    } else {
      // Use the security definer function
      const { data } = await supabase.rpc("is_allowed_email", {
        _email: u.email || "",
      });
      setIsAllowed(data === true);
    }
  }, []);

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, sess) => {
        setSession(sess);
        setUser(sess?.user ?? null);
        // Defer permission check to avoid deadlock
        setTimeout(() => {
          checkPermissions(sess?.user ?? null).finally(() => setLoading(false));
        }, 0);
      }
    );

    // THEN get existing session
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      checkPermissions(sess?.user ?? null).finally(() => setLoading(false));
    });

    return () => subscription.unsubscribe();
  }, [checkPermissions]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsAllowed(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isAllowed, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
