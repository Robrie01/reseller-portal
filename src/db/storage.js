// src/db/storage.js
import { supabase } from "../lib/supabaseClient";

const BUCKET = "receipts";

/** Build: <userId>/<kind>/<recordId>/<original-or-random-name> */
function makePath(kind, userId, recordId, filename) {
  const safeKind = ["inventory", "sales", "expenses"].includes(kind) ? kind : "misc";
  const fn =
    (filename && String(filename).trim()) ||
    `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `${userId}/${safeKind}/${recordId}/${fn}`;
}

/**
 * Upload a receipt and return the STORAGE KEY (plain string).
 * Automatically reads the current user id.
 */
export async function uploadReceipt(kind, recordId, file) {
  if (!file) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error("Not signed in.");

  const path = makePath(kind, userId, recordId, file.name);

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;

  return path; // <- IMPORTANT: plain string
}

/** Create a temporary URL to view a stored receipt. */
export async function getReceiptURL(path, expiresIn = 60 * 60) {
  if (!path || typeof path !== "string") return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl || null;
}

export async function deleteReceipt(path) {
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
}
