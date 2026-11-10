import { getSupabaseAdmin } from "./supabase-admin";
import { AnalysisResult } from "../parser/types";
import { Database, Json } from "@/app/lib/supabase/database.types";

export async function saveAnalysisResults(
  analysisId: string,
  organizationId: string,
  results: AnalysisResult
) {
  const supabase = getSupabaseAdmin();

  // 0. Cleanup old results for this analysis
  // Since we are rerunning on the same analysis ID, we must clear old data.
  // We delete them manually because we are keeping the analysis record itself.
  await supabase.from('edges').delete().eq('analysis_id', analysisId);
  await supabase.from('file_roles').delete().eq('analysis_id', analysisId);
  await supabase.from('routes').delete().eq('analysis_id', analysisId);
  await supabase.from('insights').delete().eq('analysis_id', analysisId);
  await supabase.from('explanations').delete().eq('analysis_id', analysisId);
  await supabase.from('files').delete().eq('analysis_id', analysisId);

  // 1. Save Files
  // We insert them all at once. We need to handle large repos by batching if necessary.
  // For now, we'll try to insert in chunks of 1000.
  const nodes = results.nodes;
  const BATCH_SIZE = 1000;
  
  const insertedFiles: { id: string; path: string }[] = [];
  
  for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
    const chunk = nodes.slice(i, i + BATCH_SIZE).map(node => ({
      analysis_id: analysisId,
      organization_id: organizationId,
      path: node.path,
      line_count: node.lineCount,
      hash: node.hash,
      is_entry: node.isEntry,
      content_summary: null
    }));

    const { data, error } = await supabase
      .from('files')
      .insert(chunk)
      .select('id, path');

    if (error) throw new Error(`Failed to save files: ${error.message}`);
    if (data) insertedFiles.push(...data);
  }

  // Create map of path -> id
  const fileIdMap = new Map(insertedFiles.map(f => [f.path, f.id]));

  // 1.5 Save Roles
  const roles = nodes.map(node => {
    const fileId = fileIdMap.get(node.path);
    if (!fileId || !node.role) return null;
    return {
      analysis_id: analysisId,
      organization_id: organizationId,
      file_id: fileId,
      role: node.role
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  for (let i = 0; i < roles.length; i += BATCH_SIZE) {
    const chunk = roles.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('file_roles')
      .insert(chunk);
    if (error) throw new Error(`Failed to save roles: ${error.message}`);
  }

  // 2. Save Edges
  const edges = results.edges.map(edge => {
    const fromId = fileIdMap.get(edge.from);
    const toId = fileIdMap.get(edge.to);
    if (!fromId || !toId) return null;
    return {
      analysis_id: analysisId,
      organization_id: organizationId,
      from_file_id: fromId,
      to_file_id: toId
    };
  }).filter((e): e is NonNullable<typeof e> => e !== null);

  for (let i = 0; i < edges.length; i += BATCH_SIZE) {
    const chunk = edges.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('edges')
      .insert(chunk);
    if (error) throw new Error(`Failed to save edges: ${error.message}`);
  }
  
  // 2.5 Save Routes
  const routes = results.routes.map(route => {
    const fileId = fileIdMap.get(route.file);
    return {
      analysis_id: analysisId,
      organization_id: organizationId,
      path: route.path,
      method: route.method,
      handler_file_id: fileId || null,
      line_number: route.line ?? null
    };
  });

  for (let i = 0; i < routes.length; i += BATCH_SIZE) {
    const chunk = routes.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('routes')
      .insert(chunk);
    if (error) throw new Error(`Failed to save routes: ${error.message}`);
  }

  // 3. Update Analysis with stats and status
  const { error: updateError } = await supabase
    .from('analyses')
    .update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      stage: 'done',
      stage_message: 'Analysis complete',
      total_files: results.stats.totalFiles,
      parsed_files: results.stats.parsedFiles,
      framework: results.framework as unknown as Json
    })
    .eq('id', analysisId);

  if (updateError) throw new Error(`Failed to update analysis: ${updateError.message}`);
}

export async function updateAnalysisProgress(
  analysisId: string,
  stage: string,
  message: string,
  status: 'pending' | 'running' | 'completed' | 'failed' = 'running',
  commitHash?: string
) {
  const supabase = getSupabaseAdmin();
  const updateData: Database['public']['Tables']['analyses']['Update'] = {
    stage,
    stage_message: message,
    status
  };
  
  if (commitHash) {
    updateData.commit_hash = commitHash;
  }

  const { error } = await supabase
    .from('analyses')
    .update(updateData)
    .eq('id', analysisId);
  
  if (error) {
    console.error(`Failed to update progress for ${analysisId}:`, error);
  }
}

export async function failAnalysis(analysisId: string, message: string, stage: string = 'failed') {
  const supabase = getSupabaseAdmin();
  await supabase
    .from('analyses')
    .update({
      status: 'failed',
      error_message: message,
      stage,
      stage_message: message,
      finished_at: new Date().toISOString()
    })
    .eq('id', analysisId);
}
