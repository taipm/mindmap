# Mindmap Editor - Phase 2 Documentation

## Overview

This documentation covers the complete architecture and implementation plan for transforming the single-user Mindmap Editor into a **multi-user collaborative platform** with real-time synchronization.

## Documentation Structure

### 1. [ARCHITECTURE_PHASE2.md](./ARCHITECTURE_PHASE2.md)
**Main architectural design document**

Contains:
- Complete technology stack selection
- System architecture diagrams
- Database schema with Prisma models
- WebSocket communication protocol
- Yjs CRDT integration strategy
- REST API endpoints
- Authentication flow
- 10-week implementation roadmap
- Code examples for key components

**Start here** to understand the overall system design.

---

### 2. [IMPLEMENTATION_EXAMPLES.md](./IMPLEMENTATION_EXAMPLES.md)
**Production-ready code examples**

Contains:
- Environment configuration (.env files)
- Complete Prisma schema
- Backend services (Permission, Activity Logger, Export)
- Frontend stores (Auth, Collaborative)
- React components (ConnectionStatus, ActiveUsers)
- Docker configuration
- Unit and integration tests

**Use this** when writing actual code - all examples are copy-paste ready.

---

### 3. [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
**Production deployment and scaling**

Contains:
- Multi-region AWS architecture
- Terraform infrastructure as code
- Database optimization (indexes, queries)
- Horizontal scaling with Redis pub/sub
- Load balancing (Nginx, ALB)
- Monitoring with Prometheus/CloudWatch
- Security hardening
- Performance optimization
- Disaster recovery procedures

**Consult this** when deploying to production or scaling the system.

---

### 4. [TROUBLESHOOTING_FAQ.md](./TROUBLESHOOTING_FAQ.md)
**Common issues and solutions**

Contains:
- Debugging WebSocket connections
- Fixing Yjs synchronization issues
- Database performance problems
- Authentication troubleshooting
- Scaling issues
- Migration from Phase 1
- Production debugging techniques

**Reference this** when encountering problems during development or production.

---

## Quick Start Guide

### Prerequisites

- **Node.js** 20+
- **PostgreSQL** 15+
- **Redis** 7+
- **Docker** (optional but recommended)

### Development Setup

1. **Clone and install dependencies:**
```bash
# Backend
cd server
npm install
npx prisma generate

# Frontend
cd ../src/react-app
npm install
```

2. **Set up environment variables:**
```bash
# server/.env
DATABASE_URL="postgresql://user:password@localhost:5432/mindmap_db"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key"
PORT=3001
WS_PORT=4000

# src/react-app/.env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WS_URL=ws://localhost:4000
```

3. **Start services with Docker Compose:**
```bash
docker-compose up -d
```

4. **Run migrations:**
```bash
cd server
npx prisma migrate dev
```

5. **Start development servers:**
```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd src/react-app
npm start
```

6. **Open browser:**
```
http://localhost:3000
```

---

## Key Architecture Decisions

### 1. Yjs CRDT for Conflict-Free Merging

**Why Yjs?**
- Automatic conflict resolution (no manual merge logic)
- Works offline - syncs automatically on reconnect
- Proven in production (VSCode Live Share uses similar CRDT)
- Small bundle size (~10KB gzipped)

**Alternative considered:** Operational Transformation (OT)
- **Rejected because:** More complex, requires central server, no offline support

---

### 2. Hybrid State Management (Zustand + Yjs)

**Architecture:**
```
┌─────────────┐
│   Zustand   │  ← Local UI state (selections, toolbar)
└──────┬──────┘
       │
┌──────▼──────┐
│  Yjs Y.Doc  │  ← Shared collaborative state (nodes, edges)
└──────┬──────┘
       │
┌──────▼──────┐
│  y-websocket│  ← Sync layer
└─────────────┘
```

**Why hybrid?**
- Not all state needs to be shared (e.g., which node user is hovering)
- Performance: Zustand is faster for local-only state
- Flexibility: Can migrate gradually from Phase 1

**Alternative considered:** Everything in Yjs
- **Rejected because:** Unnecessary overhead for local-only state

---

### 3. Event Sourcing for Yjs Updates

**Why store updates as append-only log?**
- **Audit trail:** Full history of all changes
- **Debugging:** Replay state at any point in time
- **Compliance:** Some industries require full edit history
- **Conflict resolution:** Can rebuild state from scratch

**Trade-off:** More storage (mitigated by compaction)

---

### 4. Denormalized Node/Edge Tables

**Why duplicate data?**
- **Query performance:** Can query nodes without reconstructing Yjs state
- **Reporting:** SQL queries for analytics
- **Search:** Full-text search on node titles

**Architecture:**
```
YjsUpdate table (source of truth)
       ↓
  Yjs Y.Doc (in-memory)
       ↓
Node/Edge tables (denormalized for queries)
```

**Trade-off:** Eventual consistency (acceptable for non-critical queries)

---

### 5. PostgreSQL over NoSQL

**Why PostgreSQL?**
- **ACID transactions:** Critical for permissions, billing
- **Complex queries:** JOIN operations for permissions
- **Mature ecosystem:** Prisma ORM, pgAdmin, extensions
- **Binary support:** Can store Yjs updates as BYTEA

**When to consider NoSQL:**
- If you need > 100TB of data (unlikely for mindmaps)
- If you need global distribution with eventual consistency
- If your data model is truly schemaless

---

## Technology Comparison

### Backend Frameworks

| Framework | Pros | Cons | Verdict |
|-----------|------|------|---------|
| **Express** (chosen) | Simple, flexible, huge ecosystem | Minimal built-in features | ✅ Best for custom WebSocket integration |
| NestJS | TypeScript-first, structured | Opinionated, learning curve | ⚠️ Overkill for this project |
| Fastify | Faster than Express | Smaller ecosystem | ⚠️ Marginal performance gain |

---

### Real-time Communication

| Technology | Pros | Cons | Verdict |
|-----------|------|------|---------|
| **Socket.io** (chosen) | Auto-reconnect, fallbacks, easy API | Slightly larger | ✅ Best developer experience |
| Native WebSocket | Lightweight, standard | Manual reconnection logic | ⚠️ Too low-level |
| Server-Sent Events | Simple, HTTP/2 | One-way only | ❌ Not suitable |

---

### CRDT Libraries

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| **Yjs** (chosen) | Best performance, rich ecosystem | Learning curve | ✅ Industry standard |
| Automerge | Pure JavaScript, elegant API | Slower performance | ⚠️ Not suitable for large docs |
| CRDT.js | Simple | Unmaintained | ❌ Avoid |

---

## Performance Benchmarks

### Expected Performance Metrics

**Latency (P95):**
- Local network: < 50ms
- Same region: < 100ms
- Cross-region: < 300ms

**Throughput:**
- Single server: 10,000 concurrent connections
- With Redis cluster: 100,000+ concurrent connections

**Database:**
- Read queries: < 10ms
- Write queries: < 50ms
- Yjs update persistence: < 100ms (debounced)

**Memory:**
- Per active mindmap: ~2MB
- Per user connection: ~100KB
- Total for 1000 users editing 100 mindmaps: ~2.5GB

---

## Security Considerations

### Implemented Security Measures

1. **Authentication:**
   - JWT with short expiration (1 hour)
   - Refresh tokens for extended sessions
   - Secure password hashing (bcrypt, 10 rounds)

2. **Authorization:**
   - Row-level security via Prisma queries
   - Permission checks before every operation
   - WebSocket authentication on connection

3. **Input Validation:**
   - Zod schema validation
   - SQL injection prevention (Prisma)
   - XSS prevention (React escapes by default)

4. **Rate Limiting:**
   - Per-IP limits on auth endpoints
   - Per-user limits on API endpoints
   - Connection throttling on WebSocket

5. **Transport Security:**
   - HTTPS/WSS in production
   - CORS configuration
   - Helmet.js security headers

---

## Cost Estimation (AWS)

### Small Deployment (< 1000 users)

```
- RDS PostgreSQL (db.t3.medium):     $60/month
- ElastiCache Redis (cache.t3.small): $30/month
- ECS Fargate (2 tasks):             $50/month
- Application Load Balancer:         $20/month
- Data transfer:                     $10/month
- CloudWatch/monitoring:             $10/month
────────────────────────────────────────────────
Total:                               ~$180/month
```

### Medium Deployment (< 10,000 users)

```
- RDS PostgreSQL (db.r6g.xlarge):    $300/month
- ElastiCache Redis (cache.r6g.large): $150/month
- ECS Fargate (4 tasks):             $100/month
- Application Load Balancer:         $30/month
- Data transfer:                     $50/month
- CloudWatch/monitoring:             $30/month
────────────────────────────────────────────────
Total:                               ~$660/month
```

---

## Migration Path from Phase 1

### Strategy: Gradual Migration

**Step 1: Run Phase 1 and Phase 2 in parallel**
- Deploy Phase 2 backend
- Add "Switch to collaborative mode" button in Phase 1 UI
- Migrate mindmaps on user action

**Step 2: Hybrid frontend**
- Keep existing Zustand store
- Add Yjs integration alongside
- Sync Zustand → Yjs on collaborative mode

**Step 3: Complete migration**
- Remove Phase 1 local file operations
- Full Yjs integration
- Deprecate old file format

### Migration Script

See [TROUBLESHOOTING_FAQ.md](./TROUBLESHOOTING_FAQ.md#q-how-do-i-migrate-from-phase-1-to-phase-2) for complete migration script.

---

## Testing Strategy

### Unit Tests (Jest)
- Services: Permission, Activity Logger, Export
- Utils: Yjs encoding/decoding, JWT validation
- Coverage target: > 80%

### Integration Tests (Supertest)
- REST API endpoints
- Authentication flow
- Database operations
- Coverage target: > 70%

### E2E Tests (Playwright)
- User registration/login
- Real-time collaboration
- Offline/online transitions
- Critical user journeys

### Load Tests (k6)
- 1000 concurrent users
- 100 mindmaps simultaneously edited
- WebSocket connection stability

---

## Future Enhancements (Phase 3+)

### Short-term (3-6 months)
- [ ] Mobile app (React Native + Yjs)
- [ ] Rich text in nodes (Quill + Yjs)
- [ ] Comments and annotations
- [ ] Version history UI (time-travel)
- [ ] Templates marketplace

### Medium-term (6-12 months)
- [ ] AI-powered suggestions
- [ ] Advanced permissions (read-only areas)
- [ ] Presentation mode
- [ ] Integrations (Slack, Notion, etc.)
- [ ] Analytics dashboard

### Long-term (12+ months)
- [ ] Multi-workspace support
- [ ] Enterprise SSO (SAML, OAuth)
- [ ] Custom domains
- [ ] White-labeling
- [ ] Offline-first mobile sync

---

## Contributing

### Code Style

- **TypeScript:** Strict mode enabled
- **Formatting:** Prettier with default config
- **Linting:** ESLint with recommended rules
- **Naming:** camelCase for variables, PascalCase for components

### Git Workflow

```bash
# Feature branch
git checkout -b feature/collaborative-cursors

# Commit with conventional commits
git commit -m "feat: add real-time cursor tracking"

# Push and create PR
git push origin feature/collaborative-cursors
```

### PR Checklist

- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type check passes (`npm run type-check`)
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Database migrations created (if schema changed)

---

## Support

### Community

- **GitHub Issues:** Bug reports and feature requests
- **Discussions:** Architecture questions and proposals
- **Discord:** Real-time chat (coming soon)

### Commercial Support

Contact: [your-email@example.com](mailto:your-email@example.com)

---

## License

MIT License - See LICENSE file for details

---

## Acknowledgments

- **Yjs:** Kevin Jahns and contributors
- **ReactFlow:** Webkid team
- **Prisma:** Prisma team
- **Socket.io:** Guillermo Rauch and contributors

---

## Version History

- **v0.1.0 (Phase 1):** Single-user desktop app
- **v0.2.0 (Phase 2):** Multi-user collaborative platform (current)
- **v0.3.0 (Phase 3):** Mobile apps and advanced features (planned)

---

**Last Updated:** December 2024

For questions or clarifications, please open a GitHub issue or contact the maintainers.
