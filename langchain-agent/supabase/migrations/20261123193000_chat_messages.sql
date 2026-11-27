-- Add chat_messages table for persistence
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  tool_calls jsonb default '[]'::jsonb,
  organization_id text not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.chat_messages enable row level security;

-- RLS Policy
create policy "Users can access chat_messages of their organization" on public.chat_messages
  for all to authenticated
  using (organization_id = (auth.jwt() ->> 'org_id'))
  with check (organization_id = (auth.jwt() ->> 'org_id'));

-- Index for performance
create index idx_chat_messages_analysis_id on public.chat_messages(analysis_id);
