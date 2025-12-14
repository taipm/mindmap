import React, { useState } from 'react';
import './LaTeXEditor.css';

interface LaTeXEditorProps {
  nodeId: string;
  nodeTitle: string;
  latexContent: string;
  onSave: (latex: string) => void;
  onClose: () => void;
}

export default function LaTeXEditor({
  nodeId,
  nodeTitle,
  latexContent,
  onSave,
  onClose,
}: LaTeXEditorProps) {
  const [latex, setLatex] = useState(latexContent);

  const handleSave = () => {
    onSave(latex);
    onClose();
  };

  const commonFormulas = [
    { label: 'Fraction', latex: String.raw`\frac{a}{b}` },
    { label: 'Square Root', latex: String.raw`\sqrt{x}` },
    { label: 'Superscript', latex: 'x^2' },
    { label: 'Subscript', latex: 'x_i' },
    { label: 'Greek Delta', latex: String.raw`\Delta` },
    { label: 'Plus-Minus', latex: String.raw`\pm` },
    { label: 'Integral', latex: String.raw`\int` },
    { label: 'Sum', latex: String.raw`\sum` },
    { label: 'Infinity', latex: String.raw`\infty` },
    { label: 'Approximate', latex: String.raw`\approx` },
  ];

  const insertFormula = (formula: string) => {
    setLatex((prev) => prev + formula);
  };

  return (
    <div className="latex-editor-overlay">
      <div className="latex-editor-modal">
        <div className="latex-editor-header">
          <h2>Edit LaTeX Formula</h2>
          <span className="latex-editor-node-title">{nodeTitle}</span>
          <button
            type="button"
            onClick={onClose}
            className="latex-editor-close"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="latex-editor-content">
          <div className="latex-editor-section">
            <label htmlFor="latex-input">LaTeX Markup:</label>
            <textarea
              id="latex-input"
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder={String.raw`Enter LaTeX formula here...\frac{-b \pm \sqrt{\Delta}}{2a}`}
              className="latex-editor-textarea"
            />
            <p className="latex-editor-hint">
              💡 Tip: Use String.raw or escape backslashes: \\frac, \\sqrt, etc.
            </p>
          </div>

          <div className="latex-editor-section">
            <label>Common Formulas:</label>
            <div className="latex-editor-buttons">
              {commonFormulas.map((formula) => (
                <button
                  key={formula.label}
                  type="button"
                  onClick={() => insertFormula(formula.latex)}
                  className="latex-formula-btn"
                  title={formula.latex}
                >
                  {formula.label}
                </button>
              ))}
            </div>
          </div>

          <div className="latex-editor-section">
            <label>Preview:</label>
            <div className="latex-preview">
              <p>LaTeX: <code>{latex || '(empty)'}</code></p>
              <p className="latex-preview-hint">
                ℹ️ Copy this formula to use with MathJax or KaTeX renderer
              </p>
            </div>
          </div>
        </div>

        <div className="latex-editor-footer">
          <button
            type="button"
            onClick={onClose}
            className="latex-editor-btn-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="latex-editor-btn-save"
          >
            Save Formula
          </button>
        </div>
      </div>
    </div>
  );
}
