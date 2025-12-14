# Mindmap App - Implementation Plan (Fast Track)

## Strategy: Parallel Feature Development

Given the improvements roadmap, here's the **fastest way to deliver maximum value** using parallel development:

---

## 🎯 Phase 1: Core Foundation (Week 1-2)
**Goal:** Make the app usable for complex mindmaps with better navigation

### Sprint 1a: Collapsible Groups + Node Notes (Days 1-3)
**Why First?** These two features require minimal dependencies and add immediate value.

#### Feature 1: Collapsible Groups (2 days)
**Files to Modify:**
- `src/react-app/src/store/mindmapStore.ts` - Add `expandedNodeIds` state
- `src/react-app/src/components/MindmapNode.tsx` - Add collapse button and toggle logic
- `src/react-app/src/components/MindmapNode.css` - Style collapse indicator
- `src/react-app/src/App.tsx` - Update ReactFlow to conditionally render children

**Implementation Steps:**
1. Add `expandedNodeIds: Set<string>` to mindmapStore
2. Add toggle function: `toggleNodeExpanded(nodeId: string)`
3. Add collapse/expand arrow icon to MindmapNode
4. Filter edges and nodes in App.tsx based on expandedNodeIds
5. Persist expandedNodeIds to localStorage

**Effort:** ~6-8 hours
**Impact:** ⭐⭐⭐⭐ - Large mindmaps become manageable

---

#### Feature 2: Node Notes/Descriptions (2 days)
**Files to Create:**
- `src/react-app/src/components/NodeNoteEditor.tsx` - Modal with markdown editor
- `src/react-app/src/components/NodeNoteEditor.css`

**Files to Modify:**
- `src/react-app/src/store/mindmapStore.ts` - Add `description` field to node
- `src/react-app/src/components/MindmapNode.tsx` - Add notes button, show indicator

**Implementation Steps:**
1. Update `MindmapNode` interface with `description?: string`
2. Create `NodeNoteEditor` modal with simple textarea
3. Add notes button (📝) to node actions
4. Show indicator if node has notes
5. Persist to mindmapStore on save

**Effort:** ~6-8 hours
**Impact:** ⭐⭐⭐⭐ - Store detailed info per node

---

### Sprint 1b: Auto-Layout Engine (Days 4-6)
**Why Early?** Foundation for future improvements; makes large mindmaps manageable.

#### Feature 3: Hierarchical Auto-Layout (3 days)
**Files to Create:**
- `src/react-app/src/services/layoutEngine.ts` - Layout algorithms
- `src/react-app/src/components/LayoutSelector.tsx` - UI for layout selection

**Files to Modify:**
- `src/react-app/src/store/mindmapStore.ts` - Add `applyLayout()` method
- `src/react-app/src/components/Toolbar.tsx` - Add layout button

**Implementation Steps:**
1. Implement tree layout algorithm (calculate positions based on depth)
2. Implement radial layout algorithm (circular arrangement)
3. Add `applyLayout(layoutType: 'tree' | 'radial')` to store
4. Create layout selector UI
5. Test with Python course template

**Algorithm Logic (Tree Layout):**
```
For each node:
  - Calculate depth from root
  - Calculate position: x = depth * spacing, y = verticalPos
  - Arrange siblings at same depth level
  - Space them by horizontal offset
```

**Effort:** ~8-10 hours
**Impact:** ⭐⭐⭐⭐⭐ - Professional-looking mindmaps auto-arranged

---

### Sprint 1c: Keyboard Navigation (Days 7-10)
**Why Parallel?** Can be done independently; improves UX significantly.

#### Feature 4: Keyboard Shortcuts & Navigation (2 days)
**Files to Create:**
- `src/react-app/src/hooks/useKeyboardShortcuts.ts` - Hook for shortcuts
- `src/react-app/src/components/ShortcutsHelp.tsx` - Help dialog

**Files to Modify:**
- `src/react-app/src/App.tsx` - Add keyboard handler
- `src/react-app/src/components/Toolbar.tsx` - Add help button

**Shortcuts to Implement:**
```
Ctrl+S     - Save
Ctrl+O     - Open
Ctrl+Z     - Undo
Ctrl+Y     - Redo
Ctrl+F     - Find
Ctrl+E     - Edit selected
Ctrl+N     - New child
Delete     - Delete selected
↑↓←→       - Navigate nodes
Ctrl++     - Zoom in
Ctrl+-     - Zoom out
/          - Focus search
?          - Show help
```

**Effort:** ~6-8 hours
**Impact:** ⭐⭐⭐ - 50% faster navigation for power users

---

## 📊 Phase 1 Summary
| Feature | Days | Effort | Impact | Status |
|---------|------|--------|--------|--------|
| Collapsible Groups | 2 | 6-8h | ⭐⭐⭐⭐ | P0 |
| Node Notes | 2 | 6-8h | ⭐⭐⭐⭐ | P0 |
| Auto-Layout | 3 | 8-10h | ⭐⭐⭐⭐⭐ | P0 |
| Keyboard Shortcuts | 2 | 6-8h | ⭐⭐⭐ | P0 |
| **Total** | **10 days** | **27-34h** | **Very High** | **Ready** |

---

## 🎯 Phase 2: Content Management (Week 3-4)
**Goal:** Track progress and organize content better

### Sprint 2a: Status Tracking (Days 11-13)
**Files to Create:**
- `src/react-app/src/components/StatusBadge.tsx` - Visual status indicator
- `src/react-app/src/components/ProgressDashboard.tsx` - Progress overview

**Files to Modify:**
- `src/react-app/src/store/mindmapStore.ts` - Add status field
- `src/react-app/src/components/MindmapNode.tsx` - Show status badge
- `src/react-app/src/components/Toolbar.tsx` - Add progress stats

**Implementation:**
```typescript
enum NodeStatus {
  NotStarted = 'notStarted',
  InProgress = 'inProgress',
  Completed = 'completed',
  NeedsReview = 'needsReview'
}

interface MindmapNode {
  // ... existing
  status?: NodeStatus;
  completedAt?: string;
}
```

**Effort:** ~6-8 hours
**Impact:** ⭐⭐⭐ - Progress tracking for courses

---

### Sprint 2b: Tags & Search Filter (Days 14-18)
**Files to Create:**
- `src/react-app/src/components/TagSelector.tsx` - Tag picker
- `src/react-app/src/components/AdvancedSearch.tsx` - Enhanced search with filters

**Files to Modify:**
- `src/react-app/src/store/mindmapStore.ts` - Add tags field, filter methods
- `src/react-app/src/components/Toolbar.tsx` - Integrate advanced search

**Features:**
- Add/remove tags from nodes
- Filter by tag
- Search by status, tags, content
- Multi-select filters

**Effort:** ~10-12 hours
**Impact:** ⭐⭐⭐⭐ - Find anything in large mindmaps

---

## 📊 Phase 2 Summary
| Feature | Days | Effort | Impact | Status |
|---------|------|--------|--------|--------|
| Status Tracking | 3 | 6-8h | ⭐⭐⭐ | P1 |
| Tags & Advanced Search | 5 | 10-12h | ⭐⭐⭐⭐ | P1 |
| **Total** | **8 days** | **16-20h** | **High** | **Ready** |

---

## 🎯 Phase 3: Export & Import (Week 5)
**Goal:** Get data out of the app in useful formats

### Sprint 3a: Export to Multiple Formats (Days 19-23)

#### Sub-features:
1. **Markdown Export** (2 days)
   - Files: `src/react-app/src/services/exporters/markdownExporter.ts`
   - Hierarchical markdown with indentation
   - Include notes and metadata as comments

2. **HTML Export** (2 days)
   - Files: `src/react-app/src/services/exporters/htmlExporter.ts`
   - Interactive HTML with collapsible sections
   - Self-contained (no external dependencies)

3. **JSON Export** (1 day)
   - Already have JSON structure
   - Just add export button

**Files to Modify:**
- `src/react-app/src/components/Toolbar.tsx` - Add export menu
- `src/electron/main.ts` - Add file save handlers

**Effort:** ~10-12 hours
**Impact:** ⭐⭐⭐⭐ - Data portability

---

## 🚀 Recommended Execution Order (Fastest Path)

### Week 1: Foundation (Parallel Development)
```
Day 1-2: Collapsible Groups     [Team A]
Day 1-2: Node Notes              [Team B]
Day 3-5: Auto-Layout             [Team C]
Day 3-5: Keyboard Shortcuts      [Team D]
```

### Week 2: Stabilize & Polish
- Bug fixes
- Testing with Python course template
- Performance optimization
- User feedback incorporation

### Week 3-4: Content Management
```
Day 8-10: Status Tracking        [Team A]
Day 11-18: Tags & Advanced Search [Team B]
```

### Week 5: Export/Import
```
Day 19-23: Export Formats        [Team A/B]
Day 24-27: Import Support       [Team C]
```

---

## 💡 Key Implementation Tips

### 1. **Leverage Existing Infrastructure**
- Use existing `mindmapStore` for state management
- Reuse `persistTabState()` for persistence
- Use `createPortal` for modals (already done for YouTube)

### 2. **Test with Python Course Template**
- Load template after each feature
- Verify functionality works at scale
- Get real feedback on UX

### 3. **Parallel Development Strategy**
- Keep features independent (minimal merge conflicts)
- Use feature branches: `feature/collapsible-groups`, `feature/node-notes`, etc.
- Each team works on separate component files

### 4. **Incremental Releases**
- After Week 1: Release v1.1 with core UX improvements
- After Week 2: Release v1.2 with content management
- After Week 5: Release v2.0 with export capabilities

---

## 📈 Expected Impact Timeline

### After Week 1 (Core Foundation)
- ✅ Large mindmaps become manageable (collapsible groups)
- ✅ Deep node content possible (notes/descriptions)
- ✅ Professional layout (auto-arrange)
- ✅ Power user efficiency (keyboard shortcuts)
- **Result:** 3-4x better for complex mindmaps

### After Week 2 (Content Management)
- ✅ Track learning progress (status)
- ✅ Organize by categories (tags)
- ✅ Find anything quickly (advanced search)
- **Result:** Viable for courses and projects

### After Week 5 (Export/Import)
- ✅ Share mindmaps as docs (export)
- ✅ Import from other tools (import)
- **Result:** Enterprise-ready for teams

---

## 🔄 Workflow: Use `quick-dev` for Implementation

Based on your CLAUDE.md configuration, use the BMM workflow:

```bash
# For each feature sprint:
/bmad:bmm:workflows:quick-dev

# Provide tech-spec:
Tech-Spec: Implement [Feature Name]
- Component: [Files to create]
- Changes: [Files to modify]
- Implementation: [Steps]
- Testing: [Test cases]
```

This allows for rapid, focused implementation with automatic test generation and validation.

---

## 📋 Feature Branch Strategy

```bash
# Core Foundation (Week 1)
git checkout -b feature/collapsible-groups
git checkout -b feature/node-notes
git checkout -b feature/auto-layout
git checkout -b feature/keyboard-shortcuts

# Content Management (Week 2)
git checkout -b feature/status-tracking
git checkout -b feature/tags-search

# Export/Import (Week 3+)
git checkout -b feature/export-markdown
git checkout -b feature/export-html
git checkout -b feature/import-formats
```

---

## ✅ Success Criteria

### Phase 1 Success
- [ ] Large mindmaps (50+ nodes) remain responsive
- [ ] Users can navigate with keyboard shortcuts
- [ ] Collapsing reduces visual clutter by 80%
- [ ] All Python course template features work smoothly

### Phase 2 Success
- [ ] Users can track learning progress
- [ ] Can find nodes by tags/status quickly
- [ ] Status badges visible without clutter

### Phase 3 Success
- [ ] Export to Markdown produces readable documents
- [ ] Export to HTML is interactive and shareable
- [ ] Data can be imported from external sources

---

## 📞 Quick Reference

**Fastest Path:** Collapsible Groups → Node Notes → Auto-Layout → Keyboard Shortcuts

**Parallel Teams:** 4 teams working independently on separate features (Week 1)

**Testing:** Use python-course-template.json after each feature

**Workflow:** Use quick-dev for rapid iteration

**Target:** Release v1.1 after Week 2, v1.2 after Week 4, v2.0 after Week 6

---

**Plan Version:** 1.0
**Status:** Ready for Execution
**Last Updated:** 2025-12-14
