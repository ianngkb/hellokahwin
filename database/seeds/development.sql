-- Development Seeds
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