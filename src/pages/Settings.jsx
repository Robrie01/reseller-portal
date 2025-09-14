// src/pages/Settings.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { listGroupings, deleteGrouping } from "../db/analytics";
import GroupingModal from "../components/GroupingModal";
import { Pencil, Trash2, Plus } from "lucide-react";
import {
  listSalePlatforms,
  addSalePlatform,
  updateSalePlatform,
  deleteSalePlatform,
} from "../db/platforms";

export default function Settings() {
  const [user, setUser] = useState(null);

  // Analytics Groupings (existing)
  const [groupings, setGroupings] = useState([]);
  const [groupingModalOpen, setGroupingModalOpen] = useState(false);

  // Sales Platforms (new)
  const [platforms, setPlatforms] = useState([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);
  const [newPlatform, setNewPlatform] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  async function loadAll() {
    const { data } = await supabase.auth.getUser();
    setUser(data?.user || null);

    // existing groupings
    try {
      const rows = await listGroupings();
      setGroupings(rows || []);
    } catch (e) {
      console.error("Failed to load analytics groupings:", e);
    }

    // new: sale platforms
    setLoadingPlatforms(true);
    try {
      const list = await listSalePlatforms();
      setPlatforms(list || []);
    } catch (e) {
      console.error("Failed to load sale platforms:", e);
    } finally {
      setLoadingPlatforms(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // --- Sales Platforms actions ---
  async function onAddPlatform() {
    const name = newPlatform.trim();
    if (!name) return;
    try {
      await addSalePlatform(name);
      setNewPlatform("");
      const list = await listSalePlatforms();
      setPlatforms(list || []);
    } catch (e) {
      alert(e.message || "Could not add platform");
    }
  }

  function startEditPlatform(row) {
    setEditingId(row.id);
    setEditingName(row.name);
  }

  async function saveEditPlatform() {
    const name = (editingName || "").trim();
    if (!name || !editingId) return;
    try {
      await updateSalePlatform(editingId, name);
      setEditingId(null);
      setEditingName("");
      const list = await listSalePlatforms();
      setPlatforms(list || []);
    } catch (e) {
      alert(e.message || "Could not update platform");
    }
  }

  async function removePlatform(id) {
    if (!id) return;
    if (!confirm("Delete this platform?")) return;
    try {
      await deleteSalePlatform(id);
      const list = await listSalePlatforms();
      setPlatforms(list || []);
    } catch (e) {
      alert(e.message || "Could not delete platform");
    }
  }

  // --- Analytics Groupings actions (existing minimal wiring) ---
  async function removeGrouping(id) {
    try {
      await deleteGrouping(id);
      const rows = await listGroupings();
      setGroupings(rows || []);
    } catch (e) {
      alert(e.message || "Could not delete grouping");
    }
  }

  return (
    <div className="p-4 space-y-8">
      {/* Profile */}
      <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 mb-3">
          Profile
        </h2>
        <div className="text-sm">
          <div><span className="text-zinc-500">Name:</span> {user?.user_metadata?.name || "—"}</div>
          <div><span className="text-zinc-500">Email:</span> {user?.email || "—"}</div>
        </div>
      </section>

      {/* Sales Platform (NEW) */}
      <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 mb-3">
          Sales Platform
        </h2>

        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300">
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
                  const isEditing = editingId === row.id;
                  const readOnly = !row.is_user_owned; // defaults are read-only
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEditPlatform();
                                if (e.key === "Escape") {
                                  setEditingId(null);
                                  setEditingName("");
                                }
                              }}
                            />
                            <button
                              className="px-3 py-1 rounded-md bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900"
                              onClick={saveEditPlatform}
                              title="Save"
                            >
                              Save
                            </button>
                            <button
                              className="px-3 py-1 rounded-md border border-zinc-300 dark:border-zinc-700"
                              onClick={() => {
                                setEditingId(null);
                                setEditingName("");
                              }}
                              title="Cancel"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className={readOnly ? "text-zinc-700 dark:text-zinc-200" : ""}>
                              {row.name}
                              {readOnly && (
                                <span className="ml-2 text-xs text-zinc-400">(default)</span>
                              )}
                            </span>
                            {!readOnly && (
                              <button
                                className="p-1 rounded-md border border-zinc-200 dark:border-zinc-700"
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
                            className="p-1 rounded-md border border-zinc-200 dark:border-zinc-700"
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

        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
            placeholder="Add Sales platform"
            value={newPlatform}
            onChange={(e) => setNewPlatform(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onAddPlatform();
            }}
          />
          <button
            className="inline-flex items-center gap-2 rounded-md bg-green-600 text-white px-3 py-2 text-sm"
            onClick={onAddPlatform}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </section>

      {/* Analytics Groupings (existing) */}
      <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            Analytics Groupings
          </h2>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm"
            onClick={() => setGroupingModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add Grouping
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300">
              <tr>
                <th className="text-left px-3 py-2">Grouping</th>
                <th className="w-24 text-right px-3 py-2">Remove</th>
              </tr>
            </thead>
            <tbody>
              {groupings.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-zinc-400" colSpan={2}>
                    No rows
                  </td>
                </tr>
              ) : (
                groupings.map((g) => (
                  <tr key={g.id} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="px-3 py-2">{g.name}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        className="p-1 rounded-md border border-zinc-200 dark:border-zinc-700"
                        onClick={() => removeGrouping(g.id)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal for adding groupings (existing) */}
      {groupingModalOpen && (
        <GroupingModal open={groupingModalOpen} onClose={() => setGroupingModalOpen(false)} />
      )}
    </div>
  );
}
