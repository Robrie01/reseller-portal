import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { listGroupings, deleteGrouping } from "../db/analytics";
import GroupingModal from "../components/GroupingModal";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const { data } = await supabase.auth.getUser();
    setUser(data?.user || null);
    setRows(await listGroupings());
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Profile stub */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-lg font-medium mb-2">Profile</h2>
        <div className="text-sm text-gray-700">
          <div><span className="text-gray-500">Name:</span> {user?.user_metadata?.name || "—"}</div>
          <div><span className="text-gray-500">Email:</span> {user?.email || "—"}</div>
        </div>
      </section>

      {/* Analytics Groupings */}
      <section className="rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Analytics Groupings</h2>
          <button className="rounded-md bg-[#2f6b8f] text-white px-3 py-2 text-sm"
                  onClick={() => setOpen(true)}>Add</button>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Department</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Sub-Category</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">No groupings yet</td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.department?.name}</td>
                  <td className="px-3 py-2">{r.category?.name}</td>
                  <td className="px-3 py-2">{r.subcategory?.name}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      className="text-red-600 hover:underline"
                      onClick={async () => {
                        if (!confirm("Delete this grouping?")) return;
                        await deleteGrouping(r.id);
                        setRows(prev => prev.filter(x => x.id !== r.id));
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <GroupingModal
        open={open}
        onClose={() => setOpen(false)}
        onAdded={async () => { setOpen(false); setRows(await listGroupings()); }}
      />
    </div>
  );
}
