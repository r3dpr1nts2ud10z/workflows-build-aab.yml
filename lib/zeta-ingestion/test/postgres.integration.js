// Explicit development-only integration test. It deletes ONLY its generated fixture source.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');
const { createPostgresAdapter } = require('../adapters/postgres-adapter');
const { fixtureKey, ticket, serve } = require('./http-helpers');

test('development PostgreSQL: concurrent router instances, persistence across pool recreation, conflict, rollback', async t => {
  assert.notEqual(process.env.NODE_ENV, 'production', 'Never run fixture writes in production');
  assert.ok(process.env.DATABASE_URL, 'Development DATABASE_URL is required');
  const sourceId = `zeta-test-${randomUUID()}`;
  const config = { connectionString: process.env.DATABASE_URL, max: 6, connectionTimeoutMillis: 5000 };
  let pool = new Pool(config);
  let left, right, restarted;
  const options = { credentialStore: JSON.stringify({ [fixtureKey]: { authorizedSources: [sourceId] } }) };
  const requestOptions = { headers: { 'x-source-id': sourceId } };
  t.after(async () => {
    for (const app of [left, right, restarted]) if (app) await app.close();
    try { await pool.query('DELETE FROM ingested_tickets WHERE source_id = $1', [sourceId]); }
    finally { await pool.end(); }
  });
  left = await serve(createPostgresAdapter(pool), options);
  right = await serve(createPostgresAdapter(pool), options);
  const base = ticket();
  delete base.legs[0].marginDelta;
  const results = await Promise.all(Array.from({ length: 12 }, (_, i) =>
    (i % 2 ? left : right).request(base, requestOptions)));
  assert.ok(results.every(r => r.status === 200));
  assert.equal(results.filter(r => !r.body.idempotentReplay).length, 1);
  const original = results.find(r => !r.body.idempotentReplay).body;
  for (const result of results) assert.deepEqual({ ...result.body, idempotentReplay: false }, original);
  const rows = await pool.query('SELECT payload_hash, normalized_ticket, receipt FROM ingested_tickets WHERE source_id = $1', [sourceId]);
  assert.equal(rows.rowCount, 1);
  assert.equal(rows.rows[0].normalized_ticket.legs[0].marginDelta, '-0.5');
  assert.equal(rows.rows[0].payload_hash.length, 64);
  assert.equal(rows.rows[0].receipt.persistedAt, original.persistedAt);

  const changed = ticket();
  const races = await Promise.all([
    left.request(changed, requestOptions),
    right.request({ ...changed, stake: '11', potentialPayout: '22' }, requestOptions),
  ]);
  assert.deepEqual(races.map(r => r.status).sort(), [200, 409]);

  // Force a DB column violation after BEGIN. It must not write a partial record.
  const invalid = {
    sourceId, ticketId: randomUUID(), payloadHash: 'a'.repeat(65),
    receipt: rows.rows[0].receipt, normalizedTicket: rows.rows[0].normalized_ticket,
  };
  await assert.rejects(createPostgresAdapter(pool).atomicInsert(`${sourceId}:${invalid.ticketId}`, invalid));
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM ingested_tickets WHERE source_id = $1 AND ticket_id = $2', [sourceId, invalid.ticketId])).rows[0].n, 0);

  await left.close(); left = null;
  await right.close(); right = null;
  await pool.end();
  pool = new Pool(config);
  restarted = await serve(createPostgresAdapter(pool), options);
  const replay = await restarted.request(base, requestOptions);
  assert.equal(replay.status, 200);
  assert.equal(replay.body.idempotentReplay, true);
  assert.deepEqual({ ...replay.body, idempotentReplay: false }, original);
});