"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Field, DefinitionList } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { Page } from "@/components/layout/Page";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { gateSignOut } from "../actions";

type ProfileView = {
  staffId: string;
  schoolName?: string;
};

type Access = {
  message: string;
  tone: "info" | "warning";
};

export default function GateProfilePage() {
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
            setAccess({ message: "Sign in to view your profile.", tone: "info" });
          return;
        }
        const sessionUser = await getSessionUser(supabase);
        if (!sessionUser || sessionUser.role !== "gate") {
          if (!cancelled)
            setAccess({ message: "This page is for gate staff.", tone: "warning" });
          return;
        }

        const staffId = sessionUser.loginId || "—";
        let schoolName: string | undefined;
        try {
          const { data: me } = await supabase
            .from("users")
            .select("school_id")
            .eq("id", sessionUser.userId)
            .maybeSingle();
          if (me?.school_id) {
            const { data: sch } = await supabase
              .from("schools")
              .select("name")
              .eq("school_id", me.school_id)
              .maybeSingle();
            if (sch?.name) schoolName = sch.name;
          }
        } catch {
          // School context is optional and best-effort under RLS.
        }

        if (cancelled) return;
        setProfile({ staffId, schoolName });
      } catch {
        if (!cancelled)
          setAccess({ message: "Unable to load profile.", tone: "warning" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await gateSignOut();
    } catch {
      setSigningOut(false);
    }
  }

  if (access) {
    return (
      <Page title="Account">
        <Card>
          <CardContent className="py-8">
            <Alert tone={access.tone}>{access.message}</Alert>
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
    <Page title="Account" description="Your gate staff profile and school.">
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
              <Field label="Account type">Gate staff</Field>
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
