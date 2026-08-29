"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { TopNav } from "@/components/ui/TopNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccessNote } from "@/components/ui/AccessNote";
import { Field, DefinitionList } from "@/components/ui/Field";
import { DangerOutlineButton } from "@/components/ui/Button";
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
        let className = "—";
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
        <PageHeader eyebrow="03 / PROFILE" title="Account" />

        {authNote && (
          <div className="mt-8">
            <AccessNote message={authNote} signInHref="/login" />
          </div>
        )}

        {profile && (
          <div className="mt-8 grid gap-6">
            <Panel withTopBar topBar={<span>01 / ACCOUNT</span>}>
              <DefinitionList>
                <Field label="EMAIL">
                  <span className="font-mono text-mono-sm uppercase tracking-wider break-all">
                    {profile.email}
                  </span>
                </Field>
                <Field label="ROLE">
                  <span className="font-mono text-mono-sm uppercase tracking-wider">
                    {profile.role}
                  </span>
                </Field>
              </DefinitionList>
            </Panel>

            <Panel withTopBar topBar={<span>02 / LINKED STUDENT</span>}>
              <DefinitionList>
                <Field label="NAME">
                  <span className="font-mono text-mono-sm uppercase tracking-wider">
                    {profile.studentName}
                  </span>
                </Field>
                <Field label="CLASS">
                  <span className="font-mono text-mono-sm uppercase tracking-wider">
                    {profile.className}
                  </span>
                </Field>
                <Field label="ADMISSION NO">
                  <span className="font-mono text-mono-sm uppercase tracking-wider tabular-nums">
                    {profile.admissionNo}
                  </span>
                </Field>
              </DefinitionList>
            </Panel>

            <Panel withTopBar topBar={<span>03 / SESSION</span>}>
              <div className="p-7">
                <DangerOutlineButton
                  onClick={handleSignOut}
                  disabled={signingOut}
                  loading={signingOut}
                >
                  <Icon name="x" className="h-4 w-4" strokeWidth={2} />
                  Sign Out
                </DangerOutlineButton>
              </div>
            </Panel>
          </div>
        )}
      </main>
    </>
  );
}
