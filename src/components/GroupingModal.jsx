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

/* ──────────────────────────────────────────────────────────────────────────── */
function ComboBox({ label, valueText, setValueText, items, disabled, onPick, placeholder }) {
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

/* ──────────────────────────────────────────────────────────────────────────── */
export default function GroupingModal({ open, initial, onClose, onSaved }) {
  const isEdit = !!initial?.id;

  // Free text + ids when existing item is picked
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

  const byName = (name) => (x) => (x.name || "").toLowerCase() === (name || "").toLowerCase();
  const onlyId = (x) => (x && typeof x === "object" ? x.id : x); // tolerate ensure* returning row or id

  // Load departments and prefill texts from `initial` (works for add or edit)
  useEffect(() => {
    if (!open) return;
    (async () => {
      const rows = await listDepartments();
      const list = rows?.map((r) => ({ id: r.id, name: r.name ?? r.title })) || [];
      setDeps(list);

      // Reset ids & lists
      setDepId(null); setCatId(null); setSubId(null);
      setCats([]); setSubs([]);

      // Prefill texts from initial (if provided)
      setDepText(initial?.department || "");
      setCatText(initial?.category || "");
      setSubText(initial?.subcategory || "");

      // Resolve department id if it exists already
      if (initial?.department) {
        const d = list.find(byName(initial.department));
        if (d) { setDepId(d.id); setDepText(d.name); }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Load categories when we have a department id (and try resolve initial.category)
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

  // Load subcategories when we have a category id (and try resolve initial.subcategory)
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

  // Picking existing items
  function onPickDep(it) {
    setDepId(it.id); setDepText(it.name);
    setCatText(""); setCatId(null);
    setSubText(""); setSubId(null);
  }
  function onPickCat(it) {
    setCatId(it.id); setCatText(it.name);
    setSubText(""); setSubId(null);
  }
  function onPickSub(it) {
    setSubId(it.id); setSubText(it.name);
  }

  // Clear ids if the user edits text (treat as new)
  useEffect(() => {
    if (depId && deps.find((d) => d.id === depId)?.name !== depText) {
      setDepId(null); setCats([]); setCatId(null); setSubs([]); setSubId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depText]);
  useEffect(() => {
    if (catId && cats.find((c) => c.id === catId)?.name !== catText) {
      setCatId(null); setSubs([]); setSubId(null);
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
    subText.trim().length > 0 &&
    !saving;

  async function onSubmit() {
    if (!canSave) return;
    setSaving(true);
    try {
      const depName = depText.trim();
      const catName = catText.trim();
      const subName = subText.trim();

      // Ensure/resolve taxonomy chain (ok if already exists)
      const depResolved = onlyId(depId) ?? onlyId(await ensureDepartment(depName));
      const catResolved = onlyId(catId) ?? onlyId(await ensureCategory(depResolved, catName));
      await ensureSubcategory(catResolved, subName);

      const payload = { department: depName, category: catName, subcategory: subName };

      if (isEdit) {
        await updateGroupingTriple(initial.id, payload);
      } else {
        await addGroupingTriple(payload);
      }

      onClose?.();
      await onSaved?.();
    } catch (err) {
      console.error("Save grouping failed:", err);
      alert(err?.message || err?.error_description || "Could not save grouping.");
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
          <button className="p-2 rounded-md hover:bg-zinc-100" onClick={() => onClose?.()} aria-label="Close">
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
          <button className={`${btnBase} border border-zinc-300 text-zinc-800`} onClick={() => onClose?.()}>
            Cancel
          </button>
          <button
            className={`${btnBase} text-white ${
              canSave ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-300 cursor-not-allowed"
            }`}
            disabled={!canSave}
            onClick={onSubmit}
          >
            {saving ? "Saving…" : isEdit ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
