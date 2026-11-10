import { crawl } from './crawler';
import { processRepo } from './processor';
import { AnalysisResult, FileNode, Edge, ParserAdapter } from './types';
import { detectAdapter } from '../adapters';
import { FRAMEWORK_TAXONOMY } from '../adapters/taxonomy';

export async function analyze(root: string, providedAdapter?: ParserAdapter): Promise<AnalysisResult> {
  const { nodes: rawNodes, skipped } = await crawl(root);
  
  // Deduplicate nodes by path just in case
  const nodeMap = new Map<string, typeof rawNodes[0]>();
  for (const node of rawNodes) {
    nodeMap.set(node.path, node);
  }
  const nodes = Array.from(nodeMap.values());
  
  const filePaths = nodes.map(n => n.path);
  const adapter = providedAdapter || detectAdapter(filePaths);
  
  // Filter nodes based on adapter (though crawler already does some filtering)
  const includedNodes = nodes.filter(n => adapter.shouldInclude(n.path));
  const excludedNodes = nodes.filter(n => !adapter.shouldInclude(n.path));
  
  const finalSkipped = [
    ...skipped,
    ...excludedNodes.map(n => ({ path: n.path, reason: 'adapter-excluded' }))
  ];

  const { edges, unresolved, routes } = processRepo(root, includedNodes.map(n => n.path), adapter);

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
    fanOut: fanOutMap[node.path] || 0,
    isEntry: adapter.isEntry(node.path),
    role: adapter.getRole(node.path) || undefined
  }));

  return {
    nodes: nodesWithStats,
    edges: uniqueEdges,
    unresolved,
    skipped: finalSkipped,
    routes,
    framework: {
      name: adapter.name,
      categories: FRAMEWORK_TAXONOMY[adapter.name] || FRAMEWORK_TAXONOMY['Generic']
    },
    stats: {
      totalFiles: nodes.length + skipped.length,
      parsedFiles: includedNodes.length,
      skippedFiles: finalSkipped.length,
    },
  };
}
