const { UnauthorizedError, ForbiddenError } = require('./ticket-errors');

function validSource(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 128 && value.trim() === value;
}

// Configuration is never logged or included in errors. Source bounds match the DB column.
function validateCredentialStore(raw = process.env.ZETA_CREDENTIAL_STORE) {
  if (typeof raw !== 'string' || !raw) throw new Error('ZETA_CREDENTIAL_STORE is required.');
  let store;
  try { store = JSON.parse(raw); } catch { throw new Error('Invalid ZETA_CREDENTIAL_STORE JSON.'); }
  if (!store || typeof store !== 'object' || Array.isArray(store) || Object.keys(store).length === 0) {
    throw new Error('ZETA_CREDENTIAL_STORE must be a non-empty credential map.');
  }
  for (const [key, record] of Object.entries(store)) {
    if (!key || key.trim() !== key || !record || typeof record !== 'object' || Array.isArray(record) ||
        !Array.isArray(record.authorizedSources) || record.authorizedSources.length === 0 ||
        !record.authorizedSources.every(validSource)) {
      throw new Error('Invalid credential record or authorizedSources configuration.');
    }
  }
  return store;
}

function createIngestionAuth(options = {}) {
  return function verifyIngestionAuth(req, res, next) {
    const sourceId = req.headers['x-source-id'];
    if (!validSource(sourceId)) return next(new UnauthorizedError());
    let store;
    try {
      store = validateCredentialStore(options.credentialStore ?? process.env.ZETA_CREDENTIAL_STORE);
    } catch {
      return next(new UnauthorizedError());
    }
    const apiKey = req.headers['x-api-key'];
    const header = req.headers.authorization;
    const bearer = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
    let record;
    if (typeof apiKey === 'string' && Object.hasOwn(store, apiKey)) record = store[apiKey];
    else if (bearer && Object.hasOwn(store, bearer)) record = store[bearer];
    if (!record) return next(new UnauthorizedError());
    if (!record.authorizedSources.includes(sourceId)) return next(new ForbiddenError());
    req.verifiedSource = { sourceId };
    next();
  };
}

module.exports = { validateCredentialStore, createIngestionAuth };