// src/components/TaxonomyPicker.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import {
  listDepartments,
  listCategories,
  listSubcategories,
} from "../db/taxonomy";
import { listAllTaxonomyTriples } from "../db/taxonomy";

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200";
const labelCls = "block text-xs font-medium text-zinc-600 mb-1";

/**
 * A simple select that renders options and calls onChange(id).
 */
function Select({ label, value, onChange, options, placeholder = "Select…" }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select
        className={inputCls}
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">{placeholder}</option>
        {(options || []).map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * QuickFind box with dropdown suggestions.
 * props:
 * - triples: [{ depId, dep, catId, cat, subId, sub }]
 * - onPickTriple(triple)
 */
function QuickFind({ triples, onPickTriple }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!open) return;
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // very lightweight scorer: token overlap + position bonus
  const results = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (!text) return [];
    const toks = text.split(/\s+/).filter(Boolean);

    function scoreRow(r) {
      const hay = `${r.dep} ${r.cat} ${r.sub}`.toLowerCase();
      let score = 0;
      for (const t of toks) {
        const idx = hay.indexOf(t);
        if (idx >= 0) {
          score += 10; // token match
          // small position bonus (prefix matches rank higher)
          if (idx === 0) score += 3;
          if (/\b/.test(hay[idx - 1])) score += 2;
        }
      }
      // little bonus if sub contains all tokens (more specific)
      if (toks.every((t) => (r.sub || "").toLowerCase().includes(t))) score += 5;
      // little bonus if category contains all tokens
      if (toks.every((t) => r.cat.toLowerCase().includes(t))) score += 3;
      return score;
    }

    const scored = [];
    for (const r of triples || []) {
      const s = scoreRow(r);
      if (s > 0) scored.push([s, r]);
    }
    scored.sort((a, b) => b[0] - a[0]);
    return scored.slice(0, 12).map((x) => x[1]); // top 12
  }, [q, triples]);

  return (
    <div className="relative" ref={boxRef}>
      <label className={labelCls}>Quick Find</label>
      <div className="relative">
        <input
          className={inputCls + " pl-9"}
          value={q}
          placeholder="Type a product (e.g. 'iPhone case', 'duvet cover', 'tennis racket')"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-md border border-zinc-200 bg-white shadow-md">
          {results.map((r, i) => (
            <button
              key={`${r.depId}-${r.catId}-${r.subId}-${i}`}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50"
              onClick={() => {
                onPickTriple(r);
                setOpen(false);
              }}
            >
              <div className="font-medium">{r.sub || r.cat}</div>
              <div className="text-xs text-zinc-500">
                {r.dep} &middot; {r.cat}
                {r.sub ? ` &middot; ${r.sub}` : ""}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * TaxonomyPicker
 * Props:
 *   value: { department_id, category_id, subcategory_id }
 *   onChange(next)
 */
export default function TaxonomyPicker({ value, onChange }) {
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [depId, setDepId] = useState(value?.department_id || null);
  const [catId, setCatId] = useState(value?.category_id || null);
  const [subId, setSubId] = useState(value?.subcategory_id || null);

  const [allTriples, setAllTriples] = useState([]);

  // Load base lists
  useEffect(() => {
    (async () => {
      const deps = await listDepartments();
      setDepartments(deps || []);
    })();
  }, []);

  // Load categories when department changes
  useEffect(() => {
    (async () => {
      if (!depId) {
        setCategories([]);
        setCatId(null);
        setSubcategories([]);
        setSubId(null);
        return;
      }
      const cs = await listCategories(depId);
      setCategories(cs || []);
      setCatId((cur) => (cs?.some((c) => c.id === cur) ? cur : null));
      setSubcategories([]);
      setSubId(null);
    })();
  }, [depId]);

  // Load subcategories when category changes
  useEffect(() => {
    (async () => {
      if (!catId) {
        setSubcategories([]);
        setSubId(null);
        return;
      }
      const ss = await listSubcategories(catId);
      setSubcategories(ss || []);
      setSubId((cur) => (ss?.some((s) => s.id === cur) ? cur : null));
    })();
  }, [catId]);

  // Bubble value up
  useEffect(() => {
    onChange?.({ department_id: depId || null, category_id: catId || null, subcategory_id: subId || null });
  }, [depId, catId, subId, onChange]);

  // Preload all triples once for Quick Find
  useEffect(() => {
    (async () => {
      const rows = await listAllTaxonomyTriples();
      setAllTriples(rows || []);
    })();
  }, []);

  // When Quick Find picks a triple, set all three selects
  function handlePickTriple(t) {
    setDepId(t.depId);
    // load dependent lists before applying IDs (ensure the options exist)
    (async () => {
      const cs = await listCategories(t.depId);
      setCategories(cs || []);
      setCatId(t.catId);
      const ss = await listSubcategories(t.catId);
      setSubcategories(ss || []);
      setSubId(t.subId || null);
    })();
  }

  return (
    <div className="space-y-3">
      {/* NEW: Quick Find */}
      <QuickFind triples={allTriples} onPickTriple={handlePickTriple} />

      {/* The three selects */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select
          label="Department"
          value={depId}
          onChange={setDepId}
          options={departments}
          placeholder="Select department…"
        />
        <Select
          label="Category"
          value={catId}
          onChange={setCatId}
          options={categories}
          placeholder={depId ? "Select category…" : "Pick department first"}
        />
        <Select
          label="Sub-category"
          value={subId}
          onChange={setSubId}
          options={subcategories}
          placeholder={catId ? "Select sub-category…" : "Pick category first"}
        />
      </div>
    </div>
  );
}
