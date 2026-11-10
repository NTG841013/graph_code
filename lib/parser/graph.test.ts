import { describe, it, expect } from 'vitest';
import { findInsights } from './graph';
import { AnalysisResult, Edge, FileNode } from './types';

describe('findInsights', () => {
  it('should find cycles', () => {
    const edges: Edge[] = [
      { from: 'a.ts', to: 'b.ts', type: 'import' },
      { from: 'b.ts', to: 'a.ts', type: 'import' }
    ];
    const nodes: FileNode[] = [
      { path: 'a.ts', folder: '.', lineCount: 10, fanIn: 1, fanOut: 1, isEntry: true, hash: '1' },
      { path: 'b.ts', folder: '.', lineCount: 10, fanIn: 1, fanOut: 1, isEntry: false, hash: '2' }
    ];
    const analysis: AnalysisResult = {
      nodes,
      edges,
      unresolved: [],
      skipped: [],
      routes: [],
      stats: { totalFiles: 2, parsedFiles: 2, skippedFiles: 0 }
    };
    const insights = findInsights(analysis);
    expect(insights.some(i => i.type === 'cycle')).toBe(true);
  });

  it('should handle deep dependency chains without stack overflow', () => {
    const depth = 10000; 
    const edges: Edge[] = [];
    const nodes: FileNode[] = [];
    for (let i = 0; i < depth; i++) {
      nodes.push({
        path: `file${i}.ts`,
        folder: '.',
        lineCount: 10,
        fanIn: i === 0 ? 0 : 1,
        fanOut: i === depth - 1 ? 0 : 1,
        isEntry: i === 0,
        hash: `${i}`
      });
      if (i < depth - 1) {
        edges.push({ from: `file${i}.ts`, to: `file${i+1}.ts`, type: 'import' });
      }
    }
    const analysis: AnalysisResult = { 
      nodes, 
      edges, 
      unresolved: [],
      skipped: [],
      routes: [],
      stats: { totalFiles: depth, parsedFiles: depth, skippedFiles: 0 }
    };
    
    // This should not throw RangeError: Maximum call stack size exceeded
    const insights = findInsights(analysis);
    expect(insights).toBeDefined();
  });
});
