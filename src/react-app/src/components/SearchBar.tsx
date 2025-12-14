import React from 'react';
import { useMindmapStore } from '../store/mindmapStore';
import './SearchBar.css';

export default function SearchBar() {
  const searchQuery = useMindmapStore((state) => state.searchQuery);
  const setSearchQuery = useMindmapStore((state) => state.setSearchQuery);
  const highlightedNodeIds = useMindmapStore((state) => state.highlightedNodeIds);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        {searchQuery && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={handleClearSearch}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>
      {searchQuery && (
        <div className="search-info">
          Found: {highlightedNodeIds.length} node{highlightedNodeIds.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
