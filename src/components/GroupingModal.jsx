import React, { useEffect, useState } from "react";
import { listDepartments, listCategories, listSubcategories } from "../db/taxonomy";
import { addGroupingByNames } from "../db/analytics";

export default function GroupingModal({ open, onClose, context = {} , onAdded }) {
  // context can include: { departmentName, categoryName, subcategoryName }
  const [step, setStep] = useState({ dep: context.departmentName || "", cat: context.categoryName || "", sub: context.subcategoryName || "" });

  const [deps, setDeps] = useState([]);      const [depId, setDepId] = useState(null);
  const [cats, setCats] = useState([]);      const [catId, setCatId] = useState(null);
  const [subs, setSubs] = useState([]);      const [subId, setSubId] = useState(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => setDeps(await listDepartments()))();
  }, [open]);

  useEffect(() => {
    setCatId(null); setSubs([]); setSubId(null);
    if (depId) (async () => setCats(await listCategories(depId)))();
  }, [depId]);

  useEffect(() => {
    setSubId(null);
    if (catId) (async () => setSubs(await listSubcategories(catId)))();
  }, [catId]);

  const canAdd = step.dep.trim() && step.cat.trim() && step.sub.trim();

  async function handleAdd() {
    if (!canAdd) return;
    try {
      setSaving(true);
      const out = await addGroupingByNames({
        departmentName: step.dep.trim(),
        categoryName:   step.cat.trim(),
        subcategoryName:step.sub.trim(),
      });
      onAdded?.(out);       // let callers refresh their pickers if they want
      onClose?.();
    } catch (e) {
      alert(e.message || e);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[560px] rounded-xl bg-white p-5 shadow-xl">
        <div className="text-lg font-semibold mb-4">Add Analytics Grouping</div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Type or pick…"
              value={step.dep}
              onChange={(e)=>setStep(s=>({ ...s, dep: e.target.value }))}
              list="dep-datalist"
            />
            <datalist id="dep-datalist">
              {deps.map(d => <option key={d.id} value={d.name} onClick={()=>setDepId(d.id)} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Type or pick…"
              value={step.cat}
              onChange={(e)=>setStep(s=>({ ...s, cat: e.target.value }))}
              list="cat-datalist"
              disabled={!step.dep.trim()}
            />
            <datalist id="cat-datalist">
              {cats.map(c => <option key={c.id} value={c.name} onClick={()=>setCatId(c.id)} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sub-Category</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Type or pick…"
              value={step.sub}
              onChange={(e)=>setStep(s=>({ ...s, sub: e.target.value }))}
              list="sub-datalist"
              disabled={!step.cat.trim()}
            />
            <datalist id="sub-datalist">
              {subs.map(su => <option key={su.id} value={su.name} onClick={()=>setSubId(su.id)} />)}
            </datalist>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button className="px-3 py-2 text-sm rounded-md border" onClick={onClose}>Cancel</button>
          <button
            className={`px-3 py-2 text-sm rounded-md ${canAdd ? "bg-[#2f6b8f] text-white" : "bg-gray-200 text-gray-500"} `}
            disabled={!canAdd || saving}
            onClick={handleAdd}
          >
            {saving ? "Adding…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
