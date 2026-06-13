import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createConfig, getConfigs, getConfigById, updateConfig, deleteConfig,
  getDevices, createDevice, updateDevice, deleteDevice,
  getTickets, getAllTickets, createTicket, updateTicket, getTicketComments, addTicketComment,
  getContracts, getWarranties,
  getNotifications, createNotification, markNotificationRead, markAllNotificationsRead,
  getOptimizationRuns, createOptimizationRun, getLatestOptimization,
  getReferrals, createReferral, getReferralByCode,
  getSchedulerConfig, upsertSchedulerConfig,
  getSavingsRecords, getReports,
  createCustomerDocument, getCustomerDocuments, getAllCustomerDocuments, deleteCustomerDocument, getAllUsers,
  createHealthEvent, getHealthEvents, getUnresolvedAlerts, resolveHealthEvent,
  getAlertRules, createAlertRule, updateAlertRule, deleteAlertRule, evaluateAlertRules,
  listKnowledgeArticles, getKnowledgeArticleBySlug, getKnowledgeArticleById,
  createKnowledgeArticle, updateKnowledgeArticle, deleteKnowledgeArticle, publishKnowledgeArticle,
  computeSlaDeadline,
  getOnboardingProgress, upsertOnboardingProgress, dismissOnboarding,
} from "./db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { runFullForecast, runMultiForecast, fetchSpotPrices } from "./dataFetcher";
import { optimizeBattery, DEFAULT_BATTERY, DEFAULT_TARIFF } from "./batteryOptimizer";
import {
  getNewsArticles, getNewsStats, getTopArticles,
  getLatestInsights, getInsightsWithArticles, getInsightsForArticle,
  getRelevantArticles, getPersonalizedInsights,
  createAction, getActions, getUserActions, getActionById,
  getActionsByInsight, getActionsByArticle, updateActionStatus,
  executeAction, autoTriggerActions,
} from "./db";
import { runNewsPipeline, sortByRegionPriority, applyRegionDistribution } from "./newsEngine";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "SolpulsenCARE/2.0" },
  });
  if (!res.ok) throw new TRPCError({ code: "BAD_GATEWAY", message: `Upstream ${res.status}: ${url}` });
  return res.json();
}

function generateTicketNumber(): string {
  const num = Math.floor(Math.random() * 9999) + 1;
  return `CARE-${String(num).padStart(4, "0")}`;
}

// ─── Config input schema ────────────────────────────────────────────────────

const configInput = z.object({
  name: z.string().min(1),
  isDefault: z.boolean().optional(),
  batteryCapacity: z.number().min(0).max(10000),
  batteryDoD: z.number().min(0).max(100).optional(),
  batteryEfficiency: z.number().min(0).max(100).optional(),
  solarCapacity: z.number().min(0).max(100000),
  roofTilt: z.number().min(0).max(90).optional(),
  roofOrientation: z.number().min(0).max(360).optional(),
  shading: z.number().min(0).max(100).optional(),
  hasWind: z.boolean().optional(),
  windCapacity: z.number().min(0).max(100000).optional(),
  hubHeight: z.number().min(0).max(200).optional(),
  annualConsumption: z.number().min(0).max(10000000),
  hasEV: z.boolean().optional(),
  evConsumption: z.number().min(0).max(100000).optional(),
  heatingType: z.enum(["heatpump", "direct", "district", "other"]).optional(),
  electricityArea: z.enum(["SE1", "SE2", "SE3", "SE4"]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => {
      const u = opts.ctx.user;
      if (!u) return null;
      return { id: u.id, name: u.name, email: u.email, role: u.role, careTier: u.careTier, mustChangePassword: u.mustChangePassword };
    }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
        rememberMe: z.boolean().optional().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const { verifyPassword: vp } = await import('./db');
        const user = await vp(input.email, input.password);
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Felaktig e-post eller lösenord' });
        if (!user.isActive) throw new TRPCError({ code: 'FORBIDDEN', message: 'Kontot är inaktiverat. Kontakta SolPulsen.' });
        // Create JWT session
        const { SignJWT } = await import('jose');
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'solpulsen-secret-key-change-in-production');
        const token = await new SignJWT({ userId: user.id, email: user.email })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime(input.rememberMe ? '30d' : '8h')
          .sign(secret);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        const maxAge = input.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge });
        return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, careTier: user.careTier, mustChangePassword: user.mustChangePassword } };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        phone: z.string().max(30).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const { users } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        await db.update(users).set({ name: input.name, phone: input.phone ?? null }).where(eq(users.id, ctx.user.id));
        return { success: true };
      }),

    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      }))
      .mutation(async ({ ctx, input }) => {
        const { verifyPassword: vp, updateUserPassword: uup } = await import('./db');
        const valid = await vp(ctx.user.email!, input.currentPassword);
        if (!valid) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Nuvarande lösenord stämmer inte' });
        await uup(ctx.user.id, input.newPassword);
        return { success: true };
      }),

    forgotPassword: publicProcedure
      .input(z.object({ email: z.string().email(), origin: z.string().url() }))
      .mutation(async ({ input }) => {
        const { getUserByEmail, createPasswordResetToken } = await import('./db');
        const user = await getUserByEmail(input.email);
        // Always return success to prevent email enumeration
        if (!user || !user.isActive) return { success: true };
        const { nanoid } = await import('nanoid');
        const token = nanoid(40);
        await createPasswordResetToken(user.id, token);
        const resetUrl = `${input.origin}/reset-password?token=${token}`;
        try {
          const { sendPasswordResetEmail } = await import('./emailService');
          await sendPasswordResetEmail(user.email!, user.name ?? 'Kund', resetUrl);
        } catch (e) {
          console.error('[auth.forgotPassword] email failed:', e);
        }
        return { success: true };
      }),

    resetPassword: publicProcedure
      .input(z.object({ token: z.string(), newPassword: z.string().min(8) }))
      .mutation(async ({ input }) => {
        const { getPasswordResetToken, deletePasswordResetToken, updateUserPassword } = await import('./db');
        const rec = await getPasswordResetToken(input.token);
        if (!rec) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ogiltig eller utgången återställningslänk.' });
        if (new Date() > rec.expiresAt) {
          await deletePasswordResetToken(input.token);
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Återställningslänken har gått ut. Begär en ny.' });
        }
        await updateUserPassword(rec.userId, input.newPassword);
        await deletePasswordResetToken(input.token);
        return { success: true };
      }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // ENERGY DATA (server-side proxies + forecast engine)
  // ═══════════════════════════════════════════════════════════════════════════
  energy: router({
    spotPrices: publicProcedure
      .input(z.object({
        area: z.enum(["SE1", "SE2", "SE3", "SE4"]),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }))
      .query(async ({ input }) => {
        const { area, date } = input;
        const [yyyy, mm, dd] = date.split("-");
        try {
          const data = await fetchJSON(
            `https://www.elprisetjustnu.se/api/v1/prices/${yyyy}/${mm}-${dd}_${area}.json`
          ) as { time_start: string; SEK_per_kWh: number }[];
          const prices = data.map((d) => ({ time: d.time_start, price: d.SEK_per_kWh * 100 }));
          if (!prices.length) throw new Error("empty");
          const vals = prices.map((p) => p.price);
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          const minIdx = vals.indexOf(Math.min(...vals));
          const maxIdx = vals.indexOf(Math.max(...vals));
          return { data: prices, average: avg, min: { price: prices[minIdx].price, time: prices[minIdx].time }, max: { price: prices[maxIdx].price, time: prices[maxIdx].time } };
        } catch {
          const data = await fetchJSON(
            `https://polciwvhaypzvraxkxse.supabase.co/functions/v1/api-prices?area=${area}&date=${date}&resolution=hourly`
          ) as { data: { time: string; price: number }[]; average: number; min: { price: number; time: string }; max: { price: number; time: string } };
          return data;
        }
      }),

    weather: publicProcedure
      .input(z.object({ lat: z.number(), lon: z.number() }))
      .query(async ({ input }) => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${input.lat.toFixed(4)}&longitude=${input.lon.toFixed(4)}&hourly=windspeed_10m,winddirection_10m,windgusts_10m,temperature_2m,cloudcover,relativehumidity_2m&forecast_days=2&timezone=Europe/Stockholm`;
        const json = await fetchJSON(url) as { hourly: { time: string[]; windspeed_10m: number[]; winddirection_10m: number[]; windgusts_10m: number[]; temperature_2m: number[]; cloudcover: number[]; relativehumidity_2m: number[] } };
        const h = json.hourly;
        return h.time.slice(0, 48).map((t, i) => ({
          time: t, windSpeed: h.windspeed_10m[i] ?? 0, windDirection: h.winddirection_10m[i] ?? 0,
          windGust: h.windgusts_10m[i] ?? 0, temperature: h.temperature_2m[i] ?? 0,
          cloudCover: h.cloudcover[i] ?? 0, humidity: h.relativehumidity_2m[i] ?? 0,
        }));
      }),

    // Full forecast (prices + weather + solar + load)
    forecast: publicProcedure
      .input(z.object({
        zone: z.enum(["SE1", "SE2", "SE3", "SE4"]).optional(),
        lat: z.number().optional(),
        lon: z.number().optional(),
        panelKwp: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return runFullForecast({
          zone: input.zone ?? "SE3",
          lat: input.lat ?? 59.3293,
          lon: input.lon ?? 18.0686,
          panelKwp: input.panelKwp ?? 10,
        });
      }),

    // 48h combined forecast
    forecast48h: publicProcedure
      .input(z.object({
        zone: z.enum(["SE1", "SE2", "SE3", "SE4"]).optional(),
        lat: z.number().optional(),
        lon: z.number().optional(),
        panelKwp: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return runMultiForecast({
          zone: input.zone ?? "SE3",
          lat: input.lat ?? 59.3293,
          lon: input.lon ?? 18.0686,
          panelKwp: input.panelKwp ?? 10,
        });
      }),

    // Battery optimization
    optimize: publicProcedure
      .input(z.object({
        zone: z.enum(["SE1", "SE2", "SE3", "SE4"]).optional(),
        lat: z.number().optional(),
        lon: z.number().optional(),
        panelKwp: z.number().optional(),
        batteryCapacity: z.number().optional(),
        batteryPower: z.number().optional(),
        batteryEfficiency: z.number().optional(),
        currentSoc: z.number().optional(),
        peakLimitKw: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const forecast = await runFullForecast({
          zone: input.zone ?? "SE3",
          lat: input.lat ?? 59.3293,
          lon: input.lon ?? 18.0686,
          panelKwp: input.panelKwp ?? 10,
        });

        const battery = {
          ...DEFAULT_BATTERY,
          capacity_kwh: input.batteryCapacity ?? 15,
          max_power_kw: input.batteryPower ?? 5,
          efficiency: (input.batteryEfficiency ?? 92) / 100,
          current_soc: (input.currentSoc ?? 50) / 100,
        };

        const result = optimizeBattery(
          forecast.prices,
          battery,
          DEFAULT_TARIFF,
          forecast.solar,
          forecast.load,
          input.peakLimitKw ?? null,
        );

        return { forecast, optimization: result };
      }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM CONFIGURATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  configs: router({
    list: protectedProcedure.query(({ ctx }) => getConfigs(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const c = await getConfigById(input.id);
      if (!c || c.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      return c;
    }),
    create: protectedProcedure.input(configInput).mutation(async ({ ctx, input }) => {
      await createConfig({
        ...input,
        userId: ctx.user.id,
        batteryCapacity: input.batteryCapacity.toFixed(2),
        solarCapacity: input.solarCapacity.toFixed(2),
        windCapacity: (input.windCapacity ?? 0).toFixed(2),
        latitude: input.latitude?.toFixed(6),
        longitude: input.longitude?.toFixed(6),
      });
      return { success: true };
    }),
    update: protectedProcedure.input(z.object({ id: z.number(), data: configInput.partial() })).mutation(async ({ ctx, input }) => {
      const c = await getConfigById(input.id);
      if (!c || c.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      await updateConfig(input.id, input.data as any);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const c = await getConfigById(input.id);
      if (!c || c.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      await deleteConfig(input.id);
      return { success: true };
    }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVICES
  // ═══════════════════════════════════════════════════════════════════════════
  devices: router({
    list: protectedProcedure.query(({ ctx }) => getDevices(ctx.user.id)),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      deviceType: z.enum(["solar", "battery", "inverter", "heat_pump", "ev_charger", "wind"]),
      manufacturer: z.string().optional(),
      model: z.string().optional(),
      serialNumber: z.string().optional(),
      capacityKw: z.number().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      await createDevice({
        ...input,
        userId: ctx.user.id,
        capacityKw: input.capacityKw?.toFixed(2),
      });
      return { success: true };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["online", "offline", "warning", "error"]).optional(),
      notes: z.string().optional(),
      lastReading: z.unknown().optional(),
    })).mutation(async ({ input }) => {
      await updateDevice(input.id, input as any);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteDevice(input.id);
      return { success: true };
    }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // TICKETS (support)
  // ═══════════════════════════════════════════════════════════════════════════
  tickets: router({
    list: protectedProcedure.query(({ ctx }) => getTickets(ctx.user.id)),
    listAll: protectedProcedure.query(() => getAllTickets()),
    create: protectedProcedure.input(z.object({
      subject: z.string().min(1),
      description: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      category: z.enum(["technical", "billing", "installation", "general", "warranty"]).optional(),
      careTier: z.enum(["basic", "plus", "platinum"]).optional(),
    })).mutation(async ({ ctx, input }) => {
      const ticketNumber = generateTicketNumber();
      const tier = input.careTier ?? "basic";
      await createTicket({
        ticketNumber,
        subject: input.subject,
        description: input.description,
        priority: input.priority ?? "medium",
        category: input.category ?? "general",
        customerId: ctx.user.id,
        careTier: tier,
      });
      // Send confirmation email (non-blocking)
      if (ctx.user.email) {
        const { computeSlaDeadline } = await import("./db");
        const { sendTicketCreatedEmail } = await import("./emailService");
        sendTicketCreatedEmail({
          to: ctx.user.email,
          customerName: ctx.user.name ?? "Kund",
          ticketNumber,
          subject: input.subject,
          priority: input.priority ?? "medium",
          category: input.category ?? "general",
          slaDeadline: computeSlaDeadline(tier),
          careTier: tier,
        }).catch(e => console.error("[ticket email]", e));
      }
      return { success: true };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["open", "in_progress", "waiting", "resolved", "closed"]).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      resolution: z.string().optional(),
      emailComment: z.string().optional(), // optional comment to include in status update email
    })).mutation(async ({ ctx, input }) => {
      const data: any = {};
      if (input.status) data.status = input.status;
      if (input.priority) data.priority = input.priority;
      if (input.resolution) data.resolution = input.resolution;
      if (input.status === "resolved") data.resolvedAt = new Date();
      if (input.status === "closed") data.closedAt = new Date();
      await updateTicket(input.id, data);
      // Send status update email if status changed
      if (input.status && ctx.user.email) {
        const { getDb: _getDb } = await import("./db");
        const { eq: _eq } = await import("drizzle-orm");
        const db = await _getDb();
        if (db) {
          const { tickets: ticketsTable } = await import("../drizzle/schema");
          const rows = await db.select().from(ticketsTable).where(_eq(ticketsTable.id, input.id)).limit(1);
          if (rows[0]) {
            const { sendTicketUpdatedEmail } = await import("./emailService");
            sendTicketUpdatedEmail({
              to: ctx.user.email,
              customerName: ctx.user.name ?? "Kund",
              ticketNumber: rows[0].ticketNumber,
              subject: rows[0].subject,
              newStatus: input.status,
              comment: input.emailComment,
            }).catch(e => console.error("[ticket update email]", e));
          }
        }
      }
      return { success: true };
    }),
    comments: protectedProcedure.input(z.object({ ticketId: z.number() })).query(({ input }) => getTicketComments(input.ticketId)),
    addComment: protectedProcedure.input(z.object({
      ticketId: z.number(),
      content: z.string().min(1),
      isInternal: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      await addTicketComment({
        ticketId: input.ticketId,
        authorId: ctx.user.id,
        authorName: ctx.user.name ?? "Användare",
        content: input.content,
        isInternal: input.isInternal ?? false,
      });
      // If ticket was created via email and comment is public, send reply to original sender
      if (!input.isInternal) {
        try {
          const { getDb } = await import('./db');
          const { tickets: tbl } = await import('../drizzle/schema');
          const { eq: deq } = await import('drizzle-orm');
          const db2 = await getDb();
          if (db2) {
            const [t] = await db2.select().from(tbl).where(deq(tbl.id, input.ticketId)).limit(1);
            if (t && t.source === 'email' && t.senderEmail) {
              const { sendMail } = await import('./emailService');
              await sendMail({
                to: t.senderEmail,
                subject: `Re: ${t.subject} [${t.ticketNumber}]`,
                html: `<p>Hej,</p><p>Vi har uppdaterat ditt ärende <strong>${t.ticketNumber}</strong>:</p><blockquote style="border-left:3px solid #d4a017;padding-left:12px;color:#555">${input.content.replace(/\n/g,'<br>')}</blockquote><p>Följ ditt ärende på <a href="https://care.solpulsen.se">care.solpulsen.se</a>.</p><br><p>Med vänliga hälsningar,<br>Solpulsen CARE-teamet</p>`,
              }).catch(() => {});
            }
          }
        } catch (_) {}
      }
      return { success: true };
    }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTRACTS & WARRANTIES
  // ═══════════════════════════════════════════════════════════════════════════
  contracts: router({
    list: protectedProcedure.query(({ ctx }) => getContracts(ctx.user.id)),
  }),
  warranties: router({
    list: protectedProcedure.query(({ ctx }) => getWarranties(ctx.user.id)),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  notifications: router({
    list: protectedProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(({ ctx, input }) =>
      getNotifications(ctx.user.id, input?.limit ?? 20)
    ),
    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => {
      markNotificationRead(input.id);
      return { success: true };
    }),
    markAllRead: protectedProcedure.mutation(({ ctx }) => {
      markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),
    create: protectedProcedure.input(z.object({
      type: z.enum(["ai", "energy", "system", "alert", "ticket", "info"]).optional(),
      title: z.string(),
      message: z.string(),
      priority: z.enum(["normal", "high"]).optional(),
      link: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      await createNotification({ userId: ctx.user.id, ...input });
      return { success: true };
    }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIMIZATION RUNS
  // ═══════════════════════════════════════════════════════════════════════════
  optimization: router({
    list: protectedProcedure.query(({ ctx }) => getOptimizationRuns(ctx.user.id)),
    latest: protectedProcedure.query(({ ctx }) => getLatestOptimization(ctx.user.id)),
    run: protectedProcedure.input(z.object({
      zone: z.enum(["SE1", "SE2", "SE3", "SE4"]).optional(),
      lat: z.number().optional(),
      lon: z.number().optional(),
      panelKwp: z.number().optional(),
      batteryCapacity: z.number().optional(),
      batteryPower: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      const zone = input.zone ?? "SE3";
      const forecast = await runFullForecast({
        zone,
        lat: input.lat ?? 59.3293,
        lon: input.lon ?? 18.0686,
        panelKwp: input.panelKwp ?? 10,
      });

      const battery = {
        ...DEFAULT_BATTERY,
        capacity_kwh: input.batteryCapacity ?? 15,
        max_power_kw: input.batteryPower ?? 5,
      };

      const result = optimizeBattery(forecast.prices, battery, DEFAULT_TARIFF, forecast.solar, forecast.load);

      await createOptimizationRun({
        userId: ctx.user.id,
        zone,
        date: forecast.date,
        totalHours: result.schedule.length,
        tomorrowIncluded: false,
        batteryCapacityKwh: battery.capacity_kwh,
        batteryMaxPowerKw: battery.max_power_kw,
        panelKwp: input.panelKwp ?? 10,
        netSavingsSek: Math.round(result.net_savings_sek * 100),
        arbitrageProfitSek: Math.round(result.arbitrage_profit_sek * 100),
        peakShavingValueSek: Math.round(result.peak_shaving_value_sek * 100),
        selfConsumptionPct: Math.round(result.self_consumption_pct),
        baselineCostSek: Math.round(result.baseline_cost_sek * 100),
        totalCostSek: Math.round(result.total_cost_sek * 100),
        avgChargePriceSek: Math.round(result.summary.avg_charge_price * 100000),
        avgDischargePriceSek: Math.round(result.summary.avg_discharge_price * 100000),
        scheduleJson: JSON.stringify(result.schedule),
      });

      // Create notification
      await createNotification({
        userId: ctx.user.id,
        type: "ai",
        title: "Optimering klar",
        message: `Batterioptimering för ${zone}: besparing ${result.net_savings_sek.toFixed(2)} SEK/dag`,
        priority: "normal",
      });

      return { forecast, optimization: result };
    }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // REFERRALS
  // ═══════════════════════════════════════════════════════════════════════════
  referrals: router({
    list: protectedProcedure.query(({ ctx }) => getReferrals(ctx.user.id)),
    getCode: protectedProcedure.query(async ({ ctx }) => {
      const existing = await getReferrals(ctx.user.id);
      if (existing.length > 0) return { code: existing[0].referralCode };
      const code = `CARE-${nanoid(6).toUpperCase()}`;
      await createReferral({ referrerId: ctx.user.id, referralCode: code });
      return { code };
    }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      const refs = await getReferrals(ctx.user.id);
      const total = refs.length;
      const converted = refs.filter((r) => r.status === "converted" || r.status === "rewarded").length;
      const totalRewards = refs.reduce((sum, r) => sum + (r.rewardAmount ?? 0), 0);
      const pending = refs.filter((r) => r.status === "pending").length;
      return { total, converted, totalRewards, pending };
    }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEDULER
  // ═══════════════════════════════════════════════════════════════════════════
  scheduler: router({
    get: protectedProcedure.query(({ ctx }) => getSchedulerConfig(ctx.user.id)),
    update: protectedProcedure.input(z.object({
      enabled: z.boolean().optional(),
      zone: z.string().optional(),
      batteryCapacityKwh: z.number().optional(),
      batteryMaxPowerKw: z.number().optional(),
      panelKwp: z.number().optional(),
      hasHeatPump: z.boolean().optional(),
      hasEv: z.boolean().optional(),
      peakShavingEnabled: z.boolean().optional(),
      peakLimitKw: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      await upsertSchedulerConfig(ctx.user.id, input as any);
      return { success: true };
    }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVINGS & REPORTS
  // ═══════════════════════════════════════════════════════════════════════════
  savings: router({
    list: protectedProcedure.input(z.object({ configId: z.number() })).query(({ input }) =>
      getSavingsRecords(input.configId)
    ),
  }),
  reports: router({
    list: protectedProcedure.query(({ ctx }) => getReports(ctx.user.id)),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // NEWS & AI INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════════
  news: router({
    list: publicProcedure.input(z.object({
      limit: z.number().min(1).max(50).optional(),
      offset: z.number().min(0).optional(),
      tag: z.string().optional(),
      region: z.enum(["SE", "NORDICS", "EU", "GLOBAL"]).optional(),
      minRelevance: z.number().min(0).max(100).optional(),
    }).optional()).query(async ({ input }) => {
      const articles = await getNewsArticles({
        limit: input?.limit ?? 30,
        offset: input?.offset ?? 0,
        tag: input?.tag,
        region: input?.region,
        minRelevance: input?.minRelevance ?? 0,
      });
      // Apply region priority sorting
      return sortByRegionPriority(articles as any) as typeof articles;
    }),

    // Region-prioritized feed (70% SE+NORDICS, 20% EU, 10% GLOBAL)
    prioritized: publicProcedure.input(z.object({
      limit: z.number().min(1).max(50).optional(),
      tag: z.string().optional(),
    }).optional()).query(async ({ input }) => {
      const all = await getNewsArticles({
        limit: 100,
        offset: 0,
        tag: input?.tag,
        minRelevance: 0,
      });
      return applyRegionDistribution(all as any, input?.limit ?? 30) as typeof all;
    }),

    // Relevant articles for user (SE/NORDICS first)
    relevant: publicProcedure.input(z.object({
      userRegion: z.string().optional(),
      limit: z.number().min(1).max(30).optional(),
    }).optional()).query(async ({ input }) => {
      return getRelevantArticles(input?.userRegion ?? "SE3", input?.limit ?? 20);
    }),

    top: publicProcedure.input(z.object({ limit: z.number().min(1).max(20).optional() }).optional()).query(async ({ input }) => {
      return getTopArticles(input?.limit ?? 5);
    }),

    stats: publicProcedure.query(async () => {
      return getNewsStats();
    }),

    refresh: protectedProcedure.mutation(async () => {
      const result = await runNewsPipeline();
      return result;
    }),
  }),

  insights: router({
    latest: publicProcedure.input(z.object({ limit: z.number().min(1).max(20).optional() }).optional()).query(async ({ input }) => {
      return getLatestInsights(input?.limit ?? 10);
    }),

    withArticles: publicProcedure.input(z.object({ limit: z.number().min(1).max(20).optional() }).optional()).query(async ({ input }) => {
      return getInsightsWithArticles(input?.limit ?? 10);
    }),

    // Personalized insights (SE/NORDICS priority)
    personalized: publicProcedure.input(z.object({
      userRegion: z.string().optional(),
      limit: z.number().min(1).max(20).optional(),
    }).optional()).query(async ({ input }) => {
      return getPersonalizedInsights(input?.userRegion ?? "SE3", input?.limit ?? 10);
    }),

    forArticle: publicProcedure.input(z.object({ articleId: z.number() })).query(async ({ input }) => {
      return getInsightsForArticle(input.articleId);
    }),
  }),

  // ─── Actions (Action Engine) ──────────────────────────────────────────
  actions: router({
    // List all actions (admin) or filtered
    list: protectedProcedure.input(z.object({
      limit: z.number().min(1).max(100).optional(),
      status: z.enum(["pending", "approved", "executed", "failed", "dismissed"]).optional(),
    }).optional()).query(async ({ input }) => {
      return getActions({ limit: input?.limit ?? 50, status: input?.status });
    }),

    // User's own actions
    user: protectedProcedure.input(z.object({
      limit: z.number().min(1).max(100).optional(),
      status: z.enum(["pending", "approved", "executed", "failed", "dismissed"]).optional(),
    }).optional()).query(async ({ ctx, input }) => {
      return getUserActions(ctx.user.id, { limit: input?.limit ?? 50, status: input?.status });
    }),

    // Get actions for a specific insight
    byInsight: publicProcedure.input(z.object({ insightId: z.number() })).query(async ({ input }) => {
      return getActionsByInsight(input.insightId);
    }),

    // Get actions for a specific article
    byArticle: publicProcedure.input(z.object({ articleId: z.number() })).query(async ({ input }) => {
      return getActionsByArticle(input.articleId);
    }),

    // Get single action by ID
    get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return getActionById(input.id);
    }),

    // Approve a pending action (user confirms)
    approve: protectedProcedure.input(z.object({ actionId: z.number() })).mutation(async ({ ctx, input }) => {
      const action = await getActionById(input.actionId);
      if (!action) throw new TRPCError({ code: "NOT_FOUND", message: "Action not found" });
      if (action.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your action" });
      }
      if (action.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot approve action with status: ${action.status}` });
      }
      return updateActionStatus(input.actionId, "approved");
    }),

    // Execute an action (run it)
    execute: protectedProcedure.input(z.object({ actionId: z.number() })).mutation(async ({ ctx, input }) => {
      const action = await getActionById(input.actionId);
      if (!action) throw new TRPCError({ code: "NOT_FOUND", message: "Action not found" });
      if (action.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your action" });
      }
      const result = await executeAction(input.actionId);
      // Send AI action email (non-blocking)
      if (result?.success && ctx.user.email) {
        const { getActionById: _getAction } = await import("./db");
        const updatedAction = await _getAction(input.actionId);
        if (updatedAction && updatedAction.status === "executed") {
          const { sendAiActionEmail } = await import("./emailService");
          sendAiActionEmail({
            to: ctx.user.email,
            customerName: ctx.user.name ?? "Kund",
            actionType: updatedAction.actionType,
            description: updatedAction.description ?? "AI-optimering utförd",
            savingsSek: updatedAction.savingsSek ?? 0,
            savingsKwh: updatedAction.savingsKwh ?? 0,
            confidence: updatedAction.confidence ?? 65,
          }).catch(e => console.error("[action email]", e));
        }
      }
      return result;
    }),

    // Dismiss an action
    dismiss: protectedProcedure.input(z.object({ actionId: z.number() })).mutation(async ({ ctx, input }) => {
      const action = await getActionById(input.actionId);
      if (!action) throw new TRPCError({ code: "NOT_FOUND", message: "Action not found" });
      if (action.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your action" });
      }
      return updateActionStatus(input.actionId, "dismissed");
    }),

    // Create a manual action from an insight
    create: protectedProcedure.input(z.object({
      insightId: z.number().optional(),
      articleId: z.number().optional(),
      actionType: z.enum(["optimize_battery", "schedule_charging", "view_forecast", "monitor_risk", "adjust_load", "sell_excess", "custom"]),
      actionPayload: z.record(z.string(), z.unknown()).optional(),
      description: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      return createAction({
        userId: ctx.user.id,
        insightId: input.insightId ?? null,
        articleId: input.articleId ?? null,
        actionType: input.actionType,
        actionPayload: input.actionPayload ?? {},
        description: input.description ?? null,
        status: "pending",
        autoTriggered: false,
        triggerReason: "Manuellt skapad av användare",
      });
    }),

    // Auto-trigger: scan insights and create pending actions
    autoTrigger: protectedProcedure.input(z.object({
      userRegion: z.string().optional(),
    }).optional()).mutation(async ({ ctx, input }) => {
      const triggered = await autoTriggerActions(ctx.user.id, input?.userRegion ?? "SE3");
      return { triggered: triggered.length, actions: triggered };
    }),

    // ─── ROI / History endpoints ─────────────────────────────────────────────

    // Full action history with optional filters
    history: protectedProcedure.input(z.object({
      from: z.string().optional(),  // ISO date string
      to: z.string().optional(),
      actionType: z.enum(["optimize_battery", "schedule_charging", "view_forecast", "monitor_risk", "adjust_load", "sell_excess", "custom"]).optional(),
      status: z.enum(["pending", "approved", "executed", "failed", "dismissed"]).optional(),
      limit: z.number().min(1).max(500).optional(),
    }).optional()).query(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const { actions: actionsTable } = await import("../drizzle/schema");
      const { eq, and, gte, lte, desc } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      const conditions: any[] = [eq(actionsTable.userId, ctx.user.id)];
      if (input?.status) conditions.push(eq(actionsTable.status, input.status));
      if (input?.actionType) conditions.push(eq(actionsTable.actionType, input.actionType));
      if (input?.from) conditions.push(gte(actionsTable.createdAt, new Date(input.from)));
      if (input?.to) conditions.push(lte(actionsTable.createdAt, new Date(input.to)));
      return db.select().from(actionsTable)
        .where(and(...conditions))
        .orderBy(desc(actionsTable.createdAt))
        .limit(input?.limit ?? 200);
    }),

    // ROI summary (total savings, action count, avg per action)
    roiSummary: protectedProcedure.query(async ({ ctx }) => {
      const { getRoiSummary } = await import("./roiService");
      const summary = await getRoiSummary(ctx.user.id);
      return {
        totalSavingsSek: summary.totalSavingsSek / 100,         // convert öre → SEK
        totalSavingsKwh: summary.totalSavingsKwh / 1000,       // convert Wh → kWh
        executedActions: summary.executedActions,
        avgSavingsPerAction: summary.avgSavingsPerAction / 100,
        measuredActions: summary.measuredActions,
        estimatedActions: summary.estimatedActions,
      };
    }),

    // Daily ROI breakdown
    roiDaily: protectedProcedure.input(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).optional()).query(async ({ ctx, input }) => {
      const { getRoiDaily } = await import("./roiService");
      const from = input?.from ? new Date(input.from) : undefined;
      const to = input?.to ? new Date(input.to) : undefined;
      const points = await getRoiDaily(ctx.user.id, from, to);
      return points.map(p => ({
        date: p.date,
        savingsSek: p.savingsSek / 100,
        savingsKwh: p.savingsKwh / 1000,
        actionCount: p.actionCount,
      }));
    }),

    // Monthly ROI breakdown
    roiMonthly: protectedProcedure.query(async ({ ctx }) => {
      const { getRoiMonthly } = await import("./roiService");
      const points = await getRoiMonthly(ctx.user.id);
      return points.map(p => ({
        month: p.month,
        savingsSek: p.savingsSek / 100,
        savingsKwh: p.savingsKwh / 1000,
        actionCount: p.actionCount,
      }));
    }),

    // Store price data (for syncing from elprisetjustnu)
    storePrices: protectedProcedure.input(z.object({
      region: z.enum(["SE1", "SE2", "SE3", "SE4"]),
      prices: z.array(z.object({
        timestamp: z.string(),
        priceOrePerKwh: z.number(),
      })),
    })).mutation(async ({ input }) => {
      const { storePriceData } = await import("./roiService");
      const points = input.prices.map(p => ({
        timestamp: new Date(p.timestamp),
        priceOrePerKwh: Math.round(p.priceOrePerKwh),
      }));
      const inserted = await storePriceData(input.region, points);
      return { inserted };
    }),

    // Store energy readings (from device or manual)
    storeEnergy: protectedProcedure.input(z.object({
      readings: z.array(z.object({
        timestamp: z.string(),
        consumptionWh: z.number().optional(),
        productionWh: z.number().optional(),
        batteryChargeWh: z.number().optional(),
        batteryDischargeWh: z.number().optional(),
        gridImportWh: z.number().optional(),
        gridExportWh: z.number().optional(),
        batterySocPercent: z.number().optional(),
        source: z.enum(["solarman", "modbus", "manual", "simulated"]).optional(),
      })),
    })).mutation(async ({ ctx, input }) => {
      const { storeEnergyData } = await import("./roiService");
      const readings = input.readings.map(r => ({
        ...r,
        timestamp: new Date(r.timestamp),
      }));
      const inserted = await storeEnergyData(ctx.user.id, readings);
      return { inserted };
    }),
   }),

  // ─── Device Control Router ────────────────────────────────────────────────
  deviceControl: router({
    // List user's device configs
    listDevices: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const { deviceConfigs } = await import("../drizzle/schema");
      const { eq, desc } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      return db.select().from(deviceConfigs)
        .where(eq(deviceConfigs.userId, ctx.user.id))
        .orderBy(desc(deviceConfigs.createdAt));
    }),

    // Create device config
    createDevice: protectedProcedure.input(z.object({
      deviceType: z.enum(["battery", "inverter", "charger", "meter"]),
      deviceName: z.string().min(1).max(255),
      protocol: z.enum(["solarman", "modbus_tcp", "modbus_rtu", "http", "mqtt"]),
      solarmanToken: z.string().optional(),
      solarmanAppId: z.string().optional(),
      solarmanAppSecret: z.string().optional(),
      deviceSn: z.string().optional(),
      loggerId: z.string().optional(),
      modbusHost: z.string().optional(),
      modbusPort: z.number().int().min(1).max(65535).optional(),
      modbusUnitId: z.number().int().min(1).max(247).optional(),
      maxChargePower: z.number().int().min(0).max(100000).optional(),
      maxDischargePower: z.number().int().min(0).max(100000).optional(),
      maxSocPercent: z.number().int().min(10).max(100).optional(),
      minSocPercent: z.number().int().min(0).max(90).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const { deviceConfigs } = await import("../drizzle/schema");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const result = await db.insert(deviceConfigs).values({
        userId: ctx.user.id,
        ...input,
        solarmanToken: input.solarmanToken ?? null,
        solarmanAppId: input.solarmanAppId ?? null,
        solarmanAppSecret: input.solarmanAppSecret ?? null,
        deviceSn: input.deviceSn ?? null,
        loggerId: input.loggerId ?? null,
        modbusHost: input.modbusHost ?? null,
        modbusPort: input.modbusPort ?? 502,
        modbusUnitId: input.modbusUnitId ?? 1,
        maxChargePower: input.maxChargePower ?? 5000,
        maxDischargePower: input.maxDischargePower ?? 5000,
        maxSocPercent: input.maxSocPercent ?? 95,
        minSocPercent: input.minSocPercent ?? 10,
        isActive: true,
      });
      const insertId = (result as any)[0]?.insertId;
      if (!insertId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Insert failed" });
      const { eq } = await import("drizzle-orm");
      const rows = await db.select().from(deviceConfigs).where(eq(deviceConfigs.id, insertId)).limit(1);
      return rows[0];
    }),

    // Update device config
    updateDevice: protectedProcedure.input(z.object({
      id: z.number().int(),
      deviceName: z.string().min(1).max(255).optional(),
      isActive: z.boolean().optional(),
      solarmanToken: z.string().optional(),
      deviceSn: z.string().optional(),
      loggerId: z.string().optional(),
      modbusHost: z.string().optional(),
      modbusPort: z.number().int().optional(),
      modbusUnitId: z.number().int().optional(),
      maxChargePower: z.number().int().optional(),
      maxDischargePower: z.number().int().optional(),
      maxSocPercent: z.number().int().optional(),
      minSocPercent: z.number().int().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const { deviceConfigs } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { id, ...updates } = input;
      await db.update(deviceConfigs).set(updates).where(
        and(eq(deviceConfigs.id, id), eq(deviceConfigs.userId, ctx.user.id))
      );
      const rows = await db.select().from(deviceConfigs).where(eq(deviceConfigs.id, id)).limit(1);
      return rows[0] ?? null;
    }),

    // Delete device config
    deleteDevice: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const { deviceConfigs } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(deviceConfigs).where(
        and(eq(deviceConfigs.id, input.id), eq(deviceConfigs.userId, ctx.user.id))
      );
      return { success: true };
    }),

    // Execute battery command directly (not via action engine)
    executeBatteryCommand: protectedProcedure.input(z.object({
      deviceConfigId: z.number().int(),
      command: z.enum(["start_charging", "stop_charging", "schedule_charging", "set_soc_target", "set_power_limit", "get_status"]),
      params: z.record(z.string(), z.unknown()).optional(),
    })).mutation(async ({ ctx, input }) => {
      // Verify device belongs to user
      const { getDb } = await import("./db");
      const { deviceConfigs } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db.select().from(deviceConfigs).where(
        and(eq(deviceConfigs.id, input.deviceConfigId), eq(deviceConfigs.userId, ctx.user.id))
      ).limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Enhet hittades inte" });

      const { executeBatteryCommand } = await import("./deviceController/batteryController");
      const cmd = { command: input.command, params: input.params ?? {} } as any;
      const result = await executeBatteryCommand(input.deviceConfigId, cmd);
      return result;
    }),

    // Get device execution logs
    getLogs: protectedProcedure.input(z.object({
      deviceConfigId: z.number().int().optional(),
      limit: z.number().int().min(1).max(200).optional(),
    }).optional()).query(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const { deviceLogs, deviceConfigs } = await import("../drizzle/schema");
      const { eq, desc, and, inArray } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      const limit = input?.limit ?? 50;
      // Only return logs for user's own devices
      const userDevices = await db.select({ id: deviceConfigs.id }).from(deviceConfigs)
        .where(eq(deviceConfigs.userId, ctx.user.id));
      if (userDevices.length === 0) return [];
      const deviceIds = userDevices.map(d => d.id);
      const conditions = [inArray(deviceLogs.deviceConfigId, deviceIds)];
      if (input?.deviceConfigId) conditions.push(eq(deviceLogs.deviceConfigId, input.deviceConfigId));
      return db.select().from(deviceLogs).where(and(...conditions)).orderBy(desc(deviceLogs.createdAt)).limit(limit);
    }),
  }),
  // ─── Documents (inline) ─────────────────────────────────────────────────────────
  // Admin: list all users for customer selector dropdowns
  users: router({
    listAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      return getAllUsers();
    }),
  }),

  documents: router({
  // Admin: upload a document for a specific customer
  upload: protectedProcedure
    .input(z.object({
      targetUserId: z.number().int(),
      filename: z.string().min(1).max(255),
      fileKey: z.string().min(1).max(500),
      fileUrl: z.string().url().max(1000),
      docType: z.enum(["contract", "warranty", "invoice", "service_report", "installation_report", "certificate", "other"]),
      description: z.string().max(500).optional(),
      fileSizeBytes: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      return createCustomerDocument({
        uploadedBy: ctx.user.id,
        targetUserId: input.targetUserId,
        filename: input.filename,
        fileKey: input.fileKey,
        fileUrl: input.fileUrl,
        docType: input.docType,
        description: input.description,
        fileSizeBytes: input.fileSizeBytes ?? 0,
      });
    }),

  // Customer: list own documents
  listMine: protectedProcedure.query(async ({ ctx }) => {
    return getCustomerDocuments(ctx.user.id);
  }),

  // Admin: list documents for a specific customer
  listForUser: protectedProcedure
    .input(z.object({ userId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      return getCustomerDocuments(input.userId);
    }),

  // Admin: list all documents across all customers
  listAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
    return getAllCustomerDocuments();
  }),

  // Admin or uploader: delete a document
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      return deleteCustomerDocument(input.id, ctx.user.id, ctx.user.role === "admin");
    }),

  // Admin: list all users (for dropdown in upload form)
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
    return getAllUsers();
  }),
  // Get upload URL for a file (returns presigned S3 upload info)
  getUploadUrl: protectedProcedure
    .input(z.object({
      filename: z.string().min(1).max(255),
      contentType: z.string().default("application/pdf"),
      targetUserId: z.number().int(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      const { storagePut } = await import("./storage");
      // Generate a unique key for the file
      const { nanoid } = await import("nanoid");
      const ext = input.filename.split(".").pop() || "pdf";
      const fileKey = `customer-docs/${input.targetUserId}/${nanoid()}.${ext}`;
      // Upload a placeholder to get the URL structure; actual upload happens from frontend via multipart
      // Return the key so the frontend can use it after uploading via a separate mechanism
      return { fileKey, uploadReady: true };
     }),
  }),

  // ─── System Health & Alert Rules ────────────────────────────────────────────
  systemHealth: router({
    // Get all health events for current user
    events: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
      .query(async ({ ctx, input }) => {
        return getHealthEvents(ctx.user.id, input?.limit ?? 50);
      }),

    // Get unresolved alerts
    alerts: protectedProcedure.query(async ({ ctx }) => {
      return getUnresolvedAlerts(ctx.user.id);
    }),

    // Resolve an alert
    resolve: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return resolveHealthEvent(input.id, ctx.user.id);
      }),

    // Simulate a heartbeat check (creates health event)
    heartbeat: protectedProcedure
      .input(z.object({
        deviceConfigId: z.number().optional(),
        metrics: z.record(z.string(), z.number()).optional(),
      }).optional())
      .mutation(async ({ ctx, input }) => {
        const metrics = input?.metrics ?? {};

        // Evaluate alert rules against provided metrics
        const triggered = Object.keys(metrics).length > 0
          ? await evaluateAlertRules(ctx.user.id, metrics)
          : [];

        const events = [];

        // Create heartbeat event
        const heartbeat = await createHealthEvent({
          userId: ctx.user.id,
          deviceConfigId: input?.deviceConfigId,
          eventType: "heartbeat",
          severity: "info",
          title: "Heartbeat OK",
          message: `System heartbeat at ${new Date().toISOString()}`,
        });
        events.push(heartbeat);

        // Create alert events for triggered rules
        for (const { rule, value } of triggered) {
          const alertEvent = await createHealthEvent({
            userId: ctx.user.id,
            deviceConfigId: rule.deviceConfigId ?? undefined,
            eventType: "alert_triggered",
            severity: rule.severity,
            title: `Alert: ${rule.name}`,
            message: rule.message ?? `${rule.metricKey} = ${value} (threshold: ${rule.operator} ${rule.threshold})`,
            metricKey: rule.metricKey,
            metricValue: String(value),
          });
          events.push(alertEvent);
          // Update lastTriggeredAt on the rule
          await updateAlertRule(rule.id, ctx.user.id, { lastTriggeredAt: new Date() });
        }

        return { events, triggeredAlerts: triggered.length };
      }),

    // Manually create a health event (admin or system use)
    createEvent: protectedProcedure
      .input(z.object({
        deviceConfigId: z.number().optional(),
        eventType: z.enum(["heartbeat","offline","online","anomaly","alert_triggered","alert_resolved","threshold_breach"]),
        severity: z.enum(["info","warning","critical"]).default("info"),
        title: z.string().min(1).max(255),
        message: z.string().max(1000).optional(),
        metricKey: z.string().max(100).optional(),
        metricValue: z.string().max(100).optional(),
        metricUnit: z.string().max(30).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createHealthEvent({ ...input, userId: ctx.user.id });
      }),

    // Alert rules CRUD
    getRules: protectedProcedure.query(async ({ ctx }) => {
      return getAlertRules(ctx.user.id);
    }),

    createRule: protectedProcedure
      .input(z.object({
        deviceConfigId: z.number().optional(),
        name: z.string().min(1).max(100),
        metricKey: z.string().min(1).max(100),
        operator: z.enum(["lt","gt","lte","gte","eq","neq"]),
        threshold: z.string().min(1).max(50),
        severity: z.enum(["info","warning","critical"]).default("warning"),
        message: z.string().max(500).optional(),
        cooldownMinutes: z.number().min(1).max(10080).default(60),
      }))
      .mutation(async ({ ctx, input }) => {
        return createAlertRule({ ...input, userId: ctx.user.id, isActive: true });
      }),

    updateRule: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        threshold: z.string().optional(),
        severity: z.enum(["info","warning","critical"]).optional(),
        isActive: z.boolean().optional(),
        cooldownMinutes: z.number().min(1).max(10080).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...patch } = input;
        return updateAlertRule(id, ctx.user.id, patch);
      }),

    deleteRule: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return deleteAlertRule(input.id, ctx.user.id);
      }),

    // Evaluate current metrics against all active alert rules
    evaluate: protectedProcedure
      .input(z.object({ metrics: z.record(z.string(), z.number()) }))
      .mutation(async ({ ctx, input }) => {
        const triggered = await evaluateAlertRules(ctx.user.id, input.metrics);
        return { triggered: triggered.map(t => ({ ruleId: t.rule.id, ruleName: t.rule.name, value: t.value, severity: t.rule.severity })) };
      }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // KNOWLEDGE BASE
  // ═══════════════════════════════════════════════════════════════════════════
  knowledge: router({
    // List articles (published only for regular users, all for admin)
    list: protectedProcedure
      .input(z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
        adminAll: z.boolean().optional(), // admin: include unpublished
      }))
      .query(async ({ ctx, input }) => {
        const publishedOnly = !(input.adminAll && ctx.user.role === "admin");
        const articles = await listKnowledgeArticles({
          publishedOnly,
          category: input.category,
          search: input.search,
          limit: input.limit ?? 50,
          offset: input.offset ?? 0,
        });
        return articles;
      }),

    // Get single article by slug
    getBySlug: protectedProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ ctx, input }) => {
        const article = await getKnowledgeArticleBySlug(input.slug);
        if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Artikel hittades inte" });
        if (!article.published && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Ej publicerad" });
        }
        return article;
      }),

    // Create article (admin only)
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, "Slug får bara innehålla a-z, 0-9 och bindestreck"),
        excerpt: z.string().optional(),
        content: z.string().min(1),
        category: z.enum(["products", "regulations", "apps_services", "technology", "news", "other"]),
        tags: z.string().optional(),
        imageUrl: z.string().url().optional().or(z.literal("")),
        published: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await createKnowledgeArticle({
          authorId: ctx.user.id,
          title: input.title,
          slug: input.slug,
          excerpt: input.excerpt,
          content: input.content,
          category: input.category,
          tags: input.tags,
          imageUrl: input.imageUrl || undefined,
          published: input.published ?? false,
          publishedAt: input.published ? new Date() : undefined,
        });
        return { success: true };
      }),

    // Update article (admin only)
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
        excerpt: z.string().optional(),
        content: z.string().min(1).optional(),
        category: z.enum(["products", "regulations", "apps_services", "technology", "news", "other"]).optional(),
        tags: z.string().optional(),
        imageUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...patch } = input;
        await updateKnowledgeArticle(id, patch as any);
        return { success: true };
      }),

    // Publish / unpublish (admin only)
    publish: protectedProcedure
      .input(z.object({ id: z.number(), publish: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await publishKnowledgeArticle(input.id, input.publish);
        return { success: true };
      }),

    // Delete article (admin only)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await deleteKnowledgeArticle(input.id);
        return { success: true };
      }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // ONBOARDING
  // ═══════════════════════════════════════════════════════════════════════════
  onboarding: router({
    getProgress: protectedProcedure.query(async ({ ctx }) => {
      const progress = await getOnboardingProgress(ctx.user.id);
      return {
        completedSteps: (progress?.completedSteps as string[]) ?? [],
        dismissed: progress?.dismissed ?? false,
        completedAt: progress?.completedAt ?? null,
      };
    }),

    completeStep: protectedProcedure
      .input(z.object({ step: z.enum(["configure_system", "add_device", "choose_care_tier", "explore_dashboard"]) }))
      .mutation(async ({ ctx, input }) => {
        const progress = await getOnboardingProgress(ctx.user.id);
        const existing = (progress?.completedSteps as string[]) ?? [];
        if (!existing.includes(input.step)) {
          await upsertOnboardingProgress(ctx.user.id, [...existing, input.step]);
        }
        return { success: true };
      }),

    dismiss: protectedProcedure.mutation(async ({ ctx }) => {
      await dismissOnboarding(ctx.user.id);
      return { success: true };
    }),
  }),

  // ═══════════════════════════════════════════════════════════════════════
  // INVITATIONS & USER MANAGEMENT (admin only)
  // ═══════════════════════════════════════════════════════════════════════
  invitations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const { getAllInvitations } = await import('./db');
      return getAllInvitations();
    }),

    send: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().min(6),
        careTier: z.enum(['basic', 'plus', 'platinum']).default('basic'),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { createInvitation, getUserByEmail } = await import('./db');
        // Check if user already exists
        const existing = await getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'En användare med denna e-post finns redan.' });
        // Generate temp password
        const tempPassword = nanoid(10).replace(/[^a-zA-Z0-9]/g, 'x').slice(0, 10);
        const token = nanoid(32);
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h
        const bcrypt = await import('bcryptjs');
        const hashedTemp = await bcrypt.hash(tempPassword, 10);
        await createInvitation({
          token,
          name: input.name,
          email: input.email,
          phone: input.phone,
          careTier: input.careTier,
          tempPassword: hashedTemp,
          invitedBy: ctx.user.id,
          expiresAt,
        });
        // Send SMS with invite link (kund väljer eget lösenord)
        const inviteUrl = `${input.origin}/invite?token=${token}`;
        const { sendInviteSms } = await import('./smsService');
        const smsResult = await sendInviteSms(input.phone, input.name, inviteUrl, '');
        if (smsResult.success) {
          const { updateInvitation } = await import('./db');
          const { getAllInvitations } = await import('./db');
          const invs = await getAllInvitations();
          const inv = invs.find(i => i.token === token);
          if (inv) await updateInvitation(inv.id, { smsSent: true });
        }
        // Send branded welcome email
        try {
          const { sendWelcomeInviteEmail } = await import('./emailService');
          await sendWelcomeInviteEmail(input.email, input.name, inviteUrl);
        } catch { /* email is best-effort */ }
        return { success: true, smsSent: smsResult.success };
      }),

    // Get invite info (public - no auth needed)
    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const { getInvitationByToken } = await import('./db');
        const inv = await getInvitationByToken(input.token);
        if (!inv) throw new TRPCError({ code: 'NOT_FOUND', message: 'Inbjudan hittades inte.' });
        if (inv.status !== 'pending') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Inbjudan är redan använd eller har gått ut.' });
        if (new Date() > inv.expiresAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Inbjudan har gått ut.' });
        return { name: inv.name, email: inv.email, careTier: inv.careTier };
      }),

    accept: publicProcedure
      .input(z.object({ token: z.string(), password: z.string().min(8) }))
      .mutation(async ({ input }) => {
        const { getInvitationByToken, updateInvitation, createUserWithPassword } = await import('./db');
        const inv = await getInvitationByToken(input.token);
        if (!inv) throw new TRPCError({ code: 'NOT_FOUND', message: 'Inbjudan hittades inte.' });
        if (inv.status !== 'pending') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Inbjudan är redan använd eller har gått ut.' });
        if (new Date() > inv.expiresAt) {
          await updateInvitation(inv.id, { status: 'expired' });
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Inbjudan har gått ut. Kontakta din administratör.' });
        }
        // Create user with chosen password
        const user = await createUserWithPassword({
          name: inv.name,
          email: inv.email,
          password: input.password,
          phone: inv.phone ?? undefined,
          careTier: inv.careTier,
          mustChangePassword: false,
        });
        if (!user) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Kunde inte skapa konto.' });
        await updateInvitation(inv.id, { status: 'accepted', acceptedAt: new Date() });
        // Send branded welcome email
        try {
          const { sendWelcomeEmail } = await import('./emailService');
          await sendWelcomeEmail(inv.email, inv.name);
        } catch { /* best-effort */ }
        // Notify admin at care@solpulsen.se
        try {
          const { sendMail } = await import('./emailService');
          const tierLabels: Record<string, string> = { basic: 'CARE Basic', plus: 'CARE Plus', platinum: 'CARE Platinum' };
          const tierLabel = tierLabels[inv.careTier ?? 'basic'] ?? inv.careTier ?? 'CARE Basic';
          await sendMail({
            to: 'care@solpulsen.se',
            subject: `Ny kund aktiverad: ${inv.name} (${tierLabel})`,
            html: `<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"/></head><body style="font-family:sans-serif;background:#0D1117;color:#F9FAFB;padding:32px;">
              <h2 style="color:#D97706;margin:0 0 16px;">Ny kund aktiverad</h2>
              <table style="border-collapse:collapse;width:100%;max-width:480px;">
                <tr><td style="padding:10px 16px;background:#1F2937;border-radius:8px 8px 0 0;color:#9CA3AF;font-size:12px;font-weight:600;text-transform:uppercase;">Namn</td><td style="padding:10px 16px;background:#1F2937;border-radius:8px 8px 0 0;color:#F9FAFB;font-weight:700;">${inv.name}</td></tr>
                <tr><td style="padding:10px 16px;background:#111827;color:#9CA3AF;font-size:12px;font-weight:600;text-transform:uppercase;">E-post</td><td style="padding:10px 16px;background:#111827;color:#F9FAFB;">${inv.email}</td></tr>
                <tr><td style="padding:10px 16px;background:#1F2937;color:#9CA3AF;font-size:12px;font-weight:600;text-transform:uppercase;">Telefon</td><td style="padding:10px 16px;background:#1F2937;color:#F9FAFB;">${inv.phone ?? '–'}</td></tr>
                <tr><td style="padding:10px 16px;background:#111827;border-radius:0 0 8px 8px;color:#9CA3AF;font-size:12px;font-weight:600;text-transform:uppercase;">CARE-niv&aring;</td><td style="padding:10px 16px;background:#111827;border-radius:0 0 8px 8px;color:#D97706;font-weight:700;">${tierLabel}</td></tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;color:#6B7280;">Aktiverat: ${new Date().toLocaleString('sv-SE')}</p>
            </body></html>`,
          });
        } catch { /* best-effort */ }
        return { success: true, email: inv.email };
      }),

    resend: protectedProcedure
      .input(z.object({ id: z.number(), origin: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { getAllInvitations, updateInvitation } = await import('./db');
        const invs = await getAllInvitations();
        const inv = invs.find(i => i.id === input.id);
        if (!inv) throw new TRPCError({ code: 'NOT_FOUND' });
        // Generate new temp password
        const tempPassword = nanoid(10).replace(/[^a-zA-Z0-9]/g, 'x').slice(0, 10);
        const bcrypt = await import('bcryptjs');
        const hashedTemp = await bcrypt.hash(tempPassword, 10);
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
        await updateInvitation(inv.id, { tempPassword: hashedTemp, expiresAt, status: 'pending', smsSent: false });
        const loginUrl = `${input.origin}/login`;
        const { sendInviteSms } = await import('./smsService');
        const smsResult = await sendInviteSms(inv.phone ?? '', inv.name, loginUrl, tempPassword);
        if (smsResult.success) await updateInvitation(inv.id, { smsSent: true });
        return { success: true, smsSent: smsResult.success };
      }),
  }),

  // Admin user management
  adminUsers: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await (await import('./db')).getDb();
      if (!db) return [];
      const { users } = await import('../drizzle/schema');
      const { desc } = await import('drizzle-orm');
      return db.select({
        id: users.id, name: users.name, email: users.email, role: users.role,
        isActive: users.isActive, phone: users.phone, careTier: users.careTier,
        createdAt: users.createdAt, lastSignedIn: users.lastSignedIn,
      }).from(users).orderBy(desc(users.createdAt));
    }),

    setActive: protectedProcedure
      .input(z.object({ userId: z.number(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await (await import('./db')).getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { users } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await db.update(users).set({ isActive: input.isActive }).where(eq(users.id, input.userId));
        return { success: true };
      }),

    resetPassword: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const newPassword = nanoid(10).replace(/[^a-zA-Z0-9]/g, 'x').slice(0, 10);
        const { updateUserPassword, getUserById } = await import('./db');
        await updateUserPassword(input.userId, newPassword);
        // Set mustChangePassword
        const db = await (await import('./db')).getDb();
        if (db) {
          const { users } = await import('../drizzle/schema');
          const { eq } = await import('drizzle-orm');
          await db.update(users).set({ mustChangePassword: true }).where(eq(users.id, input.userId));
        }
        const user = await getUserById(input.userId);
        // Send SMS if phone available
        if (user?.phone) {
          const { sendSms } = await import('./smsService');
          await sendSms(user.phone, `Ditt nya lösenord till SolPulsen: ${newPassword} — byt det vid inloggning.`);
        }
        return { success: true, newPassword };
      }),
  }),

  // ─── Electricity Bills ──────────────────────────────────────────────────────
  bills: router({
    upload: protectedProcedure
      .input(z.object({
        filename: z.string(),
        fileKey: z.string(),
        fileUrl: z.string().url(),
        billMonth: z.number().int().min(1).max(12),
        billYear: z.number().int().min(2020).max(2100),
        amount: z.number().optional(),
        dueDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createBill } = await import('./db');
        return createBill({
          userId: ctx.user.id,
          filename: input.filename,
          fileKey: input.fileKey,
          fileUrl: input.fileUrl,
          billMonth: input.billMonth,
          billYear: input.billYear,
          amount: input.amount ? String(input.amount) : undefined,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          notes: input.notes,
        });
      }),

    list: protectedProcedure
      .input(z.object({ userId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const { getBillsByUser, getAllBills } = await import('./db');
        if (input.userId && ctx.user.role === 'admin') return getBillsByUser(input.userId);
        if (ctx.user.role === 'admin' && !input.userId) return getAllBills();
        return getBillsByUser(ctx.user.id);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { getBillById, deleteBill, deleteRemindersByBill } = await import('./db');
        const bill = await getBillById(input.id);
        if (!bill) throw new TRPCError({ code: 'NOT_FOUND' });
        if (bill.userId !== ctx.user.id && ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        await deleteRemindersByBill(input.id);
        await deleteBill(input.id);
        return { success: true };
      }),

    setReminder: protectedProcedure
      .input(z.object({
        billId: z.number(),
        reminderDate: z.string(),
        reminderType: z.enum(['email', 'sms']).default('email'),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getBillById, createReminder, getUserById } = await import('./db');
        const bill = await getBillById(input.billId);
        if (!bill) throw new TRPCError({ code: 'NOT_FOUND' });
        if (bill.userId !== ctx.user.id && ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        if (input.reminderType === 'sms') {
          const user = await getUserById(ctx.user.id);
          const tier = user?.careTier ?? 'basic';
          if (tier === 'basic') throw new TRPCError({ code: 'FORBIDDEN', message: 'SMS-påminnelser kräver CARE Plus eller Platinum.' });
        }
        return createReminder({
          billId: input.billId,
          userId: bill.userId,
          reminderDate: new Date(input.reminderDate),
          reminderType: input.reminderType,
        });
      }),

    reminders: protectedProcedure.query(async ({ ctx }) => {
      const { getRemindersByUser } = await import('./db');
      return getRemindersByUser(ctx.user.id);
    }),

    analyze: protectedProcedure
      .input(z.object({ billId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { getBillById, updateBillAnalysis } = await import('./db');
        const { invokeLLM } = await import('./_core/llm');
        const bill = await getBillById(input.billId);
        if (!bill) throw new TRPCError({ code: 'NOT_FOUND', message: 'Faktura hittades inte' });
        if (bill.userId !== ctx.user.id && ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const billContext = `Elfaktura: ${bill.filename}
Manad: ${bill.billMonth}/${bill.billYear}
Belopp: ${bill.amount ? bill.amount + ' SEK' : 'okant'}
Forfallodatum: ${bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('sv-SE') : 'okant'}
Anteckningar: ${bill.notes || 'inga'}`;
        const response = await invokeLLM({
          messages: [
            { role: 'system', content: 'Du ar en energiexpert som analyserar svenska elfakturor. Returnera alltid giltig JSON.' },
            { role: 'user', content: `Analysera denna elfaktura och returnera JSON med foljande falt: totalKwh (number|null), totalCostSek (number), networkFeesSek (number), energyCostSek (number), pricePerKwh (number|null), monthlyAvgSek (number), savingsPotentialSek (number uppskattad arlig besparing med sol+batteri), savingsPotentialPct (number 0-100), insights (array of 3-5 strings pa svenska), recommendations (array of 3 strings pa svenska), riskLevel (string: low|medium|high), summary (string 2-3 meningar pa svenska).

Fakturadata:
${billContext}` }
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'bill_analysis',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  totalKwh: { type: ['number', 'null'] },
                  totalCostSek: { type: 'number' },
                  networkFeesSek: { type: 'number' },
                  energyCostSek: { type: 'number' },
                  pricePerKwh: { type: ['number', 'null'] },
                  monthlyAvgSek: { type: 'number' },
                  savingsPotentialSek: { type: 'number' },
                  savingsPotentialPct: { type: 'number' },
                  insights: { type: 'array', items: { type: 'string' } },
                  recommendations: { type: 'array', items: { type: 'string' } },
                  riskLevel: { type: 'string' },
                  summary: { type: 'string' },
                },
                required: ['totalKwh','totalCostSek','networkFeesSek','energyCostSek','pricePerKwh','monthlyAvgSek','savingsPotentialSek','savingsPotentialPct','insights','recommendations','riskLevel','summary'],
                additionalProperties: false,
              }
            }
          }
        });
        const content = response.choices[0]?.message?.content as string;
        const analysis = JSON.parse(content);
        await updateBillAnalysis(input.billId, JSON.stringify(analysis));
        return analysis;
      }),
  }),

  care: router({
    requestUpgrade: protectedProcedure
      .input(z.object({
        currentTier: z.enum(['basic', 'plus', 'platinum']),
        targetTier: z.enum(['plus', 'platinum']),
        message: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createTicket } = await import('./db');
        const tierLabels: Record<string, string> = { basic: 'Basic', plus: 'Plus', platinum: 'Platinum' };
        const ticketNumber = generateTicketNumber();
        const subject = `Uppgraderingsforfragan: CARE ${tierLabels[input.currentTier]} -> ${tierLabels[input.targetTier]}`;
        await createTicket({
          ticketNumber,
          subject,
          description: `Kund begar uppgradering fran CARE ${tierLabels[input.currentTier]} till ${tierLabels[input.targetTier]}.${input.message ? ' Kommentar: ' + input.message : ''}`,
          status: 'open',
          priority: 'medium',
          category: 'general',
          customerId: ctx.user.id,
        });
        try {
          const { sendTicketCreatedEmail } = await import('./emailService');
          await sendTicketCreatedEmail({ to: ctx.user.email!, customerName: ctx.user.name ?? 'Kund', ticketNumber, subject, priority: 'medium', category: 'general', slaDeadline: null, careTier: ctx.user.careTier ?? null });
        } catch (e) { console.error('[care.requestUpgrade] email failed:', e); }
        return { success: true, ticketNumber };
      }),
  }),

  // ─── Public contact form (no auth required) ───────────────────────────────
  contactForm: router({
    submit: publicProcedure
      .input(z.object({
        name: z.string().min(2).max(100),
        email: z.string().email(),
        phone: z.string().optional(),
        interest: z.enum(['basic', 'silver', 'platinum', 'recare', 'other']),
        message: z.string().min(5).max(2000),
      }))
      .mutation(async ({ input }) => {
        const { sendMail } = await import('./emailService');
        const tierLabels: Record<string, string> = {
          basic: 'CARE Basic',
          silver: 'CARE Silver',
          platinum: 'CARE Platinum',
          recare: 'Re-CARE',
          other: 'Annat',
        };
        const tierLabel = tierLabels[input.interest] ?? input.interest;
        // Notify care@solpulsen.se
        await sendMail({
          to: 'care@solpulsen.se',
          subject: 'Ny CARE-forfragan: ' + tierLabel + ' \u2014 ' + input.name,
          html: '<h2>Ny kontaktforfragan fran CARE-sidan</h2><table style="border-collapse:collapse;font-family:sans-serif;font-size:14px"><tr><td style="padding:6px 12px;font-weight:600">Namn</td><td style="padding:6px 12px">' + input.name + '</td></tr><tr><td style="padding:6px 12px;font-weight:600">E-post</td><td style="padding:6px 12px">' + input.email + '</td></tr><tr><td style="padding:6px 12px;font-weight:600">Telefon</td><td style="padding:6px 12px">' + (input.phone ?? '\u2014') + '</td></tr><tr><td style="padding:6px 12px;font-weight:600">Intresse</td><td style="padding:6px 12px">' + tierLabel + '</td></tr><tr><td style="padding:6px 12px;font-weight:600;vertical-align:top">Meddelande</td><td style="padding:6px 12px">' + input.message.replace(/\n/g, '<br>') + '</td></tr></table>',
        });
        // Confirmation to customer
        await sendMail({
          to: input.email,
          subject: 'Vi har tagit emot din forfragan \u2014 Solpulsen CARE',
          html: '<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:40px 32px;background:#F7F5F0"><img src="https://d2xsxph8kpxj0f.cloudfront.net/107016592/8kqYZvaGCpcSjyuXQ9yrCo/solpulsen-care-logo-4k_ce5a0a3a.webp" alt="Solpulsen CARE" style="height:56px;margin-bottom:32px" /><h2 style="font-size:22px;font-weight:600;color:#171717;margin-bottom:16px">Tack, ' + input.name + '.</h2><p style="font-size:15px;color:#6E6A63;line-height:1.7;margin-bottom:16px">Vi har tagit emot din forfragan om <strong>' + tierLabel + '</strong>. En av vara energiradgivare aterkommar till dig inom 1 arbetsdag.</p><p style="font-size:15px;color:#6E6A63;line-height:1.7;margin-bottom:32px">Har du brattom? Ring oss pa <a href="tel:+46303707270" style="color:#C7A64A">0303-70 72 70</a> eller svara pa detta mejl.</p><hr style="border:none;border-top:1px solid #E7E1D6;margin-bottom:24px" /><p style="font-size:12px;color:#6E6A63">Solpulsen Energy Norden AB &bull; Framnasvagen 2, Sodertalje &bull; care@solpulsen.se</p></div>',
        });
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
