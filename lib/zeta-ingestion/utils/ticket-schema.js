'use strict';

const CANONICAL_DECIMAL_SIGNED_NON_ZERO = '^(?!-0(\\.0+)?$)-?(0|[1-9]\\d{0,11})(\\.\\d{1,6})?$';
const CANONICAL_DECIMAL_NONNEGATIVE = '^(0|[1-9]\\d{0,11})(\\.\\d{1,6})?$';
const DECIMAL_ODDS_PATTERN = '^([1-9]\\d{0,3})(\\.\\d{1,6})?$';

const ticketIngestionSchema = {
    type: 'object',
    required: ['ticketId', 'timestamp', 'stake', 'totalOdds', 'legs'],
    additionalProperties: false,
    properties: {
        ticketId: { type: 'string', format: 'uuid', maxLength: 36 },
        timestamp: { type: 'string', format: 'date-time', maxLength: 64 },
        userIdHash: {
            type: 'string',
            maxLength: 128,
            pattern: '^[a-fA-F0-9]{32,128}$'
        },
        stake: {
            type: 'string',
            maxLength: 20,
            pattern: CANONICAL_DECIMAL_NONNEGATIVE
        },
        totalOdds: {
            type: 'string',
            maxLength: 20,
            pattern: DECIMAL_ODDS_PATTERN
        },
        potentialPayout: {
            type: 'string',
            maxLength: 25,
            pattern: CANONICAL_DECIMAL_NONNEGATIVE
        },
        legs: {
            type: 'array',
            minItems: 1,
            maxItems: 25,
            items: {
                type: 'object',
                required: ['legId', 'eventSlug', 'market', 'targetValue', 'actualValue', 'status'],
                additionalProperties: false,
                properties: {
                    legId: { type: 'string', minLength: 1, maxLength: 64, pattern: '^\\S.*$' },
                    eventSlug: { type: 'string', minLength: 1, maxLength: 128, pattern: '^\\S.*$' },
                    market: { type: 'string', minLength: 1, maxLength: 64, pattern: '^\\S.*$' },
                    selection: { type: 'string', maxLength: 128 },
                    targetValue: {
                        type: 'string',
                        maxLength: 20,
                        pattern: CANONICAL_DECIMAL_SIGNED_NON_ZERO
                    },
                    actualValue: {
                        type: 'string',
                        maxLength: 20,
                        pattern: CANONICAL_DECIMAL_SIGNED_NON_ZERO
                    },
                    marginDelta: {
                        type: 'string',
                        maxLength: 20,
                        pattern: CANONICAL_DECIMAL_SIGNED_NON_ZERO
                    },
                    status: { type: 'string', enum: ['WIN', 'LOSS', 'PUSH', 'VOID'] }
                }
            }
        }
    }
};

module.exports = {
    ticketIngestionSchema,
    CANONICAL_DECIMAL_SIGNED_NON_ZERO,
    CANONICAL_DECIMAL_NONNEGATIVE,
    DECIMAL_ODDS_PATTERN
};