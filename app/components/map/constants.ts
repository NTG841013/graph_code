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
  // Next.js (Plural)
  'Page routes': '#818cf8',        // indigo-400
  'API endpoints': '#f472b6',      // pink-400
  'Server actions': '#fbbf24',     // amber-400
  'Layouts': '#34d399',            // emerald-400
  'Loading & error UI': '#fb7185', // rose-400
  'Components': '#60a5fa',         // blue-400
  'Hooks': '#22d3ee',              // cyan-400
  'Middleware': '#a78bfa',         // violet-400
  'Metadata files': '#a1a1aa',     // zinc-400
  'Instrumentation': '#e879f9',    // fuchsia-400
  'Config files': '#fb923c',       // orange-400
  'Tests': '#f87171',              // red-400
  'Unclassified': '#94a3b8',       // slate-400

  // NestJS / Generic / Legacy (Singular)
  'Page route': '#818cf8',
  'API endpoint': '#f472b6',
  'Server action': '#fbbf24',
  'Component': '#60a5fa',
  'Controller': '#818cf8',
  'Service': '#f472b6',
  'Module': '#fbbf24',
  'Entity': '#c084fc',             // purple-400
  'Logic': '#34d399',
  'Hook': '#22d3ee',
  'Context': '#22d3ee',
  'Utility': '#a1a1aa',
  'Entry point': '#f87171',
  'entry': '#f87171',
};

export function getRoleColor(role: string): string {
  return ROLE_COLORS[role] || '#a1a1aa';
}
