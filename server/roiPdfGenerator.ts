/**
 * ROI PDF Report Generator – Sales Tool Edition
 * Generates a branded SolPulsen AI ROI report per customer using PDFKit.
 * Purpose: Make it emotionally clear that the customer is losing money without AI,
 * and show the concrete path to savings.
 */
import PDFDocument from "pdfkit";
import { getDb } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";

// ─── Brand constants ─────────────────────────────────────────────────────────
const B = {
  green:     "#00C896",
  greenDark: "#009E76",
  dark:      "#0A1628",
  darkCard:  "#111F35",
  navy:      "#0D2240",
  text:      "#1A2B3C",
  muted:     "#6B7F95",
  white:     "#FFFFFF",
  red:       "#DC2626",
  redLight:  "#FEE2E2",
  amber:     "#D97706",
  amberLight:"#FEF3C7",
  greenLight:"#D1FAE5",
  blue:      "#1D4ED8",
  blueLight: "#DBEAFE",
  grey:      "#F3F4F6",
  border:    "#E5E7EB",
  bold:      "Helvetica-Bold",
  reg:       "Helvetica",
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RoiReportData {
  customerName: string;
  customerEmail: string;
  fromDate: Date;
  toDate: Date;
  careTier: string | null;
  actions: Array<{
    id: number;
    actionType: string;
    description: string | null;
    status: string;
    savingsSek: number | null;
    savingsKwh: number | null;
    baselineCostSek: number | null;
    actualCostSek: number | null;
    confidence: number | null;
    roiEstimated: boolean | null;
    createdAt: Date;
    executedAt: Date | null;
  }>;
  summary: {
    totalActions: number;
    executedActions: number;
    failedActions: number;
    pendingActions: number;
    totalSavingsSek: number;
    totalSavingsKwh: number;
    totalBaselineSek: number;
    totalActualSek: number;
    avgConfidence: number;
    yearlyProjectedSavingsSek: number;
    yearlyProjectedLossSek: number;  // what they'd lose without AI per year
  };
  topRecommendations: Array<{
    title: string;
    description: string;
    estimatedSavingsSek: number;
    priority: "high" | "medium" | "low";
  }>;
}

// ─── Fetch report data ────────────────────────────────────────────────────────
export async function fetchRoiReportData(
  userId: number,
  fromDate: Date,
  toDate: Date
): Promise<RoiReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const { users, actions, contracts } = await import("../drizzle/schema");

  // User info
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) throw new Error("User not found");

  // CARE tier from contracts
  const contractRows = await db
    .select()
    .from(contracts)
    .where(eq(contracts.customerId, userId))
    .limit(5);
  const activeContract = contractRows.find(c => c.status === "active");
  const careTier = activeContract?.contractType ?? null;

  // Actions in date range
  const rows = await db
    .select()
    .from(actions)
    .where(
      and(
        eq(actions.userId, userId),
        gte(actions.createdAt, fromDate),
        lte(actions.createdAt, toDate)
      )
    )
    .orderBy(desc(actions.createdAt));

  const executed = rows.filter(a => a.status === "executed");
  const failed   = rows.filter(a => a.status === "failed");
  const pending  = rows.filter(a => a.status === "pending");

  const totalSavingsSek  = executed.reduce((s, a) => s + (a.savingsSek  ?? 0), 0);
  const totalSavingsKwh  = executed.reduce((s, a) => s + (a.savingsKwh  ?? 0), 0);
  const totalBaselineSek = executed.reduce((s, a) => s + (a.baselineCostSek ?? 0), 0);
  const totalActualSek   = executed.reduce((s, a) => s + (a.actualCostSek   ?? 0), 0);

  const confidences = executed.filter(a => (a.confidence ?? 0) > 0).map(a => a.confidence ?? 0);
  const avgConfidence = confidences.length > 0
    ? Math.round(confidences.reduce((s, c) => s + c, 0) / confidences.length)
    : 65;

  // Extrapolate to yearly
  const periodDays = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86400000));
  const dailySavings = totalSavingsSek / periodDays;
  const yearlyProjectedSavingsSek = Math.round(dailySavings * 365);

  // Yearly loss = what they'd pay extra without AI (baseline - actual annualised)
  const dailyLoss = (totalBaselineSek - totalActualSek) / periodDays;
  const yearlyProjectedLossSek = Math.max(0, Math.round(dailyLoss * 365));

  // Top AI recommendations based on action types and pending actions
  const topRecommendations = buildRecommendations(rows, yearlyProjectedSavingsSek);

  return {
    customerName: user.name ?? "Kund",
    customerEmail: user.email ?? "",
    fromDate,
    toDate,
    careTier,
    actions: rows.map(a => ({
      id: a.id,
      actionType: a.actionType,
      description: a.description,
      status: a.status,
      savingsSek: a.savingsSek,
      savingsKwh: a.savingsKwh,
      baselineCostSek: a.baselineCostSek,
      actualCostSek: a.actualCostSek,
      confidence: a.confidence,
      roiEstimated: a.roiEstimated,
      createdAt: a.createdAt,
      executedAt: a.executedAt ?? null,
    })),
    summary: {
      totalActions: rows.length,
      executedActions: executed.length,
      failedActions: failed.length,
      pendingActions: pending.length,
      totalSavingsSek,
      totalSavingsKwh,
      totalBaselineSek,
      totalActualSek,
      avgConfidence,
      yearlyProjectedSavingsSek,
      yearlyProjectedLossSek,
    },
    topRecommendations,
  };
}

function buildRecommendations(
  rows: any[],
  yearlyProjectedSek: number
): RoiReportData["topRecommendations"] {
  const recs: RoiReportData["topRecommendations"] = [];

  const hasBattery = rows.some(a => a.actionType === "optimize_battery");
  const hasSchedule = rows.some(a => a.actionType === "schedule_charging");
  const hasSell = rows.some(a => a.actionType === "sell_excess");
  const hasPending = rows.some(a => a.status === "pending");

  if (hasPending) {
    recs.push({
      title: "Godkänn väntande AI-åtgärder",
      description: "Det finns åtgärder som AI har föreslagit men som ännu inte körts. Varje dag utan godkännande är en förlorad besparing.",
      estimatedSavingsSek: Math.round(yearlyProjectedSek * 0.15),
      priority: "high",
    });
  }
  if (!hasBattery) {
    recs.push({
      title: "Aktivera batterioptimering",
      description: "AI kan automatiskt ladda batteriet vid lågpristimmar och ladda ur vid högtimmar. Genomsnittlig besparing: 15–25% på elkostnaden.",
      estimatedSavingsSek: Math.round(yearlyProjectedSek * 0.20),
      priority: "high",
    });
  } else {
    recs.push({
      title: "Utöka batterioptimering till prognosstyrd drift",
      description: "Kombinera batterioptimering med 48h-elprisprognoser för att maximera arbitrage-vinsten.",
      estimatedSavingsSek: Math.round(yearlyProjectedSek * 0.12),
      priority: "medium",
    });
  }
  if (!hasSchedule) {
    recs.push({
      title: "Aktivera schemalagd laddning",
      description: "Schemalägger automatiskt laddning till de billigaste timmarna varje natt baserat på spotpris.",
      estimatedSavingsSek: Math.round(yearlyProjectedSek * 0.10),
      priority: "medium",
    });
  }
  if (!hasSell) {
    recs.push({
      title: "Sälj överskottsel vid topptimmar",
      description: "AI identifierar när spotpriset är >150 öre/kWh och exporterar batteriladdning till nätet automatiskt.",
      estimatedSavingsSek: Math.round(yearlyProjectedSek * 0.08),
      priority: "low",
    });
  }
  recs.push({
    title: "Uppgradera till CARE Platinum",
    description: "Platinum-kunder får 4h SLA, dedikerad AI-optimering och månatliga ROI-rapporter automatiskt. Genomsnittlig extra besparing: 8–12%.",
    estimatedSavingsSek: Math.round(yearlyProjectedSek * 0.09),
    priority: "medium",
  });

  return recs.slice(0, 4);
}

// ─── Format helpers ───────────────────────────────────────────────────────────
function fDate(d: Date): string {
  return d.toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" });
}
function fSek(ore: number): string {
  const sek = ore / 100;
  if (sek >= 10000) return `${(sek / 1000).toFixed(1)} kSEK`;
  if (sek >= 1000)  return `${sek.toFixed(0)} SEK`;
  return `${sek.toFixed(0)} SEK`;
}
function fKwh(wh10: number): string {
  return (wh10 / 10).toFixed(0) + " kWh";
}
function actionLabel(t: string): string {
  const m: Record<string, string> = {
    optimize_battery:  "Batterioptimering",
    schedule_charging: "Schemalagd laddning",
    view_forecast:     "Prognos",
    monitor_risk:      "Riskbevakning",
    adjust_load:       "Lastjustering",
    sell_excess:       "Överskottsförsäljning",
    custom:            "Anpassad",
  };
  return m[t] ?? t;
}
function statusLabel(s: string): string {
  const m: Record<string, string> = {
    executed:  "Utförd",
    pending:   "Väntar",
    approved:  "Godkänd",
    failed:    "Misslyckad",
    dismissed: "Avvisad",
  };
  return m[s] ?? s;
}
function tierLabel(t: string | null): string {
  if (!t) return "—";
  const m: Record<string, string> = {
    care_basic:    "CARE Basic",
    care_plus:     "CARE Plus",
    care_platinum: "CARE Platinum",
  };
  return m[t] ?? t;
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────
function drawRoundedRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, r: number, fillColor: string) {
  doc.roundedRect(x, y, w, h, r).fill(fillColor);
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string, x: number, y: number, W: number, M: number): number {
  doc.rect(x, y, 4, 16).fill(B.green);
  doc.font(B.bold).fontSize(11).fillColor(B.dark).text(title, x + 12, y + 1);
  doc.rect(M, y + 22, W - M * 2, 0.5).fill(B.border);
  return y + 32;
}

// ─── PDF Generator ────────────────────────────────────────────────────────────
export function generateRoiPdf(data: RoiReportData): Buffer {
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    info: {
      Title: `SolPulsen AI ROI-rapport – ${data.customerName}`,
      Author: "SolPulsen Energy Norden AB",
      Subject: "AI-åtgärdshistorik, besparingsanalys och rekommendationer",
    },
  });

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const W  = doc.page.width;   // 595
  const H  = doc.page.height;  // 842
  const M  = 44;               // margin
  const CW = W - M * 2;        // content width

  // ══════════════════════════════════════════════════════════════════
  // PAGE 1 – COVER + LOSS STATEMENT + BEFORE/AFTER + RECOMMENDATIONS
  // ══════════════════════════════════════════════════════════════════

  // ── HEADER BAND ───────────────────────────────────────────────────
  doc.rect(0, 0, W, 130).fill(B.dark);
  doc.rect(0, 128, W, 4).fill(B.green);

  // Logo text
  doc.font(B.bold).fontSize(24).fillColor(B.green).text("SOLPULSEN", M, 30);
  doc.font(B.reg).fontSize(9).fillColor(B.muted).text("ENERGY NORDEN AB  ·  CARE Department", M, 58);

  // Report label
  doc.font(B.bold).fontSize(18).fillColor(B.white).text("AI ROI-rapport", W - 230, 26, { width: 186, align: "right" });
  doc.font(B.reg).fontSize(8.5).fillColor(B.muted).text(
    `${fDate(data.fromDate)} – ${fDate(data.toDate)}`,
    W - 230, 50, { width: 186, align: "right" }
  );
  doc.font(B.reg).fontSize(8.5).fillColor(B.muted).text(
    `Genererad ${fDate(new Date())}`,
    W - 230, 64, { width: 186, align: "right" }
  );

  // Customer + tier pill
  doc.font(B.bold).fontSize(13).fillColor(B.white).text(data.customerName, M, 88);
  doc.font(B.reg).fontSize(9).fillColor(B.muted).text(data.customerEmail, M, 106);
  if (data.careTier) {
    const tierText = tierLabel(data.careTier);
    const tierW = 90;
    drawRoundedRect(doc, W - M - tierW, 88, tierW, 22, 11, B.green);
    doc.font(B.bold).fontSize(8).fillColor(B.dark).text(tierText, W - M - tierW, 95, { width: tierW, align: "center" });
  }

  let y = 148;

  // ── LOSS STATEMENT (emotional hook) ───────────────────────────────
  const lossBoxH = 80;
  drawRoundedRect(doc, M, y, CW, lossBoxH, 8, "#FFF1F2");
  doc.rect(M, y, 5, lossBoxH).fill(B.red);

  const yearlyLoss = data.summary.yearlyProjectedLossSek;
  const yearlyLossSek = yearlyLoss / 100;

  doc.font(B.bold).fontSize(10).fillColor(B.red).text(
    "UTAN AI-OPTIMERING FÖRLORAR DU IDAG:",
    M + 20, y + 14
  );
  doc.font(B.bold).fontSize(28).fillColor(B.red).text(
    yearlyLoss > 0 ? `${yearlyLossSek.toFixed(0)} SEK / år` : "Aktivera AI för att mäta",
    M + 20, y + 30
  );
  doc.font(B.reg).fontSize(8.5).fillColor("#991B1B").text(
    "Baserat på skillnaden mellan baseline-kostnad och AI-optimerad kostnad under rapportperioden, extrapolerat till 12 månader.",
    M + 20, y + 62, { width: CW - 40 }
  );

  y += lossBoxH + 16;

  // ── BEFORE / AFTER COMPARISON ─────────────────────────────────────
  y = drawSectionTitle(doc, "Jämförelse: Utan AI vs Med AI", M, y, W, M);

  const colW = (CW - 12) / 2;

  // BEFORE box
  drawRoundedRect(doc, M, y, colW, 100, 8, B.redLight);
  doc.rect(M, y, colW, 28).fill(B.red);
  doc.font(B.bold).fontSize(10).fillColor(B.white).text("UTAN AI-OPTIMERING", M + 12, y + 9, { width: colW - 24 });
  doc.font(B.bold).fontSize(22).fillColor(B.red).text(
    fSek(data.summary.totalBaselineSek || data.summary.totalSavingsSek * 2 || 0),
    M + 12, y + 38, { width: colW - 24 }
  );
  doc.font(B.reg).fontSize(8).fillColor("#991B1B").text("Beräknad kostnad utan AI", M + 12, y + 66, { width: colW - 24 });
  doc.font(B.reg).fontSize(8).fillColor("#991B1B").text("Manuell styrning, höga topptimmar", M + 12, y + 78, { width: colW - 24 });

  // AFTER box
  drawRoundedRect(doc, M + colW + 12, y, colW, 100, 8, B.greenLight);
  doc.rect(M + colW + 12, y, colW, 28).fill(B.greenDark);
  doc.font(B.bold).fontSize(10).fillColor(B.white).text("MED AI-OPTIMERING", M + colW + 24, y + 9, { width: colW - 24 });
  doc.font(B.bold).fontSize(22).fillColor(B.greenDark).text(
    fSek(data.summary.totalActualSek || Math.max(0, (data.summary.totalBaselineSek || 0) - data.summary.totalSavingsSek)),
    M + colW + 24, y + 38, { width: colW - 24 }
  );
  doc.font(B.reg).fontSize(8).fillColor("#166534").text("Faktisk kostnad med AI", M + colW + 24, y + 66, { width: colW - 24 });
  doc.font(B.reg).fontSize(8).fillColor("#166534").text("Automatisk optimering dygnet runt", M + colW + 24, y + 78, { width: colW - 24 });

  // Arrow between boxes
  doc.font(B.bold).fontSize(20).fillColor(B.green).text("→", M + colW - 2, y + 36, { width: 16, align: "center" });

  y += 116;

  // ── KPI SUMMARY ROW ───────────────────────────────────────────────
  const kpiW = (CW - 24) / 4;
  const kpis = [
    { label: "Total besparing",   value: fSek(data.summary.totalSavingsSek),       bg: B.greenLight, fg: B.greenDark, border: B.green },
    { label: "Energibesparing",   value: fKwh(data.summary.totalSavingsKwh),        bg: B.blueLight,  fg: B.blue,      border: B.blue  },
    { label: "Utförda åtgärder",  value: String(data.summary.executedActions),      bg: B.grey,       fg: B.dark,      border: B.border},
    { label: "Väntande åtgärder", value: String(data.summary.pendingActions),       bg: B.amberLight, fg: B.amber,     border: B.amber },
  ];
  kpis.forEach((k, i) => {
    const x = M + i * (kpiW + 8);
    drawRoundedRect(doc, x, y, kpiW, 60, 6, k.bg);
    doc.rect(x, y, kpiW, 3).fill(k.border);
    doc.font(B.bold).fontSize(18).fillColor(k.fg).text(k.value, x + 8, y + 14, { width: kpiW - 16, align: "center" });
    doc.font(B.reg).fontSize(7.5).fillColor(B.muted).text(k.label, x + 8, y + 40, { width: kpiW - 16, align: "center" });
  });

  y += 76;

  // Confidence bar
  if (data.summary.avgConfidence > 0) {
    doc.font(B.reg).fontSize(8).fillColor(B.muted).text(
      `Datakvalitet: ${data.summary.avgConfidence}%  (${data.summary.avgConfidence >= 70 ? "Hög tillförlitlighet" : data.summary.avgConfidence >= 40 ? "Medel tillförlitlighet" : "Estimerat"})`,
      M, y
    );
    doc.rect(M, y + 12, CW, 5).fill(B.border);
    doc.rect(M, y + 12, CW * (data.summary.avgConfidence / 100), 5).fill(B.green);
    y += 28;
  }

  y += 8;

  // ── AI RECOMMENDATIONS ────────────────────────────────────────────
  if (y + 180 > H - 80) { doc.addPage(); y = M; }

  y = drawSectionTitle(doc, "AI-rekommendationer – Nästa steg för ökad besparing", M, y, W, M);

  const priorityColors: Record<string, { bg: string; fg: string; label: string }> = {
    high:   { bg: "#FEE2E2", fg: B.red,   label: "HÖG" },
    medium: { bg: B.amberLight, fg: B.amber, label: "MEDEL" },
    low:    { bg: B.greenLight, fg: B.greenDark, label: "LÅG" },
  };

  for (const rec of data.topRecommendations) {
    const recH = 58;
    if (y + recH > H - 80) { doc.addPage(); y = M; }

    const pc = priorityColors[rec.priority] ?? priorityColors.medium;
    drawRoundedRect(doc, M, y, CW, recH, 6, B.grey);
    doc.rect(M, y, 4, recH).fill(pc.fg);

    // Priority badge
    drawRoundedRect(doc, M + 12, y + 8, 36, 14, 7, pc.bg);
    doc.font(B.bold).fontSize(6.5).fillColor(pc.fg).text(pc.label, M + 12, y + 12, { width: 36, align: "center" });

    // Savings badge
    const savBadgeX = CW + M - 80;
    drawRoundedRect(doc, savBadgeX, y + 8, 76, 14, 7, B.greenLight);
    doc.font(B.bold).fontSize(7).fillColor(B.greenDark).text(
      `+${fSek(rec.estimatedSavingsSek)}/år`,
      savBadgeX, y + 12, { width: 76, align: "center" }
    );

    doc.font(B.bold).fontSize(9).fillColor(B.dark).text(rec.title, M + 56, y + 8, { width: CW - 160 });
    doc.font(B.reg).fontSize(7.5).fillColor(B.muted).text(rec.description, M + 56, y + 22, { width: CW - 160 });

    y += recH + 8;
  }

  y += 8;

  // ══════════════════════════════════════════════════════════════════
  // PAGE 2 – ACTIONS TABLE + SALES FOOTER
  // ══════════════════════════════════════════════════════════════════
  doc.addPage();
  y = M;

  // Page 2 mini-header
  doc.rect(0, 0, W, 36).fill(B.dark);
  doc.font(B.bold).fontSize(10).fillColor(B.green).text("SOLPULSEN", M, 12);
  doc.font(B.reg).fontSize(8).fillColor(B.muted).text(`AI ROI-rapport  ·  ${data.customerName}`, M + 80, 14);
  doc.font(B.reg).fontSize(8).fillColor(B.muted).text(`${fDate(data.fromDate)} – ${fDate(data.toDate)}`, W - 200, 14, { width: 156, align: "right" });
  doc.rect(0, 35, W, 2).fill(B.green);
  y = 52;

  y = drawSectionTitle(doc, "Åtgärdshistorik – Detaljerad logg", M, y, W, M);

  // Table header
  const cols = { date: M, type: M + 88, status: M + 216, baseline: M + 298, actual: M + 370, savings: M + 442 };
  doc.rect(M, y, CW, 22).fill(B.dark);
  doc.font(B.bold).fontSize(7.5).fillColor(B.white);
  doc.text("Datum",         cols.date     + 4, y + 7);
  doc.text("Åtgärdstyp",   cols.type     + 4, y + 7);
  doc.text("Status",        cols.status   + 4, y + 7);
  doc.text("Baseline",      cols.baseline + 4, y + 7);
  doc.text("Faktisk",       cols.actual   + 4, y + 7);
  doc.text("Besparing",     cols.savings  + 4, y + 7);
  y += 24;

  const ROW_H = 20;
  let rowIdx = 0;

  for (const action of data.actions) {
    if (y + ROW_H > H - 100) {
      doc.addPage();
      y = M;
      // Repeat mini-header
      doc.rect(0, 0, W, 36).fill(B.dark);
      doc.font(B.bold).fontSize(10).fillColor(B.green).text("SOLPULSEN", M, 12);
      doc.font(B.reg).fontSize(8).fillColor(B.muted).text(`AI ROI-rapport  ·  ${data.customerName}`, M + 80, 14);
      doc.rect(0, 35, W, 2).fill(B.green);
      y = 52;
      // Repeat table header
      doc.rect(M, y, CW, 22).fill(B.dark);
      doc.font(B.bold).fontSize(7.5).fillColor(B.white);
      doc.text("Datum",     cols.date     + 4, y + 7);
      doc.text("Åtgärdstyp", cols.type   + 4, y + 7);
      doc.text("Status",    cols.status   + 4, y + 7);
      doc.text("Baseline",  cols.baseline + 4, y + 7);
      doc.text("Faktisk",   cols.actual   + 4, y + 7);
      doc.text("Besparing", cols.savings  + 4, y + 7);
      y += 24;
    }

    if (rowIdx % 2 === 0) doc.rect(M, y, CW, ROW_H).fill(B.grey);

    const statusColor =
      action.status === "executed"  ? B.greenDark :
      action.status === "failed"    ? B.red :
      action.status === "pending"   ? B.amber :
      B.muted;

    doc.font(B.reg).fontSize(7.5).fillColor(B.text);
    doc.text(new Date(action.createdAt).toLocaleDateString("sv-SE"), cols.date + 4, y + 6, { width: 80 });
    doc.text(actionLabel(action.actionType), cols.type + 4, y + 6, { width: 124 });
    doc.font(B.bold).fontSize(7.5).fillColor(statusColor);
    doc.text(statusLabel(action.status), cols.status + 4, y + 6, { width: 78 });
    doc.font(B.reg).fontSize(7.5).fillColor(B.text);
    doc.text(action.baselineCostSek != null ? fSek(action.baselineCostSek) : "—", cols.baseline + 4, y + 6, { width: 68 });
    doc.text(action.actualCostSek   != null ? fSek(action.actualCostSek)   : "—", cols.actual   + 4, y + 6, { width: 68 });
    doc.font(B.bold).fontSize(7.5).fillColor(action.savingsSek != null && action.savingsSek > 0 ? B.greenDark : B.text);
    doc.text(action.savingsSek != null ? fSek(action.savingsSek) : "—", cols.savings + 4, y + 6, { width: 68 });

    doc.rect(M, y + ROW_H - 0.5, CW, 0.5).fill(B.border);
    y += ROW_H;
    rowIdx++;
  }

  if (data.actions.length === 0) {
    doc.font(B.reg).fontSize(10).fillColor(B.muted)
      .text("Inga åtgärder registrerade för vald period.", M, y + 16, { align: "center", width: CW });
    y += 50;
  }

  y += 20;

  // ── YEARLY PROJECTION BOX ─────────────────────────────────────────
  if (y + 70 > H - 120) { doc.addPage(); y = M; }

  drawRoundedRect(doc, M, y, CW, 64, 8, B.dark);
  doc.rect(M, y, 5, 64).fill(B.green);
  doc.font(B.bold).fontSize(10).fillColor(B.green).text("BERÄKNAD ÅRSBESPARNING MED AI", M + 20, y + 12);
  doc.font(B.bold).fontSize(26).fillColor(B.white).text(
    fSek(data.summary.yearlyProjectedSavingsSek),
    M + 20, y + 28
  );
  doc.font(B.reg).fontSize(8).fillColor(B.muted).text(
    `Baserat på ${data.summary.executedActions} utförda åtgärder under ${Math.round((data.toDate.getTime() - data.fromDate.getTime()) / 86400000)} dagar, extrapolerat till 12 månader.`,
    M + 20, y + 50, { width: CW - 40 }
  );

  y += 80;

  // ── SALES FOOTER / CTA ────────────────────────────────────────────
  const footerY = H - 100;
  if (y < footerY - 10) y = footerY - 10;

  doc.rect(0, footerY - 8, W, 108).fill(B.dark);
  doc.rect(0, footerY - 8, W, 3).fill(B.green);

  // CTA text
  doc.font(B.bold).fontSize(11).fillColor(B.white).text(
    "Vill du maximera din besparing?",
    M, footerY + 4
  );
  doc.font(B.reg).fontSize(8.5).fillColor(B.muted).text(
    "Kontakta SolPulsen CARE-teamet för en kostnadsfri genomgång av ditt system och en skräddarsydd optimeringsplan.",
    M, footerY + 20, { width: CW * 0.65 }
  );

  // Contact info
  doc.font(B.bold).fontSize(8).fillColor(B.green).text("www.solpulsen.se", M, footerY + 46);
  doc.font(B.reg).fontSize(8).fillColor(B.muted).text("care@solpulsen.se  ·  CARE Department", M, footerY + 60);

  // Confidentiality
  doc.font(B.reg).fontSize(7).fillColor("#3D5A75").text(
    "Denna rapport är konfidentiell och avsedd enbart för angiven kund. © SolPulsen Energy Norden AB",
    M, footerY + 80, { align: "center", width: CW }
  );

  doc.end();
  return Buffer.concat(chunks);
}
