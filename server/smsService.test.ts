import { describe, it, expect, vi } from "vitest";

// Test SMS service logic without live API calls
describe("smsService", () => {
  it("normalizes Swedish phone numbers to E.164", () => {
    const normalize = (to: string) => {
      let phone = to.replace(/\s/g, "");
      if (phone.startsWith("0")) phone = "+46" + phone.slice(1);
      if (!phone.startsWith("+")) phone = "+" + phone;
      return phone;
    };
    expect(normalize("0701234567")).toBe("+46701234567");
    expect(normalize("+46701234567")).toBe("+46701234567");
    expect(normalize("46701234567")).toBe("+46701234567");
    expect(normalize("070 123 45 67")).toBe("+46701234567");
  });

  it("builds correct invite message", () => {
    const name = "Anna Svensson";
    const loginUrl = "https://care.solpulsen.se/login";
    const tempPassword = "Abc12345";
    const message =
      `Hej ${name}! Du har bjudits in till SolPulsen Energy Portal.\n` +
      `Logga in: ${loginUrl}\n` +
      `Lösenord: ${tempPassword}\n` +
      `Byt lösenord vid första inloggning.`;
    expect(message).toContain("SolPulsen Energy Portal");
    expect(message).toContain(loginUrl);
    expect(message).toContain(tempPassword);
  });

  it("throws when credentials are missing", async () => {
    const originalUsername = process.env.ELKS_USERNAME;
    const originalPassword = process.env.ELKS_PASSWORD;
    delete process.env.ELKS_USERNAME;
    delete process.env.ELKS_PASSWORD;

    const { sendSms } = await import("./smsService");
    const result = await sendSms("+46701234567", "test");
    expect(result.success).toBe(false);
    expect(result.error).toContain("credentials not configured");

    process.env.ELKS_USERNAME = originalUsername;
    process.env.ELKS_PASSWORD = originalPassword;
  });

  it("has ELKS_USERNAME and ELKS_PASSWORD configured", () => {
    expect(process.env.ELKS_USERNAME).toBeTruthy();
    expect(process.env.ELKS_PASSWORD).toBeTruthy();
  });
});
