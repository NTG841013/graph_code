import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';

const MAX_ZIP_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_EXTRACTED_SIZE = 200 * 1024 * 1024; // 200MB

export interface FetchResult {
  rootPath: string;
  commitHash: string;
  cleanup: () => Promise<void>;
}

export async function fetchRepo(repoUrl: string): Promise<FetchResult> {
  // Parse URL: https://github.com/owner/repo
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    throw new Error('Invalid GitHub URL. Must be like https://github.com/owner/repo');
  }

  const [, owner, repoRaw] = match;
  const repo = repoRaw.replace(/\/+$/, '').replace(/\.git$/, '');
  
  const tempDir = path.join(os.tmpdir(), `graphcode-${crypto.randomBytes(4).toString('hex')}`);
  await fs.mkdir(tempDir, { recursive: true });

  const zipPath = path.join(tempDir, 'repo.zip');
  const extractDir = path.join(tempDir, 'extracted');
  await fs.mkdir(extractDir, { recursive: true });

  try {
    // 1. Fetch metadata to get commit hash
    // We use the HEAD of the default branch
    const apiurl = `https://api.github.com/repos/${owner}/${repo}/commits/HEAD`;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Graphcode-Parser/1.0'
    };
    
    // Add GITHUB_TOKEN if available in environment
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const metaRes = await fetch(apiurl, { headers });
    
    if (!metaRes.ok) {
      if (metaRes.status === 404) {
        throw new Error(`Repository not found or private: ${owner}/${repo}`);
      }
      throw new Error(`Failed to fetch repo metadata for ${owner}/${repo}: ${metaRes.statusText} (${metaRes.status})`);
    }
    
    const meta = await metaRes.json() as { sha: string };
    const commitHash = meta.sha;

    // 2. Download ZIP (Streaming with limit)
    const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${commitHash}`;
    const zipRes = await fetch(zipUrl, { headers });
    
    if (!zipRes.ok) {
      throw new Error(`Failed to download repository archive: ${zipRes.statusText}`);
    }

    if (!zipRes.body) {
      throw new Error('Response body is null');
    }

    let downloadedBytes = 0;
    const limitStream = new Transform({
      transform(chunk, encoding, callback) {
        downloadedBytes += chunk.length;
        if (downloadedBytes > MAX_ZIP_SIZE) {
          callback(new Error(`Repository archive is too large (max ${MAX_ZIP_SIZE / 1024 / 1024}MB).`));
        } else {
          callback(null, chunk);
        }
      }
    });

    await pipeline(
      Readable.fromWeb(zipRes.body as unknown as import('node:stream/web').ReadableStream),
      limitStream,
      createWriteStream(zipPath)
    );

    // 3. Extract ZIP using adm-zip (cross-platform)
    const zip = new AdmZip(zipPath);
    
    // Check total uncompressed size before extraction to prevent memory exhaustion/zip bombs
    const zipEntries = zip.getEntries();
    let totalUncompressedSize = 0;
    for (const entry of zipEntries) {
      if (!entry.isDirectory) {
        totalUncompressedSize += entry.header.size;
      }
    }
    
    if (totalUncompressedSize > MAX_EXTRACTED_SIZE) {
      throw new Error(`Extracted repository size is too large (max ${MAX_EXTRACTED_SIZE / 1024 / 1024}MB).`);
    }

    zip.extractAllTo(extractDir, true);

    // 4. Find the extracted root (GitHub wraps it in a folder like owner-repo-sha)
    const entries = await fs.readdir(extractDir);
    if (entries.length === 0) {
      throw new Error('ZIP extraction failed: empty directory');
    }
    
    const rootPath = path.join(extractDir, entries[0]);

    const cleanup = async () => {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (err) {
        console.warn(`Failed to cleanup temp dir ${tempDir}:`, err);
      }
    };

    return { rootPath, commitHash, cleanup };
  } catch (err) {
    // Cleanup on failure
    await fs.rm(tempDir, { recursive: true, force: true });
    throw err;
  }
}
