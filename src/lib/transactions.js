// src/lib/transactions.js
import { supabase } from "./supabaseClient";

/**
 * Fetch unified transactions from the `transactions_feed` view.
 * @param {Object} opts
 * @param {string} opts.start - ISO date (YYYY-MM-DD) inclusive
 * @param {string} opts.end   - ISO date (YYYY-MM-DD) inclusive
 * @param {"all"|"inventory"|"sale"|"expense"|"refund"|"other"} [opts.kind="all"]
 * @param {number} [opts.limit=1000]
 * @param {boolean} [opts.asc=false] - order by date ascending (default newest first)
 */
export async function getTransactions({
  start,
  end,
  kind = "all",
  limit = 1000,
  asc = false,
}) {
  let q = supabase
    .from("transactions_feed")
    .select(
      "id, source_table, txn_type, txn_date, amount, description, vendor, bank_account, platform, gl_account, related_id, created_at"
    )
    .gte("txn_date", start)
    .lte("txn_date", end)
    .order("txn_date", { ascending: asc })
    .limit(limit);

  if (kind !== "all") q = q.eq("txn_type", kind);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}
