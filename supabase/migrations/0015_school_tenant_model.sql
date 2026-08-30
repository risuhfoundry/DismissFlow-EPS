-- =============================================================================
-- DismissFlow EPS — Phase 17: real school / tenant model
-- =============================================================================
-- Introduces a first-class `schools` entity and a `school_id` ownership column
-- on every tenant-scoped table. Existing (single pilot) data is backfilled into
-- one seeded pilot school. This migration is ADDITIVE and NON-DESTRUCTIVE:
--   * no table is dropped / truncated / reset
--   * no existing row is deleted
--   * all new columns are backfilled before NOT NULL is applied
-- apply_migration runs each call in a single transaction, so a failure rolls back
-- fully; constraints below are added plainly (no IF NOT EXISTS) because a prior
-- failed apply leaves no partial objects behind.
-- =============================================================================

-- 1. schools entity
create table if not exists public.schools (
  school_id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Add school_id columns (nullable first so backfill can run).
alter table public.users          add column if not exists school_id uuid;
alter table public.students       add column if not exists school_id uuid;
alter table public.classes        add column if not exists school_id uuid;
alter table public.guardians      add column if not exists school_id uuid;
alter table public.dismissal_requests add column if not exists school_id uuid;
alter table public.dismissal_events   add column if not exists school_id uuid;

-- 3. Foreign keys.
alter table public.users          add constraint users_school_id_fkey
  foreign key (school_id) references public.schools(school_id) on delete restrict;
alter table public.students       add constraint students_school_id_fkey
  foreign key (school_id) references public.schools(school_id) on delete restrict;
alter table public.classes        add constraint classes_school_id_fkey
  foreign key (school_id) references public.schools(school_id) on delete restrict;
alter table public.guardians      add constraint guardians_school_id_fkey
  foreign key (school_id) references public.schools(school_id) on delete restrict;
alter table public.dismissal_requests add constraint dismissal_requests_school_id_fkey
  foreign key (school_id) references public.schools(school_id) on delete restrict;
alter table public.dismissal_events   add constraint dismissal_events_school_id_fkey
  foreign key (school_id) references public.schools(school_id) on delete restrict;

-- 4. RLS helper: caller's school (created AFTER the column exists).
create or replace function public.app_school_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select school_id from public.users where user_id = auth.uid();
$$;

-- 5. Backfill: seat all existing pilot data under one school. Only fills NULLs.
do $$
declare v_school uuid;
begin
  select school_id into v_school from public.schools limit 1;
  if v_school is null then
    insert into public.schools (name) values ('Tulip School') returning school_id into v_school;
  end if;
  update public.users          set school_id = v_school where school_id is null;
  update public.classes        set school_id = v_school where school_id is null;
  update public.students       set school_id = v_school where school_id is null;
  update public.guardians      set school_id = v_school where school_id is null;
  update public.dismissal_requests dr
    set school_id = s.school_id
    from public.students s
    where dr.student_id = s.student_id and dr.school_id is null;
  update public.dismissal_events de
    set school_id = coalesce(s.school_id, v_school)
    from public.students s
    where de.student_id = s.student_id and de.school_id is null;
  update public.dismissal_events de
    set school_id = v_school where de.school_id is null;
end $$;

-- 6. Enforce NOT NULL now that every row is backfilled.
alter table public.users          alter column school_id set not null;
alter table public.students       alter column school_id set not null;
alter table public.classes        alter column school_id set not null;
alter table public.guardians      alter column school_id set not null;
alter table public.dismissal_requests alter column school_id set not null;
alter table public.dismissal_events   alter column school_id set not null;

-- 7. Authorization-critical indexes for tenant-scoped lookups.
create index if not exists users_school_role_idx on public.users (school_id, role);
create index if not exists students_school_class_idx on public.students (school_id, class_id);
create index if not exists classes_school_idx on public.classes (school_id);
create index if not exists guardians_school_idx on public.guardians (school_id);
create index if not exists dismissal_requests_school_student_idx
  on public.dismissal_requests (school_id, student_id, status);
create index if not exists dismissal_events_school_request_idx
  on public.dismissal_events (school_id, request_id);
create unique index if not exists users_login_id_key
  on public.users (login_id) where login_id is not null;
create trigger trg_schools_updated_at
  before update on public.schools
  for each row execute function public.set_updated_at();
