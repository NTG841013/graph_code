/**
 * Deterministically extracts path-shaped tokens from an explanation text.
 * Paths are expected to be wrapped in backticks as per prompt constraints.
 */
export function extractPathTokens(text: string): string[] {
  const backtickRegex = /`([^`]+)`/g;
  const matches = [];
  let match;
  while ((match = backtickRegex.exec(text)) !== null) {
    const token = match[1];
    if (isPathShaped(token)) {
      matches.push(token);
    }
  }
  return matches;
}

/**
 * Heuristic to determine if a token is "path-shaped".
 * In this project, paths always use forward slashes and usually have extensions.
 */
function isPathShaped(token: string): boolean {
  // Contains a slash
  if (token.includes('/')) return true;
  // Has a common file extension
  if (/\.(ts|tsx|js|jsx|json|md|css|mjs|mts)$/.test(token)) return true;
  // Special cases if any (none obvious for now)
  return false;
}

/**
 * Validates that all path-shaped tokens in the text are present in the allowed set.
 */
export function validatePaths(text: string, allowedPaths: Set<string>): {
  valid: boolean;
  invented: string[];
} {
  const tokens = extractPathTokens(text);
  const invented = tokens.filter(t => !allowedPaths.has(t));
  return {
    valid: invented.length === 0,
    invented,
  };
}
