// src/db/taxonomy.js
import { supabase } from "../lib/supabaseClient";

/** Utilities */
const norm = (s) => (s || "").trim();

/** ------- Read helpers (typeahead) ------- */
export async function listDepartments() {
  const { data, error } = await supabase
    .from("departments")
    .select("id,name")
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function listCategories(departmentId) {
  if (!departmentId) return [];
  const { data, error } = await supabase
    .from("categories")
    .select("id,name")
    .eq("department_id", departmentId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function listSubcategories(categoryId) {
  if (!categoryId) return [];
  const { data, error } = await supabase
    .from("subcategories")
    .select("id,name")
    .eq("category_id", categoryId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

/** ------- Bulk lookups (for listing groupings) ------- */
export async function listAllTaxonomy() {
  const [deps, cats, subs] = await Promise.all([
    listDepartments(),
    supabase.from("categories").select("id,name,department_id").order("name"),
    supabase.from("subcategories").select("id,name,category_id").order("name"),
  ]);
  if (cats.error) throw cats.error;
  if (subs.error) throw subs.error;
  return {
    departments: deps,
    categories: cats.data || [],
    subcategories: subs.data || [],
  };
}

/** ------- Ensure/create helpers ------- */
export async function ensureDepartment(name) {
  const v = norm(name);
  if (!v) throw new Error("Department name required");

  // try case-insensitive match
  let { data, error } = await supabase
    .from("departments")
    .select("id")
    .ilike("name", v)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data.id;

  // create new
  const ins = await supabase
    .from("departments")
    .insert({ name: v })
    .select("id")
    .single();
  if (ins.error) throw ins.error;
  return ins.data.id;
}

export async function ensureCategory(departmentId, name) {
  const v = norm(name);
  if (!departmentId) throw new Error("departmentId required");
  if (!v) throw new Error("Category name required");

  let { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("department_id", departmentId)
    .ilike("name", v)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data.id;

  const ins = await supabase
    .from("categories")
    .insert({ department_id: departmentId, name: v })
    .select("id")
    .single();
  if (ins.error) throw ins.error;
  return ins.data.id;
}

export async function ensureSubcategory(categoryId, name) {
  const v = norm(name);
  if (!categoryId) throw new Error("categoryId required");
  if (!v) throw new Error("Subcategory name required");

  let { data, error } = await supabase
    .from("subcategories")
    .select("id")
    .eq("category_id", categoryId)
    .ilike("name", v)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data.id;

  const ins = await supabase
    .from("subcategories")
    .insert({ category_id: categoryId, name: v })
    .select("id")
    .single();
  if (ins.error) throw ins.error;
  return ins.data.id;
}
