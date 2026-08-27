-- =============================================================================
-- DismissFlow EPS — Phase 4: atomic QR scan (Gate verification)
-- =============================================================================
-- Source of truth: Docs/PRD.md §15, Docs/architecture.md §8.5, §11.2, Phase 4.
--
-- Scope: ONE trusted PostgreSQL function that performs, inside a single
-- transaction, the entire scan workflow the Edge Function delegates to it:
--
--   hash lookup  ->  expiry/state validation  ->  atomic single-use consume
--   ->  REQUESTED -> AWAITING_TEACHER  ->  scan audit event
--
-- Why a function and not ad-hoc Edge-Function SQL (architecture §8.5):
--   the token consume + request transition + audit insert must be ATOMIC so a
--   single QR can never be honoured twice and so we never leave
--   qr_tokens=USED with dismissal_requests still=REQUESTED. A `SELECT ... FOR
--   UPDATE` on the token serialises concurrent scans of the same token, so
--   exactly one transaction can consume it; the loser sees status='USED'.
--
-- The Edge Function (supabase/functions/scan-qr) is the ONLY caller and is the
-- ONLY place that performs auth/role checks (Docs/architecture.md §11.2). This
-- function is therefore granted EXECUTE to the service role only; anon and
-- authenticated clients cannot call /rpc/consume_qr_scan directly and bypass the
-- Gate role check.
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
  -- Serialise concurrent scans of the SAME token. The row lock forces the two
  -- scan transactions to run one-at-a-time, so only one can consume it.
  select * into v_token
  from public.qr_tokens
  where token_hash = p_token_hash
  for update;

  -- No such token (never issued, or a guessed hash). Do NOT distinguish this
  -- from "belongs to another request" — the lookup is by hash only, and we
  -- never reveal whether a hash maps to anything (Docs/architecture.md §8.5).
  if not found then
    return query select false, 'INVALID_QR',
      null::uuid, null::text, null::text, null::text;
    return;
  end if;

  -- Token already consumed — single-use enforcement.
  if v_token.status = 'USED' then
    return query select false, 'QR_ALREADY_USED',
      v_token.request_id, null::text, null::text, v_token.status;
    return;
  end if;

  -- Server-authoritative expiry (Docs/architecture.md §8.5). If a still-VALID
  -- token has aged out, mark it EXPIRED so the data stays honest, then reject.
  if v_token.expires_at <= now() then
    update public.qr_tokens set status = 'EXPIRED' where token_id = v_token.token_id;
    return query select false, 'QR_EXPIRED',
      v_token.request_id, null::text, null::text, 'EXPIRED';
    return;
  end if;

  -- Token is VALID and unexpired: consume it atomically (single-use).
  update public.qr_tokens
  set used_at = now(), status = 'USED'
  where token_id = v_token.token_id;

  -- Advance the request. Only REQUESTED may move to AWAITING_TEACHER in Phase 4.
  -- The guard `status = 'REQUESTED'` makes the UPDATE affect 0 rows if the
  -- request is already past REQUESTED; we then abort and roll back the token
  -- consume above so the two never desynchronise.
  update public.dismissal_requests dr
  set status = 'AWAITING_TEACHER', updated_at = now()
  where dr.request_id = v_token.request_id
    and dr.status = 'REQUESTED'
  returning * into v_request;

  if not found then
    -- Should not happen: a consumed token implies a prior successful scan. But
    -- defensively roll everything back and surface a safe 409.
    raise exception 'REQUEST_NOT_SCANNABLE';
  end if;

  -- Minimal student/class info for the gate response (NO guardian PII, NO token
  -- hash, NO admission number — Docs/PRD.md §15 minimal gate payload).
  select s.name, c.class_name
    into v_name, v_class
  from public.students s
  left join public.classes c on c.class_id = s.class_id
  where s.student_id = v_request.student_id;

  -- Append-only scan audit event. Service role bypasses RLS; all values are
  -- server-derived (scanned_by is the authenticated gate user id from the
  -- Edge Function, never client-supplied).
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

-- -----------------------------------------------------------------------------
-- Authorization: only the trusted Edge Function (service role) may execute this.
-- By default a freshly created function is granted EXECUTE to PUBLIC, which
-- would let anon/authenticated clients call /rpc/consume_qr_scan directly and
-- bypass the Gate role check. Revoke from PUBLIC, grant to service_role only.
-- -----------------------------------------------------------------------------
-- Supabase's default schema ACL grants EXECUTE on public-schema functions to
-- anon and authenticated individually (not only via the PUBLIC pseudo-role), so
-- revoking from PUBLIC alone is NOT sufficient. We must also revoke from anon and
-- authenticated explicitly, otherwise a holder of any valid JWT could call
-- /rpc/consume_qr_scan directly and bypass the Gate role check in the scan-qr
-- Edge Function (Docs/architecture.md §11.2). Only service_role may execute.
revoke execute on function public.consume_qr_scan(text, uuid)
  from public, anon, authenticated;
grant execute on function public.consume_qr_scan(text, uuid) to service_role;
