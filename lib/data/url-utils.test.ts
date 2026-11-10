import { describe, it, expect } from 'vitest';
import { normalizeRepoUrl } from './url-utils';

describe('normalizeRepoUrl', () => {
  it('should normalize standard HTTPS URL', () => {
    expect(normalizeRepoUrl('https://github.com/owner/repo')).toBe('https://github.com/owner/repo');
  });

  it('should remove trailing slash', () => {
    expect(normalizeRepoUrl('https://github.com/owner/repo/')).toBe('https://github.com/owner/repo');
  });

  it('should remove .git suffix', () => {
    expect(normalizeRepoUrl('https://github.com/owner/repo.git')).toBe('https://github.com/owner/repo');
  });

  it('should lowercase owner and repo', () => {
    expect(normalizeRepoUrl('https://github.com/Owner/Repo')).toBe('https://github.com/owner/repo');
  });

  it('should handle URL without protocol', () => {
    expect(normalizeRepoUrl('github.com/owner/repo')).toBe('https://github.com/owner/repo');
  });

  it('should handle SSH format', () => {
    expect(normalizeRepoUrl('git@github.com:owner/repo.git')).toBe('https://github.com/owner/repo');
  });

  it('should ignore extra path components', () => {
    // We only care about owner/repo
    expect(normalizeRepoUrl('https://github.com/owner/repo/tree/main')).toBe('https://github.com/owner/repo');
  });

  it('should strip query parameters', () => {
    expect(normalizeRepoUrl('https://github.com/owner/repo.git?tab=readme')).toBe('https://github.com/owner/repo');
  });

  it('should strip fragments', () => {
    expect(normalizeRepoUrl('https://github.com/owner/repo#readme')).toBe('https://github.com/owner/repo');
  });

  it('should handle www subdomain', () => {
    expect(normalizeRepoUrl('https://www.github.com/owner/repo')).toBe('https://github.com/owner/repo');
  });

  it('should return original if not a github URL', () => {
    expect(normalizeRepoUrl('https://gitlab.com/owner/repo')).toBe('https://gitlab.com/owner/repo');
  });
});
