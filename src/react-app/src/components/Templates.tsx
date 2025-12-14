import React, { useState } from 'react';
import { useMindmapStore } from '../store/mindmapStore';
import './Templates.css';

export default function Templates() {
  const store = useMindmapStore();
  const [isOpen, setIsOpen] = useState(false);

  const templates = [
    {
      key: 'project',
      title: 'Project Planning',
      description: 'Plan projects with scope, timeline, resources, and risks',
      icon: '📋',
    },
    {
      key: 'learning',
      title: 'Learning Path',
      description: 'Organize learning journey from basics to advanced projects',
      icon: '📚',
    },
    {
      key: 'brainstorm',
      title: 'Brainstorming',
      description: 'Capture ideas, features, improvements, and challenges',
      icon: '💡',
    },
    {
      key: 'math',
      title: 'Quadratic Equation Solver',
      description: 'Explore quadratic equations with discriminant analysis and solutions',
      icon: '∑',
    },
  ];

  const handleSelectTemplate = (key: string) => {
    store.loadTemplate(key);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="toolbar-btn"
        title="Load template"
      >
        🎨 Templates
      </button>
    );
  }

  return (
    <div className="templates-overlay">
      <div className="templates-modal">
        <div className="templates-header">
          <h2>Choose a Template</h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="templates-close"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="templates-grid">
          {templates.map((template) => (
            <div
              key={template.key}
              className="template-card"
              onClick={() => handleSelectTemplate(template.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSelectTemplate(template.key);
              }}
            >
              <div className="template-icon">{template.icon}</div>
              <h3>{template.title}</h3>
              <p>{template.description}</p>
            </div>
          ))}
        </div>

        <div className="templates-footer">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="templates-btn-cancel"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
