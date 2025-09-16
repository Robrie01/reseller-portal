// src/db/analytics.js
import { supabase } from "../lib/supabaseClient";

/**
 * Returns rows like:
 * { id, department, category, subcategory }
 * for the current user.
 */
export async function listGroupings() {
  const { data, error } = await supabase
    .from("analytics_groupings_view") // view that resolves names via joins
    .select("*")
    .order("department", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Add a new grouping by names. Caller guarantees user is authed.
 * Expects: { department, category, subcategory }
 */
export async function addGroupingTriple({ department, category, subcategory }) {
  // Uses server-side RPC to ensure/lookup IDs and insert atomically for this user.
  const { data, error } = await supabase.rpc("ag_add_grouping", {
    p_department: department,
    p_category: category,
    p_subcategory: subcategory,
  });
  if (error) throw error;
  return data;
}

/**
 * Update an existing grouping row (by id) to new names.
 * Expects: id + { department, category, subcategory }
 */
export async function updateGroupingTriple(id, { department, category, subcategory }) {
  const { data, error } = await supabase.rpc("ag_update_grouping", {
    p_id: id,
    p_department: department,
    p_category: category,
    p_subcategory: subcategory,
  });
  if (error) throw error;
  return data;
}

/**
 * Delete a grouping row by id (for the current user).
 */
export async function deleteGrouping(id) {
  const { error } = await supabase
    .from("analytics_groupings")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
