// src/components/SalePlatformSelect.jsx
import React, { useEffect, useState } from "react";
import SalePlatformModal from "./SalePlatformModal";
import { listSalePlatforms } from "../db/platforms";

/**
 * Props:
 *  - value: string | null   (current platform name e.g. "eBay")
 *  - onChange: (name: string|null) => void
 *  - allowNone?: boolean    (default true -> shows "No Sale Platform")
 *  - className?: string     (optional styling)
 */
export default function SalePlatformSelect({
  value,
  onChange,
  allowNone = true,
  className = "",
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const rows = await listSalePlatforms();
      // rows already ordered: mine first then defaults
      setOptions(rows.map((r) => r.name));
    } catch (e) {
      console.error("Failed to load sale platforms", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleChange(e) {
    const v = e.target.value;
    if (v === "__ADD__") {
      setModalOpen(true);
      return;
    }
    if (v === "__NONE__") {
      onChange?.(null);
      return;
    }
    onChange?.(v);
  }

  return (
    <>
      <select
        className={`w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm ${className}`}
        value={
          value == null
            ? "__NONE__"
            : options.includes(value)
            ? value
            : value // unknown custom text still shows
        }
        onChange={handleChange}
        disabled={loading}
      >
        {allowNone && <option value="__NONE__">No Sale Platform</option>}

        {options.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}

        <option value="__ADD__">Add Sales Platform…</option>
      </select>

      {modalOpen && (
        <SalePlatformModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onAdded={async (addedName) => {
            await load();
            // auto-select the newly added platform
            onChange?.(addedName || null);
          }}
        />
      )}
    </>
  );
}
