import { Project, SyntaxKind, SourceFile } from 'ts-morph';
import path from 'path';
import { Edge, UnresolvedImport } from './types';

export function processRepo(root: string, filePaths: string[]): { edges: Edge[]; unresolved: UnresolvedImport[] } {
  const project = new Project({
    compilerOptions: {
      allowJs: true,
      checkJs: false,
    },
  });

  const absoluteRoot = path.resolve(root);
  const absolutePaths = filePaths.map(p => path.join(absoluteRoot, p));
  
  // Only add JS/TS files to ts-morph project
  absolutePaths.forEach(p => {
    const ext = path.extname(p);
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      try {
        project.addSourceFileAtPath(p);
      } catch (err) {
        console.warn(`Failed to add ${p} to project: ${err}`);
      }
    }
  });

  const edges: Edge[] = [];
  const unresolved: UnresolvedImport[] = [];

  function isExternal(specifier: string) {
    return !specifier.startsWith('.') && !path.isAbsolute(specifier);
  }

  function resolveAndAdd(from: string, specifier: string, targetFile: SourceFile | undefined, type: Edge['type']) {
    if (targetFile) {
      const targetPath = path.resolve(targetFile.getFilePath());
      const normalizedRoot = path.resolve(absoluteRoot);
      
      // Ensure the target is within the root
      if (targetPath.startsWith(normalizedRoot.endsWith(path.sep) ? normalizedRoot : normalizedRoot + path.sep)) {
        const to = path.relative(normalizedRoot, targetPath).replace(/\\/g, '/');
        edges.push({ from, to, type });
      } else {
        unresolved.push({ file: from, specifier, reason: 'outside' });
      }
    } else {
      const reason = isExternal(specifier) ? 'outside' : 'failed';
      unresolved.push({ file: from, specifier, reason });
    }
  }

  for (const sourceFile of project.getSourceFiles()) {
    const from = path.relative(absoluteRoot, sourceFile.getFilePath()).replace(/\\/g, '/');

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

  return { edges: uniqueEdges, unresolved };
}
