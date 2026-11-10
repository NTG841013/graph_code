"use client";

import { Route } from "@/lib/parser/types";

interface RouteTableProps {
  routes: Route[];
  onFileSelect: (path: string) => void;
}

export function RouteTable({ routes, onFileSelect }: RouteTableProps) {
  if (routes.length === 0) {
    return (
      <div className="p-4 text-muted font-mono text-[11px] uppercase tracking-wider text-center">
        No routes detected
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-surface/30">
        <h3 className="font-mono text-[11px] text-muted uppercase tracking-wider">
          Routes · {routes.length}
        </h3>
      </div>
      <table className="w-full border-collapse font-mono text-[11px]">
        <thead>
          <tr className="border-b border-border/50 text-left text-muted/60">
            <th className="px-4 py-2 font-normal uppercase">Method</th>
            <th className="px-4 py-2 font-normal uppercase">Pattern</th>
            <th className="px-4 py-2 font-normal uppercase">Declared in</th>
          </tr>
        </thead>
        <tbody>
          {routes.map((route, i) => (
            <tr 
              key={i} 
              className="border-b border-border/30 hover:bg-accent/5 cursor-pointer group"
              onClick={() => route.file && onFileSelect(route.file)}
            >
              <td className="px-4 py-2 align-top">
                <span className={`px-1.5 py-0.5 rounded-xs font-bold ${getMethodColor(route.method)}`}>
                  {route.method}
                </span>
              </td>
              <td className="px-4 py-2 break-all group-hover:text-accent">
                {route.path}
              </td>
              <td className="px-4 py-2 text-muted/60">
                {route.file ? `${route.file}${route.line ? `:${route.line}` : ''}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getMethodColor(method: string) {
  switch (method.toUpperCase()) {
    case 'GET': return 'text-green-500 bg-green-500/10';
    case 'POST': return 'text-blue-500 bg-blue-500/10';
    case 'PUT': return 'text-amber-500 bg-amber-500/10';
    case 'DELETE': return 'text-red-500 bg-red-500/10';
    case 'PATCH': return 'text-purple-500 bg-purple-500/10';
    default: return 'text-muted bg-muted/10';
  }
}
