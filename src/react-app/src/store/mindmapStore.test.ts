import { useMindmapStore } from './mindmapStore';

describe('Search Functionality', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useMindmapStore.getState();
    store.clear();

    // Add some test nodes
    store.addNode({
      title: 'New Node 1',
      parentId: 'root',
      position: { x: 200, y: 150 },
      color: '#4ECDC4',
    });

    store.addNode({
      title: 'New Node 2',
      parentId: 'root',
      position: { x: -200, y: 150 },
      color: '#45B7D1',
    });

    store.addNode({
      title: 'Different Node',
      parentId: 'root',
      position: { x: 200, y: 300 },
      color: '#FFA07A',
    });
  });

  test('should search for nodes by title', () => {
    const store = useMindmapStore.getState();
    store.setSearchQuery('new');

    const state = useMindmapStore.getState();
    expect(state.searchQuery).toBe('new');
    // Should find 2 "New Node" entries plus the root parent
    expect(state.highlightedNodeIds.length).toBeGreaterThan(0);
  });

  test('should highlight parent nodes when children match', () => {
    const store = useMindmapStore.getState();
    store.setSearchQuery('new');

    const state = useMindmapStore.getState();
    // Root should be highlighted because it's parent of matching nodes
    expect(state.highlightedNodeIds).toContain('root');
  });

  test('should clear search results when query is empty', () => {
    const store = useMindmapStore.getState();
    store.setSearchQuery('new');
    store.setSearchQuery('');

    const state = useMindmapStore.getState();
    expect(state.searchQuery).toBe('');
    expect(state.highlightedNodeIds).toHaveLength(0);
  });

  test('should be case-insensitive', () => {
    const store = useMindmapStore.getState();
    store.setSearchQuery('NEW');

    const state = useMindmapStore.getState();
    expect(state.highlightedNodeIds.length).toBeGreaterThan(0);
  });

  test('should find partial matches', () => {
    const store = useMindmapStore.getState();
    store.setSearchQuery('nod');

    const state = useMindmapStore.getState();
    // Should find all 3 nodes that contain "nod"
    expect(state.highlightedNodeIds.length).toBeGreaterThanOrEqual(3);
  });

  test('should return no results for non-matching query', () => {
    const store = useMindmapStore.getState();
    store.setSearchQuery('xyz');

    const state = useMindmapStore.getState();
    expect(state.highlightedNodeIds).toHaveLength(0);
  });
});
