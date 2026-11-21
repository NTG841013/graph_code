import { Project, SyntaxKind, SourceFile, ts } from 'ts-morph';
import path from 'path';
import fs from 'fs';
import { Edge, UnresolvedImport, ParserAdapter, Route } from './types';

export function processRepo(
  root: string, 
  filePaths: string[], 
  adapter?: ParserAdapter
): { edges: Edge[]; unresolved: UnresolvedImport[]; routes: Route[] } {
  const tsConfigPath = path.join(root, 'tsconfig.json');
  const hasTsConfig = fs.existsSync(tsConfigPath);

  let compilerOptions: ts.CompilerOptions = {
    allowJs: true,
    checkJs: false,
  };

  if (hasTsConfig) {
    try {
      const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
      const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
      compilerOptions = { ...compilerOptions, ...parsedConfig.options };
    } catch (err) {
      console.warn(`Failed to parse tsconfig.json: ${err}`);
    }
  }

  const project = new Project({
    compilerOptions,
  });

  const absoluteRoot = path.resolve(root);
  const absolutePaths = filePaths.map(p => path.join(absoluteRoot, p));
  const allowedPaths = new Set(absolutePaths.map(p => path.resolve(p)));
  
  // Only add JS/TS/JSON files to ts-morph project
  absolutePaths.forEach(p => {
    const ext = path.extname(p);
    if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'].includes(ext)) {
      try {
        project.addSourceFileAtPath(p);
      } catch (err) {
        console.warn(`Failed to add ${p} to project: ${err}`);
      }
    }
  });

  const edges: Edge[] = [];
  const unresolved: UnresolvedImport[] = [];
  const routes: Route[] = [];

  function isExternal(specifier: string) {
    return !specifier.startsWith('.') && !path.isAbsolute(specifier);
  }

  function resolveAndAdd(from: string, specifier: string, targetFile: SourceFile | undefined, type: Edge['type']) {
    let targetPath: string | null = null;
    let isOutside = false;
    
    if (targetFile) {
      targetPath = path.resolve(targetFile.getFilePath());
    } else if (adapter) {
      const resolved = adapter.resolveImport(path.join(absoluteRoot, from), specifier);
      if (resolved) {
        targetPath = path.resolve(absoluteRoot, resolved);
      }
    }

    if (targetPath) {
      const normalizedRoot = path.resolve(absoluteRoot);
      const rootWithSep = normalizedRoot.endsWith(path.sep) ? normalizedRoot : normalizedRoot + path.sep;
      
      // Ensure the target is within the root and was not excluded by the crawler
      if (targetPath.startsWith(rootWithSep) && allowedPaths.has(targetPath)) {
        const to = path.relative(normalizedRoot, targetPath).replace(/\\/g, '/');
        edges.push({ from, to, type });
        return;
      }

      if (!targetPath.startsWith(rootWithSep)) {
        isOutside = true;
      }
    }

    const reason = (isOutside || isExternal(specifier)) ? 'outside' : 'failed';
    unresolved.push({ file: from, specifier, reason });
  }

  for (const sourceFile of project.getSourceFiles()) {
    const from = path.relative(absoluteRoot, sourceFile.getFilePath()).replace(/\\/g, '/');

    // Extract framework routes
    if (adapter?.getRoutes) {
      try {
        const fileRoutes = adapter.getRoutes(sourceFile, from);
        fileRoutes.forEach(r => {
          if (path.isAbsolute(r.file)) {
            r.file = path.relative(absoluteRoot, r.file).replace(/\\/g, '/');
          }
        });
        routes.push(...fileRoutes);
      } catch (err) {
        console.warn(`Failed to extract routes from ${from}: ${err}`);
      }
    }

    // Standard Imports
    sourceFile.getImportDeclarations().forEach(imp => {
      try {
        const specifier = imp.getModuleSpecifierValue();
        resolveAndAdd(from, specifier, imp.getModuleSpecifierSourceFile(), 'import');
      } catch {
        // Skip imports that aren't string literals (e.g. malformed or special cases)
      }
    });

    // Re-exports
    sourceFile.getExportDeclarations().forEach(exp => {
      try {
        const specifier = exp.getModuleSpecifierValue();
        if (specifier) {
          resolveAndAdd(from, specifier, exp.getModuleSpecifierSourceFile(), 're-export');
        }
      } catch {
        // Skip re-exports that aren't string literals
      }
    });

    // Dynamic Imports
    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
      if (call.getExpression().getKind() === SyntaxKind.ImportKeyword) {
        const args = call.getArguments();
        if (args.length > 0) {
          const arg = args[0];
          if (arg.getKind() === SyntaxKind.StringLiteral) {
            const specifier = arg.getText().slice(1, -1);
            // For dynamic imports, we try to resolve via the project
            // ts-morph doesn't always resolve these automatically to SourceFiles
            // We can try to resolve the path manually or use internal resolution
            const stringLiteral = arg.asKind(SyntaxKind.StringLiteral);
            if (stringLiteral) {
              const targetFile = stringLiteral.getSymbol()?.getDeclarations()[0]?.getSourceFile();
              resolveAndAdd(from, specifier, targetFile, 'dynamic');
            }
          }
        }
      }
    });

    // CommonJS require()
    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
      const expression = call.getExpression();
      if (
        expression.getKind() === SyntaxKind.Identifier && 
        expression.getText() === 'require'
      ) {
        const args = call.getArguments();
        if (args.length === 1) {
          const arg = args[0];
          if (arg.getKind() === SyntaxKind.StringLiteral) {
            const specifier = arg.getText().slice(1, -1);
            const stringLiteral = arg.asKind(SyntaxKind.StringLiteral);
            if (stringLiteral) {
              const targetFile = stringLiteral.getSymbol()?.getDeclarations()[0]?.getSourceFile();
              resolveAndAdd(from, specifier, targetFile, 'require');
            }
          }
        }
      }
    });
  }

  // Unique edges by from/to
  const uniqueEdges: Edge[] = [];
  const edgeKeys = new Set<string>();
  for (const edge of edges) {
    const key = `${edge.from}->${edge.to}`;
    if (!edgeKeys.has(key)) {
      uniqueEdges.push(edge);
      edgeKeys.add(key);
    }
  }

  return { edges: uniqueEdges, unresolved, routes };
}
