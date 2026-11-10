import { ParserAdapter, Route } from '../parser/types';
import { SourceFile, SyntaxKind } from 'ts-morph';

export const NestAdapter: ParserAdapter = {
  name: 'NestJS',

  detect(filePaths: string[]): boolean {
    return filePaths.some(p => 
      p.endsWith('.controller.ts') || 
      p.endsWith('.service.ts') || 
      p.endsWith('.module.ts')
    );
  },

  isEntry(path: string): boolean {
    return path.includes('main.ts') || path.endsWith('.module.ts');
  },

  shouldInclude(path: string): boolean {
    const excluded = /(?:^|\/)(?:node_modules|\.git|dist)(?:\/|$)/;
    return !excluded.test(path);
  },

  resolveImport(): string | null {
    return null;
  },

  getRole(path: string): string | null {
    if (path.endsWith('.controller.ts')) return 'Controller';
    if (path.endsWith('.service.ts')) return 'Service';
    if (path.endsWith('.module.ts')) return 'Module';
    if (path.endsWith('.entity.ts')) return 'Entity';
    return 'Logic';
  },

  getRoutes(sourceFile: SourceFile): Route[] {
    const routes: Route[] = [];
    const filePath = sourceFile.getFilePath();

    sourceFile.getClasses().forEach(cls => {
      const controllerDecorator = cls.getDecorator('Controller');
      if (!controllerDecorator) return;

      let basePath = '';
      const args = controllerDecorator.getArguments();
      if (args.length > 0 && args[0].getKind() === SyntaxKind.StringLiteral) {
        basePath = args[0].getText().replace(/['"]/g, '');
      }

      cls.getMethods().forEach(method => {
        const httpDecorators = ['Get', 'Post', 'Put', 'Delete', 'Patch', 'All', 'Options', 'Head'];
        for (const decoName of httpDecorators) {
          const deco = method.getDecorator(decoName);
          if (deco) {
            let subPath = '';
            const decoArgs = deco.getArguments();
            if (decoArgs.length > 0 && decoArgs[0].getKind() === SyntaxKind.StringLiteral) {
              subPath = decoArgs[0].getText().replace(/['"]/g, '');
            }

            const fullPath = ('/' + basePath + '/' + subPath).replace(/\/+/g, '/').replace(/\/$/, '');
            routes.push({
              method: decoName === 'All' ? 'ANY' : decoName.toUpperCase(),
              path: fullPath || '/',
              file: filePath.replace(/\\/g, '/')
            });
          }
        }
      });
    });

    return routes;
  }
};
