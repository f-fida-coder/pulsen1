import { describe, it, expect } from "vitest";
import {
  calculateBaselineCost,
  calculateActualCost,
  calculateScheduleChargingSavings,
  calculateConfidence,
  estimateRoiFromActionType,
} from "./roiService";

// ─── calculateBaselineCost ────────────────────────────────────────────────────

describe("calculateBaselineCost", () => {
  it("calculates cost correctly for 10 kWh at 100 öre/kWh", () => {
    // 10 000 Wh / 1000 * 100 öre = 1000 öre
    expect(calculateBaselineCost(10_000, 100)).toBe(1000);
  });

  it("calculates cost for 5 kWh at 160 öre/kWh", () => {
    // 5000 / 1000 * 160 = 800 öre
    expect(calculateBaselineCost(5_000, 160)).toBe(800);
  });

  it("returns 0 for 0 Wh", () => {
    expect(calculateBaselineCost(0, 100)).toBe(0);
  });

  it("rounds correctly for fractional kWh", () => {
    // 1500 Wh / 1000 * 100 = 150 öre
    expect(calculateBaselineCost(1_500, 100)).toBe(150);
  });
});

// ─── calculateActualCost ──────────────────────────────────────────────────────

describe("calculateActualCost", () => {
  it("calculates actual cost for 3 kWh grid import at 60 öre/kWh", () => {
    // 3000 / 1000 * 60 = 180 öre
    expect(calculateActualCost(3_000, 60)).toBe(180);
  });

  it("returns 0 for 0 Wh import", () => {
    expect(calculateActualCost(0, 100)).toBe(0);
  });
});

// ─── calculateScheduleChargingSavings ────────────────────────────────────────

describe("calculateScheduleChargingSavings", () => {
  it("calculates savings for 5 kWh shifted from 160 to 60 öre/kWh", () => {
    // diff = 100 öre, 5 kWh * 100 = 500 öre
    const result = calculateScheduleChargingSavings(5_000, 160, 60);
    expect(result.savingsSek).toBe(500);
    expect(result.savingsKwh).toBe(5_000);
  });

  it("returns 0 savings when peak <= offpeak", () => {
    const result = calculateScheduleChargingSavings(5_000, 60, 80);
    expect(result.savingsSek).toBe(0);
  });

  it("calculates correctly for 10 kWh shifted", () => {
    // diff = 50 öre, 10 kWh * 50 = 500 öre
    const result = calculateScheduleChargingSavings(10_000, 150, 100);
    expect(result.savingsSek).toBe(500);
    expect(result.savingsKwh).toBe(10_000);
  });
});

// ─── calculateConfidence ─────────────────────────────────────────────────────

describe("calculateConfidence", () => {
  it("returns 0 when no data", () => {
    expect(calculateConfidence(null, null, 4)).toBe(0);
  });

  it("returns 50 with price data only (1 data point)", () => {
    const priceWindow = { avgPriceOrePerKwh: 100, peakPriceOrePerKwh: 150, offpeakPriceOrePerKwh: 60, dataPoints: 1 };
    expect(calculateConfidence(priceWindow, null, 4)).toBe(50);
  });

  it("returns 60 with price data and sufficient data points", () => {
    // dataPoints >= windowHours (4 >= 4) → +10
    const priceWindow = { avgPriceOrePerKwh: 100, peakPriceOrePerKwh: 150, offpeakPriceOrePerKwh: 60, dataPoints: 4 };
    expect(calculateConfidence(priceWindow, null, 4)).toBe(60);
  });

  it("returns 80 with both price and energy data", () => {
    const priceWindow = { avgPriceOrePerKwh: 100, peakPriceOrePerKwh: 150, offpeakPriceOrePerKwh: 60, dataPoints: 1 };
    const energyWindow = { totalGridImportWh: 3000, totalGridExportWh: 0, totalConsumptionWh: 5000, totalProductionWh: 2000, avgBatterySoc: 50, dataPoints: 1 };
    expect(calculateConfidence(priceWindow, energyWindow, 4)).toBe(80);
  });

  it("returns 100 with both data and sufficient data points", () => {
    const priceWindow = { avgPriceOrePerKwh: 100, peakPriceOrePerKwh: 150, offpeakPriceOrePerKwh: 60, dataPoints: 8 };
    const energyWindow = { totalGridImportWh: 3000, totalGridExportWh: 0, totalConsumptionWh: 5000, totalProductionWh: 2000, avgBatterySoc: 50, dataPoints: 32 };
    expect(calculateConfidence(priceWindow, energyWindow, 4)).toBe(100);
  });

  it("never exceeds 100", () => {
    const priceWindow = { avgPriceOrePerKwh: 100, peakPriceOrePerKwh: 150, offpeakPriceOrePerKwh: 60, dataPoints: 100 };
    const energyWindow = { totalGridImportWh: 3000, totalGridExportWh: 0, totalConsumptionWh: 5000, totalProductionWh: 2000, avgBatterySoc: 50, dataPoints: 100 };
    expect(calculateConfidence(priceWindow, energyWindow, 4)).toBeLessThanOrEqual(100);
  });
});

// ─── estimateRoiFromActionType ────────────────────────────────────────────────

describe("estimateRoiFromActionType", () => {
  it("estimates schedule_charging with default 5 kWh", () => {
    const result = estimateRoiFromActionType("schedule_charging", null);
    // 5 kWh * (160 - 60) öre = 500 öre savings
    expect(result.savingsSek).toBe(500);
    expect(result.savingsKwh).toBe(5000);
    expect(result.estimated).toBe(true);
    expect(result.confidence).toBe(20);
  });

  it("estimates schedule_charging with custom 10 kWh", () => {
    const result = estimateRoiFromActionType("schedule_charging", { shifted_kwh: 10 });
    // 10 kWh * 100 öre = 1000 öre
    expect(result.savingsSek).toBe(1000);
    expect(result.savingsKwh).toBe(10_000);
  });

  it("estimates optimize_battery", () => {
    const result = estimateRoiFromActionType("optimize_battery", null);
    expect(result.savingsSek).toBeGreaterThan(0);
    expect(result.estimated).toBe(true);
  });

  it("estimates sell_excess", () => {
    const result = estimateRoiFromActionType("sell_excess", null);
    expect(result.savingsSek).toBeGreaterThan(0);
    expect(result.estimated).toBe(true);
  });

  it("returns zero ROI for unknown action type", () => {
    const result = estimateRoiFromActionType("view_forecast", null);
    expect(result.savingsSek).toBe(0);
    expect(result.savingsKwh).toBe(0);
    expect(result.confidence).toBe(0);
  });

  it("returns zero ROI for custom type", () => {
    const result = estimateRoiFromActionType("custom", null);
    expect(result.savingsSek).toBe(0);
  });

  it("baseline > actual for schedule_charging (AI saves money)", () => {
    const result = estimateRoiFromActionType("schedule_charging", null);
    expect(result.baselineCostSek).toBeGreaterThan(result.actualCostSek);
  });
});

// ─── Integration: savings = baseline - actual ─────────────────────────────────

describe("ROI calculation integration", () => {
  it("savings equals baseline minus actual cost", () => {
    const consumptionWh = 8_000;
    const gridImportWh = 3_000;
    const avgPrice = 100;

    const baseline = calculateBaselineCost(consumptionWh, avgPrice);
    const actual = calculateActualCost(gridImportWh, avgPrice);
    const savings = Math.max(0, baseline - actual);

    expect(savings).toBe(500); // (8000 - 3000) / 1000 * 100 = 500 öre
  });

  it("savings is 0 when grid import equals consumption (no battery effect)", () => {
    const consumptionWh = 5_000;
    const gridImportWh = 5_000;
    const avgPrice = 100;

    const baseline = calculateBaselineCost(consumptionWh, avgPrice);
    const actual = calculateActualCost(gridImportWh, avgPrice);
    const savings = Math.max(0, baseline - actual);

    expect(savings).toBe(0);
  });
});
