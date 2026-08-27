"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { TopNav } from "@/components/ui/TopNav";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { label: "Dashboard", href: "/parent" },
  { label: "History", href: "/parent/history" },
  { label: "Profile", href: "/parent/profile" }
];

type ProfileView = {
  email: string;
  role: string;
  studentName: string;
  className: string;
  admissionNo: string;
};

export default function ParentProfilePage() {
  const supabase = getSupabaseBrowserClient();
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [authNote, setAuthNote] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) {
          setAuthNote("Sign in to view your profile.");
          return;
        }
        const sessionUser = await getSessionUser(supabase);
        if (!sessionUser || sessionUser.role !== "parent" || !sessionUser.linkedStudentId) {
          setAuthNote("This page is for parents only.");
          return;
        }
        const { data: stu } = await supabase
          .from("students")
          .select("name, admission_no, class_id")
          .eq("student_id", sessionUser.linkedStudentId)
          .maybeSingle();
        let className = "Tulip";
        if (stu?.class_id) {
          const { data: cls } = await supabase
            .from("classes")
            .select("class_name")
            .eq("class_id", stu.class_id)
            .maybeSingle();
          if (cls?.class_name) className = cls.class_name;
        }
        if (cancelled) return;
        setProfile({
          email: user.email ?? "—",
          role: sessionUser.role,
          studentName: stu?.name ?? "—",
          className,
          admissionNo: stu?.admission_no ?? "—"
        });
      } catch {
        if (!cancelled) setAuthNote("Unable to load profile.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      window.location.href = "/login";
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      <TopNav
        links={NAV_LINKS}
        trailing={
          <Link
            href="/parent"
            className="font-mono uppercase tracking-widest text-mono-xs text-muted hover:text-bone transition-colors"
          >
            ← Back to dashboard
          </Link>
        }
      />

      <main className="pt-24 pb-16 section-shell max-w-2xl">
        <span className="eyebrow">
          <i />
          03 / PROFILE
        </span>
        <h2 className="font-display text-display-md uppercase text-bone mt-4">
          Account
        </h2>

        {authNote && (
          <div className="mt-8">
            <Panel withTopBar topBar={<span>00 / ACCESS</span>}>
              <div className="p-7 font-mono text-mono-sm uppercase tracking-widest text-muted">
                {authNote}
              </div>
            </Panel>
          </div>
        )}

        {profile && (
          <div className="mt-10 grid gap-6">
            <Panel withTopBar topBar={<span>01 / ACCOUNT</span>}>
              <dl className="p-7 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-y-4 gap-x-6 font-mono">
                <MonoLabel size="xs" tone="muted">EMAIL</MonoLabel>
                <span className="text-mono-sm text-bone uppercase tracking-wider break-all">
                  {profile.email}
                </span>
                <MonoLabel size="xs" tone="muted">ROLE</MonoLabel>
                <span className="text-mono-sm text-bone uppercase tracking-wider">
                  {profile.role}
                </span>
              </dl>
            </Panel>

            <Panel withTopBar topBar={<span>02 / LINKED STUDENT</span>}>
              <dl className="p-7 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-y-4 gap-x-6 font-mono">
                <MonoLabel size="xs" tone="muted">NAME</MonoLabel>
                <span className="text-mono-sm text-bone uppercase tracking-wider">
                  {profile.studentName}
                </span>
                <MonoLabel size="xs" tone="muted">CLASS</MonoLabel>
                <span className="text-mono-sm text-bone uppercase tracking-wider">
                  {profile.className}
                </span>
                <MonoLabel size="xs" tone="muted">ADMISSION NO</MonoLabel>
                <span className="text-mono-sm text-bone uppercase tracking-wider tabular-nums">
                  {profile.admissionNo}
                </span>
              </dl>
            </Panel>

            <Panel withTopBar topBar={<span>03 / SESSION</span>}>
              <div className="p-7">
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="h-12 px-5 inline-flex items-center gap-3 hairline text-bone hover:text-danger hover:border-danger font-mono uppercase tracking-widest text-mono-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {signingOut ? (
                    <>
                      <Icon name="timer" className="h-4 w-4" strokeWidth={2} />
                      Signing out…
                    </>
                  ) : (
                    <>
                      <Icon name="x" className="h-4 w-4" strokeWidth={2} />
                      Sign Out
                    </>
                  )}
                </button>
              </div>
            </Panel>
          </div>
        )}
      </main>
    </>
  );
}
