'use strict';

let pool;

function boundedInteger(name, fallback, minimum, maximum) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return fallback;
    if (!/^\d+$/.test(raw)) throw new Error(`${name} must be an integer.`);
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
        throw new Error(`${name} is outside the supported range.`);
    }
    return value;
}

function getPool({ logger } = {}) {
    if (pool) return pool;
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required for PostgreSQL ingestion storage.');
    }
    const { Pool } = require('pg');
    const poolLogger = logger || require('pino')({ name: 'zeta-ingestion-postgres' });
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: boundedInteger('ZETA_DB_POOL_MAX', 10, 1, 50),
        connectionTimeoutMillis: boundedInteger('ZETA_DB_CONNECT_TIMEOUT_MS', 5000, 100, 60000),
        idleTimeoutMillis: boundedInteger('ZETA_DB_IDLE_TIMEOUT_MS', 30000, 1000, 600000)
    });
    const createdPool = pool;
    pool.once('end', () => {
        if (pool === createdPool) pool = undefined;
    });
    pool.on('error', (error) => {
        const event = { event: 'postgres_pool_idle_error' };
        if (typeof error?.code === 'string' && /^[A-Z0-9]{5}$/.test(error.code)) {
            event.sqlState = error.code;
        }
        poolLogger.error(event);
    });
    return pool;
}

module.exports = { getPool };