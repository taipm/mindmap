import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import './LaTeXRenderer.css';

interface LaTeXRendererProps {
  latex: string;
}

export default function LaTeXRenderer({ latex }: LaTeXRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && latex.trim()) {
      try {
        containerRef.current.innerHTML = katex.renderToString(latex, {
          throwOnError: false,
        });
      } catch (error) {
        // Silently fail if LaTeX is invalid
        containerRef.current.innerHTML = `<span class="latex-error">${latex}</span>`;
      }
    }
  }, [latex]);

  if (!latex.trim()) {
    return null;
  }

  return <div ref={containerRef} className="latex-renderer" />;
}
