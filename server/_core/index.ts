import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { uploadRouter } from "../uploadRoute";
import { reportRouter } from "../reportRoute";
import billsRouter from "../billsRoute";
import { startEmailPoller } from "../emailPoller";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Document upload endpoint (multipart/form-data)
  app.use(uploadRouter);
  // PDF report generation endpoints
  app.use("/api/reports", reportRouter);
  // Electricity bill file upload
  app.use("/api/bills", billsRouter);
  // Reminder cron: check every 15 minutes
  setInterval(async () => {
    try {
      const { getPendingReminders, markReminderSent, getBillById, getUserById } = await import('../db');
      const now = new Date();
      const pending = await getPendingReminders(now);
      for (const reminder of pending) {
        try {
          const bill = await getBillById(reminder.billId);
          const user = await getUserById(reminder.userId);
          if (!bill || !user) continue;
          if (reminder.reminderType === 'email' && user.email) {
            const { sendBillReminderEmail } = await import('../emailService');
            await sendBillReminderEmail(user.email, user.name ?? 'Kund', bill.billMonth, bill.billYear, bill.amount ? parseFloat(bill.amount) : undefined, bill.dueDate ?? undefined);
          } else if (reminder.reminderType === 'sms' && user.phone) {
            const { sendSms } = await import('../smsService');
            const month = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'][bill.billMonth - 1];
            await sendSms(user.phone, `SolPulsen CARE: Påminnelse om elfaktura ${month} ${bill.billYear}${bill.amount ? ` - ${parseFloat(bill.amount).toLocaleString('sv-SE')} kr` : ''}. Förfaller ${bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('sv-SE') : 'snart'}.`);
          }
          await markReminderSent(reminder.id);
        } catch (e) {
          console.error('[reminder-cron] failed for reminder', reminder.id, e);
        }
      }
    } catch (e) {
      console.error('[reminder-cron] error:', e);
    }
  }, 15 * 60 * 1000);
  // Email poller: check care@solpulsen.se every 5 minutes
  startEmailPoller();
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
