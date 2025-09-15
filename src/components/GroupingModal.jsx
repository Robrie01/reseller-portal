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

function ComboBox({
  label,
  valueText,
  setValueText,
  items,           // [{id, name}]
  disabled,
  onPick,          // (item) => void
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

export default function GroupingModal({ open, initial, onClose, onSaved }) {
  const isEdit = !!initial?.id;

  // text + ids
  const [depText, setDepText] = useState("");
  const [depId, setDepId] = useState(null);
  const [catText, setCatText] = useState("");
  const [catId, setCatId] = useState(null);
  const [subText, setSubText] = useState("");
  const [subId, setSubId] = useState(null);

  const [deps, setDeps] = useState([]);
  const [cats, setCats] = useState([]);
  const [subs, setSubs] = useState([]);

  const [saving, setSaving] = useState(false);

  // Load departments on open, then prefill chain (if initial present)
  useEffect(() => {
    if (!open) return;

    setSaving(false);
    setDepText(initial?.department || "");
    setCatText(initial?.category || "");
    setSubText(initial?.subcategory || "");
    setDepId(null);
    setCatId(null);
    setSubId(null);
    setCats([]);
    setSubs([]);

    (async () => {
      // 1) load all departments
      const drows = await listDepartments();
      const d = (drows || []).map((r) => ({ id: r.id, name: r.name ?? r.title }));
      setDeps(d);

      // Try to resolve department by name if provided
      if ((initial?.department || "").trim()) {
        const match = d.find(
          (x) => x.name.toLowerCase() === initial.department.trim().toLowerCase()
        );
        if (match) {
          setDepId(match.id);
          setDepText(match.name);
          // 2) load categories for that department
          const crows = await listCategories(match.id);
          const c = (crows || []).map((r) => ({ id: r.id, name: r.name ?? r.title }));
          setCats(c);

          if ((initial?.category || "").trim()) {
            const cmatch = c.find(
              (x) => x.name.toLowerCase() === initial.category.trim().toLowerCase()
            );
            if (cmatch) {
              setCatId(cmatch.id);
              setCatText(cmatch.name);
              // 3) load subcategories for that category
              const srows = await listSubcategories(cmatch.id);
              const s = (srows || []).map((r) => ({ id: r.id, name: r.name ?? r.title }));
              setSubs(s);

              if ((initial?.subcategory || "").trim()) {
                const smatch = s.find(
                  (x) => x.name.toLowerCase() === initial.subcategory.trim().toLowerCase()
                );
                if (smatch) {
                  setSubId(smatch.id);
                  setSubText(smatch.name);
                }
              }
            }
          }
        }
      }
    })();
  }, [open, initial]);

  // load categories when picking an existing department id
  useEffect(() => {
    (async () => {
      if (!depId) {
        setCats([]);
        setCatId(null);
        setSubId(null);
        setSubText("");
        return;
      }
      const rows = await listCategories(depId);
      setCats(rows?.map((r) => ({ id: r.id, name: r.name ?? r.title })) || []);
    })();
  }, [depId]);

  // load subcategories when picking an existing category id
  useEffect(() => {
    (async () => {
      if (!catId) {
        setSubs([]);
        setSubId(null);
        return;
      }
      const rows = await listSubcategories(catId);
      setSubs(rows?.map((r) => ({ id: r.id, name: r.name ?? r.title })) || []);
    })();
  }, [catId]);

  // Picking existing items
  function onPickDep(it) {
    setDepId(it.id);
    setDepText(it.name);
    setCatId(null);
    setCatText("");
    setSubId(null);
    setSubText("");
  }
  function onPickCat(it) {
    setCatId(it.id);
    setCatText(it.name);
    setSubId(null);
    setSubText("");
  }
  function onPickSub(it) {
    setSubId(it.id);
    setSubText(it.name);
  }

  // If user types (changes text), clear the corresponding id so we treat it as new
  useEffect(() => {
    if (depId && deps.find((d) => d.id === depId)?.name !== depText) {
      setDepId(null);
      setCats([]);
      setCatId(null);
      setSubId(null);
      setSubText("");
    }
  }, [depText]); // eslint-disable-line

  useEffect(() => {
    if (catId && cats.find((c) => c.id === catId)?.name !== catText) {
      setCatId(null);
      setSubs([]);
      setSubId(null);
      setSubText("");
    }
  }, [catText]); // eslint-disable-line

  useEffect(() => {
    if (subId && subs.find((s) => s.id === subId)?.name !== subText) {
      setSubId(null);
    }
  }, [subText]); // eslint-disable-line

  const canSave =
    depText.trim().length > 0 &&
    catText.trim().length > 0 &&
    subText.trim().length > 0 &&
    !saving;

  async function onSubmit() {
    if (!canSave) return;
    setSaving(true);
    try {
      // Always ensure/create chain, then use *ids* for analytics_groupings
      const depRowId = depId ?? (await ensureDepartment(depText.trim()))?.id;
      const catRowId = catId ?? (await ensureCategory(depRowId, catText.trim()))?.id;
      const subRowId = subId ?? (await ensureSubcategory(catRowId, subText.trim()))?.id;

      if (!depRowId || !catRowId || !subRowId) {
        throw new Error("Could not resolve taxonomy ids.");
      }

      if (isEdit && initial?.id) {
        await updateGroupingTriple(initial.id, {
          departmentId: depRowId,
          categoryId: catRowId,
          subcategoryId: subRowId,
        });
      } else {
        await addGroupingTriple({
          departmentId: depRowId,
          categoryId: catRowId,
          subcategoryId: subRowId,
        });
      }

      onClose?.();
      await onSaved?.();
    } catch (err) {
      alert(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className={overlay}>
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <h3 className="text-base font-semibold text-zinc-800">
            {isEdit ? "Edit Analytics Grouping" : "Add Analytics Grouping"}
          </h3>
          <button className="p-2 rounded-md hover:bg-zinc-100" onClick={() => onClose?.()}>
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
                  ? "New department—type a category"
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
                  ? "New category—type a sub-category"
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
            disabled={saving}
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
            {saving ? (isEdit ? "Saving…" : "Adding…") : isEdit ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
