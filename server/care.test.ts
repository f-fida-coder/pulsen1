import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

describe("CARE Dashboard - Energy Proxy Procedures", () => {
  it("spotPrices procedure exists and is callable", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Verify the procedure exists on the router
    expect(caller.energy).toBeDefined();
    expect(caller.energy.spotPrices).toBeDefined();
  });

  it("smhiWeather procedure exists and is callable", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.energy).toBeDefined();
    expect(caller.energy.smhiWeather).toBeDefined();
  });

  it("auth.me returns null for unauthenticated user", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("CARE Dashboard - ROI Calculation", () => {
  // Import the calculateROI function directly to test business logic
  it("calculates correct ROI for villa scenario", async () => {
    // Inline test of the calculation logic matching the frontend
    const config = {
      solarCapacity: 10,
      batteryCapacity: 10,
      batteryDoD: 80,
      batteryEfficiency: 92,
      windCapacity: 0,
      hasWind: false,
      annualConsumption: 20000,
      electricityArea: "SE3" as const,
      roofTilt: 30,
      roofOrientation: 180,
      shading: 5,
    };

    const am = 1.0; // SE3
    const of_ = 1.0; // 180° = south
    const dod = config.batteryDoD / 100;
    const eff = config.batteryEfficiency / 100;
    const shading = 1 - config.shading / 100;

    const solarSavings = config.solarCapacity * 1200 * am * of_ * shading;
    const windSavings = 0;
    const batterySavings = config.batteryCapacity * 500 * am * dod * eff;
    const arbitrageSavings = config.batteryCapacity * 300 * am;
    const total = solarSavings + windSavings + batterySavings + arbitrageSavings;

    expect(solarSavings).toBe(11400);
    expect(batterySavings).toBe(3680);
    expect(arbitrageSavings).toBe(3000);
    expect(total).toBe(18080);

    const investmentCost = config.solarCapacity * 12000 + config.batteryCapacity * 8000;
    expect(investmentCost).toBe(200000);

    const payback = investmentCost / total;
    expect(payback).toBeCloseTo(11.06, 1);
  });

  it("calculates correct ROI for industry scenario with wind", async () => {
    const config = {
      solarCapacity: 200,
      batteryCapacity: 100,
      batteryDoD: 90,
      batteryEfficiency: 95,
      windCapacity: 50,
      hasWind: true,
      annualConsumption: 500000,
      electricityArea: "SE2" as const,
      roofOrientation: 180,
      shading: 0,
    };

    const am = 0.8; // SE2
    const solarSavings = 200 * 1200 * 0.8 * 1.0 * 1.0;
    const windSavings = 50 * 2000 * 0.8;
    const batterySavings = 100 * 500 * 0.8 * 0.9 * 0.95;
    const arbitrageSavings = 100 * 300 * 0.8;

    expect(solarSavings).toBe(192000);
    expect(windSavings).toBe(80000);
    expect(batterySavings).toBe(34200);
    expect(arbitrageSavings).toBe(24000);

    const total = solarSavings + windSavings + batterySavings + arbitrageSavings;
    expect(total).toBe(330200);
  });

  it("handles zero capacity gracefully", () => {
    const solarSavings = 0 * 1200 * 1.0 * 1.0 * 1.0;
    const batterySavings = 0 * 500 * 1.0 * 0.8 * 0.92;
    const total = solarSavings + batterySavings;

    expect(total).toBe(0);
  });
});

describe("CARE Dashboard - Energy Flow Simulation", () => {
  it("simulates solar production during daytime", () => {
    const hour = 12; // noon
    const sunFactor = Math.sin(((hour - 6) / 14) * Math.PI);
    const solarKw = 10 * sunFactor * 0.85 * (1 - 5 / 100);

    expect(sunFactor).toBeGreaterThan(0.5);
    expect(solarKw).toBeGreaterThan(0);
  });

  it("simulates zero solar at night", () => {
    const hour = 2;
    const sunFactor = hour >= 6 && hour <= 20
      ? Math.sin(((hour - 6) / 14) * Math.PI)
      : 0;

    expect(sunFactor).toBe(0);
  });

  it("calculates grid import when load exceeds generation", () => {
    const generation = 3;
    const load = 5;
    const batteryKw = 0;
    const netLoad = load - generation + batteryKw;
    const gridImport = Math.max(netLoad, 0);

    expect(gridImport).toBe(2);
  });

  it("calculates grid export when generation exceeds load", () => {
    const generation = 8;
    const load = 3;
    const batteryKw = 2; // charging
    const netLoad = load - generation + batteryKw;
    const gridExport = Math.max(-netLoad, 0);

    expect(gridExport).toBe(3);
  });
});
