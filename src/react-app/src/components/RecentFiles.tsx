import React, { useState } from 'react';
import { useMindmapStore } from '../store/mindmapStore';
import './RecentFiles.css';

export default function RecentFiles() {
  const recentFiles = useMindmapStore((state) => state.recentFiles);
  const store = useMindmapStore();
  const [isExpanded, setIsExpanded] = useState(true);

  const handleLoadFile = async (filename: string) => {
    try {
      const globalThis_api = globalThis as any;
      if (!globalThis_api.electronAPI) {
        // Dev mode: use file input
        alert('In development mode, please use the Open button to load files');
        return;
      }

      const result = await globalThis_api.electronAPI.openFile();
      if (result.success && result.content) {
        store.loadFile(result.content);
        alert('File loaded successfully');
      }
    } catch (error) {
      console.error('Load error:', error);
      alert('Failed to load file');
    }
  };

  const handleClearRecent = () => {
    if (globalThis.confirm('Clear recent files list?')) {
      store.clearRecentFiles();
    }
  };

  if (recentFiles.length === 0) {
    return (
      <div className="recent-files-empty">
        <div className="empty-icon">📂</div>
        <p>No recent files</p>
        <small>Files you work on will appear here</small>
      </div>
    );
  }

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

      {isExpanded && (
        <div className="recent-files-list">
          {recentFiles.map((file, index) => (
            <div
              key={`${file.filename}-${file.timestamp}`}
              className="recent-file-item"
              onClick={() => handleLoadFile(file.filename)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLoadFile(file.filename);
              }}
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
            </div>
          ))}
        </div>
      )}

      {isExpanded && (
        <div className="recent-files-footer">
          <small>Click to load file</small>
        </div>
      )}
    </div>
  );
}
