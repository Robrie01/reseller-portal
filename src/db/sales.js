// src/db/sales.js
import { supabase } from "../lib/supabaseClient";
import { uploadReceipt } from "./storage";

function mapPlatform(val) {
  const v = String(val || "").trim().toLowerCase();
  if (!v || v === "no sale platform" || v === "none" || v === "no platform") return "none";
  if (v === "ebay") return "ebay";
  if (v === "etsy") return "etsy";
  if (v === "vinted") return "vinted";
  return "other";
}

function toISODate(input) {
  if (!input) return null;
  if (input instanceof Date && !isNaN(input)) return input.toISOString().slice(0, 10);
  const s = String(input).trim();
  if (!s) return null;
  const m1 = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

/** Insert sale + optional receipt upload. */
export async function addSale(values) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error("Not signed in.");

  const insert = {
    item_sold: values.item || "",
    sale_price: Number(values.sale_price || 0),
    shipping_cost: Number(values.shipping_cost || 0),
    transaction_fees: Number(values.fees || 0),
    platform: mapPlatform(values.platform),
    sale_date: toISODate(values.sale_date),
    purchase_price: Number(values.buy_price || 0),
    purchase_date: toISODate(values.buy_date) ?? null,
    inventory_id: values.inventory_id || null,
    notes: values.notes ? String(values.notes) : null,
    user_id: userId,
  };

  const { data: sale, error } = await supabase
    .from("sales")
    .insert(insert)
    .select("*")
    .single();
  if (error) throw new Error(error.message || "Failed to save sale");

  if (values.receiptFile) {
    try {
      const path = await uploadReceipt("sales", sale.id, values.receiptFile);
      await supabase.from("sales").update({ receipt_path: path }).eq("id", sale.id);
      sale.receipt_path = path;
    } catch (e) {
      console.warn("Sales receipt upload failed:", e?.message || e);
    }
  }

  // If linked to inventory, decrement quantity
  if (insert.inventory_id) {
    const { data: invRow, error: selErr } = await supabase
      .from("inventory")
      .select("quantity_on_hand")
      .eq("id", insert.inventory_id)
      .eq("user_id", userId)
      .single();
    if (!selErr && invRow) {
      const newQty = Math.max(0, Number(invRow.quantity_on_hand || 0) - 1);
      const { error: updErr } = await supabase
        .from("inventory")
        .update({ quantity_on_hand: newQty })
        .eq("id", insert.inventory_id)
        .eq("user_id", userId);
      if (updErr) console.warn("Inventory decrement failed:", updErr.message);
    }
  }

  return sale;
}
