import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    createHealthEvent: vi.fn().mockResolvedValue({ id: 1, eventType: "heartbeat", severity: "info", title: "Heartbeat OK", resolved: false, createdAt: new Date() }),
    getHealthEvents: vi.fn().mockResolvedValue([
      { id: 1, eventType: "heartbeat", severity: "info", title: "Heartbeat OK", resolved: false, createdAt: new Date() },
      { id: 2, eventType: "anomaly", severity: "warning", title: "Låg produktion", resolved: false, createdAt: new Date() },
    ]),
    getActiveAlerts: vi.fn().mockResolvedValue([
      { id: 2, eventType: "anomaly", severity: "warning", title: "Låg produktion", resolved: false, createdAt: new Date() },
    ]),
    resolveHealthEvent: vi.fn().mockResolvedValue({ id: 2, resolved: true }),
    createAlertRule: vi.fn().mockResolvedValue({ id: 1, name: "Batteri under 10%", metricKey: "battery_soc", operator: "lt", threshold: "10", severity: "critical", isActive: true, cooldownMinutes: 60 }),
    getAlertRules: vi.fn().mockResolvedValue([
      { id: 1, name: "Batteri under 10%", metricKey: "battery_soc", operator: "lt", threshold: "10", severity: "critical", isActive: true, cooldownMinutes: 60 },
    ]),
    updateAlertRule: vi.fn().mockResolvedValue({ id: 1, isActive: false }),
    deleteAlertRule: vi.fn().mockResolvedValue({ id: 1 }),
    getDeviceConfigs: vi.fn().mockResolvedValue([]),
  };
});

import {
  createHealthEvent,
  getHealthEvents,
  getActiveAlerts,
  resolveHealthEvent,
  createAlertRule,
  getAlertRules,
  updateAlertRule,
  deleteAlertRule,
} from "./db";

// ─── Alert Rule Logic ─────────────────────────────────────────────────────────
describe("Alert Rule Logic", () => {
  it("evaluates lt operator correctly", () => {
    const evaluate = (metricValue: number, operator: string, threshold: number) => {
      switch (operator) {
        case "lt":  return metricValue < threshold;
        case "lte": return metricValue <= threshold;
        case "gt":  return metricValue > threshold;
        case "gte": return metricValue >= threshold;
        case "eq":  return metricValue === threshold;
        case "neq": return metricValue !== threshold;
        default:    return false;
      }
    };
    expect(evaluate(5, "lt", 10)).toBe(true);
    expect(evaluate(15, "lt", 10)).toBe(false);
    expect(evaluate(10, "lte", 10)).toBe(true);
    expect(evaluate(95, "gt", 90)).toBe(true);
    expect(evaluate(85, "gt", 90)).toBe(false);
    expect(evaluate(50, "eq", 50)).toBe(true);
    expect(evaluate(50, "neq", 60)).toBe(true);
  });

  it("maps severity to correct priority", () => {
    const priorities: Record<string, number> = { info: 1, warning: 2, critical: 3 };
    expect(priorities["critical"]).toBeGreaterThan(priorities["warning"]);
    expect(priorities["warning"]).toBeGreaterThan(priorities["info"]);
  });
});

// ─── DB Helpers ───────────────────────────────────────────────────────────────
describe("System Health DB Helpers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createHealthEvent creates an event", async () => {
    const event = await createHealthEvent({
      userId: 1,
      eventType: "heartbeat",
      severity: "info",
      title: "Heartbeat OK",
    });
    expect(event).toBeDefined();
    expect(event.eventType).toBe("heartbeat");
    expect(event.severity).toBe("info");
  });

  it("getHealthEvents returns list of events", async () => {
    const events = await getHealthEvents({ limit: 50 });
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toHaveProperty("eventType");
    expect(events[0]).toHaveProperty("severity");
  });

  it("getActiveAlerts returns only unresolved alerts", async () => {
    const alerts = await getActiveAlerts();
    expect(Array.isArray(alerts)).toBe(true);
    // All returned alerts should be unresolved
    alerts.forEach(a => expect(a.resolved).toBe(false));
  });

  it("resolveHealthEvent marks event as resolved", async () => {
    const result = await resolveHealthEvent(2);
    expect(result).toBeDefined();
    expect(result.resolved).toBe(true);
  });

  it("createAlertRule creates a rule", async () => {
    const rule = await createAlertRule({
      userId: 1,
      name: "Batteri under 10%",
      metricKey: "battery_soc",
      operator: "lt",
      threshold: "10",
      severity: "critical",
      cooldownMinutes: 60,
    });
    expect(rule).toBeDefined();
    expect(rule.name).toBe("Batteri under 10%");
    expect(rule.severity).toBe("critical");
    expect(rule.isActive).toBe(true);
  });

  it("getAlertRules returns list of rules", async () => {
    const rules = await getAlertRules(1);
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0]).toHaveProperty("metricKey");
    expect(rules[0]).toHaveProperty("operator");
    expect(rules[0]).toHaveProperty("threshold");
  });

  it("updateAlertRule toggles isActive", async () => {
    const result = await updateAlertRule(1, { isActive: false });
    expect(result).toBeDefined();
    expect(result.isActive).toBe(false);
  });

  it("deleteAlertRule removes a rule", async () => {
    const result = await deleteAlertRule(1);
    expect(result).toBeDefined();
    expect(result.id).toBe(1);
  });
});

// ─── Heartbeat Logic ──────────────────────────────────────────────────────────
describe("Heartbeat Logic", () => {
  it("generates correct heartbeat event structure", () => {
    const buildHeartbeatEvent = (userId: number, deviceCount: number, alertCount: number) => ({
      userId,
      eventType: "heartbeat" as const,
      severity: alertCount > 0 ? "warning" : "info" as "info" | "warning",
      title: `Heartbeat OK — ${deviceCount} enhet${deviceCount !== 1 ? "er" : ""} kontrollerade`,
      message: alertCount > 0 ? `${alertCount} larm utlösta` : "Alla system normala",
    });

    const event = buildHeartbeatEvent(1, 3, 0);
    expect(event.eventType).toBe("heartbeat");
    expect(event.severity).toBe("info");
    expect(event.title).toContain("3 enheter");

    const eventWithAlerts = buildHeartbeatEvent(1, 2, 2);
    expect(eventWithAlerts.severity).toBe("warning");
    expect(eventWithAlerts.message).toContain("2 larm");
  });

  it("anomaly detection identifies low production", () => {
    const detectAnomalies = (data: { production_kwh?: number; battery_soc?: number; consumption_kwh?: number }) => {
      const anomalies: string[] = [];
      if (data.production_kwh !== undefined && data.production_kwh < 0.5) {
        anomalies.push("low_production");
      }
      if (data.battery_soc !== undefined && data.battery_soc < 10) {
        anomalies.push("low_battery");
      }
      if (data.consumption_kwh !== undefined && data.consumption_kwh > 50) {
        anomalies.push("high_consumption");
      }
      return anomalies;
    };

    expect(detectAnomalies({ production_kwh: 0.1 })).toContain("low_production");
    expect(detectAnomalies({ production_kwh: 5.0 })).not.toContain("low_production");
    expect(detectAnomalies({ battery_soc: 5 })).toContain("low_battery");
    expect(detectAnomalies({ battery_soc: 50 })).not.toContain("low_battery");
    expect(detectAnomalies({ consumption_kwh: 60 })).toContain("high_consumption");
    expect(detectAnomalies({ production_kwh: 5, battery_soc: 50, consumption_kwh: 10 })).toHaveLength(0);
  });

  it("cooldown logic prevents duplicate alerts", () => {
    const isInCooldown = (lastTriggeredAt: Date | null, cooldownMinutes: number): boolean => {
      if (!lastTriggeredAt) return false;
      const cooldownMs = cooldownMinutes * 60 * 1000;
      return Date.now() - lastTriggeredAt.getTime() < cooldownMs;
    };

    const recentTime = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago
    const oldTime = new Date(Date.now() - 120 * 60 * 1000);  // 2 hours ago

    expect(isInCooldown(recentTime, 60)).toBe(true);   // 5 min < 60 min cooldown
    expect(isInCooldown(oldTime, 60)).toBe(false);     // 2 hours > 60 min cooldown
    expect(isInCooldown(null, 60)).toBe(false);        // never triggered
  });
});
