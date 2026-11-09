'use client';

import React, { useState, useMemo } from 'react';
import { AnalysisResult, FileNode } from '@/lib/parser/types';
import { FolderNode } from '@/lib/parser/folding';
import { getBlastRadius, getDependencyChain, findInsights } from '@/lib/parser/graph';

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
  const [radiusMode, setRadiusMode] = useState<'blast' | 'chain' | null>(null);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  const insights = useMemo(() => findInsights(analysis), [analysis]);

  const radiusResults = useMemo(() => {
    if (!selectedFile || !radiusMode) return [];
    return radiusMode === 'blast' 
      ? getBlastRadius(analysis.edges, selectedFile.path)
      : getDependencyChain(analysis.edges, selectedFile.path);
  }, [analysis.edges, selectedFile, radiusMode]);


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
                    <StatItem label="Files" value={analysis.stats.totalFiles} />
                    <StatItem label="Imports" value={analysis.edges.length} />
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

                {/* Insights Panel */}
                <div className="pt-4 border-t border-border/20">
                  <button 
                    onClick={() => setIsInsightsOpen(prev => !prev)}
                    className="w-full flex items-center justify-between group"
                  >
                    <p className="font-mono text-[9px] uppercase text-muted tracking-wider group-hover:text-foreground transition-colors">
                      Insights {insights.length > 0 && <span className="text-accent ml-1">({insights.length})</span>}
                    </p>
                    <span className={`text-[10px] text-muted transition-transform duration-200 ${isInsightsOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  
                  {isInsightsOpen && (
                    <div className="mt-3 space-y-4 animate-in slide-in-from-top-1 duration-200">
                      {insights.length > 0 ? (
                        insights.map((insight, idx) => (
                          <div key={`${insight.filePath}-${idx}`} className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1 h-1 rounded-full ${insight.type === 'orphan' ? 'bg-blue-400' : 'bg-amber-400'}`} />
                              <button 
                                onClick={() => onFileSelect(insight.filePath)}
                                className="font-mono text-[10px] text-foreground/90 hover:text-accent transition-colors truncate text-left"
                              >
                                {insight.filePath.split('/').pop()}
                              </button>
                            </div>
                            <p className="font-mono text-[9px] text-muted leading-relaxed pl-2.5">
                              {insight.message}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="font-mono text-[9px] text-muted italic">No specific insights found for this graph.</p>
                      )}
                    </div>
                  )}
                </div>
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

                <div className="flex gap-2 pt-1">
                  <button 
                    onClick={() => setRadiusMode(prev => prev === 'blast' ? null : 'blast')}
                    className={`flex-1 font-mono text-[9px] uppercase py-1.5 border transition-colors ${radiusMode === 'blast' ? 'bg-accent text-accent-foreground border-accent' : 'border-border hover:bg-surface'}`}
                  >
                    Blast Radius
                  </button>
                  <button 
                    onClick={() => setRadiusMode(prev => prev === 'chain' ? null : 'chain')}
                    className={`flex-1 font-mono text-[9px] uppercase py-1.5 border transition-colors ${radiusMode === 'chain' ? 'bg-accent text-accent-foreground border-accent' : 'border-border hover:bg-surface'}`}
                  >
                    Dep. Chain
                  </button>
                </div>

                {radiusMode && (
                  <div className="space-y-2 pt-3 border-t border-border/20 animate-in fade-in duration-200">
                    <p className="font-mono text-[9px] uppercase text-accent tracking-wider">
                      {radiusMode === 'blast' ? 'Blast Radius' : 'Dependency Chain'} (depth 2)
                    </p>
                    <ul className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                      {radiusResults.length > 0 ? (
                        radiusResults.map(path => (
                          <li key={path}>
                            <button 
                              onClick={() => onFileSelect(path)}
                              className="w-full text-left font-mono text-[10px] truncate p-1 rounded-sm hover:bg-surface transition-colors opacity-80"
                            >
                              {path}
                            </button>
                          </li>
                        ))
                      ) : (
                        <li className="font-mono text-[9px] text-muted italic p-1">No transitive dependencies found.</li>
                      )}
                    </ul>
                  </div>
                )}

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
