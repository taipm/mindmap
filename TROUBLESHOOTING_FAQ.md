# Phase 2 Troubleshooting & FAQ

## Table of Contents
1. [Common Issues](#common-issues)
2. [WebSocket Connection Problems](#websocket-connection-problems)
3. [Yjs Synchronization Issues](#yjs-synchronization-issues)
4. [Database Performance](#database-performance)
5. [Authentication Problems](#authentication-problems)
6. [Scaling Issues](#scaling-issues)
7. [FAQ](#faq)

---

## Common Issues

### Issue: Server won't start

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Cause:** PostgreSQL is not running

**Solution:**
```bash
# Check if PostgreSQL is running
docker-compose ps

# Start services
docker-compose up -d postgres redis

# Check logs
docker-compose logs postgres

# Verify connection
psql $DATABASE_URL -c "SELECT 1"
```

---

### Issue: Prisma Client not generated

**Symptoms:**
```
Error: Cannot find module '@prisma/client'
```

**Solution:**
```bash
cd server
npm install
npx prisma generate
npx prisma migrate deploy
```

---

### Issue: CORS errors in browser

**Symptoms:**
```
Access to XMLHttpRequest has been blocked by CORS policy
```

**Solution:**

Update `server/src/index.ts`:
```typescript
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

Verify `.env`:
```bash
CLIENT_URL=http://localhost:3000
```

---

## WebSocket Connection Problems

### Issue: WebSocket connection refused

**Symptoms:**
```
WebSocket connection failed: Error: Connection refused
```

**Debugging steps:**

1. Check if WebSocket server is running:
```bash
curl -I http://localhost:4000/socket.io/
# Should return 200 OK
```

2. Check firewall rules:
```bash
# Linux
sudo ufw status
sudo ufw allow 4000/tcp

# macOS
# System Preferences > Security & Privacy > Firewall
```

3. Verify WebSocket URL in frontend:
```typescript
// src/react-app/src/store/collaborativeStore.ts
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:4000';
console.log('Connecting to:', WS_URL);
```

4. Check server logs:
```bash
docker-compose logs -f server
# Look for WebSocket initialization messages
```

---

### Issue: WebSocket connects but immediately disconnects

**Symptoms:**
```
Socket.io client connected
Socket.io client disconnected: transport error
```

**Cause:** Usually authentication failure

**Solution:**

1. Verify JWT token is being sent:
```typescript
// Frontend debug
const { token } = useAuthStore();
console.log('Token:', token);

const provider = new WebsocketProvider(WS_URL, roomId, ydoc, {
  params: { token },
});

provider.on('status', ({ status }) => {
  console.log('WebSocket status:', status);
});
```

2. Check server authentication:
```typescript
// server/src/websocket/auth.ts
export async function authenticateSocket(socket: Socket): Promise<boolean> {
  console.log('Auth attempt:', socket.handshake.auth);
  // ... rest of function
}
```

3. Verify JWT secret matches:
```bash
# Both .env files should have same secret
echo $JWT_SECRET
```

---

### Issue: Updates not syncing between clients

**Symptoms:**
- Client A makes changes
- Client B doesn't see updates

**Debugging:**

1. Enable verbose Yjs logging:
```typescript
// Frontend
import * as Y from 'yjs';

const ydoc = new Y.Doc();
ydoc.on('update', (update, origin) => {
  console.log('Yjs update:', { size: update.length, origin });
});
```

2. Check Redis pub/sub:
```bash
redis-cli
> SUBSCRIBE mindmap:*
# Should see messages when updates occur
```

3. Verify room membership:
```typescript
// Server-side logging
socket.on('join', async (data) => {
  console.log(`User ${user.id} joining room ${data.roomId}`);
  const rooms = Array.from(socket.rooms);
  console.log('Socket rooms:', rooms);
});
```

4. Check if updates are being broadcast:
```typescript
// server/src/websocket/server.ts
socket.on('yjs-update', async (data) => {
  console.log(`Broadcasting update in room ${data.roomId}`);
  console.log('Update size:', data.update.length);

  socket.to(roomId).emit('yjs-update', { update });
});
```

---

## Yjs Synchronization Issues

### Issue: Yjs state not persisting to database

**Symptoms:**
- Reload page, changes are lost
- Database has no YjsUpdate records

**Solution:**

1. Check persistence service is running:
```typescript
// server/src/services/yjsDocumentService.ts
private setupPersistence(mindmapId: string, ydoc: Y.Doc): void {
  ydoc.on('update', (update: Uint8Array, origin: any) => {
    console.log(`Update received for ${mindmapId}`, {
      size: update.length,
      origin,
    });
    // ... rest of function
  });
}
```

2. Verify database writes:
```sql
-- Check if updates are being saved
SELECT mindmap_id, COUNT(*), MAX(created_at)
FROM yjs_updates
GROUP BY mindmap_id;
```

3. Check debounce timer:
```typescript
// Adjust debounce if needed (default: 2000ms)
saveTimeout = setTimeout(async () => {
  console.log('Saving queued updates:', updateQueue.length);
  await this.persistUpdates(mindmapId, updateQueue);
  updateQueue = [];
}, 2000);  // Reduce to 500 for testing
```

---

### Issue: Merge conflicts after offline editing

**Symptoms:**
- User edits offline
- Comes back online
- Some changes are lost

**Cause:** This should NOT happen with Yjs CRDT, but might indicate:

1. Yjs document not properly initialized
2. State vector mismatch

**Solution:**

1. Verify Yjs initialization:
```typescript
// Frontend: Ensure Y.Doc persists across reconnections
const ydoc = useRef(new Y.Doc()).current;  // Don't recreate!

useEffect(() => {
  const provider = new WebsocketProvider(WS_URL, roomId, ydoc, {
    params: { token },
  });

  return () => {
    provider.destroy();
    // Don't destroy ydoc!
  };
}, [roomId]);
```

2. Check state synchronization:
```typescript
// Server: Ensure correct state vector is sent
socket.emit('sync-state', {
  state: Y.encodeStateAsUpdate(ydoc),
  stateVector: Y.encodeStateVector(ydoc),  // Critical!
});
```

3. Enable Yjs debugging:
```typescript
import * as Y from 'yjs';

// Track all operations
ydoc.on('beforeAllTransactions', () => {
  console.log('Transaction starting');
});

ydoc.on('afterAllTransactions', (ydoc, transaction) => {
  console.log('Transaction complete:', {
    local: transaction.local,
    origin: transaction.origin,
  });
});
```

---

## Database Performance

### Issue: Slow queries

**Symptoms:**
- API responses take > 1 second
- Database CPU at 100%

**Debugging:**

1. Enable slow query log:
```sql
-- PostgreSQL
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries > 1s
SELECT pg_reload_conf();

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

2. Analyze specific query:
```sql
EXPLAIN ANALYZE
SELECT * FROM mindmaps WHERE owner_id = 'user-id';
```

3. Check missing indexes:
```sql
-- Find tables without indexes
SELECT
  schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND n_distinct > 100
ORDER BY n_distinct DESC;
```

**Solution:**

1. Add missing indexes (see DEPLOYMENT_GUIDE.md)
2. Optimize query:
```typescript
// Bad: N+1 query
const mindmaps = await prisma.mindmap.findMany();
for (const mindmap of mindmaps) {
  const nodes = await prisma.node.findMany({ where: { mindmapId: mindmap.id } });
}

// Good: Single query with include
const mindmaps = await prisma.mindmap.findMany({
  include: {
    nodes: true,
  },
});
```

---

### Issue: Database connection pool exhausted

**Symptoms:**
```
Error: Too many clients already
```

**Solution:**

1. Increase connection limit:
```bash
# In DATABASE_URL
postgresql://user:pass@localhost:5432/db?connection_limit=20
```

2. Implement connection pooling:
```typescript
// Use PgBouncer or Prisma's built-in pooling
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Prisma handles pooling internally
});
```

3. Close connections properly:
```typescript
// Ensure connections are released
try {
  await prisma.mindmap.findMany();
} finally {
  // Prisma automatically releases
}

// On app shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
```

---

## Authentication Problems

### Issue: JWT token expired

**Symptoms:**
```
Error: jwt expired
```

**Solution:**

Implement token refresh:
```typescript
// Frontend: Auto-refresh tokens
useEffect(() => {
  const REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes

  const interval = setInterval(async () => {
    try {
      await refreshAccessToken();
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  }, REFRESH_INTERVAL);

  return () => clearInterval(interval);
}, []);
```

---

### Issue: Unauthorized errors after login

**Symptoms:**
- Login succeeds
- API calls return 401 Unauthorized

**Debugging:**

1. Check token storage:
```typescript
// Frontend
const { token } = useAuthStore();
console.log('Stored token:', token);
```

2. Verify Authorization header:
```typescript
// Frontend: Axios interceptor
axios.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  console.log('Sending token:', token?.substring(0, 20));
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

3. Check server middleware:
```typescript
// Server: Debug auth middleware
export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log('Auth header:', authHeader?.substring(0, 20));

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No valid auth header');
    return res.status(401).json({ error: 'No token provided' });
  }

  // ... rest of middleware
}
```

---

## Scaling Issues

### Issue: WebSocket connections drop under load

**Symptoms:**
- Works fine with < 10 users
- Fails with > 50 users

**Solution:**

1. Increase server limits:
```typescript
// server/src/websocket/server.ts
const io = new Server(httpServer, {
  cors: { /* ... */ },
  maxHttpBufferSize: 1e8,  // 100 MB
  pingTimeout: 60000,      // 60 seconds
  pingInterval: 25000,     // 25 seconds
});
```

2. Scale horizontally with Redis:
```typescript
import { createAdapter } from '@socket.io/redis-adapter';

io.adapter(createAdapter(
  redisService.getPublisher(),
  redisService.getSubscriber()
));
```

3. Monitor connection count:
```typescript
setInterval(() => {
  const count = io.sockets.sockets.size;
  console.log('Active connections:', count);
  wsConnectionsGauge.set(count);
}, 10000);
```

---

### Issue: High memory usage

**Symptoms:**
- Server memory grows over time
- OOM (Out of Memory) errors

**Debugging:**

1. Profile memory:
```bash
node --inspect server/dist/index.js

# Connect Chrome DevTools
# chrome://inspect
```

2. Check Yjs document cache:
```typescript
// server/src/services/yjsDocumentService.ts
setInterval(() => {
  console.log('Cached documents:', this.documents.size);
  yjsDocumentsGauge.set(this.documents.size);
}, 30000);
```

**Solution:**

1. Implement LRU cache for Yjs documents:
```typescript
import LRU from 'lru-cache';

class YjsDocumentService {
  private documents: LRU<string, Y.Doc>;

  constructor() {
    this.documents = new LRU({
      max: 1000,  // Max 1000 documents
      ttl: 1000 * 60 * 30,  // 30 minutes
      dispose: (ydoc, key) => {
        console.log('Evicting document:', key);
        ydoc.destroy();
      },
    });
  }
}
```

2. Cleanup inactive documents:
```typescript
// Cleanup documents with no active connections
setInterval(() => {
  rooms.forEach((members, roomId) => {
    if (members.size === 0) {
      yjsDocumentService.cleanupDocument(roomId);
    }
  });
}, 5 * 60 * 1000);  // Every 5 minutes
```

---

## FAQ

### Q: Can I use MongoDB instead of PostgreSQL?

**A:** Yes, but you'll need to:
1. Adapt Prisma schema for MongoDB
2. Handle binary Yjs updates (store as Base64)
3. Adjust indexing strategy
4. Be aware of transaction limitations

MongoDB example:
```typescript
// Store Yjs update
await db.collection('yjs_updates').insertOne({
  mindmapId,
  update: update.toString('base64'),
  clock: clock.toString(),
  createdAt: new Date(),
});
```

---

### Q: How do I migrate from Phase 1 to Phase 2?

**A:** Migration script:

```typescript
// scripts/migrate-phase1-to-phase2.ts

import { prisma } from '../server/src/db';
import * as Y from 'yjs';
import * as fs from 'fs';
import * as path from 'path';

async function migrateFile(filePath: string, userId: string) {
  // Read Phase 1 JSON file
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Create mindmap
  const mindmap = await prisma.mindmap.create({
    data: {
      title: data.title,
      ownerId: userId,
    },
  });

  // Initialize Yjs document
  const ydoc = new Y.Doc();
  const nodesMap = ydoc.getMap('nodes');
  const edgesMap = ydoc.getMap('edges');

  // Populate Yjs document
  for (const node of data.nodes) {
    nodesMap.set(node.id, node);
  }

  for (const edge of data.edges) {
    edgesMap.set(edge.id, edge);
  }

  // Save initial state
  const initialUpdate = Y.encodeStateAsUpdate(ydoc);
  await prisma.yjsUpdate.create({
    data: {
      mindmapId: mindmap.id,
      update: Buffer.from(initialUpdate),
      clock: BigInt(0),
      createdBy: userId,
    },
  });

  console.log(`Migrated: ${data.title} -> ${mindmap.id}`);
  return mindmap.id;
}

// Usage
const userId = 'your-user-id';
const filesDir = './data/mindmaps';

const files = fs.readdirSync(filesDir);
for (const file of files) {
  if (file.endsWith('.json')) {
    await migrateFile(path.join(filesDir, file), userId);
  }
}
```

---

### Q: How do I handle very large mindmaps (10,000+ nodes)?

**A:**

1. **Implement pagination on frontend:**
```typescript
// Only render visible nodes
const visibleNodes = nodes.filter((node) => {
  return isInViewport(node.position, viewport);
});
```

2. **Use ReactFlow virtualization:**
```typescript
import ReactFlow, { ReactFlowProvider } from 'reactflow';

<ReactFlowProvider>
  <ReactFlow
    nodes={nodes}
    edges={edges}
    onlyRenderVisibleElements={true}  // Key optimization
    minZoom={0.1}
    maxZoom={4}
  />
</ReactFlowProvider>
```

3. **Lazy-load Yjs state:**
```typescript
// Only sync visible portions
const visibleNodeIds = getVisibleNodeIds(viewport);
const nodesMap = ydoc.getMap('nodes');

const visibleNodes = visibleNodeIds.map((id) => nodesMap.get(id));
```

---

### Q: Can I use this architecture for other collaborative apps?

**A:** Absolutely! The architecture is generic:

- **Code editor**: Replace ReactFlow with Monaco Editor + Yjs
- **Whiteboard**: Replace ReactFlow with Excalidraw + Yjs
- **Document editor**: Use Yjs with ProseMirror or Quill
- **Spreadsheet**: Use Yjs with Handsontable

The backend (WebSocket + Yjs + PostgreSQL) remains the same.

---

### Q: How do I debug production issues?

**A:** Use structured logging:

```typescript
// server/src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Usage
logger.info('User joined room', { userId, roomId });
logger.error('Database error', { error, query });
```

Then use CloudWatch Insights or similar to query logs:
```
fields @timestamp, userId, roomId, message
| filter message like /joined room/
| stats count() by roomId
```

---

### Q: What's the expected latency for updates?

**A:** Typical latencies:

- **Local network**: 10-50ms
- **Same region**: 50-100ms
- **Cross-region**: 100-300ms
- **Intercontinental**: 200-500ms

Measure with:
```typescript
// Frontend
const startTime = Date.now();

ydoc.getMap('nodes').set('test', { value: 1 });

provider.on('sync', () => {
  const latency = Date.now() - startTime;
  console.log('Sync latency:', latency, 'ms');
});
```

---

### Q: How do I test collaborative features locally?

**A:** Open multiple browser windows:

1. **Incognito mode:**
```
Window 1: Normal Chrome
Window 2: Incognito Chrome
Window 3: Firefox
```

2. **Different users:**
```bash
# Terminal 1
export REACT_APP_USER_ID=user1
npm start

# Terminal 2
export REACT_APP_USER_ID=user2
PORT=3001 npm start
```

3. **Automated testing with Playwright:**
```typescript
// e2e/collaboration.test.ts
import { test, expect } from '@playwright/test';

test('real-time sync between users', async ({ browser }) => {
  const user1 = await browser.newContext();
  const user2 = await browser.newContext();

  const page1 = await user1.newPage();
  const page2 = await user2.newPage();

  await page1.goto('http://localhost:3000/mindmap/test-id');
  await page2.goto('http://localhost:3000/mindmap/test-id');

  // User 1 adds node
  await page1.click('[data-testid="add-node"]');

  // User 2 should see it
  await expect(page2.locator('[data-testid="node"]')).toHaveCount(1);
});
```

---

This troubleshooting guide covers the most common issues you'll encounter during development and production deployment of Phase 2.
