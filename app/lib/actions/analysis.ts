"use server";

import { auth } from "@clerk/nextjs/server";
import { findOrCreateAnalysis } from "@/lib/data/analysis-service";
import { runAnalysisPipeline } from "@/lib/parser/pipeline";
import { redirect } from "next/navigation";

export async function startAnalysis(formData: FormData) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized: No organization selected");
  }

  const repoUrl = formData.get("repoUrl")?.toString();
  if (!repoUrl) {
    throw new Error("Repository URL is required");
  }

  // Basic validation
  if (!repoUrl.includes("github.com")) {
    throw new Error("Only GitHub repositories are supported currently");
  }

  const { analysis } = await findOrCreateAnalysis(repoUrl, orgId);

  // Trigger the pipeline if it's not already running or completed successfully.
  // If it's already 'running', we let it be.
  if (analysis.status === 'pending' || analysis.status === 'failed') {
    // Fire and forget the pipeline
    runAnalysisPipeline({
      analysisId: analysis.id,
      repoUrl,
      organizationId: orgId
    }).catch(err => {
      console.error(`Background pipeline failed for ${analysis.id}:`, err);
    });
  }

  redirect(`/analysis/${analysis.id}`);
}
