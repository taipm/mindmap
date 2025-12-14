import React from 'react';
import html2canvas from 'html2canvas';
import { useMindmapStore } from '../store/mindmapStore';
import './Toolbar.css';

declare global {
  interface Window {
    electronAPI: {
      saveFile: (filename: string, content: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      openFile: () => Promise<{ success: boolean; content?: string; path?: string; error?: string }>;
      exportImage: (filename: string, dataUrl: string, format: 'png' | 'svg') => Promise<{ success: boolean; path?: string; error?: string }>;
    };
  }
}

export default function Toolbar() {
  const store = useMindmapStore();

  const handleSave = async () => {
    try {
      const jsonData = store.saveFile(store.filename || 'mindmap');

      if (!(globalThis as any).electronAPI) {
        // Fallback for development mode
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mindmap.json';
        a.click();
        URL.revokeObjectURL(url);
        alert('Saved as mindmap.json (development mode)');
        return;
      }

      const result = await (globalThis as any).electronAPI.saveFile('mindmap.json', jsonData);

      if (result.success) {
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
        alert('Open file feature requires Electron context');
        return;
      }

      const result = await (globalThis as any).electronAPI.openFile();

      if (result.success && result.content) {
        store.loadFile(result.content);
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
    if (window.confirm('Clear all nodes? This cannot be undone.')) {
      store.clear();
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <h1>Mindmap Editor</h1>
      </div>

      <div className="toolbar-section">
        <button onClick={handleSave} className="toolbar-btn" title="Save to JSON file (Ctrl+S)">
          💾 Save
        </button>
        <button onClick={handleOpen} className="toolbar-btn" title="Open JSON file (Ctrl+O)">
          📂 Open
        </button>
      </div>

      <div className="toolbar-section">
        <button onClick={handleUndo} className="toolbar-btn" title="Undo (Ctrl+Z)">
          ↶ Undo
        </button>
        <button onClick={handleRedo} className="toolbar-btn" title="Redo (Ctrl+Y)">
          ↷ Redo
        </button>
      </div>

      <div className="toolbar-section">
        <button onClick={handleExportPNG} className="toolbar-btn" title="Export as PNG">
          🖼️ PNG
        </button>
        <button onClick={handleExportSVG} className="toolbar-btn" title="Export as SVG">
          📐 SVG
        </button>
        <button onClick={handleExportJSON} className="toolbar-btn" title="Export as JSON">
          📄 JSON
        </button>
      </div>

      <div className="toolbar-section">
        <button onClick={handleClear} className="toolbar-btn danger" title="Clear all">
          🗑️ Clear
        </button>
      </div>
    </div>
  );
}
