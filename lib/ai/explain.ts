import { aiClient, lsClient, MODELS } from "./client";
import { traceable, getCurrentRunTree } from "langsmith/traceable";
import { getSupabaseAdmin } from "../data/supabase-admin";
import crypto from "crypto";
import { validatePaths } from "../evals/invented-path";

export interface ExplainParams {
  analysisId: string;
  targetPath: string;
  content: string;
  neighbors: {
    imports: string[];
    dependents: string[];
  };
}

export interface FolderExplainParams {
  analysisId: string;
  folderPath: string;
  files: { path: string; role?: string }[];
  dependents: string[];
}

const MODEL_NAME = MODELS.EXPLAINER;

export const explainFile = traceable(
  async ({ analysisId, targetPath, content, neighbors }: ExplainParams) => {
    const supabase = getSupabaseAdmin();
    const contentHash = crypto.createHash("sha256").update(content).digest("hex");

    // 1. Cache lookup (MUST happen inside the traced call)
    const { data: cached } = await supabase
      .from("explanations")
      .select("text")
      .eq("content_hash", contentHash)
      .eq("model", MODEL_NAME)
      .eq("target_path", targetPath)
      .maybeSingle();

    if (cached) {
      return cached.text as string;
    }

    // 2. AI Call
    const prompt = `
Explain the purpose of the file "${targetPath}" in the context of its neighbors.
Describe exactly what it does and why it exists in the architecture.

Context:
- Imports: ${neighbors.imports.join(", ") || "nothing"}
- Dependents: ${neighbors.dependents.join(", ") || "nothing"}

File content:
\`\`\`
${content}
\`\`\`

Instructions:
- Provide a detailed, specific breakdown of the file's components and functions.
- Explain the role of this file within the larger application architecture.
- Use **bold** for emphasis, - bullets for lists, and \`inline code\` for file paths or symbols.
- Mentioned file paths MUST match the repository exactly (e.g. \`lib/parser/types.ts\`).
- DO NOT use headings (# or ##) or large code blocks.
- Aim for technical depth over brevity.
`.trim();

    const response = await aiClient.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        {
          role: "system",
          content: "You are a software architect explaining a codebase. You provide concise, accurate descriptions based on real parsing data.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    });

    const result = response.choices[0].message.content || "";

    // 3. Live Evaluation: Invented Path Check
    const allowedPaths = new Set([targetPath, ...neighbors.imports, ...neighbors.dependents]);
    const evalResult = validatePaths(result, allowedPaths);

    // LangSmith live evaluation feedback
    const runTree = getCurrentRunTree();
    if (runTree) {
      await (lsClient as any).createFeedback({
        runId: runTree.id,
        key: "invented_path",
        score: evalResult.valid ? 1.0 : 0.0,
        comment: evalResult.invented.length > 0 
          ? `Invented: ${evalResult.invented.join(", ")}` 
          : "None",
      }).catch(() => {});
    }
    await lsClient.awaitPendingTraceBatches();

    // 4. Save to cache
    const { data: analysis } = await supabase.from('analyses').select('organization_id').eq('id', analysisId).single();
    if (!analysis) throw new Error("Analysis not found");

    await supabase.from("explanations").insert({
      analysis_id: analysisId,
      organization_id: analysis.organization_id,
      target_path: targetPath,
      target_type: "file",
      content_hash: contentHash,
      model: MODEL_NAME,
      text: result,
      input_paths: Array.from(allowedPaths),
      invented_paths: evalResult.invented,
      evaluation_score: evalResult.valid ? 1.0 : 0.0,
    });

    return result;
  },
  { name: "Explain File" }
);

export const explainFolder = traceable(
  async ({ analysisId, folderPath, files, dependents }: FolderExplainParams) => {
    const supabase = getSupabaseAdmin();
    
    // For folders, the "content" is the list of files and their roles
    const folderContent = JSON.stringify({ files, dependents });
    const contentHash = crypto.createHash("sha256").update(folderContent).digest("hex");

    const { data: cached } = await supabase
      .from("explanations")
      .select("text")
      .eq("content_hash", contentHash)
      .eq("model", MODEL_NAME)
      .eq("target_path", folderPath)
      .maybeSingle();

    if (cached) {
      return cached.text as string;
    }

    const prompt = `
Explain the purpose of the folder "${folderPath}".
Describe its responsibility and why other parts of the codebase depend on it.

Contents:
${files.map(f => `- \`${f.path}\` (Role: ${f.role || "unknown"})`).join("\n")}

Context:
- It is depended on by files in these paths: ${dependents.join(", ") || "none"}

Instructions:
- Provide a detailed, specific breakdown of the folder's responsibility.
- Explain how the files within it work together to achieve its purpose.
- Use **bold** for emphasis, - bullets for lists, and \`inline code\` for file paths or symbols.
- Mentioned file paths MUST match the repository exactly.
- DO NOT use headings (# or ##) or large code blocks.
- Aim for technical depth over brevity.
`.trim();

    const response = await aiClient.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        {
          role: "system",
          content: "You are a software architect explaining a codebase. You provide concise, accurate descriptions based on real parsing data.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    });

    const result = response.choices[0].message.content || "";

    // 3. Live Evaluation: Invented Path Check
    const allowedPaths = new Set([folderPath, ...files.map(f => f.path), ...dependents]);
    const evalResult = validatePaths(result, allowedPaths);

    // LangSmith live evaluation feedback
    const runTree = getCurrentRunTree();
    if (runTree) {
      await (lsClient as any).createFeedback({
        runId: runTree.id,
        key: "invented_path",
        score: evalResult.valid ? 1.0 : 0.0,
        comment: evalResult.invented.length > 0 
          ? `Invented: ${evalResult.invented.join(", ")}` 
          : "None",
      }).catch(() => {});
    }
    await lsClient.awaitPendingTraceBatches();

    const { data: analysis } = await supabase.from('analyses').select('organization_id').eq('id', analysisId).single();
    if (!analysis) throw new Error("Analysis not found");

    await supabase.from("explanations").insert({
      analysis_id: analysisId,
      organization_id: analysis.organization_id,
      target_path: folderPath,
      target_type: "folder",
      content_hash: contentHash,
      model: MODEL_NAME,
      text: result,
      input_paths: Array.from(allowedPaths),
      invented_paths: evalResult.invented,
      evaluation_score: evalResult.valid ? 1.0 : 0.0,
    });

    return result;
  },
  { name: "Explain Folder" }
);

export const classifyRole = traceable(
  async (path: string, content: string) => {
    const response = await aiClient.chat.completions.create({
      model: MODELS.CLASSIFIER,
      messages: [
        {
          role: "system",
          content: "Classify the role of the given file. Answer with EXACTLY ONE word from this list: service, repository, model, util, config, component, hook. If none fit perfectly, pick the closest one. DO NOT use structural roles like page, route, or controller.",
        },
        {
          role: "user",
          content: `File path: ${path}\n\nContent:\n${content.substring(0, 4000)}`,
        },
      ],
      temperature: 0,
    });

    return response.choices[0].message.content?.toLowerCase().trim() || "util";
  },
  { name: "Classify Role" }
);
