/**
 * roiService.ts
 * Calculates financial ROI for AI actions.
 *
 * All monetary values are stored as integers in öre (1 SEK = 100 öre).
 * All energy values are stored as integers in Wh.
 * Confidence 0–100: reflects data quality (100 = fully measured, 0 = no data).
 */

import { getDb } from "./db";
import {
  priceTimeseries,
  energyTimeseries,
  actions,
} from "../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoiResult {
  baselineCostSek: number;   // öre
  actualCostSek: number;     // öre
  savingsSek: number;        // öre (positive = saved money)
  savingsKwh: number;        // Wh (positive = saved energy)
  confidence: number;        // 0–100
  estimated: boolean;        // true if no real data, false if measured
}

export interface PriceWindow {
  avgPriceOrePerKwh: number;
  peakPriceOrePerKwh: number;
  offpeakPriceOrePerKwh: number;
  dataPoints: number;
}

export interface EnergyWindow {
  totalGridImportWh: number;
  totalGridExportWh: number;
  totalConsumptionWh: number;
  totalProductionWh: number;
  avgBatterySoc: number;
  dataPoints: number;
}

// ─── Price helpers ────────────────────────────────────────────────────────────

/**
 * Fetch price data for a time window from DB.
 * Returns null if no data found (triggers estimated fallback).
 */
export async function getPriceWindow(
  region: string,
  from: Date,
  to: Date
): Promise<PriceWindow | null> {
  const db = await getDb();
  if (!db) return null;

  const regionEnum = (["SE1", "SE2", "SE3", "SE4"].includes(region)
    ? region
    : "SE3") as "SE1" | "SE2" | "SE3" | "SE4";

  const rows = await db
    .select()
    .from(priceTimeseries)
    .where(
      and(
        eq(priceTimeseries.region, regionEnum),
        gte(priceTimeseries.timestamp, from),
        lte(priceTimeseries.timestamp, to)
      )
    )
    .orderBy(priceTimeseries.timestamp);

  if (rows.length === 0) return null;

  const prices = rows.map((r) => r.priceSekPerKwh);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const peak = Math.max(...prices);
  const offpeak = Math.min(...prices);

  return {
    avgPriceOrePerKwh: avg,
    peakPriceOrePerKwh: peak,
    offpeakPriceOrePerKwh: offpeak,
    dataPoints: rows.length,
  };
}

/**
 * Fetch energy data for a user in a time window.
 */
export async function getEnergyWindow(
  userId: number,
  from: Date,
  to: Date
): Promise<EnergyWindow | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(energyTimeseries)
    .where(
      and(
        eq(energyTimeseries.userId, userId),
        gte(energyTimeseries.timestamp, from),
        lte(energyTimeseries.timestamp, to)
      )
    )
    .orderBy(energyTimeseries.timestamp);

  if (rows.length === 0) return null;

  const totalGridImportWh = rows.reduce((s, r) => s + (r.gridImportWh ?? 0), 0);
  const totalGridExportWh = rows.reduce((s, r) => s + (r.gridExportWh ?? 0), 0);
  const totalConsumptionWh = rows.reduce((s, r) => s + (r.consumptionWh ?? 0), 0);
  const totalProductionWh = rows.reduce((s, r) => s + (r.productionWh ?? 0), 0);
  const socRows = rows.filter((r) => r.batterySocPercent != null);
  const avgBatterySoc =
    socRows.length > 0
      ? Math.round(
          socRows.reduce((s, r) => s + (r.batterySocPercent ?? 0), 0) /
            socRows.length
        )
      : 50;

  return {
    totalGridImportWh,
    totalGridExportWh,
    totalConsumptionWh,
    totalProductionWh,
    avgBatterySoc,
    dataPoints: rows.length,
  };
}

// ─── Baseline cost (without AI) ───────────────────────────────────────────────

/**
 * Baseline: assume no optimization — all consumption comes from grid at avg price.
 * baseline_cost = consumption_Wh / 1000 * avg_price_ore/kWh
 */
export function calculateBaselineCost(
  consumptionWh: number,
  avgPriceOrePerKwh: number
): number {
  return Math.round((consumptionWh / 1000) * avgPriceOrePerKwh);
}

// ─── Actual cost (with AI action) ─────────────────────────────────────────────

/**
 * Actual: use real grid import after action.
 * actual_cost = grid_import_Wh / 1000 * avg_price_ore/kWh
 */
export function calculateActualCost(
  gridImportWh: number,
  avgPriceOrePerKwh: number
): number {
  return Math.round((gridImportWh / 1000) * avgPriceOrePerKwh);
}

// ─── Schedule charging savings (v1 simplified) ────────────────────────────────

/**
 * For schedule_charging: savings = (peak_price - offpeak_price) * shifted_kWh
 * shifted_kWh is extracted from action payload or estimated from battery capacity.
 */
export function calculateScheduleChargingSavings(
  shiftedWh: number,
  peakPriceOrePerKwh: number,
  offpeakPriceOrePerKwh: number
): { savingsSek: number; savingsKwh: number } {
  const priceDiff = Math.max(0, peakPriceOrePerKwh - offpeakPriceOrePerKwh);
  const savingsSek = Math.round((shiftedWh / 1000) * priceDiff);
  return { savingsSek, savingsKwh: shiftedWh };
}

// ─── Confidence score ─────────────────────────────────────────────────────────

/**
 * Confidence 0–100 based on data availability:
 * - 50 base if price data exists
 * - +30 if energy data exists
 * - +20 if both have sufficient data points (>= 4 per hour window)
 */
export function calculateConfidence(
  priceWindow: PriceWindow | null,
  energyWindow: EnergyWindow | null,
  windowHours: number
): number {
  let score = 0;
  if (priceWindow && priceWindow.dataPoints > 0) {
    score += 50;
    if (priceWindow.dataPoints >= Math.max(1, windowHours)) score += 10;
  }
  if (energyWindow && energyWindow.dataPoints > 0) {
    score += 30;
    if (energyWindow.dataPoints >= Math.max(1, windowHours * 4)) score += 10;
  }
  return Math.min(100, score);
}

// ─── Estimated fallback (no real data) ────────────────────────────────────────

/**
 * When no real data is available, use Swedish average electricity prices
 * and typical battery optimization savings.
 * SE3 average: ~100 öre/kWh (2024 average)
 * Typical schedule_charging saving: 30–50 öre/kWh × 5–10 kWh = 150–500 öre
 */
export function estimateRoiFromActionType(
  actionType: string,
  actionPayload: Record<string, unknown> | null
): RoiResult {
  // Swedish 2024 average prices (öre/kWh)
  const SE3_AVG_PRICE = 100;
  const SE3_PEAK_PRICE = 160;
  const SE3_OFFPEAK_PRICE = 60;

  switch (actionType) {
    case "schedule_charging": {
      // Typical 5 kWh shifted from peak to offpeak
      const shiftedWh = (actionPayload?.shifted_kwh as number ?? 5) * 1000;
      const { savingsSek, savingsKwh } = calculateScheduleChargingSavings(
        shiftedWh,
        SE3_PEAK_PRICE,
        SE3_OFFPEAK_PRICE
      );
      return {
        baselineCostSek: Math.round((shiftedWh / 1000) * SE3_PEAK_PRICE),
        actualCostSek: Math.round((shiftedWh / 1000) * SE3_OFFPEAK_PRICE),
        savingsSek,
        savingsKwh,
        confidence: 20,
        estimated: true,
      };
    }
    case "optimize_battery": {
      // Typical 3 kWh optimized at 40 öre/kWh savings
      const optimizedWh = 3000;
      const savings = Math.round((optimizedWh / 1000) * 40);
      return {
        baselineCostSek: Math.round((optimizedWh / 1000) * SE3_AVG_PRICE),
        actualCostSek: Math.round((optimizedWh / 1000) * (SE3_AVG_PRICE - 40)),
        savingsSek: savings,
        savingsKwh: optimizedWh,
        confidence: 15,
        estimated: true,
      };
    }
    case "sell_excess":
    case "adjust_load": {
      // Typical 2 kWh shifted
      const shiftedWh = 2000;
      const savings = Math.round((shiftedWh / 1000) * 30);
      return {
        baselineCostSek: Math.round((shiftedWh / 1000) * SE3_AVG_PRICE),
        actualCostSek: Math.round((shiftedWh / 1000) * (SE3_AVG_PRICE - 30)),
        savingsSek: savings,
        savingsKwh: shiftedWh,
        confidence: 10,
        estimated: true,
      };
    }
    default:
      return {
        baselineCostSek: 0,
        actualCostSek: 0,
        savingsSek: 0,
        savingsKwh: 0,
        confidence: 0,
        estimated: true,
      };
  }
}

// ─── Main ROI calculator ──────────────────────────────────────────────────────

/**
 * Calculate ROI for an executed action.
 * Uses real data if available, falls back to estimates.
 *
 * @param actionId - DB id of the action
 * @param userId - user id for energy data lookup
 * @param actionType - type of action
 * @param actionPayload - action payload (may contain shifted_kwh, etc.)
 * @param executedAt - when the action was executed
 * @param region - electricity region (SE1-SE4), defaults to SE3
 */
export async function calculateActionRoi(
  actionId: number,
  userId: number,
  actionType: string,
  actionPayload: Record<string, unknown> | null,
  executedAt: Date,
  region = "SE3"
): Promise<RoiResult> {
  // Look at a 4-hour window around execution
  const windowMs = 4 * 60 * 60 * 1000;
  const from = new Date(executedAt.getTime() - windowMs);
  const to = new Date(executedAt.getTime() + windowMs);

  const [priceWindow, energyWindow] = await Promise.all([
    getPriceWindow(region, from, to),
    getEnergyWindow(userId, from, to),
  ]);

  const confidence = calculateConfidence(priceWindow, energyWindow, 8);

  // If we have both price and energy data → measured ROI
  if (priceWindow && energyWindow && energyWindow.dataPoints >= 2) {
    const baseline = calculateBaselineCost(
      energyWindow.totalConsumptionWh,
      priceWindow.avgPriceOrePerKwh
    );
    const actual = calculateActualCost(
      energyWindow.totalGridImportWh,
      priceWindow.avgPriceOrePerKwh
    );
    const savingsSek = Math.max(0, baseline - actual);
    const savingsKwh = Math.max(
      0,
      energyWindow.totalConsumptionWh - energyWindow.totalGridImportWh
    );

    return {
      baselineCostSek: baseline,
      actualCostSek: actual,
      savingsSek,
      savingsKwh,
      confidence,
      estimated: false,
    };
  }

  // If we only have price data → use schedule_charging simplified formula
  if (priceWindow && actionType === "schedule_charging") {
    const shiftedWh = (actionPayload?.shifted_kwh as number ?? 5) * 1000;
    const { savingsSek, savingsKwh } = calculateScheduleChargingSavings(
      shiftedWh,
      priceWindow.peakPriceOrePerKwh,
      priceWindow.offpeakPriceOrePerKwh
    );
    return {
      baselineCostSek: Math.round(
        (shiftedWh / 1000) * priceWindow.peakPriceOrePerKwh
      ),
      actualCostSek: Math.round(
        (shiftedWh / 1000) * priceWindow.offpeakPriceOrePerKwh
      ),
      savingsSek,
      savingsKwh,
      confidence: Math.min(confidence + 20, 70),
      estimated: true,
    };
  }

  // Fallback: estimate from action type
  return estimateRoiFromActionType(actionType, actionPayload);
}

// ─── ROI summary aggregation ──────────────────────────────────────────────────

export interface RoiSummary {
  totalSavingsSek: number;    // in öre
  totalSavingsKwh: number;    // in Wh
  executedActions: number;
  avgSavingsPerAction: number; // in öre
  measuredActions: number;
  estimatedActions: number;
}

export async function getRoiSummary(userId: number): Promise<RoiSummary> {
  const db = await getDb();
  if (!db) return { totalSavingsSek: 0, totalSavingsKwh: 0, executedActions: 0, avgSavingsPerAction: 0, measuredActions: 0, estimatedActions: 0 };

  const rows = await db
    .select()
    .from(actions)
    .where(
      and(
        eq(actions.userId, userId),
        eq(actions.status, "executed")
      )
    );

  const withRoi = rows.filter((r) => r.savingsSek != null);
  const totalSavingsSek = withRoi.reduce((s, r) => s + (r.savingsSek ?? 0), 0);
  const totalSavingsKwh = withRoi.reduce((s, r) => s + (r.savingsKwh ?? 0), 0);
  const measuredActions = withRoi.filter((r) => r.roiEstimated === false).length;
  const estimatedActions = withRoi.filter((r) => r.roiEstimated !== false).length;

  return {
    totalSavingsSek,
    totalSavingsKwh,
    executedActions: rows.length,
    avgSavingsPerAction: withRoi.length > 0 ? Math.round(totalSavingsSek / withRoi.length) : 0,
    measuredActions,
    estimatedActions,
  };
}

export interface RoiDailyPoint {
  date: string;       // YYYY-MM-DD
  savingsSek: number; // öre
  savingsKwh: number; // Wh
  actionCount: number;
}

export async function getRoiDaily(
  userId: number,
  from?: Date,
  to?: Date
): Promise<RoiDailyPoint[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    eq(actions.userId, userId),
    eq(actions.status, "executed"),
  ];
  if (from) conditions.push(gte(actions.executedAt, from) as any);
  if (to) conditions.push(lte(actions.executedAt, to) as any);

  const rows = await db
    .select()
    .from(actions)
    .where(and(...conditions))
    .orderBy(actions.executedAt);

  // Group by date
  const byDate = new Map<string, RoiDailyPoint>();
  for (const row of rows) {
    if (!row.executedAt) continue;
    const date = row.executedAt.toISOString().slice(0, 10);
    const existing = byDate.get(date) ?? { date, savingsSek: 0, savingsKwh: 0, actionCount: 0 };
    existing.savingsSek += row.savingsSek ?? 0;
    existing.savingsKwh += row.savingsKwh ?? 0;
    existing.actionCount += 1;
    byDate.set(date, existing);
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export interface RoiMonthlyPoint {
  month: string;      // YYYY-MM
  savingsSek: number; // öre
  savingsKwh: number; // Wh
  actionCount: number;
}

export async function getRoiMonthly(userId: number): Promise<RoiMonthlyPoint[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(actions)
    .where(
      and(
        eq(actions.userId, userId),
        eq(actions.status, "executed")
      )
    )
    .orderBy(actions.executedAt);

  const byMonth = new Map<string, RoiMonthlyPoint>();
  for (const row of rows) {
    if (!row.executedAt) continue;
    const month = row.executedAt.toISOString().slice(0, 7);
    const existing = byMonth.get(month) ?? { month, savingsSek: 0, savingsKwh: 0, actionCount: 0 };
    existing.savingsSek += row.savingsSek ?? 0;
    existing.savingsKwh += row.savingsKwh ?? 0;
    existing.actionCount += 1;
    byMonth.set(month, existing);
  }

  return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
}

// ─── Price data ingestion helper ──────────────────────────────────────────────

/**
 * Store spot prices from elprisetjustnu.se API into price_timeseries.
 * Called by the news engine cron or a dedicated price sync job.
 */
export async function storePriceData(
  region: "SE1" | "SE2" | "SE3" | "SE4",
  pricePoints: Array<{ timestamp: Date; priceOrePerKwh: number }>
): Promise<number> {
  const db = await getDb();
  if (!db || pricePoints.length === 0) return 0;

  let inserted = 0;
  for (const point of pricePoints) {
    try {
      await db.insert(priceTimeseries).values({
        timestamp: point.timestamp,
        region,
        priceSekPerKwh: point.priceOrePerKwh,
        source: "elprisetjustnu",
      });
      inserted++;
    } catch {
      // Ignore duplicates
    }
  }
  return inserted;
}

/**
 * Store energy readings from device into energy_timeseries.
 */
export async function storeEnergyData(
  userId: number,
  readings: Array<{
    timestamp: Date;
    consumptionWh?: number;
    productionWh?: number;
    batteryChargeWh?: number;
    batteryDischargeWh?: number;
    gridImportWh?: number;
    gridExportWh?: number;
    batterySocPercent?: number;
    source?: "solarman" | "modbus" | "manual" | "simulated";
  }>
): Promise<number> {
  const db = await getDb();
  if (!db || readings.length === 0) return 0;

  let inserted = 0;
  for (const r of readings) {
    try {
      await db.insert(energyTimeseries).values({
        timestamp: r.timestamp,
        userId,
        consumptionWh: r.consumptionWh ?? 0,
        productionWh: r.productionWh ?? 0,
        batteryChargeWh: r.batteryChargeWh ?? 0,
        batteryDischargeWh: r.batteryDischargeWh ?? 0,
        gridImportWh: r.gridImportWh ?? 0,
        gridExportWh: r.gridExportWh ?? 0,
        batterySocPercent: r.batterySocPercent,
        source: r.source ?? "simulated",
      });
      inserted++;
    } catch {
      // Ignore duplicates
    }
  }
  return inserted;
}
