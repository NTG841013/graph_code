'use client';

import React, { useState, useMemo } from 'react';
import { AnalysisResult, FileNode } from '@/lib/parser/types';
import { FolderNode } from '@/lib/parser/folding';

interface DetailPaneProps {
  analysis: AnalysisResult;
  selectedFile: FileNode | null;
  selectedFolder: FolderNode | null;
  onFileSelect: (path: string | null) => void;
}

export function DetailPane({
  analysis,
  selectedFile,
  selectedFolder,
  onFileSelect,
}: DetailPaneProps) {
  const [activeTab, setActiveTab] = useState<'structure' | 'explanation'>('structure');


  const framework = useMemo(() => {
    const hasNextConfig = analysis.nodes.some(n => n.path.includes('next.config'));
    if (hasNextConfig) return 'Next.js';
    const hasSvelte = analysis.nodes.some(n => n.path.endsWith('.svelte'));
    if (hasSvelte) return 'Svelte';
    const hasVue = analysis.nodes.some(n => n.path.endsWith('.vue'));
    if (hasVue) return 'Vue';
    return 'TypeScript';
  }, [analysis.nodes]);

  const routes = useMemo(() => {
    return analysis.nodes.filter(n => 
      (n.path.includes('/app/') || n.path.includes('/pages/')) && 
      (n.path.endsWith('page.tsx') || n.path.endsWith('route.ts') || n.path.endsWith('page.js') || n.path.endsWith('route.js'))
    ).length;
  }, [analysis.nodes]);

  const mostDependedOn = useMemo(() => {
    return [...analysis.nodes].sort((a, b) => b.fanIn - a.fanIn).slice(0, 5);
  }, [analysis.nodes]);

  const orphans = useMemo(() => {
    return analysis.nodes.filter(n => n.fanIn === 0).slice(0, 5);
  }, [analysis.nodes]);

  const unidentifiedCount = useMemo(() => {
    return analysis.skipped.filter(s => s.reason === 'unsupported-extension').length;
  }, [analysis.skipped]);

  const dependencies = useMemo(() => {
    if (!selectedFile) return [];
    return analysis.edges
      .filter(e => e.from === selectedFile.path)
      .map(e => e.to);
  }, [analysis.edges, selectedFile]);

  const dependents = useMemo(() => {
    if (!selectedFile) return [];
    return analysis.edges
      .filter(e => e.to === selectedFile.path)
      .map(e => e.from);
  }, [analysis.edges, selectedFile]);

  const folderStats = useMemo(() => {
    if (!selectedFolder) return null;
    const counts: Record<string, number> = {};
    selectedFolder.files.forEach(f => {
      const ext = f.path.split('.').pop() || 'unknown';
      counts[ext] = (counts[ext] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [selectedFolder]);

  const renderTabTrigger = (id: 'structure' | 'explanation', label: string) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors border-b ${
        activeTab === id 
          ? 'text-foreground border-accent' 
          : 'text-muted border-transparent hover:text-foreground/70'
      }`}
    >
      {label}
    </button>
  );

  return (
    <aside className="w-80 flex flex-col border-l border-border bg-surface/10 overflow-hidden">
      <div className="flex border-b border-border/50 bg-background/50">
        {renderTabTrigger('structure', 'Structure')}
        {renderTabTrigger('explanation', 'Explanation')}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'explanation' ? (
          <div className="p-4 flex flex-col items-center justify-center h-full text-center space-y-2">
            <p className="font-mono text-[11px] text-muted italic">No explanation available yet.</p>
            <p className="font-mono text-[9px] text-muted/60 uppercase tracking-tight">AI insight follows model call</p>
          </div>
        ) : (
          <div className="p-3 space-y-6">
            {!selectedFile && !selectedFolder ? (
              // Repository Summary
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="font-mono text-[9px] uppercase text-muted tracking-wider">Repository</p>
                    <h3 className="font-mono text-sm font-medium truncate">graphcode</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <StatItem label="Framework" value={framework} />
                    <StatItem label="Files" value={analysis.stats.totalFiles} />
                    <StatItem label="Imports" value={analysis.edges.length} />
                    <StatItem label="Routes" value={routes} />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="font-mono text-[9px] uppercase text-muted tracking-wider">Most depended on</p>
                  <ul className="space-y-1">
                    {mostDependedOn.map(file => (
                      <li key={file.path}>
                        <button 
                          onClick={() => onFileSelect(file.path)}
                          className="w-full text-left font-mono text-[10px] truncate p-1 rounded-sm hover:bg-surface transition-colors"
                        >
                          {file.path}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <p className="font-mono text-[9px] uppercase text-muted tracking-wider">Where to start</p>
                  <ul className="space-y-1">
                    {orphans.map(file => (
                      <li key={file.path}>
                        <button 
                          onClick={() => onFileSelect(file.path)}
                          className="w-full text-left font-mono text-[10px] truncate p-1 rounded-sm hover:bg-surface transition-colors"
                        >
                          {file.path}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {unidentifiedCount > 0 && (
                  <div className="pt-2 border-t border-border/20">
                    <p className="font-mono text-[10px] text-muted">
                      {unidentifiedCount} files could not be identified
                    </p>
                  </div>
                )}
              </div>
            ) : selectedFile ? (
              // File Selection
              <div className="space-y-6">
                <div className="space-y-1">
                  <p className="font-mono text-[9px] uppercase text-accent tracking-wider">File Path</p>
                  <p className="font-mono text-[11px] break-all">{selectedFile.path}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-border/20 pt-3">
                  <StatItem label="Kind" value={selectedFile.path.split('.').pop()?.toUpperCase() || 'FILE'} />
                  <StatItem label="Lines" value={selectedFile.lineCount} />
                </div>

                <div className="space-y-4 pt-3 border-t border-border/20">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="font-mono text-[9px] uppercase text-muted tracking-wider">Depends on</p>
                      <span className="font-mono text-[10px] text-muted">{dependencies.length}</span>
                    </div>
                    <ul className="space-y-1">
                      {dependencies.map(path => (
                        <li key={path}>
                          <button 
                            onClick={() => onFileSelect(path)}
                            className="w-full text-left font-mono text-[10px] truncate p-1 rounded-sm hover:bg-surface transition-colors"
                          >
                            {path}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="font-mono text-[9px] uppercase text-muted tracking-wider">Depended on by</p>
                      <span className="font-mono text-[10px] text-muted">{dependents.length}</span>
                    </div>
                    <ul className="space-y-1">
                      {dependents.map(path => (
                        <li key={path}>
                          <button 
                            onClick={() => onFileSelect(path)}
                            className="w-full text-left font-mono text-[10px] truncate p-1 rounded-sm hover:bg-surface transition-colors"
                          >
                            {path}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : selectedFolder ? (
              // Folder Selection
              <div className="space-y-6">
                <div className="space-y-1">
                  <p className="font-mono text-[9px] uppercase text-accent tracking-wider">Folder</p>
                  <p className="font-mono text-[11px] break-all">{selectedFolder.id === '.' ? 'root' : selectedFolder.id}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-border/20">
                  <p className="font-mono text-[9px] uppercase text-muted tracking-wider">Contents</p>
                  <div className="space-y-2">
                    {folderStats?.map(([ext, count]) => (
                      <div key={ext} className="flex justify-between items-center">
                        <span className="font-mono text-[10px] uppercase text-foreground/80">{ext} files</span>
                        <span className="font-mono text-[10px] text-muted">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="font-mono text-[9px] uppercase text-muted tracking-wider">Files</p>
                  <ul className="space-y-1">
                    {selectedFolder.files.map(file => (
                      <li key={file.path}>
                        <button 
                          onClick={() => onFileSelect(file.path)}
                          className="w-full text-left font-mono text-[10px] truncate p-1 rounded-sm hover:bg-surface transition-colors"
                        >
                          {file.path.split('/').pop()}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="space-y-0.5">
      <p className="font-mono text-[9px] uppercase text-muted tracking-tight">{label}</p>
      <p className="font-mono text-[11px] text-foreground/90">{value}</p>
    </div>
  );
}
