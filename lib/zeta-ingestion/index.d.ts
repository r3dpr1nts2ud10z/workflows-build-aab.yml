import type { Router, ErrorRequestHandler } from 'express';
import type { Pool } from 'pg';

export interface Receipt {
  computedFinancials: { stakeScaled: string; oddsScaled: string; payoutScaled: string };
  normalizedLegsCount: number;
  persistedAt: string;
}
export interface StoredTicket {
  sourceId: string;
  ticketId: string;
  payloadHash: string;
  receipt: Receipt;
  normalizedTicket: Record<string, unknown>;
}
export interface StorageAdapter {
  atomicInsert(storageKey: string, record: StoredTicket): Promise<
    { inserted: true } |
    { inserted: false; existingRecord: Pick<StoredTicket, 'payloadHash' | 'receipt' | 'normalizedTicket'> }
  >;
}
export interface SafeLogger {
  error(context: Record<string, unknown>, message?: string): void;
}
export function createPostgresAdapter(pool: Pool, options?: { logger?: SafeLogger }): StorageAdapter;
export function createTicketRouter(adapter: StorageAdapter, options?: {
  credentialStore?: string;
  logger?: SafeLogger;
}): Router;
export const ingestionErrorMiddleware: ErrorRequestHandler;
export function validateCredentialStore(raw?: string): Record<string, { authorizedSources: string[] }>;