// DismissFlow EPS — manage-identity Edge Function (real identity lifecycle).
//
// Phase 17 delivers the per-person identity lifecycle that Phase 16 flagged as a
// blocker (B3). It is the ONLY place identities are created / reset / activated /
// deactivated / linked / unlinked / assigned / unassigned. The browser never
// supplies role, school, student, or class — all of those are derived server-side
// and constrained to the calling admin's own school (per-school admin, per 0017).
//
// Trust boundary: trusted Edge Function runtime, service-role key used ONLY here
// (never in the browser). Every mutation enforces target.school_id ===
// caller.school_id before writing, so an admin in one school cannot touch another
// school's identities.
//
// Passwords are NEVER returned, logged, or exposed. On CREATE / RESET the
// password is set to the person's login_id per the product requirement; the
// plaintext is only ever shown once to the admin who performs the action (in the
// response body) and should be relayed out-of-band to the real person.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Per-person login_id → Supabase Auth email mapping. MUST match
// lib/auth/role-login.ts:loginIdToEmail in the frontend EXACTLY. Inlined here so
// the function is self-contained for deployment (no cross-function import). The
// domain is configuration, read from the same env var the frontend uses.
function loginIdToEmail(loginId: string): string {
  const domain =
    Deno.env.get("AUTH_EMAIL_DOMAIN") ??
    Deno.env.get("NEXT_PUBLIC_DEMO_EMAIL_DOMAIN") ??
    "demo.dismissflow";
  return `${loginId.trim().toLowerCase()}@${domain}`;
}

const ALLOWED_ROLES = ["parent", "teacher", "gate", "admin"] as const;
type Role = (typeof ALLOWED_ROLES)[number];

function corsHeaders(origin?: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin && origin.length > 0 ? origin : "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, x-supabase-client, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400"
  };
}

function json(body: unknown, status: number, origin?: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...corsHeaders(origin)
    }
  });
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  origin?: string | null
): Response {
  return json({ error: { code, message } }, status, origin);
}

interface Body {
  action?: string;
  target_user_id?: string;
  role?: string;
  login_id?: string;
  student_id?: string;
  class_id?: string;
  new_password?: string;
}

serve(async (req: Request) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405, origin);
  }

  // 1. Authenticate + authorize the caller as an admin.
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser(jwt);

  if (authError || !user) {
    return errorResponse("UNAUTHENTICATED", "Authentication required.", 401, origin);
  }

  const { data: caller, error: cErr } = await supabase
    .from("users")
    .select("user_id, role, school_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (cErr || !caller) {
    return errorResponse("FORBIDDEN", "No application profile.", 403, origin);
  }
  if (caller.role !== "admin") {
    return errorResponse("ADMIN_REQUIRED", "Admin role required.", 403, origin);
  }
  const adminSchool = caller.school_id;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return errorResponse("BAD_JSON", "Invalid request body.", 400, origin);
  }

  const action = body.action;

  // Helper: load a target identity and assert it belongs to the admin's school.
  async function loadTarget(targetId: string | undefined) {
    if (!targetId) {
      return { error: errorResponse("MISSING_TARGET", "target_user_id is required.", 400, origin) };
    }
    const { data: t, error: tErr } = await supabase
      .from("users")
      .select("user_id, role, login_id, linked_student_id, assigned_class_id, school_id, credential_status")
      .eq("user_id", targetId)
      .maybeSingle();
    if (tErr || !t) {
      return { error: errorResponse("TARGET_NOT_FOUND", "Target identity not found.", 404, origin) };
    }
    if (t.school_id !== adminSchool) {
      return { error: errorResponse("SCHOOL_FORBIDDEN", "Target is outside your school.", 403, origin) };
    }
    return { target: t };
  }

  switch (action) {
    // ----------------------------------------------------------------- CREATE
    case "create": {
      const role = body.role as Role;
      const loginId = (body.login_id ?? "").trim();
      if (!ALLOWED_ROLES.includes(role)) {
        return errorResponse("BAD_ROLE", "Invalid role.", 400, origin);
      }
      if (!loginId) {
        return errorResponse("BAD_LOGIN_ID", "login_id is required.", 400, origin);
      }
      // Globally-unique login_id (also enforced by a unique index).
      const { data: clash } = await supabase
        .from("users")
        .select("user_id")
        .eq("login_id", loginId)
        .maybeSingle();
      if (clash) {
        return errorResponse("LOGIN_ID_TAKEN", "That login ID is already in use.", 409, origin);
      }

      const insert: Record<string, unknown> = {
        role,
        login_id: loginId,
        school_id: adminSchool,
        credential_status: "active"
      };

      if (role === "parent") {
        if (!body.student_id) {
          return errorResponse("BAD_STUDENT", "parent requires student_id.", 400, origin);
        }
        const { data: stu } = await supabase
          .from("students")
          .select("student_id, school_id")
          .eq("student_id", body.student_id)
          .maybeSingle();
        if (!stu || stu.school_id !== adminSchool) {
          return errorResponse("STUDENT_FORBIDDEN", "Student is outside your school.", 403, origin);
        }
        insert.linked_student_id = body.student_id;
      } else if (role === "teacher") {
        if (body.class_id) {
          const { data: cls } = await supabase
            .from("classes")
            .select("class_id, school_id")
            .eq("class_id", body.class_id)
            .maybeSingle();
          if (!cls || cls.school_id !== adminSchool) {
            return errorResponse("CLASS_FORBIDDEN", "Class is outside your school.", 403, origin);
          }
          insert.assigned_class_id = body.class_id;
        }
      }

      const email = loginIdToEmail(loginId);
      const { data: newAuth, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: loginId,
        email_confirm: true,
        user_metadata: { role, login_id: loginId }
      });
      if (createErr || !newAuth.user) {
        return errorResponse("CREATE_AUTH_FAILED", createErr?.message ?? "Auth user creation failed.", 500, origin);
      }

      const { data: created, error: insErr } = await supabase
        .from("users")
        .insert({ ...insert, user_id: newAuth.user.id })
        .select("user_id, role, login_id, linked_student_id, assigned_class_id")
        .single();

      if (insErr) {
        // Best-effort rollback of the orphaned auth user.
        await supabase.auth.admin.deleteUser(newAuth.user.id);
        return errorResponse("CREATE_PROFILE_FAILED", insErr.message, 500, origin);
      }

      // The plaintext password is shown exactly once, to the performing admin.
      return json({ ok: true, user: created, plaintext_password: loginId }, 201, origin);
    }

    // ------------------------------------------------------------------ RESET
    case "reset": {
      const { target, error } = await loadTarget(body.target_user_id);
      if (error) return error;
      const newPassword = body.new_password?.trim() || target.login_id;
      if (!newPassword) {
        return errorResponse("NO_LOGIN_ID", "Target has no login_id to reset to.", 400, origin);
      }
      const { error: updErr } = await supabase.auth.admin.updateUserById(target.user_id, {
        password: newPassword
      });
      if (updErr) {
        return errorResponse("RESET_FAILED", updErr.message, 500, origin);
      }
      return json({ ok: true, plaintext_password: newPassword }, 200, origin);
    }

    // -------------------------------------------------------------- ACTIVATE
    case "activate": {
      const { target, error } = await loadTarget(body.target_user_id);
      if (error) return error;
      await supabase.from("users").update({ credential_status: "active" }).eq("user_id", target.user_id);
      await supabase.auth.admin.updateUserById(target.user_id, { ban_duration: "none" });
      return json({ ok: true, credential_status: "active" }, 200, origin);
    }

    // ------------------------------------------------------------ DEACTIVATE
    case "deactivate": {
      const { target, error } = await loadTarget(body.target_user_id);
      if (error) return error;
      await supabase.from("users").update({ credential_status: "inactive" }).eq("user_id", target.user_id);
      // 10-year ban effectively disables sign-in without deleting the account.
      await supabase.auth.admin.updateUserById(target.user_id, { ban_duration: "87600h" });
      return json({ ok: true, credential_status: "inactive" }, 200, origin);
    }

    // ------------------------------------------------------------------- LINK
    case "link": {
      const { target, error } = await loadTarget(body.target_user_id);
      if (error) return error;
      if (target.role !== "parent") {
        return errorResponse("NOT_PARENT", "Only parents can be linked to a student.", 400, origin);
      }
      if (!body.student_id) {
        return errorResponse("BAD_STUDENT", "student_id is required.", 400, origin);
      }
      const { data: stu } = await supabase
        .from("students")
        .select("student_id, school_id")
        .eq("student_id", body.student_id)
        .maybeSingle();
      if (!stu || stu.school_id !== adminSchool) {
        return errorResponse("STUDENT_FORBIDDEN", "Student is outside your school.", 403, origin);
      }
      await supabase.from("users").update({ linked_student_id: body.student_id }).eq("user_id", target.user_id);
      return json({ ok: true, linked_student_id: body.student_id }, 200, origin);
    }

    // ----------------------------------------------------------------- UNLINK
    case "unlink": {
      const { target, error } = await loadTarget(body.target_user_id);
      if (error) return error;
      if (target.role !== "parent") {
        return errorResponse("NOT_PARENT", "Only parents can be unlinked.", 400, origin);
      }
      await supabase.from("users").update({ linked_student_id: null }).eq("user_id", target.user_id);
      return json({ ok: true, linked_student_id: null }, 200, origin);
    }

    // ----------------------------------------------------------------- ASSIGN
    case "assign": {
      const { target, error } = await loadTarget(body.target_user_id);
      if (error) return error;
      if (target.role !== "teacher") {
        return errorResponse("NOT_TEACHER", "Only teachers can be assigned a class.", 400, origin);
      }
      if (!body.class_id) {
        return errorResponse("BAD_CLASS", "class_id is required.", 400, origin);
      }
      const { data: cls } = await supabase
        .from("classes")
        .select("class_id, school_id")
        .eq("class_id", body.class_id)
        .maybeSingle();
      if (!cls || cls.school_id !== adminSchool) {
        return errorResponse("CLASS_FORBIDDEN", "Class is outside your school.", 403, origin);
      }
      await supabase.from("users").update({ assigned_class_id: body.class_id }).eq("user_id", target.user_id);
      return json({ ok: true, assigned_class_id: body.class_id }, 200, origin);
    }

    // --------------------------------------------------------------- UNASSIGN
    case "unassign": {
      const { target, error } = await loadTarget(body.target_user_id);
      if (error) return error;
      if (target.role !== "teacher") {
        return errorResponse("NOT_TEACHER", "Only teachers can be unassigned.", 400, origin);
      }
      await supabase.from("users").update({ assigned_class_id: null }).eq("user_id", target.user_id);
      return json({ ok: true, assigned_class_id: null }, 200, origin);
    }

    default:
      return errorResponse("BAD_ACTION", `Unknown action: ${action ?? "(none)"}`, 400, origin);
  }
});
