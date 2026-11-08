'use client';

import { useState } from "react";
import { AppHeader } from "@/app/components/app-header";
import { MapCanvas } from "@/app/components/map/canvas";
import { DetailPane } from "@/app/components/detail-pane";
import { MOCK_ANALYSIS } from "@/lib/data/mock-analysis";
import { FileNode } from "@/lib/parser/types";
import { FolderNode } from "@/lib/parser/folding";

export default function PreviewPage() {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderNode | null>(null);

  const extensionCounts = MOCK_ANALYSIS.nodes.reduce((acc, node) => {
    const parts = node.path.split('.');
    const ext = parts.length > 1 ? `.${parts.pop()}` : 'other';
    acc[ext] = (acc[ext] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const extensionColors: Record<string, string> = {
    '.ts': '#6366f1',
    '.tsx': '#ec4899',
    '.js': '#f59e0b',
    '.mts': '#71717a',
    '.cjs': '#3f3f46',
    '.md': '#10b981',
    '.json': '#ef4444',
    '.css': '#3b82f6',
  };

  const categories = Object.entries(extensionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([ext, count]) => ({
      name: ext,
      count,
      color: extensionColors[ext] || '#a1a1aa'
    }));

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <AppHeader returnTo="/preview" />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Rail */}
        <aside className="w-56 flex flex-col border-r border-border bg-background">
          <div className="px-3 py-2 border-b border-border/50">
            <h2 className="font-mono text-[9px] text-muted uppercase tracking-wider">
              Categories — {MOCK_ANALYSIS.nodes.length} files
            </h2>
          </div>
          <nav className="flex-1 overflow-y-auto px-1.5 py-1.5">
            <ul className="space-y-0.5">
              {categories.map((cat) => (
                <li key={cat.name}>
                  <div className="flex items-center gap-2.5 rounded-sm px-2 py-1 text-[11px] hover:bg-surface cursor-default group transition-colors">
                    <span 
                      className="h-2 w-2 shrink-0 rounded-[1px]" 
                      style={{ backgroundColor: cat.color }} 
                    />
                    <span className="flex-1 font-mono text-foreground/80">{cat.name}</span>
                    <span className="font-mono text-[10px] text-muted group-hover:text-foreground/60 transition-colors">
                      {cat.count}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Middle Map Area */}
        <main className="relative flex-1 bg-background overflow-hidden">
          <MapCanvas 
            analysis={MOCK_ANALYSIS} 
            selectedFilePath={selectedFile?.path ?? null}
            selectedFolderId={selectedFolder?.id ?? null}
            onFileSelect={setSelectedFile}
            onFolderSelect={setSelectedFolder}
          />
        </main>

        {/* Right Detail Pane */}
        <DetailPane 
          analysis={MOCK_ANALYSIS}
          selectedFile={selectedFile}
          selectedFolder={selectedFolder}
          onFileSelect={(path) => {
            const file = MOCK_ANALYSIS.nodes.find(n => n.path === path);
            setSelectedFile(file || null);
            setSelectedFolder(null);
          }}
        />
      </div>
    </div>
  );
}
