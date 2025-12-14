# ⚡ Quick Commands Reference

## 🚀 Development

```bash
# Install dependencies (first time only)
npm install && cd src/react-app && npm install && cd ../..

# Start development server (hot reload enabled)
npm run dev

# Build for production
npm run build

# Create distributable installer
npm run dist
```

## 📁 Project Structure

```
mindmap/
├── src/
│   ├── electron/
│   │   ├── main.ts              # Electron entry point + IPC handlers
│   │   └── preload.ts           # Secure IPC bridge
│   ├── react-app/
│   │   ├── src/
│   │   │   ├── App.tsx          # Main React component
│   │   │   ├── App.css          # App styling
│   │   │   ├── components/
│   │   │   │   ├── MindmapNode.tsx      # Node component
│   │   │   │   ├── MindmapNode.css      # Node styling
│   │   │   │   ├── Toolbar.tsx          # Toolbar component
│   │   │   │   └── Toolbar.css          # Toolbar styling
│   │   │   └── store/
│   │   │       └── mindmapStore.ts      # Zustand state management
│   │   ├── build/               # Production build (generated)
│   │   └── package.json
│   └── shared/
│       └── types.ts             # TypeScript interfaces
├── README.md                    # Feature overview
├── TEST_GUIDE.md               # Testing checklist
├── FIXLOG.md                   # Bug fix documentation
├── PROJECT_STATUS.md           # Project summary
├── DOCUMENTATION_INDEX.md      # Phase 2 docs hub
├── ARCHITECTURE_PHASE2.md      # Phase 2 technical spec
└── package.json
```

## 📋 UI Shortcuts

### Node Operations
- **Create:** Click **+** button on any node
- **Edit:** Double-click node title
- **Save Edit:** Press **Enter**
- **Cancel Edit:** Press **Escape**
- **Delete:** Click **✕** button
- **Move:** Drag node to new position

### Toolbar Buttons
| Button | Action | Shortcut |
|--------|--------|----------|
| 💾 Save | Save to JSON file | Ctrl+S* |
| 📂 Open | Open JSON file | Ctrl+O* |
| ↶ Undo | Revert last change | Ctrl+Z |
| ↷ Redo | Restore reverted change | Ctrl+Y |
| 🖼️ PNG | Export as image | - |
| 📐 SVG | Export as vector | - |
| 📄 JSON | Download as JSON | - |
| 🗑️ Clear | Clear all (with confirmation) | - |

\* Shortcuts displayed in tooltips (not yet implemented as global hotkeys)

## 📁 File Locations

After saving, files are stored in user's home directory or selected location:

```
~/mindmaps/                    # Suggested save directory
├── project1.json
├── project2.json
└── my-mindmap.json
```

Export files:
```
~/Downloads/                   # Default export location
├── mindmap.png               # PNG export
├── mindmap.svg               # SVG export
└── mindmap.json              # JSON export
```

## 🔨 Development Tips

### Hot Reload
```bash
# Already enabled in development mode
# Edit src/react-app/src/components/MindmapNode.tsx
# Changes appear instantly without restart!
```

### Debug Store State
```typescript
// In browser console (F12)
const store = require('src/react-app/src/store/mindmapStore').useMindmapStore;
store.getState().nodes   // See all nodes
store.getState().edges   // See all edges
store.getState().history // See history stack
```

### Check Electron Logs
```bash
# DevTools opens automatically in development
# Console tab shows all logs from both processes
```

## 📊 Data Format

Mindmaps are stored as JSON:

```json
{
  "id": "mindmap-1702569600000",
  "title": "My Project",
  "version": 1,
  "createdAt": "2025-12-14T10:00:00.000Z",
  "updatedAt": "2025-12-14T10:30:00.000Z",
  "owner": "local",
  "permissions": [],
  "nodes": [
    {
      "id": "root",
      "title": "Mindmap",
      "parentId": null,
      "position": {"x": 0, "y": 0},
      "color": "#FF6B6B"
    },
    {
      "id": "node-1702569601234",
      "title": "Child Node",
      "parentId": "root",
      "position": {"x": 200, "y": 150},
      "color": "#4ECDC4"
    }
  ],
  "edges": [
    {
      "id": "edge-root-node-1702569601234",
      "from": "root",
      "to": "node-1702569601234"
    }
  ]
}
```

## 🎨 Colors Available

Default node colors (auto-assigned):
- `#FF6B6B` - Red
- `#4ECDC4` - Teal
- `#45B7D1` - Blue
- `#FFA07A` - Salmon
- `#98D8C8` - Mint
- `#F7DC6F` - Yellow
- `#BB8FCE` - Purple

Colors can be customized by editing `COLORS` array in `mindmapStore.ts`

## 🔌 IPC Channels

For advanced development:

```typescript
// Save file
const result = await window.electronAPI.saveFile('mindmap.json', jsonData);
// Returns: { success: boolean, path?: string, error?: string }

// Open file
const result = await window.electronAPI.openFile();
// Returns: { success: boolean, content?: string, path?: string, error?: string }

// Export image
const result = await window.electronAPI.exportImage(
  'mindmap.png',
  dataUrl,
  'png' | 'svg'
);
// Returns: { success: boolean, path?: string, error?: string }
```

## 📝 Common Tasks

### Create a New Mindmap
1. Run `npm run dev`
2. App opens with default "Mindmap" root node
3. Click **+** to add child nodes
4. Click **Save** to save your work

### Open Existing Mindmap
1. Click **📂 Open** button
2. Select your `.json` file
3. Mindmap loads with all nodes restored

### Export Your Work
```bash
# PNG (best for presentations)
Click 🖼️ PNG button

# SVG (best for editing in design tools)
Click 📐 SVG button

# JSON (best for backup/sharing)
Click 📄 JSON button
```

### Undo Mistakes
- Click **↶ Undo** button (or Ctrl+Z)
- Works for: create, delete, edit, add

### Clear & Start Over
1. Click **🗑️ Clear** button
2. Confirm in dialog
3. Returns to single root node

## 🐛 Troubleshooting

### App Won't Start
```bash
# Check Node version (need 20+)
node --version

# Reinstall dependencies
rm -rf node_modules src/react-app/node_modules
npm install && cd src/react-app && npm install && cd ../..

# Try again
npm run dev
```

### Buttons Not Working
- Check browser console (F12) for errors
- Restart dev server: Stop and run `npm run dev` again

### Nodes Not Appearing
- Try full page reload (Cmd+R)
- Check browser DevTools for JavaScript errors

### Save/Open Not Working
- Check file dialog appears
- Ensure write permissions on directory
- Check browser console for errors

### Export Not Working
- Ensure canvas is rendered (not hidden/off-screen)
- PNG: Check html2canvas installed
- SVG: Requires canvas element present

## 📞 Getting Help

1. Check [TEST_GUIDE.md](TEST_GUIDE.md) for feature testing
2. Review [FIXLOG.md](FIXLOG.md) for known issues
3. Check [PROJECT_STATUS.md](PROJECT_STATUS.md) for overview
4. Review source code comments

## 🚀 Phase 2 Preparation

For multi-user collaboration:
1. Follow [README_PHASE2.md](README_PHASE2.md)
2. Study [ARCHITECTURE_PHASE2.md](ARCHITECTURE_PHASE2.md)
3. Setup Node.js backend
4. Implement WebSocket server
5. Integrate Yjs for CRDTs

---

**Last Updated:** December 14, 2025
**Phase 1:** ✅ Complete
**Status:** Ready for development or Phase 2
