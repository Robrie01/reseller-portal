import React, { useEffect, useState } from "react";
import {
  listDepartments,
  listCategories,
  listSubcategories,
  ensureDepartment,
  ensureCategory,
  ensureSubcategory,
} from "../db/taxonomy";

/**
 * TaxonomyPicker — SIMPLE mode (no search)
 * - Three selects (Department → Category → Sub-category)
 * - Each has an "Add new ..." button that prompts for a name and saves it
 * - Light theme to match your UI
 */
export default function TaxonomyPicker({
  value,
  onChange,
  requiredLevels = { department: true, category: true, subcategory: false },
  disabled = false,
  className = "",
}) {
  // Selected IDs + names (we keep the object for parent emit)
  const [department, setDepartment]   = useState(value?.department ?? null);
  const [category, setCategory]       = useState(value?.category ?? null);
  const [subcategory, setSubcategory] = useState(value?.subcategory ?? null);

  // Options
  const [deptOpts, setDeptOpts] = useState([]);
  const [catOpts,  setCatOpts]  = useState([]);
  const [subOpts,  setSubOpts]  = useState([]);

  // Loading flags
  const [loadingDept, setLoadingDept] = useState(false);
  const [loadingCat,  setLoadingCat]  = useState(false);
  const [loadingSub,  setLoadingSub]  = useState(false);

  // Emit helper
  const emit = (d, c, s) => {
    onChange?.({
      department: d ? { id: d.id, name: d.name } : null,
      category:   c ? { id: c.id, name: c.name } : null,
      subcategory:s ? { id: s.id, name: s.name } : null,
    });
  };

  // Load departments on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingDept(true);
      try {
        const rows = await listDepartments();
        if (!alive) return;
        setDeptOpts(rows ?? []);
      } finally {
        if (alive) setLoadingDept(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Load categories when department changes
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!department?.id) { setCatOpts([]); return; }
      setLoadingCat(true);
      try {
        const rows = await listCategories(department.id);
        if (!alive) return;
        setCatOpts(rows ?? []);
      } finally {
        if (alive) setLoadingCat(false);
      }
    })();
    return () => { alive = false; };
  }, [department?.id]);

  // Load subcategories when category changes
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!category?.id) { setSubOpts([]); return; }
      setLoadingSub(true);
      try {
        const rows = await listSubcategories(category.id);
        if (!alive) return;
        setSubOpts(rows ?? []);
      } finally {
        if (alive) setLoadingSub(false);
      }
    })();
    return () => { alive = false; };
  }, [category?.id]);

  // If parent passes a new value (edit mode), hydrate local selections
  useEffect(() => {
    if (value) {
      setDepartment(value.department ?? null);
      setCategory(value.category ?? null);
      setSubcategory(value.subcategory ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.department?.id, value?.category?.id, value?.subcategory?.id]);

  // Add-new actions via prompt()
  async function addDept() {
    if (disabled) return;
    const name = window.prompt("New department name:");
    if (!name || !name.trim()) return;
    const row = await ensureDepartment(name.trim());
    // refresh list + select the new one
    const rows = await listDepartments();
    setDeptOpts(rows ?? []);
    setDepartment(row);
    setCategory(null);
    setSubcategory(null);
    emit(row, null, null);
  }

  async function addCat() {
    if (disabled || !department?.id) return;
    const name = window.prompt(`New category for "${department.name}":`);
    if (!name || !name.trim()) return;
    const row = await ensureCategory(department.id, name.trim());
    const rows = await listCategories(department.id);
    setCatOpts(rows ?? []);
    setCategory(row);
    setSubcategory(null);
    emit(department, row, null);
  }

  async function addSub() {
    if (disabled || !category?.id) return;
    const name = window.prompt(`New sub-category for "${category.name}":`);
    if (!name || !name.trim()) return;
    const row = await ensureSubcategory(category.id, name.trim());
    const rows = await listSubcategories(category.id);
    setSubOpts(rows ?? []);
    setSubcategory(row);
    emit(department, category, row);
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      {/* Department */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Department {requiredLevels.department ? <span className="text-red-500">*</span> : null}
        </label>
        <div className="flex gap-2">
          <select
            disabled={disabled}
            value={department?.id || ""}
            onChange={(e) => {
              const id = e.target.value || null;
              const sel = id ? deptOpts.find(d => d.id === id) : null;
              setDepartment(sel || null);
              setCategory(null);
              setSubcategory(null);
              emit(sel || null, null, null);
            }}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">{loadingDept ? "Loading…" : "Select a department"}</option>
            {deptOpts.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={disabled}
            onClick={addDept}
            className="rounded-lg border px-3 py-2 text-sm bg-white hover:bg-gray-50"
            title="Add new department"
          >
            Add
          </button>
        </div>
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Category {requiredLevels.category ? <span className="text-red-500">*</span> : null}
        </label>
        <div className="flex gap-2">
          <select
            disabled={disabled || !department}
            value={category?.id || ""}
            onChange={(e) => {
              const id = e.target.value || null;
              const sel = id ? catOpts.find(c => c.id === id) : null;
              setCategory(sel || null);
              setSubcategory(null);
              emit(department, sel || null, null);
            }}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">{!department ? "Select a department first" : (loadingCat ? "Loading…" : "Select a category")}</option>
            {catOpts.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={disabled || !department}
            onClick={addCat}
            className="rounded-lg border px-3 py-2 text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
            title="Add new category"
          >
            Add
          </button>
        </div>
      </div>

      {/* Sub-category */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Sub-category {requiredLevels.subcategory ? <span className="text-red-500">*</span> : null}
        </label>
        <div className="flex gap-2">
          <select
            disabled={disabled || !category}
            value={subcategory?.id || ""}
            onChange={(e) => {
              const id = e.target.value || null;
              const sel = id ? subOpts.find(s => s.id === id) : null;
              setSubcategory(sel || null);
              emit(department, category, sel || null);
            }}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">{!category ? "Select a category first" : (loadingSub ? "Loading…" : "Select a sub-category")}</option>
            {subOpts.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={disabled || !category}
            onClick={addSub}
            className="rounded-lg border px-3 py-2 text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
            title="Add new sub-category"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
