import { getAnalysis } from "@/app/lib/data/analyses";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { fetchAll } from "@/app/lib/supabase/utils";
import { Explorer } from "./explorer";
import { notFound } from "next/navigation";
import { FileNode, Edge, Route } from "@/lib/parser/types";
import { Suspense } from "react";
import { AppHeader } from "@/app/components/app-header";

export default function RepoPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  return (
    <Suspense fallback={<RepoLoading />}>
      <RepoContent params={params} />
    </Suspense>
  );
}

async function RepoContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);

  if (!analysis) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  
  // 1. Fetch files, edges, roles and routes
  const [dbFiles, dbEdgesRaw, dbRoles, dbRoutes] = await Promise.all([
    fetchAll<{ id: string; path: string; line_count: number | null; hash: string | null; is_entry: boolean | null }>(
      supabase
        .from('files')
        .select('id, path, line_count, hash, is_entry')
        .eq('analysis_id', id)
    ),
    fetchAll<{ id: string; from: { path: string }; to: { path: string } }>(
      supabase
        .from('edges')
        .select(`
          id,
          from:from_file_id(path),
          to:to_file_id(path)
        `)
        .eq('analysis_id', id)
    ),
    fetchAll<{ file_id: string; role: string }>(
      supabase
        .from('file_roles')
        .select('file_id, role')
        .eq('analysis_id', id)
    ),
    fetchAll<{ method: string; path: string; handler_file_id: string | null; line_number: number | null }>(
      supabase
        .from('routes')
        .select('method, path, handler_file_id, line_number')
        .eq('analysis_id', id)
    )
  ]);
  
  interface DBEdge {
    id: string;
    from: { path: string };
    to: { path: string };
  }
  
  const dbEdges = (dbEdgesRaw as unknown) as DBEdge[];

  // 2. Reconstruct Edge objects
  const edges: Edge[] = dbEdges.map(e => ({
    from: e.from.path,
    to: e.to.path,
    type: 'import'
  }));

  // 3. Pre-calculate maps for performance
  const fanInMap = new Map<string, number>();
  const fanOutMap = new Map<string, number>();
  const roleMap = new Map<string, string>();
  
  edges.forEach(e => {
    fanInMap.set(e.to, (fanInMap.get(e.to) || 0) + 1);
    fanOutMap.set(e.from, (fanOutMap.get(e.from) || 0) + 1);
  });

  dbRoles.forEach(r => {
    roleMap.set(r.file_id, r.role);
  });

  const fileIdToPath = new Map(dbFiles.map(f => [f.id, f.path]));

  // 4. Reconstruct FileNode objects O(N)
  const fileNodes: FileNode[] = dbFiles.map(f => {
    const role = roleMap.get(f.id);
    return {
      path: f.path,
      folder: f.path.includes('/') ? f.path.substring(0, f.path.lastIndexOf('/')) : '.',
      lineCount: f.line_count || 0,
      hash: f.hash || '',
      fanIn: fanInMap.get(f.path) || 0,
      fanOut: fanOutMap.get(f.path) || 0,
      role,
      isEntry: !!f.is_entry
    };
  });

  // 5. Reconstruct Routes
  const routes: Route[] = dbRoutes.map(r => ({
    method: r.method,
    path: r.path,
    file: r.handler_file_id ? fileIdToPath.get(r.handler_file_id) || '' : '',
    line: r.line_number || undefined
  }));

  const aiStatus = {
    configured: !!process.env.OPENAI_API_KEY,
    tracing: process.env.LANGSMITH_TRACING === "true"
  };

  return (
    <Explorer 
      analysis={analysis}
      nodes={fileNodes}
      edges={edges}
      routes={routes}
      aiStatus={aiStatus}
    />
  );
}

function RepoLoading() {
  return (
    <div className="h-screen bg-background flex flex-col">
      <AppHeader returnTo="/" />
      <div className="flex-1 flex items-center justify-center font-mono">
        <div className="text-sm text-muted animate-pulse">
          Loading repository map...
        </div>
      </div>
    </div>
  );
}
