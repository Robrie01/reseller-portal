// src/components/GroupingModal.jsx
import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import TaxonomyPicker from "./TaxonomyPicker";
import { addGroupingTriple, updateGroupingTriple } from "../db/analytics";

/**
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onSaved: (row) => void         // called after add/edit succeeds
 *  - initial?: { id?, department, category, subcategory } // if provided -> edit mode
 */
export default function GroupingModal({ open, onClose, onSaved, initial }) {
  const isEdit = Boolean(initial?.id);
  const [dep, setDep] = useState("");
  const [cat, setCat] = useState("");
  const [sub, setSub] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setSaving(false);
    setDep(initial?.department || "");
    setCat(initial?.category || "");
    setSub(initial?.subcategory || "");
  }, [open, initial]);

  async function onSave() {
    try {
      setSaving(true);
      const payload = { department: dep, category: cat, subcategory: sub };
      const row = isEdit
        ? await updateGroupingTriple(initial.id, payload)
        : await addGroupingTriple(payload);
      onSaved?.(row);
      onClose?.();
    } catch (e) {
      setError(e.message || "Could not save grouping.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-semibold">
            {isEdit ? "Edit Analytics Grouping" : "Add Analytics Grouping"}
          </h3>
          <button className="p-1 rounded-md hover:bg-zinc-100" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3">
          <TaxonomyPicker
            department={dep}
            category={cat}
            subcategory={sub}
            onChange={({ department, category, subcategory }) => {
              setDep(department);
              setCat(category);
              setSub(subcategory);
            }}
          />

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded-md bg-blue-600 text-white px-3 py-2 text-sm disabled:opacity-60"
            onClick={onSave}
            disabled={saving}
          >
            {isEdit ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
