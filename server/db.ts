import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  systemConfigs,
  InsertSystemConfig,
  devices,
  InsertDevice,
  tickets,
  InsertTicket,
  ticketComments,
  InsertTicketComment,
  contracts,
  InsertContract,
  warranties,
  InsertWarranty,
  notifications,
  InsertNotification,
  optimizationRuns,
  InsertOptimizationRun,
  referrals,
  InsertReferral,
  schedulerConfigs,
  InsertSchedulerConfig,
  savingsRecords,
  reports,
  newsArticles,
  InsertNewsArticle,
  aiInsights,
  InsertAIInsight,
  customerDocuments,
  InsertCustomerDocument,
  systemHealthEvents,
  InsertSystemHealthEvent,
  alertRules,
  InsertAlertRule,
  knowledgeArticles,
  InsertKnowledgeArticle,
  passwordResetTokens,
  invitations,
  InsertInvitation,
  electricityBills,
  InsertElectricityBill,
  billReminders,
  InsertBillReminder,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (e) {
      _db = null;
    }
  }
  return _db;
}

// ─── Users ──────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const f of ["name", "email", "loginMethod"] as const) {
    if (user[f] !== undefined) {
      values[f] = user[f] ?? null;
      updateSet[f] = user[f] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db
    .insert(users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .orderBy(users.name);
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return r[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const r = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return r[0] ?? null;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const r = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return r[0] ?? null;
}

export async function verifyPassword(email: string, password: string) {
  const bcrypt = await import("bcryptjs");
  const user = await getUserByEmail(email);
  if (!user || !user.password || !user.isActive) return null;
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;
  const db = await getDb();
  if (db)
    await db
      .update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.id, user.id));
  return user;
}

export async function createUserWithPassword(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  careTier?: "basic" | "plus" | "platinum";
  role?: "user" | "admin";
  mustChangePassword?: boolean;
}) {
  const bcrypt = await import("bcryptjs");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const hash = await bcrypt.hash(data.password, 10);
  await db.insert(users).values({
    name: data.name,
    email: data.email,
    password: hash,
    loginMethod: "email",
    phone: data.phone,
    careTier: data.careTier ?? "basic",
    role: data.role ?? "user",
    mustChangePassword: data.mustChangePassword ?? false,
    lastSignedIn: new Date(),
  });
  return getUserByEmail(data.email);
}

export async function updateUserPassword(userId: number, newPassword: string) {
  const bcrypt = await import("bcryptjs");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const hash = await bcrypt.hash(newPassword, 10);
  await db
    .update(users)
    .set({ password: hash, mustChangePassword: false })
    .where(eq(users.id, userId));
}

// ─── System Configs ─────────────────────────────────────────────────────────
export async function getConfigs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(systemConfigs)
    .where(eq(systemConfigs.userId, userId))
    .orderBy(desc(systemConfigs.updatedAt));
}

export async function getConfigById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db
    .select()
    .from(systemConfigs)
    .where(eq(systemConfigs.id, id))
    .limit(1);
  return r[0];
}

export async function createConfig(data: InsertSystemConfig) {
  const db = await getDb();
  if (!db) return;
  await db.insert(systemConfigs).values(data);
}

export async function updateConfig(
  id: number,
  data: Partial<InsertSystemConfig>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(systemConfigs).set(data).where(eq(systemConfigs.id, id));
}

export async function deleteConfig(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(systemConfigs).where(eq(systemConfigs.id, id));
}

// ─── Devices ────────────────────────────────────────────────────────────────
export async function getDevices(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(devices)
    .where(eq(devices.userId, userId))
    .orderBy(desc(devices.updatedAt));
}

export async function createDevice(data: InsertDevice) {
  const db = await getDb();
  if (!db) return;
  await db.insert(devices).values(data);
}

export async function updateDevice(id: number, data: Partial<InsertDevice>) {
  const db = await getDb();
  if (!db) return;
  await db.update(devices).set(data).where(eq(devices.id, id));
}

export async function deleteDevice(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(devices).where(eq(devices.id, id));
}

// ─── Tickets ────────────────────────────────────────────────────────────────
export async function getTickets(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(tickets)
    .where(eq(tickets.customerId, userId))
    .orderBy(desc(tickets.createdAt));
}

export async function getAllTickets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tickets).orderBy(desc(tickets.createdAt));
}

// SLA hours per CARE tier
const SLA_HOURS: Record<string, number> = {
  platinum: 4,
  plus: 24,
  basic: 72,
};

export function computeSlaDeadline(careTier: string | null | undefined): Date {
  const hours = SLA_HOURS[careTier ?? "basic"] ?? 72;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export async function createTicket(data: InsertTicket) {
  const db = await getDb();
  if (!db) return;
  const tier = (data as any).careTier ?? "basic";
  const slaDeadline = computeSlaDeadline(tier);
  await db.insert(tickets).values({ ...data, slaDeadline });
}

export async function updateTicket(id: number, data: Partial<InsertTicket>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tickets).set(data).where(eq(tickets.id, id));
}

export async function getTicketComments(ticketId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(ticketComments)
    .where(eq(ticketComments.ticketId, ticketId))
    .orderBy(ticketComments.createdAt);
}

export async function addTicketComment(data: InsertTicketComment) {
  const db = await getDb();
  if (!db) return;
  await db.insert(ticketComments).values(data);
}

// ─── Contracts ──────────────────────────────────────────────────────────────
export async function getContracts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(contracts)
    .where(eq(contracts.customerId, userId))
    .orderBy(desc(contracts.createdAt));
}

// ─── Warranties ─────────────────────────────────────────────────────────────
export async function getWarranties(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(warranties)
    .where(eq(warranties.customerId, userId))
    .orderBy(desc(warranties.createdAt));
}

// ─── Notifications ──────────────────────────────────────────────────────────
export async function getNotifications(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId));
}

// ─── Optimization Runs ──────────────────────────────────────────────────────
export async function getOptimizationRuns(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(optimizationRuns)
    .where(eq(optimizationRuns.userId, userId))
    .orderBy(desc(optimizationRuns.createdAt))
    .limit(limit);
}

export async function createOptimizationRun(data: InsertOptimizationRun) {
  const db = await getDb();
  if (!db) return;
  await db.insert(optimizationRuns).values(data);
}

export async function getLatestOptimization(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db
    .select()
    .from(optimizationRuns)
    .where(eq(optimizationRuns.userId, userId))
    .orderBy(desc(optimizationRuns.createdAt))
    .limit(1);
  return r[0];
}

// ─── Referrals ──────────────────────────────────────────────────────────────
export async function getReferrals(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(referrals)
    .where(eq(referrals.referrerId, userId))
    .orderBy(desc(referrals.createdAt));
}

export async function createReferral(data: InsertReferral) {
  const db = await getDb();
  if (!db) return;
  await db.insert(referrals).values(data);
}

export async function getReferralByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referralCode, code))
    .limit(1);
  return r[0];
}

// ─── Scheduler Configs ──────────────────────────────────────────────────────
export async function getSchedulerConfig(userId: number) {
  const db = await getDb();
  if (!db)
    return {
      enabled: false,
      zone: "SE3",
      batteryCapacityKwh: 15,
      batteryMaxPowerKw: 5,
      panelKwp: 10,
      hasHeatPump: false,
      hasEv: false,
      peakShavingEnabled: false,
      peakLimitKw: 11,
    };
  const r = await db
    .select()
    .from(schedulerConfigs)
    .where(eq(schedulerConfigs.userId, userId))
    .limit(1);
  return (
    r[0] ?? {
      enabled: false,
      zone: "SE3",
      batteryCapacityKwh: 15,
      batteryMaxPowerKw: 5,
      panelKwp: 10,
      hasHeatPump: false,
      hasEv: false,
      peakShavingEnabled: false,
      peakLimitKw: 11,
    }
  );
}

export async function upsertSchedulerConfig(
  userId: number,
  data: Partial<InsertSchedulerConfig>
) {
  const db = await getDb();
  if (!db) return;
  const rows = await db
    .select()
    .from(schedulerConfigs)
    .where(eq(schedulerConfigs.userId, userId))
    .limit(1);
  const existing = rows[0];
  if (existing) {
    await db
      .update(schedulerConfigs)
      .set(data)
      .where(eq(schedulerConfigs.id, existing.id));
  } else {
    await db
      .insert(schedulerConfigs)
      .values({ userId, ...data } as InsertSchedulerConfig);
  }
}

// ─── Savings ────────────────────────────────────────────────────────────────
export async function getSavingsRecords(configId: number, limit = 12) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(savingsRecords)
    .where(eq(savingsRecords.configId, configId))
    .orderBy(desc(savingsRecords.periodStart))
    .limit(limit);
}

// ─── Reports ────────────────────────────────────────────────────────────────
export async function getReports(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(reports)
    .where(eq(reports.userId, userId))
    .orderBy(desc(reports.createdAt));
}

// ─── News Articles ──────────────────────────────────────────────────────────
export async function insertNewsArticle(article: InsertNewsArticle) {
  const db = await getDb();
  if (!db) return;
  await db.insert(newsArticles).values(article);
}

export async function getArticleByUrl(url: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(newsArticles)
    .where(eq(newsArticles.url, url))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUnprocessedArticles(limit = 5) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(newsArticles)
    .where(eq(newsArticles.processed, false))
    .orderBy(desc(newsArticles.createdAt))
    .limit(limit);
}

export async function markArticleProcessed(
  id: number,
  data: {
    summary: string | null;
    tags: string[];
    region: "SE" | "NORDICS" | "EU" | "GLOBAL";
    relevanceScore: number;
    actionType?:
      | "optimize_battery"
      | "schedule_charging"
      | "view_forecast"
      | "monitor_risk"
      | "none";
    actionText?: string | null;
    personalizedInsight?: string | null;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(newsArticles)
    .set({
      summary: data.summary,
      tags: data.tags,
      region: data.region,
      relevanceScore: data.relevanceScore,
      actionType: data.actionType ?? "none",
      actionText: data.actionText ?? null,
      personalizedInsight: data.personalizedInsight ?? null,
      processed: true,
    })
    .where(eq(newsArticles.id, id));
}

export async function getNewsArticles(opts: {
  limit?: number;
  offset?: number;
  tag?: string;
  region?: "SE" | "NORDICS" | "EU" | "GLOBAL";
  minRelevance?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const { limit = 20, offset = 0, tag, region, minRelevance = 0 } = opts;

  const conditions = [
    eq(newsArticles.processed, true),
    gte(newsArticles.relevanceScore, minRelevance),
  ];
  if (region) conditions.push(eq(newsArticles.region, region));

  let rows = await db
    .select()
    .from(newsArticles)
    .where(and(...conditions))
    .orderBy(desc(newsArticles.createdAt))
    .limit(limit)
    .offset(offset);

  // Filter by tag in-memory (JSON column)
  if (tag) {
    rows = rows.filter(r => (r.tags as string[] | null)?.includes(tag));
  }

  return rows;
}

export async function getNewsStats() {
  const db = await getDb();
  if (!db) return { total: 0, highRelevance: 0, sources: 0 };
  const allProcessed = await db
    .select()
    .from(newsArticles)
    .where(eq(newsArticles.processed, true));
  const total = allProcessed.length;
  const highRelevance = allProcessed.filter(a => a.relevanceScore >= 70).length;
  const sources = new Set(allProcessed.map(a => a.source)).size;
  return { total, highRelevance, sources };
}

export async function getTopArticles(limit = 5) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(newsArticles)
    .where(eq(newsArticles.processed, true))
    .orderBy(desc(newsArticles.relevanceScore))
    .limit(limit);
}

// ─── Relevant Articles (for user) ──────────────────────────────────────────
export async function getRelevantArticles(
  userRegion: string = "SE3",
  limit = 20
) {
  const db = await getDb();
  if (!db) return [];
  const all = await db
    .select()
    .from(newsArticles)
    .where(
      and(
        eq(newsArticles.processed, true),
        gte(newsArticles.relevanceScore, 70)
      )
    )
    .orderBy(desc(newsArticles.relevanceScore))
    .limit(limit * 2);
  // Filter: SE/NORDICS priority + price impact
  return all
    .filter(a => {
      if (a.region === "SE" || a.region === "NORDICS") return true;
      if (a.relevanceScore >= 80) return true;
      return false;
    })
    .slice(0, limit);
}

// ─── Personalized Insights ─────────────────────────────────────────────────
export async function getPersonalizedInsights(
  userRegion: string = "SE3",
  limit = 10
) {
  const db = await getDb();
  if (!db) return [];
  const insights = await db
    .select()
    .from(aiInsights)
    .orderBy(desc(aiInsights.createdAt))
    .limit(limit * 2);
  const result = [];
  for (const insight of insights) {
    const articles = await db
      .select()
      .from(newsArticles)
      .where(eq(newsArticles.id, insight.articleId))
      .limit(1);
    const article = articles[0];
    if (!article) continue;
    // Prioritize SE/NORDICS
    if (
      article.region === "SE" ||
      article.region === "NORDICS" ||
      article.relevanceScore >= 80
    ) {
      result.push({ ...insight, article });
    }
    if (result.length >= limit) break;
  }
  return result;
}

// ─── AI Insights ────────────────────────────────────────────────────────────
export async function insertAIInsight(insight: InsertAIInsight) {
  const db = await getDb();
  if (!db) return;
  await db.insert(aiInsights).values(insight);
}

export async function getInsightsForArticle(articleId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(aiInsights)
    .where(eq(aiInsights.articleId, articleId));
}

export async function getLatestInsights(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(aiInsights)
    .orderBy(desc(aiInsights.createdAt))
    .limit(limit);
}

export async function getInsightsWithArticles(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  const insights = await db
    .select()
    .from(aiInsights)
    .orderBy(desc(aiInsights.createdAt))
    .limit(limit);
  const result = [];
  for (const insight of insights) {
    const articles = await db
      .select()
      .from(newsArticles)
      .where(eq(newsArticles.id, insight.articleId))
      .limit(1);
    result.push({ ...insight, article: articles[0] ?? null });
  }
  return result;
}

// ─── Actions (Action Engine) ──────────────────────────────────────────────
import { actions, InsertAction, deviceConfigs } from "../drizzle/schema";
import type { BatteryCommand } from "./deviceController/batteryController";

export async function createAction(data: InsertAction) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(actions).values(data).$returningId();
  if (!result?.id) return null;
  const rows = await db
    .select()
    .from(actions)
    .where(eq(actions.id, result.id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getActions(
  opts: { limit?: number; status?: string } = {}
) {
  const db = await getDb();
  if (!db) return [];
  const { limit = 50, status } = opts;
  const conditions = [];
  if (status) conditions.push(eq(actions.status, status as any));
  if (conditions.length) {
    return db
      .select()
      .from(actions)
      .where(and(...conditions))
      .orderBy(desc(actions.createdAt))
      .limit(limit);
  }
  return db
    .select()
    .from(actions)
    .orderBy(desc(actions.createdAt))
    .limit(limit);
}

export async function getUserActions(
  userId: number,
  opts: { limit?: number; status?: string } = {}
) {
  const db = await getDb();
  if (!db) return [];
  const { limit = 50, status } = opts;
  const conditions = [eq(actions.userId, userId)];
  if (status) conditions.push(eq(actions.status, status as any));
  return db
    .select()
    .from(actions)
    .where(and(...conditions))
    .orderBy(desc(actions.createdAt))
    .limit(limit);
}

export async function getActionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(actions)
    .where(eq(actions.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getActionsByInsight(insightId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(actions)
    .where(eq(actions.insightId, insightId))
    .orderBy(desc(actions.createdAt));
}

export async function getActionsByArticle(articleId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(actions)
    .where(eq(actions.articleId, articleId))
    .orderBy(desc(actions.createdAt));
}

export async function updateActionStatus(
  id: number,
  status: "pending" | "approved" | "executed" | "failed" | "dismissed",
  executionResult?: Record<string, unknown>
) {
  const db = await getDb();
  if (!db) return null;
  const updateData: Record<string, unknown> = { status };
  if (status === "executed" || status === "failed") {
    updateData.executedAt = new Date();
  }
  if (executionResult) {
    updateData.executionResult = executionResult;
  }
  await db.update(actions).set(updateData).where(eq(actions.id, id));
  const rows = await db
    .select()
    .from(actions)
    .where(eq(actions.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Execute an action: run device command, calculate ROI, store results.
 */
export async function executeAction(actionId: number): Promise<{
  success: boolean;
  action: typeof actions.$inferSelect | null;
  result: Record<string, unknown>;
}> {
  const action = await getActionById(actionId);
  if (!action)
    return {
      success: false,
      action: null,
      result: { error: "Action not found" },
    };

  if (action.status === "executed") {
    return {
      success: false,
      action,
      result: { error: "Action already executed" },
    };
  }

  if (action.status === "dismissed") {
    return {
      success: false,
      action,
      result: { error: "Action was dismissed" },
    };
  }

  // Execute based on action type
  const executionResult = await performAction(action);
  const executedAt = new Date();

  // Calculate ROI
  let roiData: Record<string, unknown> = {};
  if (executionResult.success) {
    try {
      const { calculateActionRoi } = await import("./roiService");
      const payload = (action.actionPayload ?? {}) as Record<string, unknown>;
      const region = (payload.region as string) ?? "SE3";
      const roi = await calculateActionRoi(
        actionId,
        action.userId,
        action.actionType,
        payload,
        executedAt,
        region
      );
      roiData = {
        baselineCostSek: roi.baselineCostSek,
        actualCostSek: roi.actualCostSek,
        savingsSek: roi.savingsSek,
        savingsKwh: roi.savingsKwh,
        confidence: roi.confidence,
        roiEstimated: roi.estimated,
      };
    } catch (e) {
      // ROI calculation failure must not block execution
      roiData = { roiError: String(e) };
    }
  }

  // Update action with status + ROI
  const db = await getDb();
  if (db) {
    const updateData: Record<string, unknown> = {
      status: executionResult.success ? "executed" : "failed",
      executedAt,
      executionResult,
      ...roiData,
    };
    await db.update(actions).set(updateData).where(eq(actions.id, actionId));
  }

  const updatedAction = await getActionById(actionId);

  return {
    success: executionResult.success,
    action: updatedAction,
    result: { ...executionResult, roi: roiData },
  };
}

/**
 * Perform the actual action. Currently simulates execution.
 * Each case is a hook point for real device/system integration.
 */
async function performAction(
  action: typeof actions.$inferSelect
): Promise<Record<string, unknown> & { success: boolean }> {
  const payload = (action.actionPayload ?? {}) as Record<string, unknown>;
  const batteryDeviceConfigId =
    (payload.deviceConfigId as number | undefined) ?? null;

  switch (action.actionType) {
    case "optimize_battery": {
      if (batteryDeviceConfigId) {
        const { executeBatteryCommand, normalizeActionToCommand } =
          await import("./deviceController/batteryController");
        const cmd = normalizeActionToCommand(
          "optimize_battery",
          payload
        ) as BatteryCommand;
        const result = await executeBatteryCommand(
          batteryDeviceConfigId,
          cmd,
          action.id
        );
        return {
          success: result.success,
          type: "optimize_battery",
          message: result.success
            ? `Batterioptimering utförd på enhet ${result.deviceSn ?? batteryDeviceConfigId}`
            : `Fel: ${result.errorMessage}`,
          deviceResult: result,
          executedAt: result.executedAt,
        };
      }
      const targetSoc = payload.targetSoc ?? 80;
      const strategy = payload.strategy ?? "peak_shaving";
      return {
        success: true,
        type: "optimize_battery",
        message: `Batterioptimering schemalagd (ingen enhet konfigurerad): mål-SoC ${targetSoc}%, strategi: ${strategy}`,
        targetSoc,
        strategy,
        executedAt: new Date().toISOString(),
      };
    }
    case "schedule_charging": {
      if (batteryDeviceConfigId) {
        const { executeBatteryCommand, normalizeActionToCommand } =
          await import("./deviceController/batteryController");
        const cmd = normalizeActionToCommand(
          "schedule_charging",
          payload
        ) as BatteryCommand;
        const result = await executeBatteryCommand(
          batteryDeviceConfigId,
          cmd,
          action.id
        );
        return {
          success: result.success,
          type: "schedule_charging",
          message: result.success
            ? `Laddning schemalagd på enhet ${result.deviceSn ?? batteryDeviceConfigId}`
            : `Fel: ${result.errorMessage}`,
          deviceResult: result,
          executedAt: result.executedAt,
        };
      }
      const startHour = payload.startHour ?? "02:00";
      const endHour = payload.endHour ?? "06:00";
      const targetKwh = payload.targetKwh ?? 10;
      return {
        success: true,
        type: "schedule_charging",
        message: `Laddning schemalagd (ingen enhet konfigurerad): ${startHour}–${endHour}, mål: ${targetKwh} kWh`,
        startHour,
        endHour,
        targetKwh,
        executedAt: new Date().toISOString(),
      };
    }
    case "view_forecast": {
      // Future: trigger forecast refresh
      return {
        success: true,
        type: "view_forecast",
        message: "Prognos uppdaterad med senaste data",
        executedAt: new Date().toISOString(),
      };
    }
    case "monitor_risk": {
      // Future: activate monitoring alert
      const riskType = payload.riskType ?? "price_spike";
      const threshold = payload.threshold ?? 200;
      return {
        success: true,
        type: "monitor_risk",
        message: `Riskövervakning aktiverad: ${riskType}, tröskel: ${threshold} öre/kWh`,
        riskType,
        threshold,
        executedAt: new Date().toISOString(),
      };
    }
    case "adjust_load": {
      // Future: call load management API
      const targetKw = payload.targetKw ?? 5;
      return {
        success: true,
        type: "adjust_load",
        message: `Lastjustering: mål ${targetKw} kW`,
        targetKw,
        executedAt: new Date().toISOString(),
      };
    }
    case "sell_excess": {
      // Future: call grid export API
      const kwhToSell = payload.kwhToSell ?? 5;
      return {
        success: true,
        type: "sell_excess",
        message: `Överskottsförsäljning: ${kwhToSell} kWh till nät`,
        kwhToSell,
        executedAt: new Date().toISOString(),
      };
    }
    default:
      return {
        success: true,
        type: "custom",
        message: `Åtgärd utförd: ${action.description ?? action.actionType}`,
        executedAt: new Date().toISOString(),
      };
  }
}

/**
 * Auto-trigger: create pending actions for high-relevance insights matching user region.
 * Called after AI processing of new articles.
 */
export async function autoTriggerActions(
  userId: number,
  userRegion: string = "SE3"
) {
  const db = await getDb();
  if (!db) return [];

  // Get recent insights that have actionable types
  const recentInsights = await db
    .select()
    .from(aiInsights)
    .where(sql`${aiInsights.actionType} != 'none'`)
    .orderBy(desc(aiInsights.createdAt))
    .limit(20);

  const triggered: (typeof actions.$inferSelect)[] = [];

  for (const insight of recentInsights) {
    // Get the article to check region + relevance
    const articles = await db
      .select()
      .from(newsArticles)
      .where(eq(newsArticles.id, insight.articleId))
      .limit(1);
    const article = articles[0];
    if (!article) continue;

    // Trigger rule: relevance > 80 AND region matches (SE or NORDICS for Swedish users)
    const regionMatch =
      article.region === "SE" ||
      article.region === "NORDICS" ||
      (article.region === "EU" && article.relevanceScore >= 90);
    if (article.relevanceScore <= 80 || !regionMatch) continue;

    // Check if action already exists for this insight+user
    const existing = await db
      .select()
      .from(actions)
      .where(and(eq(actions.insightId, insight.id), eq(actions.userId, userId)))
      .limit(1);
    if (existing.length > 0) continue;

    // Build action payload from insight
    const payload = buildActionPayload(
      insight.actionType as string,
      article,
      userRegion
    );

    const newAction = await createAction({
      userId,
      insightId: insight.id,
      articleId: article.id,
      actionType: insight.actionType as any,
      actionPayload: payload,
      description: insight.insightText,
      status: "pending",
      autoTriggered: true,
      triggerReason: `Relevans ${article.relevanceScore}%, region ${article.region}, typ ${insight.actionType}`,
    });

    if (newAction) triggered.push(newAction);
  }

  return triggered;
}

function buildActionPayload(
  actionType: string,
  article: typeof newsArticles.$inferSelect,
  userRegion: string
): Record<string, unknown> {
  const base = {
    sourceArticleId: article.id,
    sourceArticleTitle: article.title,
    userRegion,
    generatedAt: new Date().toISOString(),
  };

  switch (actionType) {
    case "optimize_battery":
      return {
        ...base,
        targetSoc: 90,
        strategy: "peak_shaving",
        reason: "Högt elpris förväntas",
      };
    case "schedule_charging":
      return {
        ...base,
        startHour: "02:00",
        endHour: "06:00",
        targetKwh: 15,
        reason: "Lågt nattelpris",
      };
    case "view_forecast":
      return {
        ...base,
        forecastType: "48h",
        includePrice: true,
        includeSolar: true,
      };
    case "monitor_risk":
      return {
        ...base,
        riskType: "price_spike",
        threshold: 200,
        duration: "24h",
      };
    case "adjust_load":
      return { ...base, targetKw: 5, reason: "Effekttopp förväntas" };
    case "sell_excess":
      return {
        ...base,
        kwhToSell: 10,
        reason: "Hög solproduktion + högt elpris",
      };
    default:
      return base;
  }
}

// ─── Customer Documents ───────────────────────────────────────────────────────
export async function createCustomerDocument(data: InsertCustomerDocument) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(customerDocuments).values(data);
  const insertId = (result as { insertId: number }).insertId;
  const [rows] = await db
    .select()
    .from(customerDocuments)
    .where(eq(customerDocuments.id, insertId));
  return rows;
}

export async function getCustomerDocuments(targetUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(customerDocuments)
    .where(eq(customerDocuments.targetUserId, targetUserId))
    .orderBy(desc(customerDocuments.createdAt));
}

export async function getAllCustomerDocuments() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(customerDocuments)
    .orderBy(desc(customerDocuments.createdAt));
}

export async function deleteCustomerDocument(
  id: number,
  requestingUserId: number,
  isAdmin: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [rows] = await db
    .select()
    .from(customerDocuments)
    .where(eq(customerDocuments.id, id));
  if (!rows) throw new Error("Document not found");
  if (!isAdmin && rows.uploadedBy !== requestingUserId)
    throw new Error("Forbidden");
  await db.delete(customerDocuments).where(eq(customerDocuments.id, id));
  return { success: true, fileKey: rows.fileKey };
}

// ─── System Health Events ─────────────────────────────────────────────────────
export async function createHealthEvent(data: InsertSystemHealthEvent) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db
    .insert(systemHealthEvents)
    .values(data)
    .$returningId();
  const [row] = await db
    .select()
    .from(systemHealthEvents)
    .where(eq(systemHealthEvents.id, result.id));
  return row;
}

export async function getHealthEvents(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(systemHealthEvents)
    .where(eq(systemHealthEvents.userId, userId))
    .orderBy(desc(systemHealthEvents.createdAt))
    .limit(limit);
}

export async function getUnresolvedAlerts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(systemHealthEvents)
    .where(
      and(
        eq(systemHealthEvents.userId, userId),
        eq(systemHealthEvents.resolved, false)
      )
    )
    .orderBy(desc(systemHealthEvents.createdAt));
}

export async function resolveHealthEvent(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(systemHealthEvents)
    .set({ resolved: true, resolvedAt: new Date() })
    .where(
      and(eq(systemHealthEvents.id, id), eq(systemHealthEvents.userId, userId))
    );
  const [row] = await db
    .select()
    .from(systemHealthEvents)
    .where(eq(systemHealthEvents.id, id));
  return row;
}

// ─── Alert Rules ──────────────────────────────────────────────────────────────
export async function getAlertRules(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(alertRules)
    .where(eq(alertRules.userId, userId))
    .orderBy(desc(alertRules.createdAt));
}

export async function createAlertRule(data: InsertAlertRule) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(alertRules).values(data).$returningId();
  const [row] = await db
    .select()
    .from(alertRules)
    .where(eq(alertRules.id, result.id));
  return row;
}

export async function updateAlertRule(
  id: number,
  userId: number,
  patch: Partial<InsertAlertRule>
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(alertRules)
    .set(patch)
    .where(and(eq(alertRules.id, id), eq(alertRules.userId, userId)));
  const [row] = await db.select().from(alertRules).where(eq(alertRules.id, id));
  return row;
}

export async function deleteAlertRule(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .delete(alertRules)
    .where(and(eq(alertRules.id, id), eq(alertRules.userId, userId)));
  return { success: true };
}

// ─── Anomaly Detection ────────────────────────────────────────────────────────
/**
 * Evaluate alert rules against a set of current metrics.
 * Returns triggered rules (those that breach threshold and are past cooldown).
 */
export async function evaluateAlertRules(
  userId: number,
  metrics: Record<string, number>
): Promise<Array<{ rule: typeof alertRules.$inferSelect; value: number }>> {
  const db = await getDb();
  if (!db) return [];
  const rules = await db
    .select()
    .from(alertRules)
    .where(and(eq(alertRules.userId, userId), eq(alertRules.isActive, true)));

  const now = new Date();
  const triggered: Array<{
    rule: typeof alertRules.$inferSelect;
    value: number;
  }> = [];

  for (const rule of rules) {
    const value = metrics[rule.metricKey];
    if (value === undefined) continue;

    const threshold = parseFloat(rule.threshold);
    if (isNaN(threshold)) continue;

    let breached = false;
    if (rule.operator === "lt") breached = value < threshold;
    if (rule.operator === "lte") breached = value <= threshold;
    if (rule.operator === "gt") breached = value > threshold;
    if (rule.operator === "gte") breached = value >= threshold;
    if (rule.operator === "eq") breached = value === threshold;
    if (rule.operator === "neq") breached = value !== threshold;

    if (!breached) continue;

    // Check cooldown
    if (rule.lastTriggeredAt) {
      const cooldownMs = (rule.cooldownMinutes ?? 60) * 60 * 1000;
      if (now.getTime() - new Date(rule.lastTriggeredAt).getTime() < cooldownMs)
        continue;
    }

    triggered.push({ rule, value });
  }

  return triggered;
}

// ─── Knowledge Articles ───────────────────────────────────────────────────────

export async function listKnowledgeArticles(opts: {
  publishedOnly?: boolean;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  let q = db.select().from(knowledgeArticles).$dynamic();
  const conditions: any[] = [];
  if (opts.publishedOnly)
    conditions.push(eq(knowledgeArticles.published, true));
  if (opts.category && opts.category !== "all")
    conditions.push(eq(knowledgeArticles.category, opts.category as any));
  if (conditions.length > 0) q = q.where(and(...conditions));
  q = q.orderBy(
    desc(knowledgeArticles.publishedAt),
    desc(knowledgeArticles.createdAt)
  );
  if (opts.limit) q = q.limit(opts.limit);
  if (opts.offset) q = q.offset(opts.offset);
  return q;
}

export async function getKnowledgeArticleBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(knowledgeArticles)
    .where(eq(knowledgeArticles.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getKnowledgeArticleById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(knowledgeArticles)
    .where(eq(knowledgeArticles.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createKnowledgeArticle(data: InsertKnowledgeArticle) {
  const db = await getDb();
  if (!db) return;
  await db.insert(knowledgeArticles).values(data);
}

export async function updateKnowledgeArticle(
  id: number,
  data: Partial<InsertKnowledgeArticle>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(knowledgeArticles)
    .set(data)
    .where(eq(knowledgeArticles.id, id));
}

export async function deleteKnowledgeArticle(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(knowledgeArticles).where(eq(knowledgeArticles.id, id));
}

export async function publishKnowledgeArticle(id: number, publish: boolean) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(knowledgeArticles)
    .set({ published: publish, publishedAt: publish ? new Date() : null })
    .where(eq(knowledgeArticles.id, id));
}

// ─── Onboarding Progress ──────────────────────────────────────────────────────

import {
  onboardingProgress,
  InsertOnboardingProgress,
} from "../drizzle/schema";

export async function getOnboardingProgress(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(onboardingProgress)
    .where(eq(onboardingProgress.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertOnboardingProgress(
  userId: number,
  completedSteps: string[],
  dismissed?: boolean
) {
  const db = await getDb();
  if (!db) return;
  const existing = await getOnboardingProgress(userId);
  const allSteps = [
    "configure_system",
    "add_device",
    "choose_care_tier",
    "explore_dashboard",
  ];
  const isComplete = allSteps.every(s => completedSteps.includes(s));

  if (existing) {
    await db
      .update(onboardingProgress)
      .set({
        completedSteps,
        dismissed: dismissed ?? existing.dismissed,
        completedAt:
          isComplete && !existing.completedAt
            ? new Date()
            : existing.completedAt,
      })
      .where(eq(onboardingProgress.userId, userId));
  } else {
    await db.insert(onboardingProgress).values({
      userId,
      completedSteps,
      dismissed: dismissed ?? false,
      completedAt: isComplete ? new Date() : undefined,
    });
  }
}

export async function dismissOnboarding(userId: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await getOnboardingProgress(userId);
  if (existing) {
    await db
      .update(onboardingProgress)
      .set({ dismissed: true })
      .where(eq(onboardingProgress.userId, userId));
  } else {
    await db
      .insert(onboardingProgress)
      .values({ userId, completedSteps: [], dismissed: true });
  }
}

// ─── Invitations ─────────────────────────────────────────────────────────────
export async function createInvitation(data: InsertInvitation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(invitations).values(data);
}

export async function getInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const r = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);
  return r[0] ?? null;
}

export async function getAllInvitations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invitations).orderBy(desc(invitations.createdAt));
}

export async function updateInvitation(
  id: number,
  data: Partial<InsertInvitation>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(invitations).set(data).where(eq(invitations.id, id));
}

// ─── Password Reset Tokens ───────────────────────────────────────────────────
export async function createPasswordResetToken(
  userId: number,
  token: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Delete any existing tokens for this user
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, userId));
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
}

export async function getPasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const r = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .limit(1);
  return r[0] ?? null;
}

export async function deletePasswordResetToken(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token));
}

// ─── Electricity Bills ───────────────────────────────────────────────────────
export async function createBill(data: InsertElectricityBill) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(electricityBills).values(data);
  return { id: (result as any).insertId };
}

export async function getBillsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(electricityBills)
    .where(eq(electricityBills.userId, userId))
    .orderBy(desc(electricityBills.billYear), desc(electricityBills.billMonth));
}

export async function getAllBills() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(electricityBills)
    .orderBy(desc(electricityBills.createdAt));
}

export async function getBillById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(electricityBills)
    .where(eq(electricityBills.id, id));
  return rows[0] ?? null;
}

export async function deleteBill(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(electricityBills).where(eq(electricityBills.id, id));
}

// ─── Bill Reminders ──────────────────────────────────────────────────────────
export async function createReminder(data: InsertBillReminder) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(billReminders).values(data);
  return { id: (result as any).insertId };
}

export async function getRemindersByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(billReminders)
    .where(eq(billReminders.userId, userId))
    .orderBy(desc(billReminders.reminderDate));
}

export async function getPendingReminders(before: Date) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(billReminders)
    .where(
      and(
        eq(billReminders.sent, false),
        lte(billReminders.reminderDate, before)
      )
    );
}

export async function markReminderSent(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(billReminders)
    .set({ sent: true, sentAt: new Date() })
    .where(eq(billReminders.id, id));
}

export async function deleteRemindersByBill(billId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(billReminders).where(eq(billReminders.billId, billId));
}

export async function updateBillAnalysis(id: number, analysisJson: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(electricityBills)
    .set({ analysisJson, analyzedAt: new Date() })
    .where(eq(electricityBills.id, id));
}
