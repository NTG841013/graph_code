import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { findOrCreateAnalysis } from "@/lib/data/analysis-service";
import { normalizeRepoUrl } from "@/lib/data/url-utils";
import { runAnalysisPipeline } from "@/lib/parser/pipeline";
export const instant = false;

export default async function StartAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ repoUrl?: string }>;
}) {
  const { orgId } = await auth();
  
  // Middleware should have handled this, but just in case
  if (!orgId) {
    redirect("/organizations?returnTo=/analysis/start");
  }

  const { repoUrl } = await searchParams;
  if (!repoUrl) {
    redirect("/");
  }

  // Basic validation (same as in startAnalysis action)
  if (!repoUrl.includes("github.com")) {
    // We don't have a way to show error here easily without a UI, 
    // but this is a tracer bullet.
    redirect("/?error=Only GitHub repositories are supported currently");
  }

  const normalizedUrl = normalizeRepoUrl(repoUrl);
  const { analysis } = await findOrCreateAnalysis(normalizedUrl, orgId);

  if (analysis.status === "pending" || analysis.status === "failed") {
    runAnalysisPipeline({
      analysisId: analysis.id,
      repoUrl: normalizedUrl,
      organizationId: orgId,
    }).catch((err) => {
      console.error(`Background pipeline failed for ${analysis.id}:`, err);
    });
  }

  redirect(`/analysis/${analysis.id}`);
}
