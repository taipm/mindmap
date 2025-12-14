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
import './App.css';

const nodeTypes = {
  mindmapNode: MindmapNode,
};

function App() {
  const store = useMindmapStore();
  const [nodes, , onNodesChange] = useNodesState(store.getInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(store.getInitialEdges());

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

  return (
    <div className="app-container">
      <Toolbar />
      <div className="mindmap-editor">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChangeLocal}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}

export default App;
