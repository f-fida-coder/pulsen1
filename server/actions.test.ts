import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): { ctx: TrpcContext; clearedCookies: any[] } {
  const clearedCookies: any[] = [];

  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user-action",
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
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("actions router", () => {
  // ─── actions.create ─────────────────────────────────────────────────
  describe("actions.create", () => {
    it("creates a new action for the authenticated user", async () => {
      const { ctx } = createAuthContext(999);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.actions.create({
        actionType: "optimize_battery",
        description: "Optimera batteriladdning baserat på elprisprognos",
        insightId: undefined,
        articleId: undefined,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      expect(result.actionType).toBe("optimize_battery");
      expect(result.status).toBe("pending");
    });

    it("rejects unauthenticated users", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.actions.create({
          actionType: "optimize_battery",
          description: "test",
        })
      ).rejects.toThrow();
    });
  });

  // ─── actions.user ───────────────────────────────────────────────────
  describe("actions.user", () => {
    it("returns actions for the authenticated user", async () => {
      const { ctx } = createAuthContext(999);
      const caller = appRouter.createCaller(ctx);

      // Create an action first
      await caller.actions.create({
        actionType: "schedule_charging",
        description: "Schemalägg laddning kl 02:00",
      });

      const actions = await caller.actions.user({ limit: 10 });
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThanOrEqual(1);

      const found = actions.find((a) => a.actionType === "schedule_charging");
      expect(found).toBeDefined();
      expect(found?.status).toBe("pending");
    });
  });

  // ─── actions.execute ────────────────────────────────────────────────
  describe("actions.execute", () => {
    it("executes a pending action and returns success", async () => {
      const { ctx } = createAuthContext(998);
      const caller = appRouter.createCaller(ctx);

      // Create action
      const created = await caller.actions.create({
        actionType: "view_forecast",
        description: "Visa prognos för SE3",
      });

      // Execute it
      const result = await caller.actions.execute({ actionId: created.id });
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();

      // Verify status changed
      const actions = await caller.actions.user({ limit: 50 });
      const executed = actions.find((a) => a.id === created.id);
      expect(executed?.status).toBe("executed");
    });
  });

  // ─── actions.approve ────────────────────────────────────────────────
  describe("actions.approve", () => {
    it("approves a pending action", async () => {
      const { ctx } = createAuthContext(997);
      const caller = appRouter.createCaller(ctx);

      const created = await caller.actions.create({
        actionType: "monitor_risk",
        description: "Övervaka prisrisk i SE3",
      });

      const result = await caller.actions.approve({ actionId: created.id });
      // updateActionStatus returns the updated row or null
      expect(result).toBeDefined();

      const actions = await caller.actions.user({ limit: 50 });
      const approved = actions.find((a) => a.id === created.id);
      expect(approved?.status).toBe("approved");
    });
  });

  // ─── actions.dismiss ────────────────────────────────────────────────
  describe("actions.dismiss", () => {
    it("dismisses a pending action", async () => {
      const { ctx } = createAuthContext(996);
      const caller = appRouter.createCaller(ctx);

      const created = await caller.actions.create({
        actionType: "optimize_battery",
        description: "Test dismiss",
      });

      const result = await caller.actions.dismiss({ actionId: created.id });
      // updateActionStatus returns the updated action row or null
      expect(result).toBeDefined();

      const actions = await caller.actions.user({ limit: 50 });
      const dismissed = actions.find((a) => a.id === created.id);
      expect(dismissed?.status).toBe("dismissed");
    });
  });

  //  // ─── actions.list (protected) ──────────────────────────────────
  describe("actions.list", () => {
    it("returns all actions for authenticated user", async () => {
      const { ctx } = createAuthContext(994);
      const caller = appRouter.createCaller(ctx);

      const actions = await caller.actions.list({ limit: 10 });
      expect(Array.isArray(actions)).toBe(true);
    });

    it("rejects unauthenticated users", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.actions.list({ limit: 10 })).rejects.toThrow();
    });
  });

  // ─── actions.autoTrigger ────────────────────────────────────────────
  describe("actions.autoTrigger", () => {
    it("auto-triggers actions based on high-relevance insights", async () => {
      const { ctx } = createAuthContext(995);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.actions.autoTrigger({ userRegion: "SE3" });
      expect(result).toBeDefined();
      expect(typeof result.triggered).toBe("number");
    });
  });
});
