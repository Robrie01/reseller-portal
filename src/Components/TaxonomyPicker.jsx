// src/components/TaxonomyPicker.jsx
import React, { useEffect, useState } from "react";
import GroupingModal from "./GroupingModal";
import {
  listDepartments,
  listCategories,
  listSubcategories,
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

  // Add-new modal
  const [openGrouping, setOpenGrouping] = useState(false);
  const [groupingCtx, setGroupingCtx] = useState({}); // { departmentName?, categoryName?, subcategoryName? }

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

  // Open modal helpers (prefill context based on where user clicked)
  function openAddDepartment() {
    setGroupingCtx({});
    setOpenGrouping(true);
  }
  function openAddCategory() {
    if (!department) return;
    setGroupingCtx({ departmentName: department.name });
    setOpenGrouping(true);
  }
  function openAddSubcategory() {
    if (!department || !category) return;
    setGroupingCtx({ departmentName: department.name, categoryName: category.name });
    setOpenGrouping(true);
  }

  // OnChange handlers (catch the "__add__" sentinel)
  async function onDeptChange(e) {
    const val = e.target.value;
    if (val === "__add__") {
      openAddDepartment();
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
      openAddCategory();
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
      openAddSubcategory();
      return;
    }
    const sel = val ? subOpts.find(s => s.id === val) : null;
    setSubcategory(sel || null);
    emit(department, category, sel || null);
  }

  // UI bits
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

      {/* Add-Grouping modal */}
      <GroupingModal
        open={openGrouping}
        context={groupingCtx}
        onClose={() => setOpenGrouping(false)}
        onAdded={async ({ department: d, category: c, subcategory: s }) => {
          // Refresh and select newly added values
          const dep = d || department;
          const cat = c || category;
          const sub = s || subcategory;

          setDepartment(dep);
          const cats = dep?.id ? await listCategories(dep.id) : [];
          setCatOpts(cats);
          setCategory(cat);

          const subs = cat?.id ? await listSubcategories(cat.id) : [];
          setSubOpts(subs);
          setSubcategory(sub);

          emit(dep, cat, sub);
          setOpenGrouping(false);
        }}
      />
    </div>
  );
}
