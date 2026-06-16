import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Order } from "@printflow/shared";
import { config } from "../config.js";

export interface CheckoutResponse {
  provider: "payfast" | "yoco";
  mode: "configured" | "offline_development";
  amount: number;
  merchantReference: string;
  redirectUrl: string;
  formFields?: Record<string, string> | undefined;
  checkoutId?: string | undefined;
}

const YOCO_CHECKOUTS_URL = "https://payments.yoco.com/api/checkouts";

// Creates a Yoco hosted checkout and returns the redirect URL the customer is sent to.
export async function createYocoCheckout(order: Order): Promise<CheckoutResponse> {
  const amount = order.requiredDeposit || order.total;
  const amountInCents = Math.round(amount * 100);

  if (!config.yocoSecretKey) {
    if (config.nodeEnv === "production") {
      throw Object.assign(new Error("Yoco credentials are required in production"), { statusCode: 503 });
    }
    return {
      provider: "yoco",
      mode: "offline_development",
      amount,
      merchantReference: order.orderNumber,
      redirectUrl: `${config.publicWebUrl}/payments/local-checkout?order=${order.id}&provider=yoco`
    };
  }

  const response = await fetch(YOCO_CHECKOUTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.yocoSecretKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `${order.id}-${amountInCents}`
    },
    body: JSON.stringify({
      amount: amountInCents,
      currency: "ZAR",
      successUrl: config.yocoSuccessUrl,
      cancelUrl: config.yocoCancelUrl,
      failureUrl: config.yocoFailureUrl,
      metadata: { orderId: order.id, orderNumber: order.orderNumber }
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw Object.assign(new Error(`Yoco checkout failed: ${response.status} ${detail}`), { statusCode: 502 });
  }

  const data = await response.json() as { id: string; redirectUrl: string; amount?: number };
  return {
    provider: "yoco",
    mode: "configured",
    amount,
    merchantReference: order.orderNumber,
    redirectUrl: data.redirectUrl,
    checkoutId: data.id
  };
}

// Verifies a Yoco webhook using the Svix-style signature scheme (webhook-id/-timestamp/-signature).
export function verifyYocoWebhook(headers: Record<string, string | undefined>, rawBody: string): boolean {
  if (!config.yocoWebhookSecret) return true; // not configured (dev) -> accept
  const id = headers["webhook-id"];
  const timestamp = headers["webhook-timestamp"];
  const signatureHeader = headers["webhook-signature"];
  if (!id || !timestamp || !signatureHeader) return false;

  const secretBytes = Buffer.from(config.yocoWebhookSecret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  // The header is a space-separated list of "v1,<base64sig>" entries.
  return signatureHeader.split(" ").some((entry) => {
    const candidate = entry.includes(",") ? entry.split(",")[1] : entry;
    if (!candidate) return false;
    try {
      const a = Buffer.from(candidate);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });
}

export function createPayFastCheckout(order: Order): CheckoutResponse {
  const amount = order.requiredDeposit || order.total;
  const merchantReference = order.orderNumber;
  if (!config.payfastMerchantId || !config.payfastMerchantKey) {
    if (config.nodeEnv === "production") {
      throw Object.assign(new Error("PayFast credentials are required in production"), { statusCode: 503 });
    }
    return {
      provider: "payfast",
      mode: "offline_development",
      amount,
      merchantReference,
      redirectUrl: `${config.publicWebUrl}/payments/local-checkout?order=${order.id}`
    };
  }

  const fields: Record<string, string> = {
    merchant_id: config.payfastMerchantId,
    merchant_key: config.payfastMerchantKey,
    return_url: config.payfastReturnUrl,
    cancel_url: config.payfastCancelUrl,
    notify_url: config.payfastNotifyUrl,
    m_payment_id: order.id,
    amount: amount.toFixed(2),
    item_name: `PrintFlow ${order.orderNumber}`,
    item_description: order.items.map((item) => `${item.quantity} x ${item.productName}`).join(", "),
    name_first: order.customer.name.split(" ")[0] ?? order.customer.name,
    email_address: order.customer.email ?? "orders@printflow.local"
  };
  fields.signature = payfastSignature(fields, config.payfastPassphrase);
  return {
    provider: "payfast",
    mode: "configured",
    amount,
    merchantReference,
    redirectUrl: "https://www.payfast.co.za/eng/process",
    formFields: fields
  };
}

export function payfastSignature(fields: Record<string, string>, passphrase: string): string {
  const query = Object.entries(fields)
    .filter(([key, value]) => key !== "signature" && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${encodeURIComponent(value).replace(/%20/g, "+")}`)
    .join("&");
  const signed = passphrase ? `${query}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}` : query;
  return createHash("md5").update(signed).digest("hex");
}
