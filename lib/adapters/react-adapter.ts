import { SourceFile } from 'ts-morph';
import { ParserAdapter } from '../parser/types';

export const ReactAdapter: ParserAdapter = {
  name: 'React',

  detect(filePaths: string[]): boolean {
    // If it's Next.js, NextAdapter will catch it first.
    // So we just look for React indicators.
    return filePaths.some(p => p.endsWith('.tsx') || p.endsWith('.jsx')) &&
           filePaths.some(p => p.includes('App.tsx') || p.includes('index.tsx') || p.includes('main.tsx'));
  },

  isEntry(path: string): boolean {
    return path.includes('index.tsx') || path.includes('main.tsx') || path.includes('App.tsx');
  },

  shouldInclude(path: string): boolean {
    const excluded = /(?:^|\/)(?:node_modules|\.git|dist)(?:\/|$)/;
    return !excluded.test(path);
  },

  resolveImport(): string | null {
    return null;
  },

  getRole(path: string): string | null {
    if (/[A-Z].*\.(?:tsx|jsx)$/.test(path)) return 'Component';
    if (path.includes('/hooks/') || /\/use[A-Z].*\.(?:ts|js)$/.test(path)) return 'Hook';
    if (path.includes('/context/')) return 'Context';
    return 'Logic';
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getRoutes(_sourceFile: SourceFile, _relativePath: string): [] {
    return []; // Plain React doesn't have a standard routing convention we can easily parse without inference
  }
};
