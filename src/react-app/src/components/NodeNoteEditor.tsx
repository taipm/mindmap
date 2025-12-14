import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import './NodeNoteEditor.css';

interface NodeNoteEditorProps {
  isOpen: boolean;
  nodeTitle: string;
  notes: string;
  onSave: (notes: string) => void;
  onClose: () => void;
}

export default function NodeNoteEditor({
  isOpen,
  nodeTitle,
  notes,
  onSave,
  onClose,
}: NodeNoteEditorProps) {
  const [content, setContent] = useState(notes);
  const [isPreview, setIsPreview] = useState(false);

  const handleSave = () => {
    onSave(content);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="note-editor-overlay" onClick={onClose}>
      <div className="note-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="note-editor-header">
          <h3>Notes: {nodeTitle}</h3>
          <button className="note-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="note-editor-tabs">
          <button
            className={`tab ${!isPreview ? 'active' : ''}`}
            onClick={() => setIsPreview(false)}
          >
            Edit
          </button>
          <button
            className={`tab ${isPreview ? 'active' : ''}`}
            onClick={() => setIsPreview(true)}
          >
            Preview
          </button>
        </div>

        <div className="note-editor-content">
          {!isPreview ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter notes (supports markdown)..."
              autoFocus
            />
          ) : (
            <div className="note-preview">
              {content ? (
                <p>
                  {content.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))}
                </p>
              ) : (
                <p style={{ color: '#999' }}>No notes yet</p>
              )}
            </div>
          )}
        </div>

        <div className="note-editor-footer">
          <span className="char-count">{content.length} characters</span>
          <div className="buttons">
            <button className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-save" onClick={handleSave}>
              Save Notes
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
