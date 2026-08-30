"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { DismissalStatus } from "@/lib/dismissal/state";

// Thin client-side wrapper around the four Edge Functions. The browser sends
// ONLY { token } (scan) or { request_id } (decision / cancel); everything else
// is derived server-side. The helper functions keep the call sites short and
// surface structured errors that the UI can branch on.

export type InvokeError = {
  code?: string;
  message: string;
  status?: number;
};

// functions.invoke throws FunctionsHttpError whose `context` is the raw Response
// object. The structured { error: { code, message } } body lives on that Response
// and must be read asynchronously — it is NOT present as a plain field on the
// error, so a naive JSON.parse(error.message) drops every machine-readable code.
// We read context.json() first, then fall back to parsing error.message, then to
// the HTTP status so the UI always gets the best available signal.
async function parseError(raw: unknown, fallbackStatus?: number): Promise<InvokeError> {
  const e = raw as {
    code?: string | number;
    message?: string;
    status?: number;
    context?: Response & { status?: number };
  } | null;
  let code: string | undefined;
  let message: string | undefined = e?.message;
  try {
    const ctx = e?.context as unknown as Response | undefined;
    if (ctx && typeof (ctx as Response).json === "function") {
      const body = await (ctx as Response).json();
      const inner = body?.error ?? body;
      if (inner?.code) code = String(inner.code);
      if (inner?.message) message = inner.message;
    }
  } catch {
    /* fall back to message / status below */
  }
  if (!code && message) {
    try {
      const parsed = JSON.parse(message);
      code = parsed?.error?.code ?? parsed?.code ?? code;
    } catch {
      /* ignore */
    }
  }
  return {
    code: code ?? (typeof e?.code === "string" ? e.code : undefined),
    message: message ?? "Request failed",
    status: (e?.context as Response | undefined)?.status ?? e?.status ?? fallbackStatus
  };
}

export async function createDismissalRequest() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.functions.invoke<{
    request_id: string;
    token: string;
    expires_at: string;
  }>("create-dismissal-request", { method: "POST", body: {} });
  if (error) throw await parseError(error);
  return data!;
}

export async function cancelDismissal(requestId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.functions.invoke<{
    success: true;
    status: DismissalStatus;
    request_id: string;
    student_id: string;
  }>("cancel-dismissal", { method: "POST", body: { request_id: requestId } });
  if (error) throw await parseError(error);
  return data!;
}

export type ScanResult =
  | {
      valid: true;
      status: "AWAITING_TEACHER";
      student: { name: string; class: string };
    }
  | {
      valid: false;
      code: string;
      message: string;
    };

export async function scanQr(token: string): Promise<ScanResult> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.functions.invoke<unknown>(
    "scan-qr",
    { method: "POST", body: { token } }
  );
  if (error) {
    const e = await parseError(error);
    return { valid: false, code: e.code ?? "INTERNAL_ERROR", message: e.message };
  }
  return data as ScanResult;
}

export async function approveDismissal(requestId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.functions.invoke<{
    success: true;
    status: "DISMISSED";
    request_id: string;
    student_id: string;
  }>("approve-dismissal", { method: "POST", body: { request_id: requestId } });
  if (error) throw await parseError(error);
  return data!;
}

export async function rejectDismissal(requestId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.functions.invoke<{
    success: true;
    status: "REJECTED";
    request_id: string;
    student_id: string;
  }>("reject-dismissal", { method: "POST", body: { request_id: requestId } });
  if (error) throw await parseError(error);
  return data!;
}

// Phase 17 — real identity lifecycle. Delegates to the manage-identity Edge
// Function (service role). The browser only sends the action + target; role,
// school, student, and class are derived server-side and confined to the caller's
// own school. Returns the one-time plaintext_password on create/reset.
export type IdentityResult = {
  ok: boolean;
  plaintext_password?: string;
  [key: string]: unknown;
};

export async function manageIdentity(
  action: string,
  body: Record<string, unknown>
): Promise<IdentityResult> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.functions.invoke<IdentityResult>(
    "manage-identity",
    { method: "POST", body: { action, ...body } }
  );
  if (error) throw await parseError(error);
  return data!;
}
