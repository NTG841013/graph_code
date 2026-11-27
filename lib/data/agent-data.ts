import { getSupabaseAdmin } from "./supabase-admin";
import { AnalysisResult, FileNode, Edge, Route } from "../parser/types";

export async function fetchAnalysisResult(analysisId: string): Promise<AnalysisResult> {
  const supabase = getSupabaseAdmin();

  // Fetch analysis stats and framework
  const { data: analysis, error: aError } = await supabase
    .from('analyses')
    .select('total_files, parsed_files, framework')
    .eq('id', analysisId)
    .single();

  if (aError || !analysis) throw new Error(`Analysis not found: ${aError?.message}`);

  // Fetch files
  const { data: files, error: fError } = await supabase
    .from('files')
    .select('id, path, line_count, hash, is_entry')
    .eq('analysis_id', analysisId);

  if (fError) throw new Error(`Files fetch failed: ${fError.message}`);

  // Fetch roles separately
  const { data: roles, error: roleError } = await supabase
    .from('file_roles')
    .select('file_id, role')
    .eq('analysis_id', analysisId);

  if (roleError) throw new Error(`Roles fetch failed: ${roleError.message}`);

  // Fetch edges
  const { data: edges, error: eError } = await supabase
    .from('edges')
    .select('from_file_id, to_file_id')
    .eq('analysis_id', analysisId);

  if (eError) throw new Error(`Edges fetch failed: ${eError.message}`);

  // Fetch routes
  const { data: routes, error: rError } = await supabase
    .from('routes')
    .select('path, method, handler_file_id')
    .eq('analysis_id', analysisId);

  if (rError) throw new Error(`Routes fetch failed: ${rError.message}`);

  const idToPath = new Map(files.map(f => [f.id, f.path]));
  const fileIdToRole = new Map(roles.map(r => [r.file_id, r.role]));

  const fanIn = new Map<string, number>();
  const fanOut = new Map<string, number>();
  edges.forEach(e => {
    const fromPath = idToPath.get(e.from_file_id);
    const toPath = idToPath.get(e.to_file_id);
    if (fromPath && toPath) {
      fanOut.set(fromPath, (fanOut.get(fromPath) || 0) + 1);
      fanIn.set(toPath, (fanIn.get(toPath) || 0) + 1);
    }
  });

  const nodes: FileNode[] = files.map(f => ({
    path: f.path,
    folder: f.path.substring(0, f.path.lastIndexOf('/')) || '.',
    lineCount: f.line_count || 0,
    hash: f.hash || '',
    fanIn: fanIn.get(f.path) || 0,
    fanOut: fanOut.get(f.path) || 0,
    isEntry: !!f.is_entry,
    role: fileIdToRole.get(f.id) || undefined
  }));

  const resultEdges: Edge[] = edges.map(e => {
    const from = idToPath.get(e.from_file_id);
    const to = idToPath.get(e.to_file_id);
    if (!from || !to) return null;
    return { from, to, type: 'import' as const };
  }).filter((e): e is { from: string; to: string; type: 'import' } => e !== null);

  const resultRoutes: Route[] = routes.map(r => {
    const file = r.handler_file_id ? idToPath.get(r.handler_file_id) : undefined;
    if (!file) return null;
    return {
      path: r.path,
      method: r.method,
      file: file
    };
  }).filter((r): r is { path: string; method: string; file: string } => r !== null);

  return {
    nodes,
    edges: resultEdges,
    routes: resultRoutes,
    unresolved: [],
    skipped: [],
    framework: analysis.framework as { name: string; categories: string[] } | undefined,
    stats: {
      totalFiles: analysis.total_files || 0,
      parsedFiles: analysis.parsed_files || 0,
      skippedFiles: (analysis.total_files || 0) - (analysis.parsed_files || 0)
    }
  };
}
