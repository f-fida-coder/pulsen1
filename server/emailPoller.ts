/**
 * emailPoller.ts — IMAP poller for care@solpulsen.se
 *
 * Polls every 5 minutes for new emails and creates support tickets automatically.
 * Replies from the portal are sent via noreply@solpulsen.se (SMTP).
 */

import Imap from "imap";
import { simpleParser } from "mailparser";
import { getDb } from "./db";
import { tickets, ticketComments, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendMail } from "./emailService";
import { notifyOwner } from "./_core/notification";

const IMAP_CONFIG: Imap.Config = {
  user: "care@solpulsen.se",
  password: "WnmmaznelA.181109",
  host: "prime6.inleed.net",
  port: 143,
  tls: false,        // STARTTLS upgrade happens after connection
  tlsOptions: { rejectUnauthorized: false },
  connTimeout: 20000,
  authTimeout: 10000,
};

let pollerInterval: ReturnType<typeof setInterval> | null = null;
let isPolling = false;

function generateTicketNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `TKT-${year}${month}-${rand}`;
}

async function processEmail(parsed: any): Promise<void> {
  const messageId = parsed.messageId || `no-id-${Date.now()}`;
  const subject = (parsed.subject || "Inget ämne").slice(0, 255);
  const fromAddress = parsed.from?.value?.[0]?.address || "";
  const fromName = parsed.from?.value?.[0]?.name || fromAddress;
  const bodyText = parsed.text || parsed.html?.replace(/<[^>]+>/g, " ") || "";

  const db = await getDb();
  if (!db) return;

  // Dedup — skip if we already have a ticket with this message-id
  const existing = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.emailMessageId, messageId))
    .limit(1);

  if (existing.length > 0) return;

  // Try to match sender to an existing customer
  let customerId: number | undefined;
  if (fromAddress) {
    const matchedUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, fromAddress))
      .limit(1);
    if (matchedUser.length > 0) customerId = matchedUser[0].id;
  }

  // Create ticket
  const ticketNumber = generateTicketNumber();
  await db.insert(tickets).values({
    ticketNumber,
    subject,
    description: bodyText.slice(0, 5000),
    status: "open",
    priority: "medium",
    category: "general",
    source: "email",
    senderEmail: fromAddress,
    emailMessageId: messageId,
    customerId: customerId ?? null,
  });

  // Fetch the created ticket id
  const [created] = await db
    .select({ id: tickets.id, ticketNumber: tickets.ticketNumber })
    .from(tickets)
    .where(eq(tickets.emailMessageId, messageId))
    .limit(1);

  if (!created) return;

  // Add the original email as first comment
  await db.insert(ticketComments).values({
    ticketId: created.id,
    authorName: fromName || fromAddress,
    content: `**Inkommande mejl från ${fromAddress}**\n\n${bodyText.slice(0, 5000)}`,
    isInternal: false,
  });

  // Notify owner
  await notifyOwner({
    title: `Nytt ärende via e-post: ${subject}`,
    content: `Från: ${fromName} <${fromAddress}>\nÄrendenummer: ${ticketNumber}\n\n${bodyText.slice(0, 300)}...`,
  }).catch(() => {});

  // Send auto-reply to sender
  if (fromAddress) {
    await sendMail({
      to: fromAddress,
      subject: `Re: ${subject} [${ticketNumber}]`,
      html: `
        <p>Hej ${fromName || ""},</p>
        <p>Vi har mottagit ditt meddelande och skapat ett supportärende med nummer <strong>${ticketNumber}</strong>.</p>
        <p>Vårt team återkommer så snart som möjligt. Du kan följa ditt ärende på <a href="https://care.solpulsen.se">care.solpulsen.se</a>.</p>
        <br>
        <p>Med vänliga hälsningar,<br>Solpulsen CARE-teamet</p>
      `,
    }).catch(() => {});
  }

  console.log(`[emailPoller] Created ticket ${ticketNumber} from ${fromAddress} — "${subject}"`);
}

async function pollInbox(): Promise<void> {
  if (isPolling) return;
  isPolling = true;

  return new Promise((resolve) => {
    const imap = new Imap(IMAP_CONFIG);

    imap.once("ready", () => {
      imap.openBox("INBOX", false, (err, box) => {
        if (err) {
          console.error("[emailPoller] openBox error:", err.message);
          imap.end();
          return;
        }

        // Search for unseen messages
        imap.search(["UNSEEN"], (searchErr, uids) => {
          if (searchErr || !uids || uids.length === 0) {
            imap.end();
            return;
          }

          const fetch = imap.fetch(uids, { bodies: "", markSeen: true });

          fetch.on("message", (msg) => {
            const chunks: Buffer[] = [];
            msg.on("body", (stream) => {
              stream.on("data", (chunk: Buffer) => chunks.push(chunk));
              stream.once("end", async () => {
                try {
                  const parsed = await simpleParser(Buffer.concat(chunks));
                  await processEmail(parsed);
                } catch (e: any) {
                  console.error("[emailPoller] parse error:", e.message);
                }
              });
            });
          });

          fetch.once("error", (fetchErr) => {
            console.error("[emailPoller] fetch error:", fetchErr.message);
          });

          fetch.once("end", () => {
            imap.end();
          });
        });
      });
    });

    imap.once("error", (err: Error) => {
      console.error("[emailPoller] IMAP error:", err.message);
      isPolling = false;
      resolve();
    });

    imap.once("end", () => {
      isPolling = false;
      resolve();
    });

    imap.connect();
  });
}

export function startEmailPoller(): void {
  console.log("[emailPoller] Starting — polling care@solpulsen.se every 5 minutes");

  // Run immediately on start
  pollInbox().catch((e) => console.error("[emailPoller] initial poll error:", e.message));

  // Then every 5 minutes
  pollerInterval = setInterval(() => {
    pollInbox().catch((e) => console.error("[emailPoller] poll error:", e.message));
  }, 5 * 60 * 1000);
}

export function stopEmailPoller(): void {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
    console.log("[emailPoller] Stopped");
  }
}
