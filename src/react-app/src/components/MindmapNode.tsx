import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { useMindmapStore } from '../store/mindmapStore';
import './MindmapNode.css';

interface MindmapNodeProps {
  data: { label: string; color: string };
  id: string;
  selected?: boolean;
}

export default function MindmapNode({ data, id, selected }: MindmapNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(data.label);
  const updateNode = useMindmapStore((state) => state.updateNode);
  const deleteNode = useMindmapStore((state) => state.deleteNode);
  const addNode = useMindmapStore((state) => state.addNode);

  const handleSave = () => {
    if (title.trim()) {
      updateNode(id, { title });
      setIsEditing(false);
    }
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    addNode({
      title: 'New Node',
      parentId: id,
      position: { x: 0, y: 0 }, // Will be calculated by store
      color: '#4ECDC4',
    });
  };

  const handleDelete = () => {
    if (id !== 'root') {
      deleteNode(id);
    }
  };

  return (
    <div
      className={`mindmap-node ${selected ? 'selected' : ''}`}
      style={{ backgroundColor: data.color }}
    >
      <Handle type="target" position={Position.Top} />

      {isEditing ? (
        <div className="node-edit">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            autoFocus
          />
        </div>
      ) : (
        <div
          className="node-label"
          onDoubleClick={() => setIsEditing(true)}
        >
          {data.label}
        </div>
      )}

      <div className="node-actions">
        <button
          className="node-btn add-btn"
          onClick={handleAddChild}
          title="Add child node"
        >
          +
        </button>
        {id !== 'root' && (
          <button
            className="node-btn delete-btn"
            onClick={handleDelete}
            title="Delete node"
          >
            ✕
          </button>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
