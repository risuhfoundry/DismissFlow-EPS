-- =============================================================================
-- DismissFlow EPS — Fix: expire the dismissal request when its QR is scanned
-- after expiry (Finding 1).
-- =============================================================================
-- Root cause: in consume_qr_scan(), the QR_EXPIRED branch only marked the
-- qr_tokens row EXPIRED. The linked dismissal_requests row was left at
-- 'REQUESTED' forever. Consequences:
--   * The parent-facing EXPIRED outcome (OutcomeCard branch in app/parent,
--     StatusPill 'EXPIRED' copy) was unreachable dead code.
--   * The one-active-request partial unique index kept the slot occupied, so
--     the parent could not create a fresh REQUESTED request for the same
--     student (23505 on the next create).
--
-- Fix: in the QR_EXPIRED branch, also transition the linked request to
-- 'EXPIRED' when it is still 'REQUESTED'. The UPDATE is guarded so it is a
-- no-op if the request already advanced (defensive — an expired token cannot
-- have advanced, but the guard is cheap and safe). This runs inside the same
-- transaction as the qr_tokens update, so the two stay consistent.
--
-- NOTE: this does not cover the unscanned-expiry case (a REQUESTED request
-- whose QR simply ages out without ever being scanned). That needs a scheduled
-- reaper (pg_cron) and is intentionally out of scope here to avoid redesign.
--
-- Re-applies the RPC execute lockdown (idempotent) so the replaced function
-- keeps service_role-only execution.
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
    -- Qualify with alias dr: `v_request` (dismissal_requests%rowtype) exposes a
    -- request_id field, so an unqualified reference would be ambiguous (the same
    -- class of bug fixed in migration 0005).
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
