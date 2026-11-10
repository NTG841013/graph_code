export interface FileNode {
  path: string;
  folder: string;
  lineCount: number;
  hash: string;
  fanIn: number;
  fanOut: number;
  isEntry?: boolean;
  role?: string;
}

export type EdgeType = 'import' | 're-export' | 'dynamic';

export interface Edge {
  from: string;
  to: string;
  type: EdgeType;
}

export interface UnresolvedImport {
  file: string;
  specifier: string;
  reason: 'outside' | 'excluded' | 'failed';
  message?: string;
}

export interface SkippedFile {
  path: string;
  reason: string;
}

export interface AnalysisResult {
  nodes: FileNode[];
  edges: Edge[];
  unresolved: UnresolvedImport[];
  skipped: SkippedFile[];
  stats: {
    totalFiles: number;
    parsedFiles: number;
    skippedFiles: number;
  };
}

export interface ParserAdapter {
  isEntry(path: string): boolean;
  shouldInclude(path: string): boolean;
  resolveImport(sourceFile: string, specifier: string): string | null;
  getRole(path: string): string | null;
}
