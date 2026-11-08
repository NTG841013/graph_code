import { FileNode } from './types';

export interface FolderNode {
  id: string; // The folder path
  name: string; // Short unique label
  files: FileNode[];
  fanIn: number;
  fanOut: number;
  isOpen: boolean;
}

/**
 * Groups files into folder nodes based on a threshold.
 * Working deepest-first, merges folders with fewer than `threshold` files into their parent.
 */
function performFolding(nodes: FileNode[], threshold: number): FolderNode[] {
  // Map of path -> list of files directly in that folder
  const folderFiles = new Map<string, FileNode[]>();
  const allFolders = new Set<string>();

  for (const node of nodes) {
    const folder = node.folder || '.';
    const files = folderFiles.get(folder) || [];
    files.push(node);
    folderFiles.set(folder, files);
    
    // Add all parent folders to the set
    let current = folder;
    while (current && current !== '.') {
      allFolders.add(current);
      const lastSlash = current.lastIndexOf('/');
      if (lastSlash === -1) {
        break;
      }
      current = current.substring(0, lastSlash);
    }
    allFolders.add('.');
  }

  // Sort folders by depth (deepest first)
  const sortedFolders = Array.from(allFolders).sort((a, b) => {
    const depthA = a.split('/').length;
    const depthB = b.split('/').length;
    if (depthA !== depthB) return depthB - depthA;
    return b.length - a.length;
  });

  const currentFolderFiles = new Map<string, FileNode[]>();
  for (const folder of allFolders) {
    currentFolderFiles.set(folder, folderFiles.get(folder) || []);
  }

  const mergedFolders = new Set<string>();

  for (const folder of sortedFolders) {
    if (folder === '.') continue; // Can't merge root

    const files = currentFolderFiles.get(folder) || [];
    if (files.length < threshold) {
      // Find parent
      const lastSlash = folder.lastIndexOf('/');
      const parent = lastSlash === -1 ? '.' : folder.substring(0, lastSlash);
      
      // Merge into parent
      const parentFiles = currentFolderFiles.get(parent) || [];
      currentFolderFiles.set(parent, [...parentFiles, ...files]);
      currentFolderFiles.delete(folder);
      mergedFolders.add(folder);
    }
  }

  // Convert to FolderNode
  const results: FolderNode[] = [];
  for (const [path, files] of currentFolderFiles.entries()) {
    if (files.length === 0) continue;

    // Fan-in/out for a folder is the sum of fan-in/out of its files
    // but only counting edges from/to OUTSIDE this folder node?
    // The spec says "its fan-in and fan-out" for the panel.
    // Usually that means external dependencies.
    const fanIn = files.reduce((sum, f) => sum + f.fanIn, 0);
    const fanOut = files.reduce((sum, f) => sum + f.fanOut, 0);

    results.push({
      id: path,
      name: path, // Will be shortened later
      files,
      fanIn,
      fanOut,
      isOpen: false
    });
  }

  return results;
}

export function computeFoldedGraph(nodes: FileNode[], targetNodeCount: number = 24): FolderNode[] {
  let threshold = 2;
  let folders = performFolding(nodes, threshold);
  
  while (folders.length > targetNodeCount && threshold < nodes.length) {
    threshold++;
    folders = performFolding(nodes, threshold);
  }

  // Final pass to ensure labels are unique and short
  // Labels are the shortest thing that is still unique among what's on screen.
  const allPaths = folders.map(f => f.id);
  folders.forEach(f => {
    f.name = getShortestUniqueLabel(f.id, allPaths);
  });

  return folders;
}

function getShortestUniqueLabel(path: string, allPaths: string[]): string {
  if (path === '.') return 'root';
  const parts = path.split('/');
  for (let i = 1; i <= parts.length; i++) {
    const label = parts.slice(-i).join('/');
    const collisions = allPaths.filter(p => p !== path && p.endsWith(label));
    if (collisions.length === 0) return label;
  }
  return path;
}
