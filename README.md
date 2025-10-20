# Event Service

A production-ready Event Management Service built with NestJS, TypeScript, and following AWS best practices.

## Features

- ✅ Complete CRUD operations for events
- ✅ Authentication with Bearer token
- ✅ Public and private endpoints
- ✅ AI-powered event summaries with SSE streaming
- ✅ Smart caching with invalidation
- ✅ Comprehensive validation
- ✅ Status transition management
- ✅ Async notifications (mocked, ready for AWS SES/SNS)
- ✅ Pagination and filtering
- ✅ Request ID tracking
- ✅ Structured logging
- ✅ Health checks
- ✅ **Swagger UI documentation**
- ✅ **Postman collection export**
- ✅ Docker support
- ✅ CI/CD with GitHub Actions
- ✅ Comprehensive test coverage

## Tech Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Runtime**: Node.js 20.x
- **Testing**: Jest + Supertest
- **Validation**: class-validator + class-transformer
- **Documentation**: Swagger/OpenAPI 3.0
- **Containerization**: Docker + Docker Compose

## Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- Docker (optional)

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/AngelsProjects/event-service.git
   cd event-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run the application**
   ```bash
   npm run start:dev
   ```

   The server will start on `http://localhost:3000`

### Docker

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## API Documentation

### Interactive Documentation

The service provides comprehensive API documentation through multiple interfaces:

#### Swagger UI
Access the interactive API documentation at:
```
http://localhost:3000/api/docs
```

The Swagger UI provides:
- Complete API endpoint documentation
- Interactive testing capabilities
- Request/response examples
- Authentication flow testing
- Schema definitions and validation rules

#### Postman Collection
Download the Postman collection for easy API testing:
```
http://localhost:3000/api/docs-json
```

**How to use the Postman collection:**

1. **Download the collection**:
   ```bash
   curl -o event-service-collection.json http://localhost:3000/api/docs-json
   ```

2. **Import into Postman**:
   - Open Postman
   - Click "Import" → "Upload Files"
   - Select the downloaded `event-service-collection.json`
   - The collection will appear in your workspace

3. **Configure authentication**:
   - Select the imported collection
   - Go to "Authorization" tab
   - Set Type to "Bearer Token"
   - Enter `admin-token-123` for admin endpoints

4. **Environment setup** (optional):
   Create a Postman environment with:
   ```json
   {
     "baseUrl": "http://localhost:3000",
     "adminToken": "admin-token-123"
   }
   ```

5. **Testing endpoints**:
   - All endpoints are pre-configured with proper headers
   - Request bodies include example data
   - Admin endpoints automatically include authentication
   - Public endpoints are marked and don't require auth

### Authentication

All admin endpoints require a Bearer token:
```
Authorization: Bearer admin-token-123
```

### Endpoints

#### Admin Endpoints (Require Auth)

**Create Event**
```bash
POST /events
Authorization: Bearer admin-token-123
Content-Type: application/json

{
  "title": "Tech Conference 2025",
  "startAt": "2025-09-01T10:00:00Z",
  "endAt": "2025-09-01T18:00:00Z",
  "location": "São Paulo",
  "status": "DRAFT",
  "internalNotes": "VIP list pending",
  "createdBy": "admin@example.com"
}

Response: 201 Created
{
  "id": "uuid",
  "title": "Tech Conference 2025",
  "startAt": "2025-09-01T10:00:00.000Z",
  "endAt": "2025-09-01T18:00:00.000Z",
  "location": "São Paulo",
  "status": "DRAFT",
  "internalNotes": "VIP list pending",
  "createdBy": "admin@example.com",
  "updatedAt": "2025-01-15T10:00:00.000Z",
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

**Update Event**
```bash
PATCH /events/:id
Authorization: Bearer admin-token-123
Content-Type: application/json

{
  "status": "PUBLISHED",
  "internalNotes": "Updated notes"
}

Response: 200 OK
```

**List Events (Admin)**
```bash
GET /events?page=1&limit=20&dateFrom=2025-01-01&dateTo=2025-12-31&locations=paulo,rio&status=PUBLISHED,DRAFT
Authorization: Bearer admin-token-123

Response: 200 OK
{
  "events": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### Public Endpoints (No Auth)

**List Public Events**
```bash
GET /public/events?page=1&limit=20&locations=paulo&dateFrom=2025-01-01

Response: 200 OK
{
  "events": [
    {
      "id": "uuid",
      "title": "Tech Conference 2025",
      "startAt": "2025-09-01T10:00:00.000Z",
      "endAt": "2025-09-01T18:00:00.000Z",
      "location": "São Paulo",
      "status": "PUBLISHED",
      "isUpcoming": true
    }
  ],
  "pagination": {...}
}
```

**Stream Event Summary**
```bash
GET /public/events/:id/summary

Response: 200 OK
Content-Type: text/event-stream
X-Summary-Cache: HIT|MISS

data: {"text": "Join us for ", "done": false}

data: {"text": "Tech Conference 2025 ", "done": false}

data: {"text": "happening on...", "done": true}
```

**Health Check**
```bash
GET /health

Response: 200 OK
{
  "status": "ok",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "uptime": 12345,
  "environment": "development"
}
```

## cURL Examples

```bash
# Create event
curl -X POST http://localhost:3000/events \
  -H "Authorization: Bearer admin-token-123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Music Festival",
    "startAt": "2025-08-15T14:00:00Z",
    "endAt": "2025-08-15T23:00:00Z",
    "location": "Rio de Janeiro",
    "status": "PUBLISHED"
  }'

# List events
curl -X GET "http://localhost:3000/events?page=1&limit=10" \
  -H "Authorization: Bearer admin-token-123"

# Update event
curl -X PATCH http://localhost:3000/events/{id} \
  -H "Authorization: Bearer admin-token-123" \
  -H "Content-Type: application/json" \
  -d '{"status": "CANCELLED"}'

# Public events
curl -X GET "http://localhost:3000/public/events?locations=rio"

# Stream summary
curl -X GET http://localhost:3000/public/events/{id}/summary \
  -H "Accept: text/event-stream"

# Download Postman collection
curl -o event-service-postman.json http://localhost:3000/api/docs-json
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e

# Generate coverage report
npm run test:cov
```

### Test Coverage

The project includes comprehensive test coverage:
- Unit tests for services and repositories
- E2E tests for all endpoints
- Authentication enforcement tests
- Validation tests
- Status transition tests
- Public field projection tests

## Architecture

### Module Boundaries

```
├── common/           # Shared utilities, guards, filters, interceptors
├── config/           # Configuration management
├── events/           # Event management (core business logic)
├── notification/     # Notification service (ready for AWS SES/SNS)
├── public-events/    # Public-facing event endpoints
├── summary/          # AI summary generation with caching
└── health/           # Health check endpoints
```

### Key Design Decisions

1. **Repository Pattern**: Abstracts data access, making it easy to swap in-memory storage for AWS DynamoDB or RDS
2. **DTOs with Validation**: Strong typing and validation at API boundaries
3. **Guard-based Auth**: Reusable authentication with decorator support for public endpoints
4. **Global Exception Handling**: Consistent error responses across all endpoints
5. **Request ID Tracking**: Every request gets a unique ID for tracing
6. **Structured Logging**: JSON logs ready for CloudWatch integration
7. **OpenAPI Documentation**: Comprehensive API documentation with Swagger integration

### Production Database Schema

When moving to a persistent database (RDS/DynamoDB):

**PostgreSQL Schema**:
```sql
CREATE TABLE events (
    id UUID PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    start_at TIMESTAMP NOT NULL,
    end_at TIMESTAMP NOT NULL,
    location VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    internal_notes TEXT,
    created_by VARCHAR(255),
    updated_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT check_dates CHECK (start_at < end_at),
    CONSTRAINT check_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED'))
);

CREATE INDEX idx_events_start_at ON events(start_at);
CREATE INDEX idx_events_location ON events(location);
CREATE INDEX idx_events_status ON events(status);
```

**DynamoDB Schema**:
```
Table: Events
- Partition Key: id (String)
- GSI1: status-startAt-index
  - Partition Key: status
  - Sort Key: startAt
- GSI2: location-startAt-index
  - Partition Key: location
  - Sort Key: startAt
```

## Rate Limiting Strategy

For production deployment:

1. **API Gateway**: Use AWS API Gateway with built-in throttling
   - Per-client rate limits
   - Burst limits
   - Usage plans for different tiers

2. **Application Level**: Implement using `@nestjs/throttler`
   ```typescript
   ThrottlerModule.forRoot({
     ttl: 60,
     limit: 100,
   })
   ```

3. **Public Endpoints**: More restrictive limits
   - 100 requests per minute per IP
   - Summary streaming: 10 requests per minute

4. **Admin Endpoints**: More generous limits
   - 1000 requests per minute per token

## Caching Approach

### Current Implementation
- In-memory cache for AI summaries
- Hash-based cache keys (title + location + dates)
- Automatic invalidation on event updates

### Production Recommendations

**ElastiCache (Redis)**:
```typescript
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

CacheModule.register({
  store: redisStore,
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  ttl: 3600,
});
```

**Cache Strategy**:
- Summary cache: 1 hour TTL
- Event list cache: 5 minutes TTL
- Invalidate on event updates
- Use cache tags for bulk invalidation

## Deployment Strategy

### AWS Architecture

```
┌─────────────────┐
│   CloudFront    │  (CDN + DDoS protection)
└────────┬────────┘
         │
┌────────▼────────┐
│  API Gateway    │  (Rate limiting, WAF)
└────────┬────────┘
         │
┌────────▼────────┐
│   ALB/NLB       │  (Load balancing)
└────────┬────────┘
         │
┌────────▼────────┐
│   ECS Fargate   │  (Container orchestration)
│   or EKS        │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼───┐
│  RDS  │ │Redis │
│Postgres│ │Cache │
└───────┘ └──────┘
```

### Deployment Steps

1. **Containerization**
   ```bash
   docker build -t event-service:v1.0.0 .
   docker tag event-service:v1.0.0 {account}.dkr.ecr.{region}.amazonaws.com/event-service:v1.0.0
   docker push {account}.dkr.ecr.{region}.amazonaws.com/event-service:v1.0.0
   ```

2. **ECS Task Definition**
   ```json
   {
     "family": "event-service",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "512",
     "memory": "1024",
     "containerDefinitions": [{
       "name": "event-service",
       "image": "{ecr-image}",
       "portMappings": [{
         "containerPort": 3000,
         "protocol": "tcp"
       }],
       "environment": [
         {"name": "NODE_ENV", "value": "production"}
       ],
       "secrets": [
         {"name": "ADMIN_TOKEN", "valueFrom": "arn:aws:secretsmanager:..."}
       ],
       "logConfiguration": {
         "logDriver": "awslogs",
         "options": {
           "awslogs-group": "/ecs/event-service",
           "awslogs-region": "us-east-1",
           "awslogs-stream-prefix": "ecs"
         }
       }
     }]
   }
   ```

3. **Infrastructure as Code** (Terraform/CDK)
   - VPC with public/private subnets
   - Application Load Balancer
   - ECS Fargate service with auto-scaling
   - RDS PostgreSQL with Multi-AZ
   - ElastiCache Redis cluster
   - CloudWatch dashboards and alarms
   - Secrets Manager for sensitive data

### CI/CD Pipeline

```yaml
# Automated deployment pipeline
Build → Test → Security Scan → Push to ECR → Deploy to Dev → Integration Tests → Deploy to Prod
```

## Environment Variables

```env
# Server
NODE_ENV=production
PORT=3000

# Authentication
ADMIN_TOKEN=<secure-token>

# Database (when using RDS)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=events
DB_USER=admin
DB_PASSWORD=<secure-password>

# Redis (when using ElastiCache)
REDIS_HOST=localhost
REDIS_PORT=6379

# AWS (when deployed)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>

# Logging
LOG_LEVEL=info
```

## Monitoring and Observability

### Metrics to Track
- Request rate and latency (p50, p95, p99)
- Error rates by endpoint
- Cache hit/miss ratios
- Database connection pool usage
- Memory and CPU utilization

### CloudWatch Integration
```typescript
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

// Custom metrics
await cloudwatch.send(new PutMetricDataCommand({
  Namespace: 'EventService',
  MetricData: [{
    MetricName: 'EventCreated',
    Value: 1,
    Unit: 'Count',
    Timestamp: new Date(),
  }],
}));
```

### Distributed Tracing
- AWS X-Ray for request tracing
- Custom segments for database queries
- Annotations for important business events

## Security Best Practices

1. **Authentication**: Token-based auth (ready for JWT/Cognito)
2. **Input Validation**: Class-validator with DTOs
3. **SQL Injection**: Use parameterized queries (TypeORM/Prisma)
4. **Rate Limiting**: Protect against DDoS
5. **CORS**: Configured for specific origins in production
6. **Secrets**: AWS Secrets Manager for sensitive data
7. **HTTPS**: Enforce TLS 1.2+ via ALB
8. **Headers**: Security headers via Helmet.js

## AI Usage Notes

### Where AI Helped
- Boilerplate code generation (DTOs, basic CRUD)
- Test case generation and structure
- Documentation templates
- Error handling patterns
- TypeScript type definitions
- Swagger decorators and OpenAPI schemas

### Where Human Judgement Was Applied
- Architecture decisions and module boundaries
- Business logic implementation
- Status transition rules
- Caching strategy and invalidation
- Security considerations
- Performance optimizations
- Test scenario design
- Production deployment strategy

## Performance Considerations

### For 10k+ Events

1. **Database Indexes**: Critical for date range and location queries
2. **Pagination**: Cursor-based pagination for better performance at scale
3. **Caching**: Redis for frequently accessed data
4. **Connection Pooling**: Optimize database connection management
5. **Query Optimization**: Use EXPLAIN ANALYZE for query tuning
6. **CDN**: Cache public API responses at edge locations
7. **Horizontal Scaling**: Auto-scaling ECS tasks based on CPU/memory

### Query Optimization
```typescript
// Efficient pagination with cursor
interface CursorPagination {
  cursor?: string;  // Last event ID
  limit: number;
}

// Use composite indexes
CREATE INDEX idx_events_composite ON events(status, start_at, location);
```

## Troubleshooting

### Common Issues

**Port already in use**
```bash
lsof -ti:3000 | xargs kill -9
```

**Docker build fails**
```bash
docker system prune -a
docker-compose build --no-cache
```

**Tests failing**
```bash
npm run test:e2e -- --detectOpenHandles
```

**Swagger UI not loading**
```bash
# Check if the service is running
curl http://localhost:3000/health

# Verify Swagger endpoint
curl http://localhost:3000/api/docs
```

**Postman collection download issues**
```bash
# Verify JSON endpoint
curl -H "Accept: application/json" http://localhost:3000/api/docs-json
```

## License

MIT