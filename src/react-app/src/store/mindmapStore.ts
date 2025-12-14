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

interface MindmapStore {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
  history: HistoryEntry[];
  historyIndex: number;
  filename: string | null;

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
  clear: () => void;

  // Utility
  getInitialNodes: () => Node[];
  getInitialEdges: () => Edge[];
  setNodes: (nodes: Node[]) => void;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];

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

  return {
    nodes: initialNodes,
    edges: [],
    history: [{ nodes: initialNodes, edges: [] }],
    historyIndex: 0,
    filename: null,

    addNode: (nodeData) => {
      const newId = `node-${Date.now()}`;
      const newNode: MindmapNode = {
        ...nodeData,
        id: newId,
        color: nodeData.color || COLORS[Math.floor(Math.random() * COLORS.length)],
      };

      set((state) => ({
        nodes: [...state.nodes, newNode],
      }));

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
  };
});
