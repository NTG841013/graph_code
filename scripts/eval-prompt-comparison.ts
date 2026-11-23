import { loadEnv } from '../lib/env-loader';
loadEnv();

import fs from 'fs';
import path from 'path';
import { v1Prompt } from '../lib/evals/prompts/v1-explainer';

const dataset = [
  { path: 'lib/parser/graph.ts', imports: ['lib/parser/types.ts'], dependents: ['lib/parser/pipeline.ts'] },
  { path: 'app/components/analysis-form.tsx', imports: ['app/lib/actions/analysis.ts'], dependents: ['app/analysis/[id]/page.tsx'] },
  { path: 'lib/data/analysis-service.ts', imports: ['lib/data/storage.ts'], dependents: ['app/lib/actions/analysis.ts'] },
];

async function main() {
  const { aiClient, MODELS } = await import('../lib/ai/client');
  const { getSupabaseAdmin } = await import('../lib/data/supabase-admin');
  const { traceable, getCurrentRunTree } = await import('langsmith/traceable');
  const { evaluate } = await import('langsmith/evaluation');
  const supabase = getSupabaseAdmin();

  console.log(`Comparing prompt versions over ${dataset.length} files...`);
  
  if (process.env.LANGSMITH_TRACING === "true") {
    const { lsClient } = await import('../lib/ai/client');
    const datasetName = "Prompt Comparison";
    
    // Ensure dataset exists
    let ds;
    try {
      const datasets = [];
      for await (const d of lsClient.listDatasets({ datasetName })) {
        datasets.push(d);
      }
      ds = datasets.find(d => d.name === datasetName);
    } catch (e) {
      console.warn('Error listing datasets:', e);
    }

    if (!ds) {
      console.log(`Creating LangSmith dataset: ${datasetName}...`);
      ds = await lsClient.createDataset(datasetName, {
        description: "Comparison of different explanation prompt versions"
      });
    }

    // Check if dataset has examples
    const existingExamples = [];
    for await (const ex of lsClient.listExamples({ datasetId: ds.id, limit: 1 })) {
      existingExamples.push(ex);
    }

    if (existingExamples.length === 0) {
      console.log(`Adding examples to dataset ${datasetName}...`);
      await lsClient.createExamples({
        inputs: dataset.map(item => {
          const fullPath = path.join(process.cwd(), item.path);
          const content = fs.readFileSync(fullPath, 'utf8');
          return { 
            path: item.path, 
            content,
            imports: item.imports,
            dependents: item.dependents
          };
        }),
        datasetId: ds.id
      });
      console.log(`Added ${dataset.length} examples.`);
    }

    console.log('LangSmith tracing is enabled. Creating experiments...');

    const judgeEvaluator = async ({ inputs, outputs }: any) => {
      const text = outputs?.outputs || outputs;
      const response = await aiClient.chat.completions.create({
        model: MODELS.EXPLAINER,
        messages: [
          {
            role: "system",
            content: "You are an expert technical writer and software architect. Rate explanations of code files."
          },
          {
            role: "user",
            content: `Rate this explanation of the file "${inputs.path}".

Criteria:
1. Specificity: Does it explain EXACTLY what the code does?
2. Usefulness: Does it explain WHY it exists in the architecture?
3. Formatting: Does it follow constraints (bold for emphasis, bullets for lists, inline code for paths)?

Explanation:
---
${text}
---

Answer with a JSON object:
{
  "score": number (1-10),
  "reason": "short explanation"
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return {
        key: "accuracy",
        score: (result.score || 0) / 10
      };
    };

    // Run evaluations in parallel for LangSmith
    await Promise.all([
      evaluate(
        async (input) => {
          const v1PromptText = v1Prompt(input.path, input.content, { imports: input.imports, dependents: input.dependents });
          const response = await aiClient.chat.completions.create({
            model: MODELS.EXPLAINER,
            messages: [{ role: "user", content: v1PromptText }],
            temperature: 0,
          });
          return response.choices[0].message.content || "";
        },
        { 
          data: ds.id, 
          client: lsClient,
          experimentPrefix: "v1-retired",
          evaluators: [judgeEvaluator]
        }
      ),
      evaluate(
        async (input) => {
          const v2PromptText = `
Explain the purpose of the file "${input.path}" in the context of its neighbors.
It imports: ${input.imports.join(", ") || "nothing"}
It is imported by: ${input.dependents.join(", ") || "nothing"}

File content:
\`\`\`
${input.content}
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
            model: MODELS.EXPLAINER,
            messages: [
              {
                role: "system",
                content: "You are a software architect explaining a codebase. You provide concise, accurate descriptions based on real parsing data.",
              },
              { role: "user", content: v2PromptText }
            ],
            temperature: 0,
          });
          return response.choices[0].message.content || "";
        },
        { 
          data: ds.id, 
          client: lsClient,
          experimentPrefix: "v2-current",
          evaluators: [judgeEvaluator]
        }
      ),
      evaluate(
        async (input) => {
          const v3PromptText = `
Explain the purpose of the file "${input.path}" in the context of its neighbors.
Describe exactly what it does and why it exists in the architecture.

Context:
- Imports: ${input.imports.join(", ") || "nothing"}
- Dependents: ${input.dependents.join(", ") || "nothing"}

File content:
\`\`\`
${input.content}
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
            model: MODELS.EXPLAINER,
            messages: [
              {
                role: "system",
                content: "You are a software architect explaining a codebase. You provide concise, accurate descriptions based on real parsing data.",
              },
              { role: "user", content: v3PromptText }
            ],
            temperature: 0,
          });
          return response.choices[0].message.content || "";
        },
        { 
          data: ds.id, 
          client: lsClient,
          experimentPrefix: "v3-enhanced",
          evaluators: [judgeEvaluator]
        }
      )
    ]);
  }

  const results = [];

  const runV3 = traceable(async (item: { path: string, imports: string[], dependents: string[] }, content: string) => {
    const v3PromptText = `
Explain the purpose of the file "${item.path}" in the context of its neighbors.
Describe exactly what it does and why it exists in the architecture.

Context:
- Imports: ${item.imports.join(", ") || "nothing"}
- Dependents: ${item.dependents.join(", ") || "nothing"}

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

    const v3Response = await aiClient.chat.completions.create({
      model: MODELS.EXPLAINER,
      messages: [
        {
          role: "system",
          content: "You are a software architect explaining a codebase. You provide concise, accurate descriptions based on real parsing data.",
        },
        { role: "user", content: v3PromptText }
      ],
      temperature: 0,
    });

    const runTree = getCurrentRunTree();
    if (runTree) {
      console.log(`  [Trace] Run ID: ${runTree.id}`);
    } else {
      console.log('  [Trace] No run tree found.');
    }

    return v3Response.choices[0].message.content || "";
  }, { name: "V3 (Enhanced) Explanation" });

  for (const item of dataset) {
    const fullPath = path.join(process.cwd(), item.path);
    const content = fs.readFileSync(fullPath, 'utf8');

    // Current Prompt (v2)
    const v2PromptText = `
Explain the purpose of the file "${item.path}" in the context of its neighbors.
It imports: ${item.imports.join(", ") || "nothing"}
It is imported by: ${item.dependents.join(", ") || "nothing"}

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

    const v1PromptText = v1Prompt(item.path, content, { imports: item.imports, dependents: item.dependents });

    console.log(`Running v1 for ${item.path}...`);
    const v1Response = await aiClient.chat.completions.create({
      model: MODELS.EXPLAINER,
      messages: [{ role: "user", content: v1PromptText }],
      temperature: 0,
    });

    console.log(`Running v2 for ${item.path}...`);
    const v2Response = await aiClient.chat.completions.create({
      model: MODELS.EXPLAINER,
      messages: [
        {
          role: "system",
          content: "You are a software architect explaining a codebase. You provide concise, accurate descriptions based on real parsing data.",
        },
        { role: "user", content: v2PromptText }
      ],
      temperature: 0,
    });

    console.log(`Running v3 for ${item.path}...`);
    const v3Text = await runV3(item, content);

    const v1Text = v1Response.choices[0].message.content || "";
    const v2Text = v2Response.choices[0].message.content || "";

    // Judge
    console.log(`Judging ${item.path}...`);
    const judgePrompt = `
You are an expert technical writer and software architect.
Compare these three explanations of a file and decide which one is better for a developer tool.

Criteria:
1. Specificity: Does it explain EXACTLY what the code does?
2. Usefulness: Does it explain WHY it exists in the architecture?
3. Formatting: Does it follow constraints (bold for emphasis, bullets for lists, inline code for paths)?

Explanation A (V1 - Retired):
---
${v1Text}
---

Explanation B (V2 - Current):
---
${v2Text}
---

Explanation C (V3 - Enhanced):
---
${v3Text}
---

Answer with a JSON object:
{
  "winner": "A" | "B" | "C",
  "scoreA": number (1-10),
  "scoreB": number (1-10),
  "scoreC": number (1-10),
  "reason": "short explanation"
}
`.trim();

    const judgeResponse = await aiClient.chat.completions.create({
      model: MODELS.EXPLAINER,
      messages: [{ role: "user", content: judgePrompt }],
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const judgeResult = JSON.parse(judgeResponse.choices[0].message.content || "{}");
    results.push({
      path: item.path,
      v1: v1Text,
      v2: v2Text,
      v3: v3Text,
      judge: judgeResult
    });
  }

  const avgA = results.reduce((acc, r) => acc + r.judge.scoreA, 0) / results.length;
  const avgB = results.reduce((acc, r) => acc + r.judge.scoreB, 0) / results.length;
  const avgC = results.reduce((acc, r) => acc + r.judge.scoreC, 0) / results.length;

  console.log('\nPrompt Comparison Results:');
  console.log(`V1 (Retired) Average Score: ${avgA.toFixed(2)}`);
  console.log(`V2 (Current) Average Score: ${avgB.toFixed(2)}`);
  console.log(`V3 (Enhanced) Average Score: ${avgC.toFixed(2)}`);
  console.log(`Improvement (V3 vs V1): ${(avgC - avgA).toFixed(2)} points`);

  results.forEach(r => {
    console.log(`\nFile: ${r.path}`);
    console.log(`Winner: ${r.judge.winner} (A: ${r.judge.scoreA}, B: ${r.judge.scoreB}, C: ${r.judge.scoreC})`);
    console.log(`Reason: ${r.judge.reason}`);
  });

  await supabase.from('eval_experiments').insert({
    name: 'Prompt Version Comparison: V1 vs V2 vs V3',
    dataset_size: dataset.length,
    score_a: avgA,
    score_b: avgB,
    score_c: avgC,
    details: { results }
  });
  console.log('\nExperiment saved to database.');

  if (process.env.LANGSMITH_TRACING === "true") {
    const { lsClient } = await import('../lib/ai/client');
    await lsClient.awaitPendingTraceBatches();
    console.log('LangSmith traces flushed.');
  }
}

main().catch(console.error);
