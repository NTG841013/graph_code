import { getEvalExperiments, getRecentExplanations } from "@/app/lib/data/evals";
import { AppHeader } from "@/app/components/app-header";
import { Suspense } from "react";


interface ComparisonResult {
  path: string;
  v1: string;
  v2: string;
  v3: string;
  judge: {
    winner: 'A' | 'B' | 'C';
    scoreA: number;
    scoreB: number;
    scoreC: number;
    reason: string;
  };
}

export default function EvalsPage() {
  return (
    <Suspense fallback={<EvalsLoading />}>
      <EvalsContent />
    </Suspense>
  );
}

async function EvalsContent() {
  const experiments = await getEvalExperiments();
  const explanations = await getRecentExplanations();

  const aiStatus = {
    configured: !!process.env.OPENAI_API_KEY,
    tracing: process.env.LANGSMITH_TRACING === "true"
  };

  const roleAccuracy = experiments.find(e => e.name === 'Role Accuracy Evaluation');
  const promptComparison = experiments.find(e => e.name.includes('Prompt Version Comparison'));

  const avgInventedPathScore = explanations.length > 0 
    ? (explanations.reduce((acc, e) => acc + (e.evaluation_score || 0), 0) / explanations.length) * 100
    : 0;

  return (
    <div className="min-h-screen bg-background font-mono text-sm text-foreground">
      <AppHeader returnTo="/" aiStatus={aiStatus} />
      
      <main className="max-w-5xl mx-auto p-8 space-y-12">
        <header className="space-y-2 border-b border-border pb-4">
          <h1 className="text-xl font-bold">Evaluations</h1>
          <p className="text-muted-foreground">Answer quality as a number.</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="border border-border p-4 space-y-2">
            <h2 className="font-bold text-muted-foreground uppercase text-xs">Invented Paths</h2>
            <div className="text-3xl font-bold">{avgInventedPathScore.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Live check against {explanations.length} recent explanations.</p>
          </div>

          <div className="border border-border p-4 space-y-2">
            <h2 className="font-bold text-muted-foreground uppercase text-xs">Role Accuracy</h2>
            <div className="text-3xl font-bold">{roleAccuracy?.score_a.toFixed(2) || "0.00"}%</div>
            <p className="text-xs text-muted-foreground">Based on {roleAccuracy?.dataset_size || 0} conventional files.</p>
          </div>

          <div className="border border-border p-4 space-y-2">
            <h2 className="font-bold text-muted-foreground uppercase text-xs">Prompt Improvement</h2>
            <div className="text-3xl font-bold">
              {promptComparison ? (Math.max(promptComparison.score_b, promptComparison.score_c || 0) - promptComparison.score_a).toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">V3 Score: {promptComparison?.score_c?.toFixed(2) || "0.00"} vs V1: {promptComparison?.score_a.toFixed(2) || "0.00"}</p>
          </div>
        </section>

        {promptComparison && promptComparison.details && typeof promptComparison.details === 'object' && !Array.isArray(promptComparison.details) && (
          <section className="space-y-4">
            <h2 className="font-bold border-b border-border pb-2">Prompt Comparison (Detailed)</h2>
            <div className="space-y-4">
              {((promptComparison.details as unknown as { results: ComparisonResult[] }).results).map((r, i) => (
                <div key={i} className="border border-border p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-2">
                    <div className="font-bold text-xs uppercase text-muted-foreground">{r.path}</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-[10px] p-2 bg-surface/30 border border-border h-40 overflow-y-auto">
                        <div className="font-bold mb-1 uppercase text-muted-foreground">V1 (Retired):</div>
                        {r.v1}
                      </div>
                      <div className="text-[10px] p-2 bg-surface/30 border border-border h-40 overflow-y-auto">
                        <div className="font-bold mb-1 uppercase text-muted-foreground">V2 (Previous):</div>
                        {r.v2}
                      </div>
                      <div className="text-[10px] p-2 bg-primary/5 border border-primary/20 h-40 overflow-y-auto">
                        <div className="font-bold mb-1 uppercase text-primary">V3 (Enhanced):</div>
                        {r.v3}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-bold text-xs uppercase text-muted-foreground">Judge (Winner: {r.judge.winner})</div>
                    <div className="p-2 border border-border bg-primary/5 text-xs h-40 overflow-y-auto">
                      <div className="flex flex-col gap-1 mb-2 font-mono text-[10px]">
                        <span>Score A: {r.judge.scoreA}</span>
                        <span>Score B: {r.judge.scoreB}</span>
                        <span>Score C: {r.judge.scoreC}</span>
                      </div>
                      <p className="text-[10px]">{r.judge.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="font-bold border-b border-border pb-2">Recent Explanations (Hallucination Check)</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                  <th className="py-2 px-4">Path</th>
                  <th className="py-2 px-4">Score</th>
                  <th className="py-2 px-4">Invented Paths</th>
                </tr>
              </thead>
              <tbody>
                {explanations.map((e, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-surface/30 transition-colors">
                    <td className="py-2 px-4">{e.target_path}</td>
                    <td className="py-2 px-4">
                      <span className={e.evaluation_score === 1 ? "text-green-500" : "text-red-500"}>
                        {e.evaluation_score === 1 ? "PASS" : "FAIL"}
                      </span>
                    </td>
                    <td className="py-2 px-4">
                      {e.invented_paths && e.invented_paths.length > 0 ? (
                        <div className="flex gap-2 flex-wrap">
                          {e.invented_paths.map((p: string, j: number) => (
                            <code key={j} className="bg-red-500/10 text-red-500 px-1 rounded">{p}</code>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">none</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function EvalsLoading() {
  return (
    <div className="min-h-screen bg-background font-mono text-sm text-foreground">
      <AppHeader returnTo="/" />
      <main className="max-w-5xl mx-auto p-8 space-y-12">
        <header className="space-y-2 border-b border-border pb-4">
          <h1 className="text-xl font-bold">Evaluations</h1>
          <p className="text-muted-foreground">Answer quality as a number.</p>
        </header>
        <div className="flex items-center justify-center py-20">
          <div className="text-muted animate-pulse">Loading evaluation data...</div>
        </div>
      </main>
    </div>
  );
}
