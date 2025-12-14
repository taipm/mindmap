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
import MindmapNode from './components/MindmapNode';
import Toolbar from './components/Toolbar';
import RecentFiles from './components/RecentFiles';
import './App.css';

const nodeTypes = {
  mindmapNode: MindmapNode,
};

function App() {
  const store = useMindmapStore();
  const storeNodes = useMindmapStore((state) => state.nodes);
  const storeEdges = useMindmapStore((state) => state.edges);

  // Initialize with store's current state
  const initialNodes = storeNodes.map((node) => ({
    id: node.id,
    data: { label: node.title, color: node.color },
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

  // Sync store changes to React state
  useEffect(() => {
    const rfNodes = storeNodes.map((node) => ({
      id: node.id,
      data: { label: node.title, color: node.color },
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
    },
    [edges, setEdges, store]
  );

  const onNodesChangeLocal = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      // Sync position changes to store
      changes.forEach((change: any) => {
        if (change.type === 'position' && change.positionAbsolute) {
          store.updateNode(change.id, {
            position: change.positionAbsolute,
          });
        }
      });
    },
    [onNodesChange, store]
  );

  useEffect(() => {
    store.setNodes(nodes);
  }, [nodes, store]);

  // Log nodes for debugging
  useEffect(() => {
    console.log('Current nodes:', nodes);
    console.log('Current edges:', edges);
  }, [nodes, edges]);

  return (
    <div className="app-container">
      <Toolbar />
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
