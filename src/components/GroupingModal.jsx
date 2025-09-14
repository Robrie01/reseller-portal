// src/components/GroupingModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { addGroupingTriple, updateGroupingTriple } from "../db/analytics";
import {
  listDepartments,
  listCategories,
  listSubcategories,
  ensureDepartment,
  ensureCategory,
  ensureSubcategory,
} from "../db/taxonomy"; // your existing helpers

const baseInput =
  "w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm";

export default function GroupingModal({
  open,
  initial, // optional: { id?, department, category, subcategory }
  onClose,
  onSaved,
}) {
  const isEdit = !!initial?.id;

  // lists
  const [deps, setDeps] = useState([]);
  const [cats, setCats] = useState([]);
  const [subs, setSubs] = useState([]);

  // selections (store both id+label so the table can prefill on edit)
  const [dep, setDep] = useState({ id: null, name: "" });
  const [cat, setCat] = useState({ id: null, name: "" });
  const [sub, setSub] = useState({ id: null, name: "" });

  // inline add dialog state
  const [adder, setAdder] = useState(
    /** null | { level:'dep'|'cat'|'sub', parentDep?, parentCat? } */
    null
  );
  const [newName, setNewName] = useState("");

  // ------- load lists -------
  async function refreshDeps() {
    const rows = await listDepartments();
    setDeps(rows || []);
  }
  async function refreshCats(depId) {
    if (!depId) {
      setCats([]);
      return;
    }
    const rows = await listCategories(depId);
    setCats(rows || []);
  }
  async function refreshSubs(catId) {
    if (!catId) {
      setSubs([]);
      return;
    }
    const rows = await listSubcategories(catId);
    setSubs(rows || []);
  }

  // when opened, load deps and prefill if editing
  useEffect(() => {
    if (!open) return;
    (async () => {
      await refreshDeps();
    })();
  }, [open]);

  // preselect on first load if editing
  useEffect(() => {
    if (!open) return;

    // When editing: we have names; we’ll pick matching ids once lists load
    (async () => {
      if (initial?.department) {
        // wait for deps then set
        const nextDep =
          deps.find(
            (d) =>
              d.name?.toLowerCase() === initial.department.toLowerCase() ||
              d.title?.toLowerCase() === initial.department.toLowerCase()
          ) || null;
        if (nextDep) {
          setDep({ id: nextDep.id, name: nextDep.name ?? nextDep.title ?? "" });
          await refreshCats(nextDep.id);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps, open]);

  useEffect(() => {
    if (!open || !dep.id || !initial?.category) return;
    (async () => {
      const nextCat =
        cats.find(
          (c) =>
            c.name?.toLowerCase() === initial.category.toLowerCase() ||
            c.title?.toLowerCase() === initial.category.toLowerCase()
        ) || null;
      if (nextCat) {
        setCat({ id: nextCat.id, name: nextCat.name ?? nextCat.title ?? "" });
        await refreshSubs(nextCat.id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cats, dep.id, open]);

  useEffect(() => {
    if (!open || !cat.id || !initial?.subcategory) return;
    const nextSub =
      subs.find(
        (s) =>
          s.name?.toLowerCase() === initial.subcategory.toLowerCase() ||
          s.title?.toLowerCase() === initial.subcategory.toLowerCase()
      ) || null;
    if (nextSub) {
      setSub({ id: nextSub.id, name: nextSub.name ?? nextSub.title ?? "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subs, cat.id, open]);

  // derived “Add enabled”
  const canSave = !!(dep.id && cat.id && sub.id);

  // inline add: compute matches to warn dupes
  const existingAtLevel = useMemo(() => {
    if (!adder) return [];
    if (adder.level === "dep") return deps;
    if (adder.level === "cat") return cats;
    return subs;
  }, [adder, deps, cats, subs]);

  const dupMatches = useMemo(() => {
    const v = (newName || "").trim().toLowerCase();
    if (!v) return [];
    return existingAtLevel.filter(
      (r) =>
        (r.name ?? r.title ?? "")
          .toString()
          .toLowerCase()
          .includes(v)
    );
  }, [existingAtLevel, newName]);

  async function onSaveAdd() {
    const v = (newName || "").trim();
    if (!v) return;
    try {
      if (adder.level === "dep") {
        const depId = await ensureDepartment(v);
        await refreshDeps();
        const sel = deps.find((d) => d.id === depId) || { id: depId, name: v };
        setDep({ id: depId, name: sel.name ?? v });
        setCat({ id: null, name: "" });
        setSub({ id: null, name: "" });
        setAdder(null);
        setNewName("");
        await refreshCats(depId);
      } else if (adder.level === "cat") {
        if (!dep.id) return;
        const catId = await ensureCategory(dep.id, v);
        await refreshCats(dep.id);
        const sel =
          cats.find((c) => c.id === catId) || { id: catId, name: v };
        setCat({ id: catId, name: sel.name ?? v });
        setSub({ id: null, name: "" });
        setAdder(null);
        setNewName("");
        await refreshSubs(catId);
      } else {
        if (!cat.id) return;
        const subId = await ensureSubcategory(cat.id, v);
        await refreshSubs(cat.id);
        const sel =
          subs.find((s) => s.id === subId) || { id: subId, name: v };
        setSub({ id: subId, name: sel.name ?? v });
        setAdder(null);
        setNewName("");
      }
    } catch (e) {
      alert(e.message || "Could not add item");
    }
  }

  async function onSubmit() {
    try {
      if (!canSave) return;
      if (isEdit) {
        await updateGroupingTriple(initial.id, {
          department: dep.name,
          category: cat.name,
          subcategory: sub.name,
        });
      } else {
        await addGroupingTriple({
          department: dep.name,
          category: cat.name,
          subcategory: sub.name,
        });
      }
      onClose?.();
      await onSaved?.();
    } catch (e) {
      alert(e.message || "Save failed");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-lg">
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

        <div className="px-5 py-4 space-y-4">
          {/* Department */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  className={baseInput}
                  value={dep.id || ""}
                  onChange={async (e) => {
                    const id = e.target.value || null;
                    if (!id) {
                      setDep({ id: null, name: "" });
                      setCat({ id: null, name: "" });
                      setSub({ id: null, name: "" });
                      setCats([]);
                      setSubs([]);
                      return;
                    }
                    const row = deps.find((d) => String(d.id) === String(id));
                    setDep({
                      id,
                      name: row?.name ?? row?.title ?? "",
                    });
                    setCat({ id: null, name: "" });
                    setSub({ id: null, name: "" });
                    await refreshCats(id);
                  }}
                >
                  <option value="">Select a department</option>
                  {deps.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name ?? d.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2.5 text-sm"
                  onClick={() => setAdder({ level: "dep" })}
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  className={baseInput}
                  disabled={!dep.id}
                  value={cat.id || ""}
                  onChange={async (e) => {
                    const id = e.target.value || null;
                    if (!id) {
                      setCat({ id: null, name: "" });
                      setSub({ id: null, name: "" });
                      setSubs([]);
                      return;
                    }
                    const row = cats.find((c) => String(c.id) === String(id));
                    setCat({
                      id,
                      name: row?.name ?? row?.title ?? "",
                    });
                    setSub({ id: null, name: "" });
                    await refreshSubs(id);
                  }}
                >
                  <option value="">
                    {dep.id ? "Select a category" : "Select a department first"}
                  </option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name ?? c.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2.5 text-sm"
                  disabled={!dep.id}
                  onClick={() => dep.id && setAdder({ level: "cat" })}
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>

            {/* Subcategory */}
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Sub-category <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  className={baseInput}
                  disabled={!cat.id}
                  value={sub.id || ""}
                  onChange={(e) => {
                    const id = e.target.value || null;
                    if (!id) {
                      setSub({ id: null, name: "" });
                      return;
                    }
                    const row = subs.find((s) => String(s.id) === String(id));
                    setSub({
                      id,
                      name: row?.name ?? row?.title ?? "",
                    });
                  }}
                >
                  <option value="">
                    {cat.id ? "Select a sub-category" : "Select a category first"}
                  </option>
                  {subs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name ?? s.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2.5 text-sm"
                  disabled={!cat.id}
                  onClick={() => cat.id && setAdder({ level: "sub" })}
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-zinc-200 flex justify-end gap-2">
          <button
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            onClick={() => onClose?.()}
          >
            Cancel
          </button>
          <button
            className={`rounded-md px-3 py-1.5 text-sm text-white ${
              canSave ? "bg-blue-600" : "bg-blue-300 cursor-not-allowed"
            }`}
            disabled={!canSave}
            onClick={onSubmit}
          >
            {isEdit ? "Save" : "Add"}
          </button>
        </div>
      </div>

      {/* Inline add dialog */}
      {adder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
              <h4 className="text-base font-semibold text-zinc-800">
                {adder.level === "dep"
                  ? "Add Department"
                  : adder.level === "cat"
                  ? "Add Category"
                  : "Add Sub-category"}
              </h4>
              <button
                className="p-2 rounded-md hover:bg-zinc-100"
                onClick={() => {
                  setAdder(null);
                  setNewName("");
                }}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {adder.level !== "dep" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">
                      Department
                    </label>
                    <input className={`${baseInput}`} value={dep.name} readOnly />
                  </div>
                  {adder.level === "sub" && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">
                        Category
                      </label>
                      <input className={`${baseInput}`} value={cat.name} readOnly />
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  {adder.level === "dep"
                    ? "Department Name"
                    : adder.level === "cat"
                    ? "Category Name"
                    : "Sub-category Name"}
                </label>
                <input
                  className={baseInput}
                  placeholder="Type a name…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <div className="text-xs text-zinc-500 mb-1">
                  Existing matches
                </div>
                <div className="max-h-36 overflow-auto rounded-md border border-zinc-200">
                  {dupMatches.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-zinc-400">No matches</div>
                  ) : (
                    dupMatches.map((r) => (
                      <div key={r.id} className="px-3 py-2 text-sm">
                        {r.name ?? r.title}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-zinc-200 flex justify-end gap-2">
              <button
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                onClick={() => {
                  setAdder(null);
                  setNewName("");
                }}
              >
                Cancel
              </button>
              <button
                className={`rounded-md px-3 py-1.5 text-sm text-white ${
                  newName.trim() ? "bg-blue-600" : "bg-blue-300 cursor-not-allowed"
                }`}
                disabled={!newName.trim()}
                onClick={onSaveAdd}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
