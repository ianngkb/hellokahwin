const logger = require('../utils/logger');

// Custom error classes
class APIError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'APIError';
    }
}

class ValidationError extends APIError {
    constructor(message, details = []) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
        this.name = 'ValidationError';
    }
}

class NotFoundError extends APIError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}

class UnauthorizedError extends APIError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}

class RateLimitError extends APIError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
        this.name = 'RateLimitError';
    }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error
    logger.error(err);

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = new NotFoundError(message);
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = new ValidationError(message);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message);
        error = new ValidationError('Validation Error', message);
    }

    // SQLite constraint error
    if (err.code === 'SQLITE_CONSTRAINT') {
        const message = 'Database constraint violation';
        error = new ValidationError(message);
    }

    // WordPress API errors
    if (err.response && err.response.status) {
        const status = err.response.status;
        const message = err.response.data?.message || 'External API error';

        if (status === 401) {
            error = new UnauthorizedError('WordPress authentication failed');
        } else if (status === 404) {
            error = new NotFoundError('WordPress resource');
        } else if (status === 429) {
            error = new RateLimitError('WordPress API rate limit exceeded');
        } else {
            error = new APIError(message, status, 'EXTERNAL_API_ERROR');
        }
    }

    // Default to 500 server error
    if (!error.statusCode) {
        error = new APIError('Internal server error', 500, 'INTERNAL_ERROR');
    }

    const response = {
        error: {
            type: error.name || 'APIError',
            code: error.code,
            message: error.message,
            ...(error.details && { details: error.details }),
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    };

    res.status(error.statusCode).json(response);
};

// Async wrapper to catch errors in async route handlers
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    errorHandler,
    asyncHandler,
    APIError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    RateLimitError
};