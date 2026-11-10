import { ParserAdapter } from '../parser/types';

/**
 * Next.js adapter for the parser.
 * Knowledge of Next.js entry points and file structure lives here.
 */
export const NextAdapter: ParserAdapter = {
  isEntry(path: string): boolean {
    const patterns = [
      // App Router entries (handles root app/ and src/app/ as well as nested and package-prefixed)
      /^(?:.*\/)?(?:src\/)?app\/(?:.*\/)?(?:page|layout|route|loading|error|not-found)\.(?:tsx|ts|js|jsx)$/,
      
      // Root entries
      /^(?:.*\/)?(?:src\/)?middleware\.(?:ts|js)$/,
      /^(?:.*\/)?(?:src\/)?instrumentation\.(?:ts|js)$/,
      
      // Config files
      /.*\.config\.(?:ts|js|mjs|cjs)$/,
      /^(?:.*\/)?\.env(?:\..*)?$/,
      /^(?:.*\/)?tsconfig\.json$/,
      /^(?:.*\/)?package\.json$/,
    ];
    return patterns.some(p => p.test(path));
  },

  shouldInclude(path: string): boolean {
    const excluded = /(?:^|\/)(?:node_modules|\.next|\.git|dist|\.turbo)(?:\/|$)/;
    return !excluded.test(path);
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resolveImport(_sourceFile: string, _specifier: string): string | null {
    // In the future, this could handle Next.js aliases if ts-morph doesn't
    return null;
  },

  getRole(path: string): string | null {
    if (/\/(?:page|layout)\.(?:tsx|ts|js|jsx)$/.test(path)) return 'Page route';
    if (/\/(?:route)\.(?:ts|js)$/.test(path)) return 'API endpoint';
    if (/\/(?:actions)\.(?:ts|js)$/.test(path) || path.includes('/actions/')) return 'Server action';
    if (path.includes('/components/')) return 'Component';
    if (path.includes('/lib/') || path.includes('/utils/') || path.includes('/hooks/')) return 'Logic';
    return null;
  }
};
