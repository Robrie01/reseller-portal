// src/components/SalePlatformModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  listSalePlatforms,
  addSalePlatform,
} from "../db/platforms";

export default function SalePlatformModal({ open, onClose, onAdded }) {
  const [loading, setLoading] = useState(false);
  const [platforms, setPlatforms] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setLoading(true);
        const list = await listSalePlatforms();
        setPlatforms(list || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const suggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return platforms;
    return platforms.filter(p => p.name.toLowerCase().includes(q));
  }, [name, platforms]);

  async function onSave() {
    setError("");
    const trimmed = name.trim();
    if (!trimmed) return setError("Platform title is required.");
    try {
      await addSalePlatform(trimmed);
      setName("");
      if (onAdded) onAdded(trimmed);
      onClose();
    } catch (e) {
      setError(e.message || "Could not add platform.");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-semibold">Add Sales Platform</h3>
          <button
            className="p-1 rounded-md hover:bg-zinc-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3">
          <label className="block text-sm font-medium mb-1" htmlFor="sp-name">
            Platform Title *
          </label>
          <input
            id="sp-name"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            placeholder="eBay, Vinted, Facebook Marketplace…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave();
              if (e.key === "Escape") onClose();
            }}
            autoFocus
          />

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="mt-3">
            <div className="text-xs text-zinc-500 mb-2">
              Existing platforms (yours first, then defaults)
            </div>
            <div className="max-h-40 overflow-auto rounded-md border border-zinc-200">
              {loading ? (
                <div className="py-6 text-center text-sm text-zinc-500">Loading…</div>
              ) : suggestions.length === 0 ? (
                <div className="py-6 text-center text-sm text-zinc-500">No matches</div>
              ) : (
                <ul className="divide-y">
                  {suggestions.map(p => (
                    <li key={p.id} className="px-3 py-2 text-sm flex items-center justify-between">
                      <span>{p.name}</span>
                      {!p.is_user_owned && (
                        <span className="text-xs text-zinc-400">(default)</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-blue-600 text-white px-3 py-2 text-sm"
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
