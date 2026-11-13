/**
 * R0YAL Evidence Engine — pure CommonJS assessment functions.
 *
 * Integration requirements:
 * - Load trustedServerRecord from a trusted server store, never a request body.
 * - Associate eventClauseText with the candidate event before calling.
 * - This assesses proximity only; it does not authorize settlements.
 * Text extraction supports explicit loss-margin phrases, not negation or corrections.
 */

const { parseScaledMargin, formatScaledMargin, SCALE, MAX_INPUT_LENGTH } = require('./evidence-decimal.cjs');

const UNIT_ALIASES = {
  POINTS: 'POINTS',
  POINT: 'POINTS',
  PTS: 'POINTS',
  PT: 'POINTS',
  LEGS: 'LEGS',
  LEG: 'LEGS',
  PERCENTAGE: 'PERCENTAGE',
  PCT: 'PERCENTAGE'
};

const NEAR_MISS_THRESHOLDS = {
  POINTS: 1000000n,
  LEGS: 1000000n,
  PERCENTAGE: 10000n
};

const WORD_TO_NUMBER = { one: 1, a: 1, single: 1 };

function isValidEventId(id) {
  return typeof id === 'string' && id.trim().length > 0;
}

function validateStrictMargin(marginValue, rawUnit) {
  if (typeof rawUnit !== 'string') {
    return { valid: false, reason: 'UNIT_MUST_BE_STRING' };
  }

  const unitKey = rawUnit.trim().toUpperCase();
  const normalizedUnit = Object.hasOwn(UNIT_ALIASES, unitKey) ? UNIT_ALIASES[unitKey] : null;
  if (!normalizedUnit) {
    return { valid: false, reason: `UNSUPPORTED_UNIT: ${rawUnit}` };
  }
  const scaledMargin = parseScaledMargin(marginValue);
  if (scaledMargin === null) {
    return { valid: false, reason: 'MARGIN_MUST_BE_BOUNDED_NONNEGATIVE_DECIMAL_WITH_AT_MOST_SIX_PLACES' };
  }
  if (normalizedUnit === 'LEGS' && scaledMargin % SCALE !== 0n) {
    return { valid: false, reason: 'LEG_MARGIN_MUST_BE_INTEGER' };
  }
  return { valid: true, unit: normalizedUnit, marginValue: formatScaledMargin(scaledMargin), scaledMargin };
}

function parseStrictFormattedNumber(token) {
  if (token.length > MAX_INPUT_LENGTH) return null;
  if (/^\d+(?:\.\d+)?$/.test(token)) {
    return token;
  }
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(token)) {
    return token.replace(/,/g, '');
  }
  return null;
}

function extractLossMarginFromText(text) {
  if (typeof text !== 'string' || text.length > 16384 || !text.trim()) return null;

  const LOSS_MARGIN_REGEX = /\b(lost|missed|off|short)\s+by\s+([a-z0-9.,]+)\s+([a-z]+)\b/i;
  const match = text.match(LOSS_MARGIN_REGEX);
  if (!match) return null;

  const rawValueToken = match[2].toLowerCase();
  const rawUnitToken = match[3];
  const parsedValue = Object.hasOwn(WORD_TO_NUMBER, rawValueToken)
    ? WORD_TO_NUMBER[rawValueToken]
    : parseStrictFormattedNumber(rawValueToken);
  if (parsedValue === null) return null;

  const validation = validateStrictMargin(parsedValue, rawUnitToken);
  if (!validation.valid) return null;
  return { marginValue: validation.marginValue, unit: validation.unit };
}

function evaluateNearMissEvidence({ candidate, eventClauseText, incomingReceipt = null, trustedServerRecord = null }) {
  if (!candidate || candidate.isCandidate !== true) {
    return {
      success: false,
      marginVerified: false,
      isNearMiss: false,
      error: null,
      status: candidate?.status || 'NOT_A_CANDIDATE',
      assessmentScope: 'NEAR_MISS_ASSESSMENT_ONLY'
    };
  }

  if (!isValidEventId(candidate.eventId)) {
    return {
      success: false,
      marginVerified: false,
      isNearMiss: false,
      error: 'EVIDENCE_VALIDATION_ERROR: INVALID_CANDIDATE_EVENT_ID',
      status: 'INVALID_CANDIDATE_BINDING',
      assessmentScope: 'NEAR_MISS_ASSESSMENT_ONLY'
    };
  }

  if (incomingReceipt !== null && incomingReceipt !== undefined) {
    if (typeof incomingReceipt !== 'object' || Array.isArray(incomingReceipt) || !isValidEventId(incomingReceipt.eventId)) {
      return {
        success: false,
        marginVerified: false,
        isNearMiss: false,
        error: 'EVIDENCE_VALIDATION_ERROR: INVALID_RECEIPT_EVENT_ID',
        status: 'INVALID_RECEIPT_PAYLOAD',
        assessmentScope: 'NEAR_MISS_ASSESSMENT_ONLY'
      };
    }
    if (candidate.eventId.trim() !== incomingReceipt.eventId.trim()) {
      return {
        success: false,
        marginVerified: false,
        isNearMiss: false,
        error: 'EVIDENCE_VALIDATION_ERROR: CANDIDATE_RECEIPT_EVENT_MISMATCH',
        status: 'EVENT_IDENTITY_MISMATCH',
        assessmentScope: 'NEAR_MISS_ASSESSMENT_ONLY'
      };
    }
    if (!trustedServerRecord || typeof trustedServerRecord !== 'object') {
      return {
        success: true,
        marginVerified: false,
        isNearMiss: false,
        error: null,
        status: 'SERVER_VERIFICATION_RECORD_MISSING',
        eventIdentity: candidate.eventId,
        assessmentScope: 'NEAR_MISS_ASSESSMENT_ONLY'
      };
    }
    if (!isValidEventId(trustedServerRecord.eventId) || trustedServerRecord.eventId.trim() !== candidate.eventId.trim()) {
      return {
        success: false,
        marginVerified: false,
        isNearMiss: false,
        error: 'EVIDENCE_VALIDATION_ERROR: SERVER_EVENT_IDENTITY_MISMATCH',
        status: 'EVENT_IDENTITY_MISMATCH',
        assessmentScope: 'NEAR_MISS_ASSESSMENT_ONLY'
      };
    }
    if (trustedServerRecord.isVerified !== true) {
      return {
        success: true,
        marginVerified: false,
        isNearMiss: false,
        error: null,
        status: 'SERVER_RECORD_UNVERIFIED',
        eventIdentity: candidate.eventId,
        assessmentScope: 'NEAR_MISS_ASSESSMENT_ONLY'
      };
    }

    const serverMarginCheck = validateStrictMargin(trustedServerRecord.marginValue, trustedServerRecord.unit);
    if (!serverMarginCheck.valid) {
      return {
        success: false,
        marginVerified: false,
        isNearMiss: false,
        error: `SERVER_RECORD_CORRUPT: ${serverMarginCheck.reason}`,
        status: 'INVALID_SERVER_RECORD',
        assessmentScope: 'NEAR_MISS_ASSESSMENT_ONLY'
      };
    }
    const clientMarginCheck = validateStrictMargin(incomingReceipt.marginValue, incomingReceipt.unit);
    if (!clientMarginCheck.valid) {
      return {
        success: false,
        marginVerified: false,
        isNearMiss: false,
        error: `EVIDENCE_VALIDATION_ERROR: ${clientMarginCheck.reason}`,
        status: 'INVALID_CLIENT_PAYLOAD',
        assessmentScope: 'NEAR_MISS_ASSESSMENT_ONLY'
      };
    }
    if (clientMarginCheck.scaledMargin !== serverMarginCheck.scaledMargin || clientMarginCheck.unit !== serverMarginCheck.unit) {
      return {
        success: false,
        marginVerified: false,
        isNearMiss: false,
        error: 'EVIDENCE_MISMATCH: CLIENT_SERVER_METRIC_DISCREPANCY',
        status: 'PAYLOAD_SERVER_METRIC_MISMATCH',
        eventIdentity: candidate.eventId,
        assessmentScope: 'NEAR_MISS_ASSESSMENT_ONLY'
      };
    }

    const threshold = NEAR_MISS_THRESHOLDS[serverMarginCheck.unit];
    const isWithinMargin = serverMarginCheck.scaledMargin <= threshold;
    return {
      success: true,
      marginVerified: true,
      isNearMiss: isWithinMargin,
      error: null,
      status: isWithinMargin ? 'VERIFIED_NEAR_MISS' : 'VERIFIED_MARGIN_EXCEEDED',
      eventIdentity: candidate.eventId,
      evidence: {
        unit: serverMarginCheck.unit,
        marginValue: serverMarginCheck.marginValue,
        threshold: formatScaledMargin(threshold)
      },
      assessmentScope: 'NEAR_MISS_ASSESSMENT_ONLY'
    };
  }

  const parsedTextMargin = extractLossMarginFromText(eventClauseText);
  if (!parsedTextMargin) {
    return {
      success: true,
      marginVerified: false,
      isNearMiss: false,
      error: null,
      status: 'PROXIMITY_UNVERIFIED',
      assessmentScope: 'NEAR_MISS_ASSESSMENT_ONLY'
    };
  }

  const threshold = NEAR_MISS_THRESHOLDS[parsedTextMargin.unit];
  const isWithinMargin = parseScaledMargin(parsedTextMargin.marginValue) <= threshold;
  return {
    success: true,
    marginVerified: false,
    isNearMiss: isWithinMargin,
    error: null,
    status: isWithinMargin ? 'UNVERIFIED_TEXT_INDICATES_NEAR_MISS' : 'TEXT_MARGIN_EXCEEDED',
    evidence: {
      unit: parsedTextMargin.unit,
      marginValue: parsedTextMargin.marginValue,
      threshold: formatScaledMargin(threshold)
    },
    assessmentScope: 'NEAR_MISS_ASSESSMENT_ONLY'
  };
}

module.exports = {
  evaluateNearMissEvidence,
  validateStrictMargin,
  extractLossMarginFromText
};