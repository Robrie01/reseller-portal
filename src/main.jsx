import React from "react";
import ReactDOM from "react-dom/client";
import AdminApp from "./App.jsx";
import "./index.css";
import AuthGate from "./AuthGate.jsx";

console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate>
      <AdminApp />
    </AuthGate>
  </React.StrictMode>
);

import { supabase } from "./lib/supabaseClient";

async function testSupabase() {
  try {
    const { data, error } = await supabase.from("profiles").select("*").limit(1);
    if (error) {
      console.error("Supabase error:", error.message);
    } else {
      console.log("✅ Supabase connected! Sample data:", data);
    }
  } catch (err) {
    console.error("Connection failed:", err);
  }
}

testSupabase();
