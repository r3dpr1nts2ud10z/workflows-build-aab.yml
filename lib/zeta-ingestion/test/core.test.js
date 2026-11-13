'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ticketIngestionSchema } = require('../utils/ticket-schema');
const {
    preprocessRawPayload,
    processAndValidateTicket,
    formatScaledBigIntToString
} = require('../utils/ticket-processor');
const { BusinessRuleError } = require('../utils/ticket-errors');

function ticket(overrides = {}) {
    return {
        ticketId: '00000000-0000-4000-8000-000000000000',
        timestamp: '2025-01-01T00:00:00.000Z',
        stake: '2',
        totalOdds: '1.5',
        legs: [{
            legId: 'leg-1',
            eventSlug: 'event',
            market: 'points',
            targetValue: '10',
            actualValue: '9.5',
            status: 'LOSS'
        }],
        ...overrides
    };
}

test('schema keeps monetary inputs as bounded strings', () => {
    assert.equal(ticketIngestionSchema.properties.stake.type, 'string');
    assert.equal(ticketIngestionSchema.properties.totalOdds.type, 'string');
    assert.equal(ticketIngestionSchema.properties.legs.items.properties.actualValue.type, 'string');
    assert.equal(ticketIngestionSchema.additionalProperties, false);
});

test('preprocessor trims identifiers and normalizes decimal text', () => {
    const result = preprocessRawPayload(ticket({
        ticketId: ' 00000000-0000-4000-8000-000000000000 ',
        stake: ' 2.500000 ',
        legs: [{ ...ticket().legs[0], legId: ' leg-1 ', eventSlug: ' event ' }]
    }));
    assert.equal(result.ticketId, '00000000-0000-4000-8000-000000000000');
    assert.equal(result.stake, '2.5');
    assert.equal(result.legs[0].legId, 'leg-1');
});

test('processor detects duplicate IDs after identifier trimming', () => {
    const leg = ticket().legs[0];
    const preprocessed = preprocessRawPayload(ticket({
        legs: [leg, { ...leg, legId: ' leg-1 ' }]
    }));
    assert.throws(
        () => processAndValidateTicket(preprocessed),
        (error) => error instanceof BusinessRuleError && /DUPLICATE_LEG_ID/.test(error.message)
    );
});

test('processor rejects a payout product with a sub-micro-unit remainder', () => {
    assert.throws(
        () => processAndValidateTicket(ticket({ stake: '0.000001', totalOdds: '1.000001' })),
        (error) => error instanceof BusinessRuleError && /PRECISION_REMAINDER/.test(error.message)
    );
});

test('processor computes signed margin delta without Number conversion', () => {
    const result = processAndValidateTicket(ticket());
    assert.equal(result.normalizedTicket.legs[0].marginDelta, '-0.5');
    assert.deepEqual(result.computedFinancials, {
        stakeScaled: '2000000',
        oddsScaled: '1500000',
        payoutScaled: '3000000'
    });
});

test('BigInt formatter preserves values at boundary and rejects beyond it', () => {
    assert.equal(formatScaledBigIntToString(999999999999999999n), '999999999999.999999');
    assert.throws(() => formatScaledBigIntToString(1000000000000000000n), BusinessRuleError);
});