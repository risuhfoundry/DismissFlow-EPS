-- =============================================================================
-- DismissFlow EPS — Phase 4 corrective: lock down consume_qr_scan() RPC
-- =============================================================================
-- Source of truth: Docs/architecture.md §11.2; runtime setup requirements.
--
-- Scope: ensure the atomic scan RPC can ONLY be invoked by the trusted Edge
-- Function (service_role). On a fresh apply, 0003_scan_qr.sql already performs
-- this revoke; this migration re-applies the same revoke idempotently so the
-- already-applied function in the live project is corrected.
--
-- Background: Supabase's default schema ACL grants EXECUTE on public-schema
-- functions to anon and authenticated individually. The original 0003 only
-- revoked from the PUBLIC pseudo-role, leaving anon/authenticated able to call
-- /rpc/consume_qr_scan directly and bypass the Gate role check. Revoking from
-- anon and authenticated closes that bypass. service_role retains EXECUTE (the
-- scan-qr Edge Function uses it).

revoke execute on function public.consume_qr_scan(text, uuid)
  from public, anon, authenticated;
grant execute on function public.consume_qr_scan(text, uuid) to service_role;
