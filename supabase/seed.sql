-- Clear existing data
truncate public.organizations cascade;

-- Seed organizations
insert into public.organizations (id, name) values 
  ('org_3Ln7SFWwMEdWcJ7eMdVniE3Rvvb', 'Test'),
  ('org_3Ln55JLZyvDKXGeMoxbcP9kucQE', 'Nhlanhla''s Organization');

-- Seed projects
insert into public.projects (id, name, repo_url, organization_id)
values 
  ('10000000-0000-0000-0000-000000000000', 'tailwindlabs/tailwindcss', 'https://github.com/tailwindlabs/tailwindcss', 'org_3Ln7SFWwMEdWcJ7eMdVniE3Rvvb'),
  ('10000000-0000-0000-0000-000000000001', 'vercel/next.js', 'https://github.com/vercel/next.js', 'org_3Ln7SFWwMEdWcJ7eMdVniE3Rvvb'),
  ('10000000-0000-0000-0000-000000000002', 'shadcn-ui/ui', 'https://github.com/shadcn-ui/ui', 'org_3Ln55JLZyvDKXGeMoxbcP9kucQE');

-- Seed analyses
insert into public.analyses (id, project_id, status, organization_id, created_at, finished_at, commit_hash, error_message)
values
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000000', 'pending', 'org_3Ln7SFWwMEdWcJ7eMdVniE3Rvvb', now() - interval '20 minutes', null, null, null),
  ('11000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'running', 'org_3Ln7SFWwMEdWcJ7eMdVniE3Rvvb', now() - interval '21 minutes', null, 'a93be01', null),
  ('11000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'failed', 'org_3Ln55JLZyvDKXGeMoxbcP9kucQE', now() - interval '5 hours', now() - interval '5 hours', null, 'Repository archive download timed out'),
  ('11000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'completed', 'org_3Ln55JLZyvDKXGeMoxbcP9kucQE', now() - interval '24 hours', now() - interval '24 hours', '0c7d9e2', null),
  ('11000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'completed', 'org_3Ln7SFWwMEdWcJ7eMdVniE3Rvvb', now() - interval '3 days', now() - interval '3 days', '4f1c2a9', null);

-- Seed a few files for the completed analysis
insert into public.files (id, analysis_id, path, organization_id)
values
  ('10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000004', 'src/index.ts', 'org_3Ln55JLZyvDKXGeMoxbcP9kucQE'),
  ('10000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000004', 'src/parser.ts', 'org_3Ln55JLZyvDKXGeMoxbcP9kucQE');

-- Seed an edge
insert into public.edges (analysis_id, from_file_id, to_file_id, organization_id)
values
  ('11000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'org_3Ln55JLZyvDKXGeMoxbcP9kucQE');
