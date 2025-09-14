// src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Search, Bell, Settings, User as UserIcon, LogOut, Plus, BarChart2, Package,
  Receipt, ShoppingCart, FileText, Layers, Home, Link as LinkIcon, Trash2, Pencil, X, Save, RotateCcw, BadgeDollarSign
} from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import { addExpense, mapGLAccount } from "./db/expenses";
import { addSale } from "./db/sales";
import { getReceiptURL, deleteReceipt } from "./db/storage";
import logoUrl from "./assets/reseller-logo.png";
import { useAuth } from "./lib/auth";
import TaxonomyPicker from "./Components/TaxonomyPicker";
import SettingsPage from "./pages/settings";

// ---------- tiny helpers ----------
const baseInput =
  "w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2f6b8f]";
const labelCls = "text-sm text-slate-600";
const fmtMoney = (n) => `£${Number(n || 0).toFixed(2)}`;

const Button = ({ children, className = "", type = "button", ...rest }) => (
  <button type={type} className={`px-3 py-2 rounded-xl text-sm ${className}`} {...rest}>
    {children}
  </button>
);
const IconBtn = ({ className = "", ...rest }) => (
  <button className={`p-2 rounded-lg border border-slate-200 hover:bg-slate-50 ${className}`} {...rest} />
);

// Display as dd-mm-yyyy
const fmtDate = (s) => {
  if (!s) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  if (!isNaN(d)) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`;
  }
  return String(s);
};

/** Open a receipt stored in Supabase Storage */
async function openReceipt(path) {
  try {
    if (path && typeof path === "object" && path.path) path = path.path; // tolerate legacy shape
    if (!path) return alert("No receipt attached.");
    if (/^https?:\/\//i.test(path)) {
      window.open(path, "_blank", "noopener,noreferrer");
      return;
    }
    const url = await getReceiptURL(path);
    if (!url) throw new Error("Could not create a link.");
    window.open(url, "_blank", "noopener,noreferrer");
  } catch (e) {
    console.error(e);
    alert("Could not open receipt: " + (e?.message || e));
  }
}

// simple CSV download
function dl(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- small inputs ----------
function TextField({ label, id, prefix, type = "text", required, className, defaultValue }) {
  return (
    <label className={`block ${className || ""}`}>
      <span className={labelCls}>{label}{required ? " *" : ""}</span>
      <div className="mt-1 flex items-center gap-2">
        {prefix ? <span className="px-2 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600">{prefix}</span> : null}
        <input id={id} type={type} defaultValue={defaultValue} className={baseInput} />
      </div>
    </label>
  );
}
function NumberField({ label, id, defaultValue = 0, className }) {
  return (
    <label className={`block ${className || ""}`}>
      <span className={labelCls}>{label}</span>
      <input id={id} type="number" defaultValue={defaultValue} className={baseInput} />
    </label>
  );
}
function DateField({ label, id, className, defaultValue }) {
  return (
    <label className={`block ${className || ""}`}>
      <span className={labelCls}>{label}</span>
      <input id={id} type="date" defaultValue={defaultValue} className={baseInput} />
    </label>
  );
}
function TextArea({ label, id, className, defaultValue }) {
  return (
    <label className={`block ${className || ""}`}>
      <span className={labelCls}>{label}</span>
      <textarea id={id} rows={4} defaultValue={defaultValue} className={baseInput} />
    </label>
  );
}
function Select({ label, id, options = [], className, defaultValue }) {
  return (
    <label className={`block ${className || ""}`}>
      <span className={labelCls}>{label}</span>
      <select id={id} defaultValue={defaultValue} className={baseInput}>
        {options.map((o) => {
          const opt = typeof o === "string" ? { value: o, label: o } : o;
          return (
            <option key={opt.value ?? opt.label} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
function FileField({ label, id, className }) {
  return (
    <label className={`block ${className || ""}`}>
      <span className={labelCls}>{label}</span>
      <input id={id} type="file" className={baseInput} />
    </label>
  );
}

// ---------- layout ----------
const NavButton = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 w-full text-left rounded-xl px-3 py-2 transition ${active ? "bg-[#1f4e6b] text-white" : "text-slate-800 hover:bg-slate-100"}`}
  >
    <Icon size={18} />
    <span className="text-sm font-medium">{label}</span>
  </button>
);
const Card = ({ title, children, right }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
      <h3 className="font-semibold text-slate-800">{title}</h3>
      {right}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

// ---------- top bar ----------
const TopBar = ({ onOpenSettings }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const { user, loading } = useAuth();

  useEffect(() => {
    function onClick(e) {
      if (!open) return;
      const inBtn = btnRef.current && btnRef.current.contains(e.target);
      const inMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!inBtn && !inMenu) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error.message);
  }

  return (
    <div className="relative flex items-center justify-end gap-2 p-3">
      <button className="p-2 rounded-full hover:bg-slate-100" title="Search">
        <Search size={18} />
      </button>
      <button className="p-2 rounded-full hover:bg-slate-100" title="Notifications">
        <Bell size={18} />
      </button>

      {/* Settings -> open overlay */}
      <button
        className="p-2 rounded-full hover:bg-slate-100"
        title="Settings"
        onClick={onOpenSettings}
      >
        <Settings size={18} />
      </button>

      {/* Account menu */}
      <button
        ref={btnRef}
        onClick={() => setOpen((s) => !s)}
        className="w-9 h-9 rounded-full bg-slate-200 grid place-items-center hover:bg-slate-300"
        title="Account"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <UserIcon size={18} />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-3 top-14 w-60 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        >
          <div className="px-3 py-2 text-sm text-slate-500 border-b truncate">
            {loading ? "Loading…" : (user?.email || "Not signed in")}
          </div>

          {user ? (
            <>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => { setOpen(false); onOpenSettings?.(); }}
                role="menuitem"
              >
                Profile / Settings
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-red-600"
                onClick={handleSignOut}
                role="menuitem"
              >
                <LogOut size={16} /> Sign out
              </button>
            </>
          ) : (
            <div className="px-3 py-2 text-sm text-slate-600">Not signed in</div>
          )}
        </div>
      )}
    </div>
  );
};


// ---------- pages ----------
function GetStarted() {
  return (
    <div className="space-y-6">
      <Card title="Get Started">
        <p className="text-slate-700 max-w-2xl">Welcome. This setup wizard will help you configure your reselling workspace. Click the button to begin.</p>
        <Button className="mt-6 bg-[#2f6b8f] text-white hover:bg-[#1f4e6b]"><Home size={16} /> Start Setup</Button>
      </Card>
    </div>
  );
}

/** UPDATED: Dashboard includes COGS + shipping + fees + expenses, and subtracts refunds */
function Dashboard() {
  const [series, setSeries] = useState([]);

  useEffect(() => {
    const y = new Date().getFullYear();
    const start = `${y}-01-01`;
    const end = new Date().toISOString().slice(0, 10);

    (async () => {
      try {
        // Pull this year's five feeds (already filtered per-user by RLS)
        const [salesRes, refundsRes, expensesRes, rebatesRes, inventoryRes] = await Promise.all([
          supabase.from("feed_sales").select("txn_date, amount").gte("txn_date", start).lte("txn_date", end).limit(10000),
          supabase.from("feed_refunds").select("txn_date, amount").gte("txn_date", start).lte("txn_date", end).limit(10000),
          supabase.from("feed_expenses").select("txn_date, amount").gte("txn_date", start).lte("txn_date", end).limit(10000),
          supabase.from("feed_rebates").select("txn_date, amount").gte("txn_date", start).lte("txn_date", end).limit(10000),
          supabase.from("feed_inventory_purchases").select("txn_date, amount").gte("txn_date", start).lte("txn_date", end).limit(10000),
        ]);

        const sales = salesRes.data || [];
        const refunds = refundsRes.data || [];
        const opEx = expensesRes.data || [];       // operating expenses (non-COGS)
        const rebates = rebatesRes.data || [];     // supplier rebates (reduce op-ex)
        const cogs = inventoryRes.data || [];      // inventory purchases (COGS)

        // Bucket by month
        const buckets = {};
        const ensure = (d) => {
          const key = `${d.getFullYear()}/${d.getMonth() + 1}`;
          if (!buckets[key]) buckets[key] = { m: key, income: 0, opEx: 0, cogs: 0 };
          return buckets[key];
        };

        // Income = sales - refunds
        for (const r of sales) {
          const d = new Date(r.txn_date);
          if (isNaN(d)) continue;
          ensure(d).income += Number(r.amount || 0);
        }
        for (const r of refunds) {
          const d = new Date(r.txn_date);
          if (isNaN(d)) continue;
          ensure(d).income -= Number(r.amount || 0);
        }

        // Operating expenses = expenses - rebates
        for (const r of opEx) {
          const d = new Date(r.txn_date);
          if (isNaN(d)) continue;
          ensure(d).opEx += Number(r.amount || 0);
        }
        for (const r of rebates) {
          const d = new Date(r.txn_date);
          if (isNaN(d)) continue;
          ensure(d).opEx -= Number(r.amount || 0);
        }

        // COGS (inventory purchases)
        for (const r of cogs) {
          const d = new Date(r.txn_date);
          if (isNaN(d)) continue;
          ensure(d).cogs += Number(r.amount || 0);
        }

        // Build 12 months in order
        const arr = Array.from({ length: 12 }, (_, i) => {
          const k = `${y}/${i + 1}`;
          const b = buckets[k] || { income: 0, opEx: 0, cogs: 0 };
          return {
            m: `${i + 1}/${y}`,
            income: b.income,
            opEx: b.opEx,
            cogs: b.cogs,
            expenses: b.opEx + b.cogs,
          };
        });

        setSeries(arr);
      } catch (e) {
        console.error(e);
        setSeries([]);
      }
    })();
  }, []);

  const Stat = ({ label, value }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-2xl font-semibold text-slate-800 mt-1">{value}</div>
    </div>
  );

  const totals = series.reduce((acc, r) => {
    acc.income += r.income || 0;
    acc.opEx  += r.opEx  || 0;
    acc.cogs  += r.cogs  || 0;
    return acc;
  }, { income: 0, opEx: 0, cogs: 0 });
    
  const expensesTotal = totals.opEx + totals.cogs; 
  const profit = totals.income - expensesTotal;
  const margin = totals.income ? (profit / totals.income) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Stat label="Income" value={`£${totals.income.toFixed(2)}`} />
        <Stat label="Op-Ex" value={`£${totals.opEx.toFixed(2)}`} />
        <Stat label="COGS" value={`£${totals.cogs.toFixed(2)}`} />
        <Stat label="Profit (£)" value={`£${profit.toFixed(2)}`} />
        <Stat label="Profit (%)" value={`${margin.toFixed(2)}%`} />
      </div>

      <Card title="Profitability">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ left: 12, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="m" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="income" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expenses" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}


const SortHeader = ({ label, sortKey, activeKey, dir, onSort }) => (
  <th className="px-3 py-2 text-left select-none cursor-pointer hover:underline" onClick={() => onSort(sortKey)} title="Click to sort">
    {label}{activeKey === sortKey ? (dir === "asc" ? " ▲" : " ▼") : ""}
  </th>
);

function useSortPage(rows) {
  const [sortKey, setSortKey] = useState(null);
  const [dir, setDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  function onSort(k) {
    if (sortKey === k) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setDir("asc"); }
  }

  const sorted = useMemo(() => {
    const copy = [...rows];
    if (!sortKey) return copy;
    copy.sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv));
    });
    if (dir === "desc") copy.reverse();
    return copy;
  }, [rows, sortKey, dir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;
  const paged = sorted.slice(start, start + pageSize);
  return { sortKey, dir, onSort, page: current, setPage, pageSize, setPageSize, totalPages, rows: paged, resetPage: () => setPage(1) };
}

const Pager = ({ page, setPage, totalPages }) => (
  <div className="flex items-center gap-2 text-sm text-slate-600">
    <Button className="border" onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
    <span>Page {page} / {totalPages}</span>
    <Button className="border" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
  </div>
);

/** ---------- Transaction Details (unified feed) ---------- */
function TransactionDetails() {
  // tabs
  const [tab, setTab] = useState("All");
  const tabs = ["All", "Inventory", "Sales", "Refunds", "Expenses"];

  // date ranges
  const [preset, setPreset] = useState("Current year");
  const [start, setStart] = useState(""); // YYYY-MM-DD
  const [end, setEnd] = useState("");

  // filters and table options
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [densityOpen, setDensityOpen] = useState(false);

  const filtersRef = useRef(null);
  const columnsRef = useRef(null);
  const densityRef = useRef(null);

  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");

  const densityOptions = { compact: "px-3 py-1", cozy: "px-3 py-2", comfortable: "px-3 py-3" };
  const [density, setDensity] = useState("cozy");

  // restore saved density (NEW)
  useEffect(() => {
    try {
      const d = localStorage.getItem("txn_table_density");
      if (d && densityOptions[d]) setDensity(d);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // persist density (NEW)
  useEffect(() => {
    try { localStorage.setItem("txn_table_density", density); } catch {}
  }, [density]);

  // columns
  const ALL_COLUMNS = [
    { id: "date", label: "Date", key: "txn_date" },
    { id: "type", label: "Type", key: "txn_type" },
    { id: "source", label: "Source", key: "source_table" },
    { id: "description", label: "Description", key: "description" },
    { id: "amount", label: "Amount", key: "amount" },
    { id: "vendor", label: "Vendor", key: "vendor" },
    { id: "platform", label: "Platform", key: "platform" },
    { id: "gl", label: "GL", key: "gl_account" },
    { id: "bank", label: "Bank", key: "bank_account" },
    // NEW: actions column
    { id: "actions", label: "Actions", key: "__actions__" },
  ];
  const defaultCols = ALL_COLUMNS.reduce((acc, c) => (acc[c.id] = true, acc), {});
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const raw = localStorage.getItem("txn_cols_visible");
      return raw ? JSON.parse(raw) : defaultCols;
    } catch { return defaultCols; }
  });
  useEffect(() => {
    localStorage.setItem("txn_cols_visible", JSON.stringify(visibleCols));
  }, [visibleCols]);

  // data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // close popovers on outside click
  useEffect(() => {
    function onDoc(e) {
      if (filtersOpen && filtersRef.current && !filtersRef.current.contains(e.target)) setFiltersOpen(false);
      if (columnsOpen && columnsRef.current && !columnsRef.current.contains(e.target)) setColumnsOpen(false);
      if (densityOpen && densityRef.current && !densityRef.current.contains(e.target)) setDensityOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [filtersOpen, columnsOpen, densityOpen]);

  // compute & set range when preset changes
  useEffect(() => {
    if (preset === "Custom") return;
    const today = new Date();
    const y = today.getFullYear();
    const mm = (n) => String(n).padStart(2, "0");
    const toISO = (d) => d.toISOString().slice(0, 10);

    let s, e;
    if (preset === "Current day") {
      s = toISO(new Date(y, today.getMonth(), today.getDate()));
      e = s;
    } else if (preset === "Current week") {
      const dow = today.getDay(); // 0 Sun - 6 Sat
      const mondayOffset = (dow + 6) % 7; // days since Monday
      const startDate = new Date(y, today.getMonth(), today.getDate() - mondayOffset);
      s = toISO(startDate);
      e = toISO(today);
    } else if (preset === "Current month") {
      s = `${y}-${mm(today.getMonth() + 1)}-01`;
      e = toISO(today);
    } else {
      // Current year
      s = `${y}-01-01`;
      e = toISO(today);
    }
    setStart(s);
    setEnd(e);
  }, [preset]);

  // initial range
  useEffect(() => {
    if (!start || !end) {
      const y = new Date().getFullYear();
      setStart(`${y}-01-01`);
      setEnd(new Date().toISOString().slice(0, 10));
    }
  }, []); // once

  // load data whenever range changes
  useEffect(() => {
    if (!start || !end) return;
    let isCancelled = false;
    async function load() {
      try {
        setLoading(true);
        setErr("");
        const { data, error } = await supabase
          .from("transactions_feed")
          .select("id, source_table, txn_type, txn_date, amount, description, vendor, bank_account, platform, gl_account, related_id, created_at")
          .gte("txn_date", start)
          .lte("txn_date", end)
          .order("txn_date", { ascending: false })
          .limit(5000);
        if (error) throw error;
        if (!isCancelled) setRows(data || []);
      } catch (e) {
        if (!isCancelled) setErr(e.message || "Failed to load transactions");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }
    load();
    return () => { isCancelled = true; };
  }, [start, end]);

  // map UI tab -> transaction kind
  const tabToKind = {
    All: null,
    Inventory: "inventory",
    Sales: "sale",
    Refunds: "refund",
    Expenses: "expense",
  };

  // unique platforms for filter options
  const platformOptions = useMemo(() => {
    const s = new Set(rows.map((r) => r.platform).filter(Boolean));
    return ["", ...Array.from(s)].map((v) => ({ value: v, label: v || "Any platform" }));
  }, [rows]);

  // apply tab + filters
  const filteredRows = useMemo(() => {
    const k = tabToKind[tab];
    const base = k ? rows.filter((r) => r.txn_type === k) : rows;
    const q = (search || "").trim().toLowerCase();
    const min = minAmt !== "" ? Number(minAmt) : null;
    const max = maxAmt !== "" ? Number(maxAmt) : null;
    const p = (platformFilter || "").toLowerCase();

    return base.filter((r) => {
      if (q) {
        const hay = `${r.description || ""} ${r.vendor || ""} ${r.platform || ""} ${r.bank_account || ""} ${r.gl_account || ""} ${r.source_table || ""} ${r.txn_type || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (p && String(r.platform || "").toLowerCase() !== p) return false;
      const amt = Number(r.amount || 0);
      if (min !== null && amt < min) return false;
      if (max !== null && amt > max) return false;
      return true;
    });
  }, [rows, tab, search, platformFilter, minAmt, maxAmt]);

  // sorting + paging
  const { sortKey, dir, onSort, page, setPage, pageSize, setPageSize, totalPages, rows: viewRows, resetPage } =
    useSortPage(filteredRows);
  useEffect(() => { resetPage(); }, [sortKey, dir, filteredRows]);

  // density pad
  const cellPad = densityOptions[density] || densityOptions.cozy;

  // --- NEW: inline edit/delete that writes back to the real table ---
  async function refreshRange() {
    try {
      const { data } = await supabase
        .from("transactions_feed")
        .select("id, source_table, txn_type, txn_date, amount, description, vendor, bank_account, platform, gl_account, related_id, created_at")
        .gte("txn_date", start)
        .lte("txn_date", end)
        .order("txn_date", { ascending: false })
        .limit(5000);
      setRows(data || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteTx(row) {
    if (!confirm("Delete this record?")) return;
    const table = row.source_table;
    const idToUse = row.related_id || row.id;
    const { error } = await supabase.from(table).delete().eq("id", idToUse);
    if (error) return alert(error.message);
    await refreshRange();
  }

  async function handleEditTx(row) {
    const nextDesc = prompt("Update description:", row.description || "");
    if (nextDesc == null) return;
    const nextAmtStr = prompt("Update amount (number):", String(row.amount ?? 0));
    if (nextAmtStr == null) return;
    const nextAmt = Number(nextAmtStr);
    const table = row.source_table;
    const idToUse = row.related_id || row.id;
    const { error } = await supabase.from(table).update({
      description: nextDesc,
      amount: nextAmt,
    }).eq("id", idToUse);
    if (error) return alert(error.message);
    // soft update in the visible list
    setRows((arr) => arr.map(r => r.id === row.id ? { ...r, description: nextDesc, amount: nextAmt } : r));
  }

  // export CSV of filteredRows (respect visible columns)
  function exportCSV() {
    const cols = ALL_COLUMNS.filter((c) => visibleCols[c.id] && c.id !== "actions");
    const head = cols.map((c) => c.label);
    const esc = (val) => {
      if (val == null) return "";
      const s = String(val);
      if (s.includes('"') || s.includes(",") || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const rowsCsv = filteredRows.map((r) => cols.map((c) => {
      const key = c.key;
      let v = r[key];
      if (c.id === "date") v = fmtDate(r.txn_date);
      if (c.id === "amount") v = Number(r.amount || 0).toFixed(2);
      return esc(v ?? "");
    }).join(","));
    const suffix = [
      tab !== "All" ? tab.toLowerCase() : null,
      platformFilter ? `platform_${platformFilter}` : null
    ].filter(Boolean).join("_");
    const csv = [head.join(","), ...rowsCsv].join("\n");
    const fname = `transactions_${start}_to_${end}${suffix ? `_${suffix}` : ""}.csv`;
    dl(fname, csv);
  }

  // UI
  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 rounded-xl border ${tab === t ? "bg-[#1f4e6b] text-white border-[#1f4e6b]" : "bg-white text-slate-800 border-slate-200"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Range picker */}
      <Card
        title="Date Range"
        right={
          <div className="flex items-center gap-2">
            {["Current day", "Current week", "Current month", "Current year", "Custom"].map((p) => (
              <button
                key={p}
                className={`px-3 py-2 rounded-xl text-sm border ${preset === p ? "bg-[#1f4e6b] text-white border-[#1f4e6b]" : "bg-white border-slate-200"}`}
                onClick={() => setPreset(p)}
              >
                {p}
              </button>
            ))}
          </div>
        }
      >
        {preset === "Custom" && (
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className={labelCls}>Start</span>
              <input type="date" className={baseInput + " mt-1"} value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label className="block">
              <span className={labelCls}>End</span>
              <input type="date" className={baseInput + " mt-1"} value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
            <div className="text-sm text-slate-500">
              Showing <span className="font-medium">{fmtDate(start)}</span> → <span className="font-medium">{fmtDate(end)}</span>
            </div>
          </div>
        )}
        {preset !== "Custom" && (
          <div className="text-sm text-slate-600">
            Showing <span className="font-medium">{fmtDate(start)}</span> → <span className="font-medium">{fmtDate(end)}</span> ({preset})
          </div>
        )}
      </Card>

      <Card
        title={`${tab} Detail`}
        right={
          <div className="flex flex-wrap gap-2">
            {/* Filters */}
            <div className="relative" ref={filtersRef}>
              <Button className="border border-slate-200 bg-white" onClick={() => setFiltersOpen((s) => !s)}>Filters</Button>
              {filtersOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-20">
                  <div className="grid grid-cols-1 gap-3">
                    <label className="block">
                      <span className={labelCls}>Search</span>
                      <input
                        className={baseInput + " mt-1"}
                        placeholder="Search description, vendor, platform…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Platform</span>
                      <select className={baseInput + " mt-1"} value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
                        {platformOptions.map((o) => <option key={o.value || "_any"} value={o.value}>{o.label}</option>)}
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className={labelCls}>Min amount (£)</span>
                        <input type="number" className={baseInput + " mt-1"} value={minAmt} onChange={(e) => setMinAmt(e.target.value)} />
                      </label>
                      <label className="block">
                        <span className={labelCls}>Max amount (£)</span>
                        <input type="number" className={baseInput + " mt-1"} value={maxAmt} onChange={(e) => setMaxAmt(e.target.value)} />
                      </label>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Button className="border" onClick={() => { setSearch(""); setPlatformFilter(""); setMinAmt(""); setMaxAmt(""); }}>Reset</Button>
                    <Button className="bg-[#2f6b8f] text-white" onClick={() => setFiltersOpen(false)}>Apply</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Columns */}
            <div className="relative" ref={columnsRef}>
              <Button className="border border-slate-200 bg-white" onClick={() => setColumnsOpen((s) => !s)}>Columns</Button>
              {columnsOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-20">
                  <div className="flex items-center justify-between mb-2">
                    <Button className="border" onClick={() => setVisibleCols(ALL_COLUMNS.reduce((a, c) => (a[c.id] = true, a), {}))}>Show all</Button>
                    <Button className="border" onClick={() => setVisibleCols(ALL_COLUMNS.reduce((a, c) => (a[c.id] = false, a), {}))}>Hide all</Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-56 overflow-auto pr-1">
                    {ALL_COLUMNS.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!visibleCols[c.id]}
                          onChange={(e) => setVisibleCols((v) => ({ ...v, [c.id]: e.target.checked }))}
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Density */}
            <div className="relative" ref={densityRef}>
              <Button className="border border-slate-200 bg-white" onClick={() => setDensityOpen((s) => !s)}>Density</Button>
              {densityOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-20">
                  {Object.keys(densityOptions).map((d) => (
                    <label key={d} className="flex items-center gap-2 text-sm py-1">
                      <input type="radio" name="density" checked={density === d} onChange={() => setDensity(d)} />
                      {d[0].toUpperCase() + d.slice(1)}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Export */}
            <Button className="border border-slate-200 bg-white" onClick={exportCSV}>Export</Button>
          </div>
        }
      >
        {/* Data state */}
        <div className="mb-3 text-sm text-slate-600">
          {loading ? "Loading transactions…" : `Loaded ${rows.length} transaction(s). Showing ${filteredRows.length} after filters.`}
          {err && <span className="ml-2 text-red-600">{err}</span>}
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-slate-500">
            Sorted by {sortKey || "—"} {sortKey ? (dir === "asc" ? "↑" : "↓") : ""}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>Rows:</span>
            <select className="border rounded-lg px-2 py-1" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
              <option>5</option><option>10</option><option>25</option><option>50</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {(!loading && filteredRows.length === 0) ? (
          <div className="text-slate-500">No transactions for the selected filters.</div>
        ) : (
          <div className="overflow-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {ALL_COLUMNS.map((c) =>
                    visibleCols[c.id] ? (
                      <SortHeader
                        key={c.id}
                        label={c.label}
                        sortKey={c.key}
                        activeKey={sortKey}
                        dir={dir}
                        onSort={onSort}
                      />
                    ) : null
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {viewRows.map((r) => (
                  <tr key={r.id}>
                    {visibleCols.date && <td className={`${cellPad} whitespace-nowrap`}>{fmtDate(r.txn_date)}</td>}
                    {visibleCols.type && <td className={cellPad}>{r.txn_type || "-"}</td>}
                    {visibleCols.source && <td className={cellPad}>{r.source_table || "-"}</td>}
                    {visibleCols.description && <td className={cellPad}>{r.description || "-"}</td>}
                    {visibleCols.amount && <td className={`${cellPad} text-right`}>{fmtMoney(r.amount)}</td>}
                    {visibleCols.vendor && <td className={cellPad}>{r.vendor || "-"}</td>}
                    {visibleCols.platform && <td className={cellPad}>{r.platform ?? "-"}</td>}
                    {visibleCols.gl && <td className={cellPad}>{r.gl_account ?? "-"}</td>}
                    {visibleCols.bank && <td className={cellPad}>{r.bank_account || "-"}</td>}
                    {visibleCols.actions && (
                      <td className={`${cellPad} whitespace-nowrap`}>
                        <div className="flex gap-2">
                          <IconBtn title="Edit" onClick={() => handleEditTx(r)}><Pencil size={16} /></IconBtn>
                          <IconBtn title="Delete" onClick={() => handleDeleteTx(r)}><Trash2 size={16} /></IconBtn>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pager */}
        <div className="mt-3 flex items-center justify-between">
          <Pager page={page} setPage={setPage} totalPages={totalPages} />
        </div>
      </Card>
    </div>
  );
}

// ---------- Report Sale ----------
function ReportSale() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const { sortKey, dir, onSort, page, setPage, pageSize, setPageSize, totalPages, rows: viewRows, resetPage } = useSortPage(rows);
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({});

  // Inventory suggestions
  const [invList, setInvList] = useState([]);
  const [query, setQuery] = useState("");
  const [showSug, setShowSug] = useState(false);
  const sugRef = useRef(null);

  useEffect(() => {
    supabase.from("inventory")
      .select("id, title, quantity_on_hand, purchase_price, purchase_date")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => { if (!error) setInvList(data || []); });
  }, []);

  useEffect(() => { resetPage(); }, [sortKey, dir, rows]);

  useEffect(() => {
    function onDocClick(e) {
      if (!showSug) return;
      if (sugRef.current && !sugRef.current.contains(e.target)) setShowSug(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showSug]);

  function selectInventory(row) {
    setQuery(row.title);
    setShowSug(false);
    const idEl = document.getElementById("sale-inventory-id");
    if (idEl) idEl.value = row.id;
    const buyEl = document.getElementById("sale-buy");
    if (buyEl && !buyEl.value) buyEl.value = row.purchase_price || 0;
    const buyDateEl = document.getElementById("sale-buydate");
    if (buyDateEl && !buyDateEl.value) {
      const d = (row.purchase_date || "").slice(0, 10);
      if (d) buyDateEl.value = d;
    }
  }

  function onQueryChange(e) {
    const val = e.target.value;
    setQuery(val);
    const exact = invList.find((x) => x.title === val);
    const idEl = document.getElementById("sale-inventory-id");
    if (idEl) idEl.value = exact ? exact.id : "";
    if (exact) {
      const buyEl = document.getElementById("sale-buy");
      if (buyEl && !buyEl.value) buyEl.value = exact.purchase_price || 0;
      const buyDateEl = document.getElementById("sale-buydate");
      if (buyDateEl && !buyDateEl.value) {
        const d = (exact.purchase_date || "").slice(0, 10);
        if (d) buyDateEl.value = d;
      }
    }
    setShowSug(true);
  }

  const filteredInv = useMemo(() => {
    const v = query.trim().toLowerCase();
    if (!v) return invList.slice(0, 10);
    return invList.filter((r) => r.title.toLowerCase().includes(v)).slice(0, 10);
  }, [invList, query]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sales")
      .select("id, item_sold, sale_price, shipping_cost, transaction_fees, platform, sale_date, purchase_price, receipt_path, created_at")
      .order("created_at", { ascending: false });
    if (!error) setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleDelete(row) {
    if (!confirm("Delete this sale?")) return;
    const { error } = await supabase.from("sales").delete().eq("id", row.id);
    if (error) return alert(error.message);
    if (row.receipt_path) { try { await deleteReceipt(row.receipt_path); } catch (_) {} }
    setRows((r) => r.filter((x) => x.id !== row.id));
  }

  function startEdit(r) { setEditId(r.id); setEdit({ ...r }); }
  function cancelEdit() { setEditId(null); setEdit({}); }
  async function saveEdit() {
    const { error } = await supabase.from("sales").update({
      item_sold: edit.item_sold,
      sale_price: Number(edit.sale_price || 0),
      shipping_cost: Number(edit.shipping_cost || 0),
      transaction_fees: Number(edit.transaction_fees || 0),
      platform: edit.platform,
      sale_date: edit.sale_date,
      purchase_price: Number(edit.purchase_price || 0)
    }).eq("id", editId);
    if (error) return alert(error.message);
    await load();
    cancelEdit();
  }

  return (
    <div className="space-y-4">
      <Card
        title="Report Sale"
        right={<Button onClick={() => setOpen(true)} className="bg-[#2f6b8f] text-white flex items-center gap-2"><Plus size={16}/> Quick View</Button>}
      >
        <p className="text-slate-700">Open the Quick View to add a sale.</p>
      </Card>

      <Card
        title="Your Sales"
        right={<div className="flex items-center gap-3 text-sm text-slate-500">{loading ? "Loading..." : `${rows.length} row(s)`}
          <select className="border rounded-lg px-2 py-1" value={pageSize} onChange={(e)=>{setPageSize(Number(e.target.value)); setPage(1);}}>
            <option>5</option><option>10</option><option>25</option>
          </select>
        </div>}
      >
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <SortHeader label="Item" sortKey="item_sold" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortHeader label="Sale Price" sortKey="sale_price" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortHeader label="Fees" sortKey="transaction_fees" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortHeader label="Ship" sortKey="shipping_cost" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortHeader label="Platform" sortKey="platform" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortHeader label="Date" sortKey="sale_date" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortHeader label="Buy Price" sortKey="purchase_price" activeKey={sortKey} dir={dir} onSort={onSort} />
                <th className="px-3 py-2 text-left">Profit</th>
                <th className="px-3 py-2 text-left">Receipt</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {viewRows.length === 0 && (<tr><td colSpan={10} className="px-3 py-6 text-center text-slate-500">No sales yet</td></tr>)}
              {viewRows.map((r) => {
                const profit = (Number(r.sale_price||0) - Number(r.purchase_price||0) - Number(r.shipping_cost||0) - Number(r.transaction_fees||0));
                const isEdit = editId === r.id;
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{isEdit ? <input className={baseInput} value={edit.item_sold||""} onChange={(e)=>setEdit({...edit, item_sold:e.target.value})}/> : r.item_sold}</td>
                    <td className="px-3 py-2">{isEdit ? <input type="number" className={baseInput} value={edit.sale_price||0} onChange={(e)=>setEdit({...edit, sale_price:e.target.value})}/> : fmtMoney(r.sale_price)}</td>
                    <td className="px-3 py-2">{isEdit ? <input type="number" className={baseInput} value={edit.transaction_fees||0} onChange={(e)=>setEdit({...edit, transaction_fees:e.target.value})}/> : fmtMoney(r.transaction_fees)}</td>
                    <td className="px-3 py-2">{isEdit ? <input type="number" className={baseInput} value={edit.shipping_cost||0} onChange={(e)=>setEdit({...edit, shipping_cost:e.target.value})}/> : fmtMoney(r.shipping_cost)}</td>
                    <td className="px-3 py-2 capitalize">{isEdit ? <input className={baseInput} value={edit.platform||""} onChange={(e)=>setEdit({...edit, platform:e.target.value})}/> : String(r.platform)}</td>
                    <td className="px-3 py-2">{isEdit ? <input type="date" className={baseInput} value={edit.sale_date||""} onChange={(e)=>setEdit({...edit, sale_date:e.target.value})}/> : fmtDate(r.sale_date)}</td>
                    <td className="px-3 py-2">{isEdit ? <input type="number" className={baseInput} value={edit.purchase_price||0} onChange={(e)=>setEdit({...edit, purchase_price:e.target.value})}/> : fmtMoney(r.purchase_price)}</td>
                    <td className="px-3 py-2 font-medium">{fmtMoney(profit)}</td>
                    <td className="px-3 py-2">{r.receipt_path ? (<Button className="border" onClick={() => openReceipt(r.receipt_path)}>View</Button>) : (<span className="text-slate-400">—</span>)}</td>
                    <td className="px-3 py-2 text-right flex gap-2 justify-end">
                      {isEdit ? (<><IconBtn title="Save" onClick={saveEdit}><Save size={16}/></IconBtn><IconBtn title="Cancel" onClick={cancelEdit}><X size={16}/></IconBtn></>)
                        : (<><IconBtn title="Edit" onClick={() => startEdit(r)}><Pencil size={16}/></IconBtn><IconBtn title="Delete" onClick={() => handleDelete(r)}><Trash2 size={16}/></IconBtn></>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between"><Pager page={page} setPage={setPage} totalPages={totalPages} /></div>
      </Card>

      <Modal
        open={open} onClose={() => setOpen(false)} title="Report Sale"
        footer={<div className="flex gap-2">
          <Button className="bg-slate-100" onClick={async () => { await save(false); }}>Add and Next</Button>
          <Button className="bg-[#2f6b8f] text-white" onClick={async () => { await save(true); }}>Add</Button>
        </div>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="block relative" ref={sugRef}>
            <span className={labelCls}>Item Sold</span>
            <input id="sale-item" className={`${baseInput} mt-1`} placeholder="Type to search inventory…" value={query} onChange={onQueryChange} onFocus={() => setShowSug(true)} autoComplete="off" />
            {showSug && filteredInv.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-auto">
                {filteredInv.map((r) => (
                  <button type="button" key={r.id} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between" onClick={() => selectInventory(r)}>
                    <span className="truncate">{r.title}</span>
                    <span className="ml-3 text-xs text-slate-500">Qty {r.quantity_on_hand ?? 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input type="hidden" id="sale-inventory-id" />
          <TextField label="Sale Price (£)" id="sale-price" prefix="£" type="number" />
          <TextField label="Shipping Cost (£)" id="sale-ship" prefix="£" type="number" />
          <TextField label="Transaction Fees (£)" id="sale-fees" prefix="£" type="number" />
          <Select label="Sale Platform" id="sale-platform" options={[
            { label: "No Sale Platform", value: "" },
            { label: "eBay", value: "ebay" },
            { label: "Etsy", value: "etsy" },
            { label: "Vinted", value: "vinted" },
            { label: "Other", value: "other" },
          ]} />
          <DateField label="Sale Date" id="sale-date" />
          <TextField label="Purchase Price (£)" id="sale-buy" prefix="£" type="number" />
          <DateField label="Purchase Date" id="sale-buydate" />
          <TextArea label="Sale Notes" id="sale-notes" className="md:col-span-2" />
          <FileField label="Attach Receipt" id="sale-receipt" className="md:col-span-2" />
        </div>
      </Modal>
    </div>
  );

  async function save(closeAfter) {
    const get = (id) => document.getElementById(id);
    const rawPlatform = get("sale-platform").value;
    const platform = rawPlatform === "" ? null : rawPlatform;

    const values = {
      item: get("sale-item").value,
      inventory_id: get("sale-inventory-id").value || null,
      sale_price: get("sale-price").value,
      shipping_cost: get("sale-ship").value,
      fees: get("sale-fees").value,
      platform,
      sale_date: get("sale-date").value,
      buy_price: get("sale-buy").value,
      buy_date: get("sale-buydate").value,
      notes: get("sale-notes").value,
      receiptFile: get("sale-receipt").files?.[0] || null,
    };
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { alert("You are signed out. Please sign in and try again."); return; }

    try {
      await addSale(values);
      if (values.inventory_id) {
        const { data: invRow } = await supabase.from("inventory").select("quantity_on_hand").eq("id", values.inventory_id).single();
        const current = Number(invRow?.quantity_on_hand || 0);
        const newQty = Math.max(0, current - 1);
        await supabase.from("inventory").update({ quantity_on_hand: newQty }).eq("id", values.inventory_id);
      }
      alert("Sale saved!");
      await load();
      if (closeAfter) setOpen(false);
    } catch (err) {
      console.error("addSale insert failed:", err);
      const msg = err?.message || err?.error_description || (err?.details ? `${err.details} (${err.code || ""})` : "Something went wrong saving the sale.");
      alert("Save failed: " + msg);
    }
  }
}

// ---------- Add Inventory ----------
function AddInventory() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const { sortKey, dir, onSort, page, setPage, pageSize, setPageSize, totalPages, rows: viewRows, resetPage } = useSortPage(rows);
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({});

  // NEW: hold taxonomy IDs coming from TaxonomyPicker
  const [tax, setTax] = useState({
    department_id: null,
    category_id: null,
    subcategory_id: null,
  });

  const get = (id) => document.getElementById(id);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("inventory")
      .select("id, title, vendor, purchase_price, quantity_on_hand, receipt_path, created_at")
      .order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { resetPage(); }, [sortKey, dir, rows]);

  async function handleDelete(row) {
    if (!confirm("Delete this inventory item?")) return;
    const { error } = await supabase.from("inventory").delete().eq("id", row.id);
    if (error) return alert(error.message);
    if (row.receipt_path) { try { await deleteReceipt(row.receipt_path); } catch (_) {} }
    setRows((r) => r.filter((x) => x.id !== row.id));
  }

  function startEdit(r) { setEditId(r.id); setEdit({ ...r }); }
  function cancelEdit() { setEditId(null); setEdit({}); }
  async function saveEdit() {
    const { error } = await supabase.from("inventory").update({
      title: edit.title,
      vendor: edit.vendor,
      purchase_price: Number(edit.purchase_price || 0),
      quantity_on_hand: Number(edit.quantity_on_hand || 0),
    }).eq("id", editId);
    if (error) return alert(error.message);
    await load();
    cancelEdit();
  }

  async function handleAdd(closeAfter = true) {
    try {
      setSaving(true);
      const values = {
        title: get("inv-title").value,
        vendor: get("inv-vendor").value,
        // ✨ taxonomy now uses IDs from the picker
        department_id: tax.department_id,
        category_id: tax.category_id,
        subcategory_id: tax.subcategory_id,
        brand: get("inv-brand").value,
        location: get("inv-location").value,
        sku: get("inv-sku").value,
        platform: get("inv-platform").value,
        purchase_date: get("inv-date").value,
        purchase_price: get("inv-price").value,
        quantity: get("inv-qty").value,
        notes: get("inv-notes").value,
        receiptFile: get("inv-receipt").files?.[0] || null,
      };

      const { addInventoryFull } = await import("./db/inventory.js");
      await addInventoryFull(values);

      alert("Inventory item saved!");
      await load();

      if (closeAfter) {
        setOpen(false);
      } else {
        // clear fields for next entry
        get("inv-title").value = "";
        get("inv-brand").value = "";
        get("inv-location").value = "";
        get("inv-sku").value = "";
        get("inv-date").value = "";
        get("inv-price").value = "";
        get("inv-qty").value = 1;
        get("inv-notes").value = "";
        if (get("inv-receipt")) get("inv-receipt").value = "";

        // reset taxonomy picker
        setTax({ department_id: null, category_id: null, subcategory_id: null });
      }
    } catch (err) {
      console.error(err);
      alert("Save failed: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card
        title="Add Inventory"
        right={
          <Button onClick={() => setOpen(true)} className="bg-[#2f6b8f] text-white flex items-center gap-2">
            <Plus size={16} /> Open Form
          </Button>
        }
      >
        <p className="text-slate-700">Add a new item to inventory.</p>
      </Card>

      <Card
        title="Your Inventory"
        right={
          <div className="flex items-center gap-3 text-sm text-slate-500">
            {loading ? "Loading..." : `${rows.length} row(s)`}
            <select
              className="border rounded-lg px-2 py-1"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              <option>5</option><option>10</option><option>25</option>
            </select>
          </div>
        }
      >
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <SortHeader label="Title" sortKey="title" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortHeader label="Vendor" sortKey="vendor" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortHeader label="Purchase Price" sortKey="purchase_price" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortHeader label="Qty" sortKey="quantity_on_hand" activeKey={sortKey} dir={dir} onSort={onSort} />
                <th className="px-3 py-2">Receipt</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {viewRows.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No inventory</td></tr>
              )}
              {viewRows.map((r) => {
                const isEdit = editId === r.id;
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">
                      {isEdit
                        ? <input className={baseInput} value={edit.title || ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
                        : r.title}
                    </td>
                    <td className="px-3 py-2">
                      {isEdit
                        ? <input className={baseInput} value={edit.vendor || ""} onChange={(e) => setEdit({ ...edit, vendor: e.target.value })} />
                        : r.vendor}
                    </td>
                    <td className="px-3 py-2">
                      {isEdit
                        ? <input type="number" className={baseInput} value={edit.purchase_price || 0} onChange={(e) => setEdit({ ...edit, purchase_price: e.target.value })} />
                        : fmtMoney(r.purchase_price)}
                    </td>
                    <td className="px-3 py-2">
                      {isEdit
                        ? <input type="number" className={baseInput} value={edit.quantity_on_hand || 0} onChange={(e) => setEdit({ ...edit, quantity_on_hand: e.target.value })} />
                        : r.quantity_on_hand}
                    </td>
                    <td className="px-3 py-2">
                      {r.receipt_path ? (
                        <Button className="border" onClick={() => openReceipt(r.receipt_path)}>View</Button>
                      ) : (<span className="text-slate-400">—</span>)}
                    </td>
                    <td className="px-3 py-2 text-right flex gap-2 justify-end">
                      {isEdit ? (
                        <>
                          <IconBtn title="Save" onClick={saveEdit}><Save size={16} /></IconBtn>
                          <IconBtn title="Cancel" onClick={cancelEdit}><X size={16} /></IconBtn>
                        </>
                      ) : (
                        <>
                          <IconBtn title="Edit" onClick={() => startEdit(r)}><Pencil size={16} /></IconBtn>
                          <IconBtn title="Delete" onClick={() => handleDelete(r)}><Trash2 size={16} /></IconBtn>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Pager page={page} setPage={setPage} totalPages={totalPages} />
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Inventory"
        footer={
          <>
            <Button className="bg-slate-100" onClick={() => handleAdd(false)} disabled={saving}>
              {saving ? "Saving..." : "Add and Next"}
            </Button>
            <Button className="bg-[#2f6b8f] text-white" onClick={() => handleAdd(true)} disabled={saving}>
              {saving ? "Saving..." : "Add"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Item Title" id="inv-title" required />
          <Select label="Vendor" id="inv-vendor" options={["No vendor", "Temu", "Amazon", "Wholesaler", "Other"]} />

          {/* ✨ Cascading Department → Category → Sub-category */}
          <div className="md:col-span-2">
            <TaxonomyPicker
              onChange={({ department, category, subcategory }) => {
                setTax({
                  department_id: department?.id ?? null,
                  category_id: category?.id ?? null,
                  subcategory_id: subcategory?.id ?? null,
                });
              }}
              requiredLevels={{ department: true, category: true, subcategory: false }}
            />
          </div>

          {/* removed old Department/Category/Subcategory inputs */}
          <TextField label="Brand" id="inv-brand" />
          <TextField label="Location" id="inv-location" />
          <TextField label="SKU" id="inv-sku" />
          <Select label="Platforms Listed" id="inv-platform" options={["eBay", "Etsy", "Vinted", "None"]} />
          <DateField label="Purchase Date" id="inv-date" />
          <TextField label="Purchase Price (£)" id="inv-price" prefix="£" type="number" />
          <NumberField label="Quantity" id="inv-qty" defaultValue={1} />
          <TextArea label="Notes" id="inv-notes" className="md:col-span-2" />
          <FileField label="Attach Receipt" id="inv-receipt" />
        </div>
      </Modal>
    </div>
  );
}

// ---------- Add Expense ----------
function AddExpense() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { sortKey, dir, onSort, page, setPage, pageSize, setPageSize, totalPages, rows: viewRows, resetPage } = useSortPage(rows);
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({});

  const DEFAULT_GL = ["Postage", "Packaging", "Software and apps", "Advertising", "Other"];
  const [glOpts, setGlOpts] = useState(DEFAULT_GL);
  const [vendors, setVendors] = useState(["No vendor", "Amazon", "eBay"]);

  const [saleList, setSaleList] = useState([]);
  const [saleQuery, setSaleQuery] = useState("");
  const [showSaleSug, setShowSaleSug] = useState(false);
  const saleSugRef = useRef(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("expenses")
      .select("id, gl_account, vendor, description, amount, date, bank_account, receipt_path, created_at")
      .order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { resetPage(); }, [sortKey, dir, rows]);

  useEffect(() => {
    supabase
      .from("sales")
      .select("id, item_sold")
      .order("created_at", { ascending: false })
      .then(({ data }) => setSaleList(data || []));
  }, []);

  useEffect(() => {
    function onDocClick(e) {
      if (!showSaleSug) return;
      if (saleSugRef.current && !saleSugRef.current.contains(e.target)) setShowSaleSug(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showSaleSug]);

  async function handleDelete(row) {
    if (!confirm("Delete this expense?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", row.id);
    if (error) return alert(error.message);
    if (row.receipt_path) {
      try { await deleteReceipt(row.receipt_path); } catch (_) {}
    }
    setRows((r) => r.filter((x) => x.id !== row.id));
  }

  function startEdit(r) { setEditId(r.id); setEdit({ ...r }); }
  function cancelEdit() { setEditId(null); setEdit({}); }
  async function saveEdit() {
    const { error } = await supabase.from("expenses").update({
      gl_account: mapGLAccount(edit.gl_account),
      vendor: edit.vendor,
      description: edit.description,
      amount: Number(edit.amount || 0),
      date: edit.date,
      bank_account: edit.bank_account,
    }).eq("id", editId);
    if (error) return alert(error.message);
    await load();
    cancelEdit();
  }

  const get = (id) => document.getElementById(id);
  function clearForm() {
    get("exp-ledger").value = "";
    get("exp-gl-label").value = "";
    get("exp-vendor").value = "No vendor";
    get("exp-desc").value = "";
    get("exp-amount").value = "";
    get("exp-date").value = "";
    get("exp-bank").value = "";
    const q = get("exp-linked-search"); if (q) q.value = "";
    const hid = get("exp-linked-id"); if (hid) hid.value = "";
    const f = get("exp-receipt"); if (f) f.value = "";
  }

  async function save(closeAfter) {
    try {
      setSaving(true);
      const glLabel = get("exp-gl-label").value || get("exp-ledger").value;

      const values = {
        gl_account_label: glLabel,
        vendor: get("exp-vendor").value,
        description: get("exp-desc").value,
        amount: get("exp-amount").value,
        date: get("exp-date").value,
        bank_account: get("exp-bank").value,
        linked_sale: get("exp-linked-id").value || null,
        receiptFile: get("exp-receipt").files?.[0] || null,
      };

      await addExpense(values);
      alert("Expense saved!");
      await load();
      if (closeAfter) setOpen(false);
      else clearForm();
    } catch (err) {
      console.error(err);
      alert("Save failed: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Add Expense" right={
        <Button onClick={() => setOpen(true)} className="bg-[#2f6b8f] text-white flex items-center gap-2">
          <Plus size={16}/> Open Form
        </Button>
      }>
        <p className="text-slate-700">Record a business expense and link it to a sale if needed.</p>
      </Card>

      <Card
        title="Your Expenses"
        right={
          <div className="flex items-center gap-3 text-sm text-slate-500">
            {loading ? "Loading..." : `${rows.length} row(s)`}
            <select className="border rounded-lg px-2 py-1" value={pageSize} onChange={(e)=>{setPageSize(Number(e.target.value)); setPage(1);}}>
              <option>5</option><option>10</option><option>25</option>
            </select>
          </div>
        }
      >
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <SortHeader label="GL" sortKey="gl_account" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortHeader label="Vendor" sortKey="vendor" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortHeader label="Description" sortKey="description" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortHeader label="Amount" sortKey="amount" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortHeader label="Date" sortKey="date" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortHeader label="Bank" sortKey="bank_account" activeKey={sortKey} dir={dir} onSort={onSort} />
                <th className="px-3 py-2">Receipt</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {viewRows.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">No expenses yet</td></tr>
              )}
              {viewRows.map((r) => {
                const isEdit = editId === r.id;
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">
                      {isEdit
                        ? <input className={baseInput} value={edit.gl_account || ""} onChange={(e) => setEdit({ ...edit, gl_account: e.target.value })} />
                        : String(r.gl_account)}
                    </td>
                    <td className="px-3 py-2">
                      {isEdit
                        ? <input className={baseInput} value={edit.vendor || ""} onChange={(e) => setEdit({ ...edit, vendor: e.target.value })} />
                        : r.vendor}
                    </td>
                    <td className="px-3 py-2">
                      {isEdit
                        ? <input className={baseInput} value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
                        : r.description}
                    </td>
                    <td className="px-3 py-2">
                      {isEdit
                        ? <input type="number" className={baseInput} value={edit.amount || 0} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} />
                        : fmtMoney(r.amount)}
                    </td>
                    <td className="px-3 py-2">
                      {isEdit
                        ? <input type="date" className={baseInput} value={edit.date || ""} onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
                        : fmtDate(r.date)}
                    </td>
                    <td className="px-3 py-2">
                      {isEdit
                        ? <input className={baseInput} value={edit.bank_account || ""} onChange={(e) => setEdit({ ...edit, bank_account: e.target.value })} />
                        : r.bank_account}
                    </td>
                    <td className="px-3 py-2">
                      {r.receipt_path
                        ? <Button className="border" onClick={() => openReceipt(r.receipt_path)}>View</Button>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right flex gap-2 justify-end">
                      {isEdit ? (
                        <>
                          <IconBtn title="Save" onClick={saveEdit}><Save size={16} /></IconBtn>
                          <IconBtn title="Cancel" onClick={cancelEdit}><X size={16} /></IconBtn>
                        </>
                      ) : (
                        <>
                          <IconBtn title="Edit" onClick={() => startEdit(r)}><Pencil size={16} /></IconBtn>
                          <IconBtn title="Delete" onClick={() => handleDelete(r)}><Trash2 size={16} /></IconBtn>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Pager page={page} setPage={setPage} totalPages={totalPages} />
        </div>
      </Card>

      {/* ---- Add Expense modal ---- */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Expense"
        footer={
          <>
            <Button className="bg-slate-100" onClick={() => save(false)} disabled={saving}>
              {saving ? "Saving..." : "Add and Next"}
            </Button>
            <Button className="bg-[#2f6b8f] text-white" onClick={() => save(true)} disabled={saving}>
              {saving ? "Saving..." : "Add"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* GL with Add New */}
          <label className="block">
            <span className="text-sm text-slate-600">General Ledger Account *</span>
            <select
              id="exp-ledger"
              className={baseInput}
              onChange={(e) => {
                if (e.target.value === "__add__") {
                  const name = prompt("Add General Ledger Account name:");
                  if (name && name.trim()) {
                    const clean = name.trim();
                    setGlOpts((o) => [clean, ...o]);
                    const hid = document.getElementById("exp-gl-label");
                    if (hid) hid.value = clean;
                    e.target.value = clean;
                  } else {
                    e.target.value = "";
                  }
                } else {
                  const hid = document.getElementById("exp-gl-label");
                  if (hid) hid.value = e.target.value;
                }
              }}
            >
              <option value="">Select…</option>
              <option value="__add__">Add New Account…</option>
              {glOpts.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <input id="exp-gl-label" type="hidden" />

          {/* Vendor with Add New */}
          <label className="block">
            <span className="text-sm text-slate-600">Vendor</span>
            <select
              id="exp-vendor"
              className={baseInput}
              defaultValue="No vendor"
              onChange={(e) => {
                if (e.target.value === "__add__") {
                  const name = prompt("Add Vendor name:");
                  if (name && name.trim()) {
                    const clean = name.trim();
                    setVendors((o) => [clean, ...o.filter((v) => v !== clean)]);
                    e.target.value = clean;
                  } else {
                    e.target.value = "No vendor";
                  }
                }
              }}
            >
              <option value="No vendor">No vendor</option>
              <option value="__add__">Add new vendor…</option>
              {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>

          <TextField label="Description" id="exp-desc" />
          <TextField label="Amount (£)" id="exp-amount" prefix="£" type="number" />
          <DateField label="Date" id="exp-date" />
          <TextField label="Bank Account" id="exp-bank" />

          {/* Linked Sale search */}
          <div className="block relative" ref={saleSugRef}>
            <span className={labelCls}>Linked Sale</span>
            <input
              id="exp-linked-search"
              className={`${baseInput} mt-1`}
              placeholder="Type to search your sales…"
              onFocus={() => setShowSaleSug(true)}
              onChange={(e) => { setSaleQuery(e.target.value); setShowSaleSug(true); }}
              autoComplete="off"
            />
            <input id="exp-linked-id" type="hidden" />
            {showSaleSug && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-auto">
                {saleList
                  .filter((s) => saleQuery ? s.item_sold.toLowerCase().includes(saleQuery.toLowerCase()) : true)
                  .slice(0, 10)
                  .map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50"
                      onClick={() => {
                        const q = document.getElementById("exp-linked-search");
                        const hid = document.getElementById("exp-linked-id");
                        if (q) q.value = s.item_sold;
                        if (hid) hid.value = s.id;
                        setShowSaleSug(false);
                      }}
                    >
                      {s.item_sold}
                    </button>
                  ))}
                {!saleList.length && <div className="px-3 py-2 text-slate-500">No sales yet</div>}
              </div>
            )}
          </div>

          <FileField label="Attach Receipt" id="exp-receipt" />
        </div>
      </Modal>
    </div>
  );
}

// ---------- Reports ----------
function Reports() {
  return (
    <div className="space-y-6">
      <Card title="Reseller Reports">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            label="Report Type"
            id="rep-type"
            options={[
              "Profit/Loss Statement",
              "Inventory Report",
              "Platform Transactions",
              "Sales Tax Report",
              "Schedule C Generator",
            ]}
          />
          <Select
            label="Period"
            id="rep-period"
            options={["Current day", "Current week", "Current month", "Current year", "Custom"]}
          />
          <DateField label="Start Date" id="rep-start" />
          <DateField label="End Date" id="rep-end" />
        </div>
        <Button className="mt-4 bg-[#2f6b8f] text-white">Run Report</Button>
      </Card>
    </div>
  );
}

// ---------- Integrations ----------
function Integrations() {
  return (
    <div className="space-y-6">
      <Card title="Platform Integrations">
        <IntegrationRow title="eBay" platform="eBay" />
        <IntegrationRow title="Poshmark" platform="Poshmark" />
        <IntegrationRow title="Mercari" platform="Mercari" beta />
      </Card>
      <Card title="Bank Integrations">
        <p className="text-slate-600">
          Connect your bank or credit card here. Bank feeds are available on this workspace.
        </p>
      </Card>
    </div>
  );
}

function IntegrationRow({ title, platform, beta }) {
  return (
    <div className="grid grid-cols-12 items-center gap-2 py-3 border-b last:border-0">
      <div className="col-span-3 font-medium">{title}</div>
      <div className="col-span-3 text-slate-600">Username</div>
      <div className="col-span-2 text-slate-600">
        {platform}
        {beta ? "*" : ""}
      </div>
      <div className="col-span-2">
        <Button className="border border-slate-200">Import</Button>
      </div>
      <div className="col-span-2 flex gap-2 justify-end">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" /> Daily Sales
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" /> Inventory
        </label>
      </div>
    </div>
  );
}

// ---------- Add Rebate / Refund ----------
function AddRebateRefund() {
  const [openRebate, setOpenRebate] = useState(false);
  const [openRefund, setOpenRefund] = useState(false);
  const [rows, setRows] = useState([]); // unified list
  // NEW: sales + selected sale (with inventory metadata if we can find it)
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [loading, setLoading] = useState(false);
  const { sortKey, dir, onSort, page, setPage, pageSize, setPageSize, totalPages, rows: viewRows, resetPage } = useSortPage(rows);

  function ROField({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">{value ?? "-"}</div>
    </div>
  );
}

  useEffect(() => { resetPage(); }, [sortKey, dir, rows]);

  async function load() {
    setLoading(true);
    try {
      const [{ data: rebates = [] }, { data: refunds = [] }] = await Promise.all([
        supabase.from("rebates").select("id, vendor, description, amount, date, bank_account, created_at").order("created_at", { ascending: false }),
        supabase.from("refunds").select("id, item, amount, refund_date, sale_id, created_at").order("created_at", { ascending: false }),
      ]);
      // normalize to one grid
      const unified = [
        ...rebates.map(r => ({
          id: r.id,
          type: "rebate",
          title: r.description || "(rebate)",
          vendor: r.vendor || "-",
          amount: Number(r.amount || 0),
          date: r.date,
          bank: r.bank_account || "-",
          created_at: r.created_at
        })),
        ...refunds.map(r => ({
          id: r.id,
          type: "refund",
          title: r.item || "(refund)",
          vendor: "-", // customer refunds aren't tied to vendor here
          amount: Number(r.amount || 0),
          date: r.refund_date,
          bank: "-",
          created_at: r.created_at
        })),
      ];
      setRows(unified);
    } finally {
      setLoading(false);
    }
  }
  // Load user sales + try to attach inventory metadata by matching title
  async function loadSales() {
    const [{ data: salesRows = [] }, { data: invRows = [] }] = await Promise.all([
      supabase.from("sales").select("id,item_sold,sale_price,platform,sale_date,purchase_price,created_at").order("sale_date", { ascending: false }),
      supabase.from("inventory").select("id,title,purchase_date,purchase_price,vendor,created_at").order("purchase_date", { ascending: false }),
    ]);
    // quick lookup: latest inventory row by lowercase title (<= sale_date if possible)
    const byTitle = new Map();
    for (const inv of invRows) {
      const key = (inv.title || "").toLowerCase().trim();
      if (!byTitle.has(key)) byTitle.set(key, []);
      byTitle.get(key).push(inv);
    }
    for (const arr of byTitle.values()) arr.sort((a,b) => new Date(b.purchase_date||b.created_at) - new Date(a.purchase_date||a.created_at));

    const hydrated = salesRows.map(s => {
      const key = (s.item_sold || "").toLowerCase().trim();
      let inv = null;
      const choices = byTitle.get(key) || [];
      if (choices.length) {
        // pick first inventory row with purchase_date <= sale_date, else the latest
        inv = choices.find(c => (c.purchase_date && s.sale_date && new Date(c.purchase_date) <= new Date(s.sale_date))) || choices[0];
      }
     return {
        ...s,
        _inv_vendor: inv?.vendor || null,
        _inv_purchase_date: inv?.purchase_date || null,
        _inv_purchase_price: inv?.purchase_price ?? null,
      };
    });
    setSales(hydrated);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { loadSales(); }, []);

  async function deleteRow(row) {
    if (!confirm(`Delete this ${row.type}?`)) return;
    const table = row.type === "rebate" ? "rebates" : "refunds";
    const { error } = await supabase.from(table).delete().eq("id", row.id);
    if (error) return alert(error.message);
    setRows((r) => r.filter(x => x.id !== row.id));
  }

  function handleSaleChange(e) {
    const id = e.target.value || null;
    const sale = sales.find(s => s.id === id) || null;
    setSelectedSale(sale);
    // Pre-fill refund amount with sale price if present
    const amt = document.getElementById("refund-amount");
    if (sale && amt && !amt.value) amt.value = sale.sale_price ?? "";
  }

  // -- Add Rebate form handlers
  async function saveRebate(closeAfter) {
    const get = (id) => document.getElementById(id);
    const values = {
      vendor: get("rebate-vendor").value,
      description: get("rebate-desc").value,
      amount: Number(get("rebate-amount").value || 0),
      date: get("rebate-date").value,
      bank_account: get("rebate-bank").value || null,
    };
    if (!values.amount || !values.date) return alert("Amount and Date are required.");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("You are signed out.");
    const { error } = await supabase.from("rebates").insert([{ ...values, user_id: session.user.id }]);
    if (error) return alert(error.message);
    await load();
    if (closeAfter) setOpenRebate(false);
    else { get("rebate-desc").value = ""; get("rebate-amount").value = ""; }
  }

  // -- Add Refund form handlers
  async function saveRefund(closeAfter) {
    const get = (id) => document.getElementById(id);
    const values = {
      item: selectedSale?.item_sold || get("refund-item").value,
      amount: Number(get("refund-amount").value || 0),
      refund_date: get("refund-date").value,
      sale_id: selectedSale?.id || null,
    };
    if (!values.amount || !values.refund_date) return alert("Amount and Date are required.");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("You are signed out.");
    const { error } = await supabase.from("refunds").insert([{ ...values, user_id: session.user.id }]);
    if (error) return alert(error.message);
    await load();
    if (closeAfter) setOpenRefund(false);
    else { setSelectedSale(null); get("refund-item").value = ""; get("refund-amount").value = ""; }
  }

  return (
    <div className="space-y-4">
      <Card
        title="Add Rebate/Refund"
        right={
          <div className="flex items-center gap-2">
            <Button className="bg-[#1f4e6b] text-white" onClick={() => setOpenRebate(true)}>
              <BadgeDollarSign size={16}/> Add Rebate
            </Button>
            <Button className="bg-slate-900 text-white" onClick={() => setOpenRefund(true)}>
              <RotateCcw size={16}/> Add Refund
            </Button>
          </div>
        }
      >
        <p className="text-slate-700">Record cash coming back from vendors (rebate) or money returned to customers (refund).</p>
      </Card>

      <Card
        title="Your Rebates/Refunds"
        right={
          <div className="flex items-center gap-3 text-sm text-slate-500">
            {loading ? "Loading..." : `${rows.length} row(s)`}
            <select className="border rounded-lg px-2 py-1" value={pageSize} onChange={(e)=>{setPageSize(Number(e.target.value)); setPage(1);}}>
              <option>5</option><option>10</option><option>25</option>
            </select>
          </div>
        }
      >
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <SortHeader label="Type" sortKey="type" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortHeader label="Title" sortKey="title" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortHeader label="Vendor" sortKey="vendor" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortHeader label="Amount" sortKey="amount" activeKey={sortKey} dir={dir} onSort={onSort} />
                <SortHeader label="Date" sortKey="date" activeKey={sortKey} dir={dir} onSort={onSort} />
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {viewRows.length === 0 && (<tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No items yet</td></tr>)}
              {viewRows.map((r) => (
                <tr key={`${r.type}-${r.id}`} className="border-t">
                  <td className="px-3 py-2 capitalize">{r.type}</td>
                  <td className="px-3 py-2">{r.title}</td>
                  <td className="px-3 py-2">{r.vendor}</td>
                  <td className="px-3 py-2">{fmtMoney(r.amount)}</td>
                  <td className="px-3 py-2">{fmtDate(r.date)}</td>
                  <td className="px-3 py-2 text-right">
                    <IconBtn title="Delete" onClick={() => deleteRow(r)}><Trash2 size={16}/></IconBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between"><Pager page={page} setPage={setPage} totalPages={totalPages} /></div>
      </Card>

      {/* Add Rebate */}
      <Modal
        open={openRebate}
        onClose={() => setOpenRebate(false)}
        title="Add Rebate"
        footer={
          <>
            <Button className="bg-slate-100" onClick={() => saveRebate(false)}>Add and Next</Button>
            <Button className="bg-[#2f6b8f] text-white" onClick={() => saveRebate(true)}>Add</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Vendor" id="rebate-vendor" />
          <TextField label="Amount (£)" id="rebate-amount" prefix="£" type="number" />
          <DateField label="Date" id="rebate-date" />
          <TextField label="Bank Account" id="rebate-bank" />
          <TextArea label="Description" id="rebate-desc" className="md:col-span-2" />
        </div>
      </Modal>

      {/* Add Refund */}
      <Modal
        open={openRefund}
        onClose={() => setOpenRefund(false)}
        title="Add Refund"
        footer={
          <>
            <Button className="bg-slate-100" onClick={() => saveRefund(false)}>Add and Next</Button>
            <Button className="bg-[#2f6b8f] text-white" onClick={() => saveRefund(true)}>Add</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SALE PICKER */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Sale (item / reason)</label>
            <select id="refund-sale" onChange={handleSaleChange} value={selectedSale?.id || ""} className="w-full rounded-xl border border-slate-300 px-3 py-2">
              <option value="">— Select a sale —</option>
              {sales.map(s => (
                <option key={s.id} value={s.id}>
                  {`${s.item_sold || "(item)"} • ${fmtDate(s.sale_date)} • ${fmtMoney(s.sale_price)} • ${s.platform || "-"}`}
                </option>
              ))}
            </select>
          </div>

          {/* Editable core fields */}
          <TextField label="Amount (£)" id="refund-amount" prefix="£" type="number" />
          <DateField label="Refund Date" id="refund-date" />

          {/* Fallback free text if you want to override item/notes */}
          <TextField label="Item / Reason (optional override)" id="refund-item" placeholder={selectedSale?.item_sold || ""} />
          <TextArea label="Notes (optional)" id="refund-notes" className="md:col-span-2" />

          {/* Auto details (read-only) */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <ROField label="Date Sold" value={selectedSale?.sale_date ? fmtDate(selectedSale.sale_date) : "-"} />
            <ROField label="Sale Price" value={selectedSale?.sale_price != null ? fmtMoney(selectedSale.sale_price) : "-"} />
            <ROField label="Platform" value={selectedSale?.platform || "-"} />
            <ROField label="Vendor (bought from)" value={selectedSale?._inv_vendor || "-"} />
            <ROField label="Purchase Date" value={selectedSale?._inv_purchase_date ? fmtDate(selectedSale._inv_purchase_date) : "-"} />
            <ROField label="Purchase Price" value={selectedSale?._inv_purchase_price != null ? fmtMoney(selectedSale._inv_purchase_price) : "-"} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------- page registry & shell ----------
const PAGES = {
  "Get Started": GetStarted,
  Dashboards: Dashboard,
  "Transaction Details": TransactionDetails,
  "Reseller Reports": Reports,
  "Report Sale": ReportSale,
  "Add Inventory": AddInventory,
  "Add Expense": AddExpense,
  "Add Rebate/Refund": AddRebateRefund,
  Integrations: Integrations,
  Settings: Settings,
};

function iconFor(name) {
  switch (name) {
    case "Get Started":
      return Home;
    case "Dashboards":
      return BarChart2;
    case "Transaction Details":
      return Package;
    case "Reseller Reports":
      return FileText;
    case "Report Sale":
      return ShoppingCart;
    case "Add Inventory":
      return Package;
    case "Add Expense":
      return Receipt;
    case "Add Rebate/Refund":
      return RotateCcw; 
    case "Integrations":
      return LinkIcon;
    default:
      return Layers;
  }
}

function PageHeader({ name }) {
  const quickRanges = ["Current day", "Current week", "Current month", "Current year", "Custom"];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-2xl font-semibold text-slate-800">{name}</div>
      <div className="flex items-center gap-2">
        <select className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option>Overview</option>
          <option>By Platform</option>
          <option>By Category</option>
        </select>
        {quickRanges.map((r) => (
          <button
            key={r}
            className={`px-3 py-2 rounded-xl text-sm border border-slate-200 ${
              r === "Current year" ? "bg-[#1f4e6b] text-white" : "bg-white"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [page, setPage] = useState("Get Started");
  const [showSettings, setShowSettings] = useState(false);   // ✨ NEW
  const PageComp = PAGES[page];

  // ... your existing useEffect etc.

  return (
    <div className="min-h-screen grid grid-cols-12 bg-slate-50">
      <aside className="col-span-12 md:col-span-2 xl:col-span-2 bg-white border-r border-slate-200 p-3 flex flex-col">
        {/* ... sidebar unchanged ... */}
      </aside>

      <main className="col-span-12 md:col-span-10 xl:col-span-10">
        {/* pass the opener down */}
        <TopBar onOpenSettings={() => setShowSettings(true)} />

        <div className="px-4 pb-10">
          <PageHeader name={page} />
          <div className="mt-4">
            <PageComp />
          </div>
        </div>
      </main>

      {/* SETTINGS OVERLAY (uses your existing Modal) */}
      <Modal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        title="Settings"
      >
        <SettingsPage />
      </Modal>
    </div>
  );
}


/** ---- Modal (kept at bottom to avoid scroll noise) ---- */
function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="px-2 py-1 rounded hover:bg-slate-100">
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
        <div className="border-t px-4 py-3 flex items-center justify-end gap-2">
          {footer ? (
            footer
          ) : (
            <>
              <Button className="bg-slate-100" onClick={onClose}>
                Add and Next
              </Button>
              <Button className="bg-[#2f6b8f] text-white" onClick={onClose}>
                Add
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
