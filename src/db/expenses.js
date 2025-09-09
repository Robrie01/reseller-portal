// src/db/expenses.js
import { supabase } from "../lib/supabaseClient";
import { uploadReceipt } from "./storage";

/** Friendly labels shown in UI */
export const GL_OPTIONS = [
  "Bank Fees",
  "Car Expenses",
  "Cell Phone",
  "Contract Work",
  "Donations",
  "Equipment",
  "Internet",
  "Inventory Purchases",
  "Listing/Platform Fees",
  "Non-Sourcing Mileage/Transportation",
  "Office Supplies",
  "Rent",
  "Shipping Fees",
  "Shipping Supplies",
  "Sourcing Mileage/Transportation",
  "Subscriptions/Dues",
  "Travel",
  "Utilities",
  // keep a few basic fallbacks from your old list
  "Postage",
  "Fees",
  "Supplies",
  "Other",
];

/** Map friendly UI label -> your Postgres enum `gl_account` */
export function mapGLAccount(input) {
  const v = String(input || "").trim().toLowerCase();

  // coarse mapping into your enum: postage | fees | supplies | travel | other
  if (v.includes("postage") || v.includes("shipping")) return "Postage";
  if (v.includes("fee") || v.includes("listing")) return "Fees";
  if (v.includes("office") || v.includes("suppl")) return "Supplies";
  if (v.includes("travel") || v.includes("mileage") || v.includes("transport")) return "Travel";

  // explicit basics
  if (v === "postage") return "Postage";
  if (v === "fees") return "Fees";
  if (v === "supplies") return "Supplies";
  if (v === "travel") return "Travel";

  return "Other";
}

/** Normalize many date inputs to YYYY-MM-DD (or null) */
function toISODate(s) {
  if (!s) return null;
  const str = String(s).trim();
  if (!str) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);       // dd/mm/yyyy
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;         // yyyy-mm-dd
  const d = new Date(str);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

/** Insert one expense + optional receipt upload */
export async function addExpense(values) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error("Not signed in.");

  const uiLabel = values.gl_account_label || values.gl_account || "Other";
  const gl_enum = mapGLAccount(uiLabel);

  // if UI label doesn't map cleanly, keep label in description so it's visible later
  const description =
    !["postage", "fees", "supplies", "travel", "other"].includes(uiLabel.toLowerCase())
      ? `${values.description || ""} [GL: ${uiLabel}]`.trim()
      : values.description || null;

  const insert = {
    gl_account: gl_enum,                // ← the enum column
    vendor: values.vendor || null,
    description,
    amount: values.amount ? Number(values.amount) : null,
    date: toISODate(values.date),
    bank_account: values.bank_account || null,
    linked_sale: values.linked_sale || null, // uuid or null
  };

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert(insert)
    .select("*")
    .single();

  if (error) throw new Error(error.message || "Failed to save expense");

  if (values.receiptFile) {
    try {
      const { path } = await uploadReceipt("expenses", expense.id, values.receiptFile, userId);
      await supabase.from("expenses").update({ receipt_path: path }).eq("id", expense.id);
      expense.receipt_path = path;
    } catch (e) {
      console.warn("Expense receipt upload failed:", e?.message || e);
    }
  }

  return expense;
}
