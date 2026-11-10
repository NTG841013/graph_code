"use client";

import { Analysis } from "@/app/lib/data/analyses";
import { MapCanvas } from "@/app/components/map/canvas";
import { DetailPane } from "@/app/components/detail-pane";
import { AnalysisResult, FileNode, Edge } from "@/lib/parser/types";
import { useState, useCallback, useMemo } from "react";
import { FolderNode } from "@/lib/parser/folding";
import { AppHeader } from "@/app/components/app-header";

interface ExplorerProps {
  analysis: Analysis;
  nodes: FileNode[];
  edges: Edge[];
}

type Category = string;

export function Explorer({ analysis, nodes, edges }: ExplorerProps) {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderNode | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('all');

  const result: AnalysisResult = {
    nodes,
    edges,
    unresolved: [], 
    skipped: [],
    stats: {
      totalFiles: analysis.total_files || nodes.length,
      parsedFiles: analysis.parsed_files || nodes.length,
      skippedFiles: (analysis.total_files || 0) - (analysis.parsed_files || 0)
    }
  };

  const categories = useMemo(() => {
    const extCounts = new Map<string, number>();
    nodes.forEach(n => {
      const ext = n.path.includes('.') ? `.${n.path.split('.').pop()}` : 'other';
      extCounts.set(ext, (extCounts.get(ext) || 0) + 1);
    });
    
    return Array.from(extCounts.entries())
      .sort((a, b) => b[1] - a[1]);
  }, [nodes]);

  const getExtColor = (ext: string) => {
    switch (ext) {
      case '.ts': return '#818cf8'; // Indigo
      case '.tsx': return '#f472b6'; // Pink
      case '.mjs': return '#94a3b8'; // Slate/Grey
      default: return '#64748b';
    }
  };

  const handleFileSelectByPath = useCallback((path: string | null) => {
    if (!path) {
      setSelectedFile(null);
      return;
    }
    const node = nodes.find(n => n.path === path);
    if (node) {
      setSelectedFile(node);
      setSelectedFolder(null);
    }
  }, [nodes]);

  const [owner, repo] = (analysis.projects?.name || "unnamed/project").split('/');
  const totalFiles = analysis.total_files ?? 0;
  const parsedFiles = analysis.parsed_files ?? 0;
  const coverage = totalFiles > 0 
    ? Math.round((parsedFiles / totalFiles) * 100) 
    : 100;

  return (
    <div className="h-screen flex flex-col bg-background selection:bg-accent/20">
      <AppHeader returnTo="/" />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Categories */}
        <div className="w-64 border-r border-border bg-surface/5 flex flex-col p-4 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-mono text-[11px] text-muted uppercase tracking-wider">
              Categories · {nodes.length} files
            </h2>
          </div>
          
          <div className="flex flex-col gap-1">
            {categories.map(([ext, count]: [string, number]) => (
              <button
                key={ext}
                onClick={() => setActiveCategory(activeCategory === ext ? 'all' : ext)}
                className={`
                  flex items-center justify-between py-1.5 px-2 rounded-sm transition-colors group
                  ${activeCategory === ext ? 'bg-accent/10 text-accent' : 'hover:bg-surface/50 text-muted hover:text-foreground'}
                `}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: getExtColor(ext) }}
                  />
                  <span className="font-mono text-sm">{ext}</span>
                </div>
                <span className="font-mono text-sm opacity-60 group-hover:opacity-100">{count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 relative flex flex-col">
          <div className="flex-1 relative">
            <MapCanvas 
              analysis={result}
              selectedFilePath={selectedFile?.path}
              selectedCategory={activeCategory === 'all' ? null : activeCategory}
              onFileSelect={setSelectedFile}
              onFolderSelect={setSelectedFolder}
            />
            
            {/* Repository Info Overlay */}
            <div className="absolute top-4 left-4 z-10 font-mono text-[10px] bg-background/90 backdrop-blur-sm border border-border px-2 py-1 flex gap-2 items-center shadow-sm">
              <span className="text-muted/60">{owner}/</span>
              <span className="font-bold text-foreground">{repo}</span>
              <span className="text-muted/20">|</span>
              <span className="text-muted/60 uppercase tracking-tighter">
                {analysis.commit_hash?.substring(0, 7) || 'HEAD'}
              </span>
            </div>

            {/* Coverage Banner */}
            <div className="absolute bottom-4 right-4 z-10 bg-background/90 backdrop-blur-sm border border-border px-3 py-1.5 shadow-sm">
              <p className="font-mono text-[10px] text-muted flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${coverage < 90 ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
                <span className="font-bold text-foreground uppercase tracking-widest">
                  {coverage < 90 ? 'Partial Graph' : 'Graph Coverage'}
                </span>
                <span className="text-muted/30">|</span>
                <span>{parsedFiles} of {totalFiles} files mapped</span>
                {coverage < 100 && <span className="text-[8px] opacity-40 ml-1">({coverage}%)</span>}
              </p>
            </div>
          </div>
        </div>

        <DetailPane 
          analysis={result}
          selectedFile={selectedFile}
          selectedFolder={selectedFolder}
          onFileSelect={handleFileSelectByPath}
        />
      </div>
    </div>
  );
}
