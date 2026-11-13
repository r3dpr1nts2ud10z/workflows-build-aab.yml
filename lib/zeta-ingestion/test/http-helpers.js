const express = require('express');
const { randomUUID } = require('node:crypto');
const { createTicketRouter, ingestionErrorMiddleware } = require('../routes/ticket-router');

// Test-only credential. Never installed in the application environment.
const fixtureKey = 'test-fixture-only-not-a-production-key';
const sourceId = 'fixture-source';
const credentialStore = JSON.stringify({ [fixtureKey]: { authorizedSources: [sourceId] } });
function ticket(overrides = {}) {
  return {
    ticketId: randomUUID(), timestamp: '2026-09-18T12:00:00Z',
    stake: '10', totalOdds: '2', potentialPayout: '20',
    legs: [{ legId: 'L1', eventSlug: 'event-1', market: 'player_points', selection: 'Over',
      targetValue: '25.5', actualValue: '25', marginDelta: '-0.5', status: 'LOSS' }],
    ...overrides,
  };
}
function memoryAdapter() {
  const records = new Map();
  return {
    records,
    async atomicInsert(key, record) {
      if (records.has(key)) return { inserted: false, existingRecord: records.get(key) };
      records.set(key, structuredClone(record));
      return { inserted: true };
    },
  };
}
async function serve(adapter, options = {}) {
  const app = express();
  app.use('/api/v1/tickets', express.json({ limit: '10kb' }),
    createTicketRouter(adapter, { credentialStore, ...options }), ingestionErrorMiddleware);
  // Mirrors the real server's larger parser: it MUST be after ingestion.
  app.use(express.json({ limit: '256kb' }));
  const server = await new Promise(resolve => {
    const running = app.listen(0, '127.0.0.1', () => resolve(running));
  });
  return {
    async request(body, options = {}) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/tickets/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': fixtureKey,
          'x-source-id': sourceId, ...options.headers },
        body: options.raw ? body : JSON.stringify(body),
      });
      return { status: response.status, body: await response.json(), headers: response.headers };
    },
    async close() {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    },
  };
}
module.exports = { fixtureKey, sourceId, credentialStore, ticket, memoryAdapter, serve };