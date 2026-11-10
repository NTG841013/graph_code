import { getAnalysis } from "@/app/lib/data/analyses";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { Explorer } from "./explorer";
import { notFound } from "next/navigation";
import { FileNode, Edge } from "@/lib/parser/types";
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
  
  // 1. Fetch files, edges and roles
  const [filesRes, edgesRes, rolesRes] = await Promise.all([
    supabase
      .from('files')
      .select('id, path, line_count, hash')
      .eq('analysis_id', id),
    supabase
      .from('edges')
      .select(`
        id,
        from:from_file_id(path),
        to:to_file_id(path)
      `)
      .eq('analysis_id', id),
    supabase
      .from('file_roles')
      .select('file_id, role')
      .eq('analysis_id', id)
  ]);

  if (filesRes.error) throw new Error(`Failed to load files: ${filesRes.error.message}`);
  if (edgesRes.error) throw new Error(`Failed to load edges: ${edgesRes.error.message}`);
  if (rolesRes.error) throw new Error(`Failed to load roles: ${rolesRes.error.message}`);

  const dbFiles = filesRes.data;
  
  interface DBEdge {
    id: string;
    from: { path: string };
    to: { path: string };
  }
  
  const dbEdges = (edgesRes.data as unknown) as DBEdge[];
  const dbRoles = rolesRes.data;

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
      isEntry: role === 'Page route' || role === 'API endpoint' || role === 'entry'
    };
  });

  return (
    <Explorer 
      analysis={analysis}
      nodes={fileNodes}
      edges={edges}
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
