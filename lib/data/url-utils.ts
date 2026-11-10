/**
 * Normalizes a repository URL to a canonical GitHub format if applicable.
 * 
 * For GitHub URLs, it ensures the format: https://github.com/owner/repo
 * - Removes trailing slashes
 * - Removes .git suffix
 * - Converts owner and repository to lowercase
 * - Handles both HTTPS and SSH formats
 */
export function normalizeRepoUrl(repoUrl: string): string {
  if (!repoUrl) return "";

  let normalized = repoUrl.trim();

  // 1. Remove query parameters and fragments first to avoid them interfering with suffix checks
  normalized = normalized.split(/[?#]/)[0];

  // 2. Remove trailing slashes
  normalized = normalized.replace(/\/+$/, "");
  
  // Case-insensitive removal of .git
  if (normalized.toLowerCase().endsWith(".git")) {
    normalized = normalized.slice(0, -4);
  }

  // 3. Extract owner and repository for GitHub URLs
  // This regex handles:
  // - https://github.com/owner/repo
  // - git@github.com:owner/repo
  // - github.com/owner/repo
  // It stops after the first two path components (owner and repo).
  const githubRegex = /(?:github\.com[:/])([^/]+\/[^/]+)/i;
  const match = normalized.match(githubRegex);
  
  if (match) {
    const ownerRepo = match[1].toLowerCase();
    return `https://github.com/${ownerRepo}`;
  }

  // 4. Fallback for non-GitHub URLs: just return the cleaned-up URL
  return normalized;
}
