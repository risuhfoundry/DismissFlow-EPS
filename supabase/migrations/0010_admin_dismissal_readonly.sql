-- =============================================================================
-- DismissFlow EPS — Phase 12: Admin is read-only on dismissal_requests.
-- =============================================================================
-- Source of truth: Docs/PRD.md, Docs/architecture.md §4.4, §6.1, §9.2, §12.1.
--
-- Why this change:
--   The Admin role is an operational management / visibility role. It must NOT
--   be able to directly mutate dismissal state (Docs/architecture.md §7.2
--   state machine stays authoritative only via the trusted Edge Functions /
--   RPCs). The original `dr_admin_all FOR ALL` policy granted admin INSERT /
--   UPDATE / DELETE on dismissal_requests, which would let a client bypass the
--   atomic RPCs and the immutable audit trail.
--
-- This is a RESTRICTION, not a weakening: it narrows admin's privilege on
-- dismissal_requests to SELECT only. Admin management of students / classes /
-- users keeps its existing `admin_all` scope (those are required by §4.4), and
-- every dismissal transition still flows exclusively through the Edge
-- Functions (create/scan/approve/reject/cancel), exactly as before. No
-- existing policy is loosened; no `USING (true)` is introduced; qr_tokens and
-- guardian PII remain server-only / admin-scoped as before.
-- =============================================================================

-- Replace the broad admin policy with a SELECT-only policy so the Admin
-- portal (and any admin client) can read operational dismissal state but
-- cannot authoritatively change it.
drop policy if exists dr_admin_all on public.dismissal_requests;

create policy dr_admin_select on public.dismissal_requests
  for select
  using (public.app_role() = 'admin');
