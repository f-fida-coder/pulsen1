import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
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
    } as TrpcContext["res"],
  };

  return { ctx };
}

// ─── ROI Calculation logic tests (pure functions) ────────────────────────────

describe("ROI calculation", () => {
  // Replicate the calculation logic from ROIPanel.tsx
  const AREA_MULTIPLIERS: Record<string, number> = {
    SE1: 0.6, SE2: 0.8, SE3: 1.0, SE4: 1.2,
  };

  function orientationFactor(deg: number): number {
    const diff = Math.abs(deg - 180);
    return 1.0 - (diff / 180) * 0.4;
  }

  function calculateROI(cfg: {
    solarCapacity: number;
    batteryCapacity: number;
    batteryDoD: number;
    batteryEfficiency: number;
    windCapacity: number;
    hasWind: boolean;
    electricityArea: string;
    roofOrientation: number;
    shading: number;
  }) {
    const am = AREA_MULTIPLIERS[cfg.electricityArea] ?? 1.0;
    const of = orientationFactor(cfg.roofOrientation);
    const dod = cfg.batteryDoD / 100;
    const eff = cfg.batteryEfficiency / 100;
    const shading = 1 - cfg.shading / 100;

    const solarSavings = cfg.solarCapacity * 1200 * am * of * shading;
    const windSavings = cfg.hasWind ? cfg.windCapacity * 2000 * am : 0;
    const batterySavings = cfg.batteryCapacity * 500 * am * dod * eff;
    const arbitrageSavings = cfg.batteryCapacity * 300 * am;
    const totalAnnualSavings = solarSavings + windSavings + batterySavings + arbitrageSavings;

    const solarCost = cfg.solarCapacity * 12000;
    const batteryCost = cfg.batteryCapacity * 8000;
    const windCost = cfg.hasWind ? cfg.windCapacity * 25000 : 0;
    const investmentCost = solarCost + batteryCost + windCost;

    const paybackYears = investmentCost > 0 ? investmentCost / totalAnnualSavings : 0;
    const roi20yr = investmentCost > 0 ? ((totalAnnualSavings * 20 - investmentCost) / investmentCost) * 100 : 0;

    return { solarSavings, windSavings, batterySavings, arbitrageSavings, totalAnnualSavings, investmentCost, paybackYears, roi20yr };
  }

  it("Villa SE3 – 10 kWp sol, 10 kWh batteri", () => {
    const result = calculateROI({
      solarCapacity: 10,
      batteryCapacity: 10,
      batteryDoD: 80,
      batteryEfficiency: 92,
      windCapacity: 0,
      hasWind: false,
      electricityArea: "SE3",
      roofOrientation: 180,
      shading: 5,
    });

    expect(result.solarSavings).toBeGreaterThan(10000);
    expect(result.batterySavings).toBeGreaterThan(2000);
    expect(result.windSavings).toBe(0);
    expect(result.totalAnnualSavings).toBeGreaterThan(15000);
    expect(result.paybackYears).toBeGreaterThan(5);
    expect(result.paybackYears).toBeLessThan(20);
  });

  it("BRF SE4 – 50 kWp sol, 30 kWh batteri", () => {
    const result = calculateROI({
      solarCapacity: 50,
      batteryCapacity: 30,
      batteryDoD: 85,
      batteryEfficiency: 94,
      windCapacity: 0,
      hasWind: false,
      electricityArea: "SE4",
      roofOrientation: 180,
      shading: 10,
    });

    // SE4 has higher multiplier (1.2)
    expect(result.solarSavings).toBeGreaterThan(60000);
    expect(result.totalAnnualSavings).toBeGreaterThan(80000);
  });

  it("Industri SE2 – 200 kWp sol, 50 kW vind, 100 kWh batteri", () => {
    const result = calculateROI({
      solarCapacity: 200,
      batteryCapacity: 100,
      batteryDoD: 90,
      batteryEfficiency: 95,
      windCapacity: 50,
      hasWind: true,
      electricityArea: "SE2",
      roofOrientation: 180,
      shading: 0,
    });

    expect(result.windSavings).toBeGreaterThan(0);
    expect(result.solarSavings).toBeGreaterThan(100000);
    expect(result.totalAnnualSavings).toBeGreaterThan(200000);
  });

  it("SE4 > SE3 for same system (higher price area)", () => {
    const se3 = calculateROI({ solarCapacity: 10, batteryCapacity: 10, batteryDoD: 80, batteryEfficiency: 92, windCapacity: 0, hasWind: false, electricityArea: "SE3", roofOrientation: 180, shading: 0 });
    const se4 = calculateROI({ solarCapacity: 10, batteryCapacity: 10, batteryDoD: 80, batteryEfficiency: 92, windCapacity: 0, hasWind: false, electricityArea: "SE4", roofOrientation: 180, shading: 0 });
    expect(se4.totalAnnualSavings).toBeGreaterThan(se3.totalAnnualSavings);
  });

  it("North orientation reduces solar savings", () => {
    const south = calculateROI({ solarCapacity: 10, batteryCapacity: 0, batteryDoD: 80, batteryEfficiency: 92, windCapacity: 0, hasWind: false, electricityArea: "SE3", roofOrientation: 180, shading: 0 });
    const north = calculateROI({ solarCapacity: 10, batteryCapacity: 0, batteryDoD: 80, batteryEfficiency: 92, windCapacity: 0, hasWind: false, electricityArea: "SE3", roofOrientation: 0, shading: 0 });
    expect(south.solarSavings).toBeGreaterThan(north.solarSavings);
  });
});

// ─── Auth logout test ─────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const ctx: TrpcContext = {
      user: {
        id: 1, openId: "test", email: null, name: null, loginMethod: null,
        role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });
});
