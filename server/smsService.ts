/**
 * 46elks SMS Service
 * Sends SMS via 46elks REST API using Basic Auth (username:password)
 */

const ELKS_API = "https://api.46elks.com/a1/sms";
const ELKS_FROM = "SolPulsen";

function getCredentials() {
  const username = process.env.ELKS_USERNAME;
  const password = process.env.ELKS_PASSWORD;
  if (!username || !password) {
    throw new Error("46elks credentials not configured (ELKS_USERNAME / ELKS_PASSWORD)");
  }
  return { username, password };
}

export async function sendSms(to: string, message: string): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { username, password } = getCredentials();

    // Normalize Swedish phone number to E.164
    let phone = to.replace(/\s/g, "");
    if (phone.startsWith("0")) phone = "+46" + phone.slice(1);
    if (!phone.startsWith("+")) phone = "+" + phone;

    const body = new URLSearchParams({
      from: ELKS_FROM,
      to: phone,
      message,
    });

    const res = await fetch(ELKS_API, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[46elks] Error:", res.status, text);
      return { success: false, error: `HTTP ${res.status}: ${text}` };
    }

    const data = (await res.json()) as { id?: string; status?: string };
    return { success: true, id: data.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[46elks] Exception:", msg);
    return { success: false, error: msg };
  }
}

export async function sendInviteSms(phone: string, name: string, loginUrl: string, tempPassword: string): Promise<{ success: boolean; error?: string }> {
  const message =
    `Hej ${name}! Du har bjudits in till SolPulsen Energy Portal.\n` +
    `Logga in: ${loginUrl}\n` +
    `Lösenord: ${tempPassword}\n` +
    `Byt lösenord vid första inloggning.`;
  return sendSms(phone, message);
}
