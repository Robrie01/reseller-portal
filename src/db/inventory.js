// src/db/inventory.js
import { supabase } from "../lib/supabaseClient";
import { uploadReceipt } from "./storage";

function toISODate(input) {
  if (!input) return null;
  const d = new Date(input);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

const platformMap = { ebay: "ebay", etsy: "etsy", vinted: "vinted", none: "none" };
function normalizePlatform(v) {
  const s = String(v || "").toLowerCase();
  return platformMap[s] || "none";
}

/** Minimal insert used by the Quick Add card */
export async function addInventoryMinimal({ title, vendor, purchase_price, quantity_on_hand }) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error("Not signed in.");

  const { error } = await supabase.from("inventory").insert({
    user_id: userId,
    title,
    vendor: vendor || null,
    purchase_price: purchase_price ? Number(purchase_price) : null,
    quantity_on_hand: quantity_on_hand ? Number(quantity_on_hand) : 1,
  });
  if (error) throw error;
}

/** Full insert for the modal, with optional receipt upload. */
export async function addInventoryFull(v) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error("Not signed in.");

  const row = {
    user_id: userId,
    title: v.title,
    vendor: v.vendor || null,
    // taxonomy IDs from TaxonomyPicker
    department_id: v.department_id || null,
    category_id: v.category_id || null,
    subcategory_id: v.subcategory_id || null,
    brand: v.brand || null,
    location: v.location || null,
    sku: v.sku || null,
    platforms_listed: normalizePlatform(v.platform),
    purchase_date: toISODate(v.purchase_date),
    purchase_price: v.purchase_price ? Number(v.purchase_price) : null,
    quantity_on_hand: v.quantity ? Number(v.quantity) : 1,
    notes: v.notes || null,
  };

  const { data: inserted, error: insErr } = await supabase
    .from("inventory")
    .insert(row)
    .select("*")
    .single();
  if (insErr) throw insErr;

  if (v.receiptFile) {
    try {
      const path = await uploadReceipt("inventory", inserted.id, v.receiptFile);
      await supabase.from("inventory").update({ receipt_path: path }).eq("id", inserted.id);
      inserted.receipt_path = path;
    } catch (e) {
      console.warn("Inventory receipt upload failed:", e?.message || e);
    }
  }

  return inserted;
}
