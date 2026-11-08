import { Handle, Position, useUpdateNodeInternals } from 'reactflow';
import { MapNodeData } from './types';
import { getFileColor } from './constants';
import { useRef, useCallback, useEffect, useState } from 'react';

export function OpenPanelNode({ id, data }: { id: string, data: MapNodeData }) {
  const { folder, onClose, onSelectFile, selectedFile, connectedFilePaths, hasSelection, isActive } = data;
  const updateNodeInternals = useUpdateNodeInternals();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    updateNodeInternals(id);
  }, [id, updateNodeInternals]);

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals, folder.isOpen]);

  const displayedFiles = [...folder.files].sort((a, b) => (b.fanIn + b.fanOut) - (a.fanIn + a.fanOut));
  const rowHeight = 20; // Approximate height of each row
  const containerHeight = 300;

  const isActuallyActive = isActive || !hasSelection;

  return (
    <div className={`
      border shadow-2xl min-w-[180px] max-w-[300px] overflow-hidden group transition-all rounded-sm bg-background/95
      ${data.isSelected ? 'border-accent ring-2 ring-accent/30 border-2' : isActuallyActive ? 'border-white/80 border-2' : 'border-white/10'}
    `}>
      <header 
        onClick={(e) => {
          e.stopPropagation();
          onClose(folder.id);
        }}
        className={`flex flex-col border-b px-2 py-1.5 cursor-pointer transition-colors ${isActuallyActive ? 'border-white/20 bg-surface/50 hover:bg-surface/70' : 'border-white/10 bg-surface/30'}`}
      >
        <span className={`font-mono text-[8px] truncate uppercase tracking-tighter ${isActuallyActive ? 'text-muted/70' : 'text-muted/30'}`}>
          {folder.id === '.' ? 'root' : folder.id}
        </span>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`font-mono text-[10px] font-medium ${isActuallyActive ? 'text-foreground/90' : 'text-foreground/40'}`}>
              {folder.files.length} files
            </span>
            <div className={`flex items-center gap-1.5 text-[9px] font-mono ${isActuallyActive ? 'text-accent' : 'text-accent/30'}`}>
              <span>←{folder.fanIn}</span>
              <span>{folder.fanOut}→</span>
            </div>
          </div>
        </div>
      </header>
      <div 
        ref={scrollRef}
        onScroll={onScroll}
        className="py-1 max-h-[300px] overflow-y-auto nodrag nowheel custom-scrollbar"
      >
        {displayedFiles.map((file, index) => {
          const isActiveFile = !hasSelection || connectedFilePaths.has(file.path);
          const isDimmedFile = hasSelection && !connectedFilePaths.has(file.path);
          const color = getFileColor(file.path);
          
          // Only show handles if the file is within the visible scroll area
          const isVisible = (index * rowHeight) >= (scrollTop - rowHeight) && 
                            (index * rowHeight) <= (scrollTop + containerHeight);

          return (
            <div 
              key={file.path}
              onClick={(e) => { 
                e.stopPropagation(); 
                onSelectFile(file.path); 
              }}
              className={`
                relative group flex items-center px-2 py-0.5 text-[10px] font-mono cursor-pointer transition-colors
                ${selectedFile === file.path ? 'bg-accent/30 text-accent font-bold' : isActuallyActive ? 'text-foreground/90 hover:bg-surface/70' : 'text-foreground/40'}
                ${isDimmedFile ? 'opacity-10' : 'opacity-100'}
              `}
            >
              {isVisible && (
                <Handle 
                  type="target" 
                  position={Position.Left} 
                  id={file.path}
                  className={`!-left-1 !w-1 !h-1 !border-none !min-h-0 !transition-colors ${isActiveFile ? '!bg-white/80' : '!bg-muted/20'}`}
                />
              )}
              
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span 
                  className={`h-2 w-2 shrink-0 rounded-[1px] transition-opacity ${isActiveFile ? 'opacity-100' : 'opacity-30'}`} 
                  style={{ backgroundColor: color }}
                />
                <span className="truncate flex-1">
                  {file.path === folder.id + '/' + file.path.split('/').pop() 
                    ? file.path.split('/').pop() 
                    : file.path.replace(folder.id + '/', '')}
                </span>
                <div className={`flex items-center gap-1.5 text-[8px] font-mono tabular-nums ${isActiveFile ? 'text-muted/80' : 'text-muted/30'}`}>
                  <span>←{file.fanIn}</span>
                  <span>{file.fanOut}→</span>
                </div>
              </div>

              {isVisible && (
                <Handle 
                  type="source" 
                  position={Position.Right} 
                  id={file.path}
                  className={`!-right-1 !w-1 !h-1 !border-none !min-h-0 !transition-colors ${isActiveFile ? '!bg-white/80' : '!bg-muted/20'}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
