-- Migration 004: Performance Indices
-- Description: Add indices for query performance optimization

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