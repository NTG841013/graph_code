export async function getLatestCommitHash(repoUrl: string): Promise<string> {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error("Invalid GitHub URL");
  const [, owner, repoRaw] = match;
  const repo = repoRaw.replace(/\/+$/, "").replace(/\.git$/, "");

  const apiurl = `https://api.github.com/repos/${owner}/${repo}/commits/HEAD`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Graphcode-Parser/1.0",
  };

  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(apiurl, { headers, next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch repo metadata: ${res.statusText}`);
  }

  const meta = (await res.json()) as { sha: string };
  return meta.sha;
}

export async function getFileContent(
  repoUrl: string,
  filePath: string,
  commitHash: string = "HEAD"
): Promise<string> {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error("Invalid GitHub URL");
  const [, owner, repoRaw] = match;
  const repo = repoRaw.replace(/\/+$/, "").replace(/\.git$/, "");

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${commitHash}`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3.raw",
    "User-Agent": "Graphcode-Parser/1.0",
  };

  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch file content for ${filePath}: ${res.statusText} (${res.status})`);
  }

  return await res.text();
}
