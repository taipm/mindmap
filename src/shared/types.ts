export interface MindmapNode {
  id: string;
  title: string;
  parentId: string | null;
  position: { x: number; y: number };
  color: string;
  metadata?: Record<string, any>;
}

export interface MindmapEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface MindmapData {
  id: string;
  title: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  owner: string;
  permissions: string[];
  nodes: MindmapNode[];
  edges: MindmapEdge[];
}

export interface HistoryEntry {
  action: 'create' | 'update' | 'delete';
  timestamp: number;
  data: MindmapData;
}
