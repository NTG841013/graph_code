import { getAnalysis } from "@/app/lib/data/analyses";
import { AnalysisProgress } from "./analysis-progress";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/app/components/app-header";
import { Suspense } from "react";

export default function AnalysisPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader returnTo="/" />
      <Suspense fallback={<AnalysisLoading />}>
        <AnalysisContent params={params} />
      </Suspense>
    </div>
  );
}

async function AnalysisContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);

  if (!analysis) {
    notFound();
  }

  // If already finished, go straight to the map
  if (analysis.status === 'completed') {
    redirect(`/repo/${analysis.id}`);
  }

  return <AnalysisProgress initialAnalysis={analysis} />;
}

function AnalysisLoading() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 font-mono">
      <div className="w-full max-w-md space-y-8 opacity-50">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-border animate-pulse rounded" />
          <div className="h-6 w-48 bg-border animate-pulse rounded" />
        </div>
        <div className="border border-border bg-surface/30 p-6 h-48 animate-pulse" />
      </div>
    </div>
  );
}
