import React, { useState } from 'react';
import { useMindmapStore } from '../store/mindmapStore';
import { useTabsStore } from '../store/tabsStore';
import { applyLayout } from '../services/layoutEngine';
import './LayoutSelector.css';

interface LayoutSelectorProps {
  onClose: () => void;
}

type LayoutType = 'tree' | 'radial' | 'organic';

export default function LayoutSelector({ onClose }: LayoutSelectorProps) {
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>('tree');
  const [spacing, setSpacing] = useState({ horizontal: 200, vertical: 120 });
  const nodes = useMindmapStore((state) => state.nodes);
  const updateNode = useMindmapStore((state) => state.updateNode);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const markTabAsUnsaved = useTabsStore((state) => state.markTabAsUnsaved);

  const handleApplyLayout = () => {
    const layoutedNodes = applyLayout(nodes, selectedLayout, {
      horizontalSpacing: spacing.horizontal,
      verticalSpacing: spacing.vertical,
    });

    // Update each node with new position
    layoutedNodes.forEach((node) => {
      updateNode(node.id, { position: node.position });
    });

    if (activeTabId) {
      markTabAsUnsaved(activeTabId);
    }

    onClose();
  };

  const layoutOptions = [
    {
      id: 'tree',
      name: 'Hierarchical Tree',
      description: 'Nodes arranged in levels from top to bottom',
      icon: '🌳',
    },
    {
      id: 'radial',
      name: 'Radial (Circular)',
      description: 'Nodes arranged in concentric circles',
      icon: '⭕',
    },
    {
      id: 'organic',
      name: 'Organic (Force-Directed)',
      description: 'Balanced layout with spacing optimization',
      icon: '🌀',
    },
  ];

  return (
    <div className="layout-selector-overlay">
      <div className="layout-selector-modal">
        <div className="layout-header">
          <h2>Auto-Layout Nodes</h2>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="layout-content">
          <div className="layout-options">
            {layoutOptions.map((option) => (
              <div
                key={option.id}
                className={`layout-card ${selectedLayout === option.id ? 'selected' : ''}`}
                onClick={() => setSelectedLayout(option.id as LayoutType)}
              >
                <div className="layout-icon">{option.icon}</div>
                <h3>{option.name}</h3>
                <p>{option.description}</p>
              </div>
            ))}
          </div>

          <div className="layout-settings">
            <h3>Layout Settings</h3>

            <div className="setting-group">
              <label htmlFor="horizontal-spacing">
                Horizontal Spacing: {spacing.horizontal}px
              </label>
              <input
                id="horizontal-spacing"
                type="range"
                min="80"
                max="300"
                step="10"
                value={spacing.horizontal}
                onChange={(e) =>
                  setSpacing({ ...spacing, horizontal: parseInt(e.target.value) })
                }
              />
            </div>

            <div className="setting-group">
              <label htmlFor="vertical-spacing">
                Vertical Spacing: {spacing.vertical}px
              </label>
              <input
                id="vertical-spacing"
                type="range"
                min="60"
                max="240"
                step="10"
                value={spacing.vertical}
                onChange={(e) =>
                  setSpacing({ ...spacing, vertical: parseInt(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="layout-info">
            <p>
              ℹ️ <strong>{nodes.length}</strong> nodes will be rearranged using{' '}
              <strong>{selectedLayout}</strong> layout
            </p>
          </div>
        </div>

        <div className="layout-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-apply"
            onClick={handleApplyLayout}
          >
            Apply Layout
          </button>
        </div>
      </div>
    </div>
  );
}
