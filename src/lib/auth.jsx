// src/lib/auth.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient"; // ✅ keep this (remove any second import)

const AuthCtx = createContext({ user: null, session: null, loading: true });

/** One-click Google OAuth sign-in */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,        // return here after Google
      queryParams: { prompt: "select_account" }, // show account picker
    },
  });
  if (error) throw error;
}

/** Sign the current user out */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Load current session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <AuthCtx.Provider
      value={{ session, user: session?.user ?? null, loading, signInWithGoogle, signOut }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
