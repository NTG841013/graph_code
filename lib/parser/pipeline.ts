import { fetchRepo } from './fetcher';
import { analyze } from './index';
import { updateAnalysisProgress, saveAnalysisResults, failAnalysis } from '../data/storage';
import { NextAdapter } from '../adapters/next-adapter';

export interface PipelineOptions {
  analysisId: string;
  repoUrl: string;
  organizationId: string;
}

export async function runAnalysisPipeline(options: PipelineOptions) {
  const { analysisId, repoUrl, organizationId } = options;
  let cleanup: (() => Promise<void>) | undefined;

  try {
    // 1. Fetch
    await updateAnalysisProgress(analysisId, 'fetching', 'Downloading repository archive...', 'running');
    const fetchResult = await fetchRepo(repoUrl);
    cleanup = fetchResult.cleanup;
    
    // Update analysis with commit hash
    await updateAnalysisProgress(
      analysisId, 
      'fetching', 
      'Repository downloaded.', 
      'running', 
      fetchResult.commitHash
    );

    // 2. Analyze (Crawl + Select + Parse)
    // We use NextAdapter by default since this is a Next.js world, 
    // but the adapter logic should ideally be detected.
    // For Phase 7, we keep it simple.
    await updateAnalysisProgress(analysisId, 'parsing', 'Parsing source code and building graph...');
    
    const root = fetchResult.rootPath;
    const results = await analyze(root, NextAdapter);

    // 3. Store
    await updateAnalysisProgress(analysisId, 'storing', 'Saving results to database...');
    await saveAnalysisResults(analysisId, organizationId, results);

    // Final update is done inside saveAnalysisResults to 'completed'
    
  } catch (err) {
    console.error(`Pipeline failed for analysis ${analysisId}:`, err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    await failAnalysis(analysisId, errorMessage);
  } finally {
    if (cleanup) {
      await cleanup();
    }
  }
}
