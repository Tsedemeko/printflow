import type { SmsCredentials } from "../store.js";

export function smsIsConfigured(settings: SmsCredentials): boolean {
  return Boolean(settings.enabled && settings.baseUrl && settings.apiKey && settings.sender);
}

function normalizeBase(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

// Send an SMS through Infobip. Throws on misconfiguration or a non-2xx response.
export async function sendSms(settings: SmsCredentials, to: string, text: string): Promise<{ messageId?: string | undefined }> {
  if (!smsIsConfigured(settings)) throw new Error("SMS is not configured.");
  const response = await fetch(`${normalizeBase(settings.baseUrl)}/sms/2/text/advanced`, {
    method: "POST",
    headers: {
      Authorization: `App ${settings.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      messages: [{ from: settings.sender, destinations: [{ to }], text }]
    })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Infobip SMS failed (${response.status}). ${detail.slice(0, 160)}`);
  }
  const data = await response.json().catch(() => ({})) as { messages?: Array<{ messageId?: string }> };
  return { messageId: data.messages?.[0]?.messageId };
}
