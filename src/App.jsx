// src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Search, Bell, Settings, User as UserIcon, LogOut, Plus, BarChart2, Package,
  Receipt, ShoppingCart, FileText, Layers, Home, Link as LinkIcon,
} from "lucide-react";
import { supabase } from "./lib/supabaseClient";

/**
 * Single-file React admin UI inspired by My Reseller Genie
 * - Tailwind CSS for styling
 * - All features unlocked - no plan gates
 * - Values shown in £ GBP
 */

const NavButton = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 w-full text-left rounded-xl px-3 py-2 transition ${
      active ? "bg-[#1f4e6b] text-white" : "text-slate-800 hover:bg-slate-100"
    }`}
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

/* ------------------------- Top bar with user menu ------------------------- */
const TopBar = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data?.user?.email || "");
    });
  }, []);

  useEffect(() => {
    function onClick(e) {
      if (!open) return;
      const clickInsideBtn = btnRef.current && btnRef.current.contains(e.target);
      const clickInsideMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!clickInsideBtn && !clickInsideMenu) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <div className="relative flex items-center justify-end gap-2 p-3">
      <button className="p-2 rounded-full hover:bg-slate-100" title="Search">
        <Search size={18} />
      </button>
      <button className="p-2 rounded-full hover:bg-slate-100" title="Notifications">
        <Bell size={18} />
      </button>
      <button className="p-2 rounded-full hover:bg-slate-100" title="Settings">
        <Settings size={18} />
      </button>

      {/* Avatar button */}
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

      {/* Dropdown */}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-3 top-14 w-60 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        >
          <div className="px-3 py-2 text-sm text-slate-500 border-b truncate">
            {email || "Signed in"}
          </div>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              alert("Profile coming soon");
            }}
            role="menuitem"
          >
            Profile
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-red-600"
            onClick={handleSignOut}
            role="menuitem"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
};

/* ------------------------------ Page: Intro ------------------------------ */
function GetStarted() {
  return (
    <div className="space-y-6">
      <Card title="Get Started">
        <p className="text-slate-700 max-w-2xl">
          Welcome. This setup wizard will help you configure your reselling workspace. Click the button to begin.
        </p>
        <button className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#2f6b8f] text-white px-4 py-2 hover:bg-[#1f4e6b]">
          <Home size={16} /> Start Setup
        </button>
      </Card>
    </div>
  );
}

/* ---------------------------- Page: Dashboard ---------------------------- */
function Dashboard() {
  const data = useMemo(
    () => [
      { m: "1/2025", income: 0, expenses: 0 },
      { m: "2/2025", income: 0, expenses: 0 },
      { m: "3/2025", income: 0, expenses: 0 },
      { m: "4/2025", income: 0, expenses: 0 },
      { m: "5/2025", income: 0, expenses: 0 },
      { m: "6/2025", income: 0, expenses: 0 },
      { m: "7/2025", income: 0, expenses: 0 },
      { m: "8/2025", income: 0, expenses: 0 },
      { m: "9/2025", income: 0, expenses: 0 },
    ],
    []
  );

  const Stat = ({ label, value }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-2xl font-semibold text-slate-800 mt-1">{value}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat label="Income" value="£0.00" />
        <Stat label="Expenses" value="£0.00" />
        <Stat label="Profit (£)" value="£0.00" />
        <Stat label="Profit (%)" value="0.00%" />
      </div>

      <Card title="Profitability">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 12, right: 12 }}>
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

/* --------------------------- Small table helper -------------------------- */
function DataTable({ columns, rows, empty = "No rows" }) {
  return (
    <div className="overflow-auto border border-slate-200 rounded-2xl">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 text-left whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-500">{empty}</td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              {columns.map((c) => (
                <td key={c} className="px-3 py-2 whitespace-nowrap text-slate-800">{r[c] ?? ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------- Page: Transaction details --------------------- */
function TransactionDetails() {
  const [tab, setTab] = useState("Inventory");
  const tabs = ["Inventory", "Sales", "Refunds", "Expenses"];

  const columns = useMemo(() => {
    if (tab === "Inventory") return ["Item Title", "Quantity", "Department", "Category", "Vendor", "Brand", "Location", "SKU"];
    if (tab === "Sales") return ["Item Sold", "Sale Price (£)", "Fees (£)", "Sale Platform", "Sale Date", "Purchase Price (£)", "Notes"];
    if (tab === "Refunds") return ["Order", "Reason", "Amount (£)", "Date"];
    return ["General Ledger Account", "Vendor", "Description", "Amount (£)", "Date", "Linked Sale"];
  }, [tab]);

  return (
    <div className="space-y-4">
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

      <Card title={`${tab} Detail`}>
        <div className="flex flex-wrap gap-2 mb-3">
          <button className="px-3 py-2 rounded-xl border border-slate-200 bg-white">Filters</button>
          <button className="px-3 py-2 rounded-xl border border-slate-200 bg-white">Columns</button>
          <button className="px-3 py-2 rounded-xl border border-slate-200 bg-white">Density</button>
          <button className="px-3 py-2 rounded-xl border border-slate-200 bg-white">Export</button>
        </div>
        <DataTable columns={columns} rows={[]} />
      </Card>
    </div>
  );
}

/* --------------------------------- Modal -------------------------------- */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="px-2 py-1 rounded hover:bg-slate-100">Close</button>
        </div>
        <div className="p-4">{children}</div>
        <div className="border-t px-4 py-3 flex items-center justify-end gap-2">
          <button className="px-3 py-2 rounded-xl bg-slate-100" onClick={onClose}>Add and Next</button>
          <button className="px-3 py-2 rounded-xl bg-[#2f6b8f] text-white" onClick={onClose}>Add</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Report Sale ------------------------------ */
function ReportSale() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <Card
        title="Report Sale"
        right={<button onClick={() => setOpen(true)} className="px-3 py-2 rounded-xl bg-[#2f6b8f] text-white flex items-center gap-2"><Plus size={16}/> Quick View</button>}
      >
        <p className="text-slate-700">Open the Quick View to add a sale.</p>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Report Sale">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Item Sold" />
          <TextField label="Sale Price (£)" prefix="£" type="number" />
          <TextField label="Shipping Cost (£)" prefix="£" type="number" />
          <TextField label="Transaction Fees (£)" prefix="£" type="number" />
          <Select label="Sale Platform" options={["No Sale Platform","eBay","Etsy","Vinted","Other"]} />
          <DateField label="Sale Date" />
          <TextField label="Purchase Price (£)" prefix="£" type="number" />
          <DateField label="Purchase Date" />
          <TextArea label="Sale Notes" className="md:col-span-2" />
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------ Add Inventory ---------------------------- */
function AddInventory() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <Card
        title="Add Inventory"
        right={<button onClick={() => setOpen(true)} className="px-3 py-2 rounded-xl bg-[#2f6b8f] text-white flex items-center gap-2"><Plus size={16}/> Open Form</button>}
      >
        <p className="text-slate-700">Add a new item to inventory.</p>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Inventory">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Item Title" required />
          <Select label="Vendor" options={["No vendor","Temu","Amazon","Wholesaler","Other"]} />
          <Select label="Department" options={["General","Electronics","Clothing","Other"]} />
          <Select label="Category" options={["Accessories","Computers","Parts","Other"]} />
          <TextField label="Sub category" />
          <TextField label="Brand" />
          <TextField label="Location" />
          <TextField label="SKU" />
          <Select label="Platforms Listed" options={["eBay","Etsy","Vinted","None"]} />
          <DateField label="Purchase Date" />
          <TextField label="Purchase Price (£)" prefix="£" type="number" />
          <NumberField label="Quantity" defaultValue={1} />
          <TextArea label="Notes" className="md:col-span-2" />
          <FileField label="Attach Receipt" />
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------- Add Expense ----------------------------- */
function AddExpense() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <Card
        title="Add Expense"
        right={<button onClick={() => setOpen(true)} className="px-3 py-2 rounded-xl bg-[#2f6b8f] text-white flex items-center gap-2"><Plus size={16}/> Open Form</button>}
      >
        <p className="text-slate-700">Record a business expense and link it to a sale if needed.</p>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Expense">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="General Ledger Account" options={["Postage","Packaging","Software and apps","Advertising","Other"]} />
          <Select label="Vendor" options={["No vendor","Royal Mail","Temu","Amazon","Other"]} />
          <TextField label="Description" />
          <TextField label="Amount (£)" prefix="£" type="number" />
          <DateField label="Date" />
          <TextField label="Bank Account" />
          <Select label="Linked Sale" options={["None","Most recent","Search later"]} />
          <FileField label="Attach Receipt" />
        </div>
      </Modal>
    </div>
  );
}

/* -------------------------------- Reports -------------------------------- */
function Reports() {
  return (
    <div className="space-y-6">
      <Card title="Reseller Reports">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select label="Report Type" options={["Profit/Loss Statement","Inventory Report","Platform Transactions","Sales Tax Report","Schedule C Generator"]} />
          <Select label="Period" options={["Current day","Current week","Current month","Current year","Custom"]} />
          <DateField label="Start Date" />
          <DateField label="End Date" />
        </div>
        <button className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#2f6b8f] text-white px-4 py-2">Run Report</button>
      </Card>
    </div>
  );
}

/* ------------------------------ Integrations ----------------------------- */
function Integrations() {
  return (
    <div className="space-y-6">
      <Card title="Platform Integrations">
        <IntegrationRow title="eBay" platform="eBay" />
        <IntegrationRow title="Poshmark" platform="Poshmark" />
        <IntegrationRow title="Mercari" platform="Mercari" beta />
      </Card>
      <Card title="Bank Integrations">
        <p className="text-slate-600">Connect your bank or credit card here. Bank feeds are available on this workspace.</p>
      </Card>
    </div>
  );
}

function IntegrationRow({ title, platform, beta }) {
  return (
    <div className="grid grid-cols-12 items-center gap-2 py-3 border-b last:border-0">
      <div className="col-span-3 font-medium">{title}</div>
      <div className="col-span-3 text-slate-600">Username</div>
      <div className="col-span-2 text-slate-600">{platform}{beta ? "*" : ""}</div>
      <div className="col-span-2">
        <button className="px-3 py-1.5 rounded-lg border border-slate-200">Import</button>
      </div>
      <div className="col-span-2 flex gap-2 justify-end">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox"/> Daily Sales</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox"/> Inventory</label>
      </div>
    </div>
  );
}

/* ------------------------------ Small inputs ----------------------------- */
const baseInput = "w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2f6b8f]";
const labelCls = "text-sm text-slate-600";

function TextField({ label, prefix, type = "text", required, className }) {
  return (
    <label className={`block ${className || ""}`}>
      <span className={labelCls}>{label}{required ? " *" : ""}</span>
      <div className="mt-1 flex items-center gap-2">
        {prefix ? <span className="px-2 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600">{prefix}</span> : null}
        <input type={type} className={baseInput} />
      </div>
    </label>
  );
}
function NumberField({ label, defaultValue = 0, className }) {
  return (
    <label className={`block ${className || ""}`}>
      <span className={labelCls}>{label}</span>
      <input type="number" defaultValue={defaultValue} className={baseInput} />
    </label>
  );
}
function DateField({ label, className }) {
  return (
    <label className={`block ${className || ""}`}>
      <span className={labelCls}>{label}</span>
      <input type="date" className={baseInput} />
    </label>
  );
}
function TextArea({ label, className }) {
  return (
    <label className={`block ${className || ""}`}>
      <span className={labelCls}>{label}</span>
      <textarea rows={4} className={baseInput} />
    </label>
  );
}
function Select({ label, options = [], className }) {
  return (
    <label className={`block ${className || ""}`}>
      <span className={labelCls}>{label}</span>
      <select className={baseInput}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}
function FileField({ label, className }) {
  return (
    <label className={`block ${className || ""}`}>
      <span className={labelCls}>{label}</span>
      <input type="file" className={baseInput} />
    </label>
  );
}

/* --------------------------------- Pages --------------------------------- */
const PAGES = {
  "Get Started": GetStarted,
  Dashboards: Dashboard,
  "Transaction Details": TransactionDetails,
  "Reseller Reports": Reports,
  "Report Sale": ReportSale,
  "Add Inventory": AddInventory,
  "Add Expense": AddExpense,
  Integrations: Integrations,
};

function iconFor(name) {
  switch (name) {
    case "Get Started": return Home;
    case "Dashboards": return BarChart2;
    case "Transaction Details": return Package;
    case "Reseller Reports": return FileText;
    case "Report Sale": return ShoppingCart;
    case "Add Inventory": return Package;
    case "Add Expense": return Receipt;
    case "Integrations": return LinkIcon;
    default: return Layers;
  }
}

function PageHeader({ name }) {
  const quickRanges = ["Current day","Current week","Current month","Current year","Custom"];
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
          <button key={r} className={`px-3 py-2 rounded-xl text-sm border border-slate-200 ${r === "Current year" ? "bg-[#1f4e6b] text-white" : "bg-white"}`}>{r}</button>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- App ----------------------------------- */
export default function AdminApp() {
  const [page, setPage] = useState("Get Started");
  const PageComp = PAGES[page];

  return (
    <div className="min-h-screen grid grid-cols-12 bg-slate-50">
      {/* Sidebar */}
      <aside className="col-span-12 md:col-span-2 xl:col-span-2 bg-white border-r border-slate-200 p-3 flex flex-col">
        <div className="flex items-center gap-2 px-2 py-3">
          <Layers size={22} className="text-[#2f6b8f]" />
          <div className="leading-tight">
            <div className="font-semibold">Reseller Admin</div>
            <div className="text-xs text-slate-500">All features unlocked</div>
          </div>
        </div>
        <nav className="mt-3 space-y-1">
          {Object.keys(PAGES).map((name) => (
            <NavButton
              key={name}
              icon={iconFor(name)}
              label={name}
              active={page === name}
              onClick={() => setPage(name)}
            />
          ))}
        </nav>
        <div className="mt-auto pt-4">
          <div className="w-full text-center rounded-xl bg-green-600 text-white py-2">All features unlocked</div>
          <div className="mt-2 text-xs text-slate-500">No plan limits. Full access enabled.</div>
        </div>
      </aside>

      {/* Main */}
      <main className="col-span-12 md:col-span-10 xl:col-span-10">
        <TopBar />
        <div className="px-4 pb-10">
          <PageHeader name={page} />
          <div className="mt-4">
            <PageComp />
          </div>
        </div>
      </main>
    </div>
  );
}
