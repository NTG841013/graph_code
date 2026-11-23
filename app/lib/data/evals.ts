import { getSupabaseAdmin } from "@/lib/data/supabase-admin";

export async function getEvalExperiments() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('eval_experiments')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getRecentExplanations() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('explanations')
    .select('target_path, text, invented_paths, evaluation_score, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}
