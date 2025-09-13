import React, { useEffect, useMemo, useState } from "react";
import {
  listDepartments,
  listCategories,
  listSubcategories,
  ensureDepartment,
  ensureCategory,
  ensureSubcategory,
} from "../db/taxonomy";

/**
 * TaxonomyPicker
 * - 3 cascading inputs: Department -> Category -> Sub-category
 * - Each input is searchable and can add a new option inline
 * - Returns { department, category, subcategory } via onChange (each is {id, name} or null)
 *
 * Props:
 *  - value?: { department?: {id,name}, category?: {id,name}, subcategory?: {id,name} }
 *  - onChange: (value) => void
 *  - requiredLevels?: { department?: boolean, category?: boolean, subcategory?: boolean }
 *  - disabled?: boolean
 *  - className?: string
 */
export default function TaxonomyPicker({
  value,
  onChange,
  requiredLevels = { department: true, category: true, subcategory: false },
  disabled = false,
  className = "",
}) {
  // Selected
  const [department, setDepartment] = useState(value?.department ?? null);
  const [category, setCategory] = useState(value?.category ?? null);
  const [subcategory, setSubcategory] = useState(value?.subcategory ?? null);

  // Search text
  const [deptQuery, setDeptQuery] = useState("");
  const [catQuery, setCatQuery] = useState("");
  const [subQuery, setSubQuery] = useState("");

  // Options
  const [deptOpts, setDeptOpts] = useState([]);
  const [catOpts, setCatOpts] = useState([]);
  const [subOpts, setSubOpts] = useState([]);

  // Loading flags
  const [loadingDept, setLoadingDept] = useState(false);
  const [loadingCat, setLoadingCat] = useState(false);
  const [loadingSub, setLoadingSub] = useState(false);

  // Helper: notify parent
  const emit = (d, c, s) => {
    onChange?.({
      department: d ? { id: d.id, name: d.name } : null,
      category: c ? { id: c.id, name: c.name } : null,
      subcategory: s ? { id: s.id, name: s.name } : null,
    });
  };

  // Initial fetch for departments
  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingDept(true);
      try {
        const rows = await listDepartments(deptQuery);
        if (active) setDeptOpts(rows ?? []);
      } finally {
        if (active) setLoadingDept(false);
      }
    })();
    return () => (active = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptQuery]);

  // Fetch categories when department or query changes
  useEffect(() => {
    let active = true;
    (async () => {
      if (!department?.id) {
        setCatOpts([]);
        return;
      }
      setLoadingCat(true);
      try {
        const rows = await listCategories(department.id, catQuery);
        if (active) setCatOpts(rows ?? []);
      } finally {
        if (active) setLoadingCat(false);
      }
    })();
    return () => (active = false);
  }, [department?.id, catQuery]);

  // Fetch subcategories when category or query changes
  useEffect(() => {
    let active = true;
    (async () => {
      if (!category?.id) {
        setSubOpts([]);
        return;
      }
      setLoadingSub(true);
      try {
        const rows = await listSubcategories(category.id, subQuery);
        if (active) setSubOpts(rows ?? []);
      } finally {
        if (active) setLoadingSub(false);
      }
    })();
    return () => (active = false);
  }, [category?.id, subQuery]);

  // When external value changes (edit mode)
  useEffect(() => {
    if (value) {
      setDepartment(value.department ?? null);
      setCategory(value.category ?? null);
      setSubcategory(value.subcategory ?? null);
    }
  }, [value?.department?.id, value?.category?.id, value?.subcategory?.id]); // stable enough

  // Reset children if parent changes
  useEffect(() => {
    setCategory(null);
    setSubcategory(null);
    setCatQuery("");
    setSubQuery("");
    emit(department, null, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department?.id]);

  useEffect(() => {
    setSubcategory(null);
    setSubQuery("");
    emit(department, category, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category?.id]);

  // Simple filtering on the client too (instant feel)
  const filteredDept = useMemo(
    () =>
      deptQuery
        ? deptOpts.filter((o) => o.name.toLowerCase().includes(deptQuery.toLowerCase()))
        : deptOpts,
    [deptOpts, deptQuery]
  );
  const filteredCat = useMemo(
    () =>
      catQuery
        ? catOpts.filter((o) => o.name.toLowerCase().includes(catQuery.toLowerCase()))
        : catOpts,
    [catOpts, catQuery]
  );
  const filteredSub = useMemo(
    () =>
      subQuery
        ? subOpts.filter((o) => o.name.toLowerCase().includes(subQuery.toLowerCase()))
        : subOpts,
    [subOpts, subQuery]
  );

  // Add-new handlers
  const addNewDepartment = async () => {
    const name = deptQuery.trim();
    if (!name) return;
    const row = await ensureDepartment(name);
    setDepartment(row);
    setDeptQuery("");
    emit(row, null, null);
  };

  const addNewCategory = async () => {
    if (!department?.id) return;
    const name = catQuery.trim();
    if (!name) return;
    const row = await ensureCategory(department.id, name);
    setCategory(row);
    setCatQuery("");
    emit(department, row, null);
  };

  const addNewSubcategory = async () => {
    if (!category?.id) return;
    const name = subQuery.trim();
    if (!name) return;
    const row = await ensureSubcategory(category.id, name);
    setSubcategory(row);
    setSubQuery("");
    emit(department, category, row);
  };

  // Render helpers
  const Box = ({ label, required, children }) => (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-sm font-medium text-gray-300">
        {label} {required ? <span className="text-red-400">*</span> : null}
      </label>
      {children}
    </div>
  );

  const List = ({ items, onSelect, emptyAddLabel, onAdd, loading }) => (
    <div className="mt-1 max-h-44 overflow-auto rounded-xl border border-gray-700 bg-gray-800">
      {loading ? (
        <div className="px-3 py-2 text-sm text-gray-400">Loading…</div>
      ) : items.length ? (
        items.map((o) => (
          <button
            key={o.id}
            type="button"
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700"
            onClick={() => onSelect(o)}
          >
            {o.name}
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-sm text-gray-400">
          No matches.
          {onAdd && (
            <>
              {" "}
              <button
                type="button"
                className="underline hover:no-underline"
                onClick={onAdd}
              >
                {emptyAddLabel}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      {/* Department */}
      <Box label="Department" required={!!requiredLevels.department}>
        <div className="relative">
          <input
            type="text"
            disabled={disabled}
            value={department ? department.name : deptQuery}
            onChange={(e) => {
              setDepartment(null); // typing means we’re searching
              setDeptQuery(e.target.value);
            }}
            placeholder="Search or type to add…"
            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          {/* options */}
          <List
            items={department ? [] : filteredDept}
            loading={loadingDept}
            onSelect={(o) => setDepartment(o)}
            onAdd={deptQuery.trim() ? addNewDepartment : undefined}
            emptyAddLabel={`Add “${deptQuery.trim()}”`}
          />
        </div>
      </Box>

      {/* Category */}
      <Box label="Category" required={!!requiredLevels.category}>
        <div className="relative">
          <input
            type="text"
            disabled={disabled || !department}
            value={category ? category.name : catQuery}
            onChange={(e) => {
              setCategory(null);
              setCatQuery(e.target.value);
            }}
            placeholder={department ? "Search or type to add…" : "Select a department first"}
            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none disabled:opacity-50 focus:ring-2 focus:ring-blue-500"
          />
          <List
            items={category || !department ? [] : filteredCat}
            loading={loadingCat}
            onSelect={(o) => setCategory(o)}
            onAdd={department && catQuery.trim() ? addNewCategory : undefined}
            emptyAddLabel={`Add “${catQuery.trim()}”`}
          />
        </div>
      </Box>

      {/* Sub-category */}
      <Box label="Sub-category" required={!!requiredLevels.subcategory}>
        <div className="relative">
          <input
            type="text"
            disabled={disabled || !category}
            value={subcategory ? subcategory.name : subQuery}
            onChange={(e) => {
              setSubcategory(null);
              setSubQuery(e.target.value);
            }}
            placeholder={category ? "Search or type to add…" : "Select a category first"}
            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none disabled:opacity-50 focus:ring-2 focus:ring-blue-500"
          />
          <List
            items={subcategory || !category ? [] : filteredSub}
            loading={loadingSub}
            onSelect={(o) => {
              setSubcategory(o);
              emit(department, category, o);
            }}
            onAdd={category && subQuery.trim() ? addNewSubcategory : undefined}
            emptyAddLabel={`Add “${subQuery.trim()}”`}
          />
        </div>
      </Box>
    </div>
  );
}
