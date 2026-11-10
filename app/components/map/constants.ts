export const EXTENSION_COLORS: Record<string, string> = {
  '.ts': '#6366f1',   // indigo-500
  '.tsx': '#ec4899',  // pink-500
  '.js': '#f59e0b',   // amber-500
  '.jsx': '#f97316',  // orange-500
  '.mts': '#71717a',  // zinc-500
  '.cjs': '#3f3f46',  // zinc-700
  '.md': '#10b981',   // emerald-500
  '.json': '#ef4444',  // red-500
  '.css': '#3b82f6',   // blue-500
};

export function getFileColor(path: string): string {
  const parts = path.split('.');
  const ext = parts.length > 1 ? `.${parts.pop()}` : 'other';
  return EXTENSION_COLORS[ext] || '#a1a1aa';
}

export const ROLE_COLORS: Record<string, string> = {
  'Page route': '#6366f1',      // indigo-500
  'API endpoint': '#ec4899',    // pink-500
  'Server action': '#f59e0b',   // amber-500
  'Component': '#3b82f6',       // blue-500
  'Logic': '#10b981',           // emerald-500
  'entry': '#ef4444',           // red-500
};

export function getRoleColor(role: string): string {
  return ROLE_COLORS[role] || '#a1a1aa';
}
