import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { SkippedFile } from './types';

const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build']);
const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

export interface RawFileNode {
  path: string;
  folder: string;
  lineCount: number;
  hash: string;
}

export async function crawl(root: string): Promise<{ nodes: RawFileNode[]; skipped: SkippedFile[] }> {
  const nodes: RawFileNode[] = [];
  const skipped: SkippedFile[] = [];

  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(root, fullPath);

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) {
          skipped.push({ path: relativePath, reason: 'ignored-directory' });
          continue;
        }
        await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (!SUPPORTED_EXTENSIONS.has(ext)) {
          skipped.push({ path: relativePath, reason: 'unsupported-extension' });
          continue;
        }

        try {
          const content = await fs.readFile(fullPath, 'utf8');
          const lineCount = content.split('\n').length;
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          const folder = path.dirname(relativePath) === '.' ? '' : path.dirname(relativePath);

          nodes.push({
            path: relativePath.replace(/\\/g, '/'),
            folder: folder.replace(/\\/g, '/'),
            lineCount,
            hash,
          });
        } catch (err) {
          skipped.push({ path: relativePath, reason: `read-failed: ${err instanceof Error ? err.message : String(err)}` });
        }
      }
    }
  }

  await walk(root);
  return { nodes, skipped };
}
