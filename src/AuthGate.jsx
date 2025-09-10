// src/AuthGate.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) =>
      setSession(sess)
    );
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  if (!ready) {
    return <div className="min-h-screen grid place-items-center">Loading…</div>;
  }
  if (!session) return <AuthPage />;

  return children;
}

function AuthPage() {
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup' | 'reset'

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
        {/* Google OAuth */}
        <GoogleButton />

        {/* divider */}
        <div className="my-2 flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          <span>or</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <TabBtn active={mode === "signin"} onClick={() => setMode("signin")}>
            Sign in
          </TabBtn>
          <TabBtn active={mode === "signup"} onClick={() => setMode("signup")}>
            Create account
          </TabBtn>
          <TabBtn active={mode === "reset"} onClick={() => setMode("reset")}>
            Reset
          </TabBtn>
        </div>

        {mode === "signin" && <EmailPasswordForm kind="signin" />}
        {mode === "signup" && <EmailPasswordForm kind="signup" />}
        {mode === "reset" && <ResetForm />}
      </div>
    </div>
  );
}

function TabBtn({ active, children, ...props }) {
  return (
    <button
      className={`px-3 py-2 rounded-xl border ${
        active ? "bg-black text-white border-black" : "bg-white"
      }`}
      {...props}
    >
      {children}
    </button>
  );
}

function GoogleButton() {
  const [busy, setBusy] = useState(false);

  async function handleGoogle() {
    try {
      setBusy(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin, // send back to your site
          skipBrowserRedirect: true,          // get the URL instead of auto-redirecting
        },
      });
      if (error) throw error;

      // Should start with https://accounts.google.com/...
      console.log("Supabase OAuth URL:", data?.url);
      window.location.assign(data.url);
    } catch (e) {
      alert(e?.message || "Google sign-in failed");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleGoogle}
      disabled={busy}
      className="w-full border border-slate-300 rounded-xl px-3 py-2 flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-60"
    >
      {/* Simple G icon */}
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20H24v8h11.3C33.9 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.9 6.1 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c10 0 18.4-7.3 19.9-16.8.1-.7.1-1.4.1-2.1 0-1.2-.1-2.3-.4-3.6z"
        />
        <path
          fill="#FF3D00"
          d="M6.3 14.7l6.6 4.8C14.8 16 19 14 24 14c3 0 5.7 1.1 7.8 3l5.7-5.7C33.9 6.1 29.2 4 24 4 16.1 4 9.2 8.5 6.3 14.7z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.1C29.2 35.9 26.7 37 24 37c-5.2 0-9.6-3.4-11.3-8l-6.6 5.1C9.1 39.5 16 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H42V20H24v8h11.3c-1.4 4.6-5.8 8-11.3 8-5 0-9.2-3.2-10.7-7.6l-6.6 5.1C9.1 39.5 16 44 24 44c10 0 18.4-7.3 19.9-16.8.1-.7.1-1.4.1-2.1 0-1.2-.1-2.3-.4-3.6z"
        />
      </svg>
      <span>{busy ? "Opening Google…" : "Continue with Google"}</span>
    </button>
  );
}

function EmailPasswordForm({ kind }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (kind === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Check your email for a confirmation link.");
      }
    } catch (e) {
      setErr(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h1 className="text-lg font-semibold">
        {kind === "signin" ? "Sign in" : "Create account"}
      </h1>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <label className="block text-sm">
        Email
        <input
          className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        Password
        <input
          type="password"
          className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="w-full px-3 py-2 rounded-xl bg-black text-white disabled:opacity-60"
      >
        {loading ? "Please wait…" : kind === "signin" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}

function ResetForm() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendReset(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setMsg("If that email exists, a reset link has been sent.");
    } catch (e) {
      setErr(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={sendReset} className="space-y-3">
      <h1 className="text-lg font-semibold">Reset password</h1>
      {err && <div className="text-sm text-red-600">{err}</div>}
      {msg && <div className="text-sm text-green-600">{msg}</div>}
      <label className="block text-sm">
        Email
        <input
          className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="w-full px-3 py-2 rounded-xl bg-black text-white disabled:opacity-60"
      >
        {loading ? "Please wait…" : "Send reset link"}
      </button>
    </form>
  );
}
