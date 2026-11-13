'use strict';

const { parseScaledMargin, formatScaledMargin } = require('./evidence-decimal.cjs');
const { validateStrictMargin } = require('./engine.cjs');

function parseStrictDbBoolean(value) {
  if (value === true || value === 1 || value === 'true' || value === '1') return true;
  if (value === false || value === 0 || value === 'false' || value === '0') return false;
  return null;
}

function parseStrictDbId(value) {
  if (typeof value !== 'string' || value.length > 256) return null;
  const id = value.trim();
  if (!id || /^(null|undefined)$/i.test(id)) return null;
  return id;
}

function corruptRecord(field) {
  const error = new Error(`CORRUPT_DATABASE_RECORD: Invalid ${field}.`);
  error.code = 'CORRUPT_DATABASE_RECORD';
  return error;
}

async function loadRow(db, query, eventId, userId) {
  const event = parseStrictDbId(eventId);
  const user = parseStrictDbId(userId);
  if (!event || !user) throw new TypeError('Valid event and authenticated user IDs required');
  const result = await db.query(query, [event, user]);
  if (!result || !Array.isArray(result.rows)) throw corruptRecord('query result');
  if (result.rows.length === 0) return null;
  // Duplicate evidence must not be selected nondeterministically.
  if (result.rows.length !== 1) throw corruptRecord('duplicate event records');
  const row = result.rows[0];
  if (!row || parseStrictDbId(row.event_id) !== event) throw corruptRecord('event_id');
  return row;
}

// These table names follow the supplied repository contract, not a live schema
// migration. Supply an authorized pg-compatible pool when integrating.
async function fetchCandidateAndClauseFromDB(db, eventId, userId) {
  const row = await loadRow(db, `
    SELECT is_candidate, event_id, clause_text, owner_id
    FROM event_candidates
    WHERE event_id = $1 AND owner_id = $2
    LIMIT 2;
  `, eventId, userId);
  if (!row) return null;
  const isCandidate = parseStrictDbBoolean(row.is_candidate);
  if (isCandidate === null) throw corruptRecord('is_candidate');
  return {
    isCandidate,
    eventId: parseStrictDbId(row.event_id),
    clauseText: typeof row.clause_text === 'string' ? row.clause_text : ''
  };
}

async function fetchTrustedServerRecordFromDB(db, eventId, userId) {
  const row = await loadRow(db, `
    SELECT event_id, is_verified, margin_value, unit
    FROM verified_receipts
    WHERE event_id = $1 AND owner_id = $2
    LIMIT 2;
  `, eventId, userId);
  if (!row) return null;
  const isVerified = parseStrictDbBoolean(row.is_verified);
  if (isVerified === null) throw corruptRecord('is_verified');
  const checked = validateStrictMargin(row.margin_value, row.unit);
  if (!checked.valid) throw corruptRecord('margin_value or unit');
  return {
    eventId: parseStrictDbId(row.event_id),
    isVerified,
    // Decimal strings preserve precision across JSON and the engine boundary.
    marginValue: checked.marginValue,
    unit: checked.unit
  };
}

module.exports = {
  parseStrictDbBoolean,
  parseStrictDbId,
  // Return type is now BigInt millionths (or null), never a floating-point margin.
  parseStrictDbMargin: parseScaledMargin,
  formatScaledMargin,
  fetchCandidateAndClauseFromDB,
  fetchTrustedServerRecordFromDB
};