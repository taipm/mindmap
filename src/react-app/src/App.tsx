import React, { useCallback, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useMindmapStore } from './store/mindmapStore';
import { useTabsStore } from './store/tabsStore';
import MindmapNode from './components/MindmapNode';
import Toolbar from './components/Toolbar';
import TabsBar from './components/TabsBar';
import RecentFiles from './components/RecentFiles';
import './App.css';

const markTabAsUnsaved = (activeTabId: string | null) => {
  if (activeTabId) {
    useTabsStore.getState().markTabAsUnsaved(activeTabId);
  }
};

const nodeTypes = {
  mindmapNode: MindmapNode,
};

function App() {
  const store = useMindmapStore();
  const storeNodes = useMindmapStore((state) => state.nodes);
  const storeEdges = useMindmapStore((state) => state.edges);
  const setCurrentTab = useMindmapStore((state) => state.setCurrentTab);
  const activeTabId = useTabsStore((state) => state.activeTabId);

  // Initialize with store's current state
  const initialNodes = storeNodes.map((node) => ({
    id: node.id,
    data: { label: node.title, color: node.color, metadata: node.metadata },
    position: node.position,
    type: 'mindmapNode',
  })) as any[];

  const initialEdges = storeEdges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    label: edge.label,
  })) as any[];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Initialize current tab on first load
  useEffect(() => {
    if (activeTabId) {
      setCurrentTab(activeTabId);
    }
  }, [activeTabId, setCurrentTab]);

  // Warn before closing if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsavedTabs = useTabsStore.getState().hasUnsavedTabs();
      if (hasUnsavedTabs) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Auto-save every 30 seconds if file has been saved before
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      const state = useMindmapStore.getState();
      // Only auto-save if we have a file path and it's been more than 5 seconds since last save
      if (state.filePath && Date.now() - state.lastAutoSaveTime > 5000) {
        state.autoSave();
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, []);

  // Sync store changes to React state
  useEffect(() => {
    const rfNodes = storeNodes.map((node) => ({
      id: node.id,
      data: { label: node.title, color: node.color, metadata: node.metadata },
      position: node.position,
      type: 'mindmapNode',
    }));
    setNodes(rfNodes);
  }, [storeNodes, setNodes]);

  // Sync store edges to React state
  useEffect(() => {
    const rfEdges = storeEdges.map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      label: edge.label,
    }));
    setEdges(rfEdges);
  }, [storeEdges, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdges = addEdge(connection, edges);
      setEdges(newEdges);
      const edgeId = `edge-${connection.source}-${connection.target}-${Date.now()}`;
      store.addEdge({
        id: edgeId,
        from: connection.source || '',
        to: connection.target || '',
      });
      markTabAsUnsaved(activeTabId);
    },
    [edges, setEdges, store, activeTabId]
  );

  const onNodesChangeLocal = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      // Sync position changes to store
      const hasPositionChange = changes.some((change: any) => change.type === 'position');
      changes.forEach((change: any) => {
        if (change.type === 'position' && change.positionAbsolute) {
          store.updateNode(change.id, {
            position: change.positionAbsolute,
          });
        }
      });
      if (hasPositionChange) {
        markTabAsUnsaved(activeTabId);
      }
    },
    [onNodesChange, store, activeTabId]
  );

  // This effect is removed because nodes are already synced through the store
  // via onNodesChangeLocal callback. Keeping it causes infinite loops during tab switching.

  return (
    <div className="app-container">
      <Toolbar />
      <TabsBar />
      <div className="app-content">
        <RecentFiles />
        <div className="mindmap-editor">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChangeLocal}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export default App;
