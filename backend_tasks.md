# Backend Tasks: TWN to HelloKahwin Content Migration Tool
**PRD Reference**: TWN-HelloKahwin-Migration-Tool-PRD.md

## Overview
The backend team develops the core business logic layer for content migration, providing REST APIs for frontend consumption, managing WordPress integrations, orchestrating translation services, and handling publishing operations. This layer ensures data integrity, implements retry mechanisms, and provides robust error handling for all external service integrations.

## Service Boundaries
- **Content Service**: WordPress API integration, content fetching, and metadata management
- **Translation Service**: Machine translation integration, batch processing, and quality management
- **Publishing Service**: WordPress publishing, status tracking, and mapping management
- **Configuration Service**: Settings management, credential handling, and validation
- **Job Service**: Background task orchestration, progress tracking, and error recovery

## API Endpoints

### Content Management APIs

#### GET /api/content/fetch
**Purpose**: Fetch content from source WordPress site with pagination and filtering
**Request**:
```json
{
  "siteUrl": "string",
  "postType": "post|page|custom",
  "filters": {
    "dateRange": {"start": "ISO8601", "end": "ISO8601"},
    "categories": ["string"],
    "tags": ["string"],
    "search": "string"
  },
  "pagination": {"page": "number", "limit": "number"}
}
```
**Response**: `200 OK`
```json
{
  "posts": [Post],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "hasNext": "boolean"
  }
}
```
**Errors**: `400 Bad Request`, `401 Unauthorized`, `429 Rate Limited`, `503 Service Unavailable`

#### GET /api/content/preview/{id}
**Purpose**: Get content with formatting for preview interface
**Response**: `200 OK`
```json
{
  "original": Post,
  "translated": Post,
  "status": "ContentStatus",
  "lastModified": "ISO8601"
}
```

### Translation APIs

#### POST /api/translation/batch
**Purpose**: Start batch translation operation
**Request**:
```json
{
  "postIds": ["string"],
  "targetLanguage": "ms",
  "options": {
    "translateTaxonomies": "boolean",
    "translateMetadata": "boolean"
  }
}
```
**Response**: `202 Accepted`
```json
{
  "jobId": "string",
  "status": "queued",
  "estimatedDuration": "number"
}
```

#### GET /api/translation/status/{jobId}
**Purpose**: Get translation job status and progress
**Response**: `200 OK`
```json
{
  "jobId": "string",
  "status": "queued|processing|completed|failed",
  "progress": "number",
  "processedItems": "number",
  "totalItems": "number",
  "errors": [TranslationError],
  "estimatedCompletion": "ISO8601"
}
```

#### WebSocket /ws/translation-progress
**Purpose**: Real-time translation progress updates
**Events**:
- `job-started`: `{jobId, totalItems}`
- `item-completed`: `{jobId, postId, status, progress}`
- `job-completed`: `{jobId, summary}`
- `error-occurred`: `{jobId, postId, error}`

### Publishing APIs

#### POST /api/publishing/queue
**Purpose**: Add translated content to publishing queue
**Request**:
```json
{
  "postIds": ["string"],
  "targetStatus": "draft|publish",
  "publishDate": "ISO8601?",
  "overwriteExisting": "boolean"
}
```
**Response**: `202 Accepted`
```json
{
  "queueId": "string",
  "queuedItems": "number"
}
```

#### GET /api/publishing/status
**Purpose**: Get publishing queue status and history
**Response**: `200 OK`
```json
{
  "queue": [PublishQueueItem],
  "history": [PublishHistoryItem],
  "summary": {
    "pending": "number",
    "processing": "number",
    "completed": "number",
    "failed": "number"
  }
}
```

### Configuration APIs

#### GET /api/config/settings
**Purpose**: Retrieve application configuration
**Response**: `200 OK`
```json
{
  "wordpress": {
    "source": SiteConfig,
    "target": SiteConfig
  },
  "translation": TranslationConfig,
  "processing": ProcessingConfig
}
```

#### POST /api/config/validate
**Purpose**: Validate configuration settings
**Request**: `{type: "wordpress|translation", config: object}`
**Response**: `200 OK`
```json
{
  "valid": "boolean",
  "errors": [ValidationError],
  "warnings": [ValidationWarning]
}
```

## Background Jobs / Event Handlers

### Translation Processing Job
- **Trigger**: POST /api/translation/batch
- **Process**: Batch translation with rate limiting and retry logic
- **Events**: Progress updates via WebSocket, status updates to database
- **Error Handling**: Individual item failure isolation, exponential backoff retry

### Publishing Queue Processor
- **Trigger**: Scheduled every 30 seconds or manual trigger
- **Process**: Process pending publishing queue items
- **Events**: Publishing status updates, error notifications
- **Rate Limiting**: Configurable requests per minute to target WordPress

### Content Sync Monitor
- **Trigger**: Scheduled daily or manual trigger
- **Process**: Check for updated source content since last sync
- **Events**: New content notifications, sync status updates
- **Scope**: MVP scope limited to manual triggering

## AuthN/AuthZ and Rate Limits

### Authentication
- **WordPress Sites**: Basic Auth, Application Passwords, or JWT tokens
- **Translation Services**: API key authentication with rotation support
- **Local Security**: Encrypted credential storage with master key

### Rate Limiting
- **WordPress APIs**: Configurable limits (default: 60 requests/minute)
- **Translation Services**: Service-specific limits with backoff
- **Internal APIs**: 1000 requests/minute per client session
- **Background Jobs**: Configurable concurrency limits

### Authorization
- **WordPress Permissions**: Minimum required: `edit_posts`, `upload_files`, `edit_published_posts`
- **Content Access**: Source site read permissions, target site write permissions
- **Local Data**: No additional authorization required (single-user desktop app)

## Tasks

### BACK-001
- **Task ID**: BACK-001
- **Summary**: Implement WordPress REST API integration service for content fetching
- **Details**: Create service layer for authenticating with and fetching content from WordPress sites via REST API v2, including pagination, filtering, rate limiting, and error handling.
- **Interfaces/Contracts**:
  - Implements: `GET /api/content/fetch` endpoint
  - WordPress API: `/wp-json/wp/v2/posts`, `/wp-json/wp/v2/pages`
  - Database: Stores fetched content via DB-001 content storage
- **Dependencies**: DB-001, DB-002
- **Acceptance Criteria**:
  - WordPress REST API v2 authentication (Basic Auth, App Passwords, JWT)
  - Content fetching with pagination support (100+ posts)
  - Rate limiting with configurable limits and exponential backoff
  - Error handling for network failures and API errors
  - Content filtering by date, category, tags, and search terms
  - Metadata extraction including taxonomies and custom fields
- **Test Plan**: Unit tests with WordPress API mocks, integration tests with test WordPress instance, rate limiting verification
- **Est. Effort**: L

### BACK-002
- **Task ID**: BACK-002
- **Summary**: Build machine translation service integration with batch processing
- **Details**: Implement translation service integration supporting multiple providers (Google Translate, Azure Translator), with batch processing, rate limiting, and quality validation.
- **Interfaces/Contracts**:
  - Implements: `POST /api/translation/batch` endpoint
  - Translation API: Provider-specific REST APIs
  - WebSocket: Real-time progress events to frontend
  - Database: Translation job tracking via DB-003
- **Dependencies**: BACK-001, DB-003
- **Acceptance Criteria**:
  - Support for multiple translation providers with pluggable architecture
  - Batch translation processing with individual item tracking
  - Rate limiting and quota management per provider
  - Quality validation and confidence scoring
  - Retry mechanism for failed translation attempts
  - Progress tracking with WebSocket updates
- **Test Plan**: Unit tests with translation service mocks, integration tests with actual translation APIs, performance testing with large batches
- **Est. Effort**: L

### BACK-003
- **Task ID**: BACK-003
- **Summary**: Develop job orchestration and progress tracking system
- **Details**: Create background job processing system for managing long-running translation and publishing operations with progress tracking, error recovery, and status reporting.
- **Interfaces/Contracts**:
  - Implements: `GET /api/translation/status/{jobId}` endpoint
  - WebSocket: `/ws/translation-progress` for real-time updates
  - Database: Job status and progress via DB-003
  - Queue: In-memory job queue with persistence fallback
- **Dependencies**: BACK-002, DB-003
- **Acceptance Criteria**:
  - Job queue with priority and dependency management
  - Real-time progress tracking with WebSocket updates
  - Automatic retry with exponential backoff for failed operations
  - Job cancellation and cleanup capabilities
  - Persistent job state across application restarts
  - Comprehensive error logging and recovery
- **Test Plan**: Unit tests for job orchestration logic, integration tests for WebSocket communication, stress testing with concurrent jobs
- **Est. Effort**: L

### BACK-004
- **Task ID**: BACK-004
- **Summary**: Implement content preview and editing service
- **Details**: Create service for providing formatted content preview with inline editing capabilities, content validation, and change tracking for review workflow.
- **Interfaces/Contracts**:
  - Implements: `GET /api/content/preview/{id}` endpoint
  - Database: Content retrieval and update via DB-001
  - Validation: Content integrity and formatting checks
- **Dependencies**: BACK-001, BACK-002, DB-001
- **Acceptance Criteria**:
  - Side-by-side content formatting for preview
  - Inline editing with validation and change tracking
  - Content diff generation for highlighting changes
  - WordPress formatting preservation (shortcodes, blocks)
  - Draft saving without affecting published content
  - Content validation before publishing approval
- **Test Plan**: Unit tests for content formatting, integration tests for editing functionality, validation testing with various content types
- **Est. Effort**: M

### BACK-005
- **Task ID**: BACK-005
- **Summary**: Build WordPress publishing service with status tracking
- **Details**: Implement service for publishing translated content to target WordPress site with mapping management, duplicate prevention, and comprehensive status tracking.
- **Interfaces/Contracts**:
  - Implements: `POST /api/publishing/queue`, `GET /api/publishing/status` endpoints
  - WordPress API: `/wp-json/wp/v2/posts` for publishing
  - Database: Publishing status and mapping via DB-004
- **Dependencies**: BACK-003, BACK-004, DB-004
- **Acceptance Criteria**:
  - WordPress content publishing with full metadata preservation
  - Draft and immediate publishing options
  - Duplicate content detection and prevention
  - Media attachment handling and upload
  - Publishing queue management with retry capabilities
  - Mapping maintenance between source and target posts
- **Test Plan**: Unit tests for publishing logic, integration tests with test WordPress instance, error scenario testing
- **Est. Effort**: L

### BACK-006
- **Task ID**: BACK-006
- **Summary**: Create configuration and credential management service
- **Details**: Implement secure configuration management for WordPress connections, translation services, and application settings with validation and testing capabilities.
- **Interfaces/Contracts**:
  - Implements: `GET /api/config/settings`, `POST /api/config/validate` endpoints
  - Database: Configuration storage via DB-005
  - Encryption: Local credential encryption with master key
- **Dependencies**: DB-005
- **Acceptance Criteria**:
  - Secure credential storage with encryption
  - Configuration validation with connection testing
  - Settings export/import functionality
  - Multiple environment support (dev, staging, production)
  - Configuration versioning and rollback
  - Credential rotation support
- **Test Plan**: Unit tests for validation logic, security testing for credential handling, integration tests for connection validation
- **Est. Effort**: M

### BACK-007
- **Task ID**: BACK-007
- **Summary**: Implement comprehensive error handling and recovery system
- **Details**: Create centralized error handling with categorization, user-friendly messaging, automatic recovery attempts, and comprehensive logging for debugging.
- **Interfaces/Contracts**:
  - Error schema: `{type, code, message, context, recovery}`
  - Logging: Structured logs with correlation IDs
  - Recovery: Automatic retry policies per error type
- **Dependencies**: BACK-001, BACK-002, BACK-003, BACK-004, BACK-005, BACK-006
- **Acceptance Criteria**:
  - Centralized error handling with consistent response format
  - Error categorization (network, authentication, validation, business logic)
  - Automatic retry with exponential backoff for recoverable errors
  - User-friendly error messages with actionable guidance
  - Comprehensive logging with structured data
  - Error aggregation and reporting for monitoring
- **Test Plan**: Unit tests for error handling logic, integration tests for error scenarios, monitoring verification
- **Est. Effort**: M

### BACK-008
- **Task ID**: BACK-008
- **Summary**: Develop API rate limiting and throttling system
- **Details**: Implement intelligent rate limiting for external API calls with adaptive throttling, quota management, and performance optimization to prevent API limits and optimize throughput.
- **Interfaces/Contracts**:
  - Rate limiter: Configurable limits per service and endpoint
  - Metrics: API usage tracking and quota monitoring
  - Throttling: Adaptive backoff based on response headers
- **Dependencies**: BACK-001, BACK-002, BACK-005
- **Acceptance Criteria**:
  - Configurable rate limits per external service
  - Adaptive throttling based on API response headers
  - Quota tracking and proactive limit management
  - Priority queuing for critical operations
  - Rate limit monitoring and alerting
  - Performance optimization with intelligent batching
- **Test Plan**: Unit tests for rate limiting algorithms, integration tests with actual APIs, performance testing under load
- **Est. Effort**: M

## Observability

### Logging
- **Structure**: JSON format with correlation IDs, timestamps, and context
- **Levels**: ERROR (failures), WARN (recoverable issues), INFO (operations), DEBUG (detailed flow)
- **Content**: API calls, translation operations, publishing activities, error details
- **Retention**: Local files with rotation, 30-day retention for debug logs

### Metrics
- **Performance**: API response times, translation throughput, publishing success rates
- **Usage**: Content volume processed, feature utilization, error frequency
- **System**: Memory usage, background job queue depth, database query performance
- **Business**: Content migration success rate, time savings achieved

### Traces
- **Request Flow**: End-to-end tracing for content fetch → translate → publish workflows
- **Error Correlation**: Linking errors across service boundaries with correlation IDs
- **Performance Analysis**: Identifying bottlenecks in translation and publishing pipelines

## Data Privacy & Security Notes

### Credential Security
- Local encryption for all stored credentials using AES-256
- Master key derivation from user-provided password
- No credential transmission except to authenticated endpoints
- Secure memory handling for decrypted credentials

### Content Privacy
- All content processing occurs locally on user's machine
- No content transmitted to unauthorized third parties
- Translation service usage with user consent and provider selection
- Local content storage with user-controlled retention

### API Security
- HTTPS enforcement for all external communications
- Certificate validation for WordPress and translation service connections
- Input sanitization for all user-provided content and configuration
- SQL injection prevention for database queries

### Compliance Considerations
- GDPR compliance for content handling (local processing, user control)
- PCI DSS considerations for credential storage (encryption, access control)
- WordPress security best practices for API authentication

## Open Questions

1. **Translation Service Provider**: Which machine translation service should be the primary integration? Google Translate recommended for quality and reliability.

2. **Concurrent Processing**: What are the optimal concurrency limits for translation and publishing operations? Recommend starting with 5 concurrent translations, 2 concurrent publishing operations.

3. **Error Recovery**: How aggressive should automatic retry policies be? Recommend 3 retries with exponential backoff (1s, 2s, 4s) for most operations.

4. **Content Validation**: What specific validation rules should be applied before publishing? Need business rules for content quality, SEO requirements, and formatting standards.

5. **Performance Targets**: What are acceptable response times for batch operations? Recommend <5s for API responses, progress updates every 2s for long operations.

6. **Backup Strategy**: Should the system automatically backup content before publishing? Recommend optional backup with user configuration.

7. **API Versioning**: How should API versioning be handled for future compatibility? Recommend semantic versioning with backward compatibility for minor versions.

8. **Monitoring Integration**: Should the system integrate with external monitoring tools? Defer to post-MVP unless specific requirements identified.