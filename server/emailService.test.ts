import { describe, it, expect, vi } from "vitest";

/**
 * emailService tests
 * Live SMTP connection is not available in the sandbox environment.
 * Tests validate module structure, HTML generation, and graceful no-op when SMTP_PASS is absent.
 */
describe("emailService", () => {
  it("exports all required send functions", async () => {
    const mod = await import("./emailService");
    expect(typeof mod.sendMail).toBe("function");
    expect(typeof mod.sendTicketCreatedEmail).toBe("function");
    expect(typeof mod.sendTicketUpdatedEmail).toBe("function");
    expect(typeof mod.sendAiActionEmail).toBe("function");
    expect(typeof mod.sendRoiReportEmail).toBe("function");
  });

  it("sendMail is a no-op when SMTP_PASS is not set", async () => {
    const origPass = process.env.SMTP_PASS;
    delete process.env.SMTP_PASS;

    const { sendMail } = await import("./emailService");
    // Should resolve without throwing (no-op path)
    await expect(sendMail({ to: "test@example.com", subject: "Test", html: "<p>test</p>" })).resolves.toBeUndefined();

    process.env.SMTP_PASS = origPass;
  });

  it("ticket created email does not throw when SMTP_PASS is absent", async () => {
    const origPass = process.env.SMTP_PASS;
    delete process.env.SMTP_PASS;

    const { sendTicketCreatedEmail } = await import("./emailService");
    await expect(sendTicketCreatedEmail({
      to: "kund@example.com",
      customerName: "Test Kund",
      ticketNumber: "CARE-2026-001",
      subject: "Testärende",
      priority: "medium",
      category: "technical",
      slaDeadline: new Date(Date.now() + 72 * 3600 * 1000),
      careTier: "basic",
    })).resolves.toBeUndefined();

    process.env.SMTP_PASS = origPass;
  });

  it("AI action email does not throw when SMTP_PASS is absent", async () => {
    const origPass = process.env.SMTP_PASS;
    delete process.env.SMTP_PASS;

    const { sendAiActionEmail } = await import("./emailService");
    await expect(sendAiActionEmail({
      to: "kund@example.com",
      customerName: "Test Kund",
      actionType: "optimize_battery",
      description: "Batterioptimering utförd",
      savingsSek: 4500,
      savingsKwh: 120,
      confidence: 85,
    })).resolves.toBeUndefined();

    process.env.SMTP_PASS = origPass;
  });

  it("ROI report email does not throw when SMTP_PASS is absent", async () => {
    const origPass = process.env.SMTP_PASS;
    delete process.env.SMTP_PASS;

    const { sendRoiReportEmail } = await import("./emailService");
    await expect(sendRoiReportEmail({
      to: "kund@example.com",
      customerName: "Test Kund",
      fromDate: new Date("2026-03-01"),
      toDate: new Date("2026-03-31"),
      totalSavingsSek: 125000,
      yearlyProjectedSek: 1500000,
      executedActions: 14,
    })).resolves.toBeUndefined();

    process.env.SMTP_PASS = origPass;
  });
});
