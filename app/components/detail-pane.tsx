'use client';

import React, { useState, useMemo } from 'react';
import { AnalysisResult, FileNode } from '@/lib/parser/types';
import { FolderNode } from '@/lib/parser/folding';
import { getBlastRadius, getDependencyChain, findInsights, RadiusResult } from '@/lib/parser/graph';
import { reRunAnalysis } from '@/app/lib/actions/analysis';
import { useFormStatus } from 'react-dom';

import { ExplanationRenderer } from './explanation-renderer';
import { checkStaleness, requestFileExplanation, requestFolderExplanation } from '@/app/lib/actions/ai';

interface DetailPaneProps {
  analysis: AnalysisResult;
  selectedFile: FileNode | null;
  selectedFolder: FolderNode | null;
  onFileSelect: (path: string | null) => void;
  analysisId?: string;
  explanations: Record<string, string>;
  setExplanation: (path: string, text: string) => void;
}

export function DetailPane({
  analysis,
  selectedFile,
  selectedFolder,
  onFileSelect,
  analysisId,
  explanations,
  setExplanation,
}: DetailPaneProps) {
  const [activeTab, setActiveTab] = useState<'structure' | 'explanation'>('structure');
  const [loading, setLoading] = useState(false);
  const [staleness, setStaleness] = useState<{ isStale: boolean; reason: string | null; content?: string } | null>(null);

  const currentExplanation = selectedFile 
    ? explanations[selectedFile.path] 
    : selectedFolder 
      ? explanations[selectedFolder.id] 
      : null;

  const handleExplain = async () => {
    if (!analysisId) return;
    setLoading(true);

    try {
      if (selectedFile) {
        const { isStale, reason, content } = await checkStaleness(analysisId, selectedFile.path, selectedFile.hash);
        
        if (isStale && !staleness) {
          setStaleness({ isStale, reason, content });
          setLoading(false);
          return;
        }

        const neighbors = {
          imports: analysis.edges.filter(e => e.from === selectedFile.path).map(e => e.to),
          dependents: analysis.edges.filter(e => e.to === selectedFile.path).map(e => e.from),
        };

        const result = await requestFileExplanation({
          analysisId,
          targetPath: selectedFile.path,
          content: content || '',
          neighbors,
        });
        setExplanation(selectedFile.path, result);
        setStaleness(null);
      } else if (selectedFolder) {
        const folderFiles = selectedFolder.files.map(f => ({
          path: f.path,
          role: f.role
        }));
        
        // Dependents of folder: files not in folder that import files in folder
        const folderFilePaths = new Set(selectedFolder.files.map(f => f.path));
        const dependents = Array.from(new Set(
          analysis.edges
            .filter(e => folderFilePaths.has(e.to) && !folderFilePaths.has(e.from))
            .map(e => e.from)
        ));

        const result = await requestFolderExplanation({
          analysisId,
          folderPath: selectedFolder.id,
          files: folderFiles,
          dependents,
        });
        setExplanation(selectedFolder.id, result);
      }
    } catch (err) {
      console.error("Explanation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReAnalyze = () => {
    setStaleness(null);
    handleExplain();
  };
  const [radiusMode, setRadiusMode] = useState<'blast' | 'chain' | null>(null);
  const [radiusDepth, setRadiusDepth] = useState<1 | 2 | 3>(2);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  const insights = useMemo(() => findInsights(analysis), [analysis]);

  const radiusResults = useMemo(() => {
    if (!selectedFile || !radiusMode) return [];
    return radiusMode === 'blast' 
      ? getBlastRadius(analysis.edges, selectedFile.path, radiusDepth)
      : getDependencyChain(analysis.edges, selectedFile.path, radiusDepth);
  }, [analysis.edges, selectedFile, radiusMode, radiusDepth]);

  const groupedRadius = useMemo(() => {
    const groups: Record<number, RadiusResult[]> = {};
    radiusResults.forEach(res => {
      if (!groups[res.distance]) groups[res.distance] = [];
      groups[res.distance].push(res);
    });
    return groups;
  }, [radiusResults]);


  const mostDependedOn = useMemo(() => {
    return [...analysis.nodes].sort((a, b) => b.fanIn - a.fanIn).slice(0, 10);
  }, [analysis.nodes]);

  const dependedOnCount = useMemo(() => {
    return analysis.nodes.filter(n => n.fanIn > 0).length;
  }, [analysis.nodes]);

  const importedByNothing = useMemo(() => {
    return analysis.nodes.filter(n => n.fanIn === 0).sort((a, b) => a.path.localeCompare(b.path)).slice(0, 10);
  }, [analysis.nodes]);

  const importedByNothingCount = useMemo(() => {
    return analysis.nodes.filter(n => n.fanIn === 0).length;
  }, [analysis.nodes]);

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

  const getExtColor = (ext: string) => {
    switch (ext) {
      case '.ts': return '#818cf8'; // Indigo
      case '.tsx': return '#f472b6'; // Pink
      case '.mjs': return '#94a3b8'; // Slate/Grey
      default: return '#64748b';
    }
  };

  const renderTabTrigger = (id: 'structure' | 'explanation', label: string) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-3 py-2 text-[11px] font-medium transition-colors border-b-2 ${
        activeTab === id 
          ? 'text-foreground border-accent' 
          : 'text-muted border-transparent hover:text-foreground/70'
      }`}
    >
      {label}
    </button>
  );

  return (
    <aside className="w-96 flex flex-col border-l border-border bg-background overflow-hidden font-mono">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col min-h-full">
            {!selectedFile && !selectedFolder ? (
              // Repository Summary
              <div className="flex flex-col">
                <div className="border-b border-border p-4 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-widest">Framework</p>
                    <p className="text-sm font-bold">{analysis.framework?.name || 'Generic'}</p>
                  </div>
                  {analysisId && (
                    <form action={() => reRunAnalysis(analysisId)}>
                      <RerunButton />
                    </form>
                  )}
                </div>

                <div className="grid grid-cols-2 border-b border-border">
                  <div className="p-4 border-r border-border">
                    <p className="text-[9px] text-muted uppercase tracking-tighter mb-1">Files</p>
                    <p className="text-xl">{analysis.stats.totalFiles}</p>
                  </div>
                  <div className="p-4">
                    <p className="text-[9px] text-muted uppercase tracking-tighter mb-1">Imports</p>
                    <p className="text-xl">{analysis.edges.length}</p>
                    {analysis.unresolved.length > 0 && (
                      <p className="text-[8px] text-muted/60 mt-1">{analysis.unresolved.length} unresolved</p>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-[10px] text-muted uppercase tracking-widest">Most depended on <span className="text-[9px] normal-case opacity-40 ml-1">by files importing it</span></h3>
                    <span className="text-xs text-muted/60">{dependedOnCount}</span>
                  </div>

                  <div className="space-y-0.5">
                    {mostDependedOn.map(file => (
                      <button
                        key={file.path}
                        onClick={() => onFileSelect(file.path)}
                        className="w-full flex justify-between items-center py-1 hover:bg-surface/50 transition-colors group text-left"
                      >
                        <span className="text-[10px] text-muted group-hover:text-foreground truncate mr-4">
                          {file.path}
                        </span>
                        <div className="flex items-center gap-1 text-green-500/80 text-[10px]">
                          <span>←</span>
                          <span>{file.fanIn}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {dependedOnCount > mostDependedOn.length && (
                    <p className="text-[9px] text-muted/40 italic">
                      {dependedOnCount - mostDependedOn.length} more not listed
                    </p>
                  )}
                </div>

                <div className="p-4 space-y-4 pt-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-[10px] text-muted uppercase tracking-widest">Imported by nothing <span className="text-[9px] normal-case opacity-40 ml-1">where reading starts</span></h3>
                    <span className="text-xs text-muted/60">{importedByNothingCount}</span>
                  </div>

                  <div className="space-y-0.5">
                    {importedByNothing.map(file => (
                      <button
                        key={file.path}
                        onClick={() => onFileSelect(file.path)}
                        className="w-full flex justify-between items-center py-1 hover:bg-surface/50 transition-colors group text-left"
                      >
                        <span className="text-[10px] text-muted group-hover:text-foreground truncate">
                          {file.path}
                        </span>
                      </button>
                    ))}
                  </div>

                  {importedByNothingCount > importedByNothing.length && (
                    <p className="text-[9px] text-muted/40 italic">
                      {importedByNothingCount - importedByNothing.length} more not listed
                    </p>
                  )}
                </div>

                {/* Insights Panel (Phase 6 requirement) */}
                <div className="p-4 border-t border-border mt-auto">
                  <button 
                    onClick={() => setIsInsightsOpen(prev => !prev)}
                    className="w-full flex items-center justify-between group"
                  >
                    <p className="text-[9px] uppercase text-muted tracking-widest group-hover:text-foreground transition-colors">
                      Insights {insights.length > 0 && <span className="text-accent ml-1">({insights.length})</span>}
                    </p>
                    <span className={`text-[10px] text-muted transition-transform duration-200 ${isInsightsOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  
                  {isInsightsOpen && (
                    <div className="mt-4 space-y-4">
                      {insights.length > 0 ? (
                        insights.map((insight, idx) => (
                          <div key={`${insight.filePath}-${idx}`} className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1 h-1 rounded-full ${insight.type === 'orphan' ? 'bg-blue-400' : 'bg-amber-400'}`} />
                              <button 
                                onClick={() => onFileSelect(insight.filePath)}
                                className="text-[10px] text-foreground/90 hover:text-accent transition-colors truncate text-left"
                              >
                                {insight.filePath.split('/').pop()}
                              </button>
                            </div>
                            <p className="text-[9px] text-muted leading-relaxed pl-2.5">
                              {insight.message}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[9px] text-muted italic">No specific insights found for this graph.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : selectedFile ? (
              // File Selection (matching 1.png detail view)
              <div className="flex flex-col min-h-full">
                <div className="p-4 border-b border-border/50">
                  <p className="text-[11px] text-foreground/90 mb-4 truncate">{selectedFile.path}</p>
                  
                  <div className="flex gap-4 -mb-4">
                    {renderTabTrigger('structure', 'Structure')}
                    {renderTabTrigger('explanation', 'Explanation')}
                  </div>
                </div>

                <div className="p-4 flex-1">
                  {activeTab === 'explanation' ? (
                    <div className="flex flex-col h-full">
                      {currentExplanation ? (
                        <div className="space-y-6">
                          <ExplanationRenderer 
                            text={currentExplanation} 
                            onPathClick={onFileSelect} 
                          />
                          {staleness && (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md space-y-2">
                              <p className="text-[10px] text-amber-500 font-medium uppercase tracking-tight">Stale Explanation</p>
                              <p className="text-[10px] text-muted leading-relaxed">
                                {staleness.reason === 'file_changed' 
                                  ? "This file has changed since it was last analysed." 
                                  : "The repository has moved past the commit that was analysed."}
                              </p>
                              <button 
                                onClick={handleReAnalyze}
                                className="text-[10px] text-amber-500 hover:text-amber-400 underline underline-offset-2"
                              >
                                Re-analyse now
                              </button>
                            </div>
                          )}
                        </div>
                      ) : staleness ? (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-md space-y-3">
                          <p className="text-[11px] text-amber-500 font-bold uppercase">Stale Content</p>
                          <p className="text-[10px] text-muted leading-relaxed">
                            {staleness.reason === 'file_changed' 
                               ? "The file content has changed since the analysis was run." 
                               : "The repository has new commits since the analysis was run."}
                          </p>
                          <button 
                            onClick={handleReAnalyze}
                            disabled={loading}
                            className="w-full py-2 bg-amber-500 text-white text-[10px] font-bold rounded-sm hover:bg-amber-400 disabled:opacity-50 transition-colors"
                          >
                            {loading ? "ANALYISING..." : "RE-ANALYSE & EXPLAIN"}
                          </button>
                        </div>
                      ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                          <div className="space-y-2">
                            <p className="text-[11px] text-muted italic">No explanation available yet.</p>
                            <p className="text-[9px] text-muted/60 uppercase tracking-tight">AI insight follows model call</p>
                          </div>
                          <button 
                            onClick={handleExplain}
                            disabled={loading}
                            className="px-6 py-2 bg-accent text-white text-[11px] font-bold rounded-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
                          >
                            {loading && <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                            {loading ? "EXPLAINING..." : "EXPLAIN"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Properties List */}
                      <div className="space-y-1.5">
                        <PropertyRow 
                          label="Kind" 
                          value={
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-sm" 
                                style={{ backgroundColor: getExtColor(`.${selectedFile.path.split('.').pop()}`) }}
                              />
                              <span>.{selectedFile.path.split('.').pop()}</span>
                            </div>
                          } 
                        />
                        <PropertyRow 
                          label="Role" 
                          value={selectedFile.role || 'Unclassified'} 
                        />
                        <PropertyRow 
                          label="Folder" 
                          value={selectedFile.path.split('/').slice(0, -1).join('/') || 'root'} 
                        />
                        <PropertyRow 
                          label="Length" 
                          value={`${selectedFile.lineCount} lines`} 
                        />
                        <PropertyRow 
                          label="Depends on" 
                          value={`${dependencies.length} files`} 
                        />
                        <PropertyRow 
                          label="Depended on by" 
                          value={`${dependents.length} files`} 
                          valueClassName="text-green-500/80"
                        />
                        <PropertyRow 
                          label="Reached by" 
                          value={selectedFile.isEntry ? 'Entry point' : 'imports only'} 
                        />
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => setRadiusMode(prev => prev === 'blast' ? null : 'blast')}
                          className={`px-3 py-1.5 rounded-md text-[10px] transition-colors border ${
                            radiusMode === 'blast' 
                              ? 'bg-accent/10 text-accent border-accent/50' 
                              : 'bg-surface/50 border-border hover:bg-surface'
                          }`}
                        >
                          Blast radius
                        </button>
                        <button 
                          onClick={() => setRadiusMode(prev => prev === 'chain' ? null : 'chain')}
                          className={`px-3 py-1.5 rounded-md text-[10px] transition-colors border ${
                            radiusMode === 'chain' 
                              ? 'bg-accent/10 text-accent border-accent/50' 
                              : 'bg-surface/50 border-border hover:bg-surface'
                          }`}
                        >
                          Dependency chain
                        </button>
                      </div>

                      {radiusMode && (
                        <div className="pt-4 space-y-4 animate-in fade-in duration-200">
                          <div className="flex justify-between items-start">
                            <div className="space-y-0.5">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-[14px] font-medium leading-none">{radiusResults.length}</span>
                                <span className="text-[10px] text-muted">
                                  files · {radiusMode === 'blast' ? 'what breaks if this changes' : 'what this file needs'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="text-muted/60">levels</span>
                              {[1, 2, 3].map(d => (
                                <button
                                  key={d}
                                  onClick={() => setRadiusDepth(d as 1|2|3)}
                                  className={`transition-colors ${radiusDepth === d ? 'text-foreground underline underline-offset-4' : 'text-muted hover:text-foreground/70'}`}
                                >
                                  {d}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-6">
                            {[1, 2, 3].map(dist => {
                              const group = groupedRadius[dist];
                              if (!group || group.length === 0) return null;
                              
                              return (
                                <div key={dist} className="space-y-2">
                                  <p className="text-[10px] text-muted/80">
                                    {dist === 1 ? 'Directly' : `${dist} steps away`} · {group.length}
                                  </p>
                                  <ul className="space-y-1.5">
                                    {group.map(res => {
                                      const parts = res.path.split('/');
                                      const fileName = parts.pop();
                                      const dir = parts.join('/');
                                      return (
                                        <li key={res.path} className="flex items-center gap-2 group">
                                          <div 
                                            className="w-2 h-2 rounded-sm shrink-0" 
                                            style={{ backgroundColor: getExtColor(`.${res.path.split('.').pop()}`) }}
                                          />
                                          <button 
                                            onClick={() => onFileSelect(res.path)}
                                            className="text-left text-[11px] truncate leading-tight"
                                          >
                                            <span className="text-muted/60">{dir}{dir ? '/' : ''}</span>
                                            <span className="text-foreground/90 group-hover:text-accent transition-colors font-medium">{fileName}</span>
                                          </button>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="space-y-4 pt-4 border-t border-border/50">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <h3 className="text-[11px] font-medium">Imports</h3>
                            <div className="flex items-center gap-1 text-amber-500/80 text-[10px]">
                              <span>{dependencies.length}</span>
                              <span>→</span>
                            </div>
                          </div>
                          {dependencies.length > 0 ? (
                            <ul className="space-y-1">
                              {dependencies.map(path => (
                                <li key={path}>
                                  <button 
                                    onClick={() => onFileSelect(path)}
                                    className="w-full text-left text-[10px] text-muted hover:text-foreground transition-colors truncate"
                                  >
                                    {path}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[10px] text-muted italic">None.</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <h3 className="text-[11px] font-medium">Imported by</h3>
                            <div className="flex items-center gap-1 text-green-500/80 text-[10px]">
                              <span>←</span>
                              <span>{dependents.length}</span>
                            </div>
                          </div>
                          <ul className="space-y-1">
                            {dependents.map(path => (
                              <li key={path}>
                                <button 
                                  onClick={() => onFileSelect(path)}
                                  className="w-full text-left text-[10px] text-muted hover:text-foreground transition-colors truncate"
                                >
                                  {path}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : selectedFolder ? (
              // Folder Selection
              <div className="p-4 space-y-6">
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
      </div>
    </aside>
  );
}

function PropertyRow({ label, value, valueClassName = "" }: { label: string; value: React.ReactNode; valueClassName?: string }) {
  return (
    <div className="grid grid-cols-[100px_1fr] text-[10px] py-0.5">
      <span className="text-muted">{label}</span>
      <span className={`text-foreground/90 truncate ${valueClassName}`}>{value}</span>
    </div>
  );
}

function RerunButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-[10px] text-muted hover:text-accent transition-colors flex items-center gap-1 group disabled:opacity-50"
    >
      <span className={pending ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}>↻</span>
      <span>{pending ? 'Restarting...' : 'Rerun'}</span>
    </button>
  );
}
