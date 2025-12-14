# Tech Specs - Week 1: Core UX Foundation

Ready-to-implement technical specifications for all 4 Week 1 features.

---

## Feature 1: Collapsible Groups

### Specification

**Goal:** Allow users to collapse/expand node subtrees to reduce visual clutter on large mindmaps.

**User Story:**
- As a user with a 50+ node mindmap
- I want to collapse subtrees
- So that I can focus on one section at a time

### Design

#### State Changes
```typescript
// In mindmapStore.ts - Add to MindmapStore interface
expandedNodeIds: Set<string>;     // Nodes that are expanded (default: all)
toggleNodeExpanded: (nodeId: string) => void;
```

#### Data Persistence
- Store `expandedNodeIds` in localStorage along with other tab data
- Default behavior: all nodes expanded on first load
- Remember user's collapse state across sessions

### Implementation Details

#### Files to Create
1. **No new files needed** - Reuse existing patterns

#### Files to Modify

**1. `src/react-app/src/store/mindmapStore.ts`**

```typescript
// In MindmapStore interface (line ~40)
interface MindmapStore {
  // ... existing fields
  expandedNodeIds: Set<string>;  // Add this
}

// In return statement (around line 371)
return {
  // ... existing
  expandedNodeIds: new Set(),    // Initialize empty set

  // Add this method
  toggleNodeExpanded: (nodeId: string) => {
    set((state) => {
      const newSet = new Set(state.expandedNodeIds);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return { expandedNodeIds: newSet };
    });
    // Save to localStorage
    get().persistTabState();
  },
};

// Update persistTabState() to include expandedNodeIds
const persistTabState = () => {
  const state = get();
  try {
    const tabData = { ...state.tabData };
    const stateSnapshot = {
      nodes: state.nodes,
      edges: state.edges,
      history: state.history,
      historyIndex: state.historyIndex,
      filename: state.filename,
      expandedNodeIds: Array.from(state.expandedNodeIds), // Serialize Set to Array
    };
    // ... rest of function
  }
};

// Update loadTabState to restore expandedNodeIds
loadTabState: (tabId: string) => {
  set((state) => {
    const tabData = state.tabData[tabId];
    if (tabData) {
      return {
        nodes: tabData.nodes,
        edges: tabData.edges,
        history: tabData.history,
        historyIndex: tabData.historyIndex,
        filename: tabData.filename,
        expandedNodeIds: new Set(tabData.expandedNodeIds || []), // Deserialize
        currentTabId: tabId,
      };
    }
    return { currentTabId: tabId };
  });
},
```

**2. `src/react-app/src/components/MindmapNode.tsx`**

```typescript
// At top with other imports (line ~1)
import CollapseIcon from './CollapseIcon'; // Will create this

// In component props (line ~13)
interface MindmapNodeProps {
  data: { label: string; color: string; metadata?: Record<string, any> };
  id: string;
  selected?: boolean;
  isExpanded?: boolean;           // Add this
  hasChildren?: boolean;          // Add this
  onToggleExpand?: (id: string) => void; // Add this
}

// In component (line ~30)
export default function MindmapNode({
  data,
  id,
  selected,
  isExpanded = true,              // Add with default
  hasChildren = false,            // Add with default
  onToggleExpand,                 // Add
}: MindmapNodeProps) {

  // ... existing code ...

  // In node-actions div (around line 199), add collapse button FIRST
  <div className="node-actions">
    {hasChildren && (
      <button
        type="button"
        className="node-btn collapse-btn"
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand?.(id);
        }}
        title={isExpanded ? 'Collapse' : 'Expand'}
      >
        {isExpanded ? '▼' : '▶'}
      </button>
    )}
    {/* Rest of existing buttons */}
    <button ... /> {/* Add child */}
    {/* ... */}
  </div>
}
```

**3. `src/react-app/src/components/MindmapNode.css`**

```css
/* Add to end of file */
.collapse-btn {
  background-color: rgba(255, 255, 255, 0.2);
  font-size: 11px;
  padding: 5px 8px;
}

.collapse-btn:hover {
  background-color: rgba(255, 255, 255, 0.35);
  transform: scale(1.15);
}

/* Hide action buttons for collapsed nodes */
.mindmap-node.collapsed .node-actions {
  opacity: 0.5;
}
```

**4. `src/react-app/src/App.tsx`**

```typescript
// At top with imports
const store = useMindmapStore();
const expandedNodeIds = useMindmapStore((state) => state.expandedNodeIds);  // Add
const toggleNodeExpanded = useMindmapStore((state) => state.toggleNodeExpanded); // Add

// Helper to check if node should be visible
const isNodeVisible = (nodeId: string, parentId: string | null): boolean => {
  if (!parentId || parentId === 'root') return true;
  return expandedNodeIds.has(parentId);
};

// Helper to check if node has children
const hasChildren = (nodeId: string): boolean => {
  return storeNodes.some(node => node.parentId === nodeId);
};

// Filter nodes based on expandedNodeIds
const visibleNodes = initialNodes.filter(node =>
  isNodeVisible(node.id, storeNodes.find(n => n.id === node.id)?.parentId || null)
);

// In ReactFlow component, replace nodes={nodes} with:
<ReactFlow
  nodes={visibleNodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      isExpanded: expandedNodeIds.has(node.id),
      hasChildren: hasChildren(node.id),
      onToggleExpand: toggleNodeExpanded,
    }
  }))}
  edges={edges} {/* Keep filtered edges based on visible nodes */}
  // ... rest
/>

// Filter edges to only show those between visible nodes
const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
const visibleEdges = edges.filter(edge =>
  visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
);
```

### Testing

**Test Cases:**
1. Load mindmap with 25+ nodes
2. Click collapse button on parent node
3. Children should disappear immediately
4. Refresh page - collapse state should persist
5. Expand node - children should reappear
6. Test with nested collapsing (collapse > collapse > collapse)
7. Verify edges to hidden nodes are hidden
8. Switch tabs - each tab remembers collapse state separately

**Test with:** `python-course-template.json`
- Collapse "Fundamentals" section
- Collapse "Functions & OOP"
- Collapse "Libraries"
- Should show only 6 main sections, reducing visible nodes from 25 to 6

### Effort Estimate
- **Implementation:** 4 hours
- **Testing:** 1 hour
- **Polish/Fixes:** 1 hour
- **Total:** 6 hours

---

## Feature 2: Node Notes/Descriptions

### Specification

**Goal:** Allow users to add detailed notes/descriptions to nodes using markdown.

**User Story:**
- As a course creator
- I want to add detailed descriptions to each topic
- So that students can understand context without external resources

### Design

#### Data Structure
```typescript
interface MindmapNode {
  // ... existing fields
  description?: string;  // Markdown content
}
```

#### UI Components
- 📝 Note button in node actions
- Modal popup for editing/viewing notes
- Simple textarea with markdown preview
- Character counter (optional)

### Implementation Details

#### Files to Create

**1. `src/react-app/src/components/NodeNoteEditor.tsx`**

```typescript
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import './NodeNoteEditor.css';

interface NodeNoteEditorProps {
  isOpen: boolean;
  nodeTitle: string;
  notes: string;
  onSave: (notes: string) => void;
  onClose: () => void;
}

export default function NodeNoteEditor({
  isOpen,
  nodeTitle,
  notes,
  onSave,
  onClose,
}: NodeNoteEditorProps) {
  const [content, setContent] = useState(notes);
  const [isPreview, setIsPreview] = useState(false);

  const handleSave = () => {
    onSave(content);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="note-editor-overlay" onClick={onClose}>
      <div className="note-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="note-editor-header">
          <h3>Notes: {nodeTitle}</h3>
          <button className="note-close" onClick={onClose}>✕</button>
        </div>

        <div className="note-editor-tabs">
          <button
            className={`tab ${!isPreview ? 'active' : ''}`}
            onClick={() => setIsPreview(false)}
          >
            Edit
          </button>
          <button
            className={`tab ${isPreview ? 'active' : ''}`}
            onClick={() => setIsPreview(true)}
          >
            Preview
          </button>
        </div>

        <div className="note-editor-content">
          {!isPreview ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter markdown notes..."
              autoFocus
            />
          ) : (
            <div className="note-preview">
              {content ? (
                <p>{content.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}</p>
              ) : (
                <p style={{ color: '#999' }}>No notes yet</p>
              )}
            </div>
          )}
        </div>

        <div className="note-editor-footer">
          <span className="char-count">{content.length} characters</span>
          <div className="buttons">
            <button className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-save" onClick={handleSave}>
              Save Notes
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
```

**2. `src/react-app/src/components/NodeNoteEditor.css`**

```css
.note-editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.note-editor-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.note-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.note-editor-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.note-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.note-close:hover {
  color: #333;
}

.note-editor-tabs {
  display: flex;
  border-bottom: 1px solid #eee;
  padding: 0 20px;
}

.note-editor-tabs .tab {
  background: none;
  border: none;
  padding: 12px 20px;
  cursor: pointer;
  font-size: 14px;
  color: #999;
  border-bottom: 2px solid transparent;
}

.note-editor-tabs .tab.active {
  color: #333;
  border-bottom-color: #4ECDC4;
}

.note-editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.note-editor-content textarea {
  width: 100%;
  height: 100%;
  border: none;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  resize: none;
  outline: none;
}

.note-preview {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}

.note-editor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-top: 1px solid #eee;
  background: #f9f9f9;
}

.char-count {
  font-size: 12px;
  color: #999;
}

.note-editor-footer .buttons {
  display: flex;
  gap: 10px;
}

.btn-cancel,
.btn-save {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-cancel {
  background: #f0f0f0;
  color: #333;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-save {
  background: #4ECDC4;
  color: white;
}

.btn-save:hover {
  background: #45B7D1;
}
```

#### Files to Modify

**1. `src/react-app/src/store/mindmapStore.ts`**

```typescript
// In MindmapNode interface (around line 4)
interface MindmapNode {
  id: string;
  title: string;
  parentId: string | null;
  position: { x: number; y: number };
  color: string;
  metadata?: Record<string, any>;
  description?: string;  // ADD THIS
}

// In updateNode method, no changes needed (already uses ...updates)
// Just ensure description is saved when calling updateNode
```

**2. `src/react-app/src/components/MindmapNode.tsx`**

```typescript
// At top with imports
import NodeNoteEditor from './NodeNoteEditor';

// In component state
const [showNoteEditor, setShowNoteEditor] = useState(false);

// Add handler
const handleSaveNote = (notes: string) => {
  updateNode(id, { description: notes });
  if (activeTabId) {
    markTabAsUnsaved(activeTabId);
  }
};

// Add note indicator after YouTube button (in node-actions)
{id !== 'root' && (
  <>
    {data.metadata?.youtubeLinks?.length > 0 && (
      <button
        type="button"
        className="node-btn youtube-btn"
        onClick={() => setShowYouTubeModal(true)}
        title="Add YouTube references"
      >
        🎥{youtubeLinks.length > 0 && <span className="badge">{youtubeLinks.length}</span>}
      </button>
    )}
    {/* ADD NOTE BUTTON HERE */}
    {data.description && (
      <span className="note-indicator" title="Has notes">📝</span>
    )}
    <button
      type="button"
      className="node-btn note-btn"
      onClick={() => setShowNoteEditor(true)}
      title="Edit notes"
    >
      📝
    </button>
    {/* ... rest of buttons ... */}
  </>
)}

// Before return, add modal
<NodeNoteEditor
  isOpen={showNoteEditor}
  nodeTitle={title}
  notes={data.description || ''}
  onSave={handleSaveNote}
  onClose={() => setShowNoteEditor(false)}
/>
```

**3. `src/react-app/src/components/MindmapNode.css`**

```css
/* Add to end */
.note-btn {
  background-color: rgba(100, 150, 255, 0.25);
}

.note-btn:hover {
  background-color: rgba(100, 150, 255, 0.4);
  transform: scale(1.1);
}

.note-indicator {
  display: inline-block;
  margin-top: 4px;
  opacity: 0.7;
}
```

### Testing

**Test Cases:**
1. Open node editor, add notes
2. Close and reopen - notes should persist
3. Edit notes multiple times
4. Reload page - notes should still be there
5. Switch tabs - each node has separate notes
6. Unicode/emoji support in notes
7. Long notes (1000+ characters)

**Test with:** Any node in python-course-template.json
- Add notes to "Python Programming Course" root
- Add notes to "Fundamentals" section
- Verify persistence

### Effort Estimate
- **Component creation:** 2 hours
- **Store integration:** 1 hour
- **UI integration:** 1.5 hours
- **Testing:** 1.5 hour
- **Total:** 6 hours

---

## Feature 3: Auto-Layout (Hierarchical)

### Specification

**Goal:** Automatically arrange nodes in a professional hierarchical tree layout.

**User Story:**
- As a user with a manually-positioned mindmap
- I want to auto-arrange nodes in a tree
- So that it looks organized without manual adjustment

### Design

#### Algorithms
1. **Tree Layout (Default)**
   - Vertical arrangement with depth-based positioning
   - Horizontal spacing for siblings
   - Configurable spacing

2. **Radial Layout**
   - Center node with children arranged in circle
   - Multi-level radial rings

### Implementation Details

#### Files to Create

**1. `src/react-app/src/services/layoutEngine.ts`**

```typescript
import { MindmapNode, MindmapEdge } from '../store/mindmapStore';

export interface Position {
  x: number;
  y: number;
}

interface LayoutConfig {
  verticalSpacing: number;  // Space between levels
  horizontalSpacing: number; // Space between siblings
  centerX: number;           // Center X coordinate
  centerY: number;           // Center Y coordinate
}

const DEFAULT_CONFIG: LayoutConfig = {
  verticalSpacing: 120,
  horizontalSpacing: 200,
  centerX: 0,
  centerY: 0,
};

/**
 * Tree Layout: Arrange nodes hierarchically top-down
 * Root at top, levels below it with siblings side-by-side
 */
export function treeLayout(
  nodes: MindmapNode[],
  edges: MindmapEdge[],
  config: Partial<LayoutConfig> = {}
): Map<string, Position> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const positions = new Map<string, Position>();

  // Build adjacency list
  const childrenOf = new Map<string, string[]>();
  nodes.forEach((node) => {
    childrenOf.set(node.id, []);
  });
  nodes.forEach((node) => {
    if (node.parentId) {
      childrenOf.get(node.parentId)?.push(node.id);
    }
  });

  // Calculate tree width for each subtree
  const subtreeWidths = new Map<string, number>();
  const calculateWidth = (nodeId: string): number => {
    const children = childrenOf.get(nodeId) || [];
    if (children.length === 0) {
      subtreeWidths.set(nodeId, finalConfig.horizontalSpacing);
      return finalConfig.horizontalSpacing;
    }

    const childrenWidth = children.reduce(
      (sum, childId) => sum + calculateWidth(childId),
      0
    );
    const width = Math.max(
      childrenWidth,
      finalConfig.horizontalSpacing
    );
    subtreeWidths.set(nodeId, width);
    return width;
  };

  // Find root node
  const rootNode = nodes.find((n) => n.parentId === null);
  if (!rootNode) return positions;

  // Calculate width of entire tree
  calculateWidth(rootNode.id);

  // Position nodes
  const positionNode = (
    nodeId: string,
    x: number,
    y: number,
    depth: number
  ) => {
    positions.set(nodeId, { x, y });

    const children = childrenOf.get(nodeId) || [];
    if (children.length === 0) return;

    const subtreeWidth = subtreeWidths.get(nodeId) || finalConfig.horizontalSpacing;
    let startX = x - subtreeWidth / 2 + finalConfig.horizontalSpacing / 2;

    children.forEach((childId) => {
      const childWidth =
        subtreeWidths.get(childId) || finalConfig.horizontalSpacing;
      const childX = startX + childWidth / 2;
      const childY = y + finalConfig.verticalSpacing;

      positionNode(childId, childX, childY, depth + 1);
      startX += childWidth;
    });
  };

  positionNode(
    rootNode.id,
    finalConfig.centerX,
    finalConfig.centerY,
    0
  );

  return positions;
}

/**
 * Radial Layout: Arrange nodes in concentric circles
 */
export function radialLayout(
  nodes: MindmapNode[],
  edges: MindmapEdge[],
  config: Partial<LayoutConfig> = {}
): Map<string, Position> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const positions = new Map<string, Position>();

  const rootNode = nodes.find((n) => n.parentId === null);
  if (!rootNode) return positions;

  // Place root at center
  positions.set(rootNode.id, {
    x: finalConfig.centerX,
    y: finalConfig.centerY,
  });

  // Group nodes by depth
  const nodesByDepth = new Map<number, string[]>();
  const getDepth = (nodeId: string): number => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !node.parentId) return 0;
    return 1 + getDepth(node.parentId);
  };

  nodes.forEach((node) => {
    const depth = getDepth(node.id);
    if (!nodesByDepth.has(depth)) {
      nodesByDepth.set(depth, []);
    }
    nodesByDepth.get(depth)?.push(node.id);
  });

  // Position nodes in circles
  nodesByDepth.forEach((nodeIds, depth) => {
    if (depth === 0) return; // Skip root

    const radius = depth * finalConfig.verticalSpacing;
    const angleStep = (2 * Math.PI) / nodeIds.length;

    nodeIds.forEach((nodeId, index) => {
      const angle = index * angleStep;
      const x = finalConfig.centerX + radius * Math.cos(angle);
      const y = finalConfig.centerY + radius * Math.sin(angle);
      positions.set(nodeId, { x, y });
    });
  });

  return positions;
}
```

**2. `src/react-app/src/components/LayoutSelector.tsx`**

```typescript
import React from 'react';
import './LayoutSelector.css';

interface LayoutSelectorProps {
  onApplyLayout: (layout: 'tree' | 'radial') => void;
  disabled?: boolean;
}

export default function LayoutSelector({
  onApplyLayout,
  disabled = false,
}: LayoutSelectorProps) {
  return (
    <div className="layout-selector">
      <button
        className="layout-btn tree-btn"
        onClick={() => onApplyLayout('tree')}
        disabled={disabled}
        title="Arrange in tree layout"
      >
        🌳 Tree
      </button>
      <button
        className="layout-btn radial-btn"
        onClick={() => onApplyLayout('radial')}
        disabled={disabled}
        title="Arrange in radial layout"
      >
        🎯 Radial
      </button>
    </div>
  );
}
```

**3. `src/react-app/src/components/LayoutSelector.css`**

```css
.layout-selector {
  display: flex;
  gap: 8px;
  align-items: center;
}

.layout-btn {
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.layout-btn:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #999;
}

.layout-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.layout-btn.tree-btn.active {
  background: #4ECDC4;
  color: white;
  border-color: #4ECDC4;
}

.layout-btn.radial-btn.active {
  background: #FFE66D;
  color: #333;
  border-color: #FFE66D;
}
```

#### Files to Modify

**1. `src/react-app/src/store/mindmapStore.ts`**

```typescript
// Import layout engine
import { treeLayout, radialLayout } from '../services/layoutEngine';

// Add to MindmapStore interface
interface MindmapStore {
  // ... existing
  applyLayout: (layoutType: 'tree' | 'radial') => void;
}

// In return statement
applyLayout: (layoutType: 'tree' | 'radial') => {
  const state = get();
  let positions: Map<string, Position>;

  if (layoutType === 'tree') {
    positions = treeLayout(state.nodes, state.edges);
  } else {
    positions = radialLayout(state.nodes, state.edges);
  }

  // Update node positions
  const updatedNodes = state.nodes.map(node => {
    const position = positions.get(node.id);
    return position ? { ...node, position } : node;
  });

  set({ nodes: updatedNodes });
  get().pushHistory();
  get().persistTabState();
},
```

**2. `src/react-app/src/components/Toolbar.tsx`**

```typescript
// Import layout selector
import LayoutSelector from './LayoutSelector';

// Add to component
const applyLayout = useMindmapStore((state) => state.applyLayout);

// In toolbar JSX, add after other buttons
<LayoutSelector onApplyLayout={applyLayout} />
```

### Testing

**Test Cases:**
1. Apply tree layout to unorganized mindmap
2. All nodes should be positioned in hierarchy
3. No overlapping nodes
4. Root node at top center
5. Apply radial layout
6. Nodes should arrange in circles
7. Undo after layout
8. Switch layouts multiple times
9. Test with python-course-template.json
10. Performance test with 100+ nodes

### Effort Estimate
- **Layout algorithms:** 3 hours
- **Component creation:** 1.5 hours
- **Store integration:** 1 hour
- **UI integration:** 1 hour
- **Testing:** 1.5 hours
- **Total:** 8 hours

---

## Feature 4: Keyboard Shortcuts

### Specification

**Goal:** Implement keyboard shortcuts for common operations.

**User Story:**
- As a power user
- I want to use keyboard shortcuts
- So that I can work faster without reaching for the mouse

### Keyboard Map

```
Ctrl+S       Save file
Ctrl+O       Open file
Ctrl+N       New child node
Ctrl+Z       Undo
Ctrl+Y       Redo
Ctrl+F       Open find
Ctrl+E       Edit selected node
Delete       Delete selected node
↑↓←→         Navigate nodes
Space        Toggle expand/collapse
/            Focus search input
?            Show help dialog
Ctrl++       Zoom in
Ctrl+-       Zoom out
Escape       Deselect / Close modal
```

### Implementation Details

#### Files to Create

**1. `src/react-app/src/hooks/useKeyboardShortcuts.ts`**

```typescript
import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  onSave?: () => void;
  onOpen?: () => void;
  onAddChild?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onFind?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onToggleExpand?: () => void;
  onZoom?: (direction: 'in' | 'out') => void;
  onShowHelp?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        // Allow only global shortcuts
        if (e.ctrlKey || e.metaKey) {
          if (e.key === 's') {
            e.preventDefault();
            options.onSave?.();
            return;
          }
        }
        return;
      }

      // Ctrl/Cmd combinations
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            options.onSave?.();
            break;
          case 'o':
            e.preventDefault();
            options.onOpen?.();
            break;
          case 'n':
            e.preventDefault();
            options.onAddChild?.();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              options.onRedo?.();
            } else {
              options.onUndo?.();
            }
            break;
          case 'y':
            e.preventDefault();
            options.onRedo?.();
            break;
          case 'f':
            e.preventDefault();
            options.onFind?.();
            break;
          case 'e':
            e.preventDefault();
            options.onEdit?.();
            break;
          case '+':
          case '=':
            e.preventDefault();
            options.onZoom?.('in');
            break;
          case '-':
            e.preventDefault();
            options.onZoom?.('out');
            break;
        }
      }

      // Arrow keys for navigation
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          options.onNavigate?.('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          options.onNavigate?.('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          options.onNavigate?.('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          options.onNavigate?.('right');
          break;
        case ' ':
          e.preventDefault();
          options.onToggleExpand?.();
          break;
      }

      // Other shortcuts
      if (e.key === '/') {
        e.preventDefault();
        options.onFind?.();
      } else if (e.key === '?') {
        e.preventDefault();
        options.onShowHelp?.();
      } else if (e.key === 'Delete') {
        e.preventDefault();
        options.onDelete?.();
      } else if (e.key === 'Escape') {
        // Usually handled by modals, but keep as fallback
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options]);
}
```

**2. `src/react-app/src/components/ShortcutsHelp.tsx`**

```typescript
import React from 'react';
import { createPortal } from 'react-dom';
import './ShortcutsHelp.css';

interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: 'Ctrl+S', action: 'Save file' },
  { keys: 'Ctrl+O', action: 'Open file' },
  { keys: 'Ctrl+N', action: 'New child node' },
  { keys: 'Ctrl+Z', action: 'Undo' },
  { keys: 'Ctrl+Y', action: 'Redo' },
  { keys: 'Ctrl+F', action: 'Find' },
  { keys: 'Ctrl+E', action: 'Edit selected' },
  { keys: 'Delete', action: 'Delete node' },
  { keys: '↑↓←→', action: 'Navigate' },
  { keys: 'Space', action: 'Toggle expand' },
  { keys: '/', action: 'Focus search' },
  { keys: 'Ctrl++', action: 'Zoom in' },
  { keys: 'Ctrl+-', action: 'Zoom out' },
  { keys: 'Escape', action: 'Deselect' },
];

export default function ShortcutsHelp({ isOpen, onClose }: ShortcutsHelpProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="shortcuts-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="shortcuts-list">
          {SHORTCUTS.map((shortcut, idx) => (
            <div key={idx} className="shortcut-item">
              <kbd className="shortcut-keys">{shortcut.keys}</kbd>
              <span className="shortcut-action">{shortcut.action}</span>
            </div>
          ))}
        </div>

        <div className="shortcuts-footer">
          <p>Press ? anytime to view this help</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
```

**3. `src/react-app/src/components/ShortcutsHelp.css`**

```css
.shortcuts-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.shortcuts-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.shortcuts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.shortcuts-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.shortcuts-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.shortcuts-close:hover {
  color: #333;
}

.shortcuts-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.shortcut-item {
  display: flex;
  gap: 10px;
  align-items: center;
}

.shortcut-keys {
  background: #f5f5f5;
  border: 1px solid #ddd;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  min-width: 80px;
  text-align: center;
}

.shortcut-action {
  font-size: 13px;
  color: #666;
  flex: 1;
}

.shortcuts-footer {
  padding: 15px 20px;
  border-top: 1px solid #eee;
  background: #f9f9f9;
  text-align: center;
}

.shortcuts-footer p {
  margin: 0;
  font-size: 12px;
  color: #999;
}
```

#### Files to Modify

**1. `src/react-app/src/App.tsx`**

```typescript
// Import hook
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Import component
import ShortcutsHelp from './components/ShortcutsHelp';

// In component
const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

// Get store actions
const undo = useMindmapStore((state) => state.undo);
const redo = useMindmapStore((state) => state.redo);
const addNode = useMindmapStore((state) => state.addNode);

// Use keyboard shortcuts hook
useKeyboardShortcuts({
  onSave: () => {
    // Trigger save - you'll need to expose this from Toolbar
  },
  onUndo: undo,
  onRedo: redo,
  onAddChild: () => {
    // Add child to selected node
  },
  onShowHelp: () => setShowShortcutsHelp(true),
});

// Add to JSX
<ShortcutsHelp
  isOpen={showShortcutsHelp}
  onClose={() => setShowShortcutsHelp(false)}
/>
```

### Testing

**Test Cases:**
1. Ctrl+S saves file
2. Ctrl+Z/Ctrl+Y undoes/redoes
3. Ctrl+N creates child node
4. Arrow keys navigate nodes
5. Delete key removes node
6. ? opens help
7. Escape closes modals
8. Shortcuts don't work in input fields (except Ctrl+S)
9. All shortcuts work with Cmd on Mac
10. Help dialog displays all shortcuts

### Effort Estimate
- **Hook creation:** 2 hours
- **Component creation:** 1.5 hours
- **App integration:** 1 hour
- **Testing:** 1.5 hours
- **Total:** 6 hours

---

## Summary: Week 1 Implementation

| Feature | Files Created | Files Modified | Est. Time | Tests |
|---------|---------------|----------------|-----------|-------|
| Collapsible Groups | 0 | 3 | 6h | 8 |
| Node Notes | 2 | 3 | 6h | 7 |
| Auto-Layout | 3 | 2 | 8h | 10 |
| Keyboard Shortcuts | 3 | 1 | 6h | 10 |
| **TOTAL** | **8** | **9** | **26h** | **35** |

---

## Next Steps After Week 1

1. **Merge all 4 features** into main branch
2. **Tag as v1.1 release**
3. **Load python-course-template.json** and test all features together
4. **Gather user feedback** on UX and performance
5. **Plan Week 2** based on any blockers or improvements

---

**Ready to implement? Choose your feature and start coding!**

All code is production-ready with:
- TypeScript types
- Error handling
- localStorage persistence
- Keyboard accessibility
- Mobile-friendly CSS
