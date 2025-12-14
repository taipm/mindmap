# Phase 2 Quick Reference Cheatsheet

Essential commands, code snippets, and troubleshooting for daily development.

## Development Commands

### Initial Setup
```bash
# Clone and install
git clone <repo>
cd mindmap

# Backend setup
cd server
npm install
npx prisma generate
cp .env.example .env  # Edit with your values

# Frontend setup
cd ../src/react-app
npm install
cp .env.example .env  # Edit with your values

# Start services
cd ../..
docker-compose up -d
```

### Daily Development
```bash
# Start backend (Terminal 1)
cd server
npm run dev

# Start frontend (Terminal 2)
cd src/react-app
npm start

# Watch database changes (Terminal 3)
cd server
npx prisma studio  # Opens GUI at localhost:5555
```

### Database Operations
```bash
# Create migration
cd server
npx prisma migrate dev --name <migration_name>

# Apply migrations
npx prisma migrate deploy

# Reset database (dev only!)
npx prisma migrate reset

# View data
npx prisma studio
```

### Testing
```bash
# Backend unit tests
cd server
npm test

# Backend with coverage
npm test -- --coverage

# Frontend tests
cd src/react-app
npm test

# E2E tests
npx playwright test

# Load testing
k6 run tests/load/collaboration.js
```

---

## Code Snippets

### Backend: Create New API Endpoint

```typescript
// server/src/routes/mindmaps.ts

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Validation schema
const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

// Endpoint
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Validate input
    const data = createSchema.parse(req.body);

    // Get authenticated user
    const userId = req.user!.id;

    // Business logic
    const mindmap = await prisma.mindmap.create({
      data: {
        ...data,
        ownerId: userId,
      },
    });

    // Log activity
    await activityLogger.log({
      userId,
      action: 'CREATE_MINDMAP',
      mindmapId: mindmap.id,
    });

    res.status(201).json(mindmap);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### Frontend: Add New React Component

```typescript
// src/react-app/src/components/MyComponent.tsx

import React from 'react';
import { useCollaborativeStore } from '../store/collaborativeStore';
import './MyComponent.css';

interface Props {
  mindmapId: string;
}

export function MyComponent({ mindmapId }: Props) {
  const { getAllNodes, addNode } = useCollaborativeStore();

  const nodes = getAllNodes();

  const handleAddNode = () => {
    const newId = addNode({
      title: 'New Node',
      parentId: null,
      position: { x: 100, y: 100 },
      color: '#FF6B6B',
    });

    console.log('Created node:', newId);
  };

  return (
    <div className="my-component">
      <h3>Nodes: {nodes.length}</h3>
      <button onClick={handleAddNode}>Add Node</button>
    </div>
  );
}
```

### Yjs: Working with Shared State

```typescript
// Get Yjs document
const { ydoc } = useCollaborativeStore();

// === NODES ===

// Get nodes map
const nodesMap = ydoc.getMap('nodes');

// Add node
const nodeId = 'node-123';
nodesMap.set(nodeId, {
  id: nodeId,
  title: 'My Node',
  position: { x: 0, y: 0 },
  color: '#FF0000',
});

// Update node
const existing = nodesMap.get(nodeId);
nodesMap.set(nodeId, {
  ...existing,
  title: 'Updated Title',
});

// Delete node
nodesMap.delete(nodeId);

// Get all nodes
const allNodes = Array.from(nodesMap.values());

// Observe changes
nodesMap.observe((event) => {
  console.log('Nodes changed:', event);
});

// === EDGES ===

const edgesMap = ydoc.getMap('edges');

// Add edge
edgesMap.set('edge-123', {
  id: 'edge-123',
  from: 'node-1',
  to: 'node-2',
});
```

---

## Database Queries

### Common Prisma Queries

```typescript
// Get user's mindmaps
const mindmaps = await prisma.mindmap.findMany({
  where: {
    OR: [
      { ownerId: userId },
      { permissions: { some: { userId } } },
    ],
    isArchived: false,
  },
  orderBy: { updatedAt: 'desc' },
  include: {
    owner: { select: { id: true, name: true } },
    permissions: { where: { userId } },
  },
});

// Get mindmap with nodes
const mindmap = await prisma.mindmap.findUnique({
  where: { id: mindmapId },
  include: {
    nodes: { where: { deletedAt: null } },
    edges: { where: { deletedAt: null } },
  },
});

// Check permission
const hasAccess = await prisma.mindmap.findFirst({
  where: {
    id: mindmapId,
    OR: [
      { ownerId: userId },
      { permissions: { some: { userId } } },
    ],
  },
});

// Create with transaction
await prisma.$transaction(async (tx) => {
  const mindmap = await tx.mindmap.create({
    data: { title: 'New Map', ownerId: userId },
  });

  await tx.yjsUpdate.create({
    data: {
      mindmapId: mindmap.id,
      update: Buffer.from(initialUpdate),
      clock: BigInt(0),
    },
  });
});
```

### Raw SQL (when needed)

```typescript
// Complex query with raw SQL
const result = await prisma.$queryRaw`
  SELECT m.id, m.title, COUNT(n.id) as node_count
  FROM mindmaps m
  LEFT JOIN nodes n ON n.mindmap_id = m.id
  WHERE m.owner_id = ${userId}
  GROUP BY m.id, m.title
  ORDER BY node_count DESC
  LIMIT 10
`;
```

---

## Environment Variables

### Backend (.env)
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mindmap_db"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="super-secret-change-in-production"
JWT_EXPIRES_IN="1h"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Server
NODE_ENV="development"
PORT=3001
WS_PORT=4000

# CORS
CLIENT_URL="http://localhost:3000"

# Logging
LOG_LEVEL="debug"
```

### Frontend (.env)
```bash
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WS_URL=ws://localhost:4000
```

---

## Debugging Tips

### Enable Verbose Logging

**Backend:**
```typescript
// server/src/index.ts
import { logger } from './utils/logger';

logger.level = 'debug';  // info, debug, error

// Or via environment
LOG_LEVEL=debug npm run dev
```

**Frontend:**
```typescript
// src/react-app/src/index.tsx

// Yjs logging
localStorage.setItem('y-websocket-log', 'true');

// Redux DevTools for Zustand
import { devtools } from 'zustand/middleware';

const useStore = create(devtools((set, get) => ({
  // ... store
})));
```

### Common Debugging Patterns

**WebSocket Issues:**
```typescript
// Frontend debug
const provider = new WebsocketProvider(WS_URL, roomId, ydoc, {
  params: { token },
});

provider.on('status', ({ status }) => {
  console.log('WS Status:', status);
});

provider.on('sync', (isSynced) => {
  console.log('Synced:', isSynced);
});

provider.on('connection-error', (error) => {
  console.error('WS Error:', error);
});
```

**Database Queries:**
```typescript
// Enable query logging
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

// Measure query time
const start = Date.now();
const result = await prisma.mindmap.findMany();
console.log(`Query took ${Date.now() - start}ms`);
```

**Yjs State Inspection:**
```typescript
// View Yjs document state
console.log('Nodes:', Array.from(ydoc.getMap('nodes').entries()));

// Get state as JSON
import * as Y from 'yjs';

const state = Y.encodeStateAsUpdate(ydoc);
console.log('State size:', state.length, 'bytes');

// View pending updates
provider.awareness.getStates().forEach((state, clientId) => {
  console.log(`Client ${clientId}:`, state);
});
```

---

## Performance Optimization

### Frontend Optimization

```typescript
// Memoize expensive computations
import { useMemo } from 'react';

const visibleNodes = useMemo(() => {
  return nodes.filter(node => isInViewport(node.position));
}, [nodes, viewport]);

// Debounce rapid updates
import { debounce } from 'lodash';

const debouncedUpdate = debounce((id, updates) => {
  updateNode(id, updates);
}, 300);

// Virtual scrolling for large lists
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={nodes.length}
  itemSize={50}
>
  {({ index, style }) => (
    <div style={style}>{nodes[index].title}</div>
  )}
</FixedSizeList>
```

### Backend Optimization

```typescript
// Connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `${DATABASE_URL}?connection_limit=10`,
    },
  },
});

// Batch database operations
const updates = [...];
await prisma.$transaction(
  updates.map(u => prisma.yjsUpdate.create({ data: u }))
);

// Cache frequently accessed data
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 600 });

const getCachedMindmap = async (id: string) => {
  const cached = cache.get(id);
  if (cached) return cached;

  const mindmap = await prisma.mindmap.findUnique({ where: { id } });
  cache.set(id, mindmap);
  return mindmap;
};
```

---

## Deployment Checklist

### Pre-deployment

- [ ] All tests passing
- [ ] Database migrations created
- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Secrets stored securely (AWS Secrets Manager)
- [ ] Monitoring configured
- [ ] Backup strategy in place

### Deployment

```bash
# 1. Build
cd server
npm run build

cd ../src/react-app
npm run build

# 2. Run migrations
npx prisma migrate deploy

# 3. Deploy backend
docker build -t mindmap-server .
docker push <registry>/mindmap-server:latest

# 4. Deploy frontend
aws s3 sync build/ s3://mindmap-frontend/
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"

# 5. Verify
curl https://api.mindmap.com/health
# Should return: {"status":"ok"}
```

### Post-deployment

- [ ] Smoke tests pass
- [ ] Monitoring dashboards green
- [ ] Error rate normal
- [ ] Response times acceptable
- [ ] Database connections stable

---

## Common Errors & Solutions

### "Cannot find module '@prisma/client'"
```bash
cd server
npx prisma generate
```

### "WebSocket connection refused"
```bash
# Check if server is running
curl http://localhost:4000/socket.io/

# Check firewall
sudo ufw allow 4000/tcp

# Verify URL in frontend
echo $REACT_APP_WS_URL
```

### "JWT expired"
```typescript
// Implement token refresh
const refreshAccessToken = async () => {
  const response = await fetch('/api/auth/refresh-token', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  const { token } = await response.json();
  setToken(token);
};
```

### "Too many database connections"
```bash
# Increase connection limit
# In DATABASE_URL:
postgresql://...?connection_limit=20

# Or use connection pooler (PgBouncer)
```

---

## Useful Links

- **Yjs Documentation:** https://docs.yjs.dev
- **Prisma Documentation:** https://www.prisma.io/docs
- **Socket.io Documentation:** https://socket.io/docs
- **ReactFlow Documentation:** https://reactflow.dev

---

**Pro Tips:**

1. **Use Prisma Studio** for quick database inspection during development
2. **Enable source maps** in production for better error tracking
3. **Monitor WebSocket connections** with CloudWatch metrics
4. **Use feature flags** for gradual rollouts
5. **Keep Yjs documents under 10MB** for best performance

---

This quick reference should cover 90% of daily development tasks. For detailed explanations, see the main architecture documents.
