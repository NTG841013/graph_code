-- Phase 7: Pipeline columns and Realtime progress setup

-- 1. Add progress and coverage columns to analyses
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS stage text;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS stage_message text;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS total_files integer;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS parsed_files integer;

-- 2. Enable Realtime for the analyses table
ALTER PUBLICATION supabase_realtime ADD TABLE public.analyses;

-- 3. Register the realtime.messages table in the publication for Broadcast from Database
-- We use a filtered publication if possible, or just add it to supabase_realtime.
-- Since Supabase Realtime listens to supabase_realtime publication by default:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'realtime' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE realtime.messages;
  END IF;
END $$;

-- 4. Secure the realtime.messages table (Already enabled by default in Supabase)
-- ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- 5. Policy for subscribing to analysis progress
-- This allows users to join a private channel for a specific analysis
-- if they belong to the same organization.
CREATE POLICY "Users can subscribe to their analysis channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (topic ~ '^analysis:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') AND
  (
    SELECT organization_id FROM public.analyses
    WHERE id::text = split_part(topic, ':', 2)
  ) = (auth.jwt() ->> 'org_id')
);

-- 6. Trigger to broadcast progress updates
CREATE OR REPLACE FUNCTION public.on_analysis_progress_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only broadcast if stage, message or status changed
  IF (OLD.stage IS DISTINCT FROM NEW.stage OR 
      OLD.stage_message IS DISTINCT FROM NEW.stage_message OR
      OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM realtime.send(
      payload := jsonb_build_object(
        'stage', NEW.stage,
        'message', NEW.stage_message,
        'status', NEW.status
      ),
      event := 'progress',
      topic := 'analysis:' || NEW.id::text,
      private := true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Trigger functions must be executable by whoever performs the action
REVOKE EXECUTE ON FUNCTION public.on_analysis_progress_update() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.on_analysis_progress_update() TO authenticated;
GRANT EXECUTE ON FUNCTION public.on_analysis_progress_update() TO service_role;

-- To broadcast, the invoker needs permission to call the realtime utility
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT USAGE ON SCHEMA realtime TO service_role;
GRANT EXECUTE ON FUNCTION realtime.send(jsonb, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION realtime.send(jsonb, text, text, boolean) TO service_role;

CREATE TRIGGER analysis_progress_broadcast
  AFTER UPDATE ON public.analyses
  FOR EACH ROW
  WHEN (OLD.stage IS DISTINCT FROM NEW.stage OR 
        OLD.stage_message IS DISTINCT FROM NEW.stage_message OR
        OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.on_analysis_progress_update();

-- 7. Add comments for clarity
COMMENT ON COLUMN public.analyses.stage IS 'Current named stage of the analysis pipeline (e.g., fetching, parsing)';
COMMENT ON COLUMN public.analyses.stage_message IS 'Live progress message for the current stage';
COMMENT ON COLUMN public.analyses.total_files IS 'Total number of files found in the repository';
COMMENT ON COLUMN public.analyses.parsed_files IS 'Number of files successfully parsed and included in the graph';
