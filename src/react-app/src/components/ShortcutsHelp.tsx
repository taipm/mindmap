import React from 'react';
import { createPortal } from 'react-dom';
import './ShortcutsHelp.css';

interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsHelp({ isOpen, onClose }: ShortcutsHelpProps) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'File Management',
      items: [
        { key: 'Ctrl+N', description: 'Create new mindmap' },
        { key: 'Ctrl+T', description: 'Open new tab' },
        { key: 'Ctrl+S', description: 'Save to file' },
        { key: 'Ctrl+O', description: 'Open file' },
      ],
    },
    {
      category: 'Editing',
      items: [
        { key: 'Ctrl+Z', description: 'Undo' },
        { key: 'Ctrl+Y', description: 'Redo' },
        { key: 'Double-click', description: 'Edit node title' },
        { key: 'Delete', description: 'Delete selected node' },
        { key: '+', description: 'Add child node (in context menu)' },
      ],
    },
    {
      category: 'Layout & View',
      items: [
        { key: 'Ctrl+L', description: 'Open layout options' },
        { key: 'Scroll', description: 'Pan around canvas' },
        { key: 'Scroll + Ctrl', description: 'Zoom in/out' },
      ],
    },
    {
      category: 'Nodes',
      items: [
        { key: '▶ Icon', description: 'Toggle collapse/expand node' },
        { key: '🎥 Button', description: 'Add YouTube references' },
        { key: '📝 Button', description: 'Add notes/description' },
        { key: '📋 Button', description: 'Duplicate node' },
      ],
    },
    {
      category: 'Help',
      items: [
        { key: 'Shift+?', description: 'Show this shortcuts help' },
      ],
    },
  ];

  return createPortal(
    <div className="shortcuts-help-overlay">
      <div className="shortcuts-help-modal">
        <div className="help-header">
          <h2>Keyboard Shortcuts</h2>
          <button
            type="button"
            className="help-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="help-content">
          {shortcuts.map((section) => (
            <div key={section.category} className="shortcuts-section">
              <h3>{section.category}</h3>
              <div className="shortcuts-list">
                {section.items.map((item, idx) => (
                  <div key={idx} className="shortcut-item">
                    <kbd className="shortcut-key">{item.key}</kbd>
                    <span className="shortcut-description">
                      {item.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="help-footer">
          <p className="help-tip">
            💡 <strong>Tip:</strong> Keyboard shortcuts work best when focused
            on the canvas (not in text input fields)
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
