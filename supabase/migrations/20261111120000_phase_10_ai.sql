-- Phase 10: AI Explanations and Roles
ALTER TABLE public.explanations ADD COLUMN IF NOT EXISTS content_hash text;
ALTER TABLE public.explanations ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE public.explanations ADD COLUMN IF NOT EXISTS target_path text;

-- Allow target_id to be NULL (for folders which don't have a record in files table)
ALTER TABLE public.explanations ALTER COLUMN target_id DROP NOT NULL;

-- Index for cache lookup by content hash and model
CREATE INDEX IF NOT EXISTS idx_explanations_cache_lookup ON public.explanations (content_hash, model);

-- Add a column for target_type to explicitly distinguish
ALTER TABLE public.explanations ADD COLUMN IF NOT EXISTS target_type text CHECK (target_type IN ('file', 'folder'));
