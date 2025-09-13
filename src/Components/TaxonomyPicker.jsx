import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listDepartments,
  listCategories,
  listSubcategories,
  ensureDepartment,
  ensureCategory,
  ensureSubcategory,
} from "../db/taxonomy";

export default function TaxonomyPicker({
  value,
  onChange,
  requiredLevels = { department: true, category: true, subcategory: false },
  disabled = false,
  className = "",
}) {
  // Selected rows
  const [department, setDepartment] = useState(value?.department ?? null);
  const [category, setCategory] = useState(value?.category ?? null);
  const [subcategory, setSubcategory] = useState(value?.subcategory ?? null);

  // Queries
  const [deptQuery, setDeptQuery] = useState("");
  const [catQuery, setCatQuery] = useState("");
  const [subQuery, setSubQuery] = useState("");

  // Options
  const [deptOpts, setDeptOpts] = useState([]);
  const [catOpts, setCatOpts] = useState([]);
  const [subOpts, setSubOpts] = useState([]);

  // Loading
  const [loadingDept, setLoadingDept] = useState(false);
  const [loadingCat, setLoadingCat] = useState(false);
  const [loadingSub, setLoadingSub] = useState(false);

  // Refs to keep focus
  const deptRef = useRef(null);
  const catRef = useRef(null);
  const subRef = useRef(null);

  const emit = (d, c, s) =>
    onChange?.({
      department: d ? { id: d.id, name: d.name } : null,
      category: c ? { id: c.id, name: c.name } : null,
      subcategory: s ? { id: s.id, name: s.name } : null,
    });

  // Data fetching
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingDept(true);
      try {
        const rows = await listDepartments(deptQuery);
        if (alive) setDeptOpts(rows ?? []);
      } finally {
        if (alive) setLoadingDept(false);
      }
    })();
    return () => { alive = false; };
  }, [deptQuery]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!department?.id) { setCatOpts([]); return; }
      setLoadingCat(true);
      try {
        const rows = await listCategories(department.id, catQuery);
        if (alive) setCatOpts(rows ?? []);
      } finally {
        if (alive) setLoadingCat(false);
      }
    })();
    return () => { alive = false; };
  }, [department?.id, catQuery]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!category?.id) { setSubOpts([]); return; }
      setLoadingSub(true);
      try {
        const rows = await listSubcategories(category.id, subQuery);
        if (alive) setSubOpts(rows ?? []);
      } finally {
        if (alive) setLoadingSub(false);
      }
    })();
    return () => { alive = false; };
  }, [category?.id, subQuery]);

  // External value (edit)
  useEffect(() => {
    if (value) {
      setDepartment(value.department ?? null);
      setCategory(value.category ?? null);
      setSubcategory(value.subcategory ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.department?.id, value?.category?.id, value?.subcategory?.id]);

  // Clear children when parent changes
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

  const filteredDept = useMemo(
    () => (deptQuery ? deptOpts.filter(o => o.name.toLowerCase().includes(deptQuery.toLowerCase())) : deptOpts),
    [deptOpts, deptQuery]
  );
  const filteredCat = useMemo(
    () => (catQuery ? catOpts.filter(o => o.name.toLowerCase().includes(catQuery.toLowerCase())) : catOpts),
    [catOpts, catQuery]
  );
  const filteredSub = useMemo(
    () => (subQuery ? subOpts.filter(o => o.name.toLowerCase().includes(subQuery.toLowerCase())) : subOpts),
    [subOpts, subQuery]
  );

  // Add-new handlers
  const addNewDepartment = async () => {
    const name = deptQuery.trim(); if (!name) return;
    const row = await ensureDepartment(name);
    setDepartment(row); setDeptQuery(""); emit(row, null, null);
    requestAnimationFrame(() => deptRef.current?.focus());
  };
  const addNewCategory = async () => {
    if (!department?.id) return;
    const name = catQuery.trim(); if (!name) return;
    const row = await ensureCategory(department.id, name);
    setCategory(row); setCatQuery(""); emit(department, row, null);
    requestAnimationFrame(() => catRef.current?.focus());
  };
  const addNewSubcategory = async () => {
    if (!category?.id) return;
    const name = subQuery.trim(); if (!name) return;
    const row = await ensureSubcategory(category.id, name);
    setSubcategory(row); setSubQuery(""); emit(department, category, row);
    requestAnimationFrame(() => subRef.current?.focus());
  };

  const Box = ({ label, required, children }) => (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-sm font-medium text-gray-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      {children}
    </div>
  );

  // Light dropdown; don't steal focus on click
  const List = ({ items, onSelect, emptyAddLabel, onAdd, loading }) => (
    <div
      className="absolute left-0 right-0 mt-1 max-h-48 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg z-20"
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
    >
      {loading ? (
        <div className="px-3 py-2 text-sm text-gray-500">Loading…</div>
      ) : items.length ? (
        items.map((o) => (
          <button
            key={o.id}
            type="button"
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
            onClick={() => onSelect(o)}
          >
            {o.name}
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-sm text-gray-500">
          No matches.
          {onAdd && (
            <>
              {" "}
              <button
                type="button"
                className="text-blue-600 underline hover:no-underline"
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

  // Re-focus the same input if it ever blurs unexpectedly
  const keepFocus = (ref) => () => {
    // Delay to allow click selection; if focus moved outside our container, put it back
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      if (document.activeElement !== el) el.focus();
    });
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      {/* Department */}
      <Box label="Department" required={!!requiredLevels.department}>
        <div className="relative">
          <input
            ref={deptRef}
            type="text"
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            value={department ? department.name : deptQuery}
            onChange={(e) => setDeptQuery(e.target.value)}
            onBlur={keepFocus(deptRef)}
            placeholder="Search or type to add…"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
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
            ref={catRef}
            type="text"
            autoComplete="off"
            spellCheck={false}
            disabled={disabled || !department}
            value={category ? category.name : catQuery}
            onChange={(e) => setCatQuery(e.target.value)}
            onBlur={keepFocus(catRef)}
            placeholder={department ? "Search or type to add…" : "Select a department first"}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none disabled:opacity-50 focus:ring-2 focus:ring-blue-500"
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
            ref={subRef}
            type="text"
            autoComplete="off"
            spellCheck={false}
            disabled={disabled || !category}
            value={subcategory ? subcategory.name : subQuery}
            onChange={(e) => setSubQuery(e.target.value)}
            onBlur={keepFocus(subRef)}
            placeholder={category ? "Search or type to add…" : "Select a category first"}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none disabled:opacity-50 focus:ring-2 focus:ring-blue-500"
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
