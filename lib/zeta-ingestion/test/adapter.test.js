'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createPostgresAdapter } = require('../adapters/postgres-adapter');

function record() {
    return {
        sourceId: 'source',
        ticketId: 'ticket',
        payloadHash: 'hash',
        receipt: { id: 'receipt' },
        normalizedTicket: { ticketId: 'ticket' }
    };
}

function fakePool(results, hooks = {}) {
    const queries = [];
    const client = {
        async query(sql, params) {
            queries.push({ sql, params });
            if (hooks.query) return hooks.query(sql, params, queries.length);
            const next = results.shift();
            if (next instanceof Error) throw next;
            return next || { rowCount: null, rows: [] };
        },
        release(error) {
            hooks.release?.(error);
        }
    };
    return { connect: async () => client, queries };
}

test('atomic insert explicitly commits before reporting success', async () => {
    const pool = fakePool([{ rowCount: null }, { rowCount: 1, rows: [{}] }, { rowCount: null }]);
    const result = await createPostgresAdapter(pool).atomicInsert('source:ticket', record());
    assert.deepEqual(result, { inserted: true });
    assert.match(pool.queries[0].sql, /READ COMMITTED/);
    assert.match(pool.queries.at(-1).sql, /COMMIT/);
    assert.deepEqual(pool.queries[1].params.slice(0, 4), ['source:ticket', 'source', 'ticket', 'hash']);
});

test('conflict returns the single existing normalized row', async () => {
    const row = { payload_hash: 'old', receipt: { id: 'old' }, normalized_ticket: { old: true } };
    const pool = fakePool([
        { rowCount: null },
        { rowCount: 0, rows: [] },
        { rowCount: 1, rows: [row] },
        { rowCount: null }
    ]);
    const result = await createPostgresAdapter(pool).atomicInsert('source:ticket', record());
    assert.equal(result.inserted, false);
    assert.deepEqual(result.existingRecord.normalizedTicket, { old: true });
    assert.match(pool.queries.at(-1).sql, /COMMIT/);
});

test('missing conflict row rolls back and fails explicitly', async () => {
    const pool = fakePool([
        { rowCount: null },
        { rowCount: 0, rows: [] },
        { rowCount: 0, rows: [] },
        { rowCount: null }
    ]);
    await assert.rejects(
        createPostgresAdapter(pool).atomicInsert('source:ticket', record()),
        /IDEMPOTENCY_RACE_ERROR/
    );
    assert.match(pool.queries.at(-1).sql, /ROLLBACK/);
});

test('rollback failure discards connection but preserves original error', async () => {
    const original = Object.assign(new Error('original'), { code: '23505' });
    const rollback = new Error('rollback');
    let releasedWith;
    const events = [];
    const pool = fakePool([], {
        query: async (sql) => {
            if (/^BEGIN/.test(sql)) return { rowCount: null };
            if (/ROLLBACK/.test(sql)) throw rollback;
            throw original;
        },
        release: (error) => {
            releasedWith = error;
        }
    });
    await assert.rejects(
        createPostgresAdapter(pool, { logger: { error: (event) => events.push(event) } })
            .atomicInsert('source:ticket', record()),
        (error) => error === original
    );
    assert.equal(releasedWith, rollback);
    assert.deepEqual(events.at(-1), { event: 'postgres_atomic_insert_failed', sqlState: '23505' });
});

test('invalid storage key fails before obtaining a connection', async () => {
    let connected = false;
    const pool = { connect: async () => { connected = true; } };
    await assert.rejects(
        createPostgresAdapter(pool).atomicInsert('wrong', record()),
        /INVALID_STORAGE_KEY/
    );
    assert.equal(connected, false);
});