import { AnalysisResult, Edge } from './types';

export interface GraphInsight {
  type: 'cycle' | 'orphan' | 'outlier' | 'long';
  filePath: string;
  message: string;
  data?: unknown;
}

export function getBlastRadius(
  edges: Edge[],
  startNode: string,
  maxDepth: number = 2
): string[] {
  const result = new Set<string>();
  let currentLayer = new Set([startNode]);

  for (let depth = 0; depth < maxDepth; depth++) {
    const nextLayer = new Set<string>();
    for (const node of currentLayer) {
      for (const edge of edges) {
        if (edge.from === node && !result.has(edge.to) && edge.to !== startNode) {
          nextLayer.add(edge.to);
          result.add(edge.to);
        }
      }
    }
    if (nextLayer.size === 0) break;
    currentLayer = nextLayer;
  }

  return Array.from(result);
}

export function getDependencyChain(
  edges: Edge[],
  startNode: string,
  maxDepth: number = 2
): string[] {
  const result = new Set<string>();
  let currentLayer = new Set([startNode]);

  for (let depth = 0; depth < maxDepth; depth++) {
    const nextLayer = new Set<string>();
    for (const node of currentLayer) {
      for (const edge of edges) {
        if (edge.to === node && !result.has(edge.from) && edge.from !== startNode) {
          nextLayer.add(edge.from);
          result.add(edge.from);
        }
      }
    }
    if (nextLayer.size === 0) break;
    currentLayer = nextLayer;
  }

  return Array.from(result);
}

export function findInsights(analysis: AnalysisResult): GraphInsight[] {
  const insights: GraphInsight[] = [];
  
  // 1. Files nothing imports (Orphans, excluding framework files)
  const frameworkPatterns = [
    /^app\/.*\/page\.(tsx|ts|js|jsx)$/,
    /^app\/.*\/layout\.(tsx|ts|js|jsx)$/,
    /^app\/.*\/route\.(tsx|ts|js|jsx)$/,
    /^app\/.*\/loading\.(tsx|ts|js|jsx)$/,
    /^app\/.*\/error\.(tsx|ts|js|jsx)$/,
    /^app\/.*\/not-found\.(tsx|ts|js|jsx)$/,
    /^middleware\.(ts|js)$/,
    /.*\.config\.(ts|js|mjs|cjs)$/,
  ];

  const orphans = analysis.nodes.filter(node => {
    if (node.fanIn > 0) return false;
    return !frameworkPatterns.some(pattern => pattern.test(node.path));
  });

  orphans.forEach(node => {
    insights.push({
      type: 'orphan',
      filePath: node.path,
      message: 'This file is not imported by any other file in the repository.',
    });
  });

  // 2. Cycles
  const cycles = findCycles(analysis.edges);
  cycles.forEach(cycle => {
    // We report the cycle once, picking the first file as the representative
    insights.push({
      type: 'cycle',
      filePath: cycle[0],
      message: 'This file is part of an import cycle.',
      data: cycle,
    });
  });

  // 3. Unusual fan-in (Outliers)
  const fanIns = analysis.nodes.map(n => n.fanIn);
  if (fanIns.length > 0) {
    const avgFanIn = fanIns.reduce((a, b) => a + b, 0) / fanIns.length;
    const stdDevFanIn = Math.sqrt(
      fanIns.reduce((a, b) => a + Math.pow(b - avgFanIn, 2), 0) / fanIns.length
    );
    const threshold = avgFanIn + 3 * stdDevFanIn; // 3 standard deviations

    analysis.nodes.forEach(node => {
      if (node.fanIn > threshold && node.fanIn > 5) { // Minimum 5 imports to be considered
        insights.push({
          type: 'outlier',
          filePath: node.path,
          message: 'This file is imported by an unusual number of other files.',
        });
      }
    });
  }

  // 4. Too long (Oversized)
  const lineCounts = analysis.nodes.map(n => n.lineCount);
  if (lineCounts.length > 0) {
    const threshold = 500; // Fixed string said "too long", we'll use 500 lines as a rule of thumb
    analysis.nodes.forEach(node => {
      if (node.lineCount > threshold) {
        insights.push({
          type: 'long',
          filePath: node.path,
          message: 'This file is longer than recommended for maintainability.',
        });
      }
    });
  }

  // Sort insights: Orphans first, then Cycles and Oversized (long)
  return insights.sort((a, b) => {
    const order = { orphan: 0, cycle: 1, long: 2, outlier: 3 };
    return order[a.type] - order[b.type];
  });
}

function findCycles(edges: Edge[]): string[][] {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    adjacency.get(edge.from)!.push(edge.to);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const nodes = Array.from(new Set([...edges.map(e => e.from), ...edges.map(e => e.to)]));

  for (const startNode of nodes) {
    if (visited.has(startNode)) continue;

    // Iterative DFS to find cycles
    const stack: { node: string; path: string[] }[] = [{ node: startNode, path: [startNode] }];
    const localVisited = new Set<string>();

    while (stack.length > 0) {
      const { node, path } = stack.pop()!;
      
      if (localVisited.has(node)) continue;
      localVisited.add(node);
      visited.add(node);

      const neighbors = adjacency.get(node) || [];
      for (const neighbor of neighbors) {
        const cycleIndex = path.indexOf(neighbor);
        if (cycleIndex !== -1) {
          const cycle = path.slice(cycleIndex);
          // Check if we already found this cycle (or a rotation of it)
          const sortedCycle = [...cycle].sort().join(',');
          if (!cycles.some(c => [...c].sort().join(',') === sortedCycle)) {
            cycles.push(cycle);
          }
        } else {
          stack.push({ node: neighbor, path: [...path, neighbor] });
        }
      }
    }
  }

  return cycles;
}
