# 🧠 Mindmap Editor

A powerful **multi-user collaborative mindmap editor** for desktop built with **Electron, React, and TypeScript**.

## 🎯 Features

### Phase 1: MVP (✅ Completed)
- ✅ **Desktop Application** - Built with Electron for cross-platform support (Windows, Mac, Linux)
- ✅ **Interactive Canvas** - Powered by ReactFlow for smooth node manipulation
- ✅ **Node Management**
  - Create nodes with + button
  - Edit node titles with double-click
  - Delete nodes with ✕ button
  - Drag-drop repositioning
  - Color-coded nodes
- ✅ **File Operations**
  - Save mindmap to JSON file
  - Load mindmap from JSON file
- ✅ **Export Formats** - PNG, SVG, JSON
- ✅ **Undo/Redo** - Full history support with Zustand state management
- ✅ **Toolbar** - Easy-access buttons for all operations

## 📦 Tech Stack

```
Electron 28 + React 18 + TypeScript
├─ Canvas: ReactFlow
├─ State: Zustand (with undo/redo)
├─ Export: html2canvas
└─ File I/O: Electron API
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install && cd src/react-app && npm install && cd ../..

# Development
npm run dev

# Production
npm run build && npm run dist
```

## 📊 Data Format

Mindmaps save as JSON:
```json
{
  "id": "mindmap-uuid",
  "title": "My Project",
  "nodes": [{"id": "node-1", "title": "Root", "position": {"x": 0, "y": 0}, "color": "#FF6B6B"}],
  "edges": [{"id": "edge-1", "from": "node-1", "to": "node-2"}]
}
```

## ⌨️ Shortcuts

- Double-click node to edit
- + button to add child node
- ✕ button to delete node
- Drag to move nodes

## 🔄 Phase 2: Multi-User (Upcoming)

Will add:
- Backend server (Node.js + Express)
- Real-time sync (WebSocket + Yjs CRDT)
- Database (PostgreSQL)
- User authentication
- Collaborative editing

## 📁 Project Structure

```
src/
├── electron/          # Electron main process
├── react-app/         # React frontend
└── shared/            # Shared types
```

## 🔒 Status

**Phase 1 MVP:** ✅ Complete
- Single-user mindmap editing
- File save/load
- Export (PNG, SVG, JSON)
- Undo/Redo

**Phase 2:** 🔜 Next (Multi-user backend)

---

Built with Electron, React, TypeScript
