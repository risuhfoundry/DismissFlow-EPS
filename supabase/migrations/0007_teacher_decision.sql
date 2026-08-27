-- =============================================================================
-- DismissFlow EPS — Phase 5: trusted Teacher decision (approve / reject)
-- =============================================================================
-- Source of truth: Docs/PRD.md §17, Docs/architecture.md §11.3/§11.4, §7, §13.
--
-- Scope: ONE trusted PostgreSQL function that performs, inside a single
-- transaction, the entire Teacher decision workflow the Edge Function delegates
-- to it:
--
--   resolve + validate teacher (role=teacher, assigned_class_id)
--     -> lock request row
--     -> resolve student's class from the database
--     -> verify request belongs to teacher's class
--     -> verify status = AWAITING_TEACHER
--     -> atomic state transition (AWAITING_TEACHER -> DISMISSED | REJECTED)
--     -> atomic + immutable audit event (finalizing teacher, decision time)
--
-- Authoritative model (architecture §9.2, Phase 5 architectural rule):
--   The CLIENT is NEVER the authority. It supplies ONLY p_request_id (a
--   reference). Everything else is derived server-side:
--     - the teacher identity (p_teacher_id) is supplied by the trusted Edge
--       Function from the verified JWT, and is RE-DERIVED here from public.users
--       so the function is self-authorizing and cannot be tricked by a wrong id;
--     - the teacher role + class scope come from public.users;
--     - the student's class comes from public.students;
--     - the request status comes from public.dismissal_requests.
--   No student_id / teacher_id / class_id / role / status / approved_by /
--   rejected_by is ever accepted from the client.
--
-- Concurrency (Phase 5 STEP 7, §7.4): `select ... for update` on the request row
-- serializes two simultaneous decisions on the SAME request, so exactly one
-- transaction can transition it. The status-guard on the UPDATE makes it affect 0
-- rows if another transaction already moved the request, and the loser then
-- surfaces REQUEST_NOT_AWAITING_TEACHER. Exactly one final decision, exactly one
-- audit event.
--
-- The Edge Functions (supabase/functions/approve-dismissal, reject-dismissal) are
-- the ONLY callers and are the ONLY place that authenticates the caller and
-- enforces role = teacher. This function is therefore granted EXECUTE to the
-- service role only; anon and authenticated clients cannot call
-- /rpc/teacher_decide_request directly and bypass the Teacher role check.

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
  v_request          public.dismissal_requests%rowtype;
  v_student_class    uuid;
  v_teacher_role     text;
  v_teacher_class    uuid;
  v_events_affected  int;
begin
  -- Validate the decision value up front. Only the two Phase 5 transitions are
  -- permitted (architecture §7.2). The Edge Function always passes one of these
  -- two literals, but the function defends the contract regardless.
  if p_decision is distinct from 'DISMISSED' and p_decision is distinct from 'REJECTED' then
    return query select false, 'INVALID_DECISION',
      p_request_id, null::uuid, null::text;
    return;
  end if;

  -- Resolve + validate the teacher identity and class scope from the database,
  -- never from the client. p_teacher_id is supplied by the trusted Edge Function
  -- (derived from the verified JWT), but we re-derive role/scope here so the
  -- function is self-authorizing and cannot be tricked by a wrong id.
  select u.role, u.assigned_class_id
    into v_teacher_role, v_teacher_class
  from public.users u
  where u.user_id = p_teacher_id;

  if v_teacher_role is distinct from 'teacher' or v_teacher_class is null then
    return query select false, 'TEACHER_REQUIRED',
      p_request_id, null::uuid, null::text;
    return;
  end if;

  -- Lock the request row so concurrent decisions on the SAME request serialize.
  select * into v_request
  from public.dismissal_requests dr
  where dr.request_id = p_request_id
  for update;

  if not found then
    return query select false, 'REQUEST_NOT_FOUND',
      p_request_id, null::uuid, null::text;
    return;
  end if;

  -- Resolve the student's class from the database (never from the client).
  select s.class_id into v_student_class
  from public.students s
  where s.student_id = v_request.student_id;

  if v_student_class is distinct from v_teacher_class then
    return query select false, 'TEACHER_CLASS_FORBIDDEN',
      p_request_id, v_request.student_id, v_request.status::text;
    return;
  end if;

  -- Only AWAITING_TEACHER may be decided. The status guard on the UPDATE below is
  -- the concurrency-safe final check: if another transaction already moved the
  -- request, that UPDATE affects 0 rows and we surface a safe conflict.
  if v_request.status <> 'AWAITING_TEACHER' then
    return query select false, 'REQUEST_NOT_AWAITING_TEACHER',
      p_request_id, v_request.student_id, v_request.status::text;
    return;
  end if;

  -- Atomic state transition. The WHERE status='AWAITING_TEACHER' makes this
  -- affect exactly one row (or zero if a concurrent decision already won).
  update public.dismissal_requests dr
  set status = p_decision::public.dismissal_status,
      updated_at = now()
  where dr.request_id = p_request_id
    and dr.status = 'AWAITING_TEACHER';

  -- Append/complete the immutable audit event for this request (architecture
  -- §11.3/§11.4). We finalize the row the scan created: set the deciding teacher,
  -- the decision time, and the final status. The schema has a single actor column
  -- (approved_by) which records the finalizing teacher for BOTH approve and
  -- reject, discriminated by final_status. If no such row exists (defensive), we
  -- insert one. Exactly one audit row results.
  update public.dismissal_events de
  set approved_by = p_teacher_id,
      approval_time = now(),
      final_status = p_decision
  where de.request_id = p_request_id;

  get diagnostics v_events_affected = row_count;

  if v_events_affected = 0 then
    insert into public.dismissal_events (
      request_id, student_id, approved_by, approval_time, final_status
    ) values (
      p_request_id, v_request.student_id, p_teacher_id, now(), p_decision
    );
  end if;

  return query select true, 'OK',
    p_request_id, v_request.student_id, p_decision;
  return;
end;
$$;

-- -----------------------------------------------------------------------------
-- Authorization: only the trusted Edge Functions (service role) may execute this.
-- Supabase's default schema ACL grants EXECUTE on public-schema functions to anon
-- and authenticated individually; revoking from PUBLIC alone is NOT sufficient.
-- Revoke from anon and authenticated, grant to service_role only.
-- -----------------------------------------------------------------------------
revoke execute on function public.teacher_decide_request(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.teacher_decide_request(uuid, text, uuid) to service_role;
