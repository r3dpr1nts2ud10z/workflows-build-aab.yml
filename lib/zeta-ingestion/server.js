'use strict';

const express = require('express');
const pino = require('pino');
const { createTicketRouter, ingestionErrorMiddleware } = require('./routes/ticket-router');
const { validateCredentialStore } = require('./utils/ticket-auth');
const { createPostgresAdapter } = require('./adapters/postgres-adapter');
const { getPool } = require('./adapters/db-pool');

function createApp(adapter, options = {}) {
    if (!adapter || typeof adapter.atomicInsert !== 'function') {
        throw new TypeError('An ingestion storage adapter is required.');
    }
    const app = express();
    const routePath = options.routePath || '/api/v1/tickets';
    const routerOptions = {};
    if (options.credentialStore !== undefined) routerOptions.credentialStore = options.credentialStore;
    if (options.logger !== undefined) routerOptions.logger = options.logger;
    app.use(routePath, express.json({ limit: '10kb', strict: true }), createTicketRouter(adapter, routerOptions));
    app.use(ingestionErrorMiddleware);
    return app;
}

function parsePort(value) {
    if (!/^\d+$/.test(String(value))) throw new Error('PORT must be an integer.');
    const port = Number(value);
    if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
        throw new Error('PORT must be between 1 and 65535.');
    }
    return port;
}

async function verifyReadiness(pool, credentialStore) {
    await validateCredentialStore(credentialStore);
    const result = await pool.query(
        `SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = current_schema()
              AND table_name = 'ingested_tickets'
        ) AS table_exists`
    );
    if (result.rowCount !== 1 || result.rows?.[0]?.table_exists !== true) {
        throw new Error('Ingestion storage table is not available.');
    }
}

function closeServer(server) {
    return new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
    });
}

async function startServer(options = {}) {
    const logger = options.logger || pino({ name: 'zeta-ingestion' });
    const ownsPool = !options.pool;
    let pool;
    let server;
    let app;
    let port;
    try {
        port = parsePort(options.port ?? process.env.PORT ?? '3000');
        pool = options.pool || getPool({ logger });
        const credentialStore = options.credentialStore;
        await verifyReadiness(pool, credentialStore);
        const adapter = options.adapter || createPostgresAdapter(pool, { logger });
        app = createApp(adapter, { ...options, credentialStore, logger });
        const host = '0.0.0.0';
        await new Promise((resolve, reject) => {
            server = app.listen(port, host, resolve);
            server.once('error', reject);
        });
    } catch (error) {
        if (server?.listening) {
            server.closeAllConnections?.();
            await closeServer(server).catch(() => {});
        }
        if (ownsPool && pool) await pool.end().catch(() => {});
        throw error;
    }
    logger.info({ event: 'zeta_ingestion_server_listening', port });

    let shutdownPromise;
    const shutdown = (reason = 'shutdown') => {
        if (shutdownPromise) return shutdownPromise;
        shutdownPromise = (async () => {
            logger.info({ event: 'zeta_ingestion_server_stopping', reason });
            const deadlineMs = options.shutdownDeadlineMs ?? 10000;
            let timer;
            const deadline = new Promise((_, reject) => {
                timer = setTimeout(() => {
                    server.closeAllConnections?.();
                    server.closeIdleConnections?.();
                    if (ownsPool && Array.isArray(pool._clients)) {
                        const endingPool = pool.end();
                        if (endingPool && typeof endingPool.catch === 'function') endingPool.catch(() => {});
                        for (const client of pool._clients) {
                            try {
                                const ending = client.end?.();
                                if (ending && typeof ending.catch === 'function') ending.catch(() => {});
                            } catch {}
                        }
                    }
                    reject(new Error('Graceful shutdown deadline exceeded.'));
                }, deadlineMs);
                timer.unref?.();
            });
            try {
                await Promise.race([
                    (async () => {
                        await closeServer(server);
                        if (ownsPool) await pool.end();
                    })(),
                    deadline
                ]);
                logger.info({ event: 'zeta_ingestion_server_stopped' });
            } finally {
                clearTimeout(timer);
            }
        })();
        return shutdownPromise;
    };
    return { app, server, pool, shutdown };
}

if (require.main === module) {
    let running;
    const startupLogger = pino({ name: 'zeta-ingestion' });
    startServer({ logger: startupLogger })
        .then((instance) => {
            running = instance;
            const stop = (signal) => {
                instance.shutdown(signal).catch(() => {
                    startupLogger.error({ event: 'zeta_ingestion_shutdown_failed' });
                    process.exitCode = 1;
                });
            };
            process.once('SIGTERM', () => stop('SIGTERM'));
            process.once('SIGINT', () => stop('SIGINT'));
        })
        .catch(() => {
            startupLogger.error({ event: 'zeta_ingestion_startup_failed' });
            process.exitCode = 1;
            if (running?.pool) running.pool.end().catch(() => {});
        });
}

module.exports = { createApp, startServer, verifyReadiness, parsePort };