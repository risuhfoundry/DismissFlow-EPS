import type { SupabaseClient } from "@supabase/supabase-js";

export type Role = "parent" | "teacher" | "gate" | "admin";

export type SessionUser = {
  userId: string;
  role: Role;
  loginId: string;
  linkedStudentId?: string;
  assignedClassId?: string;
};

export function isParent(u: SessionUser | null | undefined): u is SessionUser {
  return !!u && u.role === "parent";
}

export function isTeacher(u: SessionUser | null | undefined): u is SessionUser {
  return !!u && u.role === "teacher";
}

export function isGate(u: SessionUser | null | undefined): u is SessionUser {
  return !!u && u.role === "gate";
}

export function isAdmin(u: SessionUser | null | undefined): u is SessionUser {
  return !!u && u.role === "admin";
}

// Resolves the authenticated Supabase user to the application profile.
// Takes an already-constructed Supabase client so this module stays free of
// server-only imports (safe to reference from any context, including the
// existing client portal which imports only the `isParent`/type exports).
// Authorization is enforced by RLS; this only materializes the role scopes.
export async function getSessionUser(
  supabase: SupabaseClient
): Promise<SessionUser | null> {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("user_id, role, login_id, linked_student_id, assigned_class_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    userId: data.user_id as string,
    role: data.role as Role,
    loginId: (data.login_id as string) ?? "",
    linkedStudentId: (data.linked_student_id as string) ?? undefined,
    assignedClassId: (data.assigned_class_id as string) ?? undefined
  };
}
