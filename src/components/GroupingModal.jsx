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

/** Small combobox with typeahead */
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

  // typed values
  const [depText, setDepText] = useState("");
  const [catText, setCatText] = useState("");
  const [subText, setSubText] = useState("");

  // selected ids (when picked from list)
  const [depId, setDepId] = useState(null);
  const [catId, setCatId] = useState(null);
  const [subId, setSubId] = useState(null);

  const [deps, setDeps] = useState([]);
  const [cats, setCats] = useState([]);
  const [subs, setSubs] = useState([]);

  // Load departments on open
  useEffect(() => {
    if (!open) return;
    (async () => {
      const rows = await listDepartments();
      setDeps(rows?.map((r) => ({ id: r.id, name: r.name ?? r.title })) || []);
    })();
  }, [open]);

  // Prefill
  useEffect(() => {
    if (!open) return;
    // initial can be: { id?, department?, category?, subcategory? }
    setDepText(initial?.department || "");
    setCatText(initial?.category || "");
    setSubText(initial?.subcategory || "");
    setDepId(null);
    setCatId(null);
    setSubId(null);
    setCats([]);
    setSubs([]);

    // If department given, try to resolve it to id to load categories
    (async () => {
      if (initial?.department) {
        const match = (await listDepartments()).find(
          (d) => (d.name ?? d.title) === initial.department
        );
        if (match) {
          setDepId(match.id);
          const cs = await listCategories(match.id);
          setCats(cs?.map((r) => ({ id: r.id, name: r.name ?? r.title })) || []);
        }
      }
      if (initial?.category && depId) {
        const c = (await listCategories(depId)).find(
          (x) => (x.name ?? x.title) === initial.category
        );
        if (c) {
          setCatId(c.id);
          const ss = await listSubcategories(c.id);
          setSubs(ss?.map((r) => ({ id: r.id, name: r.name ?? r.title })) || []);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // When choosing existing dep, load categories
  useEffect(() => {
    (async () => {
      if (!depId) {
        setCats([]);
        setCatId(null);
        return;
      }
      const rows = await listCategories(depId);
      setCats(rows?.map((r) => ({ id: r.id, name: r.name ?? r.title })) || []);
    })();
  }, [depId]);

  // When choosing existing cat, load subs
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

  // picking existing items
  function onPickDep(it) {
    setDepId(it.id);
    setDepText(it.name);
    setCatText("");
    setCatId(null);
    setSubText("");
    setSubId(null);
  }
  function onPickCat(it) {
    setCatId(it.id);
    setCatText(it.name);
    setSubText("");
    setSubId(null);
  }
  function onPickSub(it) {
    setSubId(it.id);
    setSubText(it.name);
  }

  // if user edits text, clear selected ids
  useEffect(() => {
    if (depId && deps.find((d) => d.id === depId)?.name !== depText) {
      setDepId(null);
      setCats([]);
      setCatId(null);
      setSubId(null);
      setSubText("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depText]);
  useEffect(() => {
    if (catId && cats.find((c) => c.id === catId)?.name !== catText) {
      setCatId(null);
      setSubs([]);
      setSubId(null);
      setSubText("");
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

    // Ensure/create taxonomy chain first (so typeahead keeps showing them later)
    const finalDepId = depId ?? (await ensureDepartment(depText.trim()));
    const finalCatId = catId ?? (await ensureCategory(finalDepId, catText.trim()));
    const finalSubId = subId ?? (await ensureSubcategory(finalCatId, subText.trim()));

    // ensureSubcategory returns id; we don’t need it for saving by name but it guarantees presence
    await ensureSubcategory(finalCatId, subText.trim());

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
              placeholder="Type or pick..."
            />
            <ComboBox
              label="Category"
              valueText={catText}
              setValueText={setCatText}
              items={depId ? cats : []}
              disabled={!depText.trim()}
              onPick={onPickCat}
              placeholder={depId ? "Type or pick..." : "Select/enter department first"}
            />
            <ComboBox
              label="Sub-category"
              valueText={subText}
              setValueText={setSubText}
              items={catId ? subs : []}
              disabled={!catText.trim()}
              onPick={onPickSub}
              placeholder={catId ? "Type or pick..." : "Select/enter category first"}
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
