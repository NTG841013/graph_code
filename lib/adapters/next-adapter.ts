import { ParserAdapter, Route } from '../parser/types';
import { SourceFile } from 'ts-morph';

/**
 * Next.js adapter for the parser.
 * Knowledge of Next.js entry points and file structure lives here.
 */
export const NextAdapter: ParserAdapter = {
  name: 'Next.js',

  detect(filePaths: string[]): boolean {
    return filePaths.some(p => 
      p.includes('next.config.') || 
      p.includes('app/layout.') || 
      p.includes('pages/_app.') ||
      p.includes('app/page.')
    );
  },

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
    if (/\/(?:page)\.(?:tsx|ts|js|jsx)$/.test(path)) return 'Page routes';
    if (/\/(?:layout)\.(?:tsx|ts|js|jsx)$/.test(path)) return 'Layouts';
    if (/\/(?:loading|error|not-found)\.(?:tsx|ts|js|jsx)$/.test(path)) return 'Loading & error UI';
    if (/\/(?:route)\.(?:ts|js)$/.test(path)) return 'API endpoints';
    if (/\/(?:actions)\.(?:ts|js)$/.test(path) || path.includes('/actions/')) return 'Server actions';
    if (path.includes('/components/')) return 'Components';
    if (path.includes('/hooks/') || /\/use-[^/]+\.(?:ts|tsx)$/.test(path)) return 'Hooks';
    if (/\/(?:middleware)\.(?:ts|js)$/.test(path)) return 'Middleware';
    if (/\/(?:apple-icon|favicon|icon|manifest|opengraph-image|robots|sitemap|twitter-image)\.(?:tsx|ts|js|jsx|ico)$/.test(path)) return 'Metadata files';
    if (/\/(?:instrumentation)\.(?:ts|js)$/.test(path)) return 'Instrumentation';
    if (/.*\.config\.(?:ts|js|mjs|cjs)$/.test(path) || /\/\.env(?:\..*)?$/.test(path) || /\/(?:tsconfig\.json|package\.json)$/.test(path)) return 'Config files';
    if (/\.(?:test|spec)\.(?:ts|tsx|js|jsx)$/.test(path) || path.includes('/__tests__/')) return 'Tests';
    
    return 'Unclassified';
  },

  getRoutes(sourceFile: SourceFile): Route[] {
    const filePath = sourceFile.getFilePath().replace(/\\/g, '/');
    const routes: Route[] = [];

    // App Router: Page
    if (/\/(?:page)\.(?:tsx|ts|js|jsx)$/.test(filePath)) {
      routes.push({
        method: 'GET',
        path: getNextPath(filePath),
        file: filePath,
        line: 1 // Pages don't have a specific line, but we can point to the top
      });
    }

    // App Router: Route Handler
    if (/\/(?:route)\.(?:ts|js)$/.test(filePath)) {
      const nextPath = getNextPath(filePath);
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
      
      sourceFile.getExportedDeclarations().forEach((decls, name) => {
        if (methods.includes(name.toUpperCase())) {
          // Get the line number of the first declaration
          const firstDecl = decls[0];
          const line = firstDecl ? firstDecl.getStartLineNumber() : 1;

          routes.push({
            method: name.toUpperCase(),
            path: nextPath,
            file: filePath,
            line
          });
        }
      });
    }

    return routes;
  }
};

function getNextPath(filePath: string): string {
  let p = filePath;
  // Handle absolute paths by looking for "app/" or "src/app/"
  const appMatch = p.match(/\/(?:src\/)?app\/(.*)$/);
  if (!appMatch) return '/';

  p = appMatch[1];
  // Remove filename
  p = p.replace(/\/(?:page|route)\.(?:tsx|ts|js|jsx)$/, '');
  // If the file was app/page.tsx, p might be "page.tsx" or similar depending on the above
  if (p.includes('.')) p = ''; 
  
  // Remove route groups like (auth)
  const segments = p.split('/').filter(s => s && !(s.startsWith('(') && s.endsWith(')')));
  return '/' + segments.join('/');
}
