/**
 * Device Controller Tests
 * Tests for BatteryController safety validation, Modbus frame building,
 * command normalization, and action payload routing.
 */
import { describe, it, expect } from "vitest";
import {
  validateBatteryCommand,
  normalizeActionToCommand,
  buildModbusWriteFrame,
  buildModbusReadFrame,
  commandToModbusFrames,
  AFORE_REGISTERS,
} from "./deviceController/batteryController";

const SAFE_CONFIG = {
  maxSocPercent: 95,
  minSocPercent: 10,
  maxChargePower: 5000,
  maxDischargePower: 5000,
};

// ─── Safety Validation ────────────────────────────────────────────────────────

describe("validateBatteryCommand – SoC target", () => {
  it("rejects SOC target above 100%", () => {
    const r = validateBatteryCommand({ command: "set_soc_target", params: { targetPercent: 101 } }, SAFE_CONFIG);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/SoC|soc/i);
  });

  it("rejects SOC target above device maxSocPercent (95)", () => {
    const r = validateBatteryCommand({ command: "set_soc_target", params: { targetPercent: 98 } }, SAFE_CONFIG);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/95/);
  });

  it("rejects SOC target below device minSocPercent (10)", () => {
    const r = validateBatteryCommand({ command: "set_soc_target", params: { targetPercent: 5 } }, SAFE_CONFIG);
    expect(r.valid).toBe(false);
  });

  it("accepts valid SOC target within range", () => {
    const r = validateBatteryCommand({ command: "set_soc_target", params: { targetPercent: 80 } }, SAFE_CONFIG);
    expect(r.valid).toBe(true);
  });

  it("accepts SOC target at exact max boundary", () => {
    const r = validateBatteryCommand({ command: "set_soc_target", params: { targetPercent: 95 } }, SAFE_CONFIG);
    expect(r.valid).toBe(true);
  });
});

describe("validateBatteryCommand – Power limits", () => {
  it("rejects charge power above device max", () => {
    const r = validateBatteryCommand({ command: "start_charging", params: { powerWatts: 8000 } }, SAFE_CONFIG);
    expect(r.valid).toBe(false);
  });

  it("accepts valid charge power", () => {
    const r = validateBatteryCommand({ command: "start_charging", params: { powerWatts: 3000 } }, SAFE_CONFIG);
    expect(r.valid).toBe(true);
  });

  it("rejects set_power_limit above charge max", () => {
    const r = validateBatteryCommand({ command: "set_power_limit", params: { chargeLimitWatts: 10000 } }, SAFE_CONFIG);
    expect(r.valid).toBe(false);
  });

  it("rejects set_power_limit above discharge max", () => {
    const r = validateBatteryCommand({ command: "set_power_limit", params: { dischargeLimitWatts: 10000 } }, SAFE_CONFIG);
    expect(r.valid).toBe(false);
  });

  it("accepts valid power limits", () => {
    const r = validateBatteryCommand({ command: "set_power_limit", params: { chargeLimitWatts: 3000, dischargeLimitWatts: 3000 } }, SAFE_CONFIG);
    expect(r.valid).toBe(true);
  });
});

describe("validateBatteryCommand – Simple commands", () => {
  it("accepts stop_charging with empty params", () => {
    const r = validateBatteryCommand({ command: "stop_charging", params: {} }, SAFE_CONFIG);
    expect(r.valid).toBe(true);
  });

  it("accepts get_status with empty params", () => {
    const r = validateBatteryCommand({ command: "get_status", params: {} }, SAFE_CONFIG);
    expect(r.valid).toBe(true);
  });
});

describe("validateBatteryCommand – Schedule charging time format", () => {
  it("rejects invalid start time format", () => {
    const r = validateBatteryCommand(
      { command: "schedule_charging", params: { startTime: "25:00", endTime: "06:00" } },
      SAFE_CONFIG
    );
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/tid|time/i);
  });

  it("rejects invalid end time format", () => {
    const r = validateBatteryCommand(
      { command: "schedule_charging", params: { startTime: "02:00", endTime: "99:99" } },
      SAFE_CONFIG
    );
    expect(r.valid).toBe(false);
  });

  it("accepts valid schedule_charging", () => {
    const r = validateBatteryCommand(
      { command: "schedule_charging", params: { startTime: "02:00", endTime: "06:00", powerWatts: 3000 } },
      SAFE_CONFIG
    );
    expect(r.valid).toBe(true);
  });

  it("accepts schedule_charging at midnight boundary", () => {
    const r = validateBatteryCommand(
      { command: "schedule_charging", params: { startTime: "00:00", endTime: "23:59" } },
      SAFE_CONFIG
    );
    expect(r.valid).toBe(true);
  });
});

// ─── Modbus Frame Builder ─────────────────────────────────────────────────────

describe("buildModbusWriteFrame", () => {
  it("builds correct write single register frame (FC06)", () => {
    const frame = buildModbusWriteFrame(1, AFORE_REGISTERS.SOC_TARGET_CHARGE, 80);
    expect(frame[0]).toBe(1);    // Unit ID
    expect(frame[1]).toBe(0x06); // Function code: Write Single Register
    expect(frame[2]).toBe((AFORE_REGISTERS.SOC_TARGET_CHARGE >> 8) & 0xff);
    expect(frame[3]).toBe(AFORE_REGISTERS.SOC_TARGET_CHARGE & 0xff);
    expect(frame[4]).toBe(0x00); // Value high byte
    expect(frame[5]).toBe(80);   // Value low byte
    expect(frame.length).toBe(8); // 6 bytes + 2 CRC
  });

  it("encodes value 0 correctly", () => {
    const frame = buildModbusWriteFrame(1, 0x0200, 0);
    expect(frame[4]).toBe(0x00);
    expect(frame[5]).toBe(0x00);
  });

  it("encodes value 100 correctly", () => {
    const frame = buildModbusWriteFrame(1, 0x0210, 100);
    expect(frame[5]).toBe(100);
  });
});

describe("buildModbusReadFrame", () => {
  it("builds correct read holding registers frame (FC03)", () => {
    const frame = buildModbusReadFrame(1, AFORE_REGISTERS.BATTERY_SOC, 2);
    expect(frame[0]).toBe(1);    // Unit ID
    expect(frame[1]).toBe(0x03); // Function code: Read Holding Registers
    expect(frame[4]).toBe(0x00); // Quantity high byte
    expect(frame[5]).toBe(2);    // Quantity low byte
    expect(frame.length).toBe(8);
  });
});

// ─── commandToModbusFrames ────────────────────────────────────────────────────

describe("commandToModbusFrames", () => {
  it("start_charging generates 2 frames (work mode + charge enable)", () => {
    const frames = commandToModbusFrames({ command: "start_charging", params: {} }, 1);
    expect(frames.length).toBe(2);
    expect(frames[0][1]).toBe(0x06); // Both are write frames
    expect(frames[1][1]).toBe(0x06);
  });

  it("stop_charging generates 1 frame", () => {
    const frames = commandToModbusFrames({ command: "stop_charging", params: {} }, 1);
    expect(frames.length).toBe(1);
  });

  it("set_soc_target generates 1 frame", () => {
    const frames = commandToModbusFrames({ command: "set_soc_target", params: { targetPercent: 80 } }, 1);
    expect(frames.length).toBe(1);
    expect(frames[0][5]).toBe(80); // Value = 80
  });

  it("schedule_charging generates 3 frames (start, end, enable)", () => {
    const frames = commandToModbusFrames(
      { command: "schedule_charging", params: { startTime: "02:00", endTime: "06:00" } },
      1
    );
    expect(frames.length).toBe(3);
  });

  it("get_status generates 1 read frame", () => {
    const frames = commandToModbusFrames({ command: "get_status", params: {} }, 1);
    expect(frames.length).toBe(1);
    expect(frames[0][1]).toBe(0x03); // Read function code
  });
});

// ─── normalizeActionToCommand ─────────────────────────────────────────────────

describe("normalizeActionToCommand", () => {
  it("optimize_battery → set_soc_target with targetSoc", () => {
    const cmd = normalizeActionToCommand("optimize_battery", { targetSoc: 85 });
    expect(cmd.command).toBe("set_soc_target");
    expect((cmd.params as { targetPercent: number }).targetPercent).toBe(85);
  });

  it("optimize_battery → set_soc_target with default 80 when no targetSoc", () => {
    const cmd = normalizeActionToCommand("optimize_battery", {});
    expect(cmd.command).toBe("set_soc_target");
    expect((cmd.params as { targetPercent: number }).targetPercent).toBe(80);
  });

  it("schedule_charging → schedule_charging with correct times", () => {
    const cmd = normalizeActionToCommand("schedule_charging", { startHour: "01:00", endHour: "05:00", powerWatts: 2000 });
    expect(cmd.command).toBe("schedule_charging");
    expect((cmd.params as { startTime: string }).startTime).toBe("01:00");
    expect((cmd.params as { endTime: string }).endTime).toBe("05:00");
  });

  it("schedule_charging → defaults to 02:00–06:00 when no times", () => {
    const cmd = normalizeActionToCommand("schedule_charging", {});
    expect((cmd.params as { startTime: string }).startTime).toBe("02:00");
    expect((cmd.params as { endTime: string }).endTime).toBe("06:00");
  });

  it("sell_excess → set_power_limit with dischargeLimitWatts", () => {
    const cmd = normalizeActionToCommand("sell_excess", { powerWatts: 4000 });
    expect(cmd.command).toBe("set_power_limit");
    expect((cmd.params as { dischargeLimitWatts: number }).dischargeLimitWatts).toBe(4000);
  });

  it("adjust_load → set_power_limit", () => {
    const cmd = normalizeActionToCommand("adjust_load", { powerWatts: 3000 });
    expect(cmd.command).toBe("set_power_limit");
  });

  it("monitor_risk → get_status", () => {
    const cmd = normalizeActionToCommand("monitor_risk", {});
    expect(cmd.command).toBe("get_status");
  });

  it("view_forecast → get_status (default fallback)", () => {
    const cmd = normalizeActionToCommand("view_forecast", {});
    expect(cmd.command).toBe("get_status");
  });

  it("unknown action → get_status", () => {
    const cmd = normalizeActionToCommand("unknown_action", {});
    expect(cmd.command).toBe("get_status");
  });
});
