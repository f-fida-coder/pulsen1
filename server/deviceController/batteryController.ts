/**
 * BatteryController
 * Real device control for battery systems via Solarman OpenAPI or Modbus TCP.
 *
 * Architecture:
 *  executeBatteryCommand(deviceConfigId, cmd, actionId?)
 *    → load config from DB
 *    → validateCommand (safety limits)
 *    → route to solarmanExecute | modbusExecute
 *    → log result to device_logs
 *    → return BatteryResult
 *
 * Supported protocols: solarman, modbus_tcp, modbus_rtu
 * Supported commands: start_charging, stop_charging, schedule_charging,
 *                     set_soc_target, set_power_limit, get_status
 */

import net from "net";
import { getDb } from "../db";
import { deviceConfigs, deviceLogs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BatteryCommand =
  | { command: "start_charging"; params: { powerWatts?: number } }
  | { command: "stop_charging"; params: Record<string, never> | Record<string, unknown> }
  | { command: "schedule_charging"; params: { startTime: string; endTime: string; powerWatts?: number } }
  | { command: "set_soc_target"; params: { targetPercent: number } }
  | { command: "set_power_limit"; params: { chargeLimitWatts?: number; dischargeLimitWatts?: number } }
  | { command: "get_status"; params: Record<string, never> | Record<string, unknown> };

export interface BatteryResult {
  success: boolean;
  command: string;
  protocol: string;
  deviceSn?: string;
  rawResponse?: Record<string, unknown>;
  errorMessage?: string;
  executedAt: string;
  executionTimeMs: number;
}

// ─── Safety limits ────────────────────────────────────────────────────────────

const SAFETY = {
  MAX_SOC: 95,
  MIN_SOC: 10,
  MAX_CHARGE_POWER: 10000,   // 10 kW absolute ceiling
  MAX_DISCHARGE_POWER: 10000,
};

// ─── Internal validation (throws on violation) ────────────────────────────────

function validateCommand(
  cmd: BatteryCommand,
  config: { maxSocPercent: number | null; minSocPercent: number | null; maxChargePower: number | null; maxDischargePower: number | null }
): void {
  const maxSoc = Math.min(config.maxSocPercent ?? SAFETY.MAX_SOC, SAFETY.MAX_SOC);
  const minSoc = Math.max(config.minSocPercent ?? SAFETY.MIN_SOC, SAFETY.MIN_SOC);
  const maxCharge = Math.min(config.maxChargePower ?? SAFETY.MAX_CHARGE_POWER, SAFETY.MAX_CHARGE_POWER);
  const maxDischarge = Math.min(config.maxDischargePower ?? SAFETY.MAX_DISCHARGE_POWER, SAFETY.MAX_DISCHARGE_POWER);

  if (cmd.command === "set_soc_target") {
    const t = cmd.params.targetPercent;
    if (t < minSoc || t > maxSoc) {
      throw new Error(`SoC target ${t}% utanfor sakert intervall [${minSoc}–${maxSoc}%]`);
    }
  }
  if (cmd.command === "start_charging") {
    const p = (cmd.params as { powerWatts?: number }).powerWatts;
    if (p !== undefined && p > maxCharge) {
      throw new Error(`Laddeffekt ${p}W overstiger max ${maxCharge}W`);
    }
  }
  if (cmd.command === "set_power_limit") {
    const cl = cmd.params.chargeLimitWatts;
    const dl = cmd.params.dischargeLimitWatts;
    if (cl !== undefined && cl > maxCharge) {
      throw new Error(`Laddeffektgrans ${cl}W overstiger max ${maxCharge}W`);
    }
    if (dl !== undefined && dl > maxDischarge) {
      throw new Error(`Urladdningseffektgrans ${dl}W overstiger max ${maxDischarge}W`);
    }
  }
  if (cmd.command === "schedule_charging") {
    const p = (cmd.params as { powerWatts?: number }).powerWatts;
    if (p !== undefined && p > maxCharge) {
      throw new Error(`Laddeffekt ${p}W overstiger max ${maxCharge}W`);
    }
  }
}

// ─── Solarman OpenAPI ─────────────────────────────────────────────────────────

const SOLARMAN_BASE = "https://globalapi.solarmanpv.com";

async function solarmanRequest(
  path: string,
  token: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await fetch(`${SOLARMAN_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`Solarman API HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json() as Record<string, unknown>;
  if (data.code !== undefined && data.code !== 0 && data.code !== "0") {
    throw new Error(`Solarman API error ${data.code}: ${data.msg ?? "Unknown error"}`);
  }
  return data;
}

async function solarmanGetStatus(config: {
  solarmanToken: string;
  deviceSn: string;
}): Promise<Record<string, unknown>> {
  return solarmanRequest(
    "/device/v1.0/currentData",
    config.solarmanToken,
    { deviceSn: config.deviceSn }
  );
}

async function solarmanCustomCommand(
  config: { solarmanToken: string; deviceSn: string; loggerId?: string | null },
  registers: Array<{ address: number; value: number }>
): Promise<Record<string, unknown>> {
  // Solarman custom command API: write holding registers
  return solarmanRequest(
    "/device/v1.0/control",
    config.solarmanToken,
    {
      deviceSn: config.deviceSn,
      loggerId: config.loggerId ?? undefined,
      controlItems: registers.map(r => ({
        address: r.address,
        value: r.value,
        dataType: "U16",
      })),
    }
  );
}

// ─── Solarman register map (Afore/generic hybrid inverter) ────────────────────

const SOLARMAN_REGISTERS = {
  WORK_MODE: 0x0200,          // 0=Self-use, 1=Feed-in, 2=Backup, 3=Manual
  CHARGE_POWER: 0x0210,       // Charge power % (0-100)
  DISCHARGE_POWER: 0x0211,    // Discharge power % (0-100)
  SOC_TARGET_CHARGE: 0x0212,  // Upper SOC limit %
  SOC_TARGET_DISCHARGE: 0x0213, // Lower SOC limit %
  CHARGE_START_TIME1: 0x0250, // HH*100+MM
  CHARGE_END_TIME1: 0x0251,
  CHARGE_ENABLE: 0x0252,      // 0=disable, 1=enable
};

async function solarmanExecute(
  config: { solarmanToken: string; deviceSn: string; loggerId?: string | null; maxChargePower: number | null; maxDischargePower: number | null },
  cmd: BatteryCommand
): Promise<Record<string, unknown>> {
  const maxCharge = config.maxChargePower ?? 5000;

  switch (cmd.command) {
    case "get_status":
      return solarmanGetStatus({ solarmanToken: config.solarmanToken, deviceSn: config.deviceSn });

    case "start_charging": {
      const powerWatts = (cmd.params as { powerWatts?: number }).powerWatts ?? maxCharge;
      const powerPct = Math.round(Math.min((powerWatts / maxCharge) * 100, 100));
      return solarmanCustomCommand(config, [
        { address: SOLARMAN_REGISTERS.WORK_MODE, value: 3 },       // Manual
        { address: SOLARMAN_REGISTERS.CHARGE_POWER, value: powerPct },
        { address: SOLARMAN_REGISTERS.CHARGE_ENABLE, value: 1 },
      ]);
    }

    case "stop_charging":
      return solarmanCustomCommand(config, [
        { address: SOLARMAN_REGISTERS.CHARGE_ENABLE, value: 0 },
      ]);

    case "schedule_charging": {
      const p = cmd.params as { startTime: string; endTime: string; powerWatts?: number };
      const startReg = timeToRegister(p.startTime);
      const endReg = timeToRegister(p.endTime);
      const powerPct = p.powerWatts ? Math.round(Math.min((p.powerWatts / maxCharge) * 100, 100)) : 100;
      return solarmanCustomCommand(config, [
        { address: SOLARMAN_REGISTERS.CHARGE_START_TIME1, value: startReg },
        { address: SOLARMAN_REGISTERS.CHARGE_END_TIME1, value: endReg },
        { address: SOLARMAN_REGISTERS.CHARGE_POWER, value: powerPct },
        { address: SOLARMAN_REGISTERS.CHARGE_ENABLE, value: 1 },
      ]);
    }

    case "set_soc_target":
      return solarmanCustomCommand(config, [
        { address: SOLARMAN_REGISTERS.SOC_TARGET_CHARGE, value: cmd.params.targetPercent },
      ]);

    case "set_power_limit": {
      const registers: Array<{ address: number; value: number }> = [];
      if (cmd.params.chargeLimitWatts !== undefined) {
        const pct = Math.round(Math.min((cmd.params.chargeLimitWatts / maxCharge) * 100, 100));
        registers.push({ address: SOLARMAN_REGISTERS.CHARGE_POWER, value: pct });
      }
      if (cmd.params.dischargeLimitWatts !== undefined) {
        const maxDis = config.maxDischargePower ?? 5000;
        const pct = Math.round(Math.min((cmd.params.dischargeLimitWatts / maxDis) * 100, 100));
        registers.push({ address: SOLARMAN_REGISTERS.DISCHARGE_POWER, value: pct });
      }
      if (registers.length === 0) throw new Error("Inga effektgranser angivna");
      return solarmanCustomCommand(config, registers);
    }

    default:
      throw new Error(`Okant kommando: ${(cmd as BatteryCommand).command}`);
  }
}

// ─── Modbus TCP ───────────────────────────────────────────────────────────────

function timeToRegister(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h ?? 0) * 100 + (m ?? 0);
}

export function buildModbusWriteFrame(unitId: number, register: number, value: number): Buffer {
  const buf = Buffer.alloc(8);
  buf[0] = unitId;
  buf[1] = 0x06; // Write single register
  buf[2] = (register >> 8) & 0xff;
  buf[3] = register & 0xff;
  buf[4] = (value >> 8) & 0xff;
  buf[5] = value & 0xff;
  const crc = modbusRtuCrc(buf.subarray(0, 6));
  buf[6] = crc & 0xff;
  buf[7] = (crc >> 8) & 0xff;
  return buf;
}

export function buildModbusReadFrame(unitId: number, register: number, count: number): Buffer {
  const buf = Buffer.alloc(8);
  buf[0] = unitId;
  buf[1] = 0x03; // Read holding registers
  buf[2] = (register >> 8) & 0xff;
  buf[3] = register & 0xff;
  buf[4] = (count >> 8) & 0xff;
  buf[5] = count & 0xff;
  const crc = modbusRtuCrc(buf.subarray(0, 6));
  buf[6] = crc & 0xff;
  buf[7] = (crc >> 8) & 0xff;
  return buf;
}

function modbusRtuCrc(buf: Buffer): number {
  let crc = 0xffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 0x0001) { crc = (crc >> 1) ^ 0xa001; }
      else { crc >>= 1; }
    }
  }
  return crc;
}

// Afore hybrid inverter Modbus register map
export const AFORE_REGISTERS = {
  WORK_MODE: 0x0200,
  CHARGE_POWER: 0x0210,
  DISCHARGE_POWER: 0x0211,
  SOC_TARGET_CHARGE: 0x0212,
  SOC_TARGET_DISCHARGE: 0x0213,
  CHARGE_START_TIME1: 0x0250,
  CHARGE_END_TIME1: 0x0251,
  CHARGE_ENABLE: 0x0252,
  BATTERY_SOC: 0x0103,
  BATTERY_POWER: 0x0104,
};

export function commandToModbusFrames(cmd: BatteryCommand, unitId: number): Buffer[] {
  const frames: Buffer[] = [];
  switch (cmd.command) {
    case "start_charging":
      frames.push(buildModbusWriteFrame(unitId, AFORE_REGISTERS.WORK_MODE, 3));
      frames.push(buildModbusWriteFrame(unitId, AFORE_REGISTERS.CHARGE_ENABLE, 1));
      break;
    case "stop_charging":
      frames.push(buildModbusWriteFrame(unitId, AFORE_REGISTERS.CHARGE_ENABLE, 0));
      break;
    case "schedule_charging": {
      const p = cmd.params as { startTime: string; endTime: string; powerWatts?: number };
      frames.push(buildModbusWriteFrame(unitId, AFORE_REGISTERS.CHARGE_START_TIME1, timeToRegister(p.startTime)));
      frames.push(buildModbusWriteFrame(unitId, AFORE_REGISTERS.CHARGE_END_TIME1, timeToRegister(p.endTime)));
      frames.push(buildModbusWriteFrame(unitId, AFORE_REGISTERS.CHARGE_ENABLE, 1));
      break;
    }
    case "set_soc_target":
      frames.push(buildModbusWriteFrame(unitId, AFORE_REGISTERS.SOC_TARGET_CHARGE, cmd.params.targetPercent));
      break;
    case "set_power_limit": {
      if (cmd.params.chargeLimitWatts !== undefined) {
        frames.push(buildModbusWriteFrame(unitId, AFORE_REGISTERS.CHARGE_POWER, Math.round(cmd.params.chargeLimitWatts / 100)));
      }
      if (cmd.params.dischargeLimitWatts !== undefined) {
        frames.push(buildModbusWriteFrame(unitId, AFORE_REGISTERS.DISCHARGE_POWER, Math.round(cmd.params.dischargeLimitWatts / 100)));
      }
      break;
    }
    case "get_status":
      frames.push(buildModbusReadFrame(unitId, AFORE_REGISTERS.BATTERY_SOC, 2));
      break;
  }
  return frames;
}

async function modbusExecute(
  config: { modbusHost: string; modbusPort: number; modbusUnitId: number; maxChargePower: number | null },
  cmd: BatteryCommand
): Promise<Record<string, unknown>> {
  const unitId = config.modbusUnitId ?? 1;
  const frames = commandToModbusFrames(cmd, unitId);

  const responses: Buffer[] = [];
  for (const frame of frames) {
    const resp = await modbusRequest(config.modbusHost, config.modbusPort, frame);
    responses.push(resp);
  }

  return {
    command: cmd.command,
    framesCount: frames.length,
    responses: responses.map(r => Array.from(r)),
    success: true,
  };
}

function modbusRequest(host: string, port: number, frame: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = 8000;
    let received = Buffer.alloc(0);

    socket.setTimeout(timeout);
    socket.connect(port, host, () => {
      socket.write(frame);
    });
    socket.on("data", (data: Buffer) => {
      received = Buffer.concat([received, data]);
      if (received.length >= 4) {
        socket.destroy();
        resolve(received);
      }
    });
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error(`Modbus TCP timeout (${timeout}ms) connecting to ${host}:${port}`));
    });
    socket.on("close", () => {
      if (received.length === 0) reject(new Error(`Modbus TCP: no response from ${host}:${port}`));
    });
    socket.on("error", (err: Error) => {
      reject(new Error(`Modbus TCP error: ${err.message}`));
    });
  });
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function executeBatteryCommand(
  deviceConfigId: number,
  cmd: BatteryCommand,
  actionId?: number
): Promise<BatteryResult> {
  const startTime = Date.now();
  const db = await getDb();

  // Load device config
  const configs = db
    ? await db.select().from(deviceConfigs).where(eq(deviceConfigs.id, deviceConfigId)).limit(1)
    : [];
  const config = configs[0];

  if (!config) {
    return {
      success: false,
      command: cmd.command,
      protocol: "unknown",
      errorMessage: `Device config ${deviceConfigId} not found`,
      executedAt: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime,
    };
  }

  if (!config.isActive) {
    return {
      success: false,
      command: cmd.command,
      protocol: config.protocol,
      deviceSn: config.deviceSn ?? undefined,
      errorMessage: `Device ${config.deviceName} is disabled`,
      executedAt: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime,
    };
  }

  // Safety validation
  try {
    validateCommand(cmd, {
      maxSocPercent: config.maxSocPercent,
      minSocPercent: config.minSocPercent,
      maxChargePower: config.maxChargePower,
      maxDischargePower: config.maxDischargePower,
    });
  } catch (err) {
    const result: BatteryResult = {
      success: false,
      command: cmd.command,
      protocol: config.protocol,
      deviceSn: config.deviceSn ?? undefined,
      errorMessage: `Sakerhetsgrans: ${err instanceof Error ? err.message : String(err)}`,
      executedAt: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime,
    };
    await logDeviceExecution(db, config, cmd, actionId, result, startTime);
    return result;
  }

  // Execute
  let rawResponse: Record<string, unknown> | undefined;
  let errorMessage: string | undefined;
  let success = false;

  try {
    if (config.protocol === "solarman") {
      if (!config.solarmanToken || !config.deviceSn) {
        throw new Error("Solarman-konfiguration saknar token eller device SN");
      }
      rawResponse = await solarmanExecute(
        {
          solarmanToken: config.solarmanToken,
          deviceSn: config.deviceSn,
          loggerId: config.loggerId,
          maxChargePower: config.maxChargePower,
          maxDischargePower: config.maxDischargePower,
        },
        cmd
      );
      success = true;
    } else if (config.protocol === "modbus_tcp" || config.protocol === "modbus_rtu") {
      if (!config.modbusHost) throw new Error("Modbus-konfiguration saknar host/IP");
      rawResponse = await modbusExecute(
        {
          modbusHost: config.modbusHost,
          modbusPort: config.modbusPort ?? 502,
          modbusUnitId: config.modbusUnitId ?? 1,
          maxChargePower: config.maxChargePower,
        },
        cmd
      );
      success = true;
    } else {
      throw new Error(`Protokoll '${config.protocol}' stods inte an`);
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    success = false;
  }

  const result: BatteryResult = {
    success,
    command: cmd.command,
    protocol: config.protocol,
    deviceSn: config.deviceSn ?? undefined,
    rawResponse,
    errorMessage,
    executedAt: new Date().toISOString(),
    executionTimeMs: Date.now() - startTime,
  };

  await logDeviceExecution(db, config, cmd, actionId, result, startTime);
  return result;
}

// ─── DB logging helper ────────────────────────────────────────────────────────

async function logDeviceExecution(
  db: Awaited<ReturnType<typeof getDb>>,
  config: { id: number; deviceType: string },
  cmd: BatteryCommand,
  actionId: number | undefined,
  result: BatteryResult,
  startTime: number
): Promise<void> {
  if (!db) return;
  try {
    await db.insert(deviceLogs).values({
      deviceConfigId: config.id,
      actionId: actionId ?? null,
      deviceType: config.deviceType as "battery" | "inverter" | "charger" | "meter",
      command: cmd.command,
      requestPayload: { command: cmd.command, params: (cmd as BatteryCommand).params },
      deviceResponse: result.rawResponse ?? {},
      success: result.success,
      errorMessage: result.errorMessage ?? null,
      executionTimeMs: Date.now() - startTime,
    });
  } catch (_e) {
    // Non-fatal: log failure should not break execution flow
  }
}

// ─── Public validation helper (used by tests and tRPC layer) ─────────────────

export function validateBatteryCommand(
  cmd: BatteryCommand,
  config: { maxSocPercent: number; minSocPercent: number; maxChargePower: number; maxDischargePower: number }
): { valid: boolean; error?: string } {
  try {
    validateCommand(cmd, config);
    if (cmd.command === "schedule_charging") {
      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      const p = cmd.params as { startTime?: string; endTime?: string };
      if (p.startTime && !timeRegex.test(p.startTime)) {
        return { valid: false, error: `Ogiltig starttid: ${p.startTime}. Format: HH:MM` };
      }
      if (p.endTime && !timeRegex.test(p.endTime)) {
        return { valid: false, error: `Ogiltig sluttid: ${p.endTime}. Format: HH:MM` };
      }
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Normalize Action Engine payload to BatteryCommand ───────────────────────

export function normalizeActionToCommand(
  actionType: string,
  payload: Record<string, unknown>
): BatteryCommand {
  switch (actionType) {
    case "optimize_battery":
      return {
        command: "set_soc_target",
        params: { targetPercent: (payload.targetSoc as number | undefined) ?? 80 },
      };
    case "schedule_charging":
      return {
        command: "schedule_charging",
        params: {
          startTime: (payload.startHour as string | undefined) ?? "02:00",
          endTime: (payload.endHour as string | undefined) ?? "06:00",
          powerWatts: payload.powerWatts as number | undefined,
        },
      };
    case "sell_excess":
    case "adjust_load":
      return {
        command: "set_power_limit",
        params: {
          dischargeLimitWatts: (payload.powerWatts as number | undefined) ?? 5000,
        },
      };
    default:
      return { command: "get_status", params: {} };
  }
}
