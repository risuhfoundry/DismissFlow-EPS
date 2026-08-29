"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Panel } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { TopNav } from "@/components/ui/TopNav";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRealtimeStatus, useTableChanges } from "@/lib/realtime/subs";
import type { DismissalStatus } from "@/lib/dismissal/state";

const NAV_LINKS = [
  { label: "Overview", href: "/admin" },
  { label: "Roster", href: "/admin/roster" },
  { label: "Classes", href: "/admin/classes" },
  { label: "Users", href: "/admin/users" },
  { label: "Monitor", href: "/admin/monitor" },
  { label: "Logs", href: "/admin/logs" }
];

type StudentLite = { name: string; admission_no: string; class_name: string | null };
type ReqRow = {
  request_id: string;
  student_id: string;
  status: DismissalStatus;
  created_at: string;
  expires_at: string | null;
};

// All values are derived live from Supabase (RLS-scoped to the admin role).
// Nothing is hardcoded — counts come from exact head queries, the activity
// list from real rows. Realtime only re-fetches; it never decides state.
type CountProxy = {
  eq: (c: string, v: unknown) => CountProxy;
  in: (c: string, v: unknown[]) => CountProxy;
  gte: (c: string, v: string) => CountProxy;
};

async function headCount(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  table: string,
  extra?: (q: CountProxy) => void
): Promise<number> {
  const holder = { q: supabase.from(table).select("*", { count: "exact", head: true }) };
  if (extra) {
    const proxy: CountProxy = {
      eq: (c, v) => {
        holder.q = holder.q.eq(c, v);
        return proxy;
      },
      in: (c, v) => {
        holder.q = holder.q.in(c, v);
        return proxy;
      },
      gte: (c, v) => {
        holder.q = holder.q.gte(c, v);
        return proxy;
      }
    };
    extra(proxy);
  }
  const { count, error } = await holder.q;
  if (error) throw error;
  return count ?? 0;
}

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function AdminOverviewPage() {
  const supabase = getSupabaseBrowserClient();
  const [stats, setStats] = useState({
    students: 0,
    classes: 0,
    parents: 0,
    guardians: 0,
    teachers: 0,
    gates: 0,
    requests: 0,
    active: 0,
    pending: 0,
    todaysDismissals: 0,
    rejectedCancelled: 0
  });
  const [recent, setRecent] = useState<ReqRow[]>([]);
  const [students, setStudents] = useState<Record<string, StudentLite>>({});
  const [loading, setLoading] = useState(true);
  const [authNote, setAuthNote] = useState<string | null>(null);
  const status$ = useRealtimeStatus(supabase, "dismissal_requests");

  const refresh = useCallback(async () => {
    const sessionUser = await getSessionUser(supabase);
    if (!sessionUser || sessionUser.role !== "admin") {
      setAuthNote("Sign in as an admin to view the operations overview.");
      setLoading(false);
      return;
    }
    const today = startOfToday();
    const [
      students,
      classes,
      parents,
      guardians,
      teachers,
      gates,
      requests,
      active,
      pending,
      todaysDismissals,
      rejectedCancelled
    ] = await Promise.all([
      headCount(supabase, "students"),
      headCount(supabase, "classes"),
      headCount(supabase, "users", (p) => p.eq("role", "parent")),
      headCount(supabase, "guardians"),
      headCount(supabase, "users", (p) => p.eq("role", "teacher")),
      headCount(supabase, "users", (p) => p.eq("role", "gate")),
      headCount(supabase, "dismissal_requests"),
      headCount(supabase, "dismissal_requests", (p) => p.in("status", ["REQUESTED", "AWAITING_TEACHER"])),
      headCount(supabase, "dismissal_requests", (p) => p.eq("status", "AWAITING_TEACHER")),
      headCount(supabase, "dismissal_requests", (p) =>
        p.in("status", ["DISMISSED", "REJECTED", "CANCELLED", "EXPIRED"]).gte("updated_at", today)
      ),
      headCount(supabase, "dismissal_requests", (p) => p.in("status", ["REJECTED", "CANCELLED"]))
    ]);
    setStats({
      students,
      classes,
      parents,
      guardians,
      teachers,
      gates,
      requests,
      active,
      pending,
      todaysDismissals,
      rejectedCancelled
    });

    // Recent operational activity (real rows, class-scoped hydrate).
    const { data: reqs } = await supabase
      .from("dismissal_requests")
      .select("request_id, student_id, status, created_at, expires_at")
      .order("created_at", { ascending: false })
      .limit(12);
    const rows = (reqs ?? []) as ReqRow[];
    setRecent(rows);
    const ids = Array.from(new Set(rows.map((r) => r.student_id)));
    if (ids.length > 0) {
      const { data: stus } = await supabase
        .from("students")
        .select("student_id, name, admission_no, class_id");
      const { data: cls } = await supabase.from("classes").select("class_id, class_name");
      const clsMap: Record<string, string> = {};
      for (const c of cls ?? []) clsMap[c.class_id] = c.class_name;
      const map: Record<string, StudentLite> = {};
      for (const s of stus ?? []) {
        map[s.student_id] = {
          name: s.name,
          admission_no: s.admission_no,
          class_name: s.class_id ? clsMap[s.class_id] ?? null : null
        };
      }
      setStudents(map);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch {
        if (!cancelled) setAuthNote("Could not load the operations overview.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Realtime: re-fetch on any dismissal_requests change. Read/sync only.
  const handleChange = useCallback(() => {
    refresh().catch(() => {});
  }, [refresh]);
  useTableChanges<ReqRow>(supabase, "dismissal_requests", "*", handleChange);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <>
      <TopNav
        links={NAV_LINKS}
        trailing={<StatusIndicator status={status$} />}
      />

      <main className="pt-24 pb-16 section-shell">
        <span className="eyebrow">
          <i />
          04 / ADMIN OVERVIEW
        </span>
        <h2 className="font-display text-display-md uppercase text-bone mt-4">
          Operations
        </h2>
        <p className="text-muted mt-3 max-w-2xl">
          Live operational picture. Every figure below is computed from the
          database by the admin role's Row-Level Security scope — nothing is
          hardcoded. Dismissal state itself is owned by the trusted Edge
          Functions; this portal only observes it.
        </p>

        {authNote && (
          <div className="mt-8">
            <Panel withTopBar topBar={<span>00 / ACCESS</span>}>
              <div className="p-7 flex flex-col gap-5">
                <p className="font-mono text-mono-sm uppercase tracking-widest text-muted">
                  {authNote}
                </p>
                <Link
                  href="/login/admin"
                  className="h-12 px-5 inline-flex items-center gap-3 bg-accent text-white font-mono uppercase tracking-widest text-mono-sm font-semibold shadow-accent-glow w-fit"
                >
                  <Icon name="arrow.right" className="h-4 w-4" strokeWidth={2} />
                  Sign In
                </Link>
              </div>
            </Panel>
          </div>
        )}

        {!authNote && !loading && (
          <div className="mt-10 grid gap-8">
            {/* People + classes */}
            <Section title="POPULATION">
              <Stat label="STUDENTS" value={stats.students} />
              <Stat label="CLASSES" value={stats.classes} />
              <Stat label="PARENTS" value={stats.parents} />
              <Stat label="GUARDIANS" value={stats.guardians} />
              <Stat label="TEACHERS" value={stats.teachers} />
              <Stat label="GATE USERS" value={stats.gates} />
            </Section>

            {/* Dismissal operations */}
            <Section title="DISMISSALS">
              <Stat label="TOTAL REQUESTS" value={stats.requests} />
              <Stat label="ACTIVE" value={stats.active} accent />
              <Stat label="PENDING TEACHER" value={stats.pending} accent />
              <Stat label="DISMISSED TODAY" value={stats.todaysDismissals} />
              <Stat label="REJECTED / CANCELLED" value={stats.rejectedCancelled} />
            </Section>

            {/* Recent activity */}
            <Panel
              withTopBar
              topBar={
                <>
                  <span>03 / RECENT DISMISSAL ACTIVITY</span>
                  <Link
                    href="/admin/monitor"
                    className="font-mono uppercase tracking-widest text-mono-xs text-accent hover:text-bone transition-colors"
                  >
                    MONITOR →
                  </Link>
                </>
              }
            >
              {recent.length === 0 ? (
                <div className="p-7 text-muted">No dismissal requests yet.</div>
              ) : (
                <ul className="divide-y divide-line">
                  {recent.map((r) => {
                    const s = students[r.student_id];
                    return (
                      <li
                        key={r.request_id}
                        className="p-5 flex items-center justify-between gap-4"
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <p className="font-display text-xl uppercase text-bone leading-none truncate">
                            {s?.name ?? "—"}
                          </p>
                          <p className="font-mono text-mono-xs uppercase tracking-widest text-muted">
                            ADM {s?.admission_no ?? "—"}
                            {s?.class_name ? ` · ${s.class_name.toUpperCase()}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-mono-xs uppercase tracking-widest text-muted">
                            {fmt(r.created_at)}
                          </span>
                          <StatusPill status={r.status} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        )}
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <MonoLabel size="xs" tone="muted">
        {title}
      </MonoLabel>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-line">
        {children}
      </div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  accent
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="bg-panel p-6">
      <MonoLabel size="sm" tone="muted">
        {label}
      </MonoLabel>
      <p
        className={`font-display text-display-md uppercase mt-2 leading-none ${
          accent ? "text-accent" : "text-bone"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
