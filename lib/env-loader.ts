// @ts-expect-error - next/env types are not always visible in standalone script context
import { loadEnvConfig } from '@next/env';

/**
 * Loads environment variables from .env.local and other standard Next.js env files.
 * This should be called at the very beginning of any script that runs outside the Next.js app context
 * but needs access to the same configuration (e.g., Supabase keys, OpenAI keys).
 */
export function loadEnv() {
  const projectDir = process.cwd();
  loadEnvConfig(projectDir);
}
