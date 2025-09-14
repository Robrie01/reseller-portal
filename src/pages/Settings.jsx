// src/pages/Settings.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Analytics groupings
import {
  listGroupings,
  deleteGrouping,
  updateGrouping,
} from "../db/analytics";
import GroupingModal from "../components/GroupingModal";

// Sales platforms
import {
  listSalePlatforms,
  updateSalePlatform,
  deleteSalePlatform,
} from "../db/platforms";
import SalePlatformModal from "../components/SalePlatformModal";

import { Plus, Pencil, Trash2 } from "lucide-react";

export default function Settings() {
  // Profile
  const [user, setUser] = useState(null);

  // Sales platforms
  const [platforms, setPlatforms] = useState([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);
  const [spModalOpen, setSpModalOpen] = useState(false);
  const [editingPlatformId, setEditingPlatformId] = useState(null);
  const [editingPlatformName, setEditingPlatformName] = useState("");

  // Analytics groupings
  const [groupings, setGroupings] = useState([]);
  const [groupingModalOpen, setGroupingModalOpen] = useState(false);
  const [editingGroupingId, setEditingGroupingId] = useState(null);
  const [editingGroupingName, setEditingGroupingName] = useState("");
  const [groupingModalOpen, setGroupingModalOpen] = useState(false);

  async function removeGrouping(id) {
    if (!confirm("Delete this grouping?")) return;
    try {
      await deleteGrouping(id);
      const rows = await listGroupings();
      setGroupings(rows || []);
    } catch (e) {
      alert(e.message || "Could not delete grouping");
    }
  }
  
  // ---- Loaders ----
  async function loadProfile() {
    const { data } = await supabase.auth.getUser();
    setUser(data?.user || null);
  }

  async function loadPlatforms() {
    setLoadingPlatforms(true);
    try {
      const list = await listSalePlatforms();
      setPlatforms(list || []);
    } finally {
      setLoadingPlatforms(false);
    }
  }

  async function loadGroupings() {
    try {
      const rows = await listGroupings();
      setGroupings(rows || []);
    } catch (e) {
      console.error("Failed to load analytics groupings:", e);
    }
  }

  async function loadAll() {
    await Promise.all([loadProfile(), loadPlatforms(), loadGroupings()]);
  }

  useEffect(() => {
    loadAll();
  }, []);

  // ---- Sales Platforms actions ----
  function startEditPlatform(row) {
    setEditingPlatformId(row.id);
    setEditingPlatformName(row.name);
  }

  async function saveEditPlatform() {
    const name = (editingPlatformName || "").trim();
    if (!name || !editingPlatformId) return;
    try {
      await updateSalePlatform(editingPlatformId, name);
      setEditingPlatformId(null);
      setEditingPlatformName("");
      await loadPlatforms();
    } catch (e) {
      alert(e.message || "Could not update platform");
    }
  }

  async function removePlatform(id) {
    if (!id) return;
    if (!confirm("Delete this platform?")) return;
    try {
      await deleteSalePlatform(id);
      await loadPlatforms();
    } catch (e) {
      alert(e.message || "Could not delete platform");
    }
  }

  // ---- Analytics Groupings actions ----
  function startEditGrouping(row) {
    const display = row.name || row.grouping || row.title || row.label || "";
    setEditingGroupingId(row.id);
    setEditingGroupingName(display);
  }

  async function saveEditGrouping() {
    const v = (editingGroupingName || "").trim();
    if (!v || !editingGroupingId) return;
    try {
      await updateGrouping(editingGroupingId, v);
      setEditingGroupingId(null);
      setEditingGroupingName("");
      await loadGroupings();
    } catch (e) {
      alert(e.message || "Could not update grouping");
    }
  }

  async function removeGrouping(id) {
    if (!confirm("Delete this grouping?")) return;
    try {
      await deleteGrouping(id);
      await loadGroupings();
    } catch (e) {
      alert(e.message || "Could not delete grouping");
    }
  }

  return (
    <div className="p-4 space-y-8">
      {/* Profile */}
      <section className="bg-white rounded-xl border border-zinc-200 p-4">
        <h2 className="text-sm font-semibold text-zinc-700 mb-3">Profile</h2>
        <div className="text-sm">
          <div>
            <span className="text-zinc-500">Name:</span>{" "}
            {user?.user_metadata?.name || "—"}
          </div>
          <div>
            <span className="text-zinc-500">Email:</span>{" "}
            {user?.email || "—"}
          </div>
        </div>
      </section>

      {/* Sales Platform */}
      <section className="bg-white rounded-xl border border-zinc-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-700">Sales Platform</h2>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            onClick={() => setSpModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add Sales Platform
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="text-left px-3 py-2">Platform Title</th>
                <th className="w-24 text-right px-3 py-2">Remove</th>
              </tr>
            </thead>
            <tbody>
              {loadingPlatforms && (
                <tr>
                  <td className="px-3 py-8 text-center text-zinc-400" colSpan={2}>
                    Loading…
                  </td>
                </tr>
              )}

              {!loadingPlatforms && platforms.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-zinc-400" colSpan={2}>
                    No rows
                  </td>
                </tr>
              )}

              {!loadingPlatforms &&
                platforms.map((row) => {
                  const isEditing = editingPlatformId === row.id;
                  const readOnly = !row.is_user_owned; // defaults are read-only
                  return (
                    <tr key={row.id} className="border-t border-zinc-100">
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1"
                              value={editingPlatformName}
                              onChange={(e) => setEditingPlatformName(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEditPlatform();
                                if (e.key === "Escape") {
                                  setEditingPlatformId(null);
                                  setEditingPlatformName("");
                                }
                              }}
                            />
                            <button
                              className="px-3 py-1 rounded-md bg-zinc-900 text-white"
                              onClick={saveEditPlatform}
                              title="Save"
                            >
                              Save
                            </button>
                            <button
                              className="px-3 py-1 rounded-md border border-zinc-300"
                              onClick={() => {
                                setEditingPlatformId(null);
                                setEditingPlatformName("");
                              }}
                              title="Cancel"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span>
                              {row.name}
                              {!row.is_user_owned && (
                                <span className="ml-2 text-xs text-zinc-400">(default)</span>
                              )}
                            </span>
                            {!readOnly && (
                              <button
                                className="p-1 rounded-md border border-zinc-200"
                                onClick={() => startEditPlatform(row)}
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {!readOnly ? (
                          <button
                            className="p-1 rounded-md border border-zinc-200"
                            onClick={() => removePlatform(row.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

{/* Analytics Groupings */}
<section className="bg-white rounded-xl border border-zinc-200 p-4">
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-sm font-semibold text-zinc-700">Analytics Groupings</h2>
    <button
      className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
      onClick={() => setGroupingModalOpen({ mode: "add" })}
    >
      <Plus className="w-4 h-4" />
      Add Grouping
    </button>
  </div>

  <div className="overflow-hidden rounded-lg border border-zinc-200">
    <table className="w-full text-sm">
      <thead className="bg-zinc-50 text-zinc-600">
        <tr>
          <th className="text-left px-3 py-2">Department</th>
          <th className="text-left px-3 py-2">Category</th>
          <th className="text-left px-3 py-2">Sub-Category</th>
          <th className="w-24 text-right px-3 py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {groupings.length === 0 ? (
          <tr>
            <td className="px-3 py-8 text-center text-zinc-400" colSpan={4}>
              No rows
            </td>
          </tr>
        ) : (
          groupings.map((g) => (
            <tr key={g.id} className="border-t border-zinc-100">
              <td className="px-3 py-2">{g.department}</td>
              <td className="px-3 py-2">{g.category}</td>
              <td className="px-3 py-2">{g.subcategory}</td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-2">
                  <button
                    className="p-1 rounded-md border border-zinc-200"
                    title="Edit"
                    onClick={() => setGroupingModalOpen({ mode: "edit", row: g })}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1 rounded-md border border-zinc-200"
                    title="Delete"
                    onClick={() => removeGrouping(g.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</section>

{/* Grouping Modal */}
{groupingModalOpen && (
  <GroupingModal
    open={!!groupingModalOpen}
    initial={groupingModalOpen.row}
    onClose={() => setGroupingModalOpen(false)}
    onSaved={async () => {
      const rows = await listGroupings();
      setGroupings(rows || []);
    }}
  />
)}
