"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

// Realtime helpers for DismissFlow EPS.
//
// Source of truth: Docs/architecture.md §10. Realtime is the source of truth
// for live portal data; polling, periodic refresh, and manual reload are
// explicitly forbidden. Subscriptions are RLS-filtered by Supabase so a portal
// only ever receives rows it is allowed to see — there is no client-side
// filter that could leak cross-class / cross-student data.
//
// The browser client uses the anon key (RLS-constrained) — see
// lib/supabase/client.ts. The server-side Edge Functions write the rows that
// drive these subscriptions, and the partial unique index / atomic RPCs in the
// migrations guarantee the state transitions are sound.

export type ConnStatus = "connecting" | "live" | "reconnecting" | "closed";

export function useRealtimeStatus(
  supabase: SupabaseClient,
  table: string
): ConnStatus {
  const [status, setStatus] = useState<ConnStatus>("connecting");

  useEffect(() => {
    let cancelled = false;
    // We open a no-op channel and surface its SUBSCRIBED / CLOSED / CHANNEL_ERROR
    // / TIMED_OUT state to the UI. We do not attach any data filter — Supabase
    // already RLS-filters by the signed-in user, and the channel here is purely
    // a connection health probe that the parent / teacher UIs can show.
    const channel = supabase.channel(`status:${table}`);

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          // presence of a live change confirms SUBSCRIBED; React state is set
          // synchronously via the subscribe callback below.
        }
      )
      .subscribe((s) => {
        if (cancelled) return;
        if (s === "SUBSCRIBED") setStatus("live");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT")
          setStatus("reconnecting");
        else if (s === "CLOSED") setStatus("closed");
        else setStatus("connecting");
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, table]);

  return status;
}

// React hook that subscribes to a postgres_changes stream and invokes the
// supplied handler on every row change. RLS already filters the payload to the
// rows the signed-in user is allowed to see, so the handler can be naive about
// authorization. The subscription is torn down on unmount and on
// dependency change.
export function useTableChanges<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  event: "INSERT" | "UPDATE" | "DELETE" | "*",
  onChange: (row: T) => void
): ConnStatus {
  const [status, setStatus] = useState<ConnStatus>("connecting");

  useEffect(() => {
    let cancelled = false;
    const channel: RealtimeChannel = supabase
      .channel(`${table}:${event}`)
      .on(
        "postgres_changes",
        { event, schema: "public", table },
        (payload) => {
          if (cancelled) return;
          const row =
            (payload.new as T | null) ?? (payload.old as T | null);
          if (row) onChange(row);
        }
      )
      .subscribe((s) => {
        if (cancelled) return;
        if (s === "SUBSCRIBED") setStatus("live");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT")
          setStatus("reconnecting");
        else if (s === "CLOSED") setStatus("closed");
        else setStatus("connecting");
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, table, event, onChange]);

  return status;
}

// Human-friendly copy + colour for the connection status pill shown in the
// portal nav. Kept here (not in a UI file) so the contract between the hook
// and the visual is one source of truth.
export function statusLabel(s: ConnStatus): { label: string; tone: "live" | "warn" | "danger" } {
  switch (s) {
    case "live":
      return { label: "REALTIME · LIVE", tone: "live" };
    case "connecting":
      return { label: "REALTIME · CONNECTING", tone: "warn" };
    case "reconnecting":
      return { label: "REALTIME · RECONNECTING", tone: "warn" };
    case "closed":
      return { label: "REALTIME · OFFLINE", tone: "danger" };
  }
}
