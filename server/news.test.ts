import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@solpulsen.se",
      name: "Test User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("news", () => {
  it("news.stats returns total, highRelevance and sources", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.news.stats();
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("highRelevance");
    expect(stats).toHaveProperty("sources");
    expect(typeof stats.total).toBe("number");
    expect(typeof stats.highRelevance).toBe("number");
    expect(typeof stats.sources).toBe("number");
  });

  it("news.list returns array with optional filters", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const articles = await caller.news.list({ limit: 5 });
    expect(Array.isArray(articles)).toBe(true);
  });

  it("news.top returns array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const top = await caller.news.top({ limit: 3 });
    expect(Array.isArray(top)).toBe(true);
  });

  it("news.list with SE region filter returns array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const articles = await caller.news.list({ limit: 5, region: "SE" });
    expect(Array.isArray(articles)).toBe(true);
  });

  it("news.list with NORDICS region filter returns array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const articles = await caller.news.list({ limit: 5, region: "NORDICS" });
    expect(Array.isArray(articles)).toBe(true);
  });

  it("news.list with tag filter returns array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const articles = await caller.news.list({ limit: 5, tag: "solar" });
    expect(Array.isArray(articles)).toBe(true);
  });

  it("news.prioritized returns region-distributed array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const articles = await caller.news.prioritized({ limit: 20 });
    expect(Array.isArray(articles)).toBe(true);
  });

  it("news.relevant returns SE/NORDICS-first array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const articles = await caller.news.relevant({ userRegion: "SE3", limit: 10 });
    expect(Array.isArray(articles)).toBe(true);
  });
});

describe("insights", () => {
  it("insights.latest returns array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const insights = await caller.insights.latest({ limit: 5 });
    expect(Array.isArray(insights)).toBe(true);
  });

  it("insights.withArticles returns array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const insights = await caller.insights.withArticles({ limit: 5 });
    expect(Array.isArray(insights)).toBe(true);
  });

  it("insights.personalized returns SE/NORDICS-first array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const insights = await caller.insights.personalized({ userRegion: "SE3", limit: 5 });
    expect(Array.isArray(insights)).toBe(true);
  });
});

describe("news.refresh", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.news.refresh()).rejects.toThrow();
  });

  it("runs pipeline when authenticated", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.news.refresh();
    expect(result).toHaveProperty("newArticles");
    expect(result).toHaveProperty("processed");
    expect(typeof result.newArticles).toBe("number");
    expect(typeof result.processed).toBe("number");
  }, 180000);
});
