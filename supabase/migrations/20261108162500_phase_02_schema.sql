-- Organizations table to support foreign keys and cascading deletes
create table public.organizations (
  id text primary key,
  name text,
  created_at timestamptz not null default now()
);

-- The eight tables required by Phase 2
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  repo_url text not null,
  organization_id text not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  status text not null check (status in ('pending', 'running', 'completed', 'failed')),
  organization_id text not null references public.organizations(id) on delete cascade,
  commit_hash text,
  finished_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  path text not null,
  content_summary text,
  organization_id text not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.edges (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  from_file_id uuid not null references public.files(id) on delete cascade,
  to_file_id uuid not null references public.files(id) on delete cascade,
  organization_id text not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  path text not null,
  method text not null,
  handler_file_id uuid references public.files(id) on delete set null,
  organization_id text not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.explanations (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  target_id uuid not null,
  text text not null,
  organization_id text not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.file_roles (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  role text not null,
  organization_id text not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  text text not null,
  type text not null,
  organization_id text not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Enable RLS on all tables
alter table public.organizations enable row level security;
alter table public.projects enable row level security;
alter table public.analyses enable row level security;
alter table public.files enable row level security;
alter table public.edges enable row level security;
alter table public.routes enable row level security;
alter table public.explanations enable row level security;
alter table public.file_roles enable row level security;
alter table public.insights enable row level security;

-- RLS Policies
create policy "Users can view their organization" on public.organizations
  for select to authenticated using (id = (auth.jwt() ->> 'org_id'));

create policy "Users can access projects of their organization" on public.projects
  for all to authenticated using (organization_id = (auth.jwt() ->> 'org_id'));

create policy "Users can access analyses of their organization" on public.analyses
  for all to authenticated using (organization_id = (auth.jwt() ->> 'org_id'));

create policy "Users can access files of their organization" on public.files
  for all to authenticated using (organization_id = (auth.jwt() ->> 'org_id'));

create policy "Users can access edges of their organization" on public.edges
  for all to authenticated using (organization_id = (auth.jwt() ->> 'org_id'));

create policy "Users can access routes of their organization" on public.routes
  for all to authenticated using (organization_id = (auth.jwt() ->> 'org_id'));

create policy "Users can access explanations of their organization" on public.explanations
  for all to authenticated using (organization_id = (auth.jwt() ->> 'org_id'));

create policy "Users can access file_roles of their organization" on public.file_roles
  for all to authenticated using (organization_id = (auth.jwt() ->> 'org_id'));

create policy "Users can access insights of their organization" on public.insights
  for all to authenticated using (organization_id = (auth.jwt() ->> 'org_id'));

-- Update record_clerk_org_event function to sync organizations table
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
  p_role text default null
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

  -- Sync organizations table
  if p_event_type = 'organization.created' then
    insert into public.organizations (id)
    values (p_organization_id)
    on conflict (id) do nothing;
  end if;

  -- Handle organization deletion event
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

  -- Record audit event
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
end;
$$;

-- Revoke default execution from public, anon, and authenticated
revoke execute on function public.record_clerk_org_event(text, text, text, timestamptz, text, text, text, text, text, text) from public;
revoke execute on function public.record_clerk_org_event(text, text, text, timestamptz, text, text, text, text, text, text) from anon;
revoke execute on function public.record_clerk_org_event(text, text, text, timestamptz, text, text, text, text, text, text) from authenticated;

-- Grant execution to service_role
grant execute on function public.record_clerk_org_event(text, text, text, timestamptz, text, text, text, text, text, text) to service_role;
