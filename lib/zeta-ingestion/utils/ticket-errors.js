'use strict';

class IngestionError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = 'IngestionError';
        this.statusCode = statusCode;
        Error.captureStackTrace?.(this, this.constructor);
    }
}

class ValidationError extends IngestionError {
    constructor(message) {
        super(message, 400);
        this.name = 'ValidationError';
    }
}

class BusinessRuleError extends IngestionError {
    constructor(message) {
        super(message, 422);
        this.name = 'BusinessRuleError';
    }
}

class UnauthorizedError extends IngestionError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
        this.name = 'UnauthorizedError';
    }
}

class ForbiddenError extends IngestionError {
    constructor(message = 'Forbidden') {
        super(message, 403);
        this.name = 'ForbiddenError';
    }
}

class IdempotencyConflictError extends IngestionError {
    constructor(message, existingReceipt) {
        if (arguments.length === 1 && typeof message !== 'string') {
            existingReceipt = message;
            message = 'IDEMPOTENCY_CONFLICT: Ticket already exists with different content.';
        }
        super(message || 'IDEMPOTENCY_CONFLICT: Ticket already exists with different content.', 409);
        this.name = 'IdempotencyConflictError';
        this.existingReceipt = existingReceipt;
    }
}

module.exports = {
    IngestionError,
    ValidationError,
    BusinessRuleError,
    UnauthorizedError,
    ForbiddenError,
    IdempotencyConflictError
};