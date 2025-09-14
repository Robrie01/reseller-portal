// src/db/platforms.js
import { supabase } from "../lib/supabaseClient";

/** Small helper to reliably get the current user id in the browser */
async function getUserId() {
  // getSession() is more reliable than getUser() for client-side apps
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const uid = data?.session?.user?.id || null;
  return uid;
}

/**
 * Returns the signed-in user's platforms first, then global defaults.
 * Uses RLS-secured view: public.sale_platforms_view
 */
export async function listSalePlatforms() {
  const { data, error } = await supabase
    .from("sale_platforms_view")
    .select("id, name, is_default, is_user_owned, created_at")
    .order("is_user_owned", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Adds a user-owned platform. Prevents dupes against:
 *  - existing user-owned platforms (case-insensitive)
 *  - global defaults (case-insensitive)
 */
export async function addSalePlatform(nameRaw) {
  const name = (nameRaw || "").trim();
  if (!name) throw new Error("Platform name is required.");

  // Case-insensitive dupe check against the list view (mine + defaults)
  const { data: existing, error: checkErr } = await supabase
    .from("sale_platforms_view")
    .select("id, name")
    .ilike("name", name);
  if (checkErr) throw checkErr;
  if (existing && existing.length > 0) {
    throw new Error(`"${existing[0].name}" already exists.`);
  }

  // Insert as user-owned
  const user_id = await getUserId();
  if (!user_id) throw new Error("Not signed in.");

  const { data, error } = await supabase
    .from("sale_platforms")
    .insert([{ user_id, name, is_default: false }])
    .select("id, name, is_default")
    .single();

  if (error) throw error;
  return data;
}

/** Renames a user-owned platform (cannot edit global defaults due to RLS). */
export async function updateSalePlatform(id, newNameRaw) {
  const newName = (newNameRaw || "").trim();
  if (!newName) throw new Error("New name is required.");

  // Prevent case-insensitive dupes (ignore self)
  const { data: dupe, error: dupeErr } = await supabase
    .from("sale_platforms_view")
    .select("id, name")
    .ilike("name", newName);
  if (dupeErr) throw dupeErr;
  if (dupe && dupe.some((r) => r.id !== id)) {
    throw new Error(`"${newName}" already exists.`);
  }

  const { data, error } = await supabase
    .from("sale_platforms")
    .update({ name: newName })
    .eq("id", id)
    .select("id, name, is_default")
    .single();

  if (error) throw error;
  return data;
}

/** Deletes a user-owned platform (cannot delete defaults due to RLS). */
export async function deleteSalePlatform(id) {
  const { error } = await supabase.from("sale_platforms").delete().eq("id", id);
  if (error) throw error;
  return true;
}
