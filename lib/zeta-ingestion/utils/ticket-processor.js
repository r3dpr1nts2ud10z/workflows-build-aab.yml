'use strict';

const { ValidationError, BusinessRuleError } = require('./ticket-errors');

const SCALE_FACTOR = 1000000n;
const MAX_FINANCIAL_STRING_LENGTH = 32;
const MAX_IDENTIFIER_STRING_LENGTH = 128;
const MAX_LEGS_COUNT = 25;
const MAX_INTEGER_DIGITS = 12;

function validateRawBounds(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new ValidationError('INVALID_PAYLOAD: Payload must be a non-null object.');
    }

    const allowedRootKeys = new Set(['ticketId', 'timestamp', 'userIdHash', 'stake', 'totalOdds', 'potentialPayout', 'legs']);
    for (const key of Object.keys(payload)) {
        if (!allowedRootKeys.has(key)) {
            throw new ValidationError(`PAYLOAD_LIMIT_EXCEEDED: Unexpected root property '${key}'.`);
        }
    }

    const checkStringField = (val, maxLen, fieldName, isRequired = false) => {
        if (val === undefined || val === null) {
            if (isRequired) throw new ValidationError(`INVALID_PAYLOAD: Missing required field '${fieldName}'.`);
            return;
        }
        if (typeof val !== 'string') {
            throw new ValidationError(`INVALID_PAYLOAD: Field '${fieldName}' must be a string.`);
        }
        if (val.length > maxLen) {
            throw new ValidationError(`PAYLOAD_LIMIT_EXCEEDED: Field '${fieldName}' exceeds maximum length of ${maxLen}.`);
        }
    };

    checkStringField(payload.ticketId, MAX_IDENTIFIER_STRING_LENGTH, 'ticketId', true);
    checkStringField(payload.timestamp, MAX_IDENTIFIER_STRING_LENGTH, 'timestamp', true);
    checkStringField(payload.userIdHash, MAX_IDENTIFIER_STRING_LENGTH, 'userIdHash');
    checkStringField(payload.stake, MAX_FINANCIAL_STRING_LENGTH, 'stake', true);
    checkStringField(payload.totalOdds, MAX_FINANCIAL_STRING_LENGTH, 'totalOdds', true);
    checkStringField(payload.potentialPayout, MAX_FINANCIAL_STRING_LENGTH, 'potentialPayout');

    if (!Array.isArray(payload.legs)) {
        throw new ValidationError("INVALID_PAYLOAD: 'legs' must be an array.");
    }
    if (payload.legs.length > MAX_LEGS_COUNT) {
        throw new ValidationError('PAYLOAD_LIMIT_EXCEEDED: Legs array exceeds maximum allowed items.');
    }

    const allowedLegKeys = new Set(['legId', 'eventSlug', 'market', 'selection', 'targetValue', 'actualValue', 'marginDelta', 'status']);
    for (let i = 0; i < payload.legs.length; i += 1) {
        const leg = payload.legs[i];
        if (!leg || typeof leg !== 'object' || Array.isArray(leg)) {
            throw new ValidationError(`INVALID_LEG: Leg at index ${i} must be an object.`);
        }
        for (const key of Object.keys(leg)) {
            if (!allowedLegKeys.has(key)) {
                throw new ValidationError(`INVALID_LEG: Unexpected field '${key}' in leg at index ${i}.`);
            }
        }
        checkStringField(leg.legId, MAX_IDENTIFIER_STRING_LENGTH, `legs[${i}].legId`, true);
        checkStringField(leg.eventSlug, MAX_IDENTIFIER_STRING_LENGTH, `legs[${i}].eventSlug`, true);
        checkStringField(leg.market, MAX_IDENTIFIER_STRING_LENGTH, `legs[${i}].market`, true);
        checkStringField(leg.selection, MAX_IDENTIFIER_STRING_LENGTH, `legs[${i}].selection`);
        checkStringField(leg.targetValue, MAX_FINANCIAL_STRING_LENGTH, `legs[${i}].targetValue`, true);
        checkStringField(leg.actualValue, MAX_FINANCIAL_STRING_LENGTH, `legs[${i}].actualValue`, true);
        checkStringField(leg.marginDelta, MAX_FINANCIAL_STRING_LENGTH, `legs[${i}].marginDelta`);
        checkStringField(leg.status, 32, `legs[${i}].status`, true);
    }
}

function lexicallyNormalizeDecimal(val) {
    if (typeof val !== 'string') return val;
    let trimmed = val.trim();
    if (['.', '-.', '+.'].includes(trimmed)) {
        throw new ValidationError(`MALFORMED_DECIMAL: '${trimmed}' is not a valid numeric token.`);
    }
    if (trimmed.includes('.')) {
        if (!/^-?\d*\.\d+$/.test(trimmed) && !/^-?\d+\.\d*$/.test(trimmed)) return trimmed;
        trimmed = trimmed.replace(/0+$/, '');
        if (trimmed.endsWith('.')) trimmed = trimmed.slice(0, -1);
        return trimmed === '' ? '0' : trimmed;
    }
    return trimmed;
}

function preprocessRawPayload(rawPayload) {
    validateRawBounds(rawPayload);
    const payload = JSON.parse(JSON.stringify(rawPayload));
    if (typeof payload.ticketId === 'string') payload.ticketId = payload.ticketId.trim();
    if (typeof payload.timestamp === 'string') payload.timestamp = payload.timestamp.trim();
    if (typeof payload.userIdHash === 'string') payload.userIdHash = payload.userIdHash.trim();
    if (typeof payload.stake === 'string') payload.stake = lexicallyNormalizeDecimal(payload.stake);
    if (typeof payload.totalOdds === 'string') payload.totalOdds = lexicallyNormalizeDecimal(payload.totalOdds);
    if (typeof payload.potentialPayout === 'string') payload.potentialPayout = lexicallyNormalizeDecimal(payload.potentialPayout);
    payload.legs = payload.legs.map((leg) => {
        const normalized = { ...leg };
        for (const field of ['legId', 'eventSlug', 'market', 'selection', 'status']) {
            if (typeof normalized[field] === 'string') normalized[field] = normalized[field].trim();
        }
        for (const field of ['targetValue', 'actualValue', 'marginDelta']) {
            if (typeof normalized[field] === 'string') normalized[field] = lexicallyNormalizeDecimal(normalized[field]);
        }
        return normalized;
    });
    return payload;
}

function parseToScaledBigInt(strVal) {
    if (typeof strVal !== 'string' || !/^-?\d+(\.\d+)?$/.test(strVal)) {
        throw new ValidationError(`INVALID_DECIMAL_FORMAT: '${strVal}' cannot be parsed into BigInt.`);
    }
    const isNeg = strVal.startsWith('-');
    const parts = (isNeg ? strVal.slice(1) : strVal).split('.');
    const fracPart = parts[1] || '';
    if (fracPart.length > 6) {
        throw new ValidationError(`PRECISION_OVERFLOW: '${strVal}' exceeds maximum allowed 6 decimal places.`);
    }
    const combined = BigInt(parts[0] + fracPart.padEnd(6, '0'));
    return isNeg ? -combined : combined;
}

function formatScaledBigIntToString(bigIntVal) {
    const isNeg = bigIntVal < 0n;
    const absVal = isNeg ? -bigIntVal : bigIntVal;
    const intPart = absVal / SCALE_FACTOR;
    if (intPart.toString().length > MAX_INTEGER_DIGITS) {
        throw new BusinessRuleError('RANGE_OVERFLOW: Calculated value exceeds maximum supported integer magnitude.');
    }
    const fracStr = (absVal % SCALE_FACTOR).toString().padStart(6, '0');
    return lexicallyNormalizeDecimal(`${isNeg ? '-' : ''}${intPart}.${fracStr}`);
}

function processAndValidateTicket(schemaValidatedPayload) {
    const ticket = JSON.parse(JSON.stringify(schemaValidatedPayload));
    const stakeScaled = parseToScaledBigInt(ticket.stake);
    const oddsScaled = parseToScaledBigInt(ticket.totalOdds);
    const payoutScaled = ticket.potentialPayout != null ? parseToScaledBigInt(ticket.potentialPayout) : null;
    if (oddsScaled <= SCALE_FACTOR) {
        throw new BusinessRuleError('BUSINESS_RULE_VIOLATION: Total odds must be strictly greater than 1.0');
    }
    const productScaled = stakeScaled * oddsScaled;
    const calculatedPayoutScaled = productScaled / SCALE_FACTOR;
    if (productScaled % SCALE_FACTOR !== 0n) {
        throw new BusinessRuleError('PRECISION_REMAINDER_VIOLATION: Payout calculation yields unrepresented sub-micro-unit remainder.');
    }
    if (payoutScaled !== null && calculatedPayoutScaled !== payoutScaled) {
        throw new BusinessRuleError('PAYOUT_CONSISTENCY_FAILURE: Submitted payout does not match calculated product.');
    }
    const seenLegIds = new Set();
    for (const leg of ticket.legs) {
        if (seenLegIds.has(leg.legId)) {
            throw new BusinessRuleError(`DUPLICATE_LEG_ID: Leg identifier '${leg.legId}' duplicated.`);
        }
        seenLegIds.add(leg.legId);
        const computedDeltaScaled = parseToScaledBigInt(leg.actualValue) - parseToScaledBigInt(leg.targetValue);
        if (leg.marginDelta !== undefined && leg.marginDelta !== null) {
            if (computedDeltaScaled !== parseToScaledBigInt(leg.marginDelta)) {
                throw new BusinessRuleError('UNTRUSTED_TELEMETRY: Submitted marginDelta diverges from recomputation.');
            }
        } else {
            leg.marginDelta = formatScaledBigIntToString(computedDeltaScaled);
        }
    }
    return {
        normalizedTicket: ticket,
        computedFinancials: {
            stakeScaled: stakeScaled.toString(),
            oddsScaled: oddsScaled.toString(),
            payoutScaled: (payoutScaled !== null ? payoutScaled : calculatedPayoutScaled).toString()
        }
    };
}

module.exports = {
    validateRawBounds,
    preprocessRawPayload,
    processAndValidateTicket,
    parseToScaledBigInt,
    formatScaledBigIntToString,
    lexicallyNormalizeDecimal
};