import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { WebhookHandlers } from "./webhookHandlers";
import { generalLimiter } from "./middlewares/rateLimit";
import { logger } from "./lib/logger";
import { zetaTicketRouter, zetaIngestionErrorMiddleware } from "./routes/zeta-ingestion";

const app: Express = express();

// Behind the Replit shared reverse proxy — trust the first hop so rate
// limiting keys on the real client IP instead of the proxy address.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Stripe webhook needs the raw Buffer — must be registered BEFORE express.json()
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature" });
      return;
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error) {
      logger.error({ err: error }, "Stripe webhook processing error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  },
);

app.use(cors({ credentials: true, origin: true }));
// Machine ingestion is isolated from Clerk, and must parse BEFORE the 256kb parser.
app.use(
  "/api/v1/tickets",
  generalLimiter,
  express.json({ limit: "10kb" }),
  zetaTicketRouter,
  zetaIngestionErrorMiddleware,
);
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", generalLimiter, router);

export default app;
