/**
 * SolPulsen Battery Optimization Engine v2.0
 * 
 * Multi-objective battery scheduling optimizer for Swedish market.
 * Handles:
 * - Spot price arbitrage (buy low / sell high)
 * - Peak shaving (effektavgift reduction)
 * - Self-consumption optimization (solar + battery)
 * - Battery degradation cost accounting
 * - Combined multi-objective scheduling
 */

import type { HourlyPrice, SolarForecast, LoadForecast, WeatherForecast } from "./dataFetcher";

// =============================================================================
// DATA MODELS
// =============================================================================

export interface BatteryConfig {
  capacity_kwh: number;
  max_power_kw: number;
  efficiency: number;       // Round-trip efficiency (0-1), default 0.92
  min_soc: number;          // Minimum SoC (0-1), default 0.10
  max_soc: number;          // Maximum SoC (0-1), default 0.95
  current_soc: number;      // Current state of charge (0-1)
  investment_sek: number;   // Total investment for degradation calc
  rated_cycles: number;     // Rated cycle life to 80% capacity
}

export interface GridTariff {
  operator_name: string;
  power_fee_sek_per_kw: number;
  peak_hours_start: number;
  peak_hours_end: number;
  night_discount: number;
  feed_in_tariff: number;
}

export interface ScheduleEntry {
  hour: number;
  action: "charge" | "discharge" | "hold";
  power_kw: number;
  soc_start: number;
  soc_end: number;
  spot_price: number;
  grid_import_kw: number;
  grid_export_kw: number;
  solar_kw: number;
  load_kw: number;
  cost_sek: number;
  reason: string;
}

export interface OptimizationResult {
  schedule: ScheduleEntry[];
  total_cost_sek: number;
  baseline_cost_sek: number;
  arbitrage_profit_sek: number;
  peak_shaving_value_sek: number;
  self_consumption_pct: number;
  max_grid_import_kw: number;
  degradation_cost_sek: number;
  net_savings_sek: number;
  charge_hours: { hour: number; price: number; power_kw: number }[];
  discharge_hours: { hour: number; price: number; power_kw: number }[];
  hold_hours: number[];
  summary: {
    total_hours: number;
    charge_hours_count: number;
    discharge_hours_count: number;
    hold_hours_count: number;
    avg_charge_price: number;
    avg_discharge_price: number;
    peak_reduction_kw: number;
    equivalent_cycles: number;
  };
  annual_projection: AnnualProjection;
}

export interface AnnualProjection {
  annual_arbitrage_sek: number;
  annual_peak_shaving_sek: number;
  annual_total_gross_sek: number;
  annual_degradation_cost_sek: number;
  annual_net_savings_sek: number;
  investment_sek: number;
  payback_years: number;
  npv_10y_sek: number;
  irr_percent: number;
  roi_10y_percent: number;
}

// =============================================================================
// DEFAULT CONFIGS
// =============================================================================

export const DEFAULT_BATTERY: BatteryConfig = {
  capacity_kwh: 15,
  max_power_kw: 5,
  efficiency: 0.92,
  min_soc: 0.10,
  max_soc: 0.95,
  current_soc: 0.50,
  investment_sek: 120000,
  rated_cycles: 6000,
};

export const DEFAULT_TARIFF: GridTariff = {
  operator_name: "Ellevio",
  power_fee_sek_per_kw: 55.0,
  peak_hours_start: 6,
  peak_hours_end: 22,
  night_discount: 0.50,
  feed_in_tariff: 6.0,
};

// =============================================================================
// CORE OPTIMIZATION ENGINE
// =============================================================================

export function optimizeBattery(
  prices: HourlyPrice[],
  battery: BatteryConfig,
  tariff: GridTariff | null = null,
  solar: SolarForecast[] | null = null,
  load: LoadForecast[] | null = null,
  peakLimitKw: number | null = null,
  minArbitrageSpread: number = 0.15
): OptimizationResult {
  if (!prices.length) {
    throw new Error("No price data provided");
  }

  // Determine total hours from price data (supports 24h or 48h)
  const totalHours = Math.max(...prices.map(p => p.hour)) + 1;
  const numHours = Math.min(totalHours, 48);

  // Default forecasts - match the hours in price data
  const priceHours = prices.map(p => p.hour);
  const solarData = solar || priceHours.map((h) => ({
    hour: h, production_kw: 0, cloud_factor: 0, solar_elevation: 0, theoretical_max_kw: 0,
  }));
  const loadData = load || priceHours.map((h) => ({
    hour: h, consumption_kw: 2.0, base_load_kw: 2.0, heating_load_kw: 0, reason: "Default",
  }));

  // Build lookup maps
  const solarMap: Record<number, number> = {};
  for (const s of solarData) solarMap[s.hour] = s.production_kw;
  const loadMap: Record<number, number> = {};
  for (const l of loadData) loadMap[l.hour] = l.consumption_kw;
  const priceMap: Record<number, HourlyPrice> = {};
  for (const p of prices) priceMap[p.hour] = p;

  // Usable capacity
  const usableKwh = battery.capacity_kwh * (battery.max_soc - battery.min_soc);

  // Pre-calculate: identify cheap/expensive hours
  const sortedPrices = [...prices].sort((a, b) => a.price_sek - b.price_sek);
  const avgPrice = prices.reduce((sum, p) => sum + p.price_sek, 0) / prices.length;
  const hoursToCharge = Math.ceil(usableKwh / battery.max_power_kw);
  const cheapHours = new Set(sortedPrices.slice(0, hoursToCharge).map((p) => p.hour));
  const expensiveHours = new Set(sortedPrices.slice(-hoursToCharge).map((p) => p.hour));

  const chargeThreshold = sortedPrices[Math.min(hoursToCharge, sortedPrices.length - 1)].price_sek;
  const dischargeThreshold = sortedPrices[Math.max(0, sortedPrices.length - hoursToCharge)].price_sek;

  // Degradation cost per kWh
  const cycleCostSek = battery.investment_sek > 0
    ? battery.investment_sek / (battery.rated_cycles * usableKwh)
    : 0;

  // Minimum spread check
  const effectiveSpread = dischargeThreshold - chargeThreshold;
  const arbitrageViable = effectiveSpread > (minArbitrageSpread + cycleCostSek * 2);

  // Build schedule - iterate over all price hours (supports 0-23 or 0-47)
  const schedule: ScheduleEntry[] = [];
  let soc = battery.current_soc;
  const sortedHours = [...prices].sort((a, b) => a.hour - b.hour);

  for (const priceEntry of sortedHours) {
    const hour = priceEntry.hour;
    const price = priceEntry;
    const hourOfDay = hour % 24; // For time-of-use decisions

    const solarKw = solarMap[hour] ?? 0;
    const loadKw = loadMap[hour] ?? 0;
    const netLoad = loadKw - solarKw;

    // Decide action (use hourOfDay for time-based decisions)
    let { action, powerKw, reason } = decideAction(
      hourOfDay, price.price_sek, soc, netLoad, solarKw, loadKw,
      avgPrice, cheapHours, expensiveHours,
      chargeThreshold, dischargeThreshold,
      arbitrageViable, peakLimitKw, battery, tariff
    );

    // Constrain power
    powerKw = constrainPower(powerKw, soc, battery);

    // Update action based on constrained power
    if (powerKw > 0) action = "charge";
    else if (powerKw < 0) action = "discharge";
    else action = "hold";

    // Calculate new SoC
    const socStart = soc;
    if (powerKw > 0) {
      const energyStored = powerKw * battery.efficiency;
      soc = Math.min(battery.max_soc, soc + energyStored / battery.capacity_kwh);
    } else if (powerKw < 0) {
      const energyReleased = Math.abs(powerKw) / battery.efficiency;
      soc = Math.max(battery.min_soc, soc - energyReleased / battery.capacity_kwh);
    }

    // Grid flows
    let gridImport = 0;
    let gridExport = 0;
    if (powerKw > 0) {
      gridImport = netLoad + powerKw;
      gridExport = 0;
    } else if (powerKw < 0) {
      const dischargePower = Math.abs(powerKw);
      if (dischargePower >= netLoad) {
        gridImport = 0;
        gridExport = dischargePower - Math.max(0, netLoad);
      } else {
        gridImport = netLoad - dischargePower;
        gridExport = 0;
      }
    } else {
      gridImport = Math.max(0, netLoad);
      gridExport = Math.max(0, -netLoad);
    }

    // Cost
    let cost = gridImport * price.price_sek;
    if (gridExport > 0 && tariff) {
      cost -= gridExport * tariff.feed_in_tariff / 100; // feed_in_tariff in öre
    } else if (gridExport > 0) {
      cost -= gridExport * price.price_sek * 0.8;
    }

    schedule.push({
      hour,
      action,
      power_kw: Math.round(powerKw * 100) / 100,
      soc_start: Math.round(socStart * 1000) / 1000,
      soc_end: Math.round(soc * 1000) / 1000,
      spot_price: price.price_sek,
      grid_import_kw: Math.round(Math.max(0, gridImport) * 100) / 100,
      grid_export_kw: Math.round(Math.max(0, gridExport) * 100) / 100,
      solar_kw: Math.round(solarKw * 100) / 100,
      load_kw: Math.round(loadKw * 100) / 100,
      cost_sek: Math.round(cost * 100) / 100,
      reason,
    });
  }

  // Calculate results
  return calculateResults(schedule, prices, solarMap, loadMap, battery, tariff, usableKwh, cycleCostSek);
}

// =============================================================================
// DECISION ENGINE
// =============================================================================

function decideAction(
  hour: number,
  price: number,
  soc: number,
  netLoad: number,
  solarKw: number,
  loadKw: number,
  avgPrice: number,
  cheapHours: Set<number>,
  expensiveHours: Set<number>,
  chargeThreshold: number,
  dischargeThreshold: number,
  arbitrageViable: boolean,
  peakLimitKw: number | null,
  battery: BatteryConfig,
  tariff: GridTariff | null
): { action: "charge" | "discharge" | "hold"; powerKw: number; reason: string } {
  const maxCharge = battery.max_power_kw;
  const maxDischarge = -battery.max_power_kw;

  // --- Priority 1: Peak Shaving ---
  if (peakLimitKw !== null && netLoad > peakLimitKw) {
    const needed = netLoad - peakLimitKw;
    const dischargePower = Math.min(needed, battery.max_power_kw);
    if (soc > battery.min_soc + 0.05) {
      return {
        action: "discharge",
        powerKw: -dischargePower,
        reason: `Peak shaving: reducerar ${needed.toFixed(1)} kW överskott`,
      };
    }
  }

  // Pre-charge for upcoming peak
  if (peakLimitKw !== null && hour < 6 && soc < 0.8) {
    return {
      action: "charge",
      powerKw: maxCharge * 0.5,
      reason: "Förladdar inför höglasttid",
    };
  }

  // --- Priority 2: Self-consumption ---
  if (solarKw > loadKw) {
    const excess = solarKw - loadKw;
    if (soc < battery.max_soc - 0.02) {
      const chargePower = Math.min(excess, maxCharge);
      return {
        action: "charge",
        powerKw: chargePower,
        reason: `Lagrar solöverskott: ${excess.toFixed(1)} kW`,
      };
    }
  }

  // Use battery when solar insufficient and price above average
  if (solarKw > 0 && solarKw < loadKw && soc > battery.min_soc + 0.10) {
    const deficit = loadKw - solarKw;
    if (price > avgPrice * 0.9) {
      const dischargePower = Math.min(deficit, battery.max_power_kw);
      return {
        action: "discharge",
        powerKw: -dischargePower,
        reason: `Stödjer last med batteri: ${deficit.toFixed(1)} kW deficit`,
      };
    }
  }

  // --- Priority 3: Arbitrage ---
  if (arbitrageViable) {
    if (cheapHours.has(hour) && soc < battery.max_soc - 0.05) {
      if (price <= chargeThreshold) {
        return {
          action: "charge",
          powerKw: maxCharge,
          reason: `Arbitrage laddning: ${price.toFixed(2)} SEK/kWh (billigt)`,
        };
      }
    }

    if (expensiveHours.has(hour) && soc > battery.min_soc + 0.10) {
      if (price >= dischargeThreshold) {
        return {
          action: "discharge",
          powerKw: maxDischarge,
          reason: `Arbitrage urladdning: ${price.toFixed(2)} SEK/kWh (dyrt)`,
        };
      }
    }
  }

  // --- Priority 4: Time-of-use optimization ---
  if (tariff) {
    const isPeak = tariff.peak_hours_start <= hour && hour < tariff.peak_hours_end;
    if (!isPeak && soc < battery.max_soc - 0.10 && price < avgPrice * 0.85) {
      return {
        action: "charge",
        powerKw: maxCharge * 0.7,
        reason: `Nattladdning: låg tariff + pris ${price.toFixed(2)}`,
      };
    }
    if (isPeak && soc > battery.min_soc + 0.15 && price > avgPrice * 1.1) {
      return {
        action: "discharge",
        powerKw: maxDischarge * 0.7,
        reason: `Höglasttid urladdning: pris ${price.toFixed(2)}`,
      };
    }
  }

  // --- Default: Hold ---
  return { action: "hold", powerKw: 0, reason: "Ingen lönsam åtgärd identifierad" };
}

// =============================================================================
// CONSTRAINTS
// =============================================================================

function constrainPower(powerKw: number, soc: number, battery: BatteryConfig): number {
  if (powerKw > 0) {
    powerKw = Math.min(powerKw, battery.max_power_kw);
    const room = (battery.max_soc - soc) * battery.capacity_kwh;
    const maxEnergy = room / battery.efficiency;
    powerKw = Math.min(powerKw, maxEnergy);
    if (powerKw < 0.1) return 0;
  } else if (powerKw < 0) {
    powerKw = Math.max(powerKw, -battery.max_power_kw);
    const available = (soc - battery.min_soc) * battery.capacity_kwh * battery.efficiency;
    powerKw = Math.max(powerKw, -available);
    if (powerKw > -0.1) return 0;
  }
  return powerKw;
}

// =============================================================================
// RESULTS CALCULATION
// =============================================================================

function calculateResults(
  schedule: ScheduleEntry[],
  prices: HourlyPrice[],
  solarMap: Record<number, number>,
  loadMap: Record<number, number>,
  battery: BatteryConfig,
  tariff: GridTariff | null,
  usableKwh: number,
  cycleCostSek: number
): OptimizationResult {
  const totalCost = schedule.reduce((sum, e) => sum + e.cost_sek, 0);

  const totalChargeCost = schedule
    .filter((e) => e.action === "charge")
    .reduce((sum, e) => sum + e.power_kw * e.spot_price, 0);
  const totalDischargeRevenue = schedule
    .filter((e) => e.action === "discharge")
    .reduce((sum, e) => sum + Math.abs(e.power_kw) * e.spot_price, 0);
  const arbitrageProfit = totalDischargeRevenue * battery.efficiency - Math.abs(totalChargeCost);

  // Peak shaving value
  const maxGrid = Math.max(...schedule.map((e) => e.grid_import_kw), 0);
  const baselinePeak = Math.max(
    ...Array.from({ length: 24 }, (_, h) => (loadMap[h] ?? 0) - (solarMap[h] ?? 0)),
    0
  );
  const peakReduction = Math.max(0, baselinePeak - maxGrid);
  const peakValue = tariff ? peakReduction * tariff.power_fee_sek_per_kw : 0;

  // Self-consumption
  const totalSolar = Object.values(solarMap).reduce((a, b) => a + b, 0);
  const totalExport = schedule.reduce((sum, e) => sum + e.grid_export_kw, 0);
  const selfConsumption = totalSolar > 0 ? ((totalSolar - totalExport) / totalSolar) * 100 : 0;

  // Degradation
  const totalCycled = schedule.filter((e) => e.action !== "hold").reduce((sum, e) => sum + Math.abs(e.power_kw), 0);
  const equivCycles = usableKwh > 0 ? totalCycled / (2 * usableKwh) : 0;
  const degradationCost = equivCycles * usableKwh * cycleCostSek;

  // Baseline cost (no battery) - iterate over all price hours
  const baselineCost = prices.reduce((sum, p) => {
    const netLoad = Math.max(0, (loadMap[p.hour] ?? 0) - (solarMap[p.hour] ?? 0));
    return sum + netLoad * p.price_sek;
  }, 0);

  const netSavings = baselineCost - totalCost - degradationCost;

  const chargeHours = schedule
    .filter((e) => e.action === "charge")
    .map((e) => ({ hour: e.hour, price: e.spot_price, power_kw: e.power_kw }));
  const dischargeHours = schedule
    .filter((e) => e.action === "discharge")
    .map((e) => ({ hour: e.hour, price: e.spot_price, power_kw: Math.abs(e.power_kw) }));
  const holdHours = schedule.filter((e) => e.action === "hold").map((e) => e.hour);

  // Annual projection - normalize to daily if multi-day
  const numDays = Math.max(1, Math.ceil(schedule.length / 24));
  const dailySavings = netSavings / numDays;
  const annualProjection = calculateAnnualSavings(dailySavings, battery, tariff, peakReduction, usableKwh, cycleCostSek);

  return {
    schedule,
    total_cost_sek: Math.round(totalCost * 100) / 100,
    baseline_cost_sek: Math.round(baselineCost * 100) / 100,
    arbitrage_profit_sek: Math.round(Math.max(0, arbitrageProfit) * 100) / 100,
    peak_shaving_value_sek: Math.round(peakValue * 100) / 100,
    self_consumption_pct: Math.round(selfConsumption * 10) / 10,
    max_grid_import_kw: Math.round(maxGrid * 100) / 100,
    degradation_cost_sek: Math.round(degradationCost * 100) / 100,
    net_savings_sek: Math.round(netSavings * 100) / 100,
    charge_hours: chargeHours,
    discharge_hours: dischargeHours,
    hold_hours: holdHours,
    summary: {
      total_hours: schedule.length,
      charge_hours_count: chargeHours.length,
      discharge_hours_count: dischargeHours.length,
      hold_hours_count: holdHours.length,
      avg_charge_price: chargeHours.length > 0
        ? Math.round((chargeHours.reduce((sum, h) => sum + h.price, 0) / chargeHours.length) * 1000) / 1000
        : 0,
      avg_discharge_price: dischargeHours.length > 0
        ? Math.round((dischargeHours.reduce((sum, h) => sum + h.price, 0) / dischargeHours.length) * 1000) / 1000
        : 0,
      peak_reduction_kw: Math.round(peakReduction * 10) / 10,
      equivalent_cycles: Math.round(equivCycles * 1000) / 1000,
    },
    annual_projection: annualProjection,
  };
}

// =============================================================================
// FINANCIAL ANALYSIS
// =============================================================================

function calculateAnnualSavings(
  dailySavings: number,
  battery: BatteryConfig,
  tariff: GridTariff | null,
  peakReductionKw: number,
  usableKwh: number,
  cycleCostSek: number
): AnnualProjection {
  const annualArbitrage = dailySavings * 365;
  const annualPeakShaving = tariff && peakReductionKw > 0
    ? peakReductionKw * tariff.power_fee_sek_per_kw * 12
    : 0;

  const annualTotalGross = annualArbitrage + annualPeakShaving;
  const annualDegradation = 365 * cycleCostSek * usableKwh;
  const annualNet = annualTotalGross - annualDegradation;

  const investment = battery.investment_sek;
  const payback = annualNet > 0 ? investment / annualNet : 999;
  const npv = calculateNPV(investment, annualNet, 10, 0.05);
  const irr = calculateIRR(investment, annualNet, 10);
  const roi10y = investment > 0 ? ((annualNet * 10 - investment) / investment) * 100 : 0;

  return {
    annual_arbitrage_sek: Math.round(annualArbitrage),
    annual_peak_shaving_sek: Math.round(annualPeakShaving),
    annual_total_gross_sek: Math.round(annualTotalGross),
    annual_degradation_cost_sek: Math.round(annualDegradation),
    annual_net_savings_sek: Math.round(annualNet),
    investment_sek: Math.round(investment),
    payback_years: Math.round(payback * 10) / 10,
    npv_10y_sek: Math.round(npv),
    irr_percent: Math.round(irr * 10) / 10,
    roi_10y_percent: Math.round(roi10y),
  };
}

function calculateNPV(investment: number, annualCf: number, years: number, rate: number): number {
  let npv = -investment;
  for (let y = 1; y <= years; y++) {
    npv += annualCf / Math.pow(1 + rate, y);
  }
  return npv;
}

function calculateIRR(investment: number, annualCf: number, years: number): number {
  if (annualCf <= 0) return 0;
  let irr = 0.1;
  for (let i = 0; i < 100; i++) {
    let npv = -investment;
    let deriv = 0;
    for (let y = 1; y <= years; y++) {
      npv += annualCf / Math.pow(1 + irr, y);
      deriv -= (y * annualCf) / Math.pow(1 + irr, y + 1);
    }
    if (Math.abs(npv) < 0.01) return irr * 100;
    if (deriv === 0) break;
    irr -= npv / deriv;
  }
  return irr * 100;
}
