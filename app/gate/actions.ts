"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Server-authoritative sign-out for the gate portal. Clears the session cookie
// through the RLS-scoped server client and returns the staff member to the gate
// sign-in page. The browser never touches the session or decides where to land.
export async function gateSignOut(): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login/gate");
}
