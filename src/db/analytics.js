// src/db/analytics.js
import { supabase } from "../lib/supabaseClient";

/**
 * Return rows with both IDs and display names (joined).
 */
export async function listGroupings() {
  const { data, error } = await supabase
    .from("analytics_groupings")
    .select(`
      id,
      department_id,
      category_id,
      subcategory_id,
      departments:department_id ( id, name ),
      categories:category_id   ( id, name ),
      subcategories:subcategory_id ( id, name )
    `)
    .order("id", { ascending: true });

  if (error) throw error;

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

export async function addGroupingTriple({ departmentId, categoryId, subcategoryId }) {
  const { data, error } = await supabase
    .from("analytics_groupings")
    .insert([
      {
        department_id: departmentId,
        category_id: categoryId,
        subcategory_id: subcategoryId,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGroupingTriple(id, { departmentId, categoryId, subcategoryId }) {
  const { data, error } = await supabase
    .from("analytics_groupings")
    .update({
      department_id: departmentId,
      category_id: categoryId,
      subcategory_id: subcategoryId,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGrouping(id) {
  const { error } = await supabase
    .from("analytics_groupings")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
