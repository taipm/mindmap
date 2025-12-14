# 🧪 Mindmap Editor - Testing Guide

## Quick Start (Development)

### 1. Install & Setup
```bash
npm install
cd src/react-app && npm install && cd ../..
```

### 2. Run Development Server
```bash
npm run dev
```

This will:
- Start React dev server on http://localhost:3000
- Launch Electron window connected to React
- Enable hot-reload (changes appear instantly!)

### 3. Test Features

#### Create Nodes
1. Click **+** button on a node
2. New child node appears
3. Edit title by double-clicking
4. Confirm with Enter, cancel with Escape

#### Drag & Drop
1. Click and drag any node
2. Watch it move smoothly on canvas
3. Position resets on reload (use Save to persist!)

#### Edit Node
1. Double-click node title
2. Type new name
3. Press Enter to save

#### Delete Node
1. Hover over node (actions appear)
2. Click **✕** button
3. Node and all edges disappear
4. ✅ Undo works! (Undo button or Ctrl+Z)

#### Save & Load
1. Click **💾 Save** button
2. Choose location (defaults to mindmap.json)
3. Verify file created
4. Close app, reopen
5. Click **📂 Open** button
6. Select the saved JSON file
7. Mindmap fully restored! ✅

#### Export
1. Click **🖼️ PNG** - exports canvas as image
2. Click **📐 SVG** - exports as vector (scalable)
3. Click **📄 JSON** - downloads JSON locally (no dialog)

#### Undo/Redo
1. Make changes (add/delete nodes)
2. Click **↶ Undo** - reverts last change
3. Click **↷ Redo** - restores change
4. Works across multiple operations!

#### Clear All
1. Click **🗑️ Clear** button
2. Confirm dialog
3. Returns to single root node
4. Fresh canvas for new mindmap

---

## Testing Checklist

- [ ] **Node Creation** - + button creates child nodes
- [ ] **Editing** - Double-click edits, Enter saves, Escape cancels
- [ ] **Deletion** - ✕ button deletes node (except root)
- [ ] **Drag & Drop** - Nodes move smoothly
- [ ] **Undo/Redo** - History works correctly
- [ ] **Save** - JSON file created and readable
- [ ] **Load** - Reopens saved mindmap correctly
- [ ] **Export PNG** - Image exports successfully
- [ ] **Export SVG** - Vector file exports correctly
- [ ] **Export JSON** - JSON downloads locally
- [ ] **Clear** - Resets to root node only
- [ ] **UI Responsive** - No lag during interactions
- [ ] **Hot Reload** - Changes appear without restart

---

## Troubleshooting

### App won't start
```bash
# Check Node version (need 20+)
node --version

# Reinstall dependencies
rm -rf node_modules src/react-app/node_modules
npm install && cd src/react-app && npm install && cd ../..

# Try development again
npm run dev
```

### Blank canvas
- Check browser console (DevTools: F12)
- Verify React loaded (should see "Mindmap Editor" in toolbar)
- ReactFlow might need full page reload (Cmd+R)

### Exports not working
- Chrome/Electron should work fine
- PNG: Check html2canvas installed (`npm ls html2canvas`)
- SVG: Requires canvas element present

### Files won't save
- Check file dialog appears
- Verify write permissions in chosen directory
- Check browser console for errors

---

## Development Tips

### React Changes
- Edit files in `src/react-app/src/`
- Changes auto-reload instantly (hot-reload)
- Browser DevTools: F12 or Cmd+Option+I

### Store Changes
- Edit `src/react-app/src/store/mindmapStore.ts`
- State updates automatically
- Undo/Redo stack rebuilds

### New Features
1. Edit component in `src/react-app/src/components/`
2. Import in `App.tsx`
3. Changes appear instantly!

### Build for Production
```bash
npm run build    # Compiles everything
npm run dist     # Creates distributable
```

Outputs to:
- React build: `src/react-app/build/`
- Electron build: `dist/electron/`
- Installer: `out/` folder

---

## Next Steps

Once testing is complete:
1. ✅ Commit any bug fixes
2. 🔜 Start Phase 2 (Backend server setup)
3. 🌐 Add WebSocket for multi-user sync
4. 💾 Connect to PostgreSQL database

---

**Built with Electron + React + TypeScript** 🚀
