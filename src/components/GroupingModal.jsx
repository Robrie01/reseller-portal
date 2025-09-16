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

const overlay = "fixed inset-0 bg-black/30 flex items-start justify-center p-4 z-50";
const panel = "w-full max-w-5xl rounded-2xl bg-white shadow-lg";
const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200";
const btn = "rounded-md px-3 py-2 text-sm";
const labelCls = "block text-xs font-medium text-zinc-600 mb-1";

/** Combobox with typeahead */
function ComboBox({ label, value, setValue, items, disabled, onPick, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = useMemo(() => {
    const v = (value || "").toLowerCase().trim();
    if (!v) return items || [];
    return (items || []).filter((it) => (it.name || "").toLowerCase().includes(v));
  }, [value, items]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <label className={labelCls}>
        {label} <span className="text-rose-500">*</span>
      </label>
      <input
        className={inputCls}
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && !disabled && (
        <div className="absolute mt-1 w-full max-h-56 overflow-auto rounded-md border border-zinc-200 bg-white shadow">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-zinc-400">No matches</div>
          ) : (
            filtered.map((it) => (
              <button
                key={it.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50"
                onClick={() => {
                  onPick(it);
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

/**
 * Props:
 *  - open: boolean
 *  - initial: optional { id?, department?, category?, subcategory? }
 *  - onClose: fn()
 *  - onSaved: async fn() -> reload table
 */
export default function GroupingModal({ open, initial, onClose, onSaved }) {
  const isEdit = !!initial?.id;

  // text
  const [depText, setDepText] = useState("");
  const [catText, setCatText] = useState("");
  const [subText, setSubText] = useState("");

  // selected IDs for picked items (null if typing new)
  const [depId, setDepId] = useState(null);
  const [catId, setCatId] = useState(null);
  const [subId, setSubId] = useState(null);

  // choices
  const [deps, setDeps] = useState([]);
  const [cats, setCats] = useState([]);
  const [subs, setSubs] = useState([]);

  const [saving, setSaving] = useState(false);

  /** Load initial lists + prefill */
  useEffect(() => {
    if (!open) return;
    let _mounted = true;

    (async () => {
      const d = await listDepartments();
      if (!_mounted) return;
      setDeps(d);

      // Prefill from initial (add mode OR edit mode)
      const depName = (initial?.department || "").trim();
      const catName = (initial?.category || "").trim();
      const subName = (initial?.subcategory || "").trim();

      const depMatch = depName
        ? d.find((x) => (x.name || "").toLowerCase() === depName.toLowerCase())
        : null;

      setDepText(depName || "");
      setDepId(depMatch?.id || null);

      // If we have a department (picked or typed), load its categories
      let depForCats = depMatch?.id || null;
      if (depForCats) {
        const c = await listCategories(depForCats);
        if (!_mounted) return;
        setCats(c);

        const catMatch = catName
          ? c.find((x) => (x.name || "").toLowerCase() === catName.toLowerCase())
          : null;

        setCatText(catName || "");
        setCatId(catMatch?.id || null);

        // If we have a category ID, load subcategories
        if (catMatch?.id) {
          const s = await listSubcategories(catMatch.id);
          if (!_mounted) return;
          setSubs(s);

          const subMatch = subName
            ? s.find((x) => (x.name || "").toLowerCase() === subName.toLowerCase())
            : null;

          setSubText(subName || "");
          setSubId(subMatch?.id || null);
        } else {
          setSubs([]);
          setSubText(subName || "");
          setSubId(null);
        }
      } else {
        setCats([]);
        setSubs([]);
        setCatText(catName || "");
        setSubText(subName || "");
        setCatId(null);
        setSubId(null);
      }
    })();

    return () => {
      _mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.department, initial?.category, initial?.subcategory]);

  /** When a picked ID changes, load next-level lists */
  useEffect(() => {
    (async () => {
      if (depId) {
        const c = await listCategories(depId);
        setCats(c);
      } else {
        setCats([]);
        setCatId(null);
      }
      setSubs([]);
      setSubId(null);
    })();
  }, [depId]);

  useEffect(() => {
    (async () => {
      if (catId) {
        const s = await listSubcategories(catId);
        setSubs(s);
      } else {
        setSubs([]);
        setSubId(null);
      }
    })();
  }, [catId]);

  /** If user types (no longer equals picked item), clear the ID */
  useEffect(() => {
    if (depId && deps.find((d) => d.id === depId)?.name !== depText) {
      setDepId(null);
      setCatId(null);
      setSubId(null);
      setCats([]);
      setSubs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depText]);

  useEffect(() => {
    if (catId && cats.find((c) => c.id === catId)?.name !== catText) {
      setCatId(null);
      setSubId(null);
      setSubs([]);
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
      // 1) ensure/create IDs in order
      const finalDepId = depId ?? (await ensureDepartment(depText));
      const finalCatId = catId ?? (await ensureCategory(finalDepId, catText));
      const finalSubId = subId ?? (await ensureSubcategory(finalCatId, subText));

      // 2) add or update grouping (IDs only)
      if (isEdit) {
        await updateGroupingTriple(initial.id, {
          departmentId: finalDepId,
          categoryId: finalCatId,
          subcategoryId: finalSubId,
        });
      } else {
        await addGroupingTriple({
          departmentId: finalDepId,
          categoryId: finalCatId,
          subcategoryId: finalSubId,
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
      <div className={panel}>
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
              value={depText}
              setValue={setDepText}
              items={deps}
              disabled={false}
              onPick={(it) => {
                setDepId(it.id);
                setDepText(it.name);
              }}
              placeholder="Type or pick…"
            />
            <ComboBox
              label="Category"
              value={catText}
              setValue={setCatText}
              items={depId ? cats : []}
              disabled={!depText.trim()}
              onPick={(it) => {
                setCatId(it.id);
                setCatText(it.name);
              }}
              placeholder={depId ? "Type or pick…" : "Select/enter department first"}
            />
            <ComboBox
              label="Sub-category"
              value={subText}
              setValue={setSubText}
              items={catId ? subs : []}
              disabled={!catText.trim()}
              onPick={(it) => {
                setSubId(it.id);
                setSubText(it.name);
              }}
              placeholder={catId ? "Type or pick…" : "Select/enter category first"}
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-zinc-200 flex justify-end gap-2">
          <button className={`${btn} border border-zinc-300`} onClick={() => onClose?.()}>
            Cancel
          </button>
          <button
            className={`${btn} text-white ${canSave ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-300 cursor-not-allowed"}`}
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
