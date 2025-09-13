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
 * TaxonomyPicker — simple selects with a top "Add new ..." option
 * Department → Category → Sub-category
 */
export default function TaxonomyPicker({
  value,
  onChange,
  requiredLevels = { department: true, category: true, subcategory: false },
  disabled = false,
  className = "",
}) {
  const [department, setDepartment]   = useState(value?.department ?? null);
  const [category, setCategory]       = useState(value?.category ?? null);
  const [subcategory, setSubcategory] = useState(value?.subcategory ?? null);

  const [deptOpts, setDeptOpts] = useState([]);
  const [catOpts,  setCatOpts]  = useState([]);
  const [subOpts,  setSubOpts]  = useState([]);

  const [loadingDept, setLoadingDept] = useState(false);
  const [loadingCat,  setLoadingCat]  = useState(false);
  const [loadingSub,  setLoadingSub]  = useState(false);

  const emit = (d, c, s) => {
    onChange?.({
      department: d ? { id: d.id, name: d.name } : null,
      category:   c ? { id: c.id, name: c.name } : null,
      subcategory:s ? { id: s.id, name: s.name } : null,
    });
  };

  // Loaders
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingDept(true);
      try {
        const rows = await listDepartments();
        if (alive) setDeptOpts(rows ?? []);
      } finally {
        if (alive) setLoadingDept(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!department?.id) { setCatOpts([]); return; }
      setLoadingCat(true);
      try {
        const rows = await listCategories(department.id);
        if (alive) setCatOpts(rows ?? []);
      } finally {
        if (alive) setLoadingCat(false);
      }
    })();
    return () => { alive = false; };
  }, [department?.id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!category?.id) { setSubOpts([]); return; }
      setLoadingSub(true);
      try {
        const rows = await listSubcategories(category.id);
        if (alive) setSubOpts(rows ?? []);
      } finally {
        if (alive) setLoadingSub(false);
      }
    })();
    return () => { alive = false; };
  }, [category?.id]);

  // External value (edit mode)
  useEffect(() => {
    if (value) {
      setDepartment(value.department ?? null);
      setCategory(value.category ?? null);
      setSubcategory(value.subcategory ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.department?.id, value?.category?.id, value?.subcategory?.id]);

  // Add-new handlers
  async function handleAddDepartment() {
    const name = window.prompt("New department name:");
    if (!name || !name.trim()) return null;
    const row = await ensureDepartment(name.trim());
    const rows = await listDepartments();
    setDeptOpts(rows ?? []);
    setDepartment(row);
    setCategory(null);
    setSubcategory(null);
    emit(row, null, null);
    return row;
  }

  async function handleAddCategory() {
    if (!department?.id) return null;
    const name = window.prompt(`New category for "${department.name}":`);
    if (!name || !name.trim()) return null;
    const row = await ensureCategory(department.id, name.trim());
    const rows = await listCategories(department.id);
    setCatOpts(rows ?? []);
    setCategory(row);
    setSubcategory(null);
    emit(department, row, null);
    return row;
  }

  async function handleAddSubcategory() {
    if (!category?.id) return null;
    const name = window.prompt(`New sub-category for "${category.name}":`);
    if (!name || !name.trim()) return null;
    const row = await ensureSubcategory(category.id, name.trim());
    const rows = await listSubcategories(category.id);
    setSubOpts(rows ?? []);
    setSubcategory(row);
    emit(department, category, row);
    return row;
  }

  // OnChange handlers with special "__add__" value
  async function onDeptChange(e) {
    const val = e.target.value;
    if (val === "__add__") {
      await handleAddDepartment();
      return;
    }
    const sel = val ? deptOpts.find(d => d.id === val) : null;
    setDepartment(sel || null);
    setCategory(null);
    setSubcategory(null);
    emit(sel || null, null, null);
  }

  async function onCatChange(e) {
    const val = e.target.value;
    if (val === "__add__") {
      await handleAddCategory();
      return;
    }
    const sel = val ? catOpts.find(c => c.id === val) : null;
    setCategory(sel || null);
    setSubcategory(null);
    emit(department, sel || null, null);
  }

  async function onSubChange(e) {
    const val = e.target.value;
    if (val === "__add__") {
      await handleAddSubcategory();
      return;
    }
    const sel = val ? subOpts.find(s => s.id === val) : null;
    setSubcategory(sel || null);
    emit(department, category, sel || null);
  }

  // UI
  const Label = ({ children }) => <label className="text-sm font-medium text-gray-700">{children}</label>;
  const Select = (props) => (
    <select
      {...props}
      className={`flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ${props.className || ""}`}
    />
  );

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      {/* Department */}
      <div className="flex flex-col gap-1">
        <Label>
          Department {requiredLevels.department ? <span className="text-red-500">*</span> : null}
        </Label>
        <Select disabled={disabled} value={department?.id || ""} onChange={onDeptChange}>
          <option value="__add__">Add new department</option>
          <option value="">{loadingDept ? "Loading…" : "Select a department"}</option>
          {deptOpts.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1">
        <Label>
          Category {requiredLevels.category ? <span className="text-red-500">*</span> : null}
        </Label>
        <Select
          disabled={disabled || !department}
          value={category?.id || ""}
          onChange={onCatChange}
        >
          <option value="__add__" disabled={!department}>Add new category</option>
          <option value="">
            {!department ? "Select a department first" : (loadingCat ? "Loading…" : "Select a category")}
          </option>
          {catOpts.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </div>

      {/* Sub-category */}
      <div className="flex flex-col gap-1">
        <Label>
          Sub-category {requiredLevels.subcategory ? <span className="text-red-500">*</span> : null}
        </Label>
        <Select
          disabled={disabled || !category}
          value={subcategory?.id || ""}
          onChange={onSubChange}
        >
          <option value="__add__" disabled={!category}>Add new sub-category</option>
          <option value="">
            {!category ? "Select a category first" : (loadingSub ? "Loading…" : "Select a sub-category")}
          </option>
          {subOpts.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      </div>
    </div>
  );
}
