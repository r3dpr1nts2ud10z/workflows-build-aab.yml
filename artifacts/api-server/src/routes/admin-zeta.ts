import { Router, type IRouter, type RequestHandler } from "express";
import { getTableName } from "drizzle-orm";
import { ingestedTicketsTable, pool } from "@workspace/db";
import {
  GetZetaOverviewResponse,
  GetZetaTicketQueryParams,
  GetZetaTicketResponse,
  ListZetaTicketsQueryParams,
  ListZetaTicketsResponse,
} from "@workspace/api-zod";
import { validateCredentialStore } from "@workspace/zeta-ingestion";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { logger } from "../lib/logger";

type QueryResult = { rows: Record<string, unknown>[] };
export type ZetaQuery = (
  text: string,
  values?: readonly unknown[],
) => Promise<QueryResult>;

export interface AdminZetaDependencies {
  query?: ZetaQuery;
  credentialConfigured?: () => boolean;
  guards?: [RequestHandler, RequestHandler];
  logStorageFailure?: () => void;
}

const tableName = getTableName(ingestedTicketsTable);

class MalformedStorageError extends Error {}

function realCredentialConfigured(): boolean {
  try {
    validateCredentialStore(process.env.ZETA_CREDENTIAL_STORE);
    return true;
  } catch {
    return false;
  }
}

function isoTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  throw new MalformedStorageError("Malformed ZETA timestamp");
}

function ticketSummary(row: Record<string, unknown>) {
  return {
    sourceId: row.source_id,
    ticketId: row.ticket_id,
    payloadHash: row.payload_hash,
    createdAt: isoTimestamp(row.created_at),
    receipt: row.receipt,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function isMissingStorage(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "42P01"
  );
}

function sendStorageError(
  res: Parameters<RequestHandler>[1],
  error: unknown,
  logStorageFailure: () => void,
) {
  logStorageFailure();
  if (isMissingStorage(error)) {
    res.status(503).json({ error: "ZETA storage not initialized" });
    return;
  }
  if (error instanceof MalformedStorageError) {
    res.status(500).json({ error: "Malformed ZETA storage record" });
    return;
  }
  res.status(500).json({ error: "Unable to read ZETA storage" });
}

export function createAdminZetaRouter(
  dependencies: AdminZetaDependencies = {},
): IRouter {
  const router: IRouter = Router();
  const query: ZetaQuery =
    dependencies.query ??
    ((text, values) =>
      pool.query(text, values ? Array.from(values) : undefined) as Promise<QueryResult>);
  const credentialConfigured =
    dependencies.credentialConfigured ?? realCredentialConfigured;
  const logStorageFailure =
    dependencies.logStorageFailure ??
    (() => logger.error({ event: "admin_zeta_storage_read_failed" }));
  const [authGuard, adminGuard] = dependencies.guards ?? [
    requireAuth,
    requireAdmin,
  ];

  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  router.get(
    "/admin/zeta/overview",
    authGuard,
    adminGuard,
    async (_req, res): Promise<void> => {
      try {
        const [statsResult, sourcesResult] = await Promise.all([
          query(
            `SELECT
               count(*)::text AS total_tickets,
               count(DISTINCT source_id)::text AS total_sources,
               count(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::text
                 AS ingested_last_24h,
               max(created_at) AS last_received_at
             FROM ${tableName}`,
          ),
          query(
            `SELECT source_id, count(*)::text AS ticket_count,
                    max(created_at) AS last_received_at
             FROM ${tableName}
             GROUP BY source_id
             ORDER BY max(created_at) DESC NULLS LAST, source_id ASC
             LIMIT $1`,
            [100],
          ),
        ]);
        const stats = statsResult.rows[0];
        if (!stats) throw new MalformedStorageError("Malformed ZETA aggregate");
        const response = GetZetaOverviewResponse.safeParse({
          totalTickets: stats.total_tickets,
          totalSources: stats.total_sources,
          ingestedLast24h: stats.ingested_last_24h,
          lastReceivedAt: isoTimestamp(stats.last_received_at),
          credentialConfigured: credentialConfigured(),
          sources: sourcesResult.rows.map((row) => ({
            sourceId: row.source_id,
            ticketCount: row.ticket_count,
            lastReceivedAt: isoTimestamp(row.last_received_at),
          })),
        });
        if (!response.success) {
          res.status(500).json({ error: "Malformed ZETA storage record" });
          return;
        }
        res.json(response.data);
      } catch (error) {
        sendStorageError(res, error, logStorageFailure);
      }
    },
  );

  router.get(
    "/admin/zeta/tickets",
    authGuard,
    adminGuard,
    async (req, res): Promise<void> => {
      const parsed = ListZetaTicketsQueryParams.safeParse(req.query);
      if (
        !parsed.success ||
        !Number.isSafeInteger(parsed.data.page) ||
        !Number.isSafeInteger(parsed.data.pageSize) ||
        !Number.isSafeInteger((parsed.data.page - 1) * parsed.data.pageSize)
      ) {
        res.status(400).json({ error: "Invalid ZETA ticket query" });
        return;
      }
      const { sourceId, ticketId, page, pageSize } = parsed.data;
      const where: string[] = [];
      const values: unknown[] = [];
      if (sourceId !== undefined) {
        values.push(sourceId);
        where.push(`source_id = $${values.length}`);
      }
      if (ticketId !== undefined) {
        values.push(`%${escapeLike(ticketId)}%`);
        where.push(`ticket_id LIKE $${values.length} ESCAPE '\\'`);
      }
      const clause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
      try {
        const countResult = await query(
          `SELECT count(*)::text AS total FROM ${tableName} ${clause}`,
          [...values],
        );
        values.push(pageSize, (page - 1) * pageSize);
        const rowsResult = await query(
          `SELECT source_id, ticket_id, payload_hash, receipt, created_at
           FROM ${tableName} ${clause}
           ORDER BY created_at DESC NULLS LAST, source_id ASC, ticket_id ASC
           LIMIT $${values.length - 1} OFFSET $${values.length}`,
          values,
        );
        const response = ListZetaTicketsResponse.safeParse({
          items: rowsResult.rows.map(ticketSummary),
          total: countResult.rows[0]?.total,
          page,
          pageSize,
        });
        if (!response.success) {
          res.status(500).json({ error: "Malformed ZETA storage record" });
          return;
        }
        res.json(response.data);
      } catch (error) {
        sendStorageError(res, error, logStorageFailure);
      }
    },
  );

  router.get(
    "/admin/zeta/ticket",
    authGuard,
    adminGuard,
    async (req, res): Promise<void> => {
      const parsed = GetZetaTicketQueryParams.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid ZETA ticket query" });
        return;
      }
      try {
        const result = await query(
          `SELECT source_id, ticket_id, payload_hash, receipt,
                  normalized_ticket, created_at
           FROM ${tableName}
           WHERE source_id = $1 AND ticket_id = $2
           LIMIT 1`,
          [parsed.data.sourceId, parsed.data.ticketId],
        );
        const row = result.rows[0];
        if (!row) {
          res.status(404).json({ error: "ZETA ticket not found" });
          return;
        }
        const response = GetZetaTicketResponse.safeParse({
          ...ticketSummary(row),
          normalizedTicket: row.normalized_ticket,
        });
        if (!response.success) {
          res.status(500).json({ error: "Malformed ZETA storage record" });
          return;
        }
        res.json(response.data);
      } catch (error) {
        sendStorageError(res, error, logStorageFailure);
      }
    },
  );

  return router;
}

export default createAdminZetaRouter();