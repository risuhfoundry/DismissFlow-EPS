-- =============================================================================
-- DismissFlow EPS — Foundation Migration (Tulip-first)
-- =============================================================================
-- Source of truth: Docs/PRD.md §10, Docs/architecture.md §6, §7, §9, §12, §14.
-- Scope: foundational relational model + RLS. NO business logic (no Edge
-- Functions, no token generation, no request creation). Tulip is a normal
-- `classes` row; no Tulip-specific tables.
--
-- Apply with: supabase migration up  (or supabase db push)
-- Idempotent-safe to re-run only via the migration tool (do not re-run by hand
-- on a database that already has these objects).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Dismissal status enum (architecture §7.1)
--    IDLE is included per the architecture enumeration but is never persisted
--    on a row (it is the absence of a request on the client).
-- -----------------------------------------------------------------------------
create type public.dismissal_status as enum (
  'IDLE',
  'REQUESTED',
  'AWAITING_TEACHER',
  'DISMISSED',
  'REJECTED',
  'CANCELLED',
  'EXPIRED'
);

-- -----------------------------------------------------------------------------
-- 2. Tables (created without cross-FKs first to avoid circular dependencies;
--    FKs are added in section 3).
-- -----------------------------------------------------------------------------

-- guardians (PRD §10, architecture §6.1) — protected PII.
create table public.guardians (
  guardian_id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  relationship text,
  created_at timestamptz not null default now()
);

-- classes (PRD §10, architecture §6.1) — Tulip is a normal row, not a table.
create table public.classes (
  class_id uuid primary key default gen_random_uuid(),
  class_name text not null,
  section text,
  teacher_id uuid,                 -- FK to users(user_id) added in §3
  created_at timestamptz not null default now()
);

-- users / application profile (architecture §6.1, §9.2)
-- auth.users(id) is the authentication identity; public.users is the
-- authorization identity (role + scoping). 1:1 by user_id = auth.users.id.
create table public.users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('parent', 'teacher', 'gate', 'admin')),
  login_id text,                   -- admission number for parent demo (PRD §12)
  credential_status text not null default 'active',
  linked_student_id uuid,          -- FK to students(student_id) added in §3
  assigned_class_id uuid,          -- FK to classes(class_id) added in §3
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- students (PRD §10, architecture §6.1)
-- admission_no is TEXT to preserve leading zeroes (e.g. '040' != 40). PRD §11.
create table public.students (
  student_id uuid primary key default gen_random_uuid(),
  admission_no text not null,
  name text not null,
  gender text,
  dob date,
  class_id uuid,                   -- FK to classes(class_id) added in §3
  created_at timestamptz not null default now()
);

-- student_guardians (PRD §10, architecture §6.1) — many-to-many.
create table public.student_guardians (
  student_id uuid not null,        -- FK added in §3
  guardian_id uuid not null,       -- FK added in §3
  primary key (student_id, guardian_id)
);

-- dismissal_requests (PRD §10, architecture §6.1, §7)
create table public.dismissal_requests (
  request_id uuid primary key default gen_random_uuid(),
  student_id uuid not null,        -- FK added in §3
  guardian_id uuid,                -- FK added in §3 (nullable)
  status public.dismissal_status not null default 'REQUESTED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

-- qr_tokens (architecture §6.1, §8) — server-only, stores HASH not plaintext.
create table public.qr_tokens (
  token_id uuid primary key default gen_random_uuid(),
  request_id uuid not null,        -- FK added in §3
  token_hash text not null,        -- SHA-256 of the random token; plaintext never stored
  expires_at timestamptz not null,
  used_at timestamptz,             -- NULL until consumed (single-use)
  status text not null default 'VALID'
    check (status in ('VALID', 'USED', 'EXPIRED')),
  created_at timestamptz not null default now()
);

-- dismissal_events (architecture §6.1, §13) — immutable audit trail.
create table public.dismissal_events (
  event_id uuid primary key default gen_random_uuid(),
  request_id uuid not null,        -- FK added in §3
  student_id uuid,                 -- FK added in §3 (denormalized for fast audit queries)
  scanned_by text,                 -- gate id / device (PRD §22)
  approved_by uuid,                -- FK to users(user_id) added in §3
  scan_time timestamptz,
  approval_time timestamptz,
  final_status text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3. Foreign keys (added after tables to resolve the users <-> classes <->
--    students cycle). All FK columns above are now constrained.
-- -----------------------------------------------------------------------------
alter table public.classes
  add constraint classes_teacher_id_fkey
  foreign key (teacher_id) references public.users(user_id) on delete set null;

alter table public.students
  add constraint students_class_id_fkey
  foreign key (class_id) references public.classes(class_id) on delete restrict;

alter table public.users
  add constraint users_linked_student_id_fkey
  foreign key (linked_student_id) references public.students(student_id) on delete set null,
  add constraint users_assigned_class_id_fkey
  foreign key (assigned_class_id) references public.classes(class_id) on delete set null;

alter table public.student_guardians
  add constraint student_guardians_student_id_fkey
  foreign key (student_id) references public.students(student_id) on delete cascade,
  add constraint student_guardians_guardian_id_fkey
  foreign key (guardian_id) references public.guardians(guardian_id) on delete cascade;

alter table public.dismissal_requests
  add constraint dismissal_requests_student_id_fkey
  foreign key (student_id) references public.students(student_id) on delete cascade,
  add constraint dismissal_requests_guardian_id_fkey
  foreign key (guardian_id) references public.guardians(guardian_id) on delete set null;

alter table public.qr_tokens
  add constraint qr_tokens_request_id_fkey
  foreign key (request_id) references public.dismissal_requests(request_id) on delete cascade;

alter table public.dismissal_events
  add constraint dismissal_events_request_id_fkey
  foreign key (request_id) references public.dismissal_requests(request_id) on delete cascade,
  add constraint dismissal_events_student_id_fkey
  foreign key (student_id) references public.students(student_id) on delete set null,
  add constraint dismissal_events_approved_by_fkey
  foreign key (approved_by) references public.users(user_id) on delete set null;

-- -----------------------------------------------------------------------------
-- 4. One-active-request invariant (architecture §6.1 / §7.4)
--    Exactly one ACTIVE request per student. Active = REQUESTED or
--    AWAITING_TEACHER. Implemented as a partial unique index so the database —
--    not the client — enforces it atomically.
-- -----------------------------------------------------------------------------
create unique index dismissal_requests_one_active_per_student
  on public.dismissal_requests (student_id)
  where status in ('REQUESTED', 'AWAITING_TEACHER');

-- -----------------------------------------------------------------------------
-- 5. Supporting indexes (architecture §6.3) — each has a query reason.
-- -----------------------------------------------------------------------------
create unique index students_admission_no_key on public.students (admission_no);
create index students_class_id_idx on public.students (class_id);
create index dismissal_requests_student_status_idx
  on public.dismissal_requests (student_id, status);   -- active-request check + teacher queue
create index qr_tokens_token_hash_idx on public.qr_tokens (token_hash);  -- O(1) validation lookup
create index dismissal_events_request_id_idx on public.dismissal_events (request_id);
create index dismissal_events_student_id_idx on public.dismissal_events (student_id);
create index users_role_class_idx on public.users (role, assigned_class_id);
create index users_login_id_idx on public.users (login_id);

-- -----------------------------------------------------------------------------
-- 6. updated_at maintenance for rows that carry it.
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create trigger trg_dismissal_requests_updated_at
  before update on public.dismissal_requests
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. RLS helper functions (SECURITY DEFINER, STABLE) — read the caller's
--    application-profile scoping without recursive RLS evaluation.
-- -----------------------------------------------------------------------------
create or replace function public.app_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.users where user_id = auth.uid();
$$;

create or replace function public.app_linked_student()
returns uuid
language sql stable security definer set search_path = public
as $$
  select linked_student_id from public.users where user_id = auth.uid();
$$;

create or replace function public.app_assigned_class()
returns uuid
language sql stable security definer set search_path = public
as $$
  select assigned_class_id from public.users where user_id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- 8. Row Level Security — enabled on EVERY application table.
--    Gate has NO policy on qr_tokens / guardians (no direct access to token
--    internals or guardian PII). All sensitive access is server-side only.
-- -----------------------------------------------------------------------------

-- users -----------------------------------------------------------------------
alter table public.users enable row level security;

create policy users_self_read on public.users
  for select using (user_id = auth.uid());

create policy users_self_update on public.users
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy users_admin_all on public.users
  for all using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- students --------------------------------------------------------------------
alter table public.students enable row level security;

create policy students_parent_linked on public.students
  for select using (student_id = public.app_linked_student());

create policy students_teacher_class on public.students
  for select using (class_id = public.app_assigned_class());

create policy students_admin_all on public.students
  for all using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- guardians (protected PII) ---------------------------------------------------
alter table public.guardians enable row level security;

create policy guardians_parent_linked on public.guardians
  for select using (
    exists (
      select 1 from public.student_guardians sg
      where sg.guardian_id = guardians.guardian_id
        and sg.student_id = public.app_linked_student()
    )
  );

create policy guardians_teacher_class on public.guardians
  for select using (
    exists (
      select 1 from public.student_guardians sg
      join public.students s on s.student_id = sg.student_id
      where sg.guardian_id = guardians.guardian_id
        and s.class_id = public.app_assigned_class()
    )
  );

create policy guardians_admin_all on public.guardians
  for all using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- student_guardians -----------------------------------------------------------
alter table public.student_guardians enable row level security;

create policy sg_parent_linked on public.student_guardians
  for select using (student_id = public.app_linked_student());

create policy sg_teacher_class on public.student_guardians
  for select using (
    student_id in (select student_id from public.students where class_id = public.app_assigned_class())
  );

create policy sg_admin_all on public.student_guardians
  for all using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- classes ---------------------------------------------------------------------
alter table public.classes enable row level security;

create policy classes_teacher_own on public.classes
  for select using (class_id = public.app_assigned_class() or teacher_id = auth.uid());

create policy classes_parent_linked on public.classes
  for select using (
    class_id = (select class_id from public.students where student_id = public.app_linked_student())
  );

create policy classes_admin_all on public.classes
  for all using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- dismissal_requests ----------------------------------------------------------
alter table public.dismissal_requests enable row level security;

create policy dr_parent_own_select on public.dismissal_requests
  for select using (student_id = public.app_linked_student());

create policy dr_parent_own_insert on public.dismissal_requests
  for insert with check (student_id = public.app_linked_student());

create policy dr_parent_own_update on public.dismissal_requests
  for update using (student_id = public.app_linked_student())
  with check (student_id = public.app_linked_student());

create policy dr_teacher_class on public.dismissal_requests
  for select using (
    student_id in (select student_id from public.students where class_id = public.app_assigned_class())
  );

create policy dr_admin_all on public.dismissal_requests
  for all using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- qr_tokens (server-only: RLS enabled, NO client policies => all client access denied)
alter table public.qr_tokens enable row level security;

-- dismissal_events (append-only audit; no UPDATE/DELETE policies) -------------
alter table public.dismissal_events enable row level security;

create policy de_parent_linked on public.dismissal_events
  for select using (
    request_id in (
      select request_id from public.dismissal_requests where student_id = public.app_linked_student()
    )
  );

create policy de_teacher_class on public.dismissal_events
  for select using (student_id in (
    select student_id from public.students where class_id = public.app_assigned_class()
  ));

create policy de_gate_own on public.dismissal_events
  for select using (scanned_by = auth.uid()::text);

create policy de_admin_all on public.dismissal_events
  for select using (public.app_role() = 'admin');

-- =============================================================================
-- NOTE: No INSERT/UPDATE/DELETE policies exist on dismissal_events. Rows are
-- written only by trusted Edge Functions via the service role (which bypasses
-- RLS), satisfying the append-only audit requirement (architecture §12.1, §13).
-- =============================================================================
