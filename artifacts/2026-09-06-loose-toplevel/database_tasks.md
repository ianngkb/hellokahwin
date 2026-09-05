# Database Tasks: TWN to HelloKahwin Content Migration Tool
**PRD Reference**: TWN-HelloKahwin-Migration-Tool-PRD.md

## Overview
The database team is responsible for designing and implementing the local data storage layer that supports content migration workflows. This includes schema design for WordPress content, translation job tracking, publishing status management, and application configuration storage. The solution uses SQLite for local desktop storage with JSON support for flexible content handling.

## Data Model

### Core Tables

#### posts
```sql
CREATE TABLE posts (
    id TEXT PRIMARY KEY,
    source_site_id TEXT NOT NULL,
    source_post_id TEXT NOT NULL,
    source_url TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    author TEXT,
    status TEXT NOT NULL CHECK (status IN ('new', 'fetched', 'translated', 'reviewed', 'published', 'failed')),
    post_type TEXT DEFAULT 'post',
    publish_date TEXT,
    modified_date TEXT,
    word_count INTEGER DEFAULT 0,
    featured_image_url TEXT,
    metadata JSON,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_site_id, source_post_id)
);
```

#### post_translations
```sql
CREATE TABLE post_translations (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    target_language TEXT NOT NULL DEFAULT 'ms',
    translated_title TEXT,
    translated_content TEXT,
    translated_excerpt TEXT,
    translation_service TEXT,
    translation_job_id TEXT,
    quality_score REAL,
    is_reviewed BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    translated_at TEXT,
    reviewed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE(post_id, target_language)
);
```

#### taxonomies
```sql
CREATE TABLE taxonomies (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    taxonomy_type TEXT NOT NULL CHECK (taxonomy_type IN ('category', 'tag', 'custom')),
    original_term TEXT NOT NULL,
    original_slug TEXT,
    translated_term TEXT,
    translated_slug TEXT,
    term_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);
```

#### translation_jobs
```sql
CREATE TABLE translation_jobs (
    id TEXT PRIMARY KEY,
    job_type TEXT NOT NULL CHECK (job_type IN ('single', 'batch')),
    status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    translation_service TEXT NOT NULL,
    target_language TEXT NOT NULL DEFAULT 'ms',
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    progress_percentage REAL DEFAULT 0.0,
    estimated_completion TEXT,
    error_message TEXT,
    configuration JSON,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### translation_job_items
```sql
CREATE TABLE translation_job_items (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    post_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    processed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES translation_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE(job_id, post_id)
);
```

#### post_mappings
```sql
CREATE TABLE post_mappings (
    id TEXT PRIMARY KEY,
    source_post_id TEXT NOT NULL,
    target_post_id TEXT NOT NULL,
    target_site_id TEXT NOT NULL,
    target_url TEXT,
    target_status TEXT CHECK (target_status IN ('draft', 'published', 'private')),
    published_at TEXT,
    mapping_type TEXT DEFAULT 'migration',
    metadata JSON,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_post_id) REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE(source_post_id, target_site_id)
);
```

#### publishing_queue
```sql
CREATE TABLE publishing_queue (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    target_site_id TEXT NOT NULL,
    target_status TEXT NOT NULL CHECK (target_status IN ('draft', 'publish')),
    priority INTEGER DEFAULT 100,
    scheduled_date TEXT,
    status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    last_attempt_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);
```

#### application_config
```sql
CREATE TABLE application_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    config_type TEXT NOT NULL CHECK (config_type IN ('wordpress', 'translation', 'app', 'user')),
    is_encrypted BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### sync_status
```sql
CREATE TABLE sync_status (
    id TEXT PRIMARY KEY,
    source_site_id TEXT NOT NULL,
    last_sync_timestamp TEXT,
    total_posts_synced INTEGER DEFAULT 0,
    sync_type TEXT CHECK (sync_type IN ('initial', 'incremental', 'manual')),
    status TEXT CHECK (status IN ('in_progress', 'completed', 'failed')),
    error_message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Supporting Tables

#### media_files
```sql
CREATE TABLE media_files (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    original_url TEXT NOT NULL,
    local_path TEXT,
    target_url TEXT,
    file_type TEXT,
    file_size INTEGER,
    alt_text TEXT,
    caption TEXT,
    translated_alt_text TEXT,
    translated_caption TEXT,
    download_status TEXT CHECK (download_status IN ('pending', 'downloaded', 'failed', 'uploaded')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);
```

#### audit_log
```sql
CREATE TABLE audit_log (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    old_values JSON,
    new_values JSON,
    user_id TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    correlation_id TEXT
);
```

## Migrations Plan

### Migration 001: Initial Schema
**Filename**: `001_initial_schema.sql`
**Description**: Create core tables for posts, translations, and job tracking
**Forward**:
```sql
-- Create posts table with content storage
CREATE TABLE posts (...);
-- Create post_translations table for multilingual content
CREATE TABLE post_translations (...);
-- Create taxonomies table for categories and tags
CREATE TABLE taxonomies (...);
-- Create translation_jobs for batch processing
CREATE TABLE translation_jobs (...);
-- Create translation_job_items for detailed tracking
CREATE TABLE translation_job_items (...);
```
**Backward**:
```sql
DROP TABLE IF EXISTS translation_job_items;
DROP TABLE IF EXISTS translation_jobs;
DROP TABLE IF EXISTS taxonomies;
DROP TABLE IF EXISTS post_translations;
DROP TABLE IF EXISTS posts;
```

### Migration 002: Publishing and Mapping
**Filename**: `002_publishing_mapping.sql`
**Description**: Add publishing queue and post mapping functionality
**Forward**:
```sql
CREATE TABLE post_mappings (...);
CREATE TABLE publishing_queue (...);
CREATE TABLE application_config (...);
CREATE TABLE sync_status (...);
```
**Backward**:
```sql
DROP TABLE IF EXISTS sync_status;
DROP TABLE IF EXISTS application_config;
DROP TABLE IF EXISTS publishing_queue;
DROP TABLE IF EXISTS post_mappings;
```

### Migration 003: Media and Audit
**Filename**: `003_media_audit.sql`
**Description**: Add media file tracking and audit logging
**Forward**:
```sql
CREATE TABLE media_files (...);
CREATE TABLE audit_log (...);
```
**Backward**:
```sql
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS media_files;
```

### Migration 004: Performance Indices
**Filename**: `004_performance_indices.sql`
**Description**: Add indices for query performance optimization
**Forward**:
```sql
-- Core performance indices
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_source_site ON posts(source_site_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_post_translations_post_id ON post_translations(post_id);
CREATE INDEX idx_taxonomies_post_id ON taxonomies(post_id);
CREATE INDEX idx_translation_jobs_status ON translation_jobs(status);
CREATE INDEX idx_translation_job_items_job_status ON translation_job_items(job_id, status);
CREATE INDEX idx_publishing_queue_status ON publishing_queue(status, priority);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
```
**Backward**:
```sql
DROP INDEX IF EXISTS idx_audit_log_entity;
DROP INDEX IF EXISTS idx_publishing_queue_status;
DROP INDEX IF EXISTS idx_translation_job_items_job_status;
DROP INDEX IF EXISTS idx_translation_jobs_status;
DROP INDEX IF EXISTS idx_taxonomies_post_id;
DROP INDEX IF EXISTS idx_post_translations_post_id;
DROP INDEX IF EXISTS idx_posts_created_at;
DROP INDEX IF EXISTS idx_posts_source_site;
DROP INDEX IF EXISTS idx_posts_status;
```

## Indices & Performance

### Primary Performance Indices
- **posts.status**: Enable fast filtering by content status
- **posts.source_site_id**: Support multi-site content management
- **posts.created_at**: Chronological content ordering and pagination
- **translation_jobs.status**: Queue management and active job tracking
- **publishing_queue.status, priority**: Publishing queue processing optimization

### Composite Indices
- **translation_job_items(job_id, status)**: Job progress tracking
- **post_mappings(source_post_id, target_site_id)**: Mapping lookups
- **taxonomies(post_id, taxonomy_type)**: Content relationship queries

### Query Optimization Strategies
- Use prepared statements for all parameterized queries
- Implement connection pooling for concurrent operations
- Enable SQLite WAL mode for better concurrent read performance
- Use partial indices for status-based filtering where appropriate

## Constraints & Integrity

### Foreign Key Constraints
- **post_translations.post_id** → **posts.id**: Ensure translation data integrity
- **taxonomies.post_id** → **posts.id**: Maintain taxonomy relationships
- **translation_job_items.job_id** → **translation_jobs.id**: Job item consistency
- **translation_job_items.post_id** → **posts.id**: Content reference integrity
- **post_mappings.source_post_id** → **posts.id**: Mapping data consistency

### Unique Constraints
- **posts(source_site_id, source_post_id)**: Prevent duplicate content imports
- **post_translations(post_id, target_language)**: One translation per language
- **post_mappings(source_post_id, target_site_id)**: One mapping per target site
- **translation_job_items(job_id, post_id)**: Prevent duplicate job items

### Check Constraints
- **posts.status**: Enforce valid status values throughout content workflow
- **translation_jobs.status**: Ensure proper job state transitions
- **publishing_queue.target_status**: Validate publishing target status
- **taxonomies.taxonomy_type**: Restrict to supported taxonomy types

### Data Validation Rules
- Required fields: posts.title, posts.content, translation_jobs.translation_service
- Date format validation: ISO 8601 format for all datetime fields
- JSON validation: Ensure valid JSON format for metadata fields
- URL validation: Basic URL format checking for source and target URLs

## Row-Level Security / Permissions
*Note: SQLite does not support row-level security. Security is implemented at the application layer.*

### Application-Level Security
- **Content Isolation**: Each desktop installation maintains separate database
- **Credential Encryption**: All sensitive configuration encrypted with user-provided key
- **Data Access Control**: Backend service layer enforces business logic permissions
- **Audit Trail**: All data modifications logged in audit_log table

### File System Security
- Database file stored in user-specific application data directory
- File permissions restricted to current user only
- Automatic backup with user-controlled retention policy
- Secure deletion of temporary files and cached data

## Seeds & Fixtures

### Development Seeds
**Filename**: `seeds/development.sql`
```sql
-- Sample WordPress site configuration
INSERT INTO application_config (key, value, config_type) VALUES
('wordpress.source.url', 'https://twn.example.com', 'wordpress'),
('wordpress.target.url', 'https://hellokahwin.example.com', 'wordpress'),
('translation.service', 'google', 'translation'),
('translation.target_language', 'ms', 'translation');

-- Sample content for testing
INSERT INTO posts (id, source_site_id, source_post_id, title, content, status, post_type) VALUES
('post-1', 'twn-site', '123', 'Sample Blog Post', 'This is sample content for testing.', 'fetched', 'post'),
('post-2', 'twn-site', '124', 'Another Sample Post', 'More sample content for development.', 'translated', 'post');

-- Sample translation
INSERT INTO post_translations (id, post_id, translated_title, translated_content, translation_service) VALUES
('trans-1', 'post-1', 'Pos Blog Contoh', 'Ini adalah kandungan contoh untuk ujian.', 'google');
```

### Test Fixtures
**Filename**: `fixtures/test_data.sql`
```sql
-- Complete content lifecycle for testing
INSERT INTO posts (id, source_site_id, source_post_id, title, content, status) VALUES
('test-post-1', 'test-site', 'wp-001', 'Test Article Title', 'Full article content with multiple paragraphs...', 'new'),
('test-post-2', 'test-site', 'wp-002', 'Another Test Article', 'Different content for variety...', 'translated');

-- Translation job for batch testing
INSERT INTO translation_jobs (id, job_type, status, translation_service, total_items) VALUES
('test-job-1', 'batch', 'processing', 'google', 2);

-- Job items for progress tracking
INSERT INTO translation_job_items (id, job_id, post_id, status) VALUES
('test-item-1', 'test-job-1', 'test-post-1', 'completed'),
('test-item-2', 'test-job-1', 'test-post-2', 'processing');
```

### Production Configuration Seeds
**Filename**: `seeds/production.sql`
```sql
-- Default application configuration
INSERT INTO application_config (key, value, config_type) VALUES
('app.version', '1.0.0', 'app'),
('app.database_version', '4', 'app'),
('translation.default_service', 'google', 'translation'),
('translation.batch_size', '10', 'translation'),
('publishing.retry_attempts', '3', 'app'),
('sync.auto_sync_enabled', 'false', 'app');
```

## Tasks

### DB-001
- **Task ID**: DB-001
- **Summary**: Create core content storage schema with posts, translations, and taxonomies
- **Details**: Design and implement primary content tables supporting WordPress post structure, multilingual translations, and taxonomy relationships with proper indexing and constraints.
- **Interfaces/Contracts**:
  - Post schema: `{id, title, content, status, metadata, created_at, updated_at}`
  - Translation schema: `{post_id, target_language, translated_content, quality_score}`
  - Taxonomy schema: `{post_id, taxonomy_type, original_term, translated_term}`
- **Dependencies**: None (foundational task)
- **Acceptance Criteria**:
  - SQLite database with posts, post_translations, and taxonomies tables
  - Foreign key constraints ensuring data integrity
  - Unique constraints preventing duplicate content
  - Status field validation with check constraints
  - JSON metadata support for flexible WordPress content
  - Performance indices for common query patterns
- **Test Plan**: Unit tests for schema validation, constraint testing, performance testing with large datasets
- **Est. Effort**: L

### DB-002
- **Task ID**: DB-002
- **Summary**: Implement translation job tracking system with progress monitoring
- **Details**: Create job management tables supporting batch translation operations, individual item tracking, progress calculation, and error handling with retry mechanisms.
- **Interfaces/Contracts**:
  - Job schema: `{id, status, progress_percentage, total_items, processed_items}`
  - Job item schema: `{job_id, post_id, status, error_message, retry_count}`
  - Status values: 'queued', 'processing', 'completed', 'failed', 'cancelled'
- **Dependencies**: DB-001
- **Acceptance Criteria**:
  - Translation jobs table with comprehensive status tracking
  - Job items table linking jobs to individual posts
  - Progress calculation triggers and views
  - Error tracking with retry count management
  - Job cleanup procedures for completed operations
  - Performance indices for job queue processing
- **Test Plan**: Unit tests for job lifecycle, concurrency testing for job processing, error scenario validation
- **Est. Effort**: M

### DB-003
- **Task ID**: DB-003
- **Summary**: Design publishing queue and post mapping system
- **Details**: Create tables for managing publishing operations, tracking source-to-target post mappings, and maintaining synchronization state between WordPress sites.
- **Interfaces/Contracts**:
  - Mapping schema: `{source_post_id, target_post_id, target_site_id, target_url}`
  - Queue schema: `{post_id, target_status, priority, scheduled_date, attempts}`
  - Sync schema: `{source_site_id, last_sync_timestamp, total_posts_synced}`
- **Dependencies**: DB-001
- **Acceptance Criteria**:
  - Post mappings table with unique constraints per target site
  - Publishing queue with priority and scheduling support
  - Sync status tracking for incremental updates
  - Idempotent publishing operations preventing duplicates
  - Queue processing order based on priority and creation time
  - Mapping cleanup for deleted source content
- **Test Plan**: Unit tests for mapping logic, queue processing tests, sync status validation
- **Est. Effort**: M

### DB-004
- **Task ID**: DB-004
- **Summary**: Build configuration and media management schema
- **Details**: Implement tables for application configuration, WordPress site credentials, media file tracking, and user preferences with encryption support.
- **Interfaces/Contracts**:
  - Config schema: `{key, value, config_type, is_encrypted}`
  - Media schema: `{post_id, original_url, local_path, target_url, download_status}`
  - Config types: 'wordpress', 'translation', 'app', 'user'
- **Dependencies**: DB-001
- **Acceptance Criteria**:
  - Application configuration table with type categorization
  - Media files table with download and upload tracking
  - Encryption flag support for sensitive configuration
  - Configuration validation and type checking
  - Media file cleanup procedures for storage management
  - User preference storage with default value support
- **Test Plan**: Unit tests for configuration management, media tracking tests, encryption/decryption validation
- **Est. Effort**: M

### DB-005
- **Task ID**: DB-005
- **Summary**: Implement database migration and versioning system
- **Details**: Create migration framework supporting forward and backward schema changes, version tracking, and safe upgrade procedures for database schema evolution.
- **Interfaces/Contracts**:
  - Migration schema: `{version, filename, applied_at, checksum}`
  - Migration API: `{migrate_up(), migrate_down(), get_version(), validate()}`
  - File naming: `{version}_{description}.sql`
- **Dependencies**: DB-001, DB-002, DB-003, DB-004
- **Acceptance Criteria**:
  - Migration tracking table with version history
  - Forward and backward migration script support
  - Checksum validation for migration file integrity
  - Automatic backup before schema changes
  - Safe rollback procedures for failed migrations
  - Version compatibility checking
- **Test Plan**: Unit tests for migration logic, integration tests for upgrade/downgrade scenarios, data integrity validation
- **Est. Effort**: L

### DB-006
- **Task ID**: DB-006
- **Summary**: Create audit logging and data integrity monitoring system
- **Details**: Implement comprehensive audit trail for all data modifications, integrity checking procedures, and monitoring for data corruption or inconsistencies.
- **Interfaces/Contracts**:
  - Audit schema: `{entity_type, entity_id, action, old_values, new_values, timestamp}`
  - Integrity API: `{check_constraints(), validate_references(), repair_data()}`
  - Actions: 'CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'TRANSLATE'
- **Dependencies**: DB-001, DB-002, DB-003, DB-004
- **Acceptance Criteria**:
  - Audit log table capturing all data modifications
  - Automatic audit triggers for tracked tables
  - Data integrity checking procedures
  - Orphaned record detection and cleanup
  - Performance monitoring for database operations
  - Correlation ID support for request tracing
- **Test Plan**: Unit tests for audit triggers, integrity checking validation, performance impact assessment
- **Est. Effort**: M

### DB-007
- **Task ID**: DB-007
- **Summary**: Optimize database performance with advanced indexing and query tuning
- **Details**: Implement comprehensive indexing strategy, query optimization, and performance monitoring to support high-volume content processing operations.
- **Interfaces/Contracts**:
  - Index schema: Covering indices for common query patterns
  - Performance metrics: Query execution times, index usage statistics
  - Optimization targets: <100ms for content queries, <500ms for batch operations
- **Dependencies**: DB-001, DB-002, DB-003, DB-004, DB-005, DB-006
- **Acceptance Criteria**:
  - Comprehensive indexing for all performance-critical queries
  - Query execution plan analysis and optimization
  - Performance monitoring and alerting for slow queries
  - Database size optimization and cleanup procedures
  - Connection pooling and concurrency optimization
  - Vacuum and maintenance scheduling
- **Test Plan**: Performance testing with large datasets, query plan analysis, concurrent operation testing
- **Est. Effort**: L

### DB-008
- **Task ID**: DB-008
- **Summary**: Implement backup and recovery procedures
- **Details**: Create automated backup system, point-in-time recovery capabilities, and data export/import functionality for disaster recovery and data portability.
- **Interfaces/Contracts**:
  - Backup API: `{create_backup(), restore_backup(), list_backups(), cleanup_old()}`
  - Export schema: JSON format for cross-platform compatibility
  - Recovery procedures: Full restore, selective restore, data verification
- **Dependencies**: DB-005, DB-006
- **Acceptance Criteria**:
  - Automated daily backup with configurable retention
  - Point-in-time recovery capability
  - Data export in portable JSON format
  - Backup integrity verification and testing
  - Quick recovery procedures for common scenarios
  - Cross-platform backup compatibility
- **Test Plan**: Backup/restore testing, data integrity validation, disaster recovery simulation
- **Est. Effort**: M

## Open Questions

1. **SQLite vs. Alternative**: Should we consider other embedded databases (DuckDB, LMDB) for better performance? SQLite recommended for simplicity and ubiquity.

2. **JSON Field Usage**: How extensively should we use JSON fields vs. normalized tables for WordPress metadata? Recommend JSON for dynamic metadata, normalized for queryable fields.

3. **Concurrent Access**: What level of concurrent database access should be supported? Recommend WAL mode with reasonable connection pooling (5-10 connections).

4. **Data Retention**: What are the requirements for content retention and cleanup policies? Need business requirements for audit log retention and processed content cleanup.

5. **Backup Strategy**: Should backups be automatic or user-initiated? Recommend automatic daily backups with user-configurable retention (default 30 days).

6. **Migration Strategy**: How should we handle breaking schema changes in production? Recommend versioned migrations with data preservation and rollback support.

7. **Performance Targets**: What are acceptable database performance benchmarks for large content volumes (10,000+ posts)? Need specific requirements for query response times.

8. **Cross-Platform Compatibility**: Are there specific SQLite version requirements for cross-platform deployment? Recommend SQLite 3.35+ for JSON support and performance features.