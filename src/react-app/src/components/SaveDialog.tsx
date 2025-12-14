import React, { useState } from 'react';
import './SaveDialog.css';

interface SaveDialogProps {
  isOpen: boolean;
  defaultFilename: string;
  onSave: (filename: string) => void;
  onCancel: () => void;
}

export default function SaveDialog({
  isOpen,
  defaultFilename,
  onSave,
  onCancel,
}: SaveDialogProps) {
  const [filename, setFilename] = useState(defaultFilename);
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmed = filename.trim();
    if (!trimmed) {
      setError('Filename cannot be empty');
      return;
    }
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(trimmed)) {
      setError('Filename can only contain letters, numbers, spaces, hyphens, and underscores');
      return;
    }
    onSave(trimmed);
    setFilename(defaultFilename);
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="save-dialog-overlay">
      <div className="save-dialog">
        <div className="save-dialog-header">
          <h2>Save Mindmap</h2>
        </div>

        <div className="save-dialog-body">
          <label htmlFor="filename-input">
            <span className="label-text">Filename:</span>
            <input
              id="filename-input"
              type="text"
              value={filename}
              onChange={(e) => {
                setFilename(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter filename"
              autoFocus
              className="filename-input"
            />
          </label>
          {error && <div className="error-message">{error}</div>}
          <p className="help-text">File will be saved as JSON format</p>
        </div>

        <div className="save-dialog-footer">
          <button
            type="button"
            onClick={onCancel}
            className="cancel-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="save-btn"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
