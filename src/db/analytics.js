import { supabase } from "../lib/supabaseClient";
import { ensureDepartment, ensureCategory, ensureSubcategory } from "./taxonomy";

async function getUserId() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const uid = data?.session?.user?.id;
  if (!uid) throw new Error("Not signed in.");
  return uid;
}

export async function listGroupings() {
  const uid = await getUserId();
  const { data, error } = await supabase
    .from("analytics_groupings")
    .select(`
      id, created_at,
      departments:department_id(id,name),
      categories:category_id(id,name),
      subcategories:subcategory_id(id,name)
    `)
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    department: r.departments,
    category: r.categories,
    subcategory: r.subcategories,
    created_at: r.created_at,
  }));
}

export async function addGroupingByNames({ departmentName, categoryName, subcategoryName }) {
  const uid = await getUserId();

  // Ensure taxonomy rows exist (personal if missing)
  const dept = await ensureDepartment(departmentName);
  const cat  = await ensureCategory(dept.id, categoryName);
  const sub  = await ensureSubcategory(cat.id, subcategoryName);

  // Upsert-like insert (unique index prevents dupes)
  const { data, error } = await supabase
    .from("analytics_groupings")
    .insert({ user_id: uid, department_id: dept.id, category_id: cat.id, subcategory_id: sub.id })
    .select("id")
    .single();

  if (error && !String(error.message || "").includes("duplicate key value")) throw error;
  return { id: data?.id, department: dept, category: cat, subcategory: sub };
}

export async function deleteGrouping(id) {
  const { error } = await supabase.from("analytics_groupings").delete().eq("id", id);
  if (error) throw error;
}

export async function updateGrouping(id, { departmentId, categoryId, subcategoryId }) {
  const { error } = await supabase
    .from("analytics_groupings")
    .update({ department_id: departmentId, category_id: categoryId, subcategory_id: subcategoryId })
    .eq("id", id);
  if (error) throw error;
}
