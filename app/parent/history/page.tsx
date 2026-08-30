"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { Page } from "@/components/layout/Page";
import { EmptyState, LoadingState } from "@/components/ui/StateBlock";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { dismissalStatusMeta } from "@/lib/dismissal/status-meta";
import type { DismissalStatus } from "@/lib/dismissal/state";

type HistoryRow = {
  request_id: string;
  status: DismissalStatus;
  created_at: string;
  updated_at: string;
  student_id: string;
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export default function ParentHistoryPage() {
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auth, setAuth] = useState<{ message: string; tone: "info" | "warning"; cta: "signin" | "home" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionUser = await getSessionUser(supabase);
      if (!sessionUser || sessionUser.role !== "parent" || !sessionUser.linkedStudentId) {
        setAuth({
          message: "Sign in as a parent to view history.",
          tone: "info",
          cta: "signin"
        });
        setLoading(false);
        return;
      }
      const { data, error: qErr } = await supabase
        .from("dismissal_requests")
        .select("request_id, status, created_at, updated_at, student_id")
        .eq("student_id", sessionUser.linkedStudentId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (qErr) throw qErr;
      setRows((data ?? []) as HistoryRow[]);
    } catch {
      setError("Could not load history.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  if (auth) {
    return (
      <Page title="Dismissal history">
        <Card>
          <CardContent className="flex flex-col gap-4 py-8">
            <Alert tone={auth.tone}>{auth.message}</Alert>
            <div>
              <Link href={auth.cta === "signin" ? "/login" : "/"}>
                <Button variant={auth.cta === "signin" ? "primary" : "outline"}>
                  {auth.cta === "signin" ? "Sign in" : "Back to home"}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="Dismissal history"
      description="Recent pickup requests for your linked child."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          loading={loading}
          leftIcon={<Icon name="refresh" className="h-4 w-4" strokeWidth={2} />}
        >
          Refresh
        </Button>
      }
    >
      <Card>
        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <CardContent className="py-8">
            <Alert tone="error">{error}</Alert>
          </CardContent>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="history"
            title="No requests yet"
            description="When you request a pickup, it will appear here."
          />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const meta = dismissalStatusMeta(r.status);
              return (
                <li
                  key={r.request_id}
                  className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {formatWhen(r.created_at)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDay(r.created_at)}
                    </p>
                  </div>
                  <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </Page>
  );
}
