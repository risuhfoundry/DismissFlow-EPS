-- =============================================================================
-- DismissFlow EPS — Phase 6: trusted Parent cancellation
-- =============================================================================
-- Source of truth: Docs/architecture.md §11.5, §7.
--
-- Scope: ONE trusted PostgreSQL function that performs, inside a single
-- transaction, the entire parent cancel workflow the Edge Function delegates:
--
--   resolve + validate parent (role=parent, linked_student_id)
--     -> lock request row
--     -> verify request belongs to linked student
--     -> verify status is in the active set (REQUESTED only — once scanned, a
--        parent cannot unilaterally cancel because the gate has already
--        acted; architecture §7.2)
--     -> atomic state transition (REQUESTED -> CANCELLED)
--     -> invalidate any associated qr_tokens row
--     -> append/complete the immutable audit event
--
-- Authoritative model (architecture §9.2, §11.5):
--   The CLIENT is NEVER the authority. It supplies ONLY p_request_id (a
--   reference). Everything else is derived server-side:
--     - the parent identity (p_parent_id) is supplied by the trusted Edge
--       Function from the verified JWT, and is RE-DERIVED here from public.users
--       so the function is self-authorizing and cannot be tricked by a wrong id.
--     - the parent role + linked student come from public.users.
--     - the request status comes from public.dismissal_requests.
--   No student_id / parent_id / role / status is ever accepted from the client.
--
-- Concurrency: `select ... for update` on the request row serializes two
-- simultaneous cancels on the SAME request, so exactly one transaction can
-- transition it. The status-guard on the UPDATE makes it affect 0 rows if
-- another transaction already moved the request, and the loser then surfaces
-- REQUEST_NOT_CANCELLABLE. Exactly one cancellation, exactly one audit.
--
-- The Edge Function (supabase/functions/cancel-dismissal) is the ONLY caller
-- and is the ONLY place that authenticates the caller and enforces the parent
-- role check. This function is therefore granted EXECUTE to the service role
-- only; anon and authenticated clients cannot call /rpc/parent_cancel_request
-- directly and bypass the Parent role check.

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
  v_request          public.dismissal_requests%rowtype;
  v_parent_role      text;
  v_parent_student   uuid;
begin
  -- Resolve + validate the parent identity and linked student from the database,
  -- never from the client. p_parent_id is supplied by the trusted Edge Function
  -- (derived from the verified JWT), but we re-derive role/link here so the
  -- function is self-authorizing and cannot be tricked by a wrong id.
  select u.role, u.linked_student_id
    into v_parent_role, v_parent_student
  from public.users u
  where u.user_id = p_parent_id;

  if v_parent_role is distinct from 'parent' or v_parent_student is null then
    return query select false, 'PARENT_REQUIRED',
      p_request_id, null::uuid, null::text;
    return;
  end if;

  -- Lock the request row so concurrent cancels on the SAME request serialize.
  select * into v_request
  from public.dismissal_requests dr
  where dr.request_id = p_request_id
  for update;

  if not found then
    return query select false, 'REQUEST_NOT_FOUND',
      p_request_id, null::uuid, null::text;
    return;
  end if;

  -- The request must belong to the parent's linked student.
  if v_request.student_id is distinct from v_parent_student then
    return query select false, 'PARENT_STUDENT_FORBIDDEN',
      p_request_id, v_request.student_id, v_request.status::text;
    return;
  end if;

  -- Only REQUESTED may be cancelled by a parent. Once the gate has scanned
  -- (AWAITING_TEACHER) the parent cannot unilaterally cancel because the
  -- teacher is in the loop (architecture §7.2). The status guard on the UPDATE
  -- below is the concurrency-safe final check.
  if v_request.status <> 'REQUESTED' then
    return query select false, 'REQUEST_NOT_CANCELLABLE',
      p_request_id, v_request.student_id, v_request.status::text;
    return;
  end if;

  -- Atomic state transition.
  update public.dismissal_requests dr
  set status = 'CANCELLED', updated_at = now()
  where dr.request_id = p_request_id
    and dr.status = 'REQUESTED';

  -- Invalidate any associated qr_tokens so a stale QR can never be honoured.
  -- NOTE: qualify request_id/status — the function's RETURN TABLE declares OUT
  -- columns of the same names, so unqualified refs here raise 42702 (ambiguous).
  update public.qr_tokens
  set status = 'EXPIRED'
  where qr_tokens.request_id = p_request_id
    and qr_tokens.status = 'VALID';

  -- Append/complete the immutable audit event for this request.
  update public.dismissal_events de
  set final_status = 'CANCELLED'
  where de.request_id = p_request_id;

  if not found then
    insert into public.dismissal_events (
      request_id, student_id, final_status
    ) values (
      p_request_id, v_request.student_id, 'CANCELLED'
    );
  end if;

  return query select true, 'OK',
    p_request_id, v_request.student_id, 'CANCELLED';
  return;
end;
$$;

-- -----------------------------------------------------------------------------
-- Authorization: only the trusted Edge Function (service role) may execute this.
-- Supabase's default schema ACL grants EXECUTE on public-schema functions to anon
-- and authenticated individually; revoking from PUBLIC alone is NOT sufficient.
-- Revoke from anon and authenticated, grant to service_role only.
-- -----------------------------------------------------------------------------
revoke execute on function public.parent_cancel_request(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.parent_cancel_request(uuid, uuid) to service_role;
