-- Phase 11: Eval Experiments
CREATE TABLE IF NOT EXISTS public.eval_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  dataset_size int NOT NULL,
  score_a float NOT NULL,
  score_b float NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
