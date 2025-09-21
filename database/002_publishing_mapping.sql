-- Migration 002: Publishing and Mapping
-- Description: Add publishing queue and post mapping functionality

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

CREATE TABLE application_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    config_type TEXT NOT NULL CHECK (config_type IN ('wordpress', 'translation', 'app', 'user')),
    is_encrypted BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

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