-- Phase 11: Evals
ALTER TABLE public.explanations ADD COLUMN IF NOT EXISTS input_paths text[];
ALTER TABLE public.explanations ADD COLUMN IF NOT EXISTS invented_paths text[];
ALTER TABLE public.explanations ADD COLUMN IF NOT EXISTS evaluation_score float;

-- Index for evaluation
CREATE INDEX IF NOT EXISTS idx_explanations_eval_score ON public.explanations (evaluation_score) WHERE evaluation_score < 1.0;
