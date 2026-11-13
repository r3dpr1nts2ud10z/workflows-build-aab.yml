import { runMigrations } from "stripe-replit-sync";
import app from "./app";
import { logger } from "./lib/logger";
import { seedAds } from "./routes/ads";
import { getStripeSync } from "./stripeClient";
import { reconcileStalePayouts } from "./routes/payouts";

/**
 * Initialize the Stripe schema, managed webhook, and data backfill.
 * Failures are logged loudly but don't take the whole API down —
 * payout routes fail explicitly if Stripe is unavailable.
 */
async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for Stripe integration");
  }
  await runMigrations({ databaseUrl });
  const stripeSync = await getStripeSync();
  const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
  await stripeSync.findOrCreateManagedWebhook(
    `${webhookBaseUrl}/api/stripe/webhook`,
  );
  stripeSync
    .syncBackfill()
    .then(() => logger.info("Stripe data synced"))
    .catch((err) => logger.error({ err }, "Stripe backfill failed"));
}

initStripe()
  .then(() => {
    logger.info("Stripe initialized");
    // Payout reconciler: finalize any withdrawal stuck between debit and
    // transfer (crash/timeout) — confirm paid or refund, deterministically.
    const runReconciler = () =>
      reconcileStalePayouts().catch((err) =>
        logger.error({ err }, "Payout reconciler pass failed"),
      );
    runReconciler();
    setInterval(runReconciler, 10 * 60 * 1000);
  })
  .catch((err) => logger.error({ err }, "Stripe initialization failed"));

seedAds().catch((err) => {
  logger.error({ err }, "Failed to seed ads");
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
