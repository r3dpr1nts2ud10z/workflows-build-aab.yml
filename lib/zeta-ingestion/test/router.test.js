const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTicketRouter } = require('../routes/ticket-router');
const { validateCredentialStore } = require('../utils/ticket-auth');
const { fixtureKey, sourceId, ticket, memoryAdapter, serve } = require('./http-helpers');

test('factory rejects missing storage; credential configuration fails closed', () => {
  for (const adapter of [null, {}, { atomicInsert: false }]) assert.throws(() => createTicketRouter(adapter));
  for (const config of ['', 'null', '{}', '[]', '{', JSON.stringify({
    [fixtureKey]: { authorizedSources: 'fixture-source' },
  }), JSON.stringify({ [fixtureKey]: { authorizedSources: [''] } })]) {
    assert.throws(() => validateCredentialStore(config));
  }
});

test('HTTP auth, strict parser, source binding, validation, normalization, replay and conflict', async t => {
  const adapter = memoryAdapter();
  const app = await serve(adapter);
  t.after(() => app.close());
  const base = ticket();
  assert.equal((await app.request(base, { headers: { 'x-api-key': 'wrong' } })).status, 401);
  assert.equal((await app.request(base, { headers: { 'x-api-key': 'toString' } })).status, 401);
  assert.equal((await app.request(base, { headers: { 'x-source-id': 'fixture' } })).status, 403);
  assert.equal((await app.request('{broken:', { raw: true })).status, 400);
  assert.equal((await app.request(ticket({ extra: 'x'.repeat(12000) }))).status, 413);
  assert.equal((await app.request('test', { raw: true, headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await app.request(ticket({ stake: 10 }))).status, 400);
  assert.equal((await app.request(ticket({ extra: true }))).status, 400);
  assert.equal((await app.request(ticket({ ticketId: 'invalid-uuid' }))).status, 400);
  assert.equal((await app.request(ticket({ potentialPayout: '21' }))).status, 422);
  assert.equal((await app.request(ticket({ totalOdds: '1' }))).status, 422);
  assert.equal((await app.request(ticket({
    legs: [base.legs[0], { ...base.legs[0], legId: 'L1 ' }],
  }))).status, 422);
  assert.equal(adapter.records.size, 0);

  const first = await app.request(base);
  assert.equal(first.status, 200);
  assert.equal(first.body.idempotentReplay, false);
  assert.equal(first.headers.get('cache-control'), 'no-store');
  assert.deepEqual(first.body.computedFinancials, { stakeScaled: '10000000', oddsScaled: '2000000', payoutScaled: '20000000' });
  const reordered = Object.fromEntries(Object.entries(base).reverse());
  reordered.legs = base.legs.map(leg => Object.fromEntries(Object.entries(leg).reverse()));
  reordered.stake = ' 10.0000000 ';
  reordered.legs[0].legId = ' L1 ';
  const replay = await app.request(reordered, { headers: { 'x-api-key': '', authorization: `Bearer ${fixtureKey}` } });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.idempotentReplay, true);
  assert.deepEqual({ ...replay.body, idempotentReplay: false }, first.body);
  const conflict = await app.request({ ...base, stake: '11', potentialPayout: '22' });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.existingReceipt.persistedAt, first.body.persistedAt);
  assert.equal(adapter.records.size, 1);
});

test('unconfigured/malformed credentials cannot call storage', async t => {
  let calls = 0;
  const adapter = { atomicInsert() { calls++; throw new Error('must not be called'); } };
  for (const credentialStore of ['', 'null', JSON.stringify({ [fixtureKey]: { authorizedSources: sourceId } })]) {
    const app = await serve(adapter, { credentialStore });
    t.after(() => app.close());
    assert.equal((await app.request(ticket())).status, 401);
  }
  assert.equal(calls, 0);
});

test('storage exceptions and invalid adapter results cannot acknowledge success or leak details', async t => {
  for (const fn of [
    async () => { throw new Error('private database detail'); },
    async () => ({ inserted: 'false' }),
    async () => ({ inserted: false }),
  ]) {
    const app = await serve({ atomicInsert: fn });
    t.after(() => app.close());
    const response = await app.request(ticket());
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { success: false, error: 'INTERNAL_SERVER_ERROR' });
  }
});

test('concurrent retries have one insert and original receipt; normalized ticket reaches storage', async t => {
  const adapter = memoryAdapter();
  const app = await serve(adapter);
  t.after(() => app.close());
  const base = ticket();
  delete base.legs[0].marginDelta;
  const results = await Promise.all(Array.from({ length: 8 }, () => app.request(base)));
  assert.ok(results.every(r => r.status === 200));
  assert.equal(results.filter(r => !r.body.idempotentReplay).length, 1);
  assert.equal(new Set(results.map(r => r.body.persistedAt)).size, 1);
  assert.equal(adapter.records.get(`${sourceId}:${base.ticketId}`).normalizedTicket.legs[0].marginDelta, '-0.5');
});