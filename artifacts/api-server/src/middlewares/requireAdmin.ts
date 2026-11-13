import type { Request, Response, NextFunction } from "express";
import { authedUserId } from "./requireAuth";
import { getOrCreateUser } from "../lib/users";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

export async function requireAdmin(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = await getOrCreateUser(authedUserId(res));
  if (!isAdminEmail(user.email)) {
    res.status(403).json({ error: "Operator access only." });
    return;
  }
  next();
}
