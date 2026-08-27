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

function parseError(raw: unknown, fallbackStatus?: number): InvokeError {
  const e = raw as {
    code?: string | number;
    message?: string;
    status?: number;
    context?: { status?: number };
  } | null;
  let code: string | undefined;
  try {
    if (e?.message) {
      const parsed = JSON.parse(e.message);
      code = parsed?.code ?? parsed?.error?.code;
    }
  } catch {
    /* ignore */
  }
  return {
    code: code ?? (typeof e?.code === "string" ? e.code : undefined),
    message: e?.message ?? "Request failed",
    status: e?.context?.status ?? e?.status ?? fallbackStatus
  };
}

export async function createDismissalRequest() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.functions.invoke<{
    request_id: string;
    token: string;
    expires_at: string;
  }>("create-dismissal-request", { method: "POST", body: {} });
  if (error) throw parseError(error);
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
  if (error) throw parseError(error);
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
    const e = parseError(error);
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
  if (error) throw parseError(error);
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
  if (error) throw parseError(error);
  return data!;
}
