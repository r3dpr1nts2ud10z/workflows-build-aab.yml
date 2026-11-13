const express = require('express');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const crypto = require('node:crypto');
const { ticketIngestionSchema } = require('../utils/ticket-schema');
const { preprocessRawPayload, processAndValidateTicket } = require('../utils/ticket-processor');
const { IngestionError, ValidationError, IdempotencyConflictError } = require('../utils/ticket-errors');
const { createIngestionAuth } = require('../utils/ticket-auth');

function canonicalStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalStringify).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key =>
    JSON.stringify(key) + ':' + canonicalStringify(value[key])).join(',') + '}';
}

function validReceipt(receipt) {
  return receipt && typeof receipt === 'object' && !Array.isArray(receipt) &&
    typeof receipt.persistedAt === 'string' && Number.isFinite(Date.parse(receipt.persistedAt)) &&
    Number.isInteger(receipt.normalizedLegsCount) && receipt.normalizedLegsCount >= 1 &&
    receipt.computedFinancials &&
    ['stakeScaled', 'oddsScaled', 'payoutScaled'].every(key =>
      typeof receipt.computedFinancials[key] === 'string' && /^\d+$/.test(receipt.computedFinancials[key]));
}

function createTicketRouter(dbAdapter, options = {}) {
  if (!dbAdapter || typeof dbAdapter.atomicInsert !== 'function') {
    throw new Error('FATAL_CONFIGURATION: Valid storage adapter required.');
  }
  const router = express.Router();
  const ajv = new Ajv({ strict: true, allErrors: true, coerceTypes: false });
  addFormats(ajv);
  const validateSchema = ajv.compile(ticketIngestionSchema);

  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.locals.ingestionLogger = options.logger;
    next();
  });
  router.post('/ingest', createIngestionAuth(options), async (req, res, next) => {
    try {
      if (!req.is('application/json')) {
        return next(new IngestionError('UNSUPPORTED_MEDIA_TYPE: application/json is required.', 415));
      }
      // preprocessRawPayload runs raw allowlists/type/size checks BEFORE cloning.
      const preprocessed = preprocessRawPayload(req.body);
      if (!validateSchema(preprocessed)) {
        throw new ValidationError('SCHEMA_VALIDATION_FAILURE: Invalid schema structure.');
      }
      const processingResult = processAndValidateTicket(preprocessed);
      const sourceId = req.verifiedSource.sourceId;
      const ticketId = preprocessed.ticketId;
      const payloadHash = crypto.createHash('sha256').update(canonicalStringify(preprocessed)).digest('hex');
      const receipt = {
        computedFinancials: processingResult.computedFinancials,
        normalizedLegsCount: preprocessed.legs.length,
        persistedAt: new Date().toISOString(),
      };
      const result = await dbAdapter.atomicInsert(`${sourceId}:${ticketId}`, {
        sourceId, ticketId, payloadHash, receipt, normalizedTicket: processingResult.normalizedTicket,
      });
      if (!result || typeof result.inserted !== 'boolean') {
        throw new Error('Invalid storage adapter result.');
      }
      let returnedReceipt = receipt;
      if (!result.inserted) {
        const existing = result.existingRecord;
        if (!existing || typeof existing.payloadHash !== 'string' || !validReceipt(existing.receipt)) {
          throw new Error('Invalid stored ingestion record.');
        }
        if (existing.payloadHash !== payloadHash) {
          throw new IdempotencyConflictError('IDEMPOTENCY_CONFLICT: Ticket registered with differing payload.', existing.receipt);
        }
        returnedReceipt = existing.receipt;
      }
      // Explicit response fields: stored JSON cannot override authentication or result metadata.
      return res.status(200).json({
        success: true, idempotentReplay: !result.inserted, ticketId, sourceId,
        computedFinancials: returnedReceipt.computedFinancials,
        normalizedLegsCount: returnedReceipt.normalizedLegsCount,
        persistedAt: returnedReceipt.persistedAt,
      });
    } catch (err) {
      next(err);
    }
  });
  return router;
}

function ingestionErrorMiddleware(err, req, res, next) {
  if (res.headersSent) return next(err);
  res.set('Cache-Control', 'no-store');
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'MALFORMED_JSON' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'PAYLOAD_TOO_LARGE' });
  }
  if (err?.type === 'charset.unsupported' || err?.type === 'encoding.unsupported') {
    return res.status(415).json({ success: false, error: 'UNSUPPORTED_MEDIA_TYPE' });
  }
  if (err instanceof IngestionError) {
    const body = { success: false, error: err.message };
    if (err instanceof IdempotencyConflictError && err.existingReceipt) body.existingReceipt = err.existingReceipt;
    return res.status(err.statusCode).json(body);
  }
  const logger = req.log || res.locals.ingestionLogger;
  // SQL detail and error messages can contain submitted data or credentials.
  logger?.error({ event: 'zeta_ingestion_fault' }, 'ZETA ingestion failed');
  return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR' });
}

module.exports = { createTicketRouter, ingestionErrorMiddleware };