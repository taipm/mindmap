import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { useMindmapStore } from '../store/mindmapStore';
import { useTabsStore } from '../store/tabsStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import Templates from './Templates';
import SaveDialog from './SaveDialog';
import SearchBar from './SearchBar';
import './Toolbar.css';

declare global {
  interface Window {
    electronAPI: {
      saveFile: (filename: string, content: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      saveFileToPath: (filePath: string, content: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      openFile: () => Promise<{ success: boolean; content?: string; path?: string; error?: string }>;
      exportImage: (filename: string, dataUrl: string, format: 'png' | 'svg') => Promise<{ success: boolean; path?: string; error?: string }>;
    };
  }
}

export default function Toolbar() {
  const store = useMindmapStore();
  const createTab = useTabsStore((state) => state.createTab);
  const renameTab = useTabsStore((state) => state.renameTab);
  const markTabAsSaved = useTabsStore((state) => state.markTabAsSaved);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleNew = () => {
    // Save current tab state before creating new
    if (activeTabId) {
      const saveTabState = useMindmapStore.getState().saveTabState;
      saveTabState();
    }

    // Create new tab and get the tab ID
    const newTabId = createTab();

    // Load the new tab (clear canvas for new mindmap)
    const setCurrentTab = useMindmapStore.getState().setCurrentTab;
    setCurrentTab(newTabId);

    store.clear();
  };

  const handleSaveClick = () => {
    const filePath = store.filePath;
    // If file was already saved, overwrite it. Otherwise show save dialog
    if (filePath) {
      handleSaveToExistingPath(filePath);
    } else {
      setShowSaveDialog(true);
    }
  };

  const handleSaveToExistingPath = async (filePath: string) => {
    try {
      const jsonData = store.saveFileToPath(filePath);

      if (!(globalThis as any).electronAPI) {
        // Fallback for development mode
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filePath.split(/[\\/]/).pop() || 'mindmap.json';
        a.click();
        URL.revokeObjectURL(url);
        alert(`Saved to: ${filePath} (development mode)`);
        return;
      }

      const result = await (globalThis as any).electronAPI.saveFileToPath(filePath, jsonData);

      if (result.success) {
        console.log(`Auto-saved to: ${filePath}`);
      }
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const handleSaveConfirm = async (filename: string) => {
    try {
      const jsonData = store.saveFile(filename);

      // Add to recent files
      store.addRecentFile(filename);

      // Update tab name to match filename
      if (activeTabId) {
        renameTab(activeTabId, filename);
        markTabAsSaved(activeTabId);
      }

      if (!(globalThis as any).electronAPI) {
        // Fallback for development mode
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setShowSaveDialog(false);
        alert(`Saved as ${filename}.json (development mode)`);
        return;
      }

      const result = await (globalThis as any).electronAPI.saveFile(`${filename}.json`, jsonData);

      if (result.success) {
        setShowSaveDialog(false);
        // Store the path returned by Electron for future overwrites
        store.saveFileToPath(result.path || `${filename}.json`);
        alert(`Saved to: ${result.path}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save file');
    }
  };

  const handleOpen = async () => {
    try {
      if (!(globalThis as any).electronAPI) {
        // Fallback for development mode - use file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e: any) => {
          const file = e.target.files[0];
          if (file) {
            const content = await file.text();
            store.loadFile(content);
            alert('File loaded successfully (development mode)');
          }
        };
        input.click();
        return;
      }

      const result = await (globalThis as any).electronAPI.openFile();

      if (result.success && result.content) {
        store.loadFile(result.content);
        // Set the file path for future saves
        if (result.path) {
          store.saveFileToPath(result.path);
        }
        alert('File loaded successfully');
      }
    } catch (error) {
      console.error('Open error:', error);
      alert('Failed to open file');
    }
  };

  const handleExportPNG = async () => {
    try {
      const canvas = document.querySelector('.react-flow__viewport');
      if (!canvas) {
        alert('Canvas not found');
        return;
      }

      const image = await html2canvas(canvas as HTMLElement, {
        backgroundColor: '#fff',
        scale: 2,
      });

      const dataUrl = image.toDataURL('image/png');

      if (!(globalThis as any).electronAPI) {
        // Fallback for development mode
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'mindmap.png';
        link.click();
        alert('Exported as mindmap.png (development mode)');
        return;
      }

      const result = await (globalThis as any).electronAPI.exportImage('mindmap.png', dataUrl, 'png');

      if (result.success) {
        alert(`Exported to: ${result.path}`);
      }
    } catch (error) {
      console.error('Export PNG error:', error);
      alert('Failed to export PNG');
    }
  };

  const handleExportSVG = async () => {
    try {
      const canvas = document.querySelector('.react-flow__viewport');
      if (!canvas) {
        alert('Canvas not found');
        return;
      }

      const svg = (canvas as HTMLElement).innerHTML;

      if (!(globalThis as any).electronAPI) {
        // Fallback for development mode
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'mindmap.svg';
        link.click();
        URL.revokeObjectURL(url);
        alert('Exported as mindmap.svg (development mode)');
        return;
      }

      const result = await (globalThis as any).electronAPI.exportImage('mindmap.svg', svg, 'svg');

      if (result.success) {
        alert(`Exported to: ${result.path}`);
      }
    } catch (error) {
      console.error('Export SVG error:', error);
      alert('Failed to export SVG');
    }
  };

  const handleExportJSON = () => {
    try {
      const jsonData = store.saveFile(store.filename || 'mindmap');
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mindmap.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export JSON error:', error);
      alert('Failed to export JSON');
    }
  };

  const handleUndo = () => {
    store.undo();
  };

  const handleRedo = () => {
    store.redo();
  };

  const handleClear = () => {
    if (globalThis.confirm('Clear all nodes? This cannot be undone.')) {
      store.clear();
    }
  };

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onNew: handleNew,
    onNewTab: () => {
      const saveTabState = useMindmapStore.getState().saveTabState;
      saveTabState();
      createTab();
    },
    onSave: () => setShowSaveDialog(true),
    onOpen: () => {
      handleOpen().catch(() => {
        // Error already handled in handleOpen
      });
    },
    onUndo: handleUndo,
    onRedo: handleRedo,
  });

  return (
    <>
      <SaveDialog
        isOpen={showSaveDialog}
        defaultFilename={store.filename || store.generateFilename()}
        onSave={handleSaveConfirm}
        onCancel={() => setShowSaveDialog(false)}
      />
      <div className="toolbar">
        <div className="toolbar-section">
          <h1>Mindmap Editor</h1>
        </div>

        <SearchBar />

        <div className="toolbar-section">
          <button
            type="button"
            onClick={handleNew}
            className="toolbar-btn"
            title="New mindmap (Ctrl+N)"
          >
            📝 New
          </button>
          <Templates />
        </div>

        <div className="toolbar-section">
          <button
            type="button"
            onClick={handleSaveClick}
            className="toolbar-btn"
            title="Save to JSON file (Ctrl+S)"
          >
            💾 Save
          </button>
          <button
            type="button"
            onClick={handleOpen}
            className="toolbar-btn"
            title="Open JSON file (Ctrl+O)"
          >
            📂 Open
          </button>
        </div>

        <div className="toolbar-section">
          <button
            type="button"
            onClick={handleUndo}
            className="toolbar-btn"
            title="Undo (Ctrl+Z)"
          >
            ↶ Undo
          </button>
          <button
            type="button"
            onClick={handleRedo}
            className="toolbar-btn"
            title="Redo (Ctrl+Y)"
          >
            ↷ Redo
          </button>
        </div>

        <div className="toolbar-section">
          <button
            type="button"
            onClick={handleExportPNG}
            className="toolbar-btn"
            title="Export as PNG"
          >
            🖼️ PNG
          </button>
          <button
            type="button"
            onClick={handleExportSVG}
            className="toolbar-btn"
            title="Export as SVG"
          >
            📐 SVG
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            className="toolbar-btn"
            title="Export as JSON"
          >
            📄 JSON
          </button>
        </div>

        <div className="toolbar-section">
          <button
            type="button"
            onClick={handleClear}
            className="toolbar-btn danger"
            title="Clear all"
          >
            🗑️ Clear
          </button>
        </div>
      </div>
    </>
  );
}
