// src/db/analytics.js
import { supabase } from "../lib/supabaseClient";

/** Get current user id (client-safe) */
async function getUserId() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session?.user?.id || null;
}

/** Normalize any row into the triple we display */
function norm(row) {
  return {
    id: row.id,
    department: row.department ?? row.dep ?? row.dept ?? row.department_name ?? "",
    category: row.category ?? row.cat ?? row.category_name ?? "",
    subcategory: row.subcategory ?? row.sub_cat ?? row.subcategory_name ?? "",
  };
}

/** List groupings for the current user (ordered nicely) */
export async function listGroupings() {
  const { data, error } = await supabase
    .from("analytics_groupings")
    .select("id, department, category, subcategory")
    .order("department", { ascending: true, nullsFirst: false })
    .order("category", { ascending: true, nullsFirst: false })
    .order("subcategory", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data || []).map(norm);
}

/** Add a grouping (dept/category/subcategory). Prevent exact dupes (case-insensitive). */
export async function addGroupingTriple({ department, category, subcategory }) {
  const uid = await getUserId();
  if (!uid) throw new Error("Not signed in.");

  const dep = (department || "").trim();
  const cat = (category || "").trim();
  const sub = (subcategory || "").trim();
  if (!dep) throw new Error("Department is required.");
  if (!cat) throw new Error("Category is required.");
  if (!sub) throw new Error("Sub-Category is required.");

  // de-dupe
  const { data: existing, error: dupErr } = await supabase
    .from("analytics_groupings")
    .select("id, department, category, subcategory")
    .ilike("department", dep)
    .ilike("category", cat)
    .ilike("subcategory", sub);
  if (dupErr) throw dupErr;
  if ((existing || []).length) throw new Error("That grouping already exists.");

  const { data, error } = await supabase
    .from("analytics_groupings")
    .insert([{ user_id: uid, department: dep, category: cat, subcategory: sub }])
    .select("id, department, category, subcategory")
    .single();
  if (error) throw error;
  return norm(data);
}

/** Update an existing grouping */
export async function updateGroupingTriple(id, { department, category, subcategory }) {
  const dep = (department || "").trim();
  const cat = (category || "").trim();
  const sub = (subcategory || "").trim();
  if (!dep || !cat || !sub) throw new Error("All fields are required.");

  // de-dupe excluding self
  const { data: existing, error: dupErr } = await supabase
    .from("analytics_groupings")
    .select("id, department, category, subcategory")
    .ilike("department", dep)
    .ilike("category", cat)
    .ilike("subcategory", sub);
  if (dupErr) throw dupErr;
  if ((existing || []).some((r) => r.id !== id)) throw new Error("That grouping already exists.");

  const { data, error } = await supabase
    .from("analytics_groupings")
    .update({ department: dep, category: cat, subcategory: sub })
    .eq("id", id)
    .select("id, department, category, subcategory")
    .single();
  if (error) throw error;
  return norm(data);
}

/** Delete a grouping by id */
export async function deleteGrouping(id) {
  const { error } = await supabase.from("analytics_groupings").delete().eq("id", id);
  if (error) throw error;
  return true;
}
