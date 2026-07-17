# BlogNews — AI-Powered News Platform

A production-ready, event-driven AI News Platform running on **AWS Serverless**.

Built with **Clean Architecture** + **Domain Driven Design**.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  EventBridge / SQS                   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐    ┌──────────────┐              │
│  │   Collect    │───▶│   Process    │              │
│  │  News Lambda │    │  News Lambda │              │
│  │  (Schedule)  │    │  (SQS Event) │              │
│  └──────┬───────┘    └──────┬───────┘              │
│         │                   │                       │
│         ▼                   ▼                       │
│  ┌──────────────┐    ┌──────────────┐              │
│  │  DynamoDB    │    │   S3 + AI    │              │
│  │  (Articles)  │    │  (Rekognition│              │
│  └──────────────┘    │  + Bedrock)  │              │
│                      └──────┬───────┘              │
│                             │                       │
│                             ▼                       │
│  ┌──────────────┐    ┌──────────────┐              │
│  │  Admin API   │    │   Publish    │              │
│  │ (API Gateway)│    │ Article Lambda│              │
│  └──────┬───────┘    └──────────────┘              │
│         │                                           │
│         ▼                                           │
│  ┌──────────────┐                                   │
│  │  Telegram    │                                   │
│  │  Webhook     │                                   │
│  └──────────────┘                                   │
└─────────────────────────────────────────────────────┘
```

## Data Flow

```
1. EventBridge (Schedule) → CollectNewsHandler
   ↓
2. Load ACTIVE Sources from DynamoDB (SourceService.findActive())
   ↓
3. For each RSS source: fetchFeed(source.url) → rss-parser
   ↓
4. Normalize RSS items → CreateArticleInput
   ↓
5. ArticleService.create() → RAW Article in DynamoDB
   ↓
6. Send { articleId } to SQS for processing
   ↓
7. SQS → ProcessNewsHandler (future sprint)
   ↓
8. AI rewrite + Summary + SEO + Duplicate check + Image moderation
   ↓
9. Update article status to PENDING
   ↓
10. Admin approves via API or Telegram
   ↓
11. EventBridge (ArticleApproved) → PublishArticleHandler
   ↓
12. Article published to website
```

---

## Folder Structure

```
backend/
├── src/
│   ├── domain/                    # Domain Layer (Pure Business Logic)
│   │   ├── article/               # Article entity, status enum, interfaces
│   │   │   ├── article-status.enum.ts
│   │   │   ├── article.model.ts
│   │   │   └── index.ts
│   │   ├── category/              # Category entity
│   │   ├── source/                # Source entity (RSS/API sources)
│   │   ├── tag/                   # Tag entity
│   │   └── user/                  # User entity (admin/editor)
│   │
│   ├── application/               # Application Layer (Use Cases)
│   │   ├── services/              # Application services
│   │   │   ├── article.service.ts
│   │   │   └── source.service.ts
│   │   └── usecases/              # Use cases (future)
│   │
│   ├── infrastructure/            # Infrastructure Layer (AWS only)
│   │   ├── aws/                   # AWS SDK clients
│   │   │   ├── dynamodb/
│   │   │   ├── s3/
│   │   │   ├── sqs/
│   │   │   ├── rekognition/
│   │   │   └── bedrock/
│   │   └── repositories/          # Repository interfaces (contracts)
│   │       ├── article.repository.ts
│   │       ├── source.repository.ts
│   │       ├── category.repository.ts
│   │       ├── tag.repository.ts
│   │       └── user.repository.ts
│   │
│   ├── handlers/                  # AWS Lambda Handlers
│   │   ├── collect/               # CollectNewsHandler
│   │   ├── processing/            # ProcessNewsHandler
│   │   ├── publish/               # PublishArticleHandler
│   │   ├── admin/                 # Admin API handlers
│   │   │   ├── health-check.handler.ts
│   │   │   ├── get-articles.handler.ts
│   │   │   ├── get-article.handler.ts
│   │   │   ├── create-article.handler.ts
│   │   │   ├── update-article.handler.ts
│   │   │   ├── delete-article.handler.ts
│   │   │   ├── get-sources.handler.ts
│   │   │   └── update-source.handler.ts
│   │   └── telegram/              # TelegramWebhookHandler
│   │
│   └── shared/                    # Shared Kernel
│       ├── config/                # Environment configuration
│       ├── constants/             # Application constants
│       ├── logger/                # Centralized logger interface
│       ├── middleware/            # Error handler middleware
│       ├── responses/             # API response helpers
│       ├── validation/            # Zod validation helpers
│       ├── errors/                # Error classes
│       └── utils/                 # Utility functions
│
├── events/                        # Sample event payloads for local testing
├── scripts/                        # Local execution scripts
├── template.yaml                   # AWS SAM template
├── samconfig.toml                  # SAM configuration
├── env.json                        # Local environment variables
├── package.json
├── tsconfig.json
└── README.md
```

---

## Architectural Decisions

### Why Clean Architecture + DDD?

| Layer | Responsibility | AWS Dependency |
|-------|---------------|----------------|
| **Domain** | Business entities, enums, interfaces | ❌ Zero |
| **Application** | Use cases, orchestration | ❌ Zero |
| **Infrastructure** | AWS SDK, repositories, external services | ✅ Only here |
| **Handlers** | Lambda entry points, input validation | ✅ Only here |
| **Shared** | Cross-cutting concerns | ❌ Zero |

**Business logic NEVER imports AWS SDK. Business logic NEVER depends on AWS.**

If you want to switch from DynamoDB to PostgreSQL, you only change the repository implementation. The domain and application layers remain untouched.

### Why Lambda Native (No Express)?

- **AWS Lambda is NOT a server.** Express, NestJS, Fastify, Koa are designed for long-running servers.
- **Lambda handlers receive events, not HTTP requests.** Wrapping Express inside Lambda adds latency, complexity, and cold start overhead.
- **Every Lambda handler is a pure function.** It receives an event, processes it, and returns a response.
- **Local execution runs the EXACT same handler.** No `serverless-http`, no `aws-serverless-express`, no wrappers.

### Why AWS SAM?

- **Write Once, Run Anywhere.** The same code runs locally and on AWS Lambda.
- **`sam local invoke`** executes the exact handler with the exact event.
- **`sam build`** packages everything for deployment.
- **`sam deploy`** deploys to AWS with CloudFormation.

### Why Interfaces for Repositories?

- **Dependency Inversion.** High-level modules (domain) do not depend on low-level modules (DynamoDB).
- **Testability.** Mock the interface, test the business logic.
- **Flexibility.** Swap implementations without changing business logic.

---

## Development Flow

### Prerequisites

- Node.js 22+
- AWS SAM CLI
- Docker (for local DynamoDB, S3, SQS via LocalStack)
- TypeScript

### Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Or watch mode
npm run watch
```

### Run Locally (Direct)

```bash
# Run HealthCheck handler locally
npm run local:health

# Run CollectNews handler locally
npm run local:collect-news

# Run ProcessNews handler locally
npm run local:process-news

# Run PublishArticle handler locally
npm run local:publish-article
```

### Run Locally (SAM)

```bash
# Build SAM artifacts
npm run sam:build

# Invoke a specific Lambda
npm run sam:invoke -- CollectNewsFunction --event events/event-collect-news.json

# Start API Gateway locally
npm run sam:start-api

# Test health endpoint
curl http://localhost:3000/health
```

### Deploy

```bash
# Build for deployment
npm run sam:build

# Deploy to AWS
npm run sam:deploy
```

---

## Collector Module

The Collector module is responsible for fetching news from active RSS sources and creating RAW articles in DynamoDB.

### Collector Flow

```
EventBridge (rate: 15 minutes)
       ↓
CollectNewsHandler
       ↓
CollectorService.collect()
       ↓
SourceService.findActive()  →  DynamoDB (EntityTypeIndex: SOURCE)
       ↓
For each ACTIVE source:
  ↓
fetchFeed(source.url)  →  rss-parser
  ↓
For each RSS item:
  ↓
normalize(item, source)  →  CreateArticleInput
  ↓
ArticleService.create()  →  RAW Article in DynamoDB
  ↓
SendMessageCommand  →  SQS ({ articleId })
  ↓
CollectorResult { collectedSources, articlesCreated, failedSources }
```

### RSS Parsing

Uses [rss-parser](https://www.npmjs.com/package/rss-parser) — a lightweight, maintained RSS/Atom feed parser.

**RSS Client** (`src/infrastructure/rss/rss-client.ts`):

| Method | Returns | Description |
|--------|---------|-------------|
| `fetchFeed(url)` | `RssFeedResult` | Parses RSS/Atom feed, returns normalized items |

**RssItem**:

| Field | Source | Description |
|-------|--------|-------------|
| `title` | `item.title` | Article title |
| `summary` | `item.contentSnippet` | Plain text summary |
| `content` | `item['content:encoded']` | Full HTML content |
| `url` | `item.link` | Original article URL |
| `publishedAt` | `item.isoDate` | ISO date string |
| `author` | `item.creator` | Author name |
| `image` | `media:content` / `media:thumbnail` / `enclosure` | Featured image URL |

### Normalization

```typescript
// RSS item → CreateArticleInput
{
  sourceId: source.id,         // From Source
  original: {
    title: item.title,
    summary: item.summary,
    content: item.content,
    url: item.url,
    publishedAt: item.publishedAt,
    image: item.image,
    author: item.author || source.name,
  },
  language: source.language,   // From Source
  tags: [],
  author: item.author || source.name,
  coverImage: item.image,
}
```

### Article Creation

Articles are created in `RAW` status. The `ai` content object is left as `null` defaults — the AI Processor (future sprint) will populate it.

### SQS Integration

After each article is created, the collector sends a lightweight message to SQS:

```json
{ "articleId": "art_abc123" }
```

The SQS queue URL is configured via `SQS_QUEUE_URL` environment variable. If not set, SQS messages are skipped (useful for local testing).

### Error Handling

- If one source fails, the collector continues with the remaining sources
- If one RSS item fails, the collector continues with the remaining items
- All errors are logged with full context
- The final `CollectorResult` includes error details

### How to Run Locally

```bash
npm run local:collect-news
```

This requires:
1. AWS CLI configured with credentials (`aws configure`)
2. Active Sources in the `BlogNews` DynamoDB table
3. Network access to RSS feed URLs

### How to Deploy

The `CollectNewsFunction` is already defined in `template.yaml`:
- Trigger: EventBridge Schedule (rate: 15 minutes)
- IAM: DynamoDB CRUD + SQS SendMessage + SSM Parameter Read

```bash
npm run sam:build
npm run sam:deploy
```

---

## Article Domain — Aggregate Root

The `Article` entity is the **core Aggregate Root** of the entire platform. Every module interacts with Article:

- **Collector** → creates Article in `RAW` status
- **AI Processor** → enriches `ai` content, transitions to `PENDING_REVIEW`
- **Telegram/Admin** → approves/rejects, transitions to `APPROVED` / `REJECTED`
- **Publisher** → transitions `APPROVED` → `PUBLISHED`

### Article Model

```typescript
interface Article {
  id: string;           // art_{uuid}
  slug: string;         // url-friendly title
  sourceId: string;     // Source.id
  categoryId: string | null;
  tags: string[];
  language: string;     // default "en"
  author: string;
  coverImage: string;
  original: OriginalContent;  // ← NEVER overwritten
  ai: AiContent;              // ← AI-generated content stored separately
  status: ArticleStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Original Content (Preserved Forever)

```typescript
interface OriginalContent {
  title: string;
  summary: string;
  content: string;      // Full original article text
  url: string;          // Source URL
  publishedAt: string | null;
  image: string;
  author: string;
}
```

### AI Content (Stored Separately)

```typescript
interface AiContent {
  title: string | null;       // AI-rewritten title
  summary: string | null;     // AI-generated summary
  content: string | null;     // AI-rewritten content
  seoTitle: string | null;
  seoDescription: string | null;
  keywords: string[];
  model: string | null;       // Bedrock model used
  promptVersion: string | null;
  processedAt: string | null;
  processingTime: number | null;
  tokenUsage: { input: number; output: number; total: number } | null;
}
```

**Never overwrite `original`.** AI content goes into `ai`. The original article is preserved forever.

### Article Lifecycle

```
Collector → RAW → Normalizer → NORMALIZED → AI → AI_PROCESSING → PENDING_REVIEW
                                                                       ↓
                                                         APPROVED ← Telegram/Admin
                                                             ↓
                                                         PUBLISHED ← Publisher
```

| Status | Description |
|--------|-------------|
| `RAW` | Freshly collected, not yet processed |
| `NORMALIZED` | HTML stripped, text normalized |
| `AI_PROCESSING` | AI is rewriting, summarizing, moderating |
| `PENDING_REVIEW` | Ready for human approval |
| `APPROVED` | Human approved, queued for publishing |
| `PUBLISHED` | Live on the website |
| `REJECTED` | Rejected by human |
| `ARCHIVED` | Moved to archive |

### DynamoDB Single Table Design

Same `BlogNews` table as Sources. Article items use:

```
PK = ARTICLE#{id}
SK = METADATA
EntityType = ARTICLE

Attributes:
  id, slug, sourceId, categoryId, tags, language, author, coverImage,
  original (nested object),
  ai (nested object),
  status, publishedAt, createdAt, updatedAt
```

**GSI: StatusIndex** — Efficient query by `status` + `createdAt`
**GSI: SourceIndex** — Efficient query by `sourceId` + `createdAt`
**GSI: EntityTypeIndex** — Query all ARTICLE items

### API Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `GET` | `/admin/articles` | `GetArticlesHandler` | List articles (filterable by status, sourceId, categoryId) |
| `GET` | `/admin/articles/{id}` | `GetArticleHandler` | Get single article by ID |
| `POST` | `/admin/articles` | `CreateArticleHandler` | Create a new article |
| `PUT` | `/admin/articles/{id}` | `UpdateArticleHandler` | Update article (status, tags, ai content, etc.) |
| `DELETE` | `/admin/articles/{id}` | `DeleteArticleHandler` | Delete an article |

### Validation (Zod)

- `createArticleSchema` — validates `CreateArticleInput`
- `updateArticleSchema` — validates `UpdateArticleInput` (partial updates)
- `originalContentSchema` — validates `OriginalContent` (title, summary, content, url required)
- `aiContentSchema` — validates `AiContent` (all fields optional, defaults to null)

### How to Run Locally

```bash
# Create a new article (AWS Blog example)
npm run article:create

# List all articles
npm run article:list

# Get article by ID
npm run article:get

# Update article (approve, add tags, etc.)
npm run article:update
```

Each script invokes the **exact same Lambda handler** that runs on AWS Lambda.

### Future Integration Points

**Collector Integration:**
```typescript
// Future Collector creates articles in RAW status
const article = await articleService.create({
  sourceId: source.id,
  original: {
    title: rssItem.title,
    summary: rssItem.description,
    content: rssItem.content,
    url: rssItem.link,
    publishedAt: rssItem.pubDate,
    image: rssItem.image ?? '',
    author: rssItem.author ?? '',
  },
  language: source.language,
  tags: [],
});
```

**AI Processor Integration:**
```typescript
// Future AI Processor updates ai content without touching original
await articleService.update(article.id, {
  ai: {
    title: aiResult.title,
    summary: aiResult.summary,
    content: aiResult.content,
    seoTitle: aiResult.seoTitle,
    seoDescription: aiResult.seoDescription,
    keywords: aiResult.keywords,
    model: 'anthropic.claude-3-sonnet-20240229-v1:0',
    promptVersion: '1.0',
    processedAt: new Date().toISOString(),
    processingTime: 1234,
    tokenUsage: { input: 500, output: 300, total: 800 },
  },
  status: ArticleStatus.PENDING_REVIEW,
});
```

**Telegram Approval Integration:**
```typescript
// Future Telegram bot approves/rejects
await articleService.approve(articleId);
// or
await articleService.reject(articleId);
```

**Website Integration:**
```typescript
// Future website displays published articles
const publishedArticles = await articleService.findByStatus(ArticleStatus.PUBLISHED);
```

---

## Lambda Handlers

| Handler | Trigger | Purpose |
|---------|---------|---------|
| `CollectNewsHandler` | EventBridge (Schedule) | Fetches news from RSS/API sources every 15 minutes |
| `ProcessNewsHandler` | SQS | AI rewrites, summarizes, generates SEO, detects duplicates, moderates images |
| `PublishArticleHandler` | EventBridge (ArticleApproved) | Publishes approved articles to the website |
| `TelegramWebhookHandler` | API Gateway | Handles Telegram bot commands for approval workflow |
| `HealthCheckHandler` | API Gateway | Returns health status of the platform |
| `GetArticlesHandler` | API Gateway | Returns paginated articles with filters |
| `GetArticleHandler` | API Gateway | Returns a single article by ID |
| `CreateArticleHandler` | API Gateway | Creates a new article |
| `UpdateArticleHandler` | API Gateway | Updates an article (approve, edit, ai content, etc.) |
| `DeleteArticleHandler` | API Gateway | Deletes an article |
| `GetSourcesHandler` | API Gateway | Returns all news sources |
| `GetSourceHandler` | API Gateway | Returns a single source by ID |
| `CreateSourceHandler` | API Gateway | Creates a new news source |
| `UpdateSourceHandler` | API Gateway | Updates a news source configuration |
| `DeleteSourceHandler` | API Gateway | Deletes a news source |
| `ToggleSourceHandler` | API Gateway | Toggles source status (ACTIVE/INACTIVE) |

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_REGION` | AWS Region | `us-east-1` |
| `DYNAMODB_TABLE` | DynamoDB table name | `blognews-articles` |
| `S3_BUCKET` | S3 bucket for media | `blognews-media` |
| `SQS_QUEUE_URL` | Processing queue URL | — |
| `BEDROCK_MODEL` | Bedrock model ID | `anthropic.claude-3-sonnet-20240229-v1:0` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | — |
| `APP_ENV` | Environment | `development` |
| `LOG_LEVEL` | Logging level | `INFO` |

---

## AWS Resources

| Resource | Type | Purpose |
|----------|------|---------|
| `ArticlesTable` | DynamoDB | Article storage with GSI (status, source) |
| `MediaBucket` | S3 | Image and media storage |
| `ProcessingQueue` | SQS | Queue for article processing |
| `ProcessingDeadLetterQueue` | SQS | Failed messages (3 retries) |
| `EventBus` | EventBridge | Event-driven architecture |
| `AdminApi` | API Gateway | Admin REST API |

---

## Error Handling

```typescript
// Centralized error classes
ApplicationError     // Base class (statusCode, code, isOperational)
ValidationError      // 400 - Input validation errors
NotFoundError        // 404 - Resource not found
InfrastructureError  // 502 - AWS service errors
```

Every handler uses `handleError()` from `src/shared/middleware/error-handler.ts` to:
1. Log the error with context
2. Return a structured API response
3. Never leak stack traces to production

---

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

---

## Code Style

- **TypeScript Strict Mode** — all strict checks enabled
- **ES Modules** — `import`/`export` syntax
- **No `any`** — prefer `unknown` and type guards
- **Interfaces over types** — for public contracts
- **Dependency Injection** — constructors receive dependencies
- **Single Responsibility** — one class, one reason to change
- **Small files** — max ~30 lines for handlers
- **No `console.log` in business layer** — use the Logger interface

---

## Source Management Module

The Source Management module is the data source configuration center for the entire platform. Future Collector Lambdas will read Sources from DynamoDB to determine which RSS/API feeds to fetch.

### Source Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Source Management                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                    Domain Layer                     │  │
│  │  ┌──────────────┐  ┌────────────────┐              │  │
│  │  │  source.model │  │  source.schema  │              │  │
│  │  │  (interface)  │  │  (Zod Schemas)  │              │  │
│  │  └──────────────┘  └────────────────┘              │  │
│  │  ┌──────────────┐  ┌──────────────────────┐        │  │
│  │  │  SourceType   │  │    SourceStatus      │        │  │
│  │  │  (RSS, API)   │  │  (ACTIVE, INACTIVE)  │        │  │
│  │  └──────────────┘  └──────────────────────┘        │  │
│  └────────────────────────────────────────────────────┘  │
│                        │                                  │
│                        ▼                                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │                 Application Layer                   │  │
│  │  ┌───────────────────────────────────────────────┐  │  │
│  │  │            SourceService                       │  │  │
│  │  │  create() | update() | delete() | findById()  │  │  │
│  │  │  findAll() | findActive() | toggleStatus()    │  │  │
│  │  │  validate()                                    │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
│                        │                                  │
│                        ▼                                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │               Infrastructure Layer                  │  │
│  │  ┌───────────────────────────────────────────────┐  │  │
│  │  │      DynamoDBSourceRepository (Impl)          │  │  │
│  │  │  Single Table Design | BlogNews Table         │  │  │
│  │  │  PK: SOURCE#{id} | SK: METADATA              │  │  │
│  │  │  EntityType: SOURCE | GSI: EntityTypeIndex   │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
│                        │                                  │
│                        ▼                                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Lambda Handlers (API Gateway)          │  │
│  │  GET    /admin/sources           → list            │  │
│  │  GET    /admin/sources/{id}       → get             │  │
│  │  POST   /admin/sources           → create          │  │
│  │  PUT    /admin/sources/{id}       → update          │  │
│  │  DELETE /admin/sources/{id}       → delete          │  │
│  │  PATCH  /admin/sources/{id}/toggle → toggle status  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Source Model

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `string` | auto | `src_{uuid}` | Unique identifier |
| `name` | `string` | ✅ | — | Provider name (e.g., "AWS Blog") |
| `type` | `SourceType` | ✅ | — | `RSS` or `API` |
| `url` | `string` | ✅ | — | RSS feed URL or API endpoint |
| `status` | `SourceStatus` | auto | `ACTIVE` | `ACTIVE` or `INACTIVE` |
| `priority` | `number` | ❌ | `10` | Priority (>= 1, lower = higher) |
| `fetchInterval` | `number` | ❌ | `60` | Fetch interval in minutes |
| `language` | `string` | ❌ | `"en"` | Content language code |
| `description` | `string` | ❌ | `""` | Human-readable description |
| `createdAt` | `string` | auto | ISO 8601 | Creation timestamp |
| `updatedAt` | `string` | auto | ISO 8601 | Last update timestamp |

### Enums

```typescript
enum SourceType {
  RSS = 'RSS',
  API = 'API',
  // Future: SCRAPER, YOUTUBE, GITHUB
}

enum SourceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
```

### Validation (Zod)

- `name` — required, non-empty string
- `url` — required, valid URL format
- `type` — required, must be `RSS` or `API`
- `priority` — must be >= 1
- `fetchInterval` — must be > 0
- `language` — defaults to `"en"`

### DynamoDB Single Table Design

The existing `BlogNews` table is used (no new tables). Sources are stored alongside Articles using the same table.

```
PK = SOURCE#src_aws_blog
SK = METADATA
EntityType = SOURCE

Attributes:
  id, name, type, url, status, priority,
  fetchInterval, language, description,
  createdAt, updatedAt
```

**GSI: EntityTypeIndex** — Queries all items of a given entity type (e.g., all SOURCE items).

### API Endpoints

| Method | Path | Handler | Status |
|--------|------|---------|--------|
| `GET` | `/admin/sources` | `GetSourcesHandler` | 200 |
| `GET` | `/admin/sources/{id}` | `GetSourceHandler` | 200 / 404 |
| `POST` | `/admin/sources` | `CreateSourceHandler` | 201 / 400 |
| `PUT` | `/admin/sources/{id}` | `UpdateSourceHandler` | 200 / 400 / 404 |
| `DELETE` | `/admin/sources/{id}` | `DeleteSourceHandler` | 200 / 404 |
| `PATCH` | `/admin/sources/{id}/toggle` | `ToggleSourceHandler` | 200 / 404 |

### Response Format

```json
// Success
{
  "success": true,
  "data": { "source": { ... } }
}

// Error
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Source with id 'src_xxx' not found"
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Validation Error |
| `404` | Source Not Found |
| `409` | Conflict (e.g., duplicate) |
| `500` | Internal Server Error |

### How to Run Locally

```bash
# List all sources
npm run source:list

# Get a source by ID
npm run source:get

# Create a new source (AWS Blog example)
npm run source:create

# Update a source
npm run source:update

# Delete a source
npm run source:delete

# Toggle source status (ACTIVE ↔ INACTIVE)
npm run source:toggle
```

Each script invokes the **exact same Lambda handler** that runs on AWS Lambda. No emulation, no wrappers.

### How Collector Lambdas Will Consume Sources

Future Collector Lambdas (e.g., `CollectNewsHandler`) will read Sources from DynamoDB like this:

```typescript
// Future Collector implementation
const activeSources = await sourceService.findActive();

for (const source of activeSources) {
  if (source.type === SourceType.RSS) {
    // Fetch RSS feed from source.url
    // Parse articles
    // Save raw articles to DynamoDB
    // Send article IDs to SQS for processing
  }
  if (source.type === SourceType.API) {
    // Fetch from API endpoint
    // Parse JSON response
    // Save raw articles
  }
}
```

The `findActive()` method returns only sources with `status === ACTIVE`. The `priority` field determines the order of processing. The `fetchInterval` field controls how often each source should be fetched.

---

## License

MIT — Built for the AI News Platform startup.
#   s e r v e r l e s s _ n e w s _ l a m d a _ b a c k e n d  
 