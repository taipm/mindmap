import React, { useState } from 'react';
import { useMindmapStore } from '../store/mindmapStore';
import './RecentFiles.css';

export default function RecentFiles() {
  const recentFiles = useMindmapStore((state) => state.recentFiles);
  const store = useMindmapStore();
  const [isExpanded, setIsExpanded] = useState(true);

  const handleLoadFile = (filename: string) => {
    try {
      // Load file from localStorage (works in both dev and production)
      const loaded = store.loadFileFromStorage(filename);
      if (loaded) {
        alert(`Loaded: ${filename}`);
      } else {
        alert(`Failed to load: ${filename}\nFile may have been removed.`);
      }
    } catch (error) {
      console.error('Load error:', error);
      alert('Failed to load file');
    }
  };

  const handleRemoveFile = (filename: string) => {
    store.removeRecentFile(filename);
  };

  const handleClearRecent = () => {
    if (globalThis.confirm('Clear recent files list?')) {
      store.clearRecentFiles();
    }
  };

  return (
    <div className={`recent-files-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="recent-files-header">
        <button
          type="button"
          className="toggle-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
        <h3>📁 Recent Files</h3>
        {recentFiles.length > 0 && (
          <button
            type="button"
            className="clear-btn"
            onClick={handleClearRecent}
            title="Clear recent files"
          >
            ✕
          </button>
        )}
      </div>

      {isExpanded && recentFiles.length === 0 && (
        <div className="recent-files-empty-content">
          <div className="empty-icon">📂</div>
          <p>No recent files yet</p>
          <small>Files you save will appear here</small>
        </div>
      )}

      {isExpanded && recentFiles.length > 0 && (
        <div className="recent-files-list">
          {recentFiles.map((file, index) => (
            <div
              key={`${file.filename}-${file.timestamp}`}
              className="recent-file-item"
            >
              <button
                type="button"
                className="file-load-btn"
                onClick={() => handleLoadFile(file.filename)}
              >
                <div className="file-info">
                  <div className="file-name" title={file.filename}>
                    {file.filename}
                  </div>
                  <div className="file-meta">
                    <span className="file-time">{file.lastModified}</span>
                    <span className="file-count">📊 {file.nodeCount} nodes</span>
                  </div>
                </div>
                <div className="file-index">{index + 1}</div>
              </button>
              <button
                type="button"
                className="file-delete-btn"
                onClick={() => handleRemoveFile(file.filename)}
                title="Remove from recent files"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {isExpanded && recentFiles.length > 0 && (
        <div className="recent-files-footer">
          <small>Click to load file</small>
        </div>
      )}
    </div>
  );
}
