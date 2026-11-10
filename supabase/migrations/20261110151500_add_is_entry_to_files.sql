-- Add is_entry column to files table
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS is_entry boolean DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.files.is_entry IS 'Whether the file is an entry point (e.g., page, middleware, config)';
