'use strict';

const { getPool } = require('./db-pool');

function safeDatabaseEvent(logger, eventName, error) {
    if (!logger?.error) return;
    const event = { event: eventName };
    if (typeof error?.code === 'string' && /^[A-Z0-9]{5}$/.test(error.code)) {
        event.sqlState = error.code;
    }
    logger.error(event);
}

function createPostgresAdapter(pool, { logger } = {}) {
    if (!pool || typeof pool.connect !== 'function') {
        throw new TypeError('A PostgreSQL-compatible pool is required.');
    }
    return {
        async atomicInsert(storageKey, record) {
            if (!record || storageKey !== `${record.sourceId}:${record.ticketId}`) {
                throw new Error('INVALID_STORAGE_KEY: storageKey must equal sourceId:ticketId.');
            }
            const client = await pool.connect();
            let transactionStarted = false;
            let releaseError;
            try {
                await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
                transactionStarted = true;
                const inserted = await client.query(
                    `INSERT INTO ingested_tickets
                        (storage_key, source_id, ticket_id, payload_hash, receipt, normalized_ticket, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())
                     ON CONFLICT (source_id, ticket_id) DO NOTHING
                     RETURNING payload_hash, receipt, normalized_ticket, created_at`,
                    [
                        storageKey,
                        record.sourceId,
                        record.ticketId,
                        record.payloadHash,
                        JSON.stringify(record.receipt),
                        JSON.stringify(record.normalizedTicket)
                    ]
                );
                if (inserted.rowCount !== 0 && inserted.rowCount !== 1) {
                    throw new Error('STORAGE_INVARIANT_ERROR: Insert returned an unexpected row count.');
                }
                if (inserted.rowCount === 0) {
                    const existing = await client.query(
                        `SELECT payload_hash, receipt, normalized_ticket
                         FROM ingested_tickets
                         WHERE source_id = $1 AND ticket_id = $2`,
                        [record.sourceId, record.ticketId]
                    );
                    if (existing.rowCount !== 1 || !Array.isArray(existing.rows) || existing.rows.length !== 1) {
                        throw new Error('IDEMPOTENCY_RACE_ERROR: Conflicting record could not be retrieved during resolution.');
                    }
                    await client.query('COMMIT');
                    transactionStarted = false;
                    const row = existing.rows[0];
                    return {
                        inserted: false,
                        existingRecord: {
                            payloadHash: row.payload_hash,
                            receipt: row.receipt,
                            normalizedTicket: row.normalized_ticket
                        }
                    };
                }
                await client.query('COMMIT');
                transactionStarted = false;
                return { inserted: true };
            } catch (error) {
                if (transactionStarted) {
                    try {
                        await client.query('ROLLBACK');
                    } catch (rollbackError) {
                        releaseError = rollbackError;
                        safeDatabaseEvent(logger, 'postgres_transaction_rollback_failed', rollbackError);
                    }
                }
                safeDatabaseEvent(logger, 'postgres_atomic_insert_failed', error);
                throw error;
            } finally {
                client.release(releaseError);
            }
        }
    };
}

const pgPoolAdapter = {
    atomicInsert(storageKey, record) {
        return createPostgresAdapter(getPool(), {}).atomicInsert(storageKey, record);
    }
};

module.exports = { createPostgresAdapter, pgPoolAdapter };