import { create } from 'zustand';
import { Node, Edge } from 'reactflow';

interface MindmapNode {
  id: string;
  title: string;
  parentId: string | null;
  position: { x: number; y: number };
  color: string;
  metadata?: Record<string, any>;
}

interface MindmapEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

interface HistoryEntry {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
}

interface RecentFile {
  filename: string;
  timestamp: number;
  lastModified: string;
  nodeCount: number;
}

interface MindmapStore {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
  history: HistoryEntry[];
  historyIndex: number;
  filename: string | null;
  recentFiles: RecentFile[];

  // CRUD operations
  addNode: (node: Omit<MindmapNode, 'id'>) => string;
  updateNode: (id: string, updates: Partial<MindmapNode>) => void;
  deleteNode: (id: string) => void;
  addEdge: (edge: MindmapEdge) => void;
  deleteEdge: (id: string) => void;

  // Undo/Redo
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // File operations
  saveFile: (filename: string) => string;
  loadFile: (data: string) => void;
  loadFileFromStorage: (filename: string) => boolean;
  clear: () => void;

  // Utility
  getInitialNodes: () => Node[];
  getInitialEdges: () => Edge[];
  setNodes: (nodes: Node[]) => void;

  // Templates
  loadTemplate: (templateKey: string) => void;
  getTemplates: () => string[];

  // Duplicate
  duplicateNode: (nodeId: string) => string;

  // Smart filename
  generateFilename: (templateName?: string) => string;

  // Recent files
  addRecentFile: (filename: string) => void;
  getRecentFiles: () => RecentFile[];
  clearRecentFiles: () => void;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];

// Predefined templates for quick start
const TEMPLATES = {
  project: {
    title: 'Project Planning',
    nodes: [
      { id: 'root', title: 'Project', parentId: null, position: { x: 0, y: 0 }, color: '#FF6B6B' },
      { id: 'scope', title: 'Scope', parentId: 'root', position: { x: 200, y: 150 }, color: '#4ECDC4' },
      { id: 'timeline', title: 'Timeline', parentId: 'root', position: { x: -200, y: 150 }, color: '#45B7D1' },
      { id: 'resources', title: 'Resources', parentId: 'root', position: { x: 200, y: 300 }, color: '#FFA07A' },
      { id: 'risks', title: 'Risks', parentId: 'root', position: { x: -200, y: 300 }, color: '#98D8C8' },
    ],
    edges: [
      { id: 'edge-root-scope', from: 'root', to: 'scope' },
      { id: 'edge-root-timeline', from: 'root', to: 'timeline' },
      { id: 'edge-root-resources', from: 'root', to: 'resources' },
      { id: 'edge-root-risks', from: 'root', to: 'risks' },
    ],
  },
  learning: {
    title: 'Learning Path',
    nodes: [
      { id: 'root', title: 'Learn', parentId: null, position: { x: 0, y: 0 }, color: '#45B7D1' },
      { id: 'basics', title: 'Basics', parentId: 'root', position: { x: 200, y: 150 }, color: '#4ECDC4' },
      { id: 'advanced', title: 'Advanced', parentId: 'root', position: { x: -200, y: 150 }, color: '#FF6B6B' },
      { id: 'practice', title: 'Practice', parentId: 'root', position: { x: 200, y: 300 }, color: '#F7DC6F' },
      { id: 'projects', title: 'Projects', parentId: 'root', position: { x: -200, y: 300 }, color: '#BB8FCE' },
    ],
    edges: [
      { id: 'edge-root-basics', from: 'root', to: 'basics' },
      { id: 'edge-root-advanced', from: 'root', to: 'advanced' },
      { id: 'edge-root-practice', from: 'root', to: 'practice' },
      { id: 'edge-root-projects', from: 'root', to: 'projects' },
    ],
  },
  brainstorm: {
    title: 'Brainstorming',
    nodes: [
      { id: 'root', title: 'Ideas', parentId: null, position: { x: 0, y: 0 }, color: '#FFA07A' },
      { id: 'features', title: 'Features', parentId: 'root', position: { x: 200, y: 150 }, color: '#FF6B6B' },
      { id: 'improvements', title: 'Improvements', parentId: 'root', position: { x: -200, y: 150 }, color: '#4ECDC4' },
      { id: 'challenges', title: 'Challenges', parentId: 'root', position: { x: 200, y: 300 }, color: '#45B7D1' },
    ],
    edges: [
      { id: 'edge-root-features', from: 'root', to: 'features' },
      { id: 'edge-root-improvements', from: 'root', to: 'improvements' },
      { id: 'edge-root-challenges', from: 'root', to: 'challenges' },
    ],
  },
};

export const useMindmapStore = create<MindmapStore>((set, get) => {
  // Initialize with root node
  const initialNodes: MindmapNode[] = [
    {
      id: 'root',
      title: 'Mindmap',
      parentId: null,
      position: { x: 0, y: 0 },
      color: COLORS[0],
    },
  ];

  // Load recent files from localStorage
  let initialRecentFiles: RecentFile[] = [];
  try {
    const stored = localStorage.getItem('mindmap_recent_files');
    if (stored) {
      initialRecentFiles = JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load recent files from localStorage:', error);
  }

  return {
    nodes: initialNodes,
    edges: [],
    history: [{ nodes: initialNodes, edges: [] }],
    historyIndex: 0,
    filename: null,
    recentFiles: initialRecentFiles,

    addNode: (nodeData) => {
      const newId = `node-${Date.now()}`;

      // Calculate child position based on parent
      let childPosition = nodeData.position;
      if (nodeData.parentId) {
        const state = get();
        const parent = state.nodes.find(n => n.id === nodeData.parentId);
        if (parent) {
          // Offset child to the side and below parent
          const childCountForParent = state.nodes.filter(n => n.parentId === nodeData.parentId).length;
          childPosition = {
            x: parent.position.x + (childCountForParent % 2 === 0 ? 200 : -200),
            y: parent.position.y + 150,
          };
        }
      }

      const newNode: MindmapNode = {
        ...nodeData,
        id: newId,
        position: childPosition,
        color: nodeData.color || COLORS[Math.floor(Math.random() * COLORS.length)],
      };

      set((state) => {
        const newEdges = nodeData.parentId
          ? [...state.edges, {
              id: `edge-${nodeData.parentId}-${newId}`,
              from: nodeData.parentId,
              to: newId,
            }]
          : state.edges;

        return {
          nodes: [...state.nodes, newNode],
          edges: newEdges,
        };
      });

      get().pushHistory();
      return newId;
    },

    updateNode: (id, updates) => {
      set((state) => ({
        nodes: state.nodes.map((node) => (node.id === id ? { ...node, ...updates } : node)),
      }));
      get().pushHistory();
    },

    deleteNode: (id) => {
      set((state) => ({
        nodes: state.nodes.filter((node) => node.id !== id),
        edges: state.edges.filter((edge) => edge.from !== id && edge.to !== id),
      }));
      get().pushHistory();
    },

    addEdge: (edge) => {
      set((state) => ({
        edges: [...state.edges, edge],
      }));
      get().pushHistory();
    },

    deleteEdge: (id) => {
      set((state) => ({
        edges: state.edges.filter((edge) => edge.id !== id),
      }));
      get().pushHistory();
    },

    pushHistory: () => {
      set((state) => {
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push({ nodes: state.nodes, edges: state.edges });
        return {
          history: newHistory,
          historyIndex: newHistory.length - 1,
        };
      });
    },

    undo: () => {
      set((state) => {
        if (state.historyIndex > 0) {
          const newIndex = state.historyIndex - 1;
          const entry = state.history[newIndex];
          return {
            nodes: entry.nodes,
            edges: entry.edges,
            historyIndex: newIndex,
          };
        }
        return state;
      });
    },

    redo: () => {
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          const newIndex = state.historyIndex + 1;
          const entry = state.history[newIndex];
          return {
            nodes: entry.nodes,
            edges: entry.edges,
            historyIndex: newIndex,
          };
        }
        return state;
      });
    },

    saveFile: (filename) => {
      const state = get();
      const data = {
        id: `mindmap-${Date.now()}`,
        title: filename,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        owner: 'local',
        permissions: [],
        nodes: state.nodes,
        edges: state.edges,
      };

      // Save to localStorage for recent files functionality
      try {
        localStorage.setItem(`mindmap_file_${filename}`, JSON.stringify(data));
      } catch (error) {
        console.warn('Failed to save file to localStorage:', error);
      }

      set({ filename });
      return JSON.stringify(data, null, 2);
    },

    loadFile: (data) => {
      try {
        const parsed = JSON.parse(data);
        set({
          nodes: parsed.nodes || [],
          edges: parsed.edges || [],
          filename: parsed.title,
          history: [{ nodes: parsed.nodes || [], edges: parsed.edges || [] }],
          historyIndex: 0,
        });
      } catch (error) {
        console.error('Failed to load file:', error);
      }
    },

    loadFileFromStorage: (filename: string) => {
      try {
        const stored = localStorage.getItem(`mindmap_file_${filename}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          set({
            nodes: parsed.nodes || [],
            edges: parsed.edges || [],
            filename: parsed.title,
            history: [{ nodes: parsed.nodes || [], edges: parsed.edges || [] }],
            historyIndex: 0,
          });
          return true;
        } else {
          console.warn(`File ${filename} not found in localStorage`);
          return false;
        }
      } catch (error) {
        console.error('Failed to load file from storage:', error);
        return false;
      }
    },

    clear: () => {
      const initialNodes: MindmapNode[] = [
        {
          id: 'root',
          title: 'Mindmap',
          parentId: null,
          position: { x: 0, y: 0 },
          color: COLORS[0],
        },
      ];
      set({
        nodes: initialNodes,
        edges: [],
        history: [{ nodes: initialNodes, edges: [] }],
        historyIndex: 0,
        filename: null,
      });
    },

    getInitialNodes: () => {
      return get().nodes.map((node) => ({
        id: node.id,
        data: { label: node.title, color: node.color },
        position: node.position,
        type: 'mindmapNode',
      })) as Node[];
    },

    getInitialEdges: () => {
      return get().edges.map((edge) => ({
        id: edge.id,
        source: edge.from,
        target: edge.to,
        label: edge.label,
      })) as Edge[];
    },

    setNodes: (rfNodes) => {
      const nodes = get().nodes;
      rfNodes.forEach((rfNode) => {
        const node = nodes.find((n) => n.id === rfNode.id);
        if (node) {
          node.position = rfNode.position;
          if (rfNode.data?.label) {
            node.title = rfNode.data.label;
          }
        }
      });
    },

    loadTemplate: (templateKey: string) => {
      const template = TEMPLATES[templateKey as keyof typeof TEMPLATES];
      if (template) {
        // Remap node IDs with unique timestamps
        const idMap: Record<string, string> = {};
        const newNodes = template.nodes.map((node) => {
          const newId = node.id === 'root' ? 'root' : `node-${Date.now()}-${Math.random()}`;
          idMap[node.id] = newId;
          return {
            ...node,
            id: newId,
          };
        });

        // Update edges with new IDs
        const newEdges = template.edges.map((edge) => ({
          ...edge,
          id: `edge-${idMap[edge.from]}-${idMap[edge.to]}`,
          from: idMap[edge.from],
          to: idMap[edge.to],
        }));

        set({
          nodes: newNodes,
          edges: newEdges,
          history: [{ nodes: newNodes, edges: newEdges }],
          historyIndex: 0,
          filename: template.title,
        });
      }
    },

    getTemplates: () => {
      return Object.entries(TEMPLATES).map(([key, value]) => value.title);
    },

    duplicateNode: (nodeId) => {
      const state = get();
      const nodeToDuplicate = state.nodes.find((n) => n.id === nodeId);

      if (!nodeToDuplicate || nodeToDuplicate.id === 'root') {
        return ''; // Cannot duplicate root
      }

      const newNodeId = `node-${Date.now()}`;
      const newNode: MindmapNode = {
        ...nodeToDuplicate,
        id: newNodeId,
        position: {
          x: nodeToDuplicate.position.x + 150,
          y: nodeToDuplicate.position.y + 80,
        },
      };

      // Create edge if parent exists
      const newEdge = nodeToDuplicate.parentId ? {
        id: `edge-${nodeToDuplicate.parentId}-${newNodeId}`,
        from: nodeToDuplicate.parentId,
        to: newNodeId,
      } : null;

      set((state) => ({
        nodes: [...state.nodes, newNode],
        edges: newEdge ? [...state.edges, newEdge] : state.edges,
      }));

      get().pushHistory();
      return newNodeId;
    },

    generateFilename: (templateName?: string) => {
      const now = new Date();
      const date = now.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '-');
      const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }).replaceAll(' ', '_');

      if (templateName) {
        return `${templateName}_${date}_${time}`;
      }

      return `mindmap_${date}_${time}`;
    },

    addRecentFile: (filename: string) => {
      const now = new Date();
      const state = get();

      // Remove if already exists (to avoid duplicates)
      const filtered = state.recentFiles.filter((f) => f.filename !== filename);

      // Create new recent file entry
      const newRecentFile: RecentFile = {
        filename,
        timestamp: Date.now(),
        lastModified: now.toLocaleString('vi-VN'),
        nodeCount: state.nodes.length,
      };

      // Add to beginning and keep only 10 most recent
      const updated = [newRecentFile, ...filtered].slice(0, 10);
      set({ recentFiles: updated });

      // Save to localStorage for persistence
      try {
        localStorage.setItem('mindmap_recent_files', JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to save recent files to localStorage:', error);
      }
    },

    getRecentFiles: () => {
      const state = get();
      return state.recentFiles;
    },

    clearRecentFiles: () => {
      set({ recentFiles: [] });
      try {
        localStorage.removeItem('mindmap_recent_files');
      } catch (error) {
        console.warn('Failed to clear recent files from localStorage:', error);
      }
    },
  };
});
