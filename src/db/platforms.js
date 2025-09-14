// src/db/platforms.js
import { supabase } from "../lib/supabaseClient";

/**
 * Returns the signed-in user's platforms first, then global defaults.
 * Uses RLS-secured view: public.sale_platforms_view
 */
export async function listSalePlatforms() {
  const { data, error } = await supabase
    .from("sale_platforms_view")
    .select("id, name, is_default, is_user_owned, created_at")
    .order("is_user_owned", { ascending: true }) // 0 (mine) then 1 (defaults)
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

  // Check for case-insensitive dupe against mine or defaults
  const { data: existing, error: checkErr } = await supabase
    .from("sale_platforms_view")
    .select("id, name, is_user_owned")
    .ilike("name", name);

  if (checkErr) throw checkErr;
  if (existing && existing.length > 0) {
    throw new Error(`"${existing[0].name}" already exists.`);
  }

  // Insert as user-owned row
  // RLS requires user_id = auth.uid() inside WITH CHECK; we set it explicitly from session
  const { data: session, error: sessionErr } = await supabase.auth.getUser();
  if (sessionErr) throw sessionErr;
  const user_id = session?.data?.user?.id;
  if (!user_id) throw new Error("Not signed in.");

  const { data, error } = await supabase
    .from("sale_platforms")
    .insert([{ user_id, name, is_default: false }])
    .select("id, name, is_default")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Renames a user-owned platform (cannot edit global defaults due to RLS).
 */
export async function updateSalePlatform(id, newNameRaw) {
  const newName = (newNameRaw || "").trim();
  if (!newName) throw new Error("New name is required.");

  // Prevent case-insensitive dupes
  const { data: dupe, error: dupeErr } = await supabase
    .from("sale_platforms_view")
    .select("id, name, is_user_owned")
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

/**
 * Deletes a user-owned platform (cannot delete defaults due to RLS).
 */
export async function deleteSalePlatform(id) {
  const { error } = await supabase.from("sale_platforms").delete().eq("id", id);
  if (error) throw error;
  return true;
}
