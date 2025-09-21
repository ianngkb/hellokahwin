-- Migration 003: Media and Audit
-- Description: Add media file tracking and audit logging

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