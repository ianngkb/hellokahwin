const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const translationService = require('../services/translationService');
const { query, run, get } = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/translation/batch
// Start batch translation operation
router.post('/batch', asyncHandler(async (req, res) => {
    const {
        postIds,
        targetLanguage = 'ms',
        sourceLanguage = 'en',
        options = {}
    } = req.body;

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
        return res.status(400).json({
            error: 'postIds array is required'
        });
    }

    // Validate API key
    if (!translationService.validateApiKey()) {
        return res.status(400).json({
            error: 'OpenAI API key not configured'
        });
    }

    const jobId = uuidv4();

    // Create translation job record
    await run(`
        INSERT INTO translation_jobs (
            id, status, source_language, target_language,
            total_items, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [jobId, 'queued', sourceLanguage, targetLanguage, postIds.length]);

    // Start background translation process
    setImmediate(async () => {
        try {
            await processBatchTranslation(jobId, postIds, targetLanguage, sourceLanguage, options);
        } catch (error) {
            logger.error('Background batch translation failed', {
                jobId,
                error: error.message
            });
        }
    });

    res.status(202).json({
        jobId,
        status: 'queued',
        totalItems: postIds.length,
        estimatedDuration: Math.ceil(postIds.length * 10) // Rough estimate: 10 seconds per item
    });
}));

// GET /api/translation/status/:jobId
// Get translation job status and progress
router.get('/status/:jobId', asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    // Get job details
    const job = await get(
        'SELECT * FROM translation_jobs WHERE id = ?',
        [jobId]
    );

    if (!job) {
        return res.status(404).json({
            error: 'Translation job not found'
        });
    }

    // Get processing details
    const processedCount = await get(`
        SELECT COUNT(*) as count
        FROM post_translations
        WHERE translation_job_id = ?
    `, [jobId]);

    const errors = await query(`
        SELECT post_id, error_message
        FROM translation_errors
        WHERE translation_job_id = ?
    `, [jobId]);

    const progress = job.total_items > 0
        ? Math.round((processedCount.count / job.total_items) * 100)
        : 0;

    let estimatedCompletion = null;
    if (job.status === 'processing' && progress > 0) {
        const averageTimePerItem = (Date.now() - new Date(job.created_at).getTime()) / processedCount.count;
        const remainingItems = job.total_items - processedCount.count;
        estimatedCompletion = new Date(Date.now() + (remainingItems * averageTimePerItem)).toISOString();
    }

    res.json({
        jobId,
        status: job.status,
        progress,
        processedItems: processedCount.count,
        totalItems: job.total_items,
        errors: errors.map(e => ({
            postId: e.post_id,
            message: e.error_message
        })),
        estimatedCompletion,
        createdAt: job.created_at,
        updatedAt: job.updated_at
    });
}));

// POST /api/translation/single
// Translate a single text or post
router.post('/single', asyncHandler(async (req, res) => {
    const {
        text,
        postId,
        targetLanguage = 'ms',
        sourceLanguage = 'en',
        options = {}
    } = req.body;

    if (!text && !postId) {
        return res.status(400).json({
            error: 'Either text or postId is required'
        });
    }

    // Validate API key
    if (!translationService.validateApiKey()) {
        return res.status(400).json({
            error: 'OpenAI API key not configured'
        });
    }

    let textToTranslate = text;

    // If postId provided, fetch the post content
    if (postId && !text) {
        const post = await get('SELECT title, content FROM posts WHERE id = ?', [postId]);
        if (!post) {
            return res.status(404).json({
                error: 'Post not found'
            });
        }
        textToTranslate = `${post.title}\n\n${post.content}`;
    }

    try {
        const result = await translationService.translateText(
            textToTranslate,
            targetLanguage,
            sourceLanguage,
            options
        );

        res.json({
            success: true,
            translation: result.translatedText,
            sourceLanguage: result.sourceLanguage,
            targetLanguage: result.targetLanguage,
            usage: result.usage
        });

    } catch (error) {
        logger.error('Single translation failed', {
            error: error.message,
            postId,
            targetLanguage
        });

        res.status(500).json({
            error: 'Translation failed',
            message: error.message
        });
    }
}));

// GET /api/translation/jobs
// List translation jobs with pagination
router.get('/jobs', asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (status) {
        whereClause += ' AND status = ?';
        params.push(status);
    }

    // Get total count
    const countResult = await get(
        `SELECT COUNT(*) as total FROM translation_jobs ${whereClause}`,
        params
    );
    const total = countResult.total;

    // Get jobs
    const jobs = await query(`
        SELECT id, status, source_language, target_language,
               total_items, created_at, updated_at
        FROM translation_jobs ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    res.json({
        jobs,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            hasNext: offset + parseInt(limit) < total
        }
    });
}));

// Background processing function
async function processBatchTranslation(jobId, postIds, targetLanguage, sourceLanguage, options) {
    try {
        // Update job status to processing
        await run(
            'UPDATE translation_jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['processing', jobId]
        );

        // Fetch posts to translate
        const posts = await query(`
            SELECT id, title, content, excerpt
            FROM posts
            WHERE id IN (${postIds.map(() => '?').join(',')})
        `, postIds);

        if (posts.length === 0) {
            await run(
                'UPDATE translation_jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['failed', jobId]
            );
            return;
        }

        // Prepare texts for batch translation
        const textsToTranslate = posts.map(post => ({
            id: post.id,
            text: `${post.title}\n\n${post.content}`
        }));

        // Perform batch translation
        const batchResult = await translationService.translateBatch(
            textsToTranslate,
            targetLanguage,
            sourceLanguage,
            options
        );

        // Store successful translations
        for (const result of batchResult.results) {
            const post = posts.find(p => p.id === result.id);
            const lines = result.translatedText.split('\n\n');
            const translatedTitle = lines[0] || '';
            const translatedContent = lines.slice(1).join('\n\n') || result.translatedText;

            await run(`
                INSERT OR REPLACE INTO post_translations (
                    post_id, target_language, translated_title, translated_content,
                    translated_excerpt, translation_job_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
                result.id,
                targetLanguage,
                translatedTitle,
                translatedContent,
                post.excerpt ? (await translationService.translateText(post.excerpt, targetLanguage, sourceLanguage)).translatedText : '',
                jobId
            ]);
        }

        // Store errors
        for (const error of batchResult.errors) {
            await run(`
                INSERT INTO translation_errors (
                    translation_job_id, post_id, error_message, created_at
                ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `, [jobId, error.id, error.error]);
        }

        // Update job status
        const finalStatus = batchResult.errors.length === 0 ? 'completed' : 'completed_with_errors';
        await run(
            'UPDATE translation_jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [finalStatus, jobId]
        );

        logger.info('Batch translation job completed', {
            jobId,
            totalItems: textsToTranslate.length,
            successful: batchResult.results.length,
            failed: batchResult.errors.length,
            status: finalStatus
        });

    } catch (error) {
        logger.error('Batch translation job failed', {
            jobId,
            error: error.message
        });

        await run(
            'UPDATE translation_jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['failed', jobId]
        );

        throw error;
    }
}

module.exports = router;