-- Phase 15 — Enable Supabase Realtime for dismissal_events.
--
-- Why:
--   `app/admin/monitor` and `app/admin/logs` both subscribe to
--   `dismissal_requests` AND `dismissal_events` for the admin live view and
--   audit log. Migration 0009 published `dismissal_requests` but never
--   `dismissal_events`, so the audit-row subscription was silently a no-op
--   (channel opened but never received a payload). This migration closes that
--   gap so the admin realtime view reflects every state transition.
--
-- Security boundary (Docs/architecture.md §10, §12, §18):
--   * `dismissal_events` is the append-only audit log (INSERT-only by design,
--     created in 0001_init.sql). It contains server-derived actor fields
--     (`scanned_by`, `approved_by`) and a final_status — no plaintext tokens,
--     no guardian PII, no credentials.
--   * Admin has SELECT on `dismissal_events` (existing RLS), so the realtime
--     stream is correctly filtered: ONLY admin sessions receive audit events.
--     Parent/teacher/gate RLS does NOT permit SELECT, so they receive nothing.
--   * The qr_tokens table (plaintext token + hash) remains unpublished.
--   * The guardians table (PII) remains unpublished.
--
-- REPLICA IDENTITY FULL guarantees the full row (including scan_time,
-- approval_time, final_status) is delivered in the postgres_changes payload,
-- so the admin monitor page can update without a follow-up REST refetch.

-- 1) Publication: add the audit table. Guarded so re-applying the migration
--    is a no-op rather than an error.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dismissal_events'
  ) then
    alter publication supabase_realtime add table public.dismissal_events;
  end if;
end $$;

-- 2) Full replica identity so INSERT/UPDATE/DELETE payloads carry the entire
--    row. Idempotent: re-running simply re-asserts FULL.
alter table public.dismissal_events replica identity full;