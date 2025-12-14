# System Flows & Diagrams

This document contains visual representations of key system flows for the Phase 2 Mindmap Editor.

## Table of Contents
1. [User Registration & Login Flow](#user-registration--login-flow)
2. [Collaborative Editing Flow](#collaborative-editing-flow)
3. [Offline-to-Online Sync Flow](#offline-to-online-sync-flow)
4. [Multi-Server Scaling Flow](#multi-server-scaling-flow)
5. [Data Flow: Node Creation](#data-flow-node-creation)
6. [Data Flow: Persistence](#data-flow-persistence)
7. [Permission Check Flow](#permission-check-flow)
8. [Export/Import Flow](#exportimport-flow)

---

## User Registration & Login Flow

```
┌──────────┐
│  Client  │
└─────┬────┘
      │
      │ 1. POST /api/auth/register
      │    { email, password, name }
      ▼
┌─────────────────┐
│   Express API   │
└────┬────────────┘
     │
     │ 2. Hash password (bcrypt)
     │
     ▼
┌──────────────┐
│  PostgreSQL  │
│              │
│  INSERT INTO │ 3. Create user record
│  users       │
└────┬─────────┘
     │
     │ 4. User created
     ▼
┌─────────────────┐
│  JWT Service    │ 5. Generate tokens
│                 │    - Access token (1h)
│  sign({userId}) │    - Refresh token (7d)
└────┬────────────┘
     │
     │ 6. Save session
     ▼
┌──────────────┐
│  PostgreSQL  │
│              │
│  INSERT INTO │
│  sessions    │
└────┬─────────┘
     │
     │ 7. Return tokens
     ▼
┌──────────┐
│  Client  │ 8. Store tokens in localStorage
│          │    (via Zustand persist)
└──────────┘


─────────────────────────────────────────────
Subsequent API Calls:
─────────────────────────────────────────────

┌──────────┐
│  Client  │
└─────┬────┘
      │
      │ 1. GET /api/mindmaps
      │    Authorization: Bearer <token>
      ▼
┌──────────────────┐
│  Auth Middleware │ 2. Verify JWT
└────┬─────────────┘
     │
     │ 3. Valid? → Continue
     │ Invalid? → 401 Unauthorized
     ▼
┌─────────────────┐
│   Route Handler │ 4. Process request
└────┬────────────┘
     │
     │ 5. Query database
     ▼
┌──────────────┐
│  PostgreSQL  │
└────┬─────────┘
     │
     │ 6. Return data
     ▼
┌──────────┐
│  Client  │
└──────────┘
```

---

## Collaborative Editing Flow

```
User A                    Server                      User B
  │                         │                           │
  │ 1. Connect WebSocket    │                           │
  ├────────────────────────>│                           │
  │    (JWT in handshake)   │                           │
  │                         │                           │
  │ 2. Authenticate         │                           │
  │<────────────────────────┤                           │
  │   { sessionId, userId } │                           │
  │                         │                           │
  │ 3. Join room            │                           │
  ├────────────────────────>│                           │
  │   { roomId: 'map123' }  │                           │
  │                         │                           │
  │                         │ 4. Load Yjs doc           │
  │                         │    from PostgreSQL        │
  │                         │                           │
  │ 5. Send initial state   │                           │
  │<────────────────────────┤                           │
  │  { state: Uint8Array }  │                           │
  │                         │                           │
  │                         │   6. User B joins         │
  │                         │<──────────────────────────┤
  │                         │                           │
  │ 7. Notify User A        │                           │
  │<────────────────────────┤                           │
  │  { type: 'user-joined' }│                           │
  │                         │                           │
  │ 8. User A adds node     │                           │
  │    (local Yjs mutation) │                           │
  │                         │                           │
  │ 9. Yjs generates update │                           │
  │                         │                           │
  │ 10. Send update         │                           │
  ├────────────────────────>│                           │
  │ { update: Uint8Array }  │                           │
  │                         │                           │
  │                         │ 11. Apply to server doc   │
  │                         │     Y.applyUpdate(update) │
  │                         │                           │
  │                         │ 12. Broadcast to User B   │
  │                         ├──────────────────────────>│
  │                         │   { update: Uint8Array }  │
  │                         │                           │
  │                         │                           │ 13. User B applies
  │                         │                           │     Y.applyUpdate()
  │                         │                           │
  │                         │                           │ 14. React re-renders
  │                         │                           │     (sees new node)
  │                         │                           │
  │                         │ 15. Persist update        │
  │                         │     (debounced 2s)        │
  │                         │                           │
  │                         ▼                           │
  │                  ┌──────────────┐                   │
  │                  │  PostgreSQL  │                   │
  │                  │              │                   │
  │                  │ yjs_updates  │                   │
  │                  └──────────────┘                   │
```

---

## Offline-to-Online Sync Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User goes offline while editing                             │
└─────────────────────────────────────────────────────────────┘

User                    Yjs Y.Doc               WebSocket Provider
 │                         │                           │
 │ 1. Network disconnects  │                           │
 │                         │                           X (disconnected)
 │                         │
 │ 2. User continues       │
 │    editing offline      │
 ├────────────────────────>│
 │    Add/modify nodes     │ 3. Updates queued locally
 │                         │    (in memory)
 │                         │
 │                         │
 ├────────────────────────>│ 4. More edits...
 │                         │
 │                         │
 │ 5. Network reconnects   │                           │
 │                         │                           O (connected)
 │                         │                           │
 │                         │ 6. Get state vector       │
 │                         ├──────────────────────────>│
 │                         │  Y.encodeStateVector()    │
 │                         │                           │
 │                         │                           │ 7. Server compares
 │                         │                           │    state vectors
 │                         │                           │
 │                         │ 8. Send missing updates   │
 │                         │<──────────────────────────┤
 │                         │  (server → client)        │
 │                         │                           │
 │                         │ 9. Apply server updates   │
 │                         │    Y.applyUpdate()        │
 │                         │                           │
 │                         │ 10. Send local updates    │
 │                         ├──────────────────────────>│
 │                         │  (client → server)        │
 │                         │                           │
 │                         │                           │ 11. Server applies
 │                         │                           │     & broadcasts
 │                         │                           │
 │ 12. React re-renders    │                           │
 │     with merged state   │                           │
 │<────────────────────────┤                           │
 │                         │                           │

┌─────────────────────────────────────────────────────────────┐
│ Result: Conflict-free merge of all offline edits            │
└─────────────────────────────────────────────────────────────┘
```

---

## Multi-Server Scaling Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 2 servers, 2 users on different servers editing same map    │
└─────────────────────────────────────────────────────────────┘

User A          Server 1         Redis Pub/Sub        Server 2          User B
  │                │                   │                   │                │
  │ 1. Connect     │                   │                   │                │
  ├───────────────>│                   │                   │                │
  │                │                   │                   │                │
  │                │                   │                   │ 2. Connect     │
  │                │                   │                   │<───────────────┤
  │                │                   │                   │                │
  │ 3. Join room   │                   │                   │                │
  ├───────────────>│                   │                   │                │
  │                │ 4. Subscribe      │                   │                │
  │                ├──────────────────>│                   │                │
  │                │  to 'mindmap:123' │                   │                │
  │                │                   │                   │                │
  │                │                   │                   │ 5. Join room   │
  │                │                   │                   │<───────────────┤
  │                │                   │                   │                │
  │                │                   │ 6. Subscribe      │                │
  │                │                   │<──────────────────┤                │
  │                │                   │  to 'mindmap:123' │                │
  │                │                   │                   │                │
  │ 7. Edit node   │                   │                   │                │
  ├───────────────>│                   │                   │                │
  │                │                   │                   │                │
  │                │ 8. Apply to       │                   │                │
  │                │    local Yjs doc  │                   │                │
  │                │                   │                   │                │
  │                │ 9. Publish update │                   │                │
  │                ├──────────────────>│                   │                │
  │                │  PUBLISH          │                   │                │
  │                │  mindmap:123      │                   │                │
  │                │                   │                   │                │
  │                │                   │ 10. Broadcast to  │                │
  │                │                   │     all servers   │                │
  │                │                   ├──────────────────>│                │
  │                │                   │                   │                │
  │                │                   │                   │ 11. Apply to   │
  │                │                   │                   │     local doc  │
  │                │                   │                   │                │
  │                │                   │                   │ 12. Broadcast  │
  │                │                   │                   │     to clients │
  │                │                   │                   ├───────────────>│
  │                │                   │                   │                │
  │                │                   │                   │                │ 13. User B
  │                │                   │                   │                │     sees update
  │                │                   │                   │                │

┌─────────────────────────────────────────────────────────────┐
│ Redis ensures all servers receive updates, enabling         │
│ horizontal scaling without coordination complexity          │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Node Creation

```
┌──────────────────────────────────────────────────────────────┐
│ Complete flow from user action to database persistence       │
└──────────────────────────────────────────────────────────────┘

1. User clicks "Add Node" button
   │
   ▼
2. React component calls addNode()
   │
   ▼
   ┌────────────────────────────────────┐
   │  useCollaborativeStore.addNode()   │
   │                                    │
   │  const newId = generateId();       │
   │  const newNode = {                 │
   │    id: newId,                      │
   │    title: 'New Node',              │
   │    position: { x: 100, y: 100 },   │
   │    color: '#FF6B6B'                │
   │  };                                │
   └────────────┬───────────────────────┘
                │
                ▼
   ┌────────────────────────────────────┐
   │  Yjs Mutation                      │
   │                                    │
   │  const nodesMap = ydoc.getMap()    │
   │  nodesMap.set(newId, newNode)      │ ← Atomic operation
   └────────────┬───────────────────────┘
                │
                ├─────────────────────────────┐
                │                             │
                ▼                             ▼
   ┌────────────────────────┐   ┌────────────────────────┐
   │  Yjs Observer          │   │  Yjs Update Event      │
   │                        │   │                        │
   │  ydoc.on('update')     │   │  Generates binary      │
   │  → trigger re-render   │   │  update packet         │
   └────────────────────────┘   └───────────┬────────────┘
                                            │
                                            ▼
                              ┌─────────────────────────────┐
                              │  WebSocket Provider         │
                              │                             │
                              │  provider.emit('update')    │
                              └───────────┬─────────────────┘
                                          │
                                          ▼
                              ┌─────────────────────────────┐
                              │  Server WebSocket Handler   │
                              │                             │
                              │  socket.on('yjs-update')    │
                              └───────────┬─────────────────┘
                                          │
                                          ├──────────────────┐
                                          │                  │
                                          ▼                  ▼
                              ┌────────────────┐  ┌─────────────────┐
                              │ Apply to       │  │ Broadcast to    │
                              │ server Yjs doc │  │ other clients   │
                              └────────┬───────┘  └─────────────────┘
                                       │
                                       ▼
                              ┌─────────────────────────────┐
                              │  Debounce Queue (2s)        │
                              │                             │
                              │  updateQueue.push(update)   │
                              └───────────┬─────────────────┘
                                          │
                                          │ After 2s of inactivity
                                          ▼
                              ┌─────────────────────────────┐
                              │  Persistence Service        │
                              │                             │
                              │  1. Merge queued updates    │
                              │  2. Extract clock           │
                              │  3. Save to PostgreSQL      │
                              └───────────┬─────────────────┘
                                          │
                                          ▼
                              ┌─────────────────────────────┐
                              │  PostgreSQL                 │
                              │                             │
                              │  INSERT INTO yjs_updates    │
                              │  (mindmap_id, update, clock)│
                              └───────────┬─────────────────┘
                                          │
                                          ▼
                              ┌─────────────────────────────┐
                              │  Background Job             │
                              │                             │
                              │  Sync to Node table         │
                              │  (denormalized)             │
                              └─────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Total latency:                                               │
│ - User sees update: ~10-50ms (Yjs local)                     │
│ - Other users see update: ~50-200ms (network + Yjs)          │
│ - Database persistence: ~2-5s (debounced)                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Persistence

```
┌────────────────────────────────────────────────────────────┐
│ How Yjs updates are stored and retrieved from PostgreSQL   │
└────────────────────────────────────────────────────────────┘

WRITE PATH:
───────────

Yjs Update (binary)
      │
      ▼
   Encode
      │
      ▼
┌──────────────────────┐
│  Buffer.from(update) │  ← Uint8Array → Buffer
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  PostgreSQL BYTEA    │
│                      │
│  CREATE TABLE        │
│  yjs_updates (       │
│    update BYTEA,     │ ← Binary column
│    clock BIGINT,     │
│    ...               │
│  )                   │
└──────────────────────┘


READ PATH:
──────────

┌──────────────────────┐
│  PostgreSQL BYTEA    │
│                      │
│  SELECT update       │
│  FROM yjs_updates    │
│  WHERE mindmap_id =  │
│  ORDER BY clock ASC  │
└──────────┬───────────┘
           │
           ▼
   Buffer (binary)
      │
      ▼
   Convert to Uint8Array
      │
      ▼
┌──────────────────────┐
│  Y.applyUpdate()     │
│                      │
│  Reconstructs full   │
│  document state      │
└──────────────────────┘


OPTIMIZATION:
─────────────

┌────────────────────────────────────────────────────────────┐
│  Snapshot Strategy (reduce load time)                      │
└────────────────────────────────────────────────────────────┘

Instead of applying 10,000 updates:
   ↓
Store periodic snapshots:

mindmaps table:
  - yjs_state_vector (BYTEA)  ← Full state every N updates
  - last_sync_at

Load sequence:
1. Load latest snapshot → Y.applyUpdate(snapshot)
2. Load updates since snapshot → Y.applyUpdate(each)

Result: 10x faster load time for large documents
```

---

## Permission Check Flow

```
┌────────────────────────────────────────────────────────────┐
│ Permission verification before allowing operations          │
└────────────────────────────────────────────────────────────┘

User Request
    │
    ▼
┌─────────────────────────────┐
│  Auth Middleware            │
│                             │
│  1. Verify JWT              │
│  2. Load user from session  │
│  3. Attach to req.user      │
└─────────┬───────────────────┘
          │
          ▼
┌─────────────────────────────┐
│  Route Handler              │
│                             │
│  GET /mindmaps/:id          │
└─────────┬───────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  Permission Service                     │
│                                         │
│  checkAccess(userId, mindmapId)         │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  Database Query                         │
│                                         │
│  SELECT m.*                             │
│  FROM mindmaps m                        │
│  LEFT JOIN mindmap_permissions p        │
│    ON p.mindmap_id = m.id              │
│    AND p.user_id = $userId             │
│  WHERE m.id = $mindmapId                │
│    AND (                                │
│      m.owner_id = $userId  OR           │
│      m.is_public = true    OR           │
│      p.user_id IS NOT NULL              │
│    )                                    │
└─────────┬───────────────────────────────┘
          │
          ├─────────────────────┬─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
    ┌──────────┐        ┌──────────┐        ┌──────────┐
    │  Owner   │        │  Public  │        │ Explicit │
    │  Access  │        │  Access  │        │ Sharing  │
    └────┬─────┘        └────┬─────┘        └────┬─────┘
         │                   │                    │
         └───────────────────┴────────────────────┘
                             │
                             ▼
                   ┌──────────────────┐
                   │  Access Granted  │
                   │                  │
                   │  Return ADMIN /  │
                   │  EDITOR / VIEWER │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │  Proceed with    │
                   │  operation       │
                   └──────────────────┘

If query returns NULL:
    ▼
┌─────────────────┐
│  403 Forbidden  │
└─────────────────┘


Permission Levels:
──────────────────

ADMIN:
  - Full control
  - Can share/revoke permissions
  - Can delete mindmap

EDITOR:
  - Can modify nodes/edges
  - Can view
  - Cannot share or delete

VIEWER:
  - Read-only access
  - Can export
  - Cannot modify
```

---

## Export/Import Flow

```
┌────────────────────────────────────────────────────────────┐
│ EXPORT Flow                                                 │
└────────────────────────────────────────────────────────────┘

User clicks "Export as JSON"
    │
    ▼
┌─────────────────────────────┐
│  GET /api/mindmaps/:id/     │
│      export?format=json     │
└─────────┬───────────────────┘
          │
          ▼
┌─────────────────────────────┐
│  Permission Check           │
│  (at least VIEWER)          │
└─────────┬───────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  Export Service                         │
│                                         │
│  1. Query mindmap + nodes + edges       │
│  2. Construct JSON object               │
│  3. Add metadata                        │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────┐
│  Response                   │
│                             │
│  Content-Type:              │
│    application/json         │
│  Content-Disposition:       │
│    attachment;              │
│    filename="map.json"      │
│                             │
│  Body: {                    │
│    id, title, nodes, ...    │
│  }                          │
└─────────┬───────────────────┘
          │
          ▼
┌─────────────────────────────┐
│  Browser downloads file     │
└─────────────────────────────┘


┌────────────────────────────────────────────────────────────┐
│ IMPORT Flow                                                 │
└────────────────────────────────────────────────────────────┘

User selects JSON file
    │
    ▼
┌─────────────────────────────┐
│  File read on client        │
└─────────┬───────────────────┘
          │
          ▼
┌─────────────────────────────┐
│  POST /api/mindmaps/import  │
│                             │
│  Body: {                    │
│    title, nodes, edges, ... │
│  }                          │
└─────────┬───────────────────┘
          │
          ▼
┌─────────────────────────────┐
│  Validate structure         │
│  (Zod schema)               │
└─────────┬───────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  Import Service                         │
│                                         │
│  1. Create new mindmap record           │
│  2. Initialize Yjs document             │
│  3. Populate nodes/edges in Yjs         │
│  4. Encode initial state                │
│  5. Save to yjs_updates table           │
│  6. Sync to denormalized tables         │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────┐
│  Response                   │
│                             │
│  { id: 'new-mindmap-id' }   │
└─────────┬───────────────────┘
          │
          ▼
┌─────────────────────────────┐
│  Redirect to new mindmap    │
│  /mindmap/new-mindmap-id    │
└─────────────────────────────┘
```

---

## Summary

These diagrams illustrate the complete data flows for the Phase 2 collaborative mindmap editor. Key takeaways:

1. **Layered Architecture**: Clear separation between transport (WebSocket), CRDT (Yjs), persistence (PostgreSQL), and UI (React)

2. **Eventual Consistency**: Updates are applied immediately on client (optimistic UI), broadcast in real-time, and persisted asynchronously (debounced)

3. **Conflict-Free**: Yjs CRDT ensures no merge conflicts, even with offline editing

4. **Scalable**: Redis pub/sub enables horizontal scaling without coordination complexity

5. **Secure**: Multi-level permission checks before all operations

6. **Resilient**: Offline support, automatic reconnection, state synchronization

For implementation details, see:
- [ARCHITECTURE_PHASE2.md](./ARCHITECTURE_PHASE2.md) - Complete architecture
- [IMPLEMENTATION_EXAMPLES.md](./IMPLEMENTATION_EXAMPLES.md) - Code examples
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Production deployment
