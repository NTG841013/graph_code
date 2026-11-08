-- Make RLS policies case-insensitive for organization_id to handle potential casing mismatches
drop policy if exists "Users can view their organization" on public.organizations;
create policy "Users can view their organization" on public.organizations
  for select to authenticated using (lower(id) = lower(auth.jwt() ->> 'org_id'));

drop policy if exists "Users can access projects of their organization" on public.projects;
create policy "Users can access projects of their organization" on public.projects
  for all to authenticated using (lower(organization_id) = lower(auth.jwt() ->> 'org_id'));

drop policy if exists "Users can access analyses of their organization" on public.analyses;
create policy "Users can access analyses of their organization" on public.analyses
  for all to authenticated using (lower(organization_id) = lower(auth.jwt() ->> 'org_id'));

drop policy if exists "Users can access files of their organization" on public.files;
create policy "Users can access files of their organization" on public.files
  for all to authenticated using (lower(organization_id) = lower(auth.jwt() ->> 'org_id'));

drop policy if exists "Users can access edges of their organization" on public.edges;
create policy "Users can access edges of their organization" on public.edges
  for all to authenticated using (lower(organization_id) = lower(auth.jwt() ->> 'org_id'));

drop policy if exists "Users can access routes of their organization" on public.routes;
create policy "Users can access routes of their organization" on public.routes
  for all to authenticated using (lower(organization_id) = lower(auth.jwt() ->> 'org_id'));

drop policy if exists "Users can access explanations of their organization" on public.explanations;
create policy "Users can access explanations of their organization" on public.explanations
  for all to authenticated using (lower(organization_id) = lower(auth.jwt() ->> 'org_id'));

drop policy if exists "Users can access file_roles of their organization" on public.file_roles;
create policy "Users can access file_roles of their organization" on public.file_roles
  for all to authenticated using (lower(organization_id) = lower(auth.jwt() ->> 'org_id'));

drop policy if exists "Users can access insights of their organization" on public.insights;
create policy "Users can access insights of their organization" on public.insights
  for all to authenticated using (lower(organization_id) = lower(auth.jwt() ->> 'org_id'));
