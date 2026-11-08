-- Final attempt to ensure analyses table has the required fields for the dashboard
-- These columns are required by the AnalysisList component to match the design in 1.png

alter table public.analyses add column if not exists commit_hash text;
alter table public.analyses add column if not exists finished_at timestamptz;
alter table public.analyses add column if not exists error_message text;

comment on column public.analyses.commit_hash is 'The git commit hash of the repository at the time of analysis';
comment on column public.analyses.finished_at is 'The time when the analysis process completed (or failed)';
comment on column public.analyses.error_message is 'The error message if the analysis failed';
