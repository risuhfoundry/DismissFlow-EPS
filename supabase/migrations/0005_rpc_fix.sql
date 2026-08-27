-- =============================================================================
-- DismissFlow EPS — Phase 4 corrective: fix consume_qr_scan() runtime ambiguity
-- =============================================================================
-- Source of truth: runtime verification against the live project surfaced a
-- PL/pgSQL error: "column reference request_id is ambiguous" in the
-- `update public.dismissal_requests ... where request_id = v_token.request_id`
-- statement. The PL/pgSQL variable `v_request public.dismissal_requests%rowtype`
-- exposes a `request_id` field, which collides with the table column reference.
-- The function compiled (CREATE FUNCTION succeeds) but failed on invocation.
--
-- Fix: qualify the target columns with a table alias `dr` so there is no
-- ambiguity with the v_request variable's fields. This is a behaviour-preserving
-- change (same transitions / audit / return contract).
--
-- Re-applies the RPC lockdown (idempotent) so the replaced function keeps its
-- execute privileges (service_role only).

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
