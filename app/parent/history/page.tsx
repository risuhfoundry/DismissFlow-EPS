"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { TopNav } from "@/components/ui/TopNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccessNote } from "@/components/ui/AccessNote";
import { LoadingState, EmptyState } from "@/components/ui/StateBlock";
import { GhostButton } from "@/components/ui/Button";
import type { DismissalStatus } from "@/lib/dismissal/state";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { label: "Dashboard", href: "/parent" },
  { label: "History", href: "/parent/history" },
  { label: "Profile", href: "/parent/profile" }
];

type HistoryRow = {
  request_id: string;
  status: DismissalStatus;
  created_at: string;
  updated_at: string;
  student_id: string;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export default function ParentHistoryPage() {
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authNote, setAuthNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sessionUser = await getSessionUser(supabase);
        if (!sessionUser || sessionUser.role !== "parent" || !sessionUser.linkedStudentId) {
          setAuthNote("Sign in as a parent to view history.");
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
        if (!cancelled) setRows((data ?? []) as HistoryRow[]);
      } catch {
        if (!cancelled) setError("Could not load history.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

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

      <main className="pt-24 pb-16 section-shell">
        <PageHeader
          eyebrow="02 / HISTORY"
          title="Dismissal History"
          description="Recent pickup requests for your linked child. RLS limits this list to the child on your account; the audit log retains the full server-side trail."
        />

        {authNote && (
          <div className="mt-8">
            <AccessNote message={authNote} signInHref="/login" />
          </div>
        )}

        {error && (
          <div className="mt-8">
            <Panel withTopBar topBar={<span>02 / HISTORY</span>}>
              <div className="p-7">
                <span className="flex items-center gap-2 font-mono uppercase tracking-widest text-mono-sm text-danger">
                  <Icon name="x" className="h-4 w-4" strokeWidth={2} />
                  {error}
                </span>
              </div>
            </Panel>
          </div>
        )}

        {!authNote && !error && (
          <div className="mt-8">
            <Panel
              withTopBar
              topBar={
                <>
                  <span>01 / REQUESTS</span>
                  <span className="text-muted">LIMIT 50</span>
                </>
              }
            >
              {loading ? (
                <LoadingState message="Loading history…" />
              ) : rows.length === 0 ? (
                <EmptyState message="No requests yet." icon="history" />
              ) : (
                <ul className="divide-y divide-line">
                  {rows.map((r, idx) => (
                    <motion.li
                      key={r.request_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        ease: [0.16, 1, 0.3, 1],
                        delay: idx * 0.04
                      }}
                      className="p-5 flex items-center justify-between gap-4"
                    >
                      <div className="flex flex-col gap-1">
                        <MonoLabel size="xs" tone="muted">
                          REQUEST {r.request_id.slice(0, 8).toUpperCase()}
                        </MonoLabel>
                        <p className="font-mono text-mono-sm text-bone tabular-nums">
                          {formatTime(r.created_at)}
                        </p>
                      </div>
                      <StatusPill status={r.status} />
                    </motion.li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        )}
      </main>
    </>
  );
}
