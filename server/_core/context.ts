import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify } from "jose";
import { getUserById } from "../db";

export const COOKIE_NAME = "solpulsen_session";

// JWT secret — uses the platform-injected JWT_SECRET env var
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "solpulsen-secret-key-change-in-production"
);

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function authenticateSession(cookieValue: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(cookieValue, JWT_SECRET, {
      algorithms: ["HS256"],
    });
    const { userId } = payload as { userId?: number };
    if (!userId) return null;
    const user = await getUserById(userId);
    if (!user || !user.isActive) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Authenticate an Express request by reading the session cookie.
 * Used by REST routes (uploadRoute, reportRoute) that don't go through tRPC.
 */
export async function authenticateRequest(req: { headers: { cookie?: string } }): Promise<User | null> {
  try {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;
    const cookies = parseCookieHeader(cookieHeader);
    const sessionCookie = cookies[COOKIE_NAME];
    if (!sessionCookie) return null;
    return await authenticateSession(sessionCookie);
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const cookieHeader = opts.req.headers.cookie;
    if (cookieHeader) {
      const cookies = parseCookieHeader(cookieHeader);
      const sessionCookie = cookies[COOKIE_NAME];
      if (sessionCookie) {
        user = await authenticateSession(sessionCookie);
      }
    }
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
