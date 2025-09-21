const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { query, run, get } = require('../config/database');
const logger = require('../utils/logger');
const { APIError, NotFoundError } = require('../middleware/errorHandler');

class ContentService {
    constructor() {
        this.wordPressAPICache = new Map();
    }

    // Fetch content from WordPress REST API
    async fetchContent({ siteUrl, postType = 'post', filters = {}, pagination = {} }) {
        try {
            logger.info('Fetching content from WordPress', { siteUrl, postType, filters, pagination });

            const { page = 1, limit = 20 } = pagination;
            const offset = (page - 1) * limit;

            // Build WordPress API URL
            const apiUrl = `${siteUrl}/wp-json/wp/v2/${postType}s`;
            const params = {
                per_page: limit,
                offset,
                _embed: true, // Include media and taxonomy data
                ...this.buildFilterParams(filters)
            };

            // Make request to WordPress API
            const response = await axios.get(apiUrl, {
                params,
                timeout: 30000,
                headers: {
                    'User-Agent': 'HelloKahwin Migration Tool/1.0'
                }
            });

            const posts = response.data;
            const totalHeader = response.headers['x-wp-total'];
            const total = totalHeader ? parseInt(totalHeader) : posts.length;

            // Process and store posts
            const processedPosts = await Promise.all(
                posts.map(post => this.processWordPressPost(post, siteUrl))
            );

            // Store posts in local database
            for (const post of processedPosts) {
                await this.storePost(post);
            }

            return {
                posts: processedPosts,
                pagination: {
                    page,
                    limit,
                    total,
                    hasNext: offset + limit < total
                }
            };

        } catch (error) {
            logger.error('Error fetching content from WordPress', { error: error.message, siteUrl });

            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.message || 'WordPress API error';

                if (status === 404) {
                    throw new NotFoundError('WordPress endpoint not found');
                } else if (status === 401) {
                    throw new APIError('WordPress authentication failed', 401, 'AUTH_ERROR');
                } else {
                    throw new APIError(`WordPress API error: ${message}`, status, 'WP_API_ERROR');
                }
            }

            throw new APIError('Failed to fetch content from WordPress', 500, 'FETCH_ERROR');
        }
    }

    // Build filter parameters for WordPress API
    buildFilterParams(filters) {
        const params = {};

        if (filters.dateRange) {
            if (filters.dateRange.start) {
                params.after = filters.dateRange.start;
            }
            if (filters.dateRange.end) {
                params.before = filters.dateRange.end;
            }
        }

        if (filters.categories && filters.categories.length > 0) {
            params.categories = filters.categories.join(',');
        }

        if (filters.tags && filters.tags.length > 0) {
            params.tags = filters.tags.join(',');
        }

        if (filters.search) {
            params.search = filters.search;
        }

        return params;
    }

    // Process WordPress post data
    async processWordPressPost(wpPost, siteUrl) {
        const wordCount = this.calculateWordCount(wpPost.content.rendered);

        return {
            id: uuidv4(),
            source_site_id: this.getSiteId(siteUrl),
            source_post_id: wpPost.id.toString(),
            source_url: wpPost.link,
            title: this.stripHtml(wpPost.title.rendered),
            content: wpPost.content.rendered,
            excerpt: wpPost.excerpt ? this.stripHtml(wpPost.excerpt.rendered) : '',
            author: wpPost._embedded?.author?.[0]?.name || 'Unknown',
            status: 'fetched',
            post_type: wpPost.type,
            publish_date: wpPost.date,
            modified_date: wpPost.modified,
            word_count: wordCount,
            featured_image_url: wpPost._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
            metadata: JSON.stringify({
                wp_id: wpPost.id,
                categories: wpPost._embedded?.['wp:term']?.[0] || [],
                tags: wpPost._embedded?.['wp:term']?.[1] || [],
                meta: wpPost.meta || {}
            })
        };
    }

    // Store post in local database
    async storePost(post) {
        try {
            // Check if post already exists
            const existing = await get(
                'SELECT id FROM posts WHERE source_site_id = ? AND source_post_id = ?',
                [post.source_site_id, post.source_post_id]
            );

            if (existing) {
                // Update existing post
                await run(`
                    UPDATE posts SET
                        title = ?, content = ?, excerpt = ?, author = ?,
                        publish_date = ?, modified_date = ?, word_count = ?,
                        featured_image_url = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE source_site_id = ? AND source_post_id = ?
                `, [
                    post.title, post.content, post.excerpt, post.author,
                    post.publish_date, post.modified_date, post.word_count,
                    post.featured_image_url, post.metadata,
                    post.source_site_id, post.source_post_id
                ]);

                return existing.id;
            } else {
                // Insert new post
                await run(`
                    INSERT INTO posts (
                        id, source_site_id, source_post_id, source_url, title, content,
                        excerpt, author, status, post_type, publish_date, modified_date,
                        word_count, featured_image_url, metadata
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    post.id, post.source_site_id, post.source_post_id, post.source_url,
                    post.title, post.content, post.excerpt, post.author, post.status,
                    post.post_type, post.publish_date, post.modified_date,
                    post.word_count, post.featured_image_url, post.metadata
                ]);

                return post.id;
            }
        } catch (error) {
            logger.error('Error storing post', { error: error.message, postId: post.id });
            throw error;
        }
    }

    // Get content preview with translations
    async getContentPreview(postId) {
        try {
            const post = await get('SELECT * FROM posts WHERE id = ?', [postId]);

            if (!post) {
                return null;
            }

            // Get translation if available
            const translation = await get(
                'SELECT * FROM post_translations WHERE post_id = ? AND target_language = ?',
                [postId, 'ms']
            );

            return {
                original: post,
                translated: translation || null,
                status: post.status,
                lastModified: post.updated_at
            };
        } catch (error) {
            logger.error('Error getting content preview', { error: error.message, postId });
            throw error;
        }
    }

    // Get content by ID
    async getContentById(postId) {
        try {
            const post = await get('SELECT * FROM posts WHERE id = ?', [postId]);
            if (post && post.metadata) {
                post.metadata = JSON.parse(post.metadata);
            }
            return post;
        } catch (error) {
            logger.error('Error getting content by ID', { error: error.message, postId });
            throw error;
        }
    }

    // List content with pagination and filtering
    async listContent({ page = 1, limit = 20, status, search } = {}) {
        try {
            const offset = (page - 1) * limit;
            let whereClause = 'WHERE 1=1';
            let params = [];

            if (status) {
                whereClause += ' AND status = ?';
                params.push(status);
            }

            if (search) {
                whereClause += ' AND (title LIKE ? OR content LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }

            // Get total count
            const countResult = await get(
                `SELECT COUNT(*) as total FROM posts ${whereClause}`,
                params
            );
            const total = countResult.total;

            // Get posts
            const posts = await query(`
                SELECT id, title, author, status, post_type, word_count,
                       publish_date, created_at, updated_at
                FROM posts ${whereClause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);

            return {
                posts,
                pagination: {
                    page,
                    limit,
                    total,
                    hasNext: offset + limit < total
                }
            };
        } catch (error) {
            logger.error('Error listing content', { error: error.message });
            throw error;
        }
    }

    // Utility methods
    getSiteId(siteUrl) {
        return siteUrl.replace(/https?:\/\//, '').replace(/\/$/, '');
    }

    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').trim();
    }

    calculateWordCount(content) {
        const text = this.stripHtml(content);
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }
}

module.exports = new ContentService();