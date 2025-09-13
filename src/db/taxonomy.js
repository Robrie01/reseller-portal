// src/db/taxonomy.js
import { supabase } from "../lib/supabaseClient";

/** ---------- LIST (with optional search) ---------- */
export async function listDepartments(search = "") {
  let q = supabase.from("departments")
    .select("id,name,is_active,created_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (search?.trim()) q = q.ilike("name", `%${search.trim()}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function listCategories(departmentId, search = "") {
  if (!departmentId) return [];
  let q = supabase.from("categories")
    .select("id,name,is_active,created_at,department_id")
    .eq("department_id", departmentId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (search?.trim()) q = q.ilike("name", `%${search.trim()}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function listSubcategories(categoryId, search = "") {
  if (!categoryId) return [];
  let q = supabase.from("subcategories")
    .select("id,name,is_active,created_at,category_id")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (search?.trim()) q = q.ilike("name", `%${search.trim()}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

/** ---------- ADD (returns the created row; safe on duplicates) ---------- */
// If user tries to add a duplicate (case-insensitive), we return the existing row.
async function handleUniqueInsert(table, payload, matchWhere) {
  const { data, error } = await supabase.from(table).insert(payload).select().single();

  if (!error) return data;

  // 23505 = unique violation (our case-insensitive unique index)
  if (error.code === "23505") {
    const { data: existing, error: e2 } = await supabase.from(table)
      .select("*").match(matchWhere).maybeSingle();
    if (e2) throw e2;
    if (existing) return existing;
  }
  throw error;
}

export async function addDepartment(name) {
  const clean = name?.trim();
  if (!clean) throw new Error("Department name required");
  return handleUniqueInsert(
    "departments",
    { name: clean },
    // match by lower(name) per user — Supabase client doesn’t allow lower() in match,
    // so we do a case-insensitive filter then exact in JS:
    {}
  ).then(async (row) => {
    if (row?.id) return row;
    // Fallback fetch (case-insensitive)
    const { data, error } = await supabase.from("departments")
      .select("*")
      .ilike("name", clean)
      .order("created_at", { ascending: true })
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  });
}

export async function addCategory(departmentId, name) {
  const clean = name?.trim();
  if (!departmentId) throw new Error("departmentId required");
  if (!clean) throw new Error("Category name required");
  return handleUniqueInsert(
    "categories",
    { department_id: departmentId, name: clean },
    { department_id: departmentId }
  ).then(async (row) => {
    if (row?.id) return row;
    const { data, error } = await supabase.from("categories")
      .select("*")
      .eq("department_id", departmentId)
      .ilike("name", clean)
      .order("created_at", { ascending: true })
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  });
}

export async function addSubcategory(categoryId, name) {
  const clean = name?.trim();
  if (!categoryId) throw new Error("categoryId required");
  if (!clean) throw new Error("Sub-category name required");
  return handleUniqueInsert(
    "subcategories",
    { category_id: categoryId, name: clean },
    { category_id: categoryId }
  ).then(async (row) => {
    if (row?.id) return row;
    const { data, error } = await supabase.from("subcategories")
      .select("*")
      .eq("category_id", categoryId)
      .ilike("name", clean)
      .order("created_at", { ascending: true })
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  });
}

/** ---------- ENSURE (create if missing, then return) ---------- */
export async function ensureDepartment(name) {
  // Try exact (case-insensitive) fetch first
  const { data } = await supabase.from("departments")
    .select("*").ilike("name", name).limit(1);
  if (data?.[0]) return data[0];
  return addDepartment(name);
}

export async function ensureCategory(departmentId, name) {
  const { data } = await supabase.from("categories")
    .select("*")
    .eq("department_id", departmentId)
    .ilike("name", name)
    .limit(1);
  if (data?.[0]) return data[0];
  return addCategory(departmentId, name);
}

export async function ensureSubcategory(categoryId, name) {
  const { data } = await supabase.from("subcategories")
    .select("*")
    .eq("category_id", categoryId)
    .ilike("name", name)
    .limit(1);
  if (data?.[0]) return data[0];
  return addSubcategory(categoryId, name);
}
