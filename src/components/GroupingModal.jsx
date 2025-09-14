// src/components/GroupingModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  listDepartments,
  listCategories,
  listSubcategories,
  ensureDepartment,
  ensureCategory,
  ensureSubcategory,
} from "../db/taxonomy";
import { addGroupingTriple, updateGroupingTriple } from "../db/analytics";

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200";
const btnBase = "rounded-md px-3 py-2 text-sm transition-colors";
const overlay = "fixed inset-0 bg-black/30 flex items-start justify-center p-4 z-50";

/* ────────────────────────────────────────────────────────────────────────────
   Tiny ComboBox with typeahead filtering
   -------------------------------------------------------------------------- */
function ComboBox({
  label,
  valueText,
  setValueText,
  items,          // [{id, name}]
  disabled,
  onPick,         // (item) => void
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const filtered = useMemo(() => {
    const v = (valueText || "").trim().toLowerCase();
    if (!v) return items || [];
    return (items || []).filter((it) => (it.name ?? "").toLowerCase().includes(v));
  }, [valueText, items]);

  useEffect(() => {
    function onDoc(e) {
      if (!open) return;
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <label className="block text-xs font-medium text-zinc-600 mb-1">
        {label} <span className="text-rose-500">*</span>
      </label>
      <input
        className={inputCls}
        disabled={disabled}
        value={valueText}
        placeholder={placeholder}
        onChange={(e) => {
          setValueText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && !disabled && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-md border border-zinc-200 bg-white shadow-md">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-zinc-400">No matches</div>
          ) : (
            filtered.map((it) => (
              <button
                key={it.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50"
                onClick={() => {
                  onPick?.(it);
                  setOpen(false);
                }}
              >
                {it.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   GroupingModal
   -------------------------------------------------------------------------- */
export default function GroupingModal({ open, initial, onClose, onSaved }) {
  const isEdit = !!initial?.id;

  // Free-text shown in inputs + ids when an existing option is picked
  const [depText, setDepText] = useState("");
  const [depId, setDepId] = useState(null);
  const [catText, setCatText] = useState("");
  const [catId, setCatId] = useState(null);
  const [subText, setSubText] = useState("");
  const [subId, setSubId] = useState(null);

  // Lists
  const [deps, setDeps] = useState([]);
  const [cats, setCats] = useState([]);
  const [subs, setSubs] = useState([]);

  // helper: case-insensitive name match
  const byName = (name) => (x) => (x.name || "").toLowerCase() === (name || "").toLowerCase();

  /* Load departments when opened, and prefill from `initial` (works for add & edit).
     If `initial.department` matches an existing dept, we set depId + depText,
     otherwise we set just depText so it will be created on save. */
  useEffect(() => {
    if (!open) return;
    (async () => {
      const rows = await listDepartments();
      const list = rows?.map((r) => ({ id: r.id, name: r.name ?? r.title })) || [];
      setDeps(list);

      // Reset everything
      setDepId(null); setCatId(null); setSubId(null);
      setCats([]); setSubs([]);

      // Prefill text boxes
      setDepText(initial?.department ?? (isEdit ? initial?.department : ""));
      setCatText(initial?.category ?? (isEdit ? initial?.category : ""));
      setSubText(initial?.subcategory ?? (isEdit ? initial?.subcategory : ""));

      // Attempt to resolve department id if initial provided
      if (initial?.department) {
        const d = list.find(byName(initial.department));
        if (d) { setDepId(d.id); setDepText(d.name); }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* When department id exists, load categories and try to preselect `initial.category`. */
  useEffect(() => {
    (async () => {
      if (!depId) { setCats([]); setCatId(null); return; }
      const rows = await listCategories(depId);
      const list = rows?.map((r) => ({ id: r.id, name: r.name ?? r.title })) || [];
      setCats(list);

      if (initial?.category) {
        const c = list.find(byName(initial.category));
        if (c) { setCatId(c.id); setCatText(c.name); }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depId]);

  /* When category id exists, load subcategories and try to preselect `initial.subcategory`. */
  useEffect(() => {
    (async () => {
      if (!catId) { setSubs([]); setSubId(null); return; }
      const rows = await listSubcategories(catId);
      const list = rows?.map((r) => ({ id: r.id, name: r.name ?? r.title })) || [];
      setSubs(list);

      if (initial?.subcategory) {
        const s = list.find(byName(initial.subcategory));
        if (s) { setSubId(s.id); setSubText(s.name); }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catId]);

  // Picking existing options
  function onPickDep(it) {
    setDepId(it.id);
    setDepText(it.name);
    setCatText(""); setCatId(null);
    setSubText(""); setSubId(null);
  }
  function onPickCat(it) {
    setCatId(it.id);
    setCatText(it.name);
    setSubText(""); setSubId(null);
  }
  function onPickSub(it) {
    setSubId(it.id);
    setSubText(it.name);
  }

  // If the user edits text after picking, clear ids (treat as new values)
  useEffect(() => {
    if (depId && deps.find((d) => d.id === depId)?.name !== depText) {
      setDepId(null);
      setCats([]); setCatId(null);
      setSubs([]); setSubId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depText]);

  useEffect(() => {
    if (catId && cats.find((c) => c.id === catId)?.name !== catText) {
      setCatId(null);
      setSubs([]); setSubId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catText]);

  useEffect(() => {
    if (subId && subs.find((s) => s.id === subId)?.name !== subText) {
      setSubId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subText]);

  const canSave =
    depText.trim().length > 0 &&
    catText.trim().length > 0 &&
    subText.trim().length > 0;

  async function onSubmit() {
    if (!canSave) return;

    // Ensure/create hierarchy
    const finalDepId = depId ?? (await ensureDepartment(depText.trim()));
    const finalCatId = catId ?? (await ensureCategory(finalDepId, catText.trim()));
    const finalSubId = subId ?? (await ensureSubcategory(finalCatId, subText.trim()));
    void finalSubId; // not used directly below, but ensured

    const payload = {
      department: depText.trim(),
      category: catText.trim(),
      subcategory: subText.trim(),
    };

    if (isEdit) {
      await updateGroupingTriple(initial.id, payload);
    } else {
      await addGroupingTriple(payload);
    }

    onClose?.();
    await onSaved?.();
  }

  if (!open) return null;

  return (
    <div className={overlay}>
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <h3 className="text-base font-semibold text-zinc-800">
            {isEdit ? "Edit Analytics Grouping" : "Add Analytics Grouping"}
          </h3>
          <button
            className="p-2 rounded-md hover:bg-zinc-100"
            onClick={() => onClose?.()}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ComboBox
              label="Department"
              valueText={depText}
              setValueText={setDepText}
              items={deps}
              disabled={false}
              onPick={onPickDep}
              placeholder="Type or pick…"
            />
            <ComboBox
              label="Category"
              valueText={catText}
              setValueText={setCatText}
              items={depId ? cats : []}
              disabled={!depText.trim()}
              onPick={onPickCat}
              placeholder={
                depText.trim() && !depId
                  ? "New department — type a category"
                  : depId
                  ? "Type or pick…"
                  : "Select/enter department first"
              }
            />
            <ComboBox
              label="Sub-category"
              valueText={subText}
              setValueText={setSubText}
              items={catId ? subs : []}
              disabled={!catText.trim()}
              onPick={onPickSub}
              placeholder={
                catText.trim() && !catId
                  ? "New category — type a sub-category"
                  : catId
                  ? "Type or pick…"
                  : "Select/enter category first"
              }
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-zinc-200 flex justify-end gap-2">
          <button
            className={`${btnBase} border border-zinc-300 text-zinc-800`}
            onClick={() => onClose?.()}
          >
            Cancel
          </button>
          <button
            className={`${btnBase} text-white ${
              canSave ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-300 cursor-not-allowed"
            }`}
            disabled={!canSave}
            onClick={onSubmit}
          >
            {isEdit ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
