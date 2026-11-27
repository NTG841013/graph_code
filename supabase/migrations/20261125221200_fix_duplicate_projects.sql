-- Lowercase all repo_urls and names to ensure consistency
UPDATE public.projects
SET repo_url = LOWER(repo_url), name = LOWER(name);

-- Merge duplicate projects for the same organization and repo_url
-- We keep the oldest project (earliest created_at) as the canonical one
WITH duplicate_projects AS (
  SELECT 
    id,
    organization_id,
    repo_url,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, repo_url 
      ORDER BY created_at ASC
    ) as rank
  FROM public.projects
),
canonical_projects AS (
  SELECT id, organization_id, repo_url
  FROM duplicate_projects
  WHERE rank = 1
),
projects_to_delete AS (
  SELECT d.id as old_id, c.id as canonical_id
  FROM duplicate_projects d
  JOIN canonical_projects c ON d.organization_id = c.organization_id AND d.repo_url = c.repo_url
  WHERE d.rank > 1
)
-- Update analyses to point to the canonical project
UPDATE public.analyses a
SET project_id = ptd.canonical_id
FROM projects_to_delete ptd
WHERE a.project_id = ptd.old_id;

-- Now delete the duplicate projects
DELETE FROM public.projects
WHERE id IN (
  SELECT old_id FROM projects_to_delete
);

-- Add unique constraint to prevent future duplicates
-- This assumes all repo_urls are now lowercased and unique per organization
ALTER TABLE public.projects 
ADD CONSTRAINT projects_organization_id_repo_url_key UNIQUE (organization_id, repo_url);
