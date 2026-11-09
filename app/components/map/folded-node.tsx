import { Handle, Position } from 'reactflow';
import { MapNodeData } from './types';

export function FoldedNode({ data, selected }: { data: MapNodeData; selected: boolean }) {
  const { folder, onOpen, isActive, hasSelection, isDimmed, matchCount } = data;
  
  // Height carries fan-in. Base height is 24px, plus 2px per fan-in, capped.
  const height = 28 + Math.min(folder.fanIn * 2, 120);
  
  return (
    <div 
      onClick={() => onOpen(folder.id)}
      className={`
        relative flex flex-col items-center justify-center border transition-all cursor-pointer group rounded-sm
        ${selected ? 'border-accent bg-accent/20 shadow-[0_0_15px_rgba(var(--color-accent-rgb),0.4)] border-2' : 'border-white/80 border-2 bg-background/90'}
        ${isDimmed ? 'grayscale-[0.5]' : ''}
      `}
      style={{ height: `${height}px`, minWidth: '70px' }}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-1.5 !h-1.5 !border-none !min-h-0 !transition-colors !bg-white/80" 
      />
      
      <div className="flex flex-col items-center gap-0 pointer-events-none px-2 text-center overflow-hidden w-full">
        <span className="font-mono text-[9px] font-bold truncate w-full text-foreground">
          {folder.name}
        </span>
        <div className="flex items-center gap-1.5 text-[8px] font-mono text-muted/80">
          <span>{folder.files.length}</span>
          {matchCount !== undefined && matchCount > 0 && (
            <span className="text-accent font-bold">({matchCount})</span>
          )}
          <span className="text-[7px] opacity-50">←{folder.fanIn} {folder.fanOut}→</span>
        </div>
      </div>

      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-1.5 !h-1.5 !border-none !min-h-0 !transition-colors !bg-white/80" 
      />
    </div>
  );
}
