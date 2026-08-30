"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Server-authoritative sign-out for the teacher portal. Clears the session cookie
// through the RLS-scoped server client and returns the teacher to their sign-in
// page. The browser never touches the session or decides where to land.
export async function teacherSignOut(): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login/teacher");
}
