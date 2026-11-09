import { AnalysisResult, Edge } from './types';

export interface GraphInsight {
  type: 'cycle' | 'orphan' | 'outlier' | 'long';
  filePath: string;
  message: string;
  data?: unknown;
}

function walkGraph(
  edges: Edge[],
  startNode: string,
  direction: 'up' | 'down',
  maxDepth: number
): string[] {
  const result = new Set<string>();
  let currentLayer = new Set([startNode]);

  for (let depth = 0; depth < maxDepth; depth++) {
    const nextLayer = new Set<string>();
    for (const node of currentLayer) {
      for (const edge of edges) {
        const match = direction === 'down' ? edge.from === node : edge.to === node;
        const target = direction === 'down' ? edge.to : edge.from;

        if (match && !result.has(target) && target !== startNode) {
          nextLayer.add(target);
          result.add(target);
        }
      }
    }
    if (nextLayer.size === 0) break;
    currentLayer = nextLayer;
  }

  return Array.from(result);
}

export function getBlastRadius(
  edges: Edge[],
  startNode: string,
  maxDepth: number = 2
): string[] {
  return walkGraph(edges, startNode, 'up', maxDepth);
}

export function getDependencyChain(
  edges: Edge[],
  startNode: string,
  maxDepth: number = 2
): string[] {
  return walkGraph(edges, startNode, 'down', maxDepth);
}

export function findInsights(analysis: AnalysisResult): GraphInsight[] {
  const insights: GraphInsight[] = [];
  
  // 1. Files nothing imports (Orphans, excluding framework files)
  const orphans = analysis.nodes.filter(node => {
    if (node.fanIn > 0) return false;
    return !node.isEntry;
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
  const nodesSet = new Set<string>();
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    adjacency.get(edge.from)!.push(edge.to);
    nodesSet.add(edge.from);
    nodesSet.add(edge.to);
  }

  const nodes = Array.from(nodesSet);
  const sccs = findSCCs(nodes, adjacency);
  
  const sccMap = new Map<string, Set<string>>();
  const sccIdMap = new Map<string, number>();
  sccs.forEach((scc, id) => {
    const set = new Set(scc);
    scc.forEach(node => {
      sccMap.set(node, set);
      sccIdMap.set(node, id);
    });
  });

  const cycles: string[][] = [];
  const cycleKeys = new Set<string>();

  for (const edge of edges) {
    const sccIdFrom = sccIdMap.get(edge.from);
    const sccIdTo = sccIdMap.get(edge.to);

    if (sccIdFrom !== undefined && sccIdFrom === sccIdTo) {
      const scc = sccMap.get(edge.from)!;
      if (edge.from === edge.to || scc.size > 1) {
        const path = findShortestPath(edge.to, edge.from, adjacency, scc);
        if (path) {
          const cycle = [edge.from, ...path.slice(0, -1)];
          const key = getCycleKey(cycle);
          if (!cycleKeys.has(key)) {
            cycles.push(cycle);
            cycleKeys.add(key);
          }
        }
      }
    }
  }

  return cycles;
}

function findSCCs(nodes: string[], adjacency: Map<string, string[]>): string[][] {
  let index = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indices = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const sccs: string[][] = [];

  function strongconnect(u: string) {
    indices.set(u, index);
    lowlink.set(u, index);
    index++;
    stack.push(u);
    onStack.add(u);

    for (const v of (adjacency.get(u) || [])) {
      if (!indices.has(v)) {
        strongconnect(v);
        lowlink.set(u, Math.min(lowlink.get(u)!, lowlink.get(v)!));
      } else if (onStack.has(v)) {
        lowlink.set(u, Math.min(lowlink.get(u)!, indices.get(v)!));
      }
    }

    if (lowlink.get(u) === indices.get(u)) {
      const scc: string[] = [];
      let v;
      do {
        v = stack.pop()!;
        onStack.delete(v);
        scc.push(v);
      } while (u !== v);
      sccs.push(scc);
    }
  }

  for (const node of nodes) {
    if (!indices.has(node)) {
      strongconnect(node);
    }
  }
  return sccs;
}

function findShortestPath(
  start: string,
  end: string,
  adjacency: Map<string, string[]>,
  sccNodes: Set<string>
): string[] | null {
  const queue: string[] = [start];
  const parent = new Map<string, string>();
  const visited = new Set<string>([start]);

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node === end) {
      const path = [];
      let curr: string | undefined = node;
      while (curr) {
        path.push(curr);
        curr = parent.get(curr);
      }
      return path.reverse();
    }

    for (const neighbor of adjacency.get(node) || []) {
      if (sccNodes.has(neighbor) && !visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, node);
        queue.push(neighbor);
      }
    }
  }
  return null;
}

function getCycleKey(cycle: string[]): string {
  if (cycle.length === 0) return '';
  let minIndex = 0;
  for (let i = 1; i < cycle.length; i++) {
    if (cycle[i] < cycle[minIndex]) minIndex = i;
  }
  const rotated = [...cycle.slice(minIndex), ...cycle.slice(0, minIndex)];
  return rotated.join(',');
}
