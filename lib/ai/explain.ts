import { aiClient, MODELS } from "./client";
import { traceable } from "langsmith/traceable";
import { getSupabaseAdmin } from "../data/supabase-admin";
import crypto from "crypto";

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
It imports: ${neighbors.imports.join(", ") || "nothing"}
It is imported by: ${neighbors.dependents.join(", ") || "nothing"}

File content:
\`\`\`
${content}
\`\`\`

Constraints:
- Describe what it does and why it exists.
- Use exactly three formatting styles: **bold** for emphasis, - bullets for lists, and \`inline code\` for file paths or symbols.
- DO NOT use headings (# or ##).
- DO NOT use blocks of code.
- If you mention any file path from the repository, write it exactly as it appears in the repo (e.g. \`lib/parser/types.ts\`).
- Keep it to 2-3 short paragraphs.
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

    // 3. Save to cache
    // Note: organization_id is required by schema but we don't have it here easily.
    // We should probably pass it or fetch it from analysis.
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
It contains these files:
${files.map(f => `- \`${f.path}\` (Role: ${f.role || "unknown"})`).join("\n")}

It is depended on by files in these paths: ${dependents.join(", ") || "none"}

Constraints:
- Describe what this folder's responsibility is and why so much points at it (if applicable).
- Use exactly three formatting styles: **bold** for emphasis, - bullets for lists, and \`inline code\` for file paths or symbols.
- DO NOT use headings (# or ##).
- DO NOT use blocks of code.
- Keep it to 2-3 short paragraphs.
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
