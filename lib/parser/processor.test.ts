import { describe, it, expect } from 'vitest';
import { processRepo } from './processor';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('processRepo', () => {
  it('should categorize sibling directory imports as "outside"', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parser-test-sibling-'));
    const repoDir = path.join(tempDir, 'repo');
    const siblingDir = path.join(tempDir, 'repo-sibling');
    
    fs.mkdirSync(repoDir);
    fs.mkdirSync(siblingDir);

    try {
      // Create a file in the sibling directory
      fs.writeFileSync(path.join(siblingDir, 'target.ts'), 'export const x = 1;');
      
      // Create a file in the repo directory that imports from the sibling
      fs.writeFileSync(path.join(repoDir, 'source.ts'), 'import { x } from "../repo-sibling/target";');
      
      // We only crawl source.ts
      const result = processRepo(repoDir, ['source.ts']);
      
      // The edge should NOT be found (it's not internal)
      const edge = result.edges.find(e => e.from === 'source.ts');
      expect(edge).toBeUndefined();
      
      // It should be in unresolved with reason "outside"
      const unresolved = result.unresolved.find(u => u.specifier === '../repo-sibling/target');
      expect(unresolved).toBeDefined();
      expect(unresolved?.reason).toBe('outside');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should resolve alias imports when tsconfig.json is present', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parser-test-alias-'));
    try {
      // Create tsconfig.json with aliases
      const tsconfig = {
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@/*': ['./*']
          }
        }
      };
      fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), JSON.stringify(tsconfig));

      // Create a component file
      fs.writeFileSync(path.join(tempDir, 'component.ts'), 'export const Component = {};');

      // Create a main file using the alias
      fs.writeFileSync(path.join(tempDir, 'main.ts'), 'import { Component } from "@/component";');

      const filePaths = ['component.ts', 'main.ts'];
      const result = processRepo(tempDir, filePaths);

      // Verify that the edge was found
      const edge = result.edges.find(e => e.from === 'main.ts' && e.to === 'component.ts');
      expect(edge).toBeDefined();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
