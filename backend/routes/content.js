const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const contentService = require('../services/contentService');
const { validateContentFetch, validatePagination } = require('../validators/contentValidator');

const router = express.Router();

// GET /api/content/fetch
// Fetch content from source WordPress site with pagination and filtering
router.get('/fetch', asyncHandler(async (req, res) => {
    const { error, value } = validateContentFetch(req.query);
    if (error) {
        return res.status(400).json({
            error: {
                type: 'ValidationError',
                message: 'Invalid request parameters',
                details: error.details.map(detail => detail.message)
            }
        });
    }

    const { siteUrl, postType, filters, pagination } = value;

    try {
        const result = await contentService.fetchContent({
            siteUrl,
            postType,
            filters,
            pagination
        });

        res.json(result);
    } catch (error) {
        throw error;
    }
}));

// GET /api/content/preview/:id
// Get content with formatting for preview interface
router.get('/preview/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({
            error: {
                type: 'ValidationError',
                message: 'Post ID is required'
            }
        });
    }

    try {
        const preview = await contentService.getContentPreview(id);

        if (!preview) {
            return res.status(404).json({
                error: {
                    type: 'NotFoundError',
                    message: 'Content not found'
                }
            });
        }

        res.json(preview);
    } catch (error) {
        throw error;
    }
}));

// GET /api/content/:id
// Get specific content item
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const content = await contentService.getContentById(id);

        if (!content) {
            return res.status(404).json({
                error: {
                    type: 'NotFoundError',
                    message: 'Content not found'
                }
            });
        }

        res.json(content);
    } catch (error) {
        throw error;
    }
}));

// GET /api/content
// List stored content with filtering and pagination
router.get('/', asyncHandler(async (req, res) => {
    const { error, value } = validatePagination(req.query);
    if (error) {
        return res.status(400).json({
            error: {
                type: 'ValidationError',
                message: 'Invalid pagination parameters',
                details: error.details.map(detail => detail.message)
            }
        });
    }

    try {
        const result = await contentService.listContent(value);
        res.json(result);
    } catch (error) {
        throw error;
    }
}));

module.exports = router;