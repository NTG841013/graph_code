// @ts-ignore
import { loadEnvConfig } from '@next/env';
import path from 'path';
import fs from 'fs';

/**
 * Loads environment variables from .env.local and other standard Next.js env files.
 * Searches upwards from the current directory to find the project root.
 */
export function loadEnv() {
  let currentDir = process.cwd();
  
  // Search upwards for .env.local or package.json that marks the root
  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, '.env.local')) || 
        fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
      break;
    }
    currentDir = path.dirname(currentDir);
  }

  loadEnvConfig(currentDir);
}
