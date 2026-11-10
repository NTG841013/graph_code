"use client";

import { Analysis } from "@/app/lib/data/analyses";
import { MapCanvas } from "@/app/components/map/canvas";
import { DetailPane } from "@/app/components/detail-pane";
import { RouteTable } from "@/app/components/route-table";
import { AnalysisResult, FileNode, Edge, Route, FrameworkInfo } from "@/lib/parser/types";
import { useState, useCallback, useMemo } from "react";
import { FolderNode } from "@/lib/parser/folding";
import { AppHeader } from "@/app/components/app-header";

interface ExplorerProps {
  analysis: Analysis;
  nodes: FileNode[];
  edges: Edge[];
  routes: Route[];
}

type Category = string;

export function Explorer({ analysis, nodes, edges, routes }: ExplorerProps) {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderNode | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [activeTab, setActiveTab] = useState<'map' | 'routes'>('map');

  const result: AnalysisResult = {
    nodes,
    edges,
    unresolved: [], 
    skipped: [],
    routes,
    framework: analysis.framework as unknown as FrameworkInfo | undefined,
    stats: {
      totalFiles: analysis.total_files || nodes.length,
      parsedFiles: analysis.parsed_files || nodes.length,
      skippedFiles: (analysis.total_files || 0) - (analysis.parsed_files || 0)
    }
  };

  const categories = useMemo(() => {
    const framework = analysis.framework as unknown as FrameworkInfo | undefined;
    const taxonomy = framework?.categories || ['Logic', 'Component', 'Utility'];
    
    const counts = new Map<string, number>();
    taxonomy.forEach(cat => counts.set(cat, 0));
    
    nodes.forEach(n => {
      const role = n.role || (taxonomy.includes('Unclassified') ? 'Unclassified' : taxonomy[0]);
      if (counts.has(role)) {
        counts.set(role, (counts.get(role) || 0) + 1);
      } else if (counts.has('Unclassified')) {
        counts.set('Unclassified', (counts.get('Unclassified') || 0) + 1);
      }
    });
    
    return taxonomy.map(cat => [cat, counts.get(cat) || 0] as [string, number]);
  }, [nodes, analysis.framework]);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Page route': 
      case 'Controller': return '#818cf8'; // Indigo
      case 'API endpoint':
      case 'Service': return '#f472b6'; // Pink
      case 'Server action':
      case 'Module': return '#fbbf24'; // Amber
      case 'Component': return '#2dd4bf'; // Teal
      case 'Entity': return '#a855f7'; // Purple
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
            {categories.map(([cat, count]: [string, number]) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? 'all' : cat)}
                className={`
                  flex items-center justify-between py-1.5 px-2 rounded-sm transition-colors group
                  ${activeCategory === cat ? 'bg-accent/10 text-accent' : 'hover:bg-surface/50 text-muted hover:text-foreground'}
                `}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: getCategoryColor(cat) }}
                  />
                  <span className="font-mono text-sm">{cat}</span>
                </div>
                <span className="font-mono text-sm opacity-60 group-hover:opacity-100">{count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 relative flex flex-col">
          <div className="border-b border-border bg-background px-4 flex gap-4">
            <button
              onClick={() => setActiveTab('map')}
              className={`px-3 py-2 text-[11px] font-mono transition-colors border-b-2 ${
                activeTab === 'map' 
                  ? 'text-foreground border-accent' 
                  : 'text-muted border-transparent hover:text-foreground/70'
              }`}
            >
              Map
            </button>
            <button
              onClick={() => setActiveTab('routes')}
              className={`px-3 py-2 text-[11px] font-mono transition-colors border-b-2 ${
                activeTab === 'routes' 
                  ? 'text-foreground border-accent' 
                  : 'text-muted border-transparent hover:text-foreground/70'
              }`}
            >
              Routes {routes.length > 0 && <span className="ml-1 opacity-60">{routes.length}</span>}
            </button>
          </div>

          <div className="flex-1 relative overflow-hidden">
            {activeTab === 'map' ? (
              <>
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
              </>
            ) : (
              <div className="h-full overflow-y-auto bg-background p-4">
                <div className="max-w-4xl mx-auto">
                  <p className="text-[10px] text-muted font-mono mb-4 px-4 italic">
                    Listed only where the method and the full path are both written in the code.
                  </p>
                  <RouteTable 
                    routes={routes} 
                    onFileSelect={handleFileSelectByPath} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DetailPane 
          analysis={result}
          selectedFile={selectedFile}
          selectedFolder={selectedFolder}
          onFileSelect={handleFileSelectByPath}
          analysisId={analysis.id}
        />
      </div>
    </div>
  );
}
