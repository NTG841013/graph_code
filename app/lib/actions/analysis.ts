"use server";

import { auth } from "@clerk/nextjs/server";
import { findOrCreateAnalysis } from "@/lib/data/analysis-service";
import { normalizeRepoUrl } from "@/lib/data/url-utils";
import { runAnalysisPipeline } from "@/lib/parser/pipeline";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/data/supabase-admin";

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

  const normalizedUrl = normalizeRepoUrl(repoUrl);
  const { analysis } = await findOrCreateAnalysis(normalizedUrl, orgId);

  // Trigger the pipeline if it's not already running or completed successfully.
  // If it's already 'running', we let it be.
  if (analysis.status === 'pending' || analysis.status === 'failed') {
    // Fire and forget the pipeline
    runAnalysisPipeline({
      analysisId: analysis.id,
      repoUrl: normalizedUrl,
      organizationId: orgId
    }).catch(err => {
      console.error(`Background pipeline failed for ${analysis.id}:`, err);
    });
  }

  redirect(`/analysis/${analysis.id}`);
}

export async function reRunAnalysis(analysisId: string) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const { data: analysis, error: fetchError } = await getSupabaseAdmin()
    .from('analyses')
    .select('id, projects(repo_url)')
    .eq('id', analysisId)
    .eq('organization_id', orgId)
    .single();

  if (fetchError || !analysis) {
    throw new Error(`Analysis not found: ${fetchError?.message}`);
  }

  const repoUrl = (analysis.projects as unknown as { repo_url: string }).repo_url;

  const { error: updateError } = await getSupabaseAdmin()
    .from('analyses')
    .update({
      status: 'pending',
      stage: 'queued',
      stage_message: 'Restarting analysis...',
      finished_at: null,
      error_message: null,
      framework: null
    })
    .eq('id', analysisId);

  if (updateError) {
    throw new Error(`Failed to reset analysis: ${updateError.message}`);
  }

  runAnalysisPipeline({
    analysisId,
    repoUrl,
    organizationId: orgId
  }).catch(err => {
    console.error(`Rerun failed for ${analysisId}:`, err);
  });

  redirect(`/analysis/${analysisId}`);
}
