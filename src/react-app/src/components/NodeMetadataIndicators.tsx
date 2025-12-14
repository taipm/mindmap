import React from 'react';
import './NodeMetadataIndicators.css';

interface NodeMetadataIndicatorsProps {
  title: string;
  metadata?: Record<string, any>;
}

export default function NodeMetadataIndicators({ title, metadata }: NodeMetadataIndicatorsProps) {
  const youtubeLinks = metadata?.youtubeLinks || [];
  const hasLatex = /\$[^$]+\$/.test(title);

  // Only show indicators if there's metadata to display
  if (youtubeLinks.length === 0 && !hasLatex) {
    return null;
  }

  return (
    <div className="node-metadata-indicators">
      {hasLatex && (
        <span className="indicator latex-indicator" title="Contains LaTeX formulas">
          ∑
        </span>
      )}
      {youtubeLinks.length > 0 && (
        <span className="indicator youtube-indicator" title={`${youtubeLinks.length} YouTube reference(s)`}>
          🎥{youtubeLinks.length}
        </span>
      )}
    </div>
  );
}
