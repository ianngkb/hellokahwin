-- Migration 002: Translation Service Enhancements
-- Description: Add missing tables and update schema for OpenAI translation integration

-- Update translation_jobs table to simplify structure
ALTER TABLE translation_jobs ADD COLUMN source_language TEXT NOT NULL DEFAULT 'en';

-- Create translation_errors table for error tracking
CREATE TABLE translation_errors (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    translation_job_id TEXT NOT NULL,
    post_id TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_code TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (translation_job_id) REFERENCES translation_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Update post_translations table to better match OpenAI service expectations
-- Note: SQLite doesn't support modifying column constraints, so we'll work with the existing schema

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_source_site_post ON posts(source_site_id, source_post_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_post_translations_post_lang ON post_translations(post_id, target_language);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_status ON translation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_translation_errors_job ON translation_errors(translation_job_id);

-- Insert a default configuration if none exists
INSERT OR IGNORE INTO translation_jobs (
    id,
    job_type,
    status,
    translation_service,
    target_language,
    source_language,
    total_items,
    created_at
) VALUES (
    'initial-config',
    'single',
    'completed',
    'openai',
    'ms',
    'en',
    0,
    CURRENT_TIMESTAMP
);