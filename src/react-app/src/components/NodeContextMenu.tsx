import React, { useEffect, useRef } from 'react';
import './NodeContextMenu.css';

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  isRoot: boolean;
  onEdit: (nodeId: string) => void;
  onAddChild: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

export default function NodeContextMenu({
  x,
  y,
  nodeId,
  isRoot,
  onEdit,
  onAddChild,
  onDuplicate,
  onDelete,
  onClose,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const adjustedXRef = useRef(x);
  const adjustedYRef = useRef(y);

  useEffect(() => {
    // Close menu when clicking outside
    const handleClickOutside = (evt: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(evt.target as Node)) {
        onClose();
      }
    };

    // Close menu when pressing Escape
    const handleKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') {
        onClose();
      }
    };

    // Add a small delay to prevent the contextmenu event's mousedown from closing the menu
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust position if menu goes off-screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      adjustedXRef.current = x;
      adjustedYRef.current = y;

      if (rect.right > viewportWidth) {
        adjustedXRef.current = viewportWidth - rect.width - 10;
      }

      if (rect.bottom > viewportHeight) {
        adjustedYRef.current = viewportHeight - rect.height - 10;
      }
    }
  }, [x, y]);

  const handleEdit = () => {
    onEdit(nodeId);
    onClose();
  };

  const handleAddChild = () => {
    onAddChild(nodeId);
    onClose();
  };

  const handleDuplicate = () => {
    onDuplicate(nodeId);
    onClose();
  };

  const handleDelete = () => {
    onDelete(nodeId);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="node-context-menu"
      style={{
        left: `${adjustedXRef.current}px`,
        top: `${adjustedYRef.current}px`,
      }}
    >
      <button
        type="button"
        className="context-menu-item"
        onClick={handleEdit}
        title="Edit node text (Double-click or Enter)"
      >
        <span className="menu-icon">✏️</span>
        <span>Edit</span>
      </button>

      <button
        type="button"
        className="context-menu-item"
        onClick={handleAddChild}
        title="Add a child node"
      >
        <span className="menu-icon">➕</span>
        <span>Add Child</span>
      </button>

      <div className="context-menu-divider" />

      {!isRoot && (
        <>
          <button
            type="button"
            className="context-menu-item"
            onClick={handleDuplicate}
            title="Duplicate this node and its children"
          >
            <span className="menu-icon">📋</span>
            <span>Duplicate</span>
          </button>

          <button
            type="button"
            className="context-menu-item danger"
            onClick={handleDelete}
            title="Delete this node and its children"
          >
            <span className="menu-icon">🗑️</span>
            <span>Delete</span>
          </button>
        </>
      )}
    </div>
  );
}
