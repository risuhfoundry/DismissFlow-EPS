"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Field, DefinitionList } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { Page } from "@/components/layout/Page";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { parentSignOut } from "../actions";

type ProfileView = {
  studentName: string;
  className: string;
  admissionNo: string;
  schoolName?: string;
};

export default function ParentProfilePage() {
  const supabase = getSupabaseBrowserClient();
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [auth, setAuth] = useState<{ message: string; tone: "info" | "warning" } | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled)
            setAuth({ message: "Sign in to view your profile.", tone: "info" });
          return;
        }
        const sessionUser = await getSessionUser(supabase);
        if (!sessionUser || sessionUser.role !== "parent" || !sessionUser.linkedStudentId) {
          if (!cancelled)
            setAuth({ message: "This page is for parents.", tone: "warning" });
          return;
        }
        const { data: stu } = await supabase
          .from("students")
          .select("name, admission_no, class_id")
          .eq("student_id", sessionUser.linkedStudentId)
          .maybeSingle();
        let className = "—";
        let schoolName: string | undefined;
        if (stu?.class_id) {
          const { data: cls } = await supabase
            .from("classes")
            .select("class_name")
            .eq("class_id", stu.class_id)
            .maybeSingle();
          if (cls?.class_name) className = cls.class_name;
          // School context is optional and best-effort under RLS.
          try {
            const { data: sch } = await supabase
              .from("schools")
              .select("name")
              .limit(1)
              .maybeSingle();
            if (sch?.name) schoolName = sch.name;
          } catch {
            // optional
          }
        }
        if (cancelled) return;
        setProfile({
          studentName: stu?.name ?? "—",
          className,
          admissionNo: stu?.admission_no ?? "—",
          schoolName
        });
      } catch {
        if (!cancelled)
          setAuth({ message: "Unable to load profile.", tone: "warning" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await parentSignOut();
    } catch {
      setSigningOut(false);
    }
  }

  if (auth) {
    return (
      <Page title="Account">
        <Card>
          <CardContent className="py-8">
            <Alert tone={auth.tone}>{auth.message}</Alert>
          </CardContent>
        </Card>
      </Page>
    );
  }

  if (!profile) {
    return (
      <Page title="Account">
        <Card>
          <CardContent className="py-10">
            <div className="flex items-center justify-center">
              <Icon name="refresh" className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="Account"
      description="Your parent profile and linked child."
    >
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader
            title="Linked child"
            action={<Avatar name={profile.studentName} size="md" />}
          />
          <CardContent className="py-5">
            <p className="text-h3 font-semibold text-foreground">
              {profile.studentName}
            </p>
            <DefinitionList className="mt-4">
              <Field label="Class">{profile.className}</Field>
              <Field label="Admission no.">
                <span className="tabular-nums">{profile.admissionNo}</span>
              </Field>
            </DefinitionList>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Your account" />
          <CardContent className="py-5">
            <DefinitionList>
              <Field label="Account type">Parent</Field>
            </DefinitionList>
          </CardContent>
        </Card>

        {profile.schoolName && (
          <Card>
            <CardHeader title="School" />
            <CardContent className="py-5">
              <DefinitionList>
                <Field label="School">{profile.schoolName}</Field>
              </DefinitionList>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader title="Session" />
          <CardContent className="py-5">
            <Button
              variant="outline"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              loading={signingOut}
              leftIcon={<Icon name="logout" className="h-4 w-4" strokeWidth={2} />}
            >
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
