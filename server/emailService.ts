/**
 * SolPulsen Email Service
 * Premium branded transactional emails via Nodemailer + STARTTLS (prime6.inleed.net:587)
 *
 * Triggers:
 *  - Ticket created / updated
 *  - AI action executed
 *  - ROI report generated
 */
import nodemailer from "nodemailer";

// ─── SMTP Transport ───────────────────────────────────────────────────────────
function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   ?? "prime6.inleed.net",
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: false,          // STARTTLS – upgrades after connect
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER ?? "noreply@solpulsen.se",
      pass: process.env.SMTP_PASS ?? "",
    },
    tls: { rejectUnauthorized: false },
  });
}

// ─── Brand constants ──────────────────────────────────────────────────────────
const BRAND = {
  green:  "#00C896",
  dark:   "#0A1628",
  muted:  "#6B7F95",
  white:  "#FFFFFF",
  red:    "#DC2626",
  amber:  "#D97706",
  from:   "SolPulsen CARE <noreply@solpulsen.se>",
  site:   "https://solpulsen.se",
  care:   "care@solpulsen.se",
};

// ─── Base HTML layout ─────────────────────────────────────────────────────────
function baseLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F4F6;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

      <!-- Header -->
      <tr>
        <td style="background:${BRAND.dark};border-radius:12px 12px 0 0;padding:28px 40px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <span style="font-size:22px;font-weight:800;color:${BRAND.green};letter-spacing:-0.5px;">SOLPULSEN</span>
                <span style="font-size:10px;color:${BRAND.muted};display:block;margin-top:2px;">ENERGY NORDEN AB  ·  CARE Department</span>
              </td>
              <td align="right">
                <span style="font-size:11px;color:${BRAND.muted};">${new Date().toLocaleDateString("sv-SE")}</span>
              </td>
            </tr>
          </table>
          <div style="height:3px;background:${BRAND.green};border-radius:2px;margin-top:20px;"></div>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="background:${BRAND.white};padding:36px 40px;">
          ${body}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#F9FAFB;border-radius:0 0 12px 12px;border-top:1px solid #E5E7EB;padding:20px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <p style="margin:0;font-size:11px;color:${BRAND.muted};">
                  <a href="${BRAND.site}" style="color:${BRAND.green};text-decoration:none;font-weight:600;">www.solpulsen.se</a>
                  &nbsp;·&nbsp;${BRAND.care}
                </p>
                <p style="margin:4px 0 0;font-size:10px;color:#9CA3AF;">
                  Detta mail skickades automatiskt av SolPulsen CARE-systemet. Svara inte på detta mail.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function badge(text: string, bg: string, color: string): string {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:20px;background:${bg};color:${color};font-size:11px;font-weight:600;">${text}</span>`;
}

function kpiRow(items: { label: string; value: string; color?: string }[]): string {
  const cells = items.map(i => `
    <td align="center" style="padding:12px 8px;background:#F9FAFB;border-radius:8px;">
      <div style="font-size:20px;font-weight:800;color:${i.color ?? BRAND.dark};">${i.value}</div>
      <div style="font-size:10px;color:${BRAND.muted};margin-top:2px;">${i.label}</div>
    </td>
  `).join('<td style="width:8px;"></td>');
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>`;
}

function divider(): string {
  return `<div style="height:1px;background:#E5E7EB;margin:24px 0;"></div>`;
}

function ctaButton(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 28px;background:${BRAND.green};color:${BRAND.dark};font-weight:700;font-size:13px;border-radius:8px;text-decoration:none;">${text}</a>`;
}

// ─── Email: Ticket Created ────────────────────────────────────────────────────
export interface TicketCreatedData {
  to: string;
  customerName: string;
  ticketNumber: string;
  subject: string;
  priority: string;
  category: string;
  slaDeadline: Date | null;
  careTier: string | null;
}

export async function sendTicketCreatedEmail(data: TicketCreatedData): Promise<void> {
  const priorityColors: Record<string, { bg: string; color: string }> = {
    urgent: { bg: "#FEE2E2", color: "#DC2626" },
    high:   { bg: "#FEF3C7", color: "#D97706" },
    medium: { bg: "#DBEAFE", color: "#1D4ED8" },
    low:    { bg: "#F3F4F6", color: "#6B7F95" },
  };
  const pc = priorityColors[data.priority] ?? priorityColors.medium;

  const slaText = data.slaDeadline
    ? `<p style="font-size:12px;color:${BRAND.muted};margin:8px 0 0;">SLA-deadline: <strong style="color:${BRAND.dark};">${new Date(data.slaDeadline).toLocaleString("sv-SE")}</strong></p>`
    : "";

  const tierLabel: Record<string, string> = {
    care_basic: "CARE Basic", care_plus: "CARE Plus", care_platinum: "CARE Platinum",
  };

  const body = `
    <h2 style="margin:0 0 6px;font-size:20px;color:${BRAND.dark};">Ditt ärende är registrerat</h2>
    <p style="margin:0 0 24px;font-size:14px;color:${BRAND.muted};">Hej ${data.customerName}, vi har tagit emot ditt supportärende och arbetar på det.</p>

    <div style="background:#F9FAFB;border-radius:10px;padding:20px;border-left:4px solid ${BRAND.green};">
      <p style="margin:0 0 4px;font-size:11px;color:${BRAND.muted};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Ärendenummer</p>
      <p style="margin:0 0 12px;font-size:18px;font-weight:800;color:${BRAND.dark};font-family:monospace;">${data.ticketNumber}</p>
      <p style="margin:0 0 4px;font-size:13px;color:${BRAND.dark};font-weight:600;">${data.subject}</p>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
        ${badge(data.priority.toUpperCase(), pc.bg, pc.color)}
        ${badge(data.category, "#F3F4F6", BRAND.muted)}
        ${data.careTier ? badge(tierLabel[data.careTier] ?? data.careTier, "#D1FAE5", "#166534") : ""}
      </div>
      ${slaText}
    </div>

    ${divider()}

    <p style="font-size:13px;color:${BRAND.muted};margin:0 0 20px;">
      Vi svarar inom SLA-tid baserat på din CARE-nivå. Du kan följa ärendets status i portalen.
    </p>
    ${ctaButton("Öppna portalen", BRAND.site)}
  `;

  await sendMail({
    to: data.to,
    subject: `Ärende ${data.ticketNumber} registrerat – ${data.subject}`,
    html: baseLayout(`Ärende ${data.ticketNumber}`, body),
  });
}

// ─── Email: Ticket Updated ────────────────────────────────────────────────────
export interface TicketUpdatedData {
  to: string;
  customerName: string;
  ticketNumber: string;
  subject: string;
  newStatus: string;
  comment?: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  open:        { label: "Öppen",       color: "#1D4ED8", bg: "#DBEAFE" },
  in_progress: { label: "Pågår",       color: "#D97706", bg: "#FEF3C7" },
  waiting:     { label: "Väntar",      color: "#7C3AED", bg: "#EDE9FE" },
  resolved:    { label: "Löst",        color: "#166534", bg: "#D1FAE5" },
  closed:      { label: "Stängd",      color: "#6B7F95", bg: "#F3F4F6" },
};

export async function sendTicketUpdatedEmail(data: TicketUpdatedData): Promise<void> {
  const sc = STATUS_LABELS[data.newStatus] ?? STATUS_LABELS.open;

  const body = `
    <h2 style="margin:0 0 6px;font-size:20px;color:${BRAND.dark};">Ärendestatus uppdaterad</h2>
    <p style="margin:0 0 24px;font-size:14px;color:${BRAND.muted};">Hej ${data.customerName}, ditt ärende har uppdaterats.</p>

    <div style="background:#F9FAFB;border-radius:10px;padding:20px;border-left:4px solid ${sc.color};">
      <p style="margin:0 0 4px;font-size:11px;color:${BRAND.muted};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Ärendenummer</p>
      <p style="margin:0 0 8px;font-size:16px;font-weight:800;color:${BRAND.dark};font-family:monospace;">${data.ticketNumber}</p>
      <p style="margin:0 0 12px;font-size:13px;color:${BRAND.dark};">${data.subject}</p>
      <div>Ny status: ${badge(sc.label, sc.bg, sc.color)}</div>
    </div>

    ${data.comment ? `
      ${divider()}
      <p style="font-size:11px;color:${BRAND.muted};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Kommentar från CARE-teamet</p>
      <p style="font-size:13px;color:${BRAND.dark};background:#F9FAFB;padding:14px;border-radius:8px;margin:0;">${data.comment}</p>
    ` : ""}

    ${divider()}
    ${ctaButton("Visa ärende", BRAND.site)}
  `;

  await sendMail({
    to: data.to,
    subject: `Ärende ${data.ticketNumber} – Status: ${sc.label}`,
    html: baseLayout(`Ärende ${data.ticketNumber} uppdaterat`, body),
  });
}

// ─── Email: AI Action Executed ────────────────────────────────────────────────
export interface AiActionEmailData {
  to: string;
  customerName: string;
  actionType: string;
  description: string;
  savingsSek: number;
  savingsKwh: number;
  confidence: number;
}

const ACTION_LABELS: Record<string, string> = {
  optimize_battery:  "Batterioptimering",
  schedule_charging: "Schemalagd laddning",
  view_forecast:     "Prognos",
  monitor_risk:      "Riskbevakning",
  adjust_load:       "Lastjustering",
  sell_excess:       "Överskottsförsäljning",
  custom:            "Anpassad åtgärd",
};

export async function sendAiActionEmail(data: AiActionEmailData): Promise<void> {
  const label = ACTION_LABELS[data.actionType] ?? data.actionType;
  const savSek = (data.savingsSek / 100).toFixed(2);
  const savKwh = (data.savingsKwh / 10).toFixed(1);

  const body = `
    <h2 style="margin:0 0 6px;font-size:20px;color:${BRAND.dark};">AI-åtgärd utförd</h2>
    <p style="margin:0 0 24px;font-size:14px;color:${BRAND.muted};">Hej ${data.customerName}, PULSEN A.I. har automatiskt optimerat ditt energisystem.</p>

    <div style="background:${BRAND.dark};border-radius:10px;padding:20px;">
      <p style="margin:0 0 4px;font-size:11px;color:${BRAND.muted};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Åtgärdstyp</p>
      <p style="margin:0 0 12px;font-size:16px;font-weight:800;color:${BRAND.green};">${label}</p>
      <p style="margin:0;font-size:13px;color:#CBD5E1;">${data.description}</p>
    </div>

    ${divider()}

    ${kpiRow([
      { label: "Besparing",     value: `${savSek} SEK`,  color: "#166534" },
      { label: "Energibesparing", value: `${savKwh} kWh`, color: "#1D4ED8" },
      { label: "Datakvalitet",  value: `${data.confidence}%`,  color: BRAND.dark },
    ])}

    ${divider()}
    <p style="font-size:12px;color:${BRAND.muted};margin:0 0 20px;">
      Besparingen är ${data.confidence >= 70 ? "mätt med hög tillförlitlighet" : "estimerad baserat på tillgänglig data"}.
      Logga in i portalen för att se fullständig ROI-historik.
    </p>
    ${ctaButton("Visa AI ROI-historik", BRAND.site)}
  `;

  await sendMail({
    to: data.to,
    subject: `PULSEN A.I. utförde ${label} – Besparing ${savSek} SEK`,
    html: baseLayout("AI-åtgärd utförd", body),
  });
}

// ─── Email: ROI Report Generated ─────────────────────────────────────────────
export interface RoiReportEmailData {
  to: string;
  customerName: string;
  fromDate: Date;
  toDate: Date;
  totalSavingsSek: number;
  yearlyProjectedSek: number;
  executedActions: number;
}

export async function sendRoiReportEmail(data: RoiReportEmailData): Promise<void> {
  const savSek  = (data.totalSavingsSek / 100).toFixed(0);
  const yearSek = (data.yearlyProjectedSek / 100).toFixed(0);
  const from    = data.fromDate.toLocaleDateString("sv-SE");
  const to      = data.toDate.toLocaleDateString("sv-SE");

  const body = `
    <h2 style="margin:0 0 6px;font-size:20px;color:${BRAND.dark};">Din AI ROI-rapport är klar</h2>
    <p style="margin:0 0 24px;font-size:14px;color:${BRAND.muted};">Hej ${data.customerName}, din ROI-rapport för perioden ${from}–${to} har genererats.</p>

    <div style="background:#F0FDF4;border-radius:10px;padding:20px;border-left:4px solid ${BRAND.green};">
      <p style="margin:0 0 4px;font-size:11px;color:${BRAND.muted};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Sammanfattning</p>
      <p style="margin:0 0 4px;font-size:28px;font-weight:900;color:#166534;">${savSek} SEK</p>
      <p style="margin:0;font-size:12px;color:#166534;">Besparing under perioden · ${data.executedActions} utförda AI-åtgärder</p>
    </div>

    ${divider()}

    ${kpiRow([
      { label: "Periodbesparing",   value: `${savSek} SEK`,  color: "#166534" },
      { label: "Prognos per år",    value: `${yearSek} SEK`, color: BRAND.dark },
      { label: "Utförda åtgärder",  value: String(data.executedActions), color: "#1D4ED8" },
    ])}

    ${divider()}
    <p style="font-size:13px;color:${BRAND.muted};margin:0 0 20px;">
      Ladda ner den fullständiga PDF-rapporten med detaljerad åtgärdslogg, before/after-jämförelse och AI-rekommendationer direkt i portalen.
    </p>
    ${ctaButton("Ladda ner ROI-rapport (PDF)", BRAND.site)}
  `;

  await sendMail({
    to: data.to,
    subject: `Din AI ROI-rapport – Besparing ${savSek} SEK (${from}–${to})`,
    html: baseLayout("AI ROI-rapport", body),
  });
}

// ─── Core sendMail ────────────────────────────────────────────────────────────
interface MailOptions {
  to: string;
  subject: string;
  html: string;
  cc?: string;
}

export async function sendMail(opts: MailOptions): Promise<void> {
  if (!process.env.SMTP_PASS) {
    console.warn("[emailService] SMTP_PASS not set – email not sent:", opts.subject);
    return;
  }
  const transport = createTransport();
  try {
    await transport.sendMail({
      from:    BRAND.from,
      to:      opts.to,
      cc:      opts.cc,
      subject: opts.subject,
      html:    opts.html,
    });
    console.info(`[emailService] Sent: "${opts.subject}" → ${opts.to}`);
  } catch (err) {
    console.error("[emailService] Failed to send email:", err);
    // Non-fatal: log but don't throw so the main operation succeeds
  } finally {
    transport.close();
  }
}

// ─── CARE Logo CDN URL ────────────────────────────────────────────────────────
const CARE_LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/107016592/8kqYZvaGCpcSjyuXQ9yrCo/logo_web_300px_02452a28.png";

// ─── Premium dark layout with CARE logo ──────────────────────────────────────
function premiumLayout(title: string, body: string, preheader = ""): string {
  return `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0D1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ""}
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0D1117;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
      <!-- Header with logo -->
      <tr>
        <td style="background:linear-gradient(135deg,#0A1628 0%,#0F2040 100%);border-radius:16px 16px 0 0;padding:36px 48px 32px;text-align:center;">
          <img src="${CARE_LOGO_URL}" alt="Solpulsen CARE" width="160" style="display:block;margin:0 auto 20px;max-width:160px;" />
          <div style="height:2px;background:linear-gradient(90deg,transparent,#D97706,transparent);border-radius:1px;"></div>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="background:#111827;padding:40px 48px;">
          ${body}
        </td>
      </tr>
      <!-- Footer / Signature -->
      <tr>
        <td style="background:#0A1628;border-radius:0 0 16px 16px;border-top:1px solid #1F2937;padding:28px 48px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="border-left:3px solid #D97706;padding-left:16px;">
                <p style="margin:0;font-size:13px;font-weight:700;color:#F9FAFB;letter-spacing:0.3px;">Solpulsen Energy Norden AB</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6B7280;">CARE Department</p>
                <p style="margin:6px 0 0;font-size:12px;color:#6B7280;">
                  <a href="mailto:care@solpulsen.se" style="color:#D97706;text-decoration:none;">care@solpulsen.se</a>
                  &nbsp;&middot;&nbsp;
                  <a href="https://solpulsen.se" style="color:#D97706;text-decoration:none;">solpulsen.se</a>
                </p>
              </td>
              <td align="right" style="vertical-align:top;">
                <img src="${CARE_LOGO_URL}" alt="Solpulsen" width="72" style="opacity:0.35;max-width:72px;" />
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:20px;border-top:1px solid #1F2937;">
                <p style="margin:0;font-size:10px;color:#374151;text-align:center;">
                  Detta mail skickades automatiskt av Solpulsen CARE-systemet. Svara inte p&aring; detta mail.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ─── Welcome Invite Email (sent when admin invites a customer) ────────────────
export async function sendWelcomeInviteEmail(
  to: string,
  name: string,
  inviteUrl: string,
): Promise<void> {
  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#F9FAFB;letter-spacing:-0.5px;">
      V&auml;lkommen till Solpulsen CARE
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:#9CA3AF;line-height:1.6;">
      Hej ${name}, du har bjudits in till din personliga energiportal.
    </p>
    <div style="background:#0F2040;border:1px solid #1F2937;border-radius:12px;padding:28px;margin-bottom:32px;">
      <p style="margin:0 0 12px;font-size:13px;color:#D97706;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Vad &auml;r Solpulsen CARE?</p>
      <p style="margin:0;font-size:14px;color:#D1D5DB;line-height:1.7;">
        Din CARE-portal ger dig realtids&ouml;vervakning av ditt energisystem, AI-driven optimering,
        direktkontakt med v&aring;rt supportteam och fullst&auml;ndig kontroll &ouml;ver din energiekonomi.
      </p>
    </div>
    <p style="margin:0 0 24px;font-size:14px;color:#9CA3AF;line-height:1.6;">
      Klicka p&aring; knappen nedan f&ouml;r att aktivera ditt konto och v&auml;lja ditt l&ouml;senord.
      L&auml;nken &auml;r giltig i <strong style="color:#F9FAFB;">48 timmar</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 32px;">
      <tr>
        <td style="background:linear-gradient(135deg,#D97706,#B45309);border-radius:10px;">
          <a href="${inviteUrl}"
             style="display:block;padding:16px 40px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.3px;text-align:center;">
            Aktivera mitt konto &rarr;
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:12px;color:#4B5563;text-align:center;">
      Om knappen inte fungerar, kopiera denna l&auml;nk till din webbl&auml;sare:<br/>
      <a href="${inviteUrl}" style="color:#D97706;word-break:break-all;">${inviteUrl}</a>
    </p>
  `;
  await sendMail({
    to,
    subject: `V\u00e4lkommen till Solpulsen CARE \u2013 Aktivera ditt konto`,
    html: premiumLayout("V\u00e4lkommen till Solpulsen CARE", body, `Hej ${name}! Aktivera ditt konto hos Solpulsen CARE.`),
  });
}

// ─── Welcome Email (sent after successful account activation) ─────────────────
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const features = [
    ["&#128267;", "Energi\u00f6versikt", "Se realtidsdata fr\u00e5n ditt system"],
    ["&#129302;", "AI-optimering", "L\u00e5t AI maximera din besparing"],
    ["&#128203;", "CARE Support", "Direktkontakt med v\u00e5rt team"],
    ["&#128202;", "ROI-rapport", "Se din ekonomiska avkastning"],
  ];
  const featureRows = features.map(([icon, title, desc]) => `
    <tr>
      <td style="padding:8px 0;vertical-align:top;width:32px;font-size:18px;">${icon}</td>
      <td style="padding:8px 0 8px 12px;">
        <p style="margin:0;font-size:13px;font-weight:700;color:#F9FAFB;">${title}</p>
        <p style="margin:2px 0 0;font-size:12px;color:#6B7280;">${desc}</p>
      </td>
    </tr>`).join("");

  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#F9FAFB;letter-spacing:-0.5px;">
      Ditt konto &auml;r aktiverat!
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:#9CA3AF;line-height:1.6;">
      Hej ${name}, v&auml;lkommen till Solpulsen CARE. Ditt konto &auml;r nu aktivt.
    </p>
    <div style="background:#0F2040;border:1px solid #1F2937;border-radius:12px;padding:28px;margin-bottom:32px;">
      <p style="margin:0 0 16px;font-size:13px;color:#D97706;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Kom ig&aring;ng</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">${featureRows}</table>
    </div>
    <p style="margin:0;font-size:13px;color:#6B7280;text-align:center;line-height:1.6;">
      Har du fr&aring;gor? Kontakta oss p&aring;
      <a href="mailto:care@solpulsen.se" style="color:#D97706;text-decoration:none;">care@solpulsen.se</a>
    </p>
  `;
  await sendMail({
    to,
    subject: `Ditt Solpulsen CARE-konto \u00e4r aktiverat`,
    html: premiumLayout("Konto aktiverat \u2013 Solpulsen CARE", body, `V\u00e4lkommen ${name}! Ditt konto \u00e4r nu aktivt.`),
  });
}

// ─── Password Reset Email ─────────────────────────────────────────────────────
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string,
): Promise<void> {
  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#F9FAFB;letter-spacing:-0.5px;">
      &Aring;terst&auml;ll ditt l&ouml;senord
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:#9CA3AF;line-height:1.6;">
      Hej ${name}, vi fick en beg&auml;ran om att &aring;terst&auml;lla l&ouml;senordet f&ouml;r ditt konto.
    </p>
    <div style="background:#1A0A0A;border:1px solid #7F1D1D;border-radius:12px;padding:20px 28px;margin-bottom:28px;">
      <p style="margin:0;font-size:13px;color:#FCA5A5;line-height:1.6;">
        <strong>&#9888;&#65039; Beg&auml;rde du inte detta?</strong><br/>
        Ignorera detta mail. Ditt l&ouml;senord f&ouml;rblir of&ouml;r&auml;ndrat.
      </p>
    </div>
    <p style="margin:0 0 24px;font-size:14px;color:#9CA3AF;line-height:1.6;">
      Klicka p&aring; knappen nedan f&ouml;r att v&auml;lja ett nytt l&ouml;senord.
      L&auml;nken &auml;r giltig i <strong style="color:#F9FAFB;">1 timme</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 32px;">
      <tr>
        <td style="background:linear-gradient(135deg,#D97706,#B45309);border-radius:10px;">
          <a href="${resetUrl}"
             style="display:block;padding:16px 40px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.3px;text-align:center;">
            V&auml;lj nytt l&ouml;senord &rarr;
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:12px;color:#4B5563;text-align:center;">
      Om knappen inte fungerar, kopiera denna l&auml;nk till din webbl&auml;sare:<br/>
      <a href="${resetUrl}" style="color:#D97706;word-break:break-all;">${resetUrl}</a>
    </p>
  `;
  await sendMail({
    to,
    subject: `\u00c5terst\u00e4ll ditt l\u00f6senord \u2013 Solpulsen CARE`,
    html: premiumLayout("\u00c5terst\u00e4ll l\u00f6senord \u2013 Solpulsen CARE", body, "\u00c5terst\u00e4ll ditt l\u00f6senord hos Solpulsen CARE."),
  });
}

// ─── Bill Reminder Email ─────────────────────────────────────────────────────
const MONTHS_SV = ['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];

export async function sendBillReminderEmail(
  to: string,
  name: string,
  billMonth: number,
  billYear: number,
  amount?: number,
  dueDate?: Date
): Promise<void> {
  const monthName = MONTHS_SV[billMonth - 1] ?? String(billMonth);
  const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString('sv-SE') : null;
  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#F9FAFB;letter-spacing:-0.5px;">
      P&aring;minnelse: Elfaktura
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:#9CA3AF;line-height:1.6;">
      Hej ${name}, det &auml;r dags att betala din elfaktura f&ouml;r <strong style="color:#D97706;">${monthName} ${billYear}</strong>.
    </p>
    <div style="background:#0F2040;border:1px solid #1F2937;border-radius:12px;padding:28px;margin-bottom:32px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1F2937;">
            <span style="font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Period</span>
            <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#F9FAFB;">${monthName} ${billYear}</p>
          </td>
        </tr>
        ${amount ? `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #1F2937;">
            <span style="font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Belopp</span>
            <p style="margin:4px 0 0;font-size:22px;font-weight:800;color:#D97706;">${amount.toLocaleString('sv-SE')} kr</p>
          </td>
        </tr>` : ''}
        ${dueDateStr ? `<tr>
          <td style="padding:10px 0;">
            <span style="font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">F&ouml;rfallodatum</span>
            <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#F9FAFB;">${dueDateStr}</p>
          </td>
        </tr>` : ''}
      </table>
    </div>
    <p style="margin:0;font-size:12px;color:#4B5563;text-align:center;line-height:1.6;">
      Du f&aring;r detta meddelande eftersom du st&auml;llt in en p&aring;minnelse i SolPulsen CARE-portalen.
    </p>
  `;
  await sendMail({
    to,
    subject: `P\u00e5minnelse: Elfaktura ${monthName} ${billYear} \u2013 Solpulsen CARE`,
    html: premiumLayout(`Elfaktura ${monthName} ${billYear}`, body, `P\u00e5minnelse om din elfaktura f\u00f6r ${monthName} ${billYear}.`),
  });
}
