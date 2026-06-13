import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock emailService
vi.mock("./emailService", () => ({
  sendMail: vi.fn().mockResolvedValue(true),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("contactForm.submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects empty name", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.contactForm.submit({
        name: "",
        email: "test@test.se",
        interest: "basic",
        message: "Jag vill veta mer om CARE",
      })
    ).rejects.toThrow();
  });

  it("rejects invalid email", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.contactForm.submit({
        name: "Test Testsson",
        email: "not-an-email",
        interest: "silver",
        message: "Jag vill veta mer om CARE",
      })
    ).rejects.toThrow();
  });

  it("rejects too short message", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.contactForm.submit({
        name: "Test Testsson",
        email: "test@test.se",
        interest: "platinum",
        message: "Hi",
      })
    ).rejects.toThrow();
  });

  it("rejects invalid interest value", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.contactForm.submit({
        name: "Test Testsson",
        email: "test@test.se",
        interest: "invalid" as any,
        message: "Jag vill veta mer om CARE",
      })
    ).rejects.toThrow();
  });

  it("accepts valid submission and returns success", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.contactForm.submit({
      name: "Anna Andersson",
      email: "anna@example.se",
      phone: "070-123 45 67",
      interest: "silver",
      message: "Jag har ett solsystem från en annan installatör och vill veta mer om CARE Silver.",
    });
    expect(result).toEqual({ success: true });

    // Verify sendMail was called twice (care@solpulsen.se + customer confirmation)
    const { sendMail } = await import("./emailService");
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it("accepts recare interest", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.contactForm.submit({
      name: "Erik Eriksson",
      email: "erik@example.se",
      interest: "recare",
      message: "Min installatör har gått i konkurs och jag behöver hjälp med mitt system.",
    });
    expect(result).toEqual({ success: true });
  });

  it("accepts other interest", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.contactForm.submit({
      name: "Lisa Larsson",
      email: "lisa@example.se",
      interest: "other",
      message: "Jag har en fråga om ert erbjudande som inte passar i de andra kategorierna.",
    });
    expect(result).toEqual({ success: true });
  });
});
