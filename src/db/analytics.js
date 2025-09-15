// src/db/analytics.js
import { supabase } from "../lib/supabaseClient";

/**
 * Return groupings as nice display rows:
 *   [{ id, department, category, subcategory, department_id, category_id, subcategory_id }]
 * Joins the taxonomy tables so Settings renders real names.
 */
export async function listGroupings() {
  const { data, error } = await supabase
    .from("analytics_groupings")
    .select(
      `
      id,
      department_id,
      category_id,
      subcategory_id,
      departments:department_id ( name ),
      categories:category_id ( name ),
      subcategories:subcategory_id ( name )
    `
    )
    .order("id", { ascending: true });

  if (error) throw error;

  // flatten for the UI
  return (data || []).map((r) => ({
    id: r.id,
    department_id: r.department_id,
    category_id: r.category_id,
    subcategory_id: r.subcategory_id,
    department: r.departments?.name ?? "",
    category: r.categories?.name ?? "",
    subcategory: r.subcategories?.name ?? "",
  }));
}

/**
 * Create a grouping by IDs. (Preferred.)
 */
export async function addGroupingTripleByIds({
  department_id,
  category_id,
  subcategory_id,
}) {
  const { data: sess } = await supabase.auth.getUser();
  if (!sess?.user) throw new Error("Not signed in.");

  const { error } = await supabase.from("analytics_groupings").insert([
    {
      user_id: sess.user.id,
      department_id,
      category_id,
      subcategory_id,
    },
  ]);
  if (error) throw error;
}

/**
 * Backward-compat shim (names → IDs) used by older callers.
 * If you don’t need it elsewhere, you can remove it later.
 */
export async function addGroupingTriple({ department, category, subcategory }) {
  throw new Error(
    "addGroupingTriple(names) is deprecated. Call addGroupingTripleByIds({department_id, category_id, subcategory_id})."
  );
}

/**
 * Update an existing grouping to new IDs.
 */
export async function updateGroupingByIds(id, { department_id, category_id, subcategory_id }) {
  const { error } = await supabase
    .from("analytics_groupings")
    .update({ department_id, category_id, subcategory_id })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Kept name for Settings’ delete flow.
 */
export async function deleteGrouping(id) {
  const { error } = await supabase.from("analytics_groupings").delete().eq("id", id);
  if (error) throw error;
}
