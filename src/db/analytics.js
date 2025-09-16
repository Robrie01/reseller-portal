// src/db/analytics.js
import { supabase } from "../lib/supabaseClient";
import { listAllTaxonomy } from "./taxonomy";

/** Map analytics_groupings (IDs) => names for Settings table */
export async function listGroupings() {
  const { data, error } = await supabase
    .from("analytics_groupings")
    .select("id, user_id, department_id, category_id, subcategory_id")
    .order("id", { ascending: true });
  if (error) throw error;
  const rows = data || [];

  const { departments, categories, subcategories } = await listAllTaxonomy();
  const depMap = new Map(departments.map((d) => [d.id, d.name]));
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const subMap = new Map(subcategories.map((s) => [s.id, s.name]));

  return rows.map((r) => ({
    id: r.id,
    department_id: r.department_id,
    category_id: r.category_id,
    subcategory_id: r.subcategory_id,
    department: depMap.get(r.department_id) || "",
    category: catMap.get(r.category_id) || "",
    subcategory: subMap.get(r.subcategory_id) || "",
  }));
}

/** Insert a triple of IDs (RLS: uses current user) */
export async function addGroupingTriple({ departmentId, categoryId, subcategoryId }) {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user?.id) throw new Error("Not signed in");
  const user_id = session.session.user.id;

  const { error } = await supabase.from("analytics_groupings").insert({
    user_id,
    department_id: departmentId,
    category_id: categoryId,
    subcategory_id: subcategoryId,
  });
  if (error) throw error;
}

/** Update a triple of IDs */
export async function updateGroupingTriple(id, { departmentId, categoryId, subcategoryId }) {
  const { error } = await supabase
    .from("analytics_groupings")
    .update({
      department_id: departmentId,
      category_id: categoryId,
      subcategory_id: subcategoryId,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteGrouping(id) {
  const { error } = await supabase.from("analytics_groupings").delete().eq("id", id);
  if (error) throw error;
}
