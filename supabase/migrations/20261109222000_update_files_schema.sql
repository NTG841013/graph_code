-- Phase 7: Update files table with additional metadata
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS line_count integer;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS hash text;

-- Add comments
COMMENT ON COLUMN public.files.line_count IS 'Number of lines in the file';
COMMENT ON COLUMN public.files.hash IS 'Content hash of the file for change detection';
