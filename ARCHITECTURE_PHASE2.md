# Mindmap Editor - Phase 2 Backend Architecture

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Database Schema](#database-schema)
5. [WebSocket Protocol](#websocket-protocol)
6. [Yjs Integration Strategy](#yjs-integration-strategy)
7. [API Endpoints](#api-endpoints)
8. [Authentication Flow](#authentication-flow)
9. [Real-time Collaboration Architecture](#real-time-collaboration-architecture)
10. [Implementation Roadmap](#implementation-roadmap)
11. [Code Examples](#code-examples)

---

## Executive Summary

Phase 2 transforms the single-user desktop application into a multi-user collaborative platform with real-time synchronization, persistent storage, and secure authentication. The architecture leverages **Yjs CRDT** for conflict-free merging, **WebSocket** for real-time communication, and **PostgreSQL** for durable persistence.

### Key Design Decisions
- **Hybrid State Management**: Zustand for local UI state + Yjs for collaborative state
- **Offline-First**: Yjs enables full offline editing with automatic sync on reconnection
- **Event Sourcing Pattern**: Store Yjs updates as append-only log for audit trail
- **Layered Architecture**: Clear separation between transport (WebSocket), CRDT (Yjs), persistence (PostgreSQL), and UI (React)

---

## Technology Stack

### Backend
```
Node.js (v20+)           - Runtime environment
Express.js (v4.18+)      - HTTP server & REST API
Socket.io (v4.6+)        - WebSocket abstraction with reconnection
Yjs (v13.6+)             - CRDT framework
y-protocols              - WebSocket provider for Yjs
PostgreSQL (v15+)        - Primary database
Prisma (v5.7+)           - ORM & migrations
Redis (v7+)              - Session store & pub/sub for scaling
JWT (jsonwebtoken)       - Authentication tokens
bcrypt                   - Password hashing
Zod                      - Schema validation
Winston                  - Logging
```

### Frontend Changes
```
y-websocket              - Yjs WebSocket provider
y-zustand                - Bridge between Yjs and Zustand
zustand (existing)       - Local UI state
Socket.io-client         - WebSocket client
```

### Infrastructure
```
Docker                   - Containerization
Docker Compose           - Local development
Nginx                    - Reverse proxy & load balancing
PM2                      - Process management
```

---

## System Architecture

### High-Level Architecture Diagram (Text)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   React UI   │◄───│   Zustand    │◄───│  Local Yjs   │     │
│  │  Components  │    │  (UI State)  │    │   Y.Doc      │     │
│  └──────────────┘    └──────────────┘    └──────┬───────┘     │
│                                                   │              │
│                                                   │              │
│                      ┌────────────────────────────┘              │
│                      │                                           │
│                      ▼                                           │
│              ┌───────────────┐                                   │
│              │ y-websocket   │                                   │
│              │  Provider     │                                   │
│              └───────┬───────┘                                   │
└──────────────────────┼───────────────────────────────────────────┘
                       │ WebSocket Connection (Socket.io)
                       │
┌──────────────────────┼───────────────────────────────────────────┐
│                      ▼          SERVER LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              WebSocket Server (Socket.io)                │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │         Yjs WebSocket Provider (y-websocket)     │   │   │
│  │  │  - Room management                                │   │   │
│  │  │  - Update broadcasting                            │   │   │
│  │  │  - Awareness protocol (cursors/presence)         │   │   │
│  │  └──────────────────┬───────────────────────────────┘   │   │
│  └─────────────────────┼───────────────────────────────────┘   │
│                        │                                        │
│                        ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Document Service Layer                      │   │
│  │  - Yjs Y.Doc instances (in-memory)                      │   │
│  │  - Update queue & debouncing                            │   │
│  │  - Conflict-free merging                                │   │
│  └─────────────────┬───────────────────────────────────────┘   │
│                    │                                            │
│  ┌─────────────────┴───────────────┐                           │
│  ▼                                 ▼                           │
│  ┌──────────────┐          ┌──────────────┐                    │
│  │   REST API   │          │  Persistence │                    │
│  │  (Express)   │          │   Service    │                    │
│  │              │          │              │                    │
│  │ - Auth       │          │ - Yjs update │                    │
│  │ - CRUD       │          │   encoding   │                    │
│  │ - Export     │          │ - Batch save │                    │
│  └──────┬───────┘          └──────┬───────┘                    │
│         │                         │                             │
│         └─────────┬───────────────┘                             │
│                   ▼                                             │
│         ┌─────────────────┐                                     │
│         │   Prisma ORM    │                                     │
│         └────────┬────────┘                                     │
└──────────────────┼─────────────────────────────────────────────┘
                   │
┌──────────────────┼─────────────────────────────────────────────┐
│                  ▼         DATA LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │   PostgreSQL     │              │      Redis       │        │
│  │                  │              │                  │        │
│  │ - Users          │              │ - Sessions       │        │
│  │ - Mindmaps       │              │ - Pub/Sub        │        │
│  │ - Nodes          │              │ - Cache          │        │
│  │ - Edges          │              └──────────────────┘        │
│  │ - Updates (Yjs)  │                                          │
│  │ - Activity Log   │                                          │
│  └──────────────────┘                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### Client Layer
- **React UI**: Render mindmap using ReactFlow
- **Zustand Store**: Local UI state (selections, toolbar state, temporary data)
- **Yjs Y.Doc**: Shared collaborative state (nodes, edges)
- **y-websocket Provider**: Sync Yjs doc with server

#### Server Layer
- **WebSocket Server**: Manage connections, authentication, room joining
- **Document Service**: In-memory Yjs docs, broadcasting updates
- **REST API**: User management, mindmap CRUD, exports
- **Persistence Service**: Encode/decode Yjs updates, batch writes to DB

#### Data Layer
- **PostgreSQL**: Durable storage for all entities
- **Redis**: Session management, real-time pub/sub for horizontal scaling

---

## Database Schema

### Prisma Schema Definition

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// User Management
// ============================================

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  name          String
  avatarUrl     String?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?

  // Relations
  ownedMindmaps Mindmap[] @relation("MindmapOwner")
  permissions   MindmapPermission[]
  activityLogs  ActivityLog[]
  sessions      Session[]

  @@index([email])
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  token        String   @unique
  refreshToken String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}

// ============================================
// Mindmap Management
// ============================================

model Mindmap {
  id          String   @id @default(uuid())
  title       String
  description String?
  ownerId     String

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Yjs document state
  yjsStateVector Bytes?  // Binary encoded Yjs state vector
  lastSyncAt     DateTime?

  // Metadata
  isPublic    Boolean  @default(false)
  isArchived  Boolean  @default(false)
  version     Int      @default(1)

  // Relations
  owner       User     @relation("MindmapOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  permissions MindmapPermission[]
  nodes       Node[]
  edges       Edge[]
  updates     YjsUpdate[]
  activityLogs ActivityLog[]

  @@index([ownerId])
  @@index([createdAt])
  @@index([updatedAt])
}

// ============================================
// Mindmap Content (Denormalized for queries)
// ============================================

model Node {
  id         String   @id @default(uuid())
  mindmapId  String

  // Node data
  title      String
  parentId   String?
  positionX  Float
  positionY  Float
  color      String
  metadata   Json?    // Flexible metadata storage

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  deletedAt  DateTime?

  // Relations
  mindmap    Mindmap  @relation(fields: [mindmapId], references: [id], onDelete: Cascade)

  @@index([mindmapId])
  @@index([parentId])
}

model Edge {
  id         String   @id @default(uuid())
  mindmapId  String

  // Edge data
  fromNodeId String
  toNodeId   String
  label      String?
  metadata   Json?

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  deletedAt  DateTime?

  // Relations
  mindmap    Mindmap  @relation(fields: [mindmapId], references: [id], onDelete: Cascade)

  @@index([mindmapId])
  @@index([fromNodeId])
  @@index([toNodeId])
}

// ============================================
// Yjs Updates (Event Sourcing)
// ============================================

model YjsUpdate {
  id         String   @id @default(uuid())
  mindmapId  String

  // Yjs update data (binary)
  update     Bytes
  clock      BigInt   // Lamport timestamp from Yjs

  createdAt  DateTime @default(now())
  createdBy  String?  // User ID who created this update

  // Relations
  mindmap    Mindmap  @relation(fields: [mindmapId], references: [id], onDelete: Cascade)

  @@index([mindmapId, clock])
  @@index([createdAt])
}

// ============================================
// Permissions & Sharing
// ============================================

enum PermissionLevel {
  VIEWER
  EDITOR
  ADMIN
}

model MindmapPermission {
  id          String          @id @default(uuid())
  mindmapId   String
  userId      String
  level       PermissionLevel

  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  // Relations
  mindmap     Mindmap         @relation(fields: [mindmapId], references: [id], onDelete: Cascade)
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([mindmapId, userId])
  @@index([userId])
}

// ============================================
// Activity Log (Audit Trail)
// ============================================

enum ActivityAction {
  CREATE_MINDMAP
  UPDATE_MINDMAP
  DELETE_MINDMAP
  SHARE_MINDMAP
  CREATE_NODE
  UPDATE_NODE
  DELETE_NODE
  CREATE_EDGE
  DELETE_EDGE
  EXPORT_MINDMAP
  LOGIN
  LOGOUT
}

model ActivityLog {
  id         String         @id @default(uuid())
  userId     String
  mindmapId  String?
  action     ActivityAction
  metadata   Json?          // Additional context
  ipAddress  String?
  userAgent  String?

  createdAt  DateTime       @default(now())

  // Relations
  user       User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  mindmap    Mindmap?       @relation(fields: [mindmapId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([mindmapId])
  @@index([createdAt])
  @@index([action])
}
```

### Schema Design Rationale

1. **Dual Storage Strategy**:
   - `YjsUpdate` table: Event sourcing pattern, stores binary Yjs updates as append-only log
   - `Node` and `Edge` tables: Denormalized for fast queries, reconstructed from Yjs state
   - `yjsStateVector` in Mindmap: Snapshot for quick loading

2. **Soft Deletes**: `deletedAt` field enables undo/restore functionality

3. **Flexible Metadata**: JSON fields allow extension without schema changes

4. **Composite Indexes**: Optimize common query patterns (user's mindmaps, mindmap's nodes)

5. **Cascading Deletes**: Automatic cleanup when parent entities are deleted

---

## WebSocket Protocol

### Connection Flow

```
Client                          Server
  │                               │
  │  1. HTTP POST /auth/login     │
  ├──────────────────────────────>│
  │  { email, password }          │
  │                               │
  │  2. JWT token                 │
  │<────────────────────────────┤
  │  { token, refreshToken }      │
  │                               │
  │  3. WebSocket Connect         │
  │  (Authorization: Bearer JWT)  │
  ├──────────────────────────────>│
  │                               │
  │  4. Connection Ack            │
  │<────────────────────────────┤
  │  { sessionId, userId }        │
  │                               │
  │  5. Join Room                 │
  │  { type: 'join', roomId }     │
  ├──────────────────────────────>│
  │                               │
  │                               │──┐ Verify permissions
  │                               │  │ Load Yjs state
  │                               │<─┘
  │                               │
  │  6. Initial State             │
  │<────────────────────────────┤
  │  { type: 'sync',              │
  │    state: Uint8Array,         │
  │    users: [...] }             │
  │                               │
  │  7. Yjs Updates (bidirectional)│
  │<──────────────────────────────>│
  │  { type: 'update',            │
  │    update: Uint8Array }       │
  │                               │
  │  8. Awareness Updates         │
  │<──────────────────────────────>│
  │  { type: 'awareness',         │
  │    users: [{cursor, name}] }  │
  │                               │
```

### Message Types

```typescript
// server/src/types/websocket.ts

export interface WSMessage {
  type: string;
  payload?: any;
}

// Client -> Server
export interface JoinRoomMessage extends WSMessage {
  type: 'join';
  payload: {
    roomId: string; // mindmap ID
  };
}

export interface LeaveRoomMessage extends WSMessage {
  type: 'leave';
  payload: {
    roomId: string;
  };
}

export interface YjsUpdateMessage extends WSMessage {
  type: 'yjs-update';
  payload: {
    roomId: string;
    update: Uint8Array; // Binary Yjs update
  };
}

export interface AwarenessUpdateMessage extends WSMessage {
  type: 'awareness-update';
  payload: {
    roomId: string;
    states: Map<number, any>; // User awareness states
  };
}

// Server -> Client
export interface SyncStateMessage extends WSMessage {
  type: 'sync-state';
  payload: {
    state: Uint8Array; // Complete Yjs state
    stateVector: Uint8Array; // State vector for incremental sync
    users: ActiveUser[];
  };
}

export interface UserJoinedMessage extends WSMessage {
  type: 'user-joined';
  payload: {
    userId: string;
    name: string;
    avatarUrl?: string;
  };
}

export interface UserLeftMessage extends WSMessage {
  type: 'user-left';
  payload: {
    userId: string;
  };
}

export interface ErrorMessage extends WSMessage {
  type: 'error';
  payload: {
    code: string;
    message: string;
  };
}
```

### Yjs Protocol Integration

The server uses `y-websocket` protocol specification:

```typescript
// Yjs sync protocol (handled by y-websocket library)
// Message format: [messageType, ...content]

// messageType:
//   0 = Sync Step 1 (client sends state vector)
//   1 = Sync Step 2 (server sends missing updates)
//   2 = Update (incremental changes)

// Awareness protocol (separate channel)
//   Client broadcasts cursor position, selections, user info
```

---

## Yjs Integration Strategy

### Yjs Document Structure

```typescript
// Shared Yjs document structure
const ydoc = new Y.Doc();

// Define shared types
const nodes = ydoc.getMap('nodes'); // Y.Map<nodeId, NodeData>
const edges = ydoc.getMap('edges'); // Y.Map<edgeId, EdgeData>
const metadata = ydoc.getMap('metadata'); // Title, settings, etc.

// Example node structure in Yjs
type YjsNode = {
  id: string;
  title: string;
  parentId: string | null;
  position: { x: number; y: number };
  color: string;
  metadata?: Record<string, any>;
};
```

### Frontend Integration: Zustand + Yjs Bridge

```typescript
// src/react-app/src/store/collaborativeStore.ts

import { create } from 'zustand';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface CollaborativeStore {
  ydoc: Y.Doc;
  provider: WebsocketProvider | null;
  isConnected: boolean;
  activeUsers: Map<number, AwarenessState>;

  // Initialization
  initYjs: (roomId: string, token: string) => void;
  disconnect: () => void;

  // Yjs operations (these mutate the shared doc)
  addNode: (node: Omit<YjsNode, 'id'>) => string;
  updateNode: (id: string, updates: Partial<YjsNode>) => void;
  deleteNode: (id: string) => void;

  // Sync with Zustand (for React re-renders)
  syncFromYjs: () => void;
}

export const useCollaborativeStore = create<CollaborativeStore>((set, get) => {
  const ydoc = new Y.Doc();

  return {
    ydoc,
    provider: null,
    isConnected: false,
    activeUsers: new Map(),

    initYjs: (roomId, token) => {
      // Create WebSocket provider
      const provider = new WebsocketProvider(
        'ws://localhost:4000', // WebSocket server URL
        roomId,
        ydoc,
        {
          params: { token }, // JWT in query params
        }
      );

      // Connection event handlers
      provider.on('status', (event: { status: string }) => {
        set({ isConnected: event.status === 'connected' });
      });

      // Awareness (presence) updates
      provider.awareness.on('change', () => {
        set({ activeUsers: new Map(provider.awareness.getStates()) });
      });

      // Observe Yjs changes and sync to Zustand
      const nodesMap = ydoc.getMap('nodes');
      const edgesMap = ydoc.getMap('edges');

      nodesMap.observe(() => {
        get().syncFromYjs();
      });

      edgesMap.observe(() => {
        get().syncFromYjs();
      });

      set({ provider });
    },

    disconnect: () => {
      const { provider } = get();
      if (provider) {
        provider.destroy();
        set({ provider: null, isConnected: false });
      }
    },

    addNode: (nodeData) => {
      const { ydoc } = get();
      const nodesMap = ydoc.getMap('nodes');

      const newId = `node-${Date.now()}-${Math.random()}`;
      const newNode: YjsNode = {
        ...nodeData,
        id: newId,
      };

      // This will automatically sync to all clients via Yjs
      nodesMap.set(newId, newNode);

      return newId;
    },

    updateNode: (id, updates) => {
      const { ydoc } = get();
      const nodesMap = ydoc.getMap('nodes');
      const existingNode = nodesMap.get(id);

      if (existingNode) {
        nodesMap.set(id, { ...existingNode, ...updates });
      }
    },

    deleteNode: (id) => {
      const { ydoc } = get();
      const nodesMap = ydoc.getMap('nodes');
      const edgesMap = ydoc.getMap('edges');

      // Delete node
      nodesMap.delete(id);

      // Delete associated edges
      edgesMap.forEach((edge, edgeId) => {
        if (edge.from === id || edge.to === id) {
          edgesMap.delete(edgeId);
        }
      });
    },

    syncFromYjs: () => {
      // This triggers Zustand subscribers (React re-renders)
      // The actual data is read directly from ydoc in components
      set({ isConnected: get().isConnected }); // Dummy update to trigger
    },
  };
});
```

### Backend: Yjs Document Management

```typescript
// server/src/services/yjsDocumentService.ts

import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { prisma } from '../db';

class YjsDocumentService {
  private documents: Map<string, Y.Doc> = new Map();

  /**
   * Get or create a Yjs document for a mindmap
   */
  async getDocument(mindmapId: string): Promise<Y.Doc> {
    // Check in-memory cache
    if (this.documents.has(mindmapId)) {
      return this.documents.get(mindmapId)!;
    }

    // Create new document
    const ydoc = new Y.Doc();

    // Load persisted state from database
    await this.loadFromDatabase(mindmapId, ydoc);

    // Set up persistence (debounced)
    this.setupPersistence(mindmapId, ydoc);

    // Cache in memory
    this.documents.set(mindmapId, ydoc);

    return ydoc;
  }

  /**
   * Load Yjs state from PostgreSQL
   */
  private async loadFromDatabase(mindmapId: string, ydoc: Y.Doc): Promise<void> {
    const mindmap = await prisma.mindmap.findUnique({
      where: { id: mindmapId },
      include: { updates: { orderBy: { clock: 'asc' } } },
    });

    if (!mindmap) {
      throw new Error('Mindmap not found');
    }

    // Apply all Yjs updates in order (event sourcing)
    for (const update of mindmap.updates) {
      Y.applyUpdate(ydoc, Buffer.from(update.update));
    }

    console.log(`Loaded ${mindmap.updates.length} updates for mindmap ${mindmapId}`);
  }

  /**
   * Set up automatic persistence with debouncing
   */
  private setupPersistence(mindmapId: string, ydoc: Y.Doc): void {
    let updateQueue: Uint8Array[] = [];
    let saveTimeout: NodeJS.Timeout | null = null;

    ydoc.on('update', (update: Uint8Array, origin: any) => {
      // Don't persist updates from database loading
      if (origin === 'db-load') return;

      // Add to queue
      updateQueue.push(update);

      // Debounce: save after 2 seconds of inactivity
      if (saveTimeout) clearTimeout(saveTimeout);

      saveTimeout = setTimeout(async () => {
        await this.persistUpdates(mindmapId, updateQueue);
        updateQueue = [];
      }, 2000);
    });
  }

  /**
   * Persist Yjs updates to database
   */
  private async persistUpdates(mindmapId: string, updates: Uint8Array[]): Promise<void> {
    if (updates.length === 0) return;

    // Merge updates for efficiency
    const mergedUpdate = Y.mergeUpdates(updates);

    // Extract clock (Lamport timestamp)
    const clock = this.extractClock(mergedUpdate);

    // Save to database
    await prisma.yjsUpdate.create({
      data: {
        mindmapId,
        update: Buffer.from(mergedUpdate),
        clock,
      },
    });

    // Also update the denormalized Node/Edge tables for queries
    await this.syncDenormalizedTables(mindmapId);

    console.log(`Persisted update for mindmap ${mindmapId}, clock: ${clock}`);
  }

  /**
   * Extract Lamport clock from Yjs update
   */
  private extractClock(update: Uint8Array): bigint {
    const decoder = decoding.createDecoder(update);
    const structs = decoding.readVarUint(decoder);
    if (structs > 0) {
      const clock = decoding.readVarUint(decoder);
      return BigInt(clock);
    }
    return BigInt(0);
  }

  /**
   * Sync Yjs state to denormalized Node/Edge tables
   */
  private async syncDenormalizedTables(mindmapId: string): Promise<void> {
    const ydoc = this.documents.get(mindmapId);
    if (!ydoc) return;

    const nodesMap = ydoc.getMap('nodes');
    const edgesMap = ydoc.getMap('edges');

    // Delete existing records
    await prisma.$transaction([
      prisma.node.deleteMany({ where: { mindmapId } }),
      prisma.edge.deleteMany({ where: { mindmapId } }),
    ]);

    // Insert from Yjs state
    const nodes: any[] = [];
    nodesMap.forEach((node: any) => {
      nodes.push({
        id: node.id,
        mindmapId,
        title: node.title,
        parentId: node.parentId,
        positionX: node.position.x,
        positionY: node.position.y,
        color: node.color,
        metadata: node.metadata,
      });
    });

    const edges: any[] = [];
    edgesMap.forEach((edge: any) => {
      edges.push({
        id: edge.id,
        mindmapId,
        fromNodeId: edge.from,
        toNodeId: edge.to,
        label: edge.label,
        metadata: edge.metadata,
      });
    });

    if (nodes.length > 0) {
      await prisma.node.createMany({ data: nodes });
    }

    if (edges.length > 0) {
      await prisma.edge.createMany({ data: edges });
    }
  }

  /**
   * Clean up unused documents from memory
   */
  cleanupDocument(mindmapId: string): void {
    const ydoc = this.documents.get(mindmapId);
    if (ydoc) {
      ydoc.destroy();
      this.documents.delete(mindmapId);
    }
  }
}

export const yjsDocumentService = new YjsDocumentService();
```

---

## API Endpoints

### REST API Design

```typescript
// server/src/routes/index.ts

// Authentication
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh-token
GET    /api/auth/me

// Mindmaps
GET    /api/mindmaps              // List user's mindmaps
POST   /api/mindmaps              // Create new mindmap
GET    /api/mindmaps/:id          // Get mindmap metadata
PATCH  /api/mindmaps/:id          // Update metadata (title, description)
DELETE /api/mindmaps/:id          // Delete mindmap
GET    /api/mindmaps/:id/export   // Export as JSON/PNG/PDF

// Permissions
GET    /api/mindmaps/:id/permissions     // List permissions
POST   /api/mindmaps/:id/permissions     // Grant permission
DELETE /api/mindmaps/:id/permissions/:userId  // Revoke permission

// Activity Logs
GET    /api/mindmaps/:id/activity        // Get activity log

// Users
GET    /api/users/search?q=              // Search users for sharing
GET    /api/users/:id                    // Get user profile
```

### Example Endpoint Implementation

```typescript
// server/src/routes/mindmaps.ts

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { yjsDocumentService } from '../services/yjsDocumentService';
import { prisma } from '../db';
import * as Y from 'yjs';

const router = Router();

// Create new mindmap
router.post('/', authMiddleware, async (req, res) => {
  const { title, description } = req.body;
  const userId = req.user!.id;

  try {
    // Create database record
    const mindmap = await prisma.mindmap.create({
      data: {
        title,
        description,
        ownerId: userId,
      },
    });

    // Initialize Yjs document
    const ydoc = new Y.Doc();
    const nodesMap = ydoc.getMap('nodes');
    const metadataMap = ydoc.getMap('metadata');

    // Create initial root node
    const rootNode = {
      id: 'root',
      title: 'Mindmap',
      parentId: null,
      position: { x: 0, y: 0 },
      color: '#FF6B6B',
    };

    nodesMap.set('root', rootNode);
    metadataMap.set('title', title);

    // Persist initial state
    const initialUpdate = Y.encodeStateAsUpdate(ydoc);
    await prisma.yjsUpdate.create({
      data: {
        mindmapId: mindmap.id,
        update: Buffer.from(initialUpdate),
        clock: BigInt(0),
        createdBy: userId,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        mindmapId: mindmap.id,
        action: 'CREATE_MINDMAP',
        metadata: { title },
      },
    });

    res.status(201).json(mindmap);
  } catch (error) {
    console.error('Error creating mindmap:', error);
    res.status(500).json({ error: 'Failed to create mindmap' });
  }
});

// List user's mindmaps
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user!.id;

  try {
    const mindmaps = await prisma.mindmap.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            permissions: {
              some: { userId },
            },
          },
        ],
        isArchived: false,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        permissions: {
          where: { userId },
          select: { level: true },
        },
      },
    });

    res.json(mindmaps);
  } catch (error) {
    console.error('Error fetching mindmaps:', error);
    res.status(500).json({ error: 'Failed to fetch mindmaps' });
  }
});

// Export mindmap
router.get('/:id/export', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { format = 'json' } = req.query;
  const userId = req.user!.id;

  try {
    // Check permissions
    const mindmap = await prisma.mindmap.findFirst({
      where: {
        id,
        OR: [
          { ownerId: userId },
          { permissions: { some: { userId } } },
        ],
      },
      include: {
        nodes: true,
        edges: true,
      },
    });

    if (!mindmap) {
      return res.status(404).json({ error: 'Mindmap not found' });
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${mindmap.title}.json"`);
      res.json({
        id: mindmap.id,
        title: mindmap.title,
        version: mindmap.version,
        createdAt: mindmap.createdAt,
        updatedAt: mindmap.updatedAt,
        nodes: mindmap.nodes,
        edges: mindmap.edges,
      });
    } else {
      res.status(400).json({ error: 'Unsupported format' });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        mindmapId: id,
        action: 'EXPORT_MINDMAP',
        metadata: { format },
      },
    });
  } catch (error) {
    console.error('Error exporting mindmap:', error);
    res.status(500).json({ error: 'Failed to export mindmap' });
  }
});

export default router;
```

---

## Authentication Flow

### JWT-Based Authentication

```typescript
// server/src/middleware/auth.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
    };

    // Check if session exists
    const session = await prisma.session.findFirst({
      where: {
        token,
        expiresAt: { gte: new Date() },
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = session.user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

// Generate tokens
export function generateTokens(userId: string, email: string) {
  const token = jwt.sign({ userId, email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  const refreshToken = jwt.sign({ userId, email, type: 'refresh' }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });

  return { token, refreshToken };
}
```

### Login Endpoint

```typescript
// server/src/routes/auth.ts

import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../db';
import { generateTokens } from '../middleware/auth';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const { token, refreshToken } = generateTokens(user.id, user.email);

    // Create session
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        refreshToken,
        expiresAt,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
```

### WebSocket Authentication

```typescript
// server/src/websocket/auth.ts

import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function authenticateSocket(socket: Socket): Promise<boolean> {
  try {
    // Get token from handshake
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      socket.emit('error', { code: 'NO_TOKEN', message: 'No token provided' });
      return false;
    }

    // Verify JWT
    const decoded = jwt.verify(token as string, JWT_SECRET) as {
      userId: string;
      email: string;
    };

    // Check session
    const session = await prisma.session.findFirst({
      where: {
        token: token as string,
        expiresAt: { gte: new Date() },
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true },
        },
      },
    });

    if (!session) {
      socket.emit('error', { code: 'INVALID_TOKEN', message: 'Invalid token' });
      return false;
    }

    // Attach user to socket
    (socket as any).user = session.user;

    return true;
  } catch (error) {
    console.error('WebSocket auth error:', error);
    socket.emit('error', { code: 'AUTH_FAILED', message: 'Authentication failed' });
    return false;
  }
}
```

---

## Real-time Collaboration Architecture

### WebSocket Server Setup

```typescript
// server/src/websocket/server.ts

import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import * as Y from 'yjs';
import { setupWSConnection } from 'y-websocket/bin/utils';
import { authenticateSocket } from './auth';
import { yjsDocumentService } from '../services/yjsDocumentService';
import { checkMindmapPermission } from '../services/permissionService';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
});

// Room management
const rooms = new Map<string, Set<string>>(); // roomId -> Set of socketIds

io.on('connection', async (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Authenticate
  const isAuthenticated = await authenticateSocket(socket);
  if (!isAuthenticated) {
    socket.disconnect();
    return;
  }

  const user = (socket as any).user;

  // Join mindmap room
  socket.on('join', async (data: { roomId: string }) => {
    const { roomId } = data;

    try {
      // Check permissions
      const hasAccess = await checkMindmapPermission(user.id, roomId);
      if (!hasAccess) {
        socket.emit('error', { code: 'FORBIDDEN', message: 'Access denied' });
        return;
      }

      // Join Socket.io room
      socket.join(roomId);

      // Track room membership
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }
      rooms.get(roomId)!.add(socket.id);

      // Get or create Yjs document
      const ydoc = await yjsDocumentService.getDocument(roomId);

      // Send initial state to client
      const stateVector = Y.encodeStateVector(ydoc);
      const stateUpdate = Y.encodeStateAsUpdate(ydoc);

      socket.emit('sync-state', {
        state: stateUpdate,
        stateVector,
        users: getActiveUsers(roomId),
      });

      // Notify others
      socket.to(roomId).emit('user-joined', {
        userId: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
      });

      console.log(`User ${user.name} joined room ${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { code: 'JOIN_FAILED', message: 'Failed to join room' });
    }
  });

  // Handle Yjs updates
  socket.on('yjs-update', async (data: { roomId: string; update: Uint8Array }) => {
    const { roomId, update } = data;

    try {
      // Apply update to server-side Yjs document
      const ydoc = await yjsDocumentService.getDocument(roomId);
      Y.applyUpdate(ydoc, new Uint8Array(update));

      // Broadcast to other clients in the room
      socket.to(roomId).emit('yjs-update', { update });

    } catch (error) {
      console.error('Error handling Yjs update:', error);
    }
  });

  // Handle awareness updates (cursors, selections)
  socket.on('awareness-update', (data: { roomId: string; states: any }) => {
    const { roomId, states } = data;

    // Broadcast awareness to others
    socket.to(roomId).emit('awareness-update', {
      userId: user.id,
      states,
    });
  });

  // Leave room
  socket.on('leave', (data: { roomId: string }) => {
    const { roomId } = data;
    handleLeaveRoom(socket, roomId, user);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    // Leave all rooms
    rooms.forEach((members, roomId) => {
      if (members.has(socket.id)) {
        handleLeaveRoom(socket, roomId, user);
      }
    });
  });
});

function handleLeaveRoom(socket: any, roomId: string, user: any) {
  socket.leave(roomId);

  const roomMembers = rooms.get(roomId);
  if (roomMembers) {
    roomMembers.delete(socket.id);

    // Cleanup empty rooms
    if (roomMembers.size === 0) {
      rooms.delete(roomId);
      yjsDocumentService.cleanupDocument(roomId);
    }
  }

  // Notify others
  socket.to(roomId).emit('user-left', { userId: user.id });
}

function getActiveUsers(roomId: string): any[] {
  // Get all sockets in the room
  const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
  if (!socketsInRoom) return [];

  const users: any[] = [];
  socketsInRoom.forEach((socketId) => {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      const user = (socket as any).user;
      users.push({
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
      });
    }
  });

  return users;
}

const PORT = process.env.WS_PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`WebSocket server listening on port ${PORT}`);
});
```

### Offline Support & Conflict Resolution

Yjs handles offline editing automatically:

1. **Offline Editing**: User continues editing local Yjs doc
2. **Reconnection**: WebSocket provider reconnects automatically
3. **State Sync**: Client sends state vector, server responds with missing updates
4. **Conflict-Free Merge**: Yjs CRDT ensures no conflicts
5. **UI Update**: React re-renders with merged state

```typescript
// Frontend: Handling offline/online states

import { useEffect, useState } from 'react';
import { useCollaborativeStore } from './store/collaborativeStore';

export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { provider } = useCollaborativeStore();

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      // Provider will automatically reconnect
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isConnected: provider?.wsconnected ?? false };
}
```

---

## Implementation Roadmap

### Phase 2.1: Backend Foundation (Week 1-2)

**Goal**: Set up backend infrastructure

- [ ] Initialize Node.js/Express project
- [ ] Set up PostgreSQL database
- [ ] Configure Prisma ORM
- [ ] Create initial database schema
- [ ] Run migrations
- [ ] Set up Redis for sessions
- [ ] Configure Docker Compose for local dev
- [ ] Set up environment variables (.env)

**Deliverable**: Working backend skeleton with database

### Phase 2.2: Authentication System (Week 2-3)

**Goal**: Implement user authentication

- [ ] Create User model and routes
- [ ] Implement registration endpoint
- [ ] Implement login endpoint with bcrypt
- [ ] Set up JWT token generation
- [ ] Create auth middleware
- [ ] Implement refresh token logic
- [ ] Add session management
- [ ] Create activity logging

**Deliverable**: Secure authentication system

### Phase 2.3: Mindmap CRUD API (Week 3-4)

**Goal**: REST API for mindmap management

- [ ] Create Mindmap model and routes
- [ ] Implement mindmap creation
- [ ] Implement mindmap listing with permissions
- [ ] Implement mindmap deletion
- [ ] Add permission system (viewer/editor/admin)
- [ ] Create sharing endpoints
- [ ] Implement export functionality (JSON)

**Deliverable**: Full REST API for mindmaps

### Phase 2.4: Yjs Integration (Week 4-6)

**Goal**: Set up CRDT synchronization

**Backend:**
- [ ] Install Yjs and y-websocket
- [ ] Create YjsDocumentService
- [ ] Implement document loading from DB
- [ ] Set up update persistence
- [ ] Implement denormalized table sync
- [ ] Add cleanup logic for inactive docs

**Frontend:**
- [ ] Install Yjs and y-websocket
- [ ] Create collaborativeStore with Zustand
- [ ] Integrate Yjs with ReactFlow
- [ ] Migrate node/edge operations to Yjs
- [ ] Test CRDT merging locally

**Deliverable**: Working Yjs integration (without WebSocket)

### Phase 2.5: WebSocket Server (Week 6-7)

**Goal**: Real-time communication

- [ ] Set up Socket.io server
- [ ] Implement WebSocket authentication
- [ ] Create room management system
- [ ] Implement join/leave room handlers
- [ ] Set up Yjs update broadcasting
- [ ] Implement awareness protocol (cursors)
- [ ] Add error handling and reconnection
- [ ] Test with multiple clients

**Deliverable**: Working real-time collaboration

### Phase 2.6: Frontend Integration (Week 7-8)

**Goal**: Connect frontend to backend

- [ ] Update App.tsx to use collaborativeStore
- [ ] Add login/register UI
- [ ] Implement mindmap list view
- [ ] Add connection status indicator
- [ ] Show active users in UI
- [ ] Display user cursors/awareness
- [ ] Add offline indicator
- [ ] Test end-to-end collaboration

**Deliverable**: Fully integrated collaborative editor

### Phase 2.7: Performance & Scaling (Week 8-9)

**Goal**: Optimize for production

- [ ] Add database indexes
- [ ] Implement query optimization
- [ ] Set up connection pooling
- [ ] Add rate limiting
- [ ] Implement Redis pub/sub for multi-server
- [ ] Add WebSocket clustering
- [ ] Performance testing with 100+ users
- [ ] Memory leak testing

**Deliverable**: Production-ready performance

### Phase 2.8: Testing & Documentation (Week 9-10)

**Goal**: Ensure quality and maintainability

- [ ] Write unit tests for services
- [ ] Write integration tests for API
- [ ] Write E2E tests for collaboration
- [ ] Create API documentation (Swagger)
- [ ] Write deployment guide
- [ ] Create user documentation
- [ ] Perform security audit

**Deliverable**: Tested and documented system

### Phase 2.9: Deployment (Week 10)

**Goal**: Deploy to production

- [ ] Set up production database (RDS/Supabase)
- [ ] Configure production Redis
- [ ] Set up CI/CD pipeline
- [ ] Deploy backend to cloud (AWS/Heroku/Railway)
- [ ] Configure SSL certificates
- [ ] Set up monitoring (Sentry, DataDog)
- [ ] Configure backups
- [ ] Perform load testing

**Deliverable**: Live production system

---

## Code Examples

### Full Backend Entry Point

```typescript
// server/src/index.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { initWebSocketServer } from './websocket/server';
import authRoutes from './routes/auth';
import mindmapRoutes from './routes/mindmaps';
import userRoutes from './routes/users';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/mindmaps', mindmapRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize WebSocket server
initWebSocketServer(httpServer);

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Complete Frontend Integration

```typescript
// src/react-app/src/App.tsx (Phase 2 version)

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { MindmapListPage } from './pages/MindmapListPage';
import { MindmapEditorPage } from './pages/MindmapEditorPage';
import { useAuthStore } from './store/authStore';

function App() {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<MindmapListPage />} />
        <Route path="/mindmap/:id" element={<MindmapEditorPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

```typescript
// src/react-app/src/pages/MindmapEditorPage.tsx

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import { useCollaborativeStore } from '../store/collaborativeStore';
import { useAuthStore } from '../store/authStore';
import { Toolbar } from '../components/Toolbar';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { ActiveUsers } from '../components/ActiveUsers';

export function MindmapEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuthStore();
  const {
    ydoc,
    initYjs,
    disconnect,
    isConnected,
    activeUsers,
  } = useCollaborativeStore();

  useEffect(() => {
    if (id && token) {
      initYjs(id, token);
    }

    return () => {
      disconnect();
    };
  }, [id, token, initYjs, disconnect]);

  // Convert Yjs state to ReactFlow nodes/edges
  const nodesMap = ydoc.getMap('nodes');
  const edgesMap = ydoc.getMap('edges');

  const nodes = Array.from(nodesMap.values()).map((node: any) => ({
    id: node.id,
    data: { label: node.title, color: node.color },
    position: node.position,
    type: 'mindmapNode',
  }));

  const edges = Array.from(edgesMap.values()).map((edge: any) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    label: edge.label,
  }));

  return (
    <div className="app-container">
      <Toolbar />
      <ConnectionStatus isConnected={isConnected} />
      <ActiveUsers users={Array.from(activeUsers.values())} />

      <div className="mindmap-editor">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={{ mindmapNode: MindmapNode }}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
```

---

## Conclusion

This architecture provides:

1. **Scalability**: Horizontal scaling via Redis pub/sub
2. **Reliability**: Persistent storage with event sourcing
3. **Real-time**: Low-latency WebSocket communication
4. **Offline-First**: Full offline editing with automatic sync
5. **Conflict-Free**: Yjs CRDT eliminates merge conflicts
6. **Security**: JWT authentication, permission system, activity logging
7. **Maintainability**: Clean separation of concerns, typed APIs

The implementation roadmap provides a clear 10-week path from current state to production-ready collaborative mindmap editor.
