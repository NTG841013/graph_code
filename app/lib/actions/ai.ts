"use server";

import { explainFile, explainFolder } from "@/lib/ai/explain";
import { getSupabaseAdmin } from "@/lib/data/supabase-admin";
import { getFileContent, getLatestCommitHash } from "@/lib/data/github-service";
import crypto from "crypto";

export async function checkStaleness(analysisId: string, path: string, storedHash: string) {
  const supabase = getSupabaseAdmin();
  const { data: analysis } = await supabase
    .from("analyses")
    .select("*, projects(repo_url)")
    .eq("id", analysisId)
    .single();

  if (!analysis) throw new Error("Analysis not found");
  
  const projects = analysis.projects as unknown as { repo_url: string } | null;
  if (!projects) throw new Error("Project repo URL not found");
  const repoUrl = projects.repo_url;

  const latestCommit = await getLatestCommitHash(repoUrl);
  const isStaleRepo = latestCommit !== analysis.commit_hash;

  const content = await getFileContent(repoUrl, path, analysis.commit_hash || "HEAD");
  const currentHash = crypto.createHash("sha256").update(content).digest("hex");
  const isStaleFile = currentHash !== storedHash;

  return {
    isStale: isStaleFile || isStaleRepo,
    reason: isStaleFile ? "file_changed" : isStaleRepo ? "repo_moved" : null,
    content, // Return content so we don't have to fetch it again for explanation
  };
}

export async function requestFileExplanation(params: {
  analysisId: string;
  targetPath: string;
  content: string;
  neighbors: { imports: string[]; dependents: string[] };
}) {
  return await explainFile(params);
}

export async function requestFolderExplanation(params: {
  analysisId: string;
  folderPath: string;
  files: { path: string; role?: string }[];
  dependents: string[];
}) {
  return await explainFolder(params);
}
