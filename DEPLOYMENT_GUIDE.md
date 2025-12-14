# Phase 2 Deployment & Scaling Guide

## Table of Contents
1. [Production Architecture](#production-architecture)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Database Optimization](#database-optimization)
4. [Horizontal Scaling](#horizontal-scaling)
5. [Load Balancing](#load-balancing)
6. [Monitoring & Observability](#monitoring--observability)
7. [Security Hardening](#security-hardening)
8. [Performance Optimization](#performance-optimization)
9. [Disaster Recovery](#disaster-recovery)

---

## Production Architecture

### Multi-Region Deployment Diagram

```
                           ┌─────────────┐
                           │   Route 53  │
                           │     DNS     │
                           └──────┬──────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              ┌─────▼──────┐            ┌──────▼──────┐
              │  CloudFront │            │ CloudFront  │
              │   (CDN)     │            │    (CDN)    │
              │  US-EAST-1  │            │  EU-WEST-1  │
              └─────┬───────┘            └──────┬──────┘
                    │                           │
         ┌──────────┴──────────┐     ┌─────────┴──────────┐
         │                     │     │                     │
    ┌────▼────┐         ┌─────▼────┐│                     │
    │   ALB   │         │   ALB    ││                     │
    │(US-EAST)│         │(EU-WEST) ││                     │
    └────┬────┘         └─────┬────┘│                     │
         │                    │     │                     │
    ┌────┴───────────┐   ┌───┴─────┴──────┐             │
    │                │   │                 │             │
┌───▼───┐ ┌───▼───┐ │┌──▼───┐ ┌───▼───┐  │             │
│Server1│ │Server2│ ││Server3│ │Server4│  │             │
│+ WS   │ │+ WS   │ ││+ WS   │ │+ WS   │  │             │
└───┬───┘ └───┬───┘ │└───┬───┘ └───┬───┘  │             │
    │         │     │    │         │      │             │
    └────┬────┘     │    └────┬────┘      │             │
         │          │         │           │             │
    ┌────▼──────────▼───┐ ┌──▼───────────▼───┐         │
    │  Redis Cluster    │ │  Redis Cluster   │         │
    │    (Primary)      │ │   (Replica)      │         │
    └────┬──────────────┘ └──┬───────────────┘         │
         │                   │                          │
    ┌────▼───────────────────▼────┐                     │
    │     PostgreSQL Primary      │                     │
    │      (Multi-AZ RDS)         │                     │
    └────┬────────────────────────┘                     │
         │                                               │
    ┌────▼────────────────────┐                         │
    │  PostgreSQL Read Replica│                         │
    │     (Read-heavy ops)    │                         │
    └─────────────────────────┘                         │
```

---

## Infrastructure Setup

### AWS Infrastructure (Terraform)

```hcl
# infrastructure/main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "mindmap-vpc"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "mindmap-public-${count.index + 1}"
  }
}

# Private Subnets
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "mindmap-private-${count.index + 1}"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier        = "mindmap-postgres"
  engine            = "postgres"
  engine_version    = "15.4"
  instance_class    = var.db_instance_class
  allocated_storage = 100
  storage_type      = "gp3"
  iops              = 3000

  db_name  = "mindmap_db"
  username = var.db_username
  password = var.db_password

  multi_az               = true
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name = "mindmap-postgres"
  }
}

# ElastiCache Redis Cluster
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "mindmap-redis"
  replication_group_description = "Redis cluster for sessions and pub/sub"

  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.redis_node_type
  number_cache_clusters = 2
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  automatic_failover_enabled = true
  multi_az_enabled          = true

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = {
    Name = "mindmap-redis"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "mindmap-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = true
  enable_http2              = true

  tags = {
    Name = "mindmap-alb"
  }
}

# Target Group (HTTP API)
resource "aws_lb_target_group" "api" {
  name     = "mindmap-api-tg"
  port     = 3001
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    path                = "/health"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
  }

  tags = {
    Name = "mindmap-api-tg"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "mindmap-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "mindmap-cluster"
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "mindmap-app"
  requires_compatibilities = ["FARGATE"]
  network_mode            = "awsvpc"
  cpu                     = 1024
  memory                  = 2048
  execution_role_arn      = aws_iam_role.ecs_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "mindmap-server"
      image = "${var.ecr_repository_url}:latest"

      portMappings = [
        {
          containerPort = 3001
          protocol      = "tcp"
        },
        {
          containerPort = 4000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = "3001"
        },
        {
          name  = "WS_PORT"
          value = "4000"
        }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.db_url.arn
        },
        {
          name      = "REDIS_URL"
          valueFrom = aws_secretsmanager_secret.redis_url.arn
        },
        {
          name      = "JWT_SECRET"
          valueFrom = aws_secretsmanager_secret.jwt_secret.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

# ECS Service
resource "aws_ecs_service" "app" {
  name            = "mindmap-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.app_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "mindmap-server"
    container_port   = 3001
  }

  depends_on = [aws_lb_listener.api]
}

# Variables
variable "aws_region" {
  default = "us-east-1"
}

variable "db_instance_class" {
  default = "db.t3.medium"
}

variable "redis_node_type" {
  default = "cache.t3.medium"
}

variable "app_count" {
  default = 2
  description = "Number of ECS tasks to run"
}
```

---

## Database Optimization

### PostgreSQL Configuration

```sql
-- Production PostgreSQL Configuration

-- Connection pooling
max_connections = 200
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 64MB
maintenance_work_mem = 1GB

-- Write-ahead log
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_wal_size = 4GB
min_wal_size = 1GB

-- Query planner
random_page_cost = 1.1  # For SSD
effective_io_concurrency = 200

-- Monitoring
log_min_duration_statement = 1000  # Log queries > 1s
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
```

### Essential Indexes

```sql
-- Performance-critical indexes

-- User lookups
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_sessions_token ON sessions(token);
CREATE INDEX CONCURRENTLY idx_sessions_user_id ON sessions(user_id);

-- Mindmap queries
CREATE INDEX CONCURRENTLY idx_mindmaps_owner_id ON mindmaps(owner_id);
CREATE INDEX CONCURRENTLY idx_mindmaps_updated_at ON mindmaps(updated_at DESC);
CREATE INDEX CONCURRENTLY idx_mindmap_permissions_user_id ON mindmap_permissions(user_id);
CREATE INDEX CONCURRENTLY idx_mindmap_permissions_mindmap_user
  ON mindmap_permissions(mindmap_id, user_id);

-- Node/Edge queries
CREATE INDEX CONCURRENTLY idx_nodes_mindmap_id ON nodes(mindmap_id);
CREATE INDEX CONCURRENTLY idx_nodes_parent_id ON nodes(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_edges_mindmap_id ON edges(mindmap_id);
CREATE INDEX CONCURRENTLY idx_edges_from_node_id ON edges(from_node_id);
CREATE INDEX CONCURRENTLY idx_edges_to_node_id ON edges(to_node_id);

-- Yjs updates (event sourcing)
CREATE INDEX CONCURRENTLY idx_yjs_updates_mindmap_clock
  ON yjs_updates(mindmap_id, clock);
CREATE INDEX CONCURRENTLY idx_yjs_updates_created_at
  ON yjs_updates(created_at DESC);

-- Activity log
CREATE INDEX CONCURRENTLY idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX CONCURRENTLY idx_activity_logs_mindmap_id ON activity_logs(mindmap_id);
CREATE INDEX CONCURRENTLY idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX CONCURRENTLY idx_activity_logs_action ON activity_logs(action);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_mindmaps_owner_archived
  ON mindmaps(owner_id, is_archived, updated_at DESC);
```

### Query Optimization Examples

```sql
-- Optimized: Get user's mindmaps with permissions
EXPLAIN ANALYZE
SELECT
  m.id, m.title, m.description, m.updated_at,
  u.name as owner_name,
  COALESCE(p.level,
    CASE WHEN m.owner_id = $1 THEN 'ADMIN'::permission_level
    ELSE NULL END
  ) as permission_level
FROM mindmaps m
LEFT JOIN mindmap_permissions p ON p.mindmap_id = m.id AND p.user_id = $1
LEFT JOIN users u ON u.id = m.owner_id
WHERE (m.owner_id = $1 OR p.user_id = $1)
  AND m.is_archived = false
ORDER BY m.updated_at DESC
LIMIT 50;

-- Optimized: Get mindmap with nodes and edges
EXPLAIN ANALYZE
WITH mindmap_data AS (
  SELECT id, title, description, owner_id
  FROM mindmaps
  WHERE id = $1
),
mindmap_nodes AS (
  SELECT id, title, parent_id, position_x, position_y, color, metadata
  FROM nodes
  WHERE mindmap_id = $1 AND deleted_at IS NULL
),
mindmap_edges AS (
  SELECT id, from_node_id, to_node_id, label, metadata
  FROM edges
  WHERE mindmap_id = $1 AND deleted_at IS NULL
)
SELECT
  json_build_object(
    'mindmap', (SELECT row_to_json(mindmap_data.*) FROM mindmap_data),
    'nodes', (SELECT json_agg(row_to_json(mindmap_nodes.*)) FROM mindmap_nodes),
    'edges', (SELECT json_agg(row_to_json(mindmap_edges.*)) FROM mindmap_edges)
  ) as result;
```

---

## Horizontal Scaling

### Redis Pub/Sub for Multi-Server Coordination

```typescript
// server/src/services/redisService.ts

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL!;

export class RedisService {
  private publisher: Redis;
  private subscriber: Redis;
  private client: Redis;

  constructor() {
    this.publisher = new Redis(REDIS_URL);
    this.subscriber = new Redis(REDIS_URL);
    this.client = new Redis(REDIS_URL);
  }

  /**
   * Publish Yjs update to all servers
   */
  async publishUpdate(roomId: string, update: Uint8Array): Promise<void> {
    const channel = `mindmap:${roomId}`;
    await this.publisher.publish(
      channel,
      JSON.stringify({
        type: 'yjs-update',
        update: Buffer.from(update).toString('base64'),
      })
    );
  }

  /**
   * Subscribe to room updates
   */
  subscribeToRoom(roomId: string, callback: (update: Uint8Array) => void): void {
    const channel = `mindmap:${roomId}`;

    this.subscriber.subscribe(channel, (err) => {
      if (err) {
        console.error('Failed to subscribe:', err);
      }
    });

    this.subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        const data = JSON.parse(message);
        if (data.type === 'yjs-update') {
          const update = Buffer.from(data.update, 'base64');
          callback(new Uint8Array(update));
        }
      }
    });
  }

  /**
   * Unsubscribe from room
   */
  unsubscribeFromRoom(roomId: string): void {
    const channel = `mindmap:${roomId}`;
    this.subscriber.unsubscribe(channel);
  }

  /**
   * Session management
   */
  async setSession(token: string, userId: string, expiresIn: number): Promise<void> {
    await this.client.setex(`session:${token}`, expiresIn, userId);
  }

  async getSession(token: string): Promise<string | null> {
    return await this.client.get(`session:${token}`);
  }

  async deleteSession(token: string): Promise<void> {
    await this.client.del(`session:${token}`);
  }

  /**
   * Rate limiting
   */
  async checkRateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<boolean> {
    const current = await this.client.incr(`ratelimit:${key}`);

    if (current === 1) {
      await this.client.expire(`ratelimit:${key}`, windowSeconds);
    }

    return current <= maxRequests;
  }

  async disconnect(): Promise<void> {
    await Promise.all([
      this.publisher.quit(),
      this.subscriber.quit(),
      this.client.quit(),
    ]);
  }
}

export const redisService = new RedisService();
```

### Updated WebSocket Server with Redis

```typescript
// server/src/websocket/server.ts (with Redis pub/sub)

import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisService } from '../services/redisService';
import * as Y from 'yjs';

export function initWebSocketServer(httpServer: any) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
    // Use Redis adapter for multi-server support
    adapter: createAdapter(
      redisService.getPublisher(),
      redisService.getSubscriber()
    ),
  });

  io.on('connection', async (socket) => {
    const user = (socket as any).user;

    socket.on('join', async (data: { roomId: string }) => {
      const { roomId } = data;

      socket.join(roomId);

      // Subscribe to Redis pub/sub for cross-server updates
      redisService.subscribeToRoom(roomId, (update) => {
        // Broadcast to local clients only (Redis handles cross-server)
        socket.to(roomId).emit('yjs-update', { update });
      });

      // Get Yjs document
      const ydoc = await yjsDocumentService.getDocument(roomId);

      // Send initial state
      socket.emit('sync-state', {
        state: Y.encodeStateAsUpdate(ydoc),
        stateVector: Y.encodeStateVector(ydoc),
      });
    });

    socket.on('yjs-update', async (data: { roomId: string; update: Uint8Array }) => {
      const { roomId, update } = data;

      // Apply to server-side document
      const ydoc = await yjsDocumentService.getDocument(roomId);
      Y.applyUpdate(ydoc, new Uint8Array(update));

      // Publish to Redis for other servers
      await redisService.publishUpdate(roomId, new Uint8Array(update));

      // Broadcast to local clients
      socket.to(roomId).emit('yjs-update', { update });
    });

    socket.on('disconnect', () => {
      // Cleanup handled by Socket.io adapter
    });
  });

  return io;
}
```

---

## Load Balancing

### Nginx Configuration (Alternative to ALB)

```nginx
# /etc/nginx/nginx.conf

upstream api_servers {
    least_conn;  # Load balancing method
    server 10.0.1.10:3001 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:3001 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:3001 max_fails=3 fail_timeout=30s;
}

upstream websocket_servers {
    ip_hash;  # Sticky sessions for WebSocket
    server 10.0.1.10:4000 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:4000 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:4000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.mindmap.com;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.mindmap.com;

    ssl_certificate /etc/ssl/certs/mindmap.crt;
    ssl_certificate_key /etc/ssl/private/mindmap.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # API endpoints
    location /api/ {
        proxy_pass http://api_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket endpoint
    location /socket.io/ {
        proxy_pass http://websocket_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Health check
    location /health {
        access_log off;
        proxy_pass http://api_servers;
    }
}
```

---

## Monitoring & Observability

### Prometheus Metrics

```typescript
// server/src/middleware/metrics.ts

import promClient from 'prom-client';

// Create a Registry
const register = new promClient.Registry();

// Default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const wsConnectionsGauge = new promClient.Gauge({
  name: 'websocket_connections_total',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

export const yjsDocumentsGauge = new promClient.Gauge({
  name: 'yjs_documents_loaded',
  help: 'Number of Yjs documents in memory',
  registers: [register],
});

export const yjsUpdatesCounter = new promClient.Counter({
  name: 'yjs_updates_total',
  help: 'Total number of Yjs updates processed',
  labelNames: ['mindmap_id'],
  registers: [register],
});

export const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

// Metrics endpoint
export function metricsHandler(req: any, res: any) {
  res.set('Content-Type', register.contentType);
  register.metrics().then((data) => res.end(data));
}
```

### CloudWatch Alarms (Terraform)

```hcl
# Alarm: High CPU usage
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "mindmap-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.app.name
  }
}

# Alarm: High memory usage
resource "aws_cloudwatch_metric_alarm" "high_memory" {
  alarm_name          = "mindmap-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.app.name
  }
}

# Alarm: Database connection errors
resource "aws_cloudwatch_metric_alarm" "db_connection_errors" {
  alarm_name          = "mindmap-db-connection-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "60"
  statistic           = "Average"
  threshold           = "180"
  alarm_description   = "Database connection pool nearing capacity"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }
}
```

---

## Security Hardening

### Rate Limiting Middleware

```typescript
// server/src/middleware/rateLimit.ts

import { Request, Response, NextFunction } from 'express';
import { redisService } from '../services/redisService';

interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  login: { windowSeconds: 900, maxRequests: 5 },      // 5 per 15 min
  register: { windowSeconds: 3600, maxRequests: 3 },  // 3 per hour
  api: { windowSeconds: 60, maxRequests: 100 },       // 100 per minute
};

export function rateLimit(type: keyof typeof RATE_LIMITS) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const config = RATE_LIMITS[type];
    const identifier = req.ip || 'unknown';
    const key = `${type}:${identifier}`;

    const allowed = await redisService.checkRateLimit(
      key,
      config.maxRequests,
      config.windowSeconds
    );

    if (!allowed) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: config.windowSeconds,
      });
    }

    next();
  };
}
```

### Input Validation with Zod

```typescript
// server/src/validators/mindmap.ts

import { z } from 'zod';

export const createMindmapSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export const updateNodeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  parentId: z.string().uuid().nullable().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  metadata: z.record(z.any()).optional(),
});

// Usage in route
router.post('/mindmaps', authMiddleware, async (req, res) => {
  try {
    const validatedData = createMindmapSchema.parse(req.body);
    // ... proceed with validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    throw error;
  }
});
```

---

## Performance Optimization

### Connection Pooling

```typescript
// server/src/db/index.ts (with pooling)

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
});

// Configure connection pool
// Add to DATABASE_URL: ?connection_limit=20&pool_timeout=10
```

### Caching Strategy

```typescript
// server/src/middleware/cache.ts

import { Request, Response, NextFunction } from 'express';
import { redisService } from '../services/redisService';

export function cache(ttlSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `cache:${req.originalUrl}`;

    try {
      const cached = await redisService.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      // Override res.json to cache response
      const originalJson = res.json.bind(res);
      res.json = (data: any) => {
        redisService.setex(key, ttlSeconds, JSON.stringify(data));
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache error:', error);
      next();
    }
  };
}

// Usage
router.get('/mindmaps', authMiddleware, cache(60), async (req, res) => {
  // ... handler
});
```

---

## Disaster Recovery

### Automated Backups

```bash
#!/bin/bash
# scripts/backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
BACKUP_FILE="$BACKUP_DIR/mindmap_backup_$DATE.sql.gz"

# Create backup
pg_dump $DATABASE_URL | gzip > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://mindmap-backups/postgres/

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
  echo "Backup successful: $BACKUP_FILE"
else
  echo "Backup failed!" >&2
  exit 1
fi
```

### Restore Procedure

```bash
#!/bin/bash
# scripts/restore-database.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

# Download from S3 if S3 path
if [[ $BACKUP_FILE == s3://* ]]; then
  aws s3 cp $BACKUP_FILE /tmp/restore.sql.gz
  BACKUP_FILE="/tmp/restore.sql.gz"
fi

# Restore
gunzip -c $BACKUP_FILE | psql $DATABASE_URL

echo "Restore complete"
```

---

This deployment guide provides production-ready infrastructure configuration, monitoring, security, and disaster recovery procedures for the Mindmap Editor Phase 2 backend.
