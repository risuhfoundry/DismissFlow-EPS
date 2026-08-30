-- =============================================================================
-- DismissFlow EPS — Phase 17: tenant-aware authority RPCs + QR reaper
-- =============================================================================
-- Rewrites the three SECURITY DEFINER authority RPCs to:
--   * derive + validate the caller's SCHOOL and enforce it equals the request's
--     school (cross-school scans / decisions / cancels are rejected), and
--   * write school_id into dismissal_events (now NOT NULL).
-- Adds reap_expired_requests() to clear the unscanned-QR slot lock (Phase 16 S5):
--   a REQUESTED request whose QR was never used and has passed expires_at is moved
--   to EXPIRED, freeing the one-active-request slot without deleting any audit
--   history. Scheduling is intentionally OUT OF SCOPE here (no pg_cron in this
--   project); the function is invoked on-demand by the reap-expired-requests Edge
--   Function (which an external cron / admin can call).
-- All authority RPCs remain EXECUTE-restricted to service_role.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- consume_qr_scan: gate scan → AWAITING_TEACHER
-- -----------------------------------------------------------------------------
create or replace function public.consume_qr_scan(
  p_token_hash text,
  p_scanned_by uuid
)
returns table (
  ok boolean,
  code text,
  request_id uuid,
  student_name text,
  class_name text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token     public.qr_tokens%rowtype;
  v_request   public.dismissal_requests%rowtype;
  v_name      text;
  v_class     text;
  v_gate_school uuid;
begin
  -- Gate's school (server-derived; caller cannot choose it).
  select school_id into v_gate_school
  from public.users where user_id = p_scanned_by;

  select * into v_token
  from public.qr_tokens
  where token_hash = p_token_hash
  for update;

  if not found then
    return query select false, 'INVALID_QR',
      null::uuid, null::text, null::text, null::text;
    return;
  end if;

  if v_token.status = 'USED' then
    return query select false, 'QR_ALREADY_USED',
      v_token.request_id, null::text, null::text, v_token.status;
    return;
  end if;

  select * into v_request
  from public.dismissal_requests dr
  where dr.request_id = v_token.request_id
  for update;

  -- Cross-school scan: gate may only act on its own school's requests.
  if v_request.school_id is distinct from v_gate_school then
    return query select false, 'GATE_SCHOOL_FORBIDDEN',
      v_token.request_id, null::text, null::text, v_request.status::text;
    return;
  end if;

  if v_token.expires_at <= now() then
    update public.qr_tokens set status = 'EXPIRED' where token_id = v_token.token_id;
    update public.dismissal_requests dr
    set status = 'EXPIRED', updated_at = now()
    where dr.request_id = v_token.request_id
      and dr.status = 'REQUESTED';
    return query select false, 'QR_EXPIRED',
      v_token.request_id, null::text, null::text, 'EXPIRED';
    return;
  end if;

  update public.qr_tokens
  set used_at = now(), status = 'USED'
  where token_id = v_token.token_id;

  update public.dismissal_requests dr
  set status = 'AWAITING_TEACHER', updated_at = now()
  where dr.request_id = v_token.request_id
    and dr.status = 'REQUESTED'
  returning * into v_request;

  if not found then
    raise exception 'REQUEST_NOT_SCANNABLE';
  end if;

  select s.name, c.class_name
    into v_name, v_class
  from public.students s
  left join public.classes c on c.class_id = s.class_id
  where s.student_id = v_request.student_id;

  insert into public.dismissal_events (
    request_id, student_id, school_id, scanned_by, scan_time, final_status
  ) values (
    v_request.request_id, v_request.student_id, v_request.school_id,
    p_scanned_by::text, now(), 'AWAITING_TEACHER'
  );

  return query select true, 'OK',
    v_request.request_id, v_name, v_class, 'AWAITING_TEACHER';
  return;
end;
$$;

-- -----------------------------------------------------------------------------
-- teacher_decide_request: AWAITING_TEACHER → DISMISSED | REJECTED
-- -----------------------------------------------------------------------------
create or replace function public.teacher_decide_request(
  p_request_id uuid,
  p_decision text,
  p_teacher_id uuid
)
returns table (
  ok boolean,
  code text,
  request_id uuid,
  student_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request        public.dismissal_requests%rowtype;
  v_student_class  uuid;
  v_teacher_role   text;
  v_teacher_class  uuid;
  v_teacher_school uuid;
  v_events_affected int;
begin
  if p_decision is distinct from 'DISMISSED' and p_decision is distinct from 'REJECTED' then
    return query select false, 'INVALID_DECISION',
      p_request_id, null::uuid, null::text;
    return;
  end if;

  select u.role, u.assigned_class_id, u.school_id
    into v_teacher_role, v_teacher_class, v_teacher_school
  from public.users u
  where u.user_id = p_teacher_id;

  if v_teacher_role is distinct from 'teacher' or v_teacher_class is null then
    return query select false, 'TEACHER_REQUIRED',
      p_request_id, null::uuid, null::text;
    return;
  end if;

  select * into v_request
  from public.dismissal_requests dr
  where dr.request_id = p_request_id
  for update;

  if not found then
    return query select false, 'REQUEST_NOT_FOUND',
      p_request_id, null::uuid, null::text;
    return;
  end if;

  -- Cross-school decision: teacher may only decide within their own school.
  if v_request.school_id is distinct from v_teacher_school then
    return query select false, 'TEACHER_SCHOOL_FORBIDDEN',
      p_request_id, v_request.student_id, v_request.status::text;
    return;
  end if;

  select s.class_id into v_student_class
  from public.students s
  where s.student_id = v_request.student_id;

  if v_student_class is distinct from v_teacher_class then
    return query select false, 'TEACHER_CLASS_FORBIDDEN',
      p_request_id, v_request.student_id, v_request.status::text;
    return;
  end if;

  if v_request.status <> 'AWAITING_TEACHER' then
    return query select false, 'REQUEST_NOT_AWAITING_TEACHER',
      p_request_id, v_request.student_id, v_request.status::text;
    return;
  end if;

  update public.dismissal_requests dr
  set status = p_decision::public.dismissal_status,
      updated_at = now()
  where dr.request_id = p_request_id
    and dr.status = 'AWAITING_TEACHER';

  update public.dismissal_events de
  set approved_by = p_teacher_id,
      approval_time = now(),
      final_status = p_decision
  where de.request_id = p_request_id;

  get diagnostics v_events_affected = row_count;

  if v_events_affected = 0 then
    insert into public.dismissal_events (
      request_id, student_id, school_id, approved_by, approval_time, final_status
    ) values (
      p_request_id, v_request.student_id, v_request.school_id,
      p_teacher_id, now(), p_decision
    );
  end if;

  return query select true, 'OK',
    p_request_id, v_request.student_id, p_decision;
  return;
end;
$$;

-- -----------------------------------------------------------------------------
-- parent_cancel_request: REQUESTED → CANCELLED
-- -----------------------------------------------------------------------------
create or replace function public.parent_cancel_request(
  p_request_id uuid,
  p_parent_id  uuid
)
returns table (
  ok boolean,
  code text,
  request_id uuid,
  student_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request        public.dismissal_requests%rowtype;
  v_parent_role    text;
  v_parent_student uuid;
  v_parent_school  uuid;
begin
  select u.role, u.linked_student_id, u.school_id
    into v_parent_role, v_parent_student, v_parent_school
  from public.users u
  where u.user_id = p_parent_id;

  if v_parent_role is distinct from 'parent' or v_parent_student is null then
    return query select false, 'PARENT_REQUIRED',
      p_request_id, null::uuid, null::text;
    return;
  end if;

  select * into v_request
  from public.dismissal_requests dr
  where dr.request_id = p_request_id
  for update;

  if not found then
    return query select false, 'REQUEST_NOT_FOUND',
      p_request_id, null::uuid, null::text;
    return;
  end if;

  if v_request.student_id is distinct from v_parent_student then
    return query select false, 'PARENT_STUDENT_FORBIDDEN',
      p_request_id, v_request.student_id, v_request.status::text;
    return;
  end if;

  -- Cross-school cancel: parent may only cancel their own school's requests.
  if v_request.school_id is distinct from v_parent_school then
    return query select false, 'PARENT_SCHOOL_FORBIDDEN',
      p_request_id, v_request.student_id, v_request.status::text;
    return;
  end if;

  if v_request.status <> 'REQUESTED' then
    return query select false, 'REQUEST_NOT_CANCELLABLE',
      p_request_id, v_request.student_id, v_request.status::text;
    return;
  end if;

  update public.dismissal_requests dr
  set status = 'CANCELLED', updated_at = now()
  where dr.request_id = p_request_id
    and dr.status = 'REQUESTED';

  update public.qr_tokens
  set status = 'EXPIRED'
  where qr_tokens.request_id = p_request_id
    and qr_tokens.status = 'VALID';

  update public.dismissal_events de
  set final_status = 'CANCELLED'
  where de.request_id = p_request_id;

  if not found then
    insert into public.dismissal_events (
      request_id, student_id, school_id, final_status
    ) values (
      p_request_id, v_request.student_id, v_request.school_id, 'CANCELLED'
    );
  end if;

  return query select true, 'OK',
    p_request_id, v_request.student_id, 'CANCELLED';
  return;
end;
$$;

-- -----------------------------------------------------------------------------
-- reap_expired_requests: clear the unscanned-QR slot lock (Phase 16 S5).
-- A REQUESTED request whose QR was never used and has passed its expiry is moved
-- to EXPIRED, freeing the one-active-request slot. Audit history is preserved.
-- -----------------------------------------------------------------------------
create or replace function public.reap_expired_requests()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  with expired as (
    select dr.request_id
    from public.dismissal_requests dr
    where dr.status = 'REQUESTED'
      and dr.expires_at is not null
      and dr.expires_at <= now()
      and not exists (
        select 1 from public.qr_tokens qt
        where qt.request_id = dr.request_id and qt.status = 'VALID'
      )
  )
  update public.dismissal_requests dr
  set status = 'EXPIRED', updated_at = now()
  from expired
  where dr.request_id = expired.request_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Authorization: only the trusted Edge Functions (service role) may execute these.
-- -----------------------------------------------------------------------------
revoke execute on function public.consume_qr_scan(text, uuid)
  from public, anon, authenticated;
grant execute on function public.consume_qr_scan(text, uuid) to service_role;

revoke execute on function public.teacher_decide_request(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.teacher_decide_request(uuid, text, uuid) to service_role;

revoke execute on function public.parent_cancel_request(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.parent_cancel_request(uuid, uuid) to service_role;

revoke execute on function public.reap_expired_requests()
  from public, anon, authenticated;
grant execute on function public.reap_expired_requests() to service_role;
