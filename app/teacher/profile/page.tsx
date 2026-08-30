"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Field, DefinitionList } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { Page } from "@/components/layout/Page";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { teacherSignOut } from "../actions";

type ProfileView = {
  staffId: string;
  className: string;
  section: string;
  schoolName?: string;
};

type Access = {
  tone: "info" | "warning";
  message: string;
  cta: "signin" | "home";
};

export default function TeacherProfilePage() {
  const supabase = getSupabaseBrowserClient();
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [access, setAccess] = useState<Access | null>(null);
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
            setAccess({
              tone: "info",
              message: "Sign in to view your profile.",
              cta: "signin"
            });
          return;
        }
        const sessionUser = await getSessionUser(supabase);
        if (!sessionUser || sessionUser.role !== "teacher") {
          if (!cancelled)
            setAccess({
              tone: "warning",
              message: "This page is for teachers.",
              cta: "home"
            });
          return;
        }

        const staffId = sessionUser.loginId || "—";
        let className = "—";
        let section = "";
        let schoolName: string | undefined;

        if (sessionUser.assignedClassId) {
          const { data: cls } = await supabase
            .from("classes")
            .select("class_name, section, school_id")
            .eq("class_id", sessionUser.assignedClassId)
            .maybeSingle();
          if (cls) {
            className = cls.class_name ?? "—";
            section = cls.section ?? "";
            if (cls.school_id) {
              const { data: sch } = await supabase
                .from("schools")
                .select("name")
                .eq("school_id", cls.school_id)
                .maybeSingle();
              if (sch?.name) schoolName = sch.name;
            }
          }
        }

        if (cancelled) return;
        setProfile({ staffId, className, section, schoolName });
      } catch {
        if (!cancelled)
          setAccess({
            tone: "warning",
            message: "Unable to load profile.",
            cta: "home"
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await teacherSignOut();
    } catch {
      setSigningOut(false);
    }
  }

  if (access) {
    const href = access.cta === "signin" ? "/login/teacher" : "/";
    const cta = access.cta === "signin" ? "Sign in" : "Back to home";
    return (
      <Page title="Account">
        <Card>
          <CardContent className="flex flex-col gap-4 py-8">
            <Alert tone={access.tone}>{access.message}</Alert>
            <div>
              <a href={href}>
                <Button variant={access.cta === "signin" ? "primary" : "outline"}>
                  {cta}
                </Button>
              </a>
            </div>
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
              <Icon
                name="refresh"
                className="h-5 w-5 animate-spin text-muted-foreground"
              />
            </div>
          </CardContent>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Account" description="Your teacher profile and assigned class.">
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader
            title="Your role"
            action={<Avatar name={profile.staffId} size="md" />}
          />
          <CardContent className="py-5">
            <DefinitionList>
              <Field label="Staff ID">
                <span className="tabular-nums">{profile.staffId}</span>
              </Field>
              <Field label="Account type">Teacher</Field>
            </DefinitionList>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Assigned class" />
          <CardContent className="py-5">
            <DefinitionList>
              <Field label="Class">
                {profile.section
                  ? `${profile.className} · ${profile.section}`
                  : profile.className}
              </Field>
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
              leftIcon={
                <Icon name="logout" className="h-4 w-4" strokeWidth={2} />
              }
            >
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
