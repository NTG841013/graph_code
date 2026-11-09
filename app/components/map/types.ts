import { FolderNode } from '@/lib/parser/folding';

export interface MapNodeData {
  folder: FolderNode;
  onOpen: (id: string) => void;
  onClose: (id: string) => void;
  onSelectFile: (path: string) => void;
  isSelected: boolean;
  selectedFile: string | null;
  connectedFilePaths: Set<string>;
  hasSelection: boolean;
  isActive: boolean;
  isDimmed?: boolean;
  matchCount?: number;
}

export interface MapEdgeData {
  type: string;
}
