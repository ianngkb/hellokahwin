/**
 * Enumerated, stable API error codes. This union is part of the frozen `/api/v2`
 * contract (AD-8): native clients switch on `code`, never on `message` strings.
 * Adding a code is additive; changing/removing one strands shipped binaries.
 */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INVALID_CURSOR'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Bearer token was present but expired. Distinct 401 from UNAUTHORIZED so native
 * clients can silently refresh (AD-2) instead of logging the user out.
 */
export class TokenExpiredError extends ApiError {
  constructor(message = 'Token expired') {
    super(message, 401, 'TOKEN_EXPIRED');
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends ApiError {
  constructor(message = 'Validation error') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/**
 * The pagination cursor was tampered with, malformed, or its signature expired.
 * Reject deterministically — never guess an offset (AD-9).
 */
export class InvalidCursorError extends ApiError {
  constructor(message = 'Invalid cursor') {
    super(message, 400, 'INVALID_CURSOR');
  }
}

/**
 * Caller exceeded the per-token / per-IP rate limit for the `/api/v2` surface.
 * The route attaches a `Retry-After` header alongside this body.
 */
export class RateLimitedError extends ApiError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMITED');
  }
}
