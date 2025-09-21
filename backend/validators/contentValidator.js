const Joi = require('joi');

// Validation schema for content fetch request
const contentFetchSchema = Joi.object({
    siteUrl: Joi.string().uri().required(),
    postType: Joi.string().valid('post', 'page', 'custom').default('post'),
    filters: Joi.object({
        dateRange: Joi.object({
            start: Joi.string().isoDate(),
            end: Joi.string().isoDate()
        }),
        categories: Joi.array().items(Joi.string()),
        tags: Joi.array().items(Joi.string()),
        search: Joi.string().max(100)
    }).default({}),
    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20)
    }).default({})
});

// Validation schema for pagination
const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('new', 'fetched', 'translated', 'reviewed', 'published', 'failed'),
    search: Joi.string().max(100)
});

// Validation functions
const validateContentFetch = (data) => {
    return contentFetchSchema.validate(data, { allowUnknown: false });
};

const validatePagination = (data) => {
    return paginationSchema.validate(data, { allowUnknown: false });
};

module.exports = {
    validateContentFetch,
    validatePagination,
    contentFetchSchema,
    paginationSchema
};