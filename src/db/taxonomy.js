// src/db/taxonomy.js
import { supabase } from "../lib/supabaseClient";

/**
 * All list* functions return SHARED (user_id IS NULL) + the current user's rows.
 * All ensure* functions:
 *   - return an existing shared/personal row if the name already exists (case-insensitive)
 *   - otherwise insert a NEW personal row for the current user
 */

// Helper: current user id (or throw)
async function getUserId() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const uid = data?.session?.user?.id;
  if (!uid) throw new Error("Not signed in.");
  return uid;
}

// ===== Lists =====
export async function listDepartments() {
  const uid = await getUserId();
  const { data, error } = await supabase
    .from("departments")
    .select("id, name")
    .eq("is_active", true)
    .or(`user_id.is.null,user_id.eq.${uid}`)
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function listCategories(departmentId) {
  if (!departmentId) return [];
  const uid = await getUserId();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("department_id", departmentId)
    .eq("is_active", true)
    .or(`user_id.is.null,user_id.eq.${uid}`)
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function listSubcategories(categoryId) {
  if (!categoryId) return [];
  const uid = await getUserId();
  const { data, error } = await supabase
    .from("subcategories")
    .select("id, name")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .or(`user_id.is.null,user_id.eq.${uid}`)
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

// ===== Ensure (create if missing) =====
export async function ensureDepartment(nameRaw) {
  const name = String(nameRaw || "").trim();
  if (!name) throw new Error("Department name required.");
  const uid = await getUserId();

  // 1) try shared or own (case-insensitive)
  const { data: existing, error: selErr } = await supabase
    .from("departments")
    .select("id, name, user_id")
    .or(`user_id.is.null,user_id.eq.${uid}`)
    .ilike("name", name)
    .limit(1)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return { id: existing.id, name: existing.name };

  // 2) insert personal
  const { data, error } = await supabase
    .from("departments")
    .insert({ user_id: uid, name, is_active: true })
    .select("id, name")
    .single();
  if (error) throw error;
  return data;
}

export async function ensureCategory(departmentId, nameRaw) {
  const name = String(nameRaw || "").trim();
  if (!departmentId) throw new Error("departmentId required.");
  if (!name) throw new Error("Category name required.");
  const uid = await getUserId();

  // 1) try shared or own (same department)
  const { data: existing, error: selErr } = await supabase
    .from("categories")
    .select("id, name, user_id")
    .eq("department_id", departmentId)
    .or(`user_id.is.null,user_id.eq.${uid}`)
    .ilike("name", name)
    .limit(1)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return { id: existing.id, name: existing.name };

  // 2) insert personal
  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: uid, department_id: departmentId, name, is_active: true })
    .select("id, name")
    .single();
  if (error) throw error;
  return data;
}

export async function ensureSubcategory(categoryId, nameRaw) {
  const name = String(nameRaw || "").trim();
  if (!categoryId) throw new Error("categoryId required.");
  if (!name) throw new Error("Sub-category name required.");
  const uid = await getUserId();

  // 1) try shared or own (same category)
  const { data: existing, error: selErr } = await supabase
    .from("subcategories")
    .select("id, name, user_id")
    .eq("category_id", categoryId)
    .or(`user_id.is.null,user_id.eq.${uid}`)
    .ilike("name", name)
    .limit(1)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return { id: existing.id, name: existing.name };

  // 2) insert personal
  const { data, error } = await supabase
    .from("subcategories")
    .insert({ user_id: uid, category_id: categoryId, name, is_active: true })
    .select("id, name")
    .single();
  if (error) throw error;
  return data;
}
