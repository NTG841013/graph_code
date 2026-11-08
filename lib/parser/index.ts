import { crawl } from './crawler';
import { processRepo } from './processor';
import { AnalysisResult, FileNode, Edge, ParserAdapter } from './types';

export const FallbackAdapter: ParserAdapter = {
  isEntry: () => false,
  shouldInclude: () => true,
  resolveImport: () => null,
};

export async function analyze(root: string, adapter: ParserAdapter = FallbackAdapter): Promise<AnalysisResult> {
  const { nodes, skipped } = await crawl(root);
  
  // Filter nodes based on adapter (though crawler already does some filtering)
  const includedNodes = nodes.filter(n => adapter.shouldInclude(n.path));
  const excludedNodes = nodes.filter(n => !adapter.shouldInclude(n.path));
  
  const finalSkipped = [
    ...skipped,
    ...excludedNodes.map(n => ({ path: n.path, reason: 'adapter-excluded' }))
  ];

  const { edges, unresolved } = processRepo(root, includedNodes.map(n => n.path));

  // Remove duplicate edges
  const edgeKeys = new Set<string>();
  const uniqueEdges: Edge[] = [];
  
  for (const edge of edges) {
    const key = `${edge.from}->${edge.to}:${edge.type}`;
    if (!edgeKeys.has(key)) {
      edgeKeys.add(key);
      uniqueEdges.push(edge);
    }
  }

  // Compute fan-in and fan-out
  const fanInMap: Record<string, number> = {};
  const fanOutMap: Record<string, number> = {};

  uniqueEdges.forEach(edge => {
    fanOutMap[edge.from] = (fanOutMap[edge.from] || 0) + 1;
    fanInMap[edge.to] = (fanInMap[edge.to] || 0) + 1;
  });

  const nodesWithStats: FileNode[] = includedNodes.map(node => ({
    ...node,
    fanIn: fanInMap[node.path] || 0,
    fanOut: fanOutMap[node.path] || 0
  }));

  return {
    nodes: nodesWithStats,
    edges: uniqueEdges,
    unresolved,
    skipped: finalSkipped,
    stats: {
      totalFiles: nodes.length + skipped.length,
      parsedFiles: includedNodes.length,
      skippedFiles: finalSkipped.length,
    },
  };
}
