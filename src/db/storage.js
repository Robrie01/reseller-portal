// src/db/storage.js
import { supabase } from "../lib/supabaseClient";

const PRIMARY_BUCKET = "receipts";
const LEGACY_BUCKETS = ["receipts-inventory", "receipts-sales", "receipts-expenses"];

function makePath(kind, userId, recordId, filename) {
  const safeKind = ["inventory", "sales", "expenses"].includes(kind) ? kind : "misc";
  const base = `${userId}/${safeKind}/${recordId}`;
  const name =
    (filename && filename.trim()) ||
    `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `${base}/${name}`;
}

export async function uploadReceipt(kind, recordId, file, userId) {
  if (!file) return { path: null };
  const path = makePath(kind, userId, recordId, file.name);

  const { error } = await supabase.storage
    .from(PRIMARY_BUCKET)
    .upload(path, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
    });
  if (error) throw error;

  return { path };
}

async function trySignedUrl(bucket, path, expiresIn) {
  return supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
}

export async function getReceiptURL(path, expiresIn = 60 * 60) {
  if (!path) return null;

  // 1) Try the new unified bucket
  let { data, error } = await trySignedUrl(PRIMARY_BUCKET, path, expiresIn);
  if (data?.signedUrl) return data.signedUrl;

  // 2) Fall back to legacy buckets
  for (const b of LEGACY_BUCKETS) {
    ({ data, error } = await trySignedUrl(b, path, expiresIn));
    if (data?.signedUrl) return data.signedUrl;
  }

  // If still nothing, surface the last error
  if (error) throw error;
  return null;
}

export async function deleteReceipt(path) {
  if (!path) return;

  // Best-effort delete from all buckets
  await supabase.storage.from(PRIMARY_BUCKET).remove([path]).catch(() => {});
  for (const b of LEGACY_BUCKETS) {
    await supabase.storage.from(b).remove([path]).catch(() => {});
  }
}
