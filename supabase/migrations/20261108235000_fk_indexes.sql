-- Add missing indexes for foreign keys to improve join and delete performance
-- Requirement: Index foreign key columns to prevent full table scans

-- Projects
create index projects_organization_id_idx on public.projects (organization_id);

-- Analyses
create index analyses_project_id_idx on public.analyses (project_id);
create index analyses_organization_id_idx on public.analyses (organization_id);

-- Files
create index files_analysis_id_idx on public.files (analysis_id);
create index files_organization_id_idx on public.files (organization_id);

-- Edges
create index edges_analysis_id_idx on public.edges (analysis_id);
create index edges_from_file_id_idx on public.edges (from_file_id);
create index edges_to_file_id_idx on public.edges (to_file_id);
create index edges_organization_id_idx on public.edges (organization_id);

-- Routes
create index routes_analysis_id_idx on public.routes (analysis_id);
create index routes_handler_file_id_idx on public.routes (handler_file_id);
create index routes_organization_id_idx on public.routes (organization_id);

-- Explanations
create index explanations_analysis_id_idx on public.explanations (analysis_id);
create index explanations_organization_id_idx on public.explanations (organization_id);

-- File Roles
create index file_roles_analysis_id_idx on public.file_roles (analysis_id);
create index file_roles_file_id_idx on public.file_roles (file_id);
create index file_roles_organization_id_idx on public.file_roles (organization_id);

-- Insights
create index insights_analysis_id_idx on public.insights (analysis_id);
create index insights_organization_id_idx on public.insights (organization_id);
