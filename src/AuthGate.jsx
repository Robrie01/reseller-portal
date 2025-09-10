import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { signInWithGoogle } from "./lib/auth";

<button onClick={() => signInWithGoogle()}>Continue with Google</button>


export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="min-h-screen grid place-items-center">Loading…</div>;
  if (!session) return <AuthPage />;

  return children;
}

function AuthPage() {
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup' | 'reset'
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
        <div className="flex gap-2">
          <button
            className={`px-3 py-2 rounded-xl border ${mode==='signin'?'bg-black text-white border-black':'bg-white'}`}
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
          <button
            className={`px-3 py-2 rounded-xl border ${mode==='signup'?'bg-black text-white border-black':'bg-white'}`}
            onClick={() => setMode("signup")}
          >
            Create account
          </button>
          <button
            className={`px-3 py-2 rounded-xl border ${mode==='reset'?'bg-black text-white border-black':'bg-white'}`}
            onClick={() => setMode("reset")}
          >
            Reset
          </button>
        </div>
        {mode === "signin" && <EmailPasswordForm kind="signin" />}
        {mode === "signup" && <EmailPasswordForm kind="signup" />}
        {mode === "reset" && <ResetForm />}
      </div>
    </div>
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
        alert("Check your email for a confirmation link if email confirmations are enabled.");
      }
    } catch (e) {
      setErr(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h1 className="text-lg font-semibold">{kind === "signin" ? "Sign in" : "Create account"}</h1>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <label className="block text-sm">
        Email
        <input
          className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300"
          value={email} onChange={(e)=>setEmail(e.target.value)} required
        />
      </label>
      <label className="block text-sm">
        Password
        <input
          type="password"
          className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300"
          value={password} onChange={(e)=>setPassword(e.target.value)} required
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="w-full px-3 py-2 rounded-xl bg-black text-white disabled:opacity-60"
      >
        {loading ? "Please wait…" : (kind === "signin" ? "Sign in" : "Create account")}
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
    setErr(""); setMsg(""); setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin, // back to your app after reset
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
          value={email} onChange={(e)=>setEmail(e.target.value)} required
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
