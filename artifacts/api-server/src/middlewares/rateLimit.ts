import rateLimit from "express-rate-limit";

const message = { error: "Too many requests — slow down and try again shortly." };

/** Broad safety net across the whole API surface. */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});

/** Settlement executions are financially sensitive — keep them slow. */
export const settleLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Settlement rate limit reached — a maximum of 10 settlement executions per minute is permitted.",
  },
});

/** Receipt submissions. */
export const submitLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Submission rate limit reached — a maximum of 30 receipt submissions per 5 minutes is permitted.",
  },
});

/** AI endpoints cost real money per call. */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "R0QQ3T is cooling down — try again in a minute.",
  },
});

/** Public, unauthenticated tracking endpoint. */
export const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});
