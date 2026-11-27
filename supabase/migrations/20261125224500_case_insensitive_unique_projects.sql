-- Merge duplicate projects case-insensitively and ensure a case-insensitive unique constraint
-- This fixes the issue where ntg841013/repo and NTG841013/repo could both exist

-- 1. Identify and merge duplicate projects
WITH project_groups AS (
  SELECT 
    id,
    organization_id,
    LOWER(repo_url) as lower_url,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, LOWER(repo_url) 
      ORDER BY created_at ASC
    ) as rank,
    FIRST_VALUE(id) OVER (
      PARTITION BY organization_id, LOWER(repo_url) 
      ORDER BY created_at ASC
    ) as canonical_id
  FROM public.projects
),
duplicates AS (
  SELECT id, canonical_id
  FROM project_groups
  WHERE rank > 1
)
-- Update all analyses that point to a duplicate project to point to the canonical one instead
UPDATE public.analyses a
SET project_id = d.canonical_id
FROM duplicates d
WHERE a.project_id = d.id;

-- Delete the duplicate project records
DELETE FROM public.projects
WHERE id IN (SELECT id FROM duplicates);

-- 2. Identify and merge duplicate analyses for the same project
-- Since the goal is "one analysis per repository", we keep only the most recent one
WITH analysis_groups AS (
  SELECT 
    id,
    project_id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id 
      ORDER BY created_at DESC
    ) as rank
  FROM public.analyses
),
analysis_duplicates AS (
  SELECT id
  FROM analysis_groups
  WHERE rank > 1
)
DELETE FROM public.analyses
WHERE id IN (SELECT id FROM analysis_duplicates);

-- 3. Normalize all remaining project data to lowercase for consistency
UPDATE public.projects
SET repo_url = LOWER(repo_url), name = LOWER(name);

-- 4. Drop any existing unique constraint that might be case-sensitive
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS projects_organization_id_repo_url_key;

-- 5. Create a case-insensitive unique index
-- This prevents future duplicates even if the application fails to lowercase the input
DROP INDEX IF EXISTS projects_org_repo_lower_idx;
CREATE UNIQUE INDEX projects_org_repo_lower_idx 
ON public.projects (organization_id, LOWER(repo_url));

-- 6. Also ensure the name is unique per organization if desired (optional but good)
-- We don't do this here as repo_url is the primary identifier.
