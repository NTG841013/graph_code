import { loadEnv } from '../lib/env-loader';
loadEnv();

import fs from 'fs';
import path from 'path';

const dataset = [
  { path: 'lib/data/analysis-service.ts', expected: 'service' },
  { path: 'lib/data/github-service.ts', expected: 'service' },
  { path: 'app/components/analysis-form.tsx', expected: 'component' },
  { path: 'app/components/analysis-list.tsx', expected: 'component' },
  { path: 'app/components/app-header.tsx', expected: 'component' },
  { path: 'app/components/auth-shell.tsx', expected: 'component' },
  { path: 'app/components/detail-pane.tsx', expected: 'component' },
  { path: 'app/components/explanation-renderer.tsx', expected: 'component' },
  { path: 'app/components/map/canvas.tsx', expected: 'component' },
  { path: 'app/components/map/folded-node.tsx', expected: 'component' },
  { path: 'app/components/map/open-panel.tsx', expected: 'component' },
  { path: 'app/components/organization-setup.tsx', expected: 'component' },
  { path: 'app/components/route-table.tsx', expected: 'component' },
  { path: 'app/components/theme-control.tsx', expected: 'component' },
  { path: 'lib/data/url-utils.ts', expected: 'util' },
  { path: 'lib/parser/crawler.ts', expected: 'util' },
  { path: 'lib/parser/fetcher.ts', expected: 'util' },
  { path: 'lib/parser/folding.ts', expected: 'util' },
  { path: 'lib/parser/graph.ts', expected: 'util' },
  { path: 'lib/parser/pipeline.ts', expected: 'util' },
  { path: 'lib/parser/processor.ts', expected: 'util' },
  { path: 'lib/ai/client.ts', expected: 'config' },
  { path: 'lib/parser/types.ts', expected: 'model' },
  { path: 'app/lib/actions/ai.ts', expected: 'service' },
  { path: 'app/lib/actions/analysis.ts', expected: 'service' },
  { path: 'lib/adapters/express-adapter.ts', expected: 'util' },
  { path: 'lib/adapters/nest-adapter.ts', expected: 'util' },
  { path: 'lib/adapters/next-adapter.ts', expected: 'util' },
  { path: 'lib/adapters/react-adapter.ts', expected: 'util' },
  { path: 'lib/adapters/taxonomy.ts', expected: 'util' },
  { path: 'app/lib/supabase/utils.ts', expected: 'util' },
];

async function main() {
  const { classifyRole } = await import('../lib/ai/explain');
  const { getSupabaseAdmin } = await import('../lib/data/supabase-admin');
  const { evaluate } = await import('langsmith/evaluation');
  const supabase = getSupabaseAdmin();

  console.log(`Running role accuracy evaluation over ${dataset.length} files...`);

  // Run LangSmith evaluation
  if (process.env.LANGSMITH_TRACING === "true") {
    const { lsClient } = await import('../lib/ai/client');
    const datasetName = "Role Accuracy";

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
        description: "Evaluation of role classification accuracy"
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
          const content = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
          return { path: item.path, content };
        }),
        referenceOutputs: dataset.map(item => ({ expected: item.expected })),
        datasetId: ds.id
      });
      console.log(`Added ${dataset.length} examples.`);
    }

    console.log('LangSmith tracing is enabled, creating experiment...');
    await evaluate(
      async (input: { path: string; content: string }) => {
        return await classifyRole(input.path, input.content);
      },
      {
        data: ds.id,
        client: lsClient,
        experimentPrefix: "role-accuracy",
        evaluators: [
          ({ outputs, referenceOutputs }: any) => ({
            key: "accuracy",
            score: (outputs?.outputs || outputs) === referenceOutputs?.expected ? 1 : 0
          })
        ]
      }
    );
  }

  let correct = 0;
  const results = [];

  for (const item of dataset) {
    const fullPath = path.join(process.cwd(), item.path);
    if (!fs.existsSync(fullPath)) {
      console.warn(`File not found: ${item.path}`);
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const actual = await classifyRole(item.path, content);
    
    const isCorrect = actual === item.expected;
    if (isCorrect) correct++;

    results.push({
      path: item.path,
      expected: item.expected,
      actual,
      correct: isCorrect
    });

    process.stdout.write(isCorrect ? '.' : 'F');
  }

  console.log('\n');
  const percentage = (correct / results.length) * 100;
  console.log(`Accuracy: ${percentage.toFixed(2)}% (${correct}/${results.length})`);

  if (percentage < 100) {
    console.log('\nFailures:');
    results.filter(r => !r.correct).forEach(r => {
      console.log(`- ${r.path}: expected ${r.expected}, got ${r.actual}`);
    });
  }

  await supabase.from('eval_experiments').insert({
    name: 'Role Accuracy Evaluation',
    dataset_size: dataset.length,
    score_a: percentage,
    score_b: 0, // Not applicable
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
