import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-care",
    email: "test@solpulsen.se",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

function createPublicContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
  return { ctx };
}

describe("CARE Platform - Auth", () => {
  it("returns null for unauthenticated user", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.name).toBe("Test User");
    expect(result?.email).toBe("test@solpulsen.se");
  });
});

describe("CARE Platform - Energy API", () => {
  it("spotPrices returns price data for valid area and date", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const today = new Date().toISOString().slice(0, 10);
    const result = await caller.energy.spotPrices({ area: "SE3", date: today });
    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    if (result.data.length > 0) {
      expect(result.data[0]).toHaveProperty("time");
      expect(result.data[0]).toHaveProperty("price");
      expect(typeof result.data[0].price).toBe("number");
    }
  }, 15000);

  it("weather returns forecast data", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.energy.weather({ lat: 59.3293, lon: 18.0686 });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("windSpeed");
    expect(result[0]).toHaveProperty("temperature");
  }, 15000);

  it("forecast returns combined forecast data", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.energy.forecast({ zone: "SE3" });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("date");
    expect(result).toHaveProperty("prices");
    expect(result).toHaveProperty("solar");
    expect(result).toHaveProperty("load");
    expect(result).toHaveProperty("summary");
    expect(result.summary).toHaveProperty("avg_price_sek");
    expect(result.summary).toHaveProperty("total_solar_kwh");
    expect(result.summary).toHaveProperty("total_load_kwh");
  }, 30000);
});

describe("CARE Platform - Router structure", () => {
  it("has all required routers", () => {
    const caller = appRouter.createCaller(createPublicContext().ctx);
    expect(caller.auth).toBeDefined();
    expect(caller.energy).toBeDefined();
    expect(caller.system).toBeDefined();
  });

  it("has all CARE-specific routers for authenticated users", () => {
    const caller = appRouter.createCaller(createAuthContext().ctx);
    expect(caller.configs).toBeDefined();
    expect(caller.devices).toBeDefined();
    expect(caller.tickets).toBeDefined();
    expect(caller.contracts).toBeDefined();
    expect(caller.warranties).toBeDefined();
    expect(caller.notifications).toBeDefined();
    expect(caller.optimization).toBeDefined();
    expect(caller.referrals).toBeDefined();
    expect(caller.scheduler).toBeDefined();
    expect(caller.savings).toBeDefined();
    expect(caller.reports).toBeDefined();
  });
});
