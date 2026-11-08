import { createSupabaseServerClient } from "@/app/lib/supabase/server";

interface Analysis {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
  finished_at: string | null;
  commit_hash: string | null;
  error_message: string | null;
  projects: {
    name: string;
    repo_url: string;
  } | null;
}

export async function AnalysisList({ orgName }: { orgName?: string }) {
  const supabase = await createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from('analyses')
    .select(`
      id,
      status,
      created_at,
      finished_at,
      commit_hash,
      error_message,
      projects (
        name,
        repo_url
      )
    `)
    .order('created_at', { ascending: false });

  const analyses = data as unknown as Analysis[] | null;

  if (error) {
    return (
      <div className="mt-8 border border-danger/20 bg-danger/5 p-4 text-xs font-mono text-danger">
        Failed to load analyses: {error.message}
      </div>
    );
  }

  if (!analyses || analyses.length === 0) {
    return (
      <div className="mt-10 border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted">No repository analyses yet.</p>
        <p className="mt-1 text-xs text-muted/60">
          Run your first analysis to see the dependency map.
        </p>
      </div>
    );
  }

  const counts = {
    pending: analyses.filter(a => a.status === 'pending').length,
    running: analyses.filter(a => a.status === 'running').length,
    completed: analyses.filter(a => a.status === 'completed').length,
    failed: analyses.filter(a => a.status === 'failed').length,
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-2 px-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-foreground">{orgName || "Organization"}</span>
          <span className="text-xs text-muted">{analyses.length} analyses</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-tighter text-muted">
          <div className="flex items-center gap-1.5">
            <StatusIcon status="running" className="w-3 h-3" />
            <span>{counts.running} parsing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusIcon status="pending" className="w-3 h-3" />
            <span>{counts.pending} queued</span>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusIcon status="completed" className="w-3 h-3" />
            <span>{counts.completed} complete</span>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusIcon status="failed" className="w-3 h-3" />
            <span>{counts.failed} failed</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="text-muted/60 border-b border-border/30">
              <th className="px-1 py-2 font-normal">Repository</th>
              <th className="px-1 py-2 font-normal">State</th>
              <th className="px-1 py-2 font-normal">Commit</th>
              <th className="px-1 py-2 font-normal">Started</th>
              <th className="px-1 py-2 font-normal">Finished</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {analyses.map((analysis) => {
              const [owner, repo] = (analysis.projects?.name || "unnamed/project").split('/');
              return (
                <tr key={analysis.id} className="group align-top">
                  <td className="px-1 py-3">
                    <div className="text-muted/80">
                      {owner}{repo ? '/' : ''}<span className="font-bold text-foreground">{repo || ''}</span>
                    </div>
                    {analysis.status === 'failed' && analysis.error_message && (
                      <div className="mt-1 text-[10px] text-muted leading-tight">
                        {analysis.error_message}
                      </div>
                    )}
                  </td>
                  <td className="px-1 py-3">
                    <div className="flex items-center gap-2 text-muted">
                      <StatusIcon status={analysis.status} className="w-3.5 h-3.5" />
                      <span>{analysis.status === 'running' ? 'parsing' : analysis.status === 'pending' ? 'queued' : analysis.status === 'completed' ? 'complete' : analysis.status}</span>
                    </div>
                  </td>
                    <td className="px-1 py-3 text-muted">
                      {analysis.commit_hash ? analysis.commit_hash.substring(0, 7) : "—"}
                    </td>
                  <td className="px-1 py-3 text-muted whitespace-nowrap">
                    {formatRelativeTime(analysis.created_at)}
                  </td>
                  <td className="px-1 py-3 text-muted whitespace-nowrap">
                    {analysis.status === 'completed' || analysis.status === 'failed' 
                      ? formatRelativeTime(analysis.finished_at || analysis.created_at)
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatRelativeTime(dateString: string | null) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 0) return "just now";
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function StatusIcon({ status, className }: { status: string; className?: string }) {
  if (status === "running") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" />
      </svg>
    );
  }
  if (status === "pending") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }
  if (status === "completed") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }
  if (status === "failed") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="9" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
      </svg>
    );
  }
  return null;
}
