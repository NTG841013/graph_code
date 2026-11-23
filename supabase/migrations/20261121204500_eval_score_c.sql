-- Add score_c to eval_experiments to track V3 (Enhanced) prompt results
ALTER TABLE public.eval_experiments ADD COLUMN IF NOT EXISTS score_c float;
