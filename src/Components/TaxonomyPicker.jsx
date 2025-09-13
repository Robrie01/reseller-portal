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

  // Queries (typed text)
  const [deptQuery, setDeptQuery] = useState("");
  const [catQuery, setCatQuery] = useState("");
  const [subQuery, setSubQuery] = useState("");

  // Editing flags (controls dropdown visibility)
  const [deptEditing, setDeptEditing] = useState(false);
  const [catEditing, setCatEditing] = useState(false);
  const [subEditing, setSubEditing] = useState(false);

  // Options + loading
  const [deptOpts, setDeptOpts] = useState([]);
  const [catOpts, setCatOpts] = useState([]);
  const [subOpts, setSubOpts] = useState([]);
  const [loadingDept, setLoadingDept] = useState(false);
  const [loadingCat, setLoadingCat] = useState(false);
  const [loadingSub, setLoadingSub] = useState(false);

  // Refs
  const deptRef = useRef(null);
  const catRef = useRef(null);
  const subRef = useRef(null);

  // Emit to parent
  const emit = (d, c, s) =>
    onChange?.({
      department: d ? { id: d.id, name: d.name } : null,
      category: c ? { id: c.id, name: c.name } : null,
      subcategory: s ? { id: s.id, name: s.name } : null,
    });

  // Fetch lists (debounced by React state updates naturally)
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
    setCategory(null); setSubcategory(null);
    setCatQuery(""); setSubQuery("");
    setCatEditing(false); setSubEditing(false);
    emit(department, null, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department?.id]);

  useEffect(() => {
    setSubcategory(null);
    setSubQuery("");
    setSubEditing(false);
    emit(department, category, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category?.id]);

  // Client-side filters for instant feel
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

  // Add-new helpers
  const addNewDepartment = async () => {
    const name = deptQuery.trim(); if (!name) return;
    const row = await ensureDepartment(name);
    setDepartment(row); setDeptQuery(""); setDeptEditing(false);
    emit(row, null, null);
    requestAnimationFrame(() => deptRef.current?.focus());
  };
  const addNewCategory = async () => {
    if (!department?.id) return;
    const name = catQuery.trim(); if (!name) return;
    const row = await ensureCategory(department.id, name);
    setCategory(row); setCatQuery(""); setCatEditing(false);
    emit(department, row, null);
    requestAnimationFrame(() => catRef.current?.focus());
  };
  const addNewSubcategory = async () => {
    if (!category?.id) return;
    const name = subQuery.trim(); if (!name) return;
    const row = await ensureSubcategory(category.id, name);
    setSubcategory(row); setSubQuery(""); setSubEditing(false);
    emit(department, category, row);
    requestAnimationFrame(() => subRef.current?.focus());
  };

  // Light dropdown; prevent focus steal by mouse
  const List = ({ open, items, onSelect, emptyAddLabel, onAdd, loading }) => {
    if (!open) return null;
    return (
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
              <>{" "}
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
  };

  // Shared input (no onBlur at all)
  const Input = ({
    refEl, label, required, disabled, valueText, placeholder,
    onFocus, onChange, onKeyDown,
  }) => (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-sm font-medium text-gray-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <input
        ref={refEl}
        type="text"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={valueText}
        onFocus={onFocus}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
    </div>
  );

  // Display values (editing shows query; otherwise selection text)
  const deptValue = deptEditing ? deptQuery : (department?.name ?? "");
  const catValue  = catEditing  ? catQuery  : (category?.name   ?? "");
  const subValue  = subEditing  ? subQuery  : (subcategory?.name ?? "");

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      {/* Department */}
      <div className="relative">
        <Input
          refEl={deptRef}
          label="Department"
          required={!!requiredLevels.department}
          disabled={disabled}
          valueText={deptValue}
          placeholder="Search or type to add…"
          onFocus={() => { setDeptEditing(true); }}
          onChange={(e) => {
            setDeptEditing(true);
            setDeptQuery(e.target.value);
            if (department) setDepartment(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setDeptEditing(false);
            if (e.key === "Enter" && deptQuery.trim() && !filteredDept.length) {
              e.preventDefault(); addNewDepartment();
            }
          }}
        />
        <List
          open={deptEditing}
          items={filteredDept}
          loading={loadingDept}
          onSelect={(o) => { setDepartment(o); setDeptEditing(false); emit(o, null, null); }}
          onAdd={deptQuery.trim() ? addNewDepartment : undefined}
          emptyAddLabel={`Add “${deptQuery.trim()}”`}
        />
      </div>

      {/* Category */}
      <div className="relative">
        <Input
          refEl={catRef}
          label="Category"
          required={!!requiredLevels.category}
          disabled={disabled || !department}
          valueText={catValue}
          placeholder={department ? "Search or type to add…" : "Select a department first"}
          onFocus={() => { if (department) setCatEditing(true); }}
          onChange={(e) => {
            setCatEditing(true);
            setCatQuery(e.target.value);
            if (category) setCategory(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setCatEditing(false);
            if (e.key === "Enter" && catQuery.trim() && !filteredCat.length) {
              e.preventDefault(); addNewCategory();
            }
          }}
        />
        <List
          open={!!department && catEditing}
          items={filteredCat}
          loading={loadingCat}
          onSelect={(o) => { setCategory(o); setCatEditing(false); emit(department, o, null); }}
          onAdd={department && catQuery.trim() ? addNewCategory : undefined}
          emptyAddLabel={`Add “${catQuery.trim()}”`}
        />
      </div>

      {/* Sub-category */}
      <div className="relative">
        <Input
          refEl={subRef}
          label="Sub-category"
          required={!!requiredLevels.subcategory}
          disabled={disabled || !category}
          valueText={subValue}
          placeholder={category ? "Search or type to add…" : "Select a category first"}
          onFocus={() => { if (category) setSubEditing(true); }}
          onChange={(e) => {
            setSubEditing(true);
            setSubQuery(e.target.value);
            if (subcategory) setSubcategory(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSubEditing(false);
            if (e.key === "Enter" && subQuery.trim() && !filteredSub.length) {
              e.preventDefault(); addNewSubcategory();
            }
          }}
        />
        <List
          open={!!category && subEditing}
          items={filteredSub}
          loading={loadingSub}
          onSelect={(o) => { setSubcategory(o); setSubEditing(false); emit(department, category, o); }}
          onAdd={category && subQuery.trim() ? addNewSubcategory : undefined}
          emptyAddLabel={`Add “${subQuery.trim()}”`}
        />
      </div>
    </div>
  );
}
