-- =============================================================================
-- DismissFlow EPS — Phase 17: tenant-scoped Row Level Security
-- =============================================================================
-- The foundation RLS (0001) scopes access by role / linked student / assigned
-- class, but NOT by school. In a real multi-school deployment that leaves a
-- tenant hole: every "*_admin_all" policy uses `app_role() = 'admin'` with no
-- school check, so any school admin could read and write EVERY school's users,
-- students, guardians, classes, requests and audit events.
--
-- This migration enforces tenant isolation three ways:
--   1. ADD school_id to student_guardians (the one tenant-scoped table 0015
--      omitted), backfilled from the linked student's school, then NOT NULL.
--   2. DEFENSE IN DEPTH on every role-scoped SELECT policy: AND school_id =
--      public.app_school_id(). These policies are already school-bound by
--      construction (class_id / student_id are FK'd into the user's own school),
--      so adding the explicit school clause can only make them stricter and
--      cannot break legitimate access.
--   3. PER-SCHOOL ADMIN: the "*_admin_all" policies now require
--      school_id = public.app_school_id(), so an admin manages only their own
--      school. This is the least-privilege reading of "real school
--      administrators." A platform/global super-admin and a new-school bootstrap
--      flow are NOT implemented here — see PHASE17_REPORT.md (ARCHITECTURAL
--      DECISIONS REQUIRED).
--
-- Backward compatibility: the pilot is a single school ("Tulip") and every live
-- row/user was backfilled to that school_id, so app_school_id() equals the row's
-- school_id for all authenticated callers — no existing access is revoked.
--
-- Strategy: drop each affected policy (IF EXISTS) and recreate it. apply_migration
-- runs in a single transaction, so a failure rolls back fully with no partial
-- policy state.
-- =============================================================================

-- 0. student_guardians: add the omitted tenant column (additive) --------------
alter table public.student_guardians add column if not exists school_id uuid;
alter table public.student_guardians
  add constraint student_guardians_school_id_fkey
  foreign key (school_id) references public.schools(school_id) on delete restrict;
update public.student_guardians sg
  set school_id = s.school_id
  from public.students s
  where sg.student_id = s.student_id and sg.school_id is null;
alter table public.student_guardians alter column school_id set not null;
create index if not exists student_guardians_school_idx
  on public.student_guardians (school_id);

-- users -----------------------------------------------------------------------
drop policy if exists users_admin_all on public.users;
create policy users_admin_all on public.users
  for all
  using ( public.app_role() = 'admin' and school_id = public.app_school_id() )
  with check ( public.app_role() = 'admin' and school_id = public.app_school_id() );

-- students --------------------------------------------------------------------
drop policy if exists students_parent_linked on public.students;
create policy students_parent_linked on public.students
  for select
  using ( student_id = public.app_linked_student()
          and school_id = public.app_school_id() );

drop policy if exists students_teacher_class on public.students;
create policy students_teacher_class on public.students
  for select
  using ( class_id = public.app_assigned_class()
          and school_id = public.app_school_id() );

drop policy if exists students_admin_all on public.students;
create policy students_admin_all on public.students
  for all
  using ( public.app_role() = 'admin' and school_id = public.app_school_id() )
  with check ( public.app_role() = 'admin' and school_id = public.app_school_id() );

-- guardians (protected PII) ---------------------------------------------------
drop policy if exists guardians_parent_linked on public.guardians;
create policy guardians_parent_linked on public.guardians
  for select
  using (
    exists (
      select 1 from public.student_guardians sg
      where sg.guardian_id = guardians.guardian_id
        and sg.student_id = public.app_linked_student()
    )
    and school_id = public.app_school_id()
  );

drop policy if exists guardians_teacher_class on public.guardians;
create policy guardians_teacher_class on public.guardians
  for select
  using (
    exists (
      select 1 from public.student_guardians sg
      join public.students s on s.student_id = sg.student_id
      where sg.guardian_id = guardians.guardian_id
        and s.class_id = public.app_assigned_class()
    )
    and school_id = public.app_school_id()
  );

drop policy if exists guardians_admin_all on public.guardians;
create policy guardians_admin_all on public.guardians
  for all
  using ( public.app_role() = 'admin' and school_id = public.app_school_id() )
  with check ( public.app_role() = 'admin' and school_id = public.app_school_id() );

-- student_guardians -----------------------------------------------------------
drop policy if exists sg_parent_linked on public.student_guardians;
create policy sg_parent_linked on public.student_guardians
  for select
  using ( student_id = public.app_linked_student()
          and school_id = public.app_school_id() );

drop policy if exists sg_teacher_class on public.student_guardians;
create policy sg_teacher_class on public.student_guardians
  for select
  using (
    student_id in (select student_id from public.students where class_id = public.app_assigned_class())
    and school_id = public.app_school_id()
  );

drop policy if exists sg_admin_all on public.student_guardians;
create policy sg_admin_all on public.student_guardians
  for all
  using ( public.app_role() = 'admin' and school_id = public.app_school_id() )
  with check ( public.app_role() = 'admin' and school_id = public.app_school_id() );

-- classes ---------------------------------------------------------------------
drop policy if exists classes_teacher_own on public.classes;
create policy classes_teacher_own on public.classes
  for select
  using ( (class_id = public.app_assigned_class() or teacher_id = auth.uid())
          and school_id = public.app_school_id() );

drop policy if exists classes_parent_linked on public.classes;
create policy classes_parent_linked on public.classes
  for select
  using (
    class_id = (select class_id from public.students where student_id = public.app_linked_student())
    and school_id = public.app_school_id()
  );

drop policy if exists classes_admin_all on public.classes;
create policy classes_admin_all on public.classes
  for all
  using ( public.app_role() = 'admin' and school_id = public.app_school_id() )
  with check ( public.app_role() = 'admin' and school_id = public.app_school_id() );

-- dismissal_requests ----------------------------------------------------------
drop policy if exists dr_parent_own_select on public.dismissal_requests;
create policy dr_parent_own_select on public.dismissal_requests
  for select
  using ( student_id = public.app_linked_student()
          and school_id = public.app_school_id() );

drop policy if exists dr_teacher_class on public.dismissal_requests;
create policy dr_teacher_class on public.dismissal_requests
  for select
  using (
    student_id in (select student_id from public.students where class_id = public.app_assigned_class())
    and school_id = public.app_school_id()
  );

drop policy if exists dr_admin_all on public.dismissal_requests;
create policy dr_admin_all on public.dismissal_requests
  for all
  using ( public.app_role() = 'admin' and school_id = public.app_school_id() )
  with check ( public.app_role() = 'admin' and school_id = public.app_school_id() );

-- dismissal_events (read-only audit; no INSERT/UPDATE/DELETE policies) --------
drop policy if exists de_parent_linked on public.dismissal_events;
create policy de_parent_linked on public.dismissal_events
  for select
  using (
    request_id in (
      select request_id from public.dismissal_requests
      where student_id = public.app_linked_student()
    )
    and school_id = public.app_school_id()
  );

drop policy if exists de_teacher_class on public.dismissal_events;
create policy de_teacher_class on public.dismissal_events
  for select
  using (
    student_id in (select student_id from public.students where class_id = public.app_assigned_class())
    and school_id = public.app_school_id()
  );

drop policy if exists de_gate_own on public.dismissal_events;
create policy de_gate_own on public.dismissal_events
  for select
  using ( scanned_by = auth.uid()::text
          and school_id = public.app_school_id() );

drop policy if exists de_admin_all on public.dismissal_events;
create policy de_admin_all on public.dismissal_events
  for select
  using ( public.app_role() = 'admin' and school_id = public.app_school_id() );

-- qr_tokens: intentionally unchanged — no client policies (server-only).
