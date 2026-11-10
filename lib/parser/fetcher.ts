import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';

const execAsync = promisify(exec);

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

    // 2. Download ZIP
    const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${commitHash}`;
    const zipRes = await fetch(zipUrl, { headers });
    
    if (!zipRes.ok) {
      throw new Error(`Failed to download repository archive: ${zipRes.statusText}`);
    }

    const buffer = await zipRes.arrayBuffer();
    await fs.writeFile(zipPath, Buffer.from(buffer));

    // 3. Extract ZIP using PowerShell (Windows native)
    // PowerShell command: Expand-Archive -Path $zipPath -DestinationPath $extractDir
    // We double quote paths to handle spaces
    await execAsync(`powershell.exe -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}'"`);

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
