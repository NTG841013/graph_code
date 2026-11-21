import { ParserAdapter, Route } from '../parser/types';
import { SourceFile } from 'ts-morph';
import path from 'path';

export const ExpressAdapter: ParserAdapter = {
  name: 'Express',

  detect(filePaths: string[]): boolean {
    // Look for common Express entry points or directory patterns
    return filePaths.some(p => 
      p === 'app.js' || p === 'server.js' || 
      p.includes('routes/') || p.includes('controllers/') || p.includes('middleware/') ||
      p.includes('models/') || p.includes('routes\\') || p.includes('controllers\\') || 
      p.includes('middleware\\') || p.includes('models\\')
    );
  },

  isEntry(filePath: string): boolean {
    const filename = path.basename(filePath);
    return ['app.js', 'server.js', 'index.js', 'main.js'].includes(filename) || filePath.includes('bin/www');
  },

  shouldInclude(filePath: string): boolean {
    const excluded = /(?:^|\/)(?:node_modules|\.git|dist)(?:\/|$)/;
    return !excluded.test(filePath);
  },

  resolveImport(): string | null {
    return null;
  },

  getRole(filePath: string): string | null {
    const parts = filePath.split(/[\\/]/);
    if (parts.some(p => /^routes?$/i.test(p))) return 'Route';
    if (parts.some(p => /^controllers?$/i.test(p))) return 'Controller';
    if (parts.some(p => /^middlewares?$/i.test(p))) return 'Middleware';
    if (parts.some(p => /^models?$/i.test(p))) return 'Model';
    if (parts.some(p => /^services?$/i.test(p))) return 'Service';
    return 'Logic';
  },

  // Express routes are not extracted in this phase
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getRoutes(_sourceFile: SourceFile, _relativePath: string): Route[] {
    return [];
  }
};
