// Scan a single visit-report attachment with an external ClamAV REST shim and
// write the verdict back to `public.visit_report_attachments.scan_status`.
//
// Triggered fire-and-forget from `uploadVisitReportAttachment` and re-driven
// by the `retryPendingAttachmentScans` server action. Deploy with
// `supabase functions deploy scan-visit-report-attachment`.
//
// Required env vars (set on the function via `supabase secrets set`):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   CLAMAV_SCAN_URL    - HTTP(S) endpoint of a clamav-rest-style shim that
//                        accepts the file body as the request payload and
//                        returns either "OK" or "FOUND <signature>" in the
//                        body. If empty/unset the function records
//                        scan_status='skipped' and returns 200.
//   CLAMAV_SCAN_TOKEN  - Optional bearer token sent as `Authorization:
//                        Bearer <token>` to the shim.
//
// See docs/VISIT_REPORT_ATTACHMENTS_SECURITY.md for the operational playbook.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "visit-report-attachments";
const SCAN_ENGINE_DISABLED = "disabled";
const SCAN_ENGINE_CLAMAV = "clamav";

function env(key: string): string {
  return Deno.env.get(key) ?? "";
}

function getSupabaseAdmin() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
}

interface ScanRequestBody {
  attachmentId?: string;
}

interface AttachmentRow {
  id: string;
  storage_path: string;
  trip_report_id: string;
}

type ScanVerdict =
  | { kind: "clean" }
  | { kind: "infected"; signature: string }
  | { kind: "error"; message: string };

async function fetchAttachment(
  admin: ReturnType<typeof getSupabaseAdmin>,
  attachmentId: string,
): Promise<AttachmentRow | null> {
  const { data, error } = await admin
    .from("visit_report_attachments")
    .select("id, storage_path, trip_report_id")
    .eq("id", attachmentId)
    .maybeSingle();
  if (error || !data) return null;
  return data as AttachmentRow;
}

async function downloadObject(
  admin: ReturnType<typeof getSupabaseAdmin>,
  storagePath: string,
): Promise<Blob | null> {
  const { data, error } = await admin.storage.from(BUCKET).download(storagePath);
  if (error || !data) return null;
  return data;
}

async function callClamav(
  scanUrl: string,
  token: string,
  body: Blob,
): Promise<ScanVerdict> {
  try {
    const headers: Record<string, string> = {
      "content-type": "application/octet-stream",
    };
    if (token) headers["authorization"] = `Bearer ${token}`;
    const res = await fetch(scanUrl, { method: "POST", headers, body });
    const text = (await res.text()).trim();
    if (!res.ok) {
      return { kind: "error", message: `scan engine HTTP ${res.status}: ${text}` };
    }
    // Common clamav-rest output formats:
    //   "OK"
    //   "stream: OK"
    //   "FOUND Eicar-Test-Signature"
    //   "stream: Eicar-Test-Signature FOUND"
    const lower = text.toLowerCase();
    if (lower.includes("found") || lower.startsWith("found")) {
      const match = text.match(/found\s+([^\s]+)/i) ?? text.match(/:\s*(.+?)\s+found/i);
      const signature = match?.[1] ?? "unknown";
      return { kind: "infected", signature };
    }
    if (lower.includes("ok")) return { kind: "clean" };
    return { kind: "error", message: `unexpected scan output: ${text.slice(0, 200)}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { kind: "error", message };
  }
}

async function writeStatus(
  admin: ReturnType<typeof getSupabaseAdmin>,
  attachmentId: string,
  patch: {
    scan_status: "clean" | "infected" | "error" | "skipped";
    scan_engine: string;
    scan_signature?: string | null;
    scan_error?: string | null;
  },
) {
  await admin
    .from("visit_report_attachments")
    .update({
      ...patch,
      scan_status_at: new Date().toISOString(),
      scan_signature: patch.scan_signature ?? null,
      scan_error: patch.scan_error ?? null,
    })
    .eq("id", attachmentId);
}

async function quarantineObject(
  admin: ReturnType<typeof getSupabaseAdmin>,
  storagePath: string,
) {
  try {
    await admin.storage.from(BUCKET).remove([storagePath]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[scan-visit-report-attachment] failed to remove infected object", err);
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method not allowed" });
  }

  let payload: ScanRequestBody;
  try {
    payload = (await req.json()) as ScanRequestBody;
  } catch {
    return jsonResponse(400, { error: "invalid json body" });
  }

  const attachmentId = payload.attachmentId;
  if (!attachmentId) {
    return jsonResponse(400, { error: "attachmentId is required" });
  }

  const admin = getSupabaseAdmin();
  const row = await fetchAttachment(admin, attachmentId);
  if (!row) {
    return jsonResponse(404, { error: "attachment not found" });
  }

  const scanUrl = env("CLAMAV_SCAN_URL");
  if (!scanUrl) {
    await writeStatus(admin, attachmentId, {
      scan_status: "skipped",
      scan_engine: SCAN_ENGINE_DISABLED,
    });
    return jsonResponse(200, { status: "skipped" });
  }

  const blob = await downloadObject(admin, row.storage_path);
  if (!blob) {
    await writeStatus(admin, attachmentId, {
      scan_status: "error",
      scan_engine: SCAN_ENGINE_CLAMAV,
      scan_error: "failed to download object from storage",
    });
    return jsonResponse(500, { error: "download failed" });
  }

  const verdict = await callClamav(scanUrl, env("CLAMAV_SCAN_TOKEN"), blob);
  if (verdict.kind === "clean") {
    await writeStatus(admin, attachmentId, {
      scan_status: "clean",
      scan_engine: SCAN_ENGINE_CLAMAV,
    });
    return jsonResponse(200, { status: "clean" });
  }
  if (verdict.kind === "infected") {
    await writeStatus(admin, attachmentId, {
      scan_status: "infected",
      scan_engine: SCAN_ENGINE_CLAMAV,
      scan_signature: verdict.signature,
    });
    await quarantineObject(admin, row.storage_path);
    return jsonResponse(200, { status: "infected", signature: verdict.signature });
  }
  await writeStatus(admin, attachmentId, {
    scan_status: "error",
    scan_engine: SCAN_ENGINE_CLAMAV,
    scan_error: verdict.message,
  });
  return jsonResponse(500, { error: verdict.message });
});
