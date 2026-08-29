-- Phase 11 — Enable Supabase Realtime for dismissal_requests.
--
-- Realtime is ONLY a UI synchronization mechanism. The database + the trusted
-- Edge Functions / RPCs remain the authority. Row-Level Security is enforced on
-- the Realtime stream exactly as on direct SELECTs, so:
--   * a parent receives changes only to their linked student's request(s),
--   * a teacher receives changes only to requests in their assigned class,
--   * the gate role (no SELECT policy on dismissal_requests) receives nothing.
--
-- Security boundary (Docs/architecture.md §10, §12, §18):
--   * ONLY public.dismissal_requests is added. The plaintext QR token lives in
--     public.qr_tokens, which is intentionally NOT published (server-only, no
--     client SELECT policy) — so no token is ever exposed through Realtime.
--   * Guardian PII (name/phone/email in public.guardians, joined via
--     student_guardians) is NOT on this table and is NOT published, so no PII
--     leaks through the stream.
--
-- REPLICA IDENTITY FULL guarantees the full row (including student_id and
-- expires_at, which do NOT change on a status UPDATE) is delivered in the
-- postgres_changes payload, so the client can trust the authoritative record
-- without reconstructing it from a partial diff.

-- 1) Publication: add the single table we need. Guarded so re-applying the
--    migration is a no-op rather than an error.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dismissal_requests'
  ) then
    alter publication supabase_realtime add table public.dismissal_requests;
  end if;
end $$;

-- 2) Full replica identity so UPDATE/DELETE payloads carry the entire row.
--    Idempotent: re-running simply re-asserts FULL.
alter table public.dismissal_requests replica identity full;
