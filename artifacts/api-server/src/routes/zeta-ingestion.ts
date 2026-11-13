import { pool } from "@workspace/db";
import { createPostgresAdapter, createTicketRouter, ingestionErrorMiddleware } from "@workspace/zeta-ingestion";
import { logger } from "../lib/logger";

// Reuse the existing database pool; importing ZETA never creates another listener or pool.
const adapter = createPostgresAdapter(pool, { logger });
export const zetaTicketRouter = createTicketRouter(adapter, { logger });
export const zetaIngestionErrorMiddleware = ingestionErrorMiddleware;