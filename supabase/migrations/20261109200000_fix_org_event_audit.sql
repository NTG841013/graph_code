-- Replace record_clerk_org_event function to fix organization rename blocking
-- This ensures existing databases receive the fix where name-bearing events
-- were incorrectly blocked by newer membership/invitation events.

create or replace function public.record_clerk_org_event(
  p_event_id text,
  p_organization_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_actor_user_id text default null,
  p_subject_user_id text default null,
  p_membership_id text default null,
  p_invitation_id text default null,
  p_invited_email text default null,
  p_role text default null,
  p_name text default null
)
returns void
language plpgsql
security invoker
as $$
begin
  -- Use organization ID as a transaction scoped advisory lock key
  perform pg_advisory_xact_lock(hashtext(p_organization_id));

  -- Check if organization is already deleted
  if exists (select 1 from public.deleted_organizations where organization_id = p_organization_id) then
    return;
  end if;

  -- Handle organization deletion event immediately
  if p_event_type = 'organization.deleted' then
    insert into public.deleted_organizations (
      organization_id,
      deletion_event_id,
      deleted_at
    )
    values (
      p_organization_id,
      p_event_id,
      p_occurred_at
    )
    on conflict (organization_id) do nothing;

    -- Remove organization and audit rows (cascading will handle the 8 tables)
    delete from public.organizations where id = p_organization_id;
    delete from public.organization_audit_events 
    where organization_id = p_organization_id;
    
    return;
  end if;

  -- Record audit event first to ensure event-ID idempotency
  insert into public.organization_audit_events (
    event_id,
    organization_id,
    event_type,
    occurred_at,
    actor_user_id,
    subject_user_id,
    membership_id,
    invitation_id,
    invited_email,
    role
  )
  values (
    p_event_id,
    p_organization_id,
    p_event_type,
    p_occurred_at,
    p_actor_user_id,
    p_subject_user_id,
    p_membership_id,
    p_invitation_id,
    p_invited_email,
    p_role
  )
  on conflict (event_id) do nothing;

  -- Stop if the event was already processed (duplicate event_id)
  if not found then
    return;
  end if;

  -- Only sync name if this is the most recent event we have seen for this organization
  if p_event_type in ('organization.created', 'organization.updated') then
    insert into public.organizations (id, name)
    values (p_organization_id, p_name)
    on conflict (id) do update 
    set name = excluded.name
    where not exists (
      select 1 from public.organization_audit_events
      where organization_id = p_organization_id
        and event_type in ('organization.created', 'organization.updated')
        and occurred_at > p_occurred_at
    );
  end if;
end;
$$;

-- Revoke default execution from public, anon, and authenticated
revoke execute on function public.record_clerk_org_event(text, text, text, timestamptz, text, text, text, text, text, text, text) from public;
revoke execute on function public.record_clerk_org_event(text, text, text, timestamptz, text, text, text, text, text, text, text) from anon;
revoke execute on function public.record_clerk_org_event(text, text, text, timestamptz, text, text, text, text, text, text, text) from authenticated;

-- Grant execution to service_role
grant execute on function public.record_clerk_org_event(text, text, text, timestamptz, text, text, text, text, text, text, text) to service_role;
