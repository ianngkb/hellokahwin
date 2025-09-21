-- Migration 001: Initial Schema
-- Description: Create core tables for posts, translations, and job tracking

-- Create posts table with content storage
CREATE TABLE IF NOT EXISTS posts (
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

-- Create post_translations table for multilingual content
CREATE TABLE IF NOT EXISTS post_translations (
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

-- Create taxonomies table for categories and tags
CREATE TABLE IF NOT EXISTS taxonomies (
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

-- Create translation_jobs for batch processing
CREATE TABLE IF NOT EXISTS translation_jobs (
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

-- Create translation_job_items for detailed tracking
CREATE TABLE IF NOT EXISTS translation_job_items (
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