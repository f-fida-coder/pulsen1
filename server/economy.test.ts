import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAuthContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      email: "test@solpulsen.se",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("Economy backend procedures", () => {
  it("optimization.list returns an array", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.optimization.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("optimization.latest returns null or an object", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.optimization.latest();
    expect(result === null || result === undefined || typeof result === "object").toBe(true);
  });

  it("reports.list returns an array", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.reports.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("optimization.run executes and returns forecast + optimization", { timeout: 15000 }, async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.optimization.run({
      zone: "SE3",
      panelKwp: 10,
      batteryCapacity: 15,
      batteryPower: 5,
    });
    expect(result).toHaveProperty("forecast");
    expect(result).toHaveProperty("optimization");
    expect(result.optimization).toHaveProperty("net_savings_sek");
    expect(result.optimization).toHaveProperty("schedule");
    expect(result.optimization).toHaveProperty("annual_projection");
    expect(typeof result.optimization.net_savings_sek).toBe("number");
  });
});
