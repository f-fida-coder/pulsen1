import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users ──────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(), // nullable for custom-auth users
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  password: varchar("password", { length: 255 }), // bcrypt hash, null for Manus OAuth users
  loginMethod: varchar("loginMethod", { length: 64 }).default("email"), // 'email' | 'manus'
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  phone: varchar("phone", { length: 30 }),
  careTier: mysqlEnum("userCareTier", ["basic", "plus", "platinum"]).default("basic"),
  mustChangePassword: boolean("mustChangePassword").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── System Configurations ──────────────────────────────────────────────────
export const systemConfigs = mysqlTable("system_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  isDefault: boolean("isDefault").default(false),
  batteryCapacity: decimal("batteryCapacity", { precision: 10, scale: 2 }).default("0"),
  batteryDoD: int("batteryDoD").default(80),
  batteryEfficiency: int("batteryEfficiency").default(92),
  solarCapacity: decimal("solarCapacity", { precision: 10, scale: 2 }).default("0"),
  roofTilt: int("roofTilt").default(30),
  roofOrientation: int("roofOrientation").default(180),
  shading: int("shading").default(0),
  hasWind: boolean("hasWind").default(false),
  windCapacity: decimal("windCapacity", { precision: 10, scale: 2 }).default("0"),
  hubHeight: int("hubHeight").default(30),
  annualConsumption: int("annualConsumption").default(20000),
  hasEV: boolean("hasEV").default(false),
  evConsumption: int("evConsumption").default(0),
  heatingType: mysqlEnum("heatingType", ["heatpump", "direct", "district", "other"]).default("heatpump"),
  electricityArea: mysqlEnum("electricityArea", ["SE1", "SE2", "SE3", "SE4"]).default("SE3"),
  latitude: decimal("latitude", { precision: 10, scale: 6 }),
  longitude: decimal("longitude", { precision: 10, scale: 6 }),
  address: text("address"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SystemConfig = typeof systemConfigs.$inferSelect;
export type InsertSystemConfig = typeof systemConfigs.$inferInsert;

// ─── Price History ──────────────────────────────────────────────────────────
export const priceHistory = mysqlTable("price_history", {
  id: int("id").autoincrement().primaryKey(),
  area: mysqlEnum("area", ["SE1", "SE2", "SE3", "SE4"]).notNull(),
  priceHour: timestamp("priceHour").notNull(),
  priceOre: decimal("priceOre", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PriceHistory = typeof priceHistory.$inferSelect;

// ─── Savings Records ────────────────────────────────────────────────────────
export const savingsRecords = mysqlTable("savings_records", {
  id: int("id").autoincrement().primaryKey(),
  configId: int("configId").notNull(),
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  solarSavings: int("solarSavings").default(0),
  windSavings: int("windSavings").default(0),
  batterySavings: int("batterySavings").default(0),
  priceSavings: int("priceSavings").default(0),
  totalDecisions: int("totalDecisions").default(0),
  correctedDecisions: int("correctedDecisions").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SavingsRecord = typeof savingsRecords.$inferSelect;

// ─── Weather History ────────────────────────────────────────────────────────
export const weatherHistory = mysqlTable("weather_history", {
  id: int("id").autoincrement().primaryKey(),
  configId: int("configId").notNull(),
  recordedAt: timestamp("recordedAt").notNull(),
  windSpeed: decimal("windSpeed", { precision: 5, scale: 2 }),
  windDirection: int("windDirection"),
  windGust: decimal("windGust", { precision: 5, scale: 2 }),
  temperature: decimal("temperature", { precision: 5, scale: 2 }),
  cloudCover: int("cloudCover"),
  humidity: int("humidity"),
  apiWindSpeed: decimal("apiWindSpeed", { precision: 5, scale: 2 }),
  source: mysqlEnum("source", ["local_station", "smhi", "manual"]).default("smhi"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Reports ────────────────────────────────────────────────────────────────
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  configId: int("configId"),
  userId: int("userId").notNull(),
  reportType: mysqlEnum("reportType", ["wind_potential", "roi_summary", "monthly_savings"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  fileUrl: text("fileUrl"),
  fileKey: varchar("fileKey", { length: 255 }),
  parameters: json("parameters"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Report = typeof reports.$inferSelect;

// ─── Devices ────────────────────────────────────────────────────────────────
export const devices = mysqlTable("devices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  deviceType: mysqlEnum("deviceType", ["solar", "battery", "inverter", "heat_pump", "ev_charger", "wind"]).notNull(),
  manufacturer: varchar("manufacturer", { length: 255 }),
  model: varchar("model", { length: 255 }),
  serialNumber: varchar("serialNumber", { length: 100 }),
  status: mysqlEnum("deviceStatus", ["online", "offline", "warning", "error"]).default("online").notNull(),
  capacityKw: decimal("capacityKw", { precision: 10, scale: 2 }),
  lastReading: json("lastReading"),
  lastSeenAt: timestamp("lastSeenAt"),
  installedAt: timestamp("installedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;

// ─── Support Tickets ────────────────────────────────────────────────────────
export const tickets = mysqlTable("tickets", {
  id: int("id").autoincrement().primaryKey(),
  ticketNumber: varchar("ticketNumber", { length: 20 }).notNull().unique(),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("ticketStatus", ["open", "in_progress", "waiting", "resolved", "closed"]).default("open").notNull(),
  priority: mysqlEnum("ticketPriority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  category: mysqlEnum("ticketCategory", ["technical", "billing", "installation", "general", "warranty"]).default("general").notNull(),
  customerId: int("customerId"),
  assignedToId: int("assignedToId"),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolvedAt"),
  closedAt: timestamp("closedAt"),
  slaDeadline: timestamp("slaDeadline"),          // SLA deadline based on CARE tier
  careTier: mysqlEnum("ticketCareTier", ["basic", "plus", "platinum"]).default("basic"),
  source: mysqlEnum("ticketSource", ["portal", "email", "sms", "api"]).default("portal").notNull(),
  senderEmail: varchar("ticketSenderEmail", { length: 255 }),  // original sender for email tickets
  emailMessageId: varchar("ticketEmailMessageId", { length: 500 }), // IMAP message-id for dedup
  createdAt: timestamp("ticketCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("ticketUpdatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

// ─── Ticket Comments ────────────────────────────────────────────────────────
export const ticketComments = mysqlTable("ticketComments", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull(),
  authorId: int("authorId"),
  authorName: varchar("authorName", { length: 255 }),
  content: text("content").notNull(),
  isInternal: boolean("isInternal").default(false).notNull(),
  createdAt: timestamp("commentCreatedAt").defaultNow().notNull(),
});
export type TicketComment = typeof ticketComments.$inferSelect;
export type InsertTicketComment = typeof ticketComments.$inferInsert;

// ─── Contracts / Avtal ──────────────────────────────────────────────────────
export const contracts = mysqlTable("contracts", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  contractType: mysqlEnum("contractType", ["care_basic", "care_plus", "care_platinum", "installation", "maintenance", "lease", "other"]).default("other").notNull(),
  startDate: timestamp("contractStartDate").notNull(),
  endDate: timestamp("contractEndDate"),
  monthlyCost: int("monthlyCost"),
  status: mysqlEnum("contractStatus", ["active", "pending", "expired", "cancelled"]).default("active").notNull(),
  documentUrl: varchar("contractDocumentUrl", { length: 500 }),
  signedAt: timestamp("signedAt"),
  notes: text("contractNotes"),
  createdAt: timestamp("contractCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("contractUpdatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = typeof contracts.$inferInsert;

// ─── Warranties / Garantier ─────────────────────────────────────────────────
export const warranties = mysqlTable("warranties", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  productType: mysqlEnum("productType", ["solar_panel", "inverter", "battery", "ev_charger", "heat_pump", "installation", "other"]).default("other").notNull(),
  serialNumber: varchar("warrantySerialNumber", { length: 100 }),
  startDate: timestamp("warrantyStartDate").notNull(),
  endDate: timestamp("warrantyEndDate").notNull(),
  provider: varchar("provider", { length: 255 }),
  documentUrl: varchar("warrantyDocumentUrl", { length: 500 }),
  status: mysqlEnum("warrantyStatus", ["active", "expired", "claimed"]).default("active").notNull(),
  notes: text("warrantyNotes"),
  createdAt: timestamp("warrantyCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("warrantyUpdatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Warranty = typeof warranties.$inferSelect;
export type InsertWarranty = typeof warranties.$inferInsert;

// ─── Notifications ──────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  type: mysqlEnum("notifType", ["ai", "energy", "system", "alert", "ticket", "info"]).default("info").notNull(),
  title: varchar("notifTitle", { length: 255 }).notNull(),
  message: text("notifMessage").notNull(),
  priority: mysqlEnum("notifPriority", ["normal", "high"]).default("normal").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  link: varchar("notifLink", { length: 500 }),
  createdAt: timestamp("notifCreatedAt").defaultNow().notNull(),
});
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Optimization Runs ──────────────────────────────────────────────────────
export const optimizationRuns = mysqlTable("optimizationRuns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  zone: varchar("zone", { length: 10 }).notNull(),
  date: varchar("optDate", { length: 10 }).notNull(),
  totalHours: int("totalHours").notNull(),
  tomorrowIncluded: boolean("tomorrowIncluded").default(false).notNull(),
  batteryCapacityKwh: int("batteryCapacityKwh").notNull(),
  batteryMaxPowerKw: int("batteryMaxPowerKw").notNull(),
  panelKwp: int("panelKwp").notNull(),
  netSavingsSek: int("netSavingsSek").notNull(),
  arbitrageProfitSek: int("arbitrageProfitSek").notNull(),
  peakShavingValueSek: int("peakShavingValueSek").notNull(),
  selfConsumptionPct: int("selfConsumptionPct").notNull(),
  baselineCostSek: int("baselineCostSek").notNull(),
  totalCostSek: int("optTotalCostSek").notNull(),
  avgChargePriceSek: int("avgChargePriceSek").notNull(),
  avgDischargePriceSek: int("avgDischargePriceSek").notNull(),
  scheduleJson: text("scheduleJson").notNull(),
  actualNetSavingsSek: int("actualNetSavingsSek"),
  actualTotalCostSek: int("actualTotalCostSek"),
  actualNotes: text("actualNotes"),
  createdAt: timestamp("optCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("optUpdatedAt").defaultNow().onUpdateNow().notNull(),
});
export type OptimizationRun = typeof optimizationRuns.$inferSelect;
export type InsertOptimizationRun = typeof optimizationRuns.$inferInsert;

// ─── Referrals ──────────────────────────────────────────────────────────────
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull(),
  referralCode: varchar("referralCode", { length: 20 }).notNull().unique(),
  referredEmail: varchar("referredEmail", { length: 320 }),
  referredUserId: int("referredUserId"),
  status: mysqlEnum("referralStatus", ["pending", "registered", "converted", "rewarded"]).default("pending").notNull(),
  rewardAmount: int("rewardAmount").default(0),
  rewardPaid: boolean("rewardPaid").default(false).notNull(),
  createdAt: timestamp("referralCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("referralUpdatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

// ─── Scheduler Configs ──────────────────────────────────────────────────────
export const schedulerConfigs = mysqlTable("schedulerConfigs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  zone: varchar("schedulerZone", { length: 10 }).default("SE3").notNull(),
  lat: int("schedulerLat").default(5933).notNull(),
  lon: int("schedulerLon").default(1807).notNull(),
  batteryCapacityKwh: int("schedulerBatteryCapacityKwh").default(15).notNull(),
  batteryMaxPowerKw: int("schedulerBatteryMaxPowerKw").default(5).notNull(),
  panelKwp: int("schedulerPanelKwp").default(10).notNull(),
  hasHeatPump: boolean("schedulerHasHeatPump").default(true).notNull(),
  hasEv: boolean("schedulerHasEv").default(false).notNull(),
  peakShavingEnabled: boolean("schedulerPeakShaving").default(true).notNull(),
  peakLimitKw: int("schedulerPeakLimitKw").default(11).notNull(),
  lastRunAt: timestamp("schedulerLastRunAt"),
  lastRunStatus: mysqlEnum("schedulerLastRunStatus", ["success", "failed", "pending"]).default("pending").notNull(),
  lastRunError: text("schedulerLastRunError"),
  createdAt: timestamp("schedulerCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("schedulerUpdatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SchedulerConfig = typeof schedulerConfigs.$inferSelect;
export type InsertSchedulerConfig = typeof schedulerConfigs.$inferInsert;

// ─── News Articles ─────────────────────────────────────────────────────────
export const newsArticles = mysqlTable("news_articles", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("articleTitle", { length: 500 }).notNull(),
  source: varchar("articleSource", { length: 255 }).notNull(),
  url: varchar("articleUrl", { length: 1000 }).notNull().unique(),
  imageUrl: varchar("articleImageUrl", { length: 1000 }),
  publishedAt: timestamp("articlePublishedAt"),
  rawContent: text("rawContent"),
  cleanContent: text("cleanContent"),
  summary: text("articleSummary"),
  tags: json("articleTags").$type<string[]>(),
  region: mysqlEnum("articleRegion", ["SE", "NORDICS", "EU", "GLOBAL"]).default("GLOBAL").notNull(),
  actionType: mysqlEnum("actionType", ["optimize_battery", "schedule_charging", "view_forecast", "monitor_risk", "none"]).default("none").notNull(),
  actionText: text("actionText"),
  personalizedInsight: text("personalizedInsight"),
  relevanceScore: int("relevanceScore").default(50).notNull(),
  processed: boolean("articleProcessed").default(false).notNull(),
  createdAt: timestamp("articleCreatedAt").defaultNow().notNull(),
});
export type NewsArticle = typeof newsArticles.$inferSelect;
export type InsertNewsArticle = typeof newsArticles.$inferInsert;

// ─── AI Insights (per article) ─────────────────────────────────────────────
export const aiInsights = mysqlTable("ai_insights", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("insightArticleId").notNull(),
  insightText: text("insightText").notNull(),
  impactType: mysqlEnum("impactType", ["price", "savings", "risk", "opportunity"]).default("savings").notNull(),
  recommendation: text("insightRecommendation"),
  actionType: mysqlEnum("insightActionType", ["optimize_battery", "schedule_charging", "view_forecast", "monitor_risk", "none"]).default("none").notNull(),
  actionText: text("insightActionText"),
  personalizedInsight: text("insightPersonalizedInsight"),
  userRegion: varchar("insightUserRegion", { length: 10 }),
  confidenceScore: int("confidenceScore").default(70).notNull(),
  createdAt: timestamp("insightCreatedAt").defaultNow().notNull(),
});
export type AIInsight = typeof aiInsights.$inferSelect;
export type InsertAIInsight = typeof aiInsights.$inferInsert;

// ─── Actions (AI Action Engine) ───────────────────────────────────────────
export const actions = mysqlTable("actions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("actionUserId").notNull(),
  insightId: int("actionInsightId"),
  articleId: int("actionArticleId"),
  actionType: mysqlEnum("engActionType", [
    "optimize_battery",
    "schedule_charging",
    "view_forecast",
    "monitor_risk",
    "adjust_load",
    "sell_excess",
    "custom",
  ]).notNull(),
  actionPayload: json("actionPayload").$type<Record<string, unknown>>(),
  description: text("actionDescription"),
  status: mysqlEnum("engActionStatus", ["pending", "approved", "executed", "failed", "dismissed"]).default("pending").notNull(),
  autoTriggered: boolean("autoTriggered").default(false).notNull(),
  triggerReason: text("triggerReason"),
  executedAt: timestamp("actionExecutedAt"),
  executionResult: json("executionResult").$type<Record<string, unknown>>(),
  // ROI fields
  baselineCostSek: int("baselineCostSek"),        // cost without AI (öre)
  actualCostSek: int("actualCostSek"),            // cost with AI (öre)
  savingsSek: int("savingsSek"),                  // savings in öre
  savingsKwh: int("savingsKwh"),                  // savings in Wh (×10 for 0.1 kWh precision)
  confidence: int("roiConfidence").default(0),    // 0–100 data quality score
  roiEstimated: boolean("roiEstimated").default(true), // true = estimated, false = measured
  createdAt: timestamp("actionCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("actionUpdatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Action = typeof actions.$inferSelect;
export type InsertAction = typeof actions.$inferInsert;

// ─── Device Configs (Device Controller) ──────────────────────────────────────
export const deviceConfigs = mysqlTable("device_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("dcUserId").notNull(),
  deviceType: mysqlEnum("dcDeviceType", ["battery", "inverter", "charger", "meter"]).notNull(),
  deviceName: varchar("dcDeviceName", { length: 255 }).notNull(),
  protocol: mysqlEnum("dcProtocol", ["solarman", "modbus_tcp", "modbus_rtu", "http", "mqtt"]).notNull(),
  // Solarman API credentials
  solarmanToken: text("dcSolarmanToken"),
  solarmanAppId: varchar("dcSolarmanAppId", { length: 100 }),
  solarmanAppSecret: varchar("dcSolarmanAppSecret", { length: 255 }),
  deviceSn: varchar("dcDeviceSn", { length: 100 }),
  loggerId: varchar("dcLoggerId", { length: 100 }),
  // Modbus TCP/RTU settings
  modbusHost: varchar("dcModbusHost", { length: 255 }),
  modbusPort: int("dcModbusPort").default(502),
  modbusUnitId: int("dcModbusUnitId").default(1),
  // Safety limits
  maxChargePower: int("dcMaxChargePower").default(5000),
  maxDischargePower: int("dcMaxDischargePower").default(5000),
  maxSocPercent: int("dcMaxSocPercent").default(95),
  minSocPercent: int("dcMinSocPercent").default(10),
  isActive: boolean("dcIsActive").default(true).notNull(),
  createdAt: timestamp("dcCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("dcUpdatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DeviceConfig = typeof deviceConfigs.$inferSelect;
export type InsertDeviceConfig = typeof deviceConfigs.$inferInsert;

// ─── Device Logs (Execution audit trail) ─────────────────────────────────────
export const deviceLogs = mysqlTable("device_logs", {
  id: int("id").autoincrement().primaryKey(),
  deviceConfigId: int("dlDeviceConfigId"),
  actionId: int("dlActionId"),
  deviceType: mysqlEnum("dlDeviceType", ["battery", "inverter", "charger", "meter"]).notNull(),
  command: varchar("dlCommand", { length: 100 }).notNull(),
  requestPayload: json("dlRequestPayload").$type<Record<string, unknown>>(),
  deviceResponse: json("dlDeviceResponse").$type<Record<string, unknown>>(),
  success: boolean("dlSuccess").notNull(),
  errorMessage: text("dlErrorMessage"),
  executionTimeMs: int("dlExecutionTimeMs"),
  createdAt: timestamp("dlCreatedAt").defaultNow().notNull(),
});
export type DeviceLog = typeof deviceLogs.$inferSelect;
export type InsertDeviceLog = typeof deviceLogs.$inferInsert;

// ─── Price Timeseries ─────────────────────────────────────────────────────────
export const priceTimeseries = mysqlTable("price_timeseries", {
  id: int("id").autoincrement().primaryKey(),
  timestamp: timestamp("ptTimestamp").notNull(),
  region: mysqlEnum("ptRegion", ["SE1", "SE2", "SE3", "SE4"]).notNull(),
  priceSekPerKwh: int("ptPriceSekPerKwh").notNull(), // stored as öre/kWh (multiply by 0.01 for SEK)
  source: varchar("ptSource", { length: 50 }).default("elprisetjustnu"),
  createdAt: timestamp("ptCreatedAt").defaultNow().notNull(),
});
export type PriceTimeseries = typeof priceTimeseries.$inferSelect;
export type InsertPriceTimeseries = typeof priceTimeseries.$inferInsert;

// ─── Energy Timeseries ────────────────────────────────────────────────────────
export const energyTimeseries = mysqlTable("energy_timeseries", {
  id: int("id").autoincrement().primaryKey(),
  timestamp: timestamp("etTimestamp").notNull(),
  userId: int("etUserId").notNull(),
  configId: int("etConfigId"),                         // optional: link to system_configs
  consumptionWh: int("etConsumptionWh").default(0),    // house consumption in Wh
  productionWh: int("etProductionWh").default(0),      // solar production in Wh
  batteryChargeWh: int("etBatteryChargeWh").default(0),
  batteryDischargeWh: int("etBatteryDischargeWh").default(0),
  gridImportWh: int("etGridImportWh").default(0),
  gridExportWh: int("etGridExportWh").default(0),
  batterySocPercent: int("etBatterySocPercent"),        // 0–100
  source: mysqlEnum("etSource", ["solarman", "modbus", "manual", "simulated"]).default("simulated"),
  createdAt: timestamp("etCreatedAt").defaultNow().notNull(),
});
export type EnergyTimeseries = typeof energyTimeseries.$inferSelect;
export type InsertEnergyTimeseries = typeof energyTimeseries.$inferInsert;

// ─── Customer Documents ───────────────────────────────────────────────────────
export const customerDocuments = mysqlTable("customer_documents", {
  id: int("id").autoincrement().primaryKey(),
  uploadedBy: int("cdUploadedBy").notNull(),           // admin user_id who uploaded
  targetUserId: int("cdTargetUserId").notNull(),        // customer user_id who owns this doc
  filename: varchar("cdFilename", { length: 255 }).notNull(),
  fileKey: varchar("cdFileKey", { length: 500 }).notNull(),  // S3 key
  fileUrl: varchar("cdFileUrl", { length: 1000 }).notNull(), // CDN URL
  docType: mysqlEnum("cdDocType", [
    "contract",
    "warranty",
    "invoice",
    "service_report",
    "installation_report",
    "certificate",
    "other",
  ]).notNull().default("other"),
  description: varchar("cdDescription", { length: 500 }),
  fileSizeBytes: int("cdFileSizeBytes").default(0),
  createdAt: timestamp("cdCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("cdUpdatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CustomerDocument = typeof customerDocuments.$inferSelect;
export type InsertCustomerDocument = typeof customerDocuments.$inferInsert;

// ─── System Health Events ─────────────────────────────────────────────────────
export const systemHealthEvents = mysqlTable("system_health_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("sheUserId").notNull(),
  deviceConfigId: int("sheDeviceConfigId"),            // optional: link to device_configs
  eventType: mysqlEnum("sheEventType", [
    "heartbeat",
    "offline",
    "online",
    "anomaly",
    "alert_triggered",
    "alert_resolved",
    "threshold_breach",
  ]).notNull(),
  severity: mysqlEnum("sheSeverity", ["info", "warning", "critical"]).default("info").notNull(),
  title: varchar("sheTitle", { length: 255 }).notNull(),
  message: varchar("sheMessage", { length: 1000 }),
  metricKey: varchar("sheMetricKey", { length: 100 }),  // e.g. "battery_soc", "production_kwh"
  metricValue: varchar("sheMetricValue", { length: 100 }),
  metricUnit: varchar("sheMetricUnit", { length: 30 }),
  resolved: boolean("sheResolved").default(false).notNull(),
  resolvedAt: timestamp("sheResolvedAt"),
  createdAt: timestamp("sheCreatedAt").defaultNow().notNull(),
});
export type SystemHealthEvent = typeof systemHealthEvents.$inferSelect;
export type InsertSystemHealthEvent = typeof systemHealthEvents.$inferInsert;

// ─── Alert Rules ──────────────────────────────────────────────────────────────
export const alertRules = mysqlTable("alert_rules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("arUserId").notNull(),
  deviceConfigId: int("arDeviceConfigId"),             // null = applies to all user devices
  name: varchar("arName", { length: 100 }).notNull(),
  metricKey: varchar("arMetricKey", { length: 100 }).notNull(), // e.g. "battery_soc", "production_kwh"
  operator: mysqlEnum("arOperator", ["lt", "gt", "lte", "gte", "eq", "neq"]).notNull(),
  threshold: varchar("arThreshold", { length: 50 }).notNull(), // stored as string for flexibility
  severity: mysqlEnum("arSeverity", ["info", "warning", "critical"]).default("warning").notNull(),
  message: varchar("arMessage", { length: 500 }),      // custom message template
  isActive: boolean("arIsActive").default(true).notNull(),
  cooldownMinutes: int("arCooldownMinutes").default(60), // min minutes between repeated alerts
  lastTriggeredAt: timestamp("arLastTriggeredAt"),
  createdAt: timestamp("arCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("arUpdatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AlertRule = typeof alertRules.$inferSelect;
export type InsertAlertRule = typeof alertRules.$inferInsert;

// ─── Knowledge Articles ───────────────────────────────────────────────────────
export const knowledgeArticles = mysqlTable("knowledge_articles", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("kaAuthorId").notNull(),
  title: varchar("kaTitle", { length: 255 }).notNull(),
  slug: varchar("kaSlug", { length: 255 }).notNull().unique(),
  excerpt: text("kaExcerpt"),
  content: text("kaContent").notNull(),
  category: mysqlEnum("kaCategory", [
    "products",
    "regulations",
    "apps_services",
    "technology",
    "news",
    "other",
  ]).default("other").notNull(),
  tags: varchar("kaTags", { length: 500 }),   // comma-separated
  imageUrl: varchar("kaImageUrl", { length: 1000 }),
  published: boolean("kaPublished").default(false).notNull(),
  publishedAt: timestamp("kaPublishedAt"),
  createdAt: timestamp("kaCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("kaUpdatedAt").defaultNow().onUpdateNow().notNull(),
});
export type KnowledgeArticle = typeof knowledgeArticles.$inferSelect;
export type InsertKnowledgeArticle = typeof knowledgeArticles.$inferInsert;

// ─── Onboarding Progress ──────────────────────────────────────────────────────
export const onboardingProgress = mysqlTable("onboarding_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("opUserId").notNull().unique(),
  completedSteps: json("opCompletedSteps").$type<string[]>().default([]),
  dismissed: boolean("opDismissed").default(false).notNull(),
  completedAt: timestamp("opCompletedAt"),
  createdAt: timestamp("opCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("opUpdatedAt").defaultNow().onUpdateNow().notNull(),
});
export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type InsertOnboardingProgress = typeof onboardingProgress.$inferInsert;

// ─── Invitations ─────────────────────────────────────────────────────────────
export const invitations = mysqlTable("invitations", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("invToken", { length: 64 }).notNull().unique(),
  name: varchar("invName", { length: 255 }).notNull(),
  email: varchar("invEmail", { length: 320 }).notNull(),
  phone: varchar("invPhone", { length: 30 }),
  careTier: mysqlEnum("invCareTier", ["basic", "plus", "platinum"]).default("basic").notNull(),
  tempPassword: varchar("invTempPassword", { length: 255 }).notNull(), // bcrypt hash
  status: mysqlEnum("invStatus", ["pending", "accepted", "expired"]).default("pending").notNull(),
  invitedBy: int("invitedBy").notNull(), // admin userId
  smsSent: boolean("invSmsSent").default(false).notNull(),
  expiresAt: timestamp("invExpiresAt").notNull(),
  acceptedAt: timestamp("invAcceptedAt"),
  createdAt: timestamp("invCreatedAt").defaultNow().notNull(),
});
export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = typeof invitations.$inferInsert;

// ─── Password Reset Tokens ────────────────────────────────────────────────────
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("prtUserId").notNull(),
  token: varchar("prtToken", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("prtExpiresAt").notNull(),
  usedAt: timestamp("prtUsedAt"),
  createdAt: timestamp("prtCreatedAt").defaultNow().notNull(),
});
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// ─── Electricity Bills ───────────────────────────────────────────────────────
export const electricityBills = mysqlTable("electricity_bills", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("ebUserId").notNull(),
  filename: varchar("ebFilename", { length: 255 }).notNull(),
  fileKey: varchar("ebFileKey", { length: 500 }).notNull(),
  fileUrl: text("ebFileUrl").notNull(),
  billMonth: int("ebBillMonth").notNull(), // 1-12
  billYear: int("ebBillYear").notNull(),
  amount: decimal("ebAmount", { precision: 10, scale: 2 }), // SEK
  dueDate: timestamp("ebDueDate"),
  notes: text("ebNotes"),
  analysisJson: text("ebAnalysisJson"), // JSON string from LLM analysis
  analyzedAt: timestamp("ebAnalyzedAt"),
  createdAt: timestamp("ebCreatedAt").defaultNow().notNull(),
});
export type ElectricityBill = typeof electricityBills.$inferSelect;
export type InsertElectricityBill = typeof electricityBills.$inferInsert;

// ─── Bill Reminders ──────────────────────────────────────────────────────────
export const billReminders = mysqlTable("bill_reminders", {
  id: int("id").autoincrement().primaryKey(),
  billId: int("brBillId").notNull(),
  userId: int("brUserId").notNull(),
  reminderDate: timestamp("brReminderDate").notNull(),
  reminderType: mysqlEnum("brReminderType", ["email", "sms"]).notNull().default("email"),
  sent: boolean("brSent").default(false).notNull(),
  sentAt: timestamp("brSentAt"),
  createdAt: timestamp("brCreatedAt").defaultNow().notNull(),
});
export type BillReminder = typeof billReminders.$inferSelect;
export type InsertBillReminder = typeof billReminders.$inferInsert;
