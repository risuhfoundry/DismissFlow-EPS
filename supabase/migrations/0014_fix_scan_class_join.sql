-- =============================================================================
-- DismissFlow EPS — Fix: correct the class_name join in consume_qr_scan (Finding 3)
-- =============================================================================
-- Root cause: consume_qr_scan() built the gate's minimal student/class payload
-- with `left join public.classes c on c.class_id = s.student_id`. That joins the
-- classes primary key to the STUDENTS primary key, so it never matches and
-- class_name was ALWAYS null in the gate scan response. The gate scanner therefore
-- could never show which class a student belongs to. The correct join is on the
-- student's class_id: `c.class_id = s.class_id`.
--
-- This carries forward the Finding 1 fix (expire the linked request when its QR is
-- scanned after expiry) so the function is fully corrected in one place.
--
-- Re-applies the RPC execute lockdown (idempotent) so the replaced function keeps
-- service_role-only execution.
-- =============================================================================

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
  v_token   public.qr_tokens%rowtype;
  v_request public.dismissal_requests%rowtype;
  v_name    text;
  v_class   text;
begin
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

  if v_token.expires_at <= now() then
    update public.qr_tokens set status = 'EXPIRED' where token_id = v_token.token_id;
    -- Finding 1: also expire the linked request so the EXPIRED state is
    -- reachable and the one-active-request slot is freed for re-request.
    -- Qualify with alias dr: v_request (dismissal_requests%rowtype) exposes a
    -- request_id field, so an unqualified reference would be ambiguous.
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

  -- Finding 3: join on the student's class_id (NOT student_id). Previously this
  -- was `c.class_id = s.student_id`, which matched a class PK against a student PK
  -- and therefore never joined, leaving class_name permanently null.
  select s.name, c.class_name
    into v_name, v_class
  from public.students s
  left join public.classes c on c.class_id = s.class_id
  where s.student_id = v_request.student_id;

  insert into public.dismissal_events (
    request_id, student_id, scanned_by, scan_time, final_status
  ) values (
    v_request.request_id, v_request.student_id, p_scanned_by::text, now(), 'AWAITING_TEACHER'
  );

  return query select true, 'OK',
    v_request.request_id, v_name, v_class, 'AWAITING_TEACHER';
  return;
end;
$$;

revoke execute on function public.consume_qr_scan(text, uuid)
  from public, anon, authenticated;
grant execute on function public.consume_qr_scan(text, uuid) to service_role;
