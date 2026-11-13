import assert from "node:assert/strict";
import { after, test } from "node:test";
import type { AddressInfo } from "node:net";
import express, { type RequestHandler } from "express";
import {
  createAdminZetaRouter,
  type ZetaQuery,
} from "./admin-zeta";

const allow: RequestHandler = (_req, _res, next) => next();
const fixtureReceipt = {
  computedFinancials: {
    stakeScaled: "1000000",
    oddsScaled: "2500000",
    payoutScaled: "2500000",
  },
  normalizedLegsCount: 1,
  persistedAt: "2026-01-01T00:00:00.000Z",
};
const fixtureRow = {
  source_id: "source-a",
  ticket_id: "ticket_100%",
  payload_hash: "a".repeat(64),
  receipt: fixtureReceipt,
  normalized_ticket: {
    ticketId: "ticket_100%",
    timestamp: "2026-01-01T00:00:00.000Z",
    stake: "1",
    totalOdds: "2.5",
    potentialPayout: "2.5",
    legs: [
      {
        legId: "leg-1",
        eventSlug: "event",
        market: "points",
        targetValue: "10",
        actualValue: "9.5",
        marginDelta: "-0.5",
        status: "LOSS",
      },
    ],
  },
  created_at: new Date("2026-01-01T00:00:00.000Z"),
};

async function request(
  query: ZetaQuery,
  path: string,
  guards: [RequestHandler, RequestHandler] = [allow, allow],
) {
  const app = express();
  app.use(
    createAdminZetaRouter({
      query,
      guards,
      logStorageFailure: () => undefined,
    }),
  );
  const server = app.listen(0);
  after(() => server.close());
  const { port } = server.address() as AddressInfo;
  return fetch(`http://127.0.0.1:${port}${path}`);
}

test("admin ZETA routes preserve auth guard failures and no-store", async () => {
  let called = false;
  const deny: RequestHandler = (_req, res) => {
    res.status(401).json({ error: "Unauthorized" });
  };
  const response = await request(
    async () => {
      called = true;
      return { rows: [] };
    },
    "/admin/zeta/overview",
    [deny, allow],
  );
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(called, false);
});

test("list filters escape wildcards and apply string-safe pagination", async () => {
  const calls: Array<{ text: string; values?: readonly unknown[] }> = [];
  const response = await request(
    async (text, values) => {
      calls.push({ text, values });
      return text.includes("count(*)::text")
        ? { rows: [{ total: "101" }] }
        : { rows: [fixtureRow] };
    },
    "/admin/zeta/tickets?sourceId=source-a&ticketId=ticket_100%25&page=2&pageSize=25",
  );
  assert.equal(response.status, 200);
  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(body.total, "101");
  assert.equal(body.page, 2);
  assert.deepEqual(calls[0]?.values, ["source-a", "%ticket\\_100\\%%"]);
  assert.deepEqual(calls[1]?.values, [
    "source-a",
    "%ticket\\_100\\%%",
    25,
    25,
  ]);
});

test("list rejects unsafe page and offset integers without querying storage", async () => {
  let calls = 0;
  const query: ZetaQuery = async () => {
    calls += 1;
    return { rows: [] };
  };
  const unsafePage = await request(
    query,
    "/admin/zeta/tickets?page=9007199254740992&pageSize=1",
  );
  assert.equal(unsafePage.status, 400);

  const unsafeOffset = await request(
    query,
    "/admin/zeta/tickets?page=9007199254740991&pageSize=100",
  );
  assert.equal(unsafeOffset.status, 400);
  assert.equal(calls, 0);
});

test("detail returns 404 and malformed stored rows return explicit 500", async () => {
  const missing = await request(
    async () => ({ rows: [] }),
    "/admin/zeta/ticket?sourceId=source-a&ticketId=missing",
  );
  assert.equal(missing.status, 404);

  const malformed = await request(
    async () => ({ rows: [{ ...fixtureRow, receipt: { bad: true } }] }),
    "/admin/zeta/ticket?sourceId=source-a&ticketId=ticket",
  );
  assert.equal(malformed.status, 500);
  assert.deepEqual(await malformed.json(), {
    error: "Malformed ZETA storage record",
  });
});

test("missing table is an explicit 503 without leaking SQL errors", async () => {
  const response = await request(
    async () => {
      throw Object.assign(new Error("relation private_detail does not exist"), {
        code: "42P01",
      });
    },
    "/admin/zeta/overview",
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "ZETA storage not initialized",
  });
});