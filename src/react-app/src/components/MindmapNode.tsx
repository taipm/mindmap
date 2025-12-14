import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position } from 'reactflow';
import { useMindmapStore } from '../store/mindmapStore';
import { useTabsStore } from '../store/tabsStore';
import NodeContextMenu from './NodeContextMenu';
import LaTeXRenderer from './LaTeXRenderer';
import './MindmapNode.css';

interface MindmapNodeProps {
  data: { label: string; color: string; metadata?: Record<string, any> };
  id: string;
  selected?: boolean;
}

export default function MindmapNode({ data, id, selected }: MindmapNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(data.label);
  const [latex, setLatex] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const nodes = useMindmapStore((state) => state.nodes);
  const updateNode = useMindmapStore((state) => state.updateNode);
  const deleteNode = useMindmapStore((state) => state.deleteNode);
  const addNode = useMindmapStore((state) => state.addNode);
  const duplicateNode = useMindmapStore((state) => state.duplicateNode);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const markTabAsUnsaved = useTabsStore((state) => state.markTabAsUnsaved);
  const highlightedNodeIds = useMindmapStore((state) => state.highlightedNodeIds);
  const searchQuery = useMindmapStore((state) => state.searchQuery);

  const currentNode = nodes.find((n) => n.id === id);
  const latexContent = currentNode?.metadata?.latex || '';

  const isHighlighted = highlightedNodeIds.includes(id);
  const isMatched = searchQuery && highlightedNodeIds.length > 0 && isHighlighted;

  const handleSave = () => {
    if (title.trim()) {
      const updatedMetadata = {
        ...currentNode?.metadata,
        ...(latex.trim() && { latex }),
      };
      updateNode(id, {
        title,
        ...(Object.keys(updatedMetadata).length > 0 && { metadata: updatedMetadata }),
      });
      if (activeTabId) {
        markTabAsUnsaved(activeTabId);
      }
      setIsEditing(false);
      setLatex('');
    }
  };

  const handleEditStart = () => {
    setLatex(latexContent);
    setIsEditing(true);
  };

  const handleAddChild = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    addNode({
      title: 'New Node',
      parentId: id,
      position: { x: 0, y: 0 }, // Will be calculated by store
      color: '#4ECDC4',
    });
    if (activeTabId) {
      markTabAsUnsaved(activeTabId);
    }
  };

  const handleDelete = () => {
    if (id !== 'root') {
      deleteNode(id);
      if (activeTabId) {
        markTabAsUnsaved(activeTabId);
      }
    }
  };

  const handleDuplicate = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (id !== 'root') {
      duplicateNode(id);
      if (activeTabId) {
        markTabAsUnsaved(activeTabId);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleEditFromContext = () => {
    setLatex(latexContent);
    setIsEditing(true);
  };

  return (
    <>
      {contextMenu &&
        createPortal(
          <NodeContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            nodeId={id}
            isRoot={id === 'root'}
            onEdit={() => handleEditFromContext()}
            onAddChild={() => handleAddChild()}
            onDuplicate={() => handleDuplicate()}
            onDelete={() => handleDelete()}
            onClose={() => setContextMenu(null)}
          />,
          document.body
        )}
      <div
        className={`mindmap-node ${selected ? 'selected' : ''} ${isMatched ? 'highlighted' : ''} ${searchQuery && !isHighlighted ? 'dimmed' : ''}`}
        style={{ backgroundColor: data.color }}
        onContextMenu={handleContextMenu}
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
              if (e.key === 'Escape') {
                setIsEditing(false);
                setLatex('');
              }
            }}
            placeholder="Node title"
            autoFocus
          />
          <input
            type="text"
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') {
                setIsEditing(false);
                setLatex('');
              }
            }}
            placeholder="LaTeX formula (optional)"
            className="node-edit-latex"
          />
        </div>
      ) : (
        <div
          className="node-label"
          onDoubleClick={() => handleEditStart()}
        >
          {data.label}
          {latexContent && <LaTeXRenderer latex={latexContent} />}
        </div>
      )}

      <div className="node-actions">
        <button
          type="button"
          className="node-btn add-btn"
          onClick={handleAddChild}
          title="Add child node"
        >
          +
        </button>
        {id !== 'root' && (
          <>
            <button
              type="button"
              className="node-btn duplicate-btn"
              onClick={handleDuplicate}
              title="Duplicate node"
            >
              📋
            </button>
            <button
              type="button"
              className="node-btn delete-btn"
              onClick={handleDelete}
              title="Delete node"
            >
              ✕
            </button>
          </>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} />
      </div>
    </>
  );
}
