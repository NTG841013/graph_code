'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, { 
  useNodesState, 
  useEdgesState, 
  Node,
  Edge,
  Background,
  BackgroundVariant,
  Controls,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';

import { AnalysisResult, FileNode } from '@/lib/parser/types';
import { computeFoldedGraph, FolderNode } from '@/lib/parser/folding';
import { FoldedNode } from './folded-node';
import { OpenPanelNode } from './open-panel';
import { MapNodeData } from './types';
import { getFileColor } from './constants';

const nodeTypes = {
  folded: FoldedNode,
  open: OpenPanelNode,
};

interface MapCanvasProps {
  analysis: AnalysisResult;
  selectedFilePath?: string | null;
  selectedFolderId?: string | null;
  selectedCategory?: string | null;
  onFileSelect?: (file: FileNode | null) => void;
  onFolderSelect?: (folder: FolderNode | null) => void;
}

function MapCanvasInner({ 
  analysis, 
  selectedFilePath: externalSelectedFilePath,
  selectedFolderId: externalSelectedFolderId,
  selectedCategory,
  onFileSelect,
  onFolderSelect,
}: MapCanvasProps) {
  const { fitView, getViewport } = useReactFlow();
  const [folders, setFolders] = useState<FolderNode[]>(() => 
    computeFoldedGraph(analysis.nodes)
  );
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState<string | null>(null);
  const [internalSelectedFilePath, setInternalSelectedFilePath] = useState<string | null>(null);

  const selectedNodeId = externalSelectedFolderId !== undefined ? externalSelectedFolderId : internalSelectedNodeId;
  const selectedFilePath = externalSelectedFilePath !== undefined ? externalSelectedFilePath : internalSelectedFilePath;

  const onOpen = useCallback((id: string) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, isOpen: true } : f));
  }, []);

  const onClose = useCallback((id: string) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, isOpen: false } : f));
  }, []);

  const onSelectFile = useCallback((path: string) => {
    if (externalSelectedFilePath === undefined) {
      setInternalSelectedFilePath(prev => prev === path ? null : path);
    }
    const file = analysis.nodes.find(n => n.path === path);
    onFileSelect?.(file || null);
    
    // If selecting a file, ensure we deselect any folder
    if (externalSelectedFolderId === undefined) {
      setInternalSelectedNodeId(null);
    }
    onFolderSelect?.(null);
  }, [analysis.nodes, onFileSelect, onFolderSelect, externalSelectedFilePath, externalSelectedFolderId]);

  // Layout and element generation
  const { nodes, edges } = useMemo(() => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ 
      rankdir: 'LR', 
      nodesep: 100, 
      ranksep: 200,
      ranker: 'network-simplex'
    });

    // 1. Calculate weights and sort folders to influence Dagre's initial layout
    // We want "bigger" or more connected files on the left.
    const weightedFolders = folders.map(f => ({
      folder: f,
      weight: (f.fanIn * 2) + f.fanOut + (f.files.length * 0.5)
    })).sort((a, b) => b.weight - a.weight);

    const sortedFolders = weightedFolders.map(wf => wf.folder);
    const coreNodes = sortedFolders.slice(0, Math.max(3, Math.ceil(folders.length * 0.2))).map(f => f.id);
    const coreSet = new Set(coreNodes);

    const rfNodes: Node<MapNodeData>[] = sortedFolders.map(folder => {
      const type = folder.isOpen ? 'open' : 'folded';
      // Approximate dimensions for dagre
      const width = folder.isOpen ? 220 : 100;
      const height = folder.isOpen 
        ? 40 + Math.min(folder.files.length * 20, 300)
        : 28 + Math.min(folder.fanIn * 2, 120);

      dagreGraph.setNode(folder.id, { width, height });

      return {
        id: folder.id,
        type,
        data: {
          folder,
          onOpen,
          onClose,
          onSelectFile,
          isSelected: selectedNodeId === folder.id,
          selectedFile: selectedFilePath,
          connectedFilePaths: new Set(), // Will be updated below
          hasSelection: false, // Will be updated below
          isActive: false, // Will be updated below
        },
        position: { x: 0, y: 0 },
        selected: selectedNodeId === folder.id,
      };
    });

    // Map file paths to folder node IDs and handle IDs
    const fileToFolder = new Map<string, { folderId: string, handleId?: string }>();
    folders.forEach(f => {
      f.files.forEach((file) => {
        if (f.isOpen) {
          fileToFolder.set(file.path, { folderId: f.id, handleId: file.path });
        } else {
          fileToFolder.set(file.path, { folderId: f.id });
        }
      });
    });

    const rfEdges: Edge[] = [];
    const usedEdgeIds = new Set<string>();

    analysis.edges.forEach(edge => {
      const source = fileToFolder.get(edge.from);
      const target = fileToFolder.get(edge.to);
      
      if (!source || !target) return;

      // Don't draw self-loops within the same file (shouldn't exist in data anyway)
      if (edge.from === edge.to) return;

      const id = `e-${edge.from}-${edge.to}`;
      if (usedEdgeIds.has(id)) return;
      usedEdgeIds.add(id);
      
      // Add edge to Dagre (only if different folders)
      if (source.folderId !== target.folderId) {
        dagreGraph.setEdge(source.folderId, target.folderId);
      }

      rfEdges.push({
        id,
        source: source.folderId,
        target: target.folderId,
        sourceHandle: source.handleId,
        targetHandle: target.handleId,
        data: {
          from: edge.from,
          to: edge.to
        }
      });
    });

    // 2. Force disconnected nodes to the right if they are not "core"
    // This helps with the "vertical stack" issue by creating artificial ranking
    sortedFolders.forEach((f, index) => {
      if (coreSet.has(f.id)) return;
      
      const inEdges = dagreGraph.inEdges(f.id);
      if (!inEdges || inEdges.length === 0) {
        // Find a core node to "precede" this one deterministically
        const coreIndex = index % coreNodes.length;
        const coreNodeId = coreNodes[coreIndex];
        dagreGraph.setEdge(coreNodeId, f.id, { weight: 0 }); // Low weight dummy edge
      }
    });

    // Compute connectivity for dimming
    const activeNodeIds = new Set<string>();
    const activeEdgeIds = new Set<string>();
    const activeFilePaths = new Set<string>();
    const folderMatchCounts = new Map<string, number>();

    const hasCategorySelection = Boolean(selectedCategory);
    const hasSelection = Boolean(selectedNodeId || selectedFilePath || hasCategorySelection);

    const matchesCategory = (filePath: string) => {
      if (!selectedCategory) return true;
      const node = analysis.nodes.find(n => n.path === filePath);
      const role = node?.role || 'Logic';
      return role === selectedCategory;
    };

    if (hasCategorySelection) {
      folders.forEach(folder => {
        const count = folder.files.filter(f => matchesCategory(f.path)).length;
        if (count > 0) {
          folderMatchCounts.set(folder.id, count);
          activeNodeIds.add(folder.id);
          folder.files.forEach(f => {
            if (matchesCategory(f.path)) activeFilePaths.add(f.path);
          });
        }
      });
    }

    if (hasSelection) {
      if (selectedNodeId) {
        activeNodeIds.add(selectedNodeId);
        const folder = folders.find(f => f.id === selectedNodeId);
        folder?.files.forEach(f => {
          if (!hasCategorySelection || matchesCategory(f.path)) {
            activeFilePaths.add(f.path);
          }
        });
      }
      if (selectedFilePath) {
        if (!hasCategorySelection || matchesCategory(selectedFilePath)) {
          activeFilePaths.add(selectedFilePath);
        }
        const folder = folders.find(f => f.files.some(file => file.path === selectedFilePath));
        if (folder) activeNodeIds.add(folder.id);
      }

      rfEdges.forEach(edge => {
        const from = edge.data.from;
        const to = edge.data.to;
        
        let isEdgeConnected = false;

        if (selectedFilePath && (from === selectedFilePath || to === selectedFilePath)) {
          isEdgeConnected = true;
        }
        
        if (selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId)) {
          isEdgeConnected = true;
        }

        // If category selection is active, edges connected to matching files should be active
        if (hasCategorySelection && (matchesCategory(from) || matchesCategory(to))) {
          isEdgeConnected = true;
        }

        if (isEdgeConnected) {
          activeEdgeIds.add(edge.id);
          
          // Highlight both ends for explicit selection (file or folder).
          // For category selection, we only highlight the matching side (already done),
          // keeping the focus on the category while showing the connecting edges.
          if (
            (selectedFilePath && (from === selectedFilePath || to === selectedFilePath)) ||
            (selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId))
          ) {
            activeNodeIds.add(edge.source);
            activeNodeIds.add(edge.target);
            activeFilePaths.add(from);
            activeFilePaths.add(to);
          }
        }
      });
    }

    const finalNodes = rfNodes.map(node => {
      const isActive = !hasSelection || activeNodeIds.has(node.id);
      const isDimmed = hasSelection && !activeNodeIds.has(node.id);
      return {
        ...node,
        data: {
          ...node.data,
          isSelected: selectedNodeId === node.id,
          selectedFile: selectedFilePath,
          connectedFilePaths: activeFilePaths,
          hasSelection,
          isActive,
          isDimmed,
          matchCount: folderMatchCounts.get(node.id) || 0,
        },
        style: { ...node.style, opacity: isDimmed ? 0.15 : 1 },
      };
    });

    const finalEdges = rfEdges.map(edge => {
      const isDimmed = hasSelection && !activeEdgeIds.has(edge.id);
      const sourceFile = edge.data.from;
      const color = getFileColor(sourceFile);
      
      return {
        ...edge,
        style: { 
          stroke: isDimmed ? 'var(--color-border)' : color, 
          strokeWidth: isDimmed ? 0.5 : 1.5,
          opacity: isDimmed ? 0.05 : 0.8
        },
        animated: !isDimmed && hasSelection,
        type: 'default',
      };
    });

    dagre.layout(dagreGraph);

    finalNodes.forEach(node => {
      const { x, y, width, height } = dagreGraph.node(node.id);
      node.position = { x: x - width / 2, y: y - height / 2 };
    });

    return { nodes: finalNodes, edges: finalEdges };
  }, [folders, analysis.edges, analysis.nodes, onOpen, onClose, onSelectFile, selectedNodeId, selectedFilePath, selectedCategory]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(nodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(edges);

  useEffect(() => {
    setRfNodes(nodes);
    setRfEdges(edges);
  }, [nodes, edges, setRfNodes, setRfEdges]);

  // Handle refitting
  useEffect(() => {
    const { zoom } = getViewport();
    fitView({ 
      padding: 0.2, 
      duration: 400,
      minZoom: 0.1,
      maxZoom: Math.min(zoom, 1) // Never zoom in more than current or 1
    });
  }, [folders, fitView, getViewport]);

  return (
    <ReactFlow
      className="bg-background"
      nodes={rfNodes}
      edges={rfEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => {
        if (externalSelectedFolderId === undefined) {
          setInternalSelectedNodeId(prev => prev === node.id ? null : node.id);
          setInternalSelectedFilePath(null);
        }
        const folder = folders.find(f => f.id === node.id);
        onFolderSelect?.(folder || null);
        onFileSelect?.(null);
      }}
      onPaneClick={() => {
        if (externalSelectedFolderId === undefined) {
          setInternalSelectedNodeId(null);
          setInternalSelectedFilePath(null);
        }
        onFileSelect?.(null);
        onFolderSelect?.(null);
      }}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={2}
    >
      <Background variant={BackgroundVariant.Dots} color="var(--map-dots)" gap={20} size={1} />
      <Controls 
        showInteractive={false} 
        className="!bg-background !border-border !shadow-none [&_button]:!bg-background [&_button]:!border-border [&_button]:hover:!bg-surface [&_button_svg]:!fill-foreground" 
      />
    </ReactFlow>
  );
}

export function MapCanvas(props: MapCanvasProps) {
  return (
    <ReactFlowProvider>
      <MapCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
