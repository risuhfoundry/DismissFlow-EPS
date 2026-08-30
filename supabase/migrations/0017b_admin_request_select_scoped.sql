-- =============================================================================
-- DismissFlow EPS — Phase 17: close the admin dismissal_requests tenant hole.
-- =============================================================================
-- RLS re-audit (Step 13) found a pre-existing rogue policy, dr_admin_select
-- (created in 0010_admin_dismissal_readonly.sql), whose USING clause was
-- `app_role() = 'admin'` with NO school_id check. Combined with 0017's
-- dr_admin_all (FOR ALL, school-scoped), an admin could read EVERY school's
-- dismissal_requests, breaching tenant isolation.
--
-- Fix:
--   * 0010 intended admin to be SELECT-ONLY on dismissal_requests (the state
--     machine must stay authoritative only via the trusted Edge Functions / RPCs
--     — architecture §7.2). 0017's dr_admin_all FOR ALL re-broadened that to
--     INSERT/UPDATE/DELETE, contradicting 0010. Restore the read-only intent.
--   * Drop dr_admin_all (FOR ALL) and the rogue dr_admin_select.
--   * Recreate dr_admin_select as SELECT-only AND school-scoped
--     (school_id = app_school_id()), so an admin sees only their own school's
--     requests, and cannot mutate them directly.
-- Service-role Edge Functions bypass RLS and perform all transitions, so the
-- workflow is unchanged.
-- =============================================================================

drop policy if exists dr_admin_all on public.dismissal_requests;
drop policy if exists dr_admin_select on public.dismissal_requests;

create policy dr_admin_select on public.dismissal_requests
  for select
  using ( public.app_role() = 'admin' and school_id = public.app_school_id() );
