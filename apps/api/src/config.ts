export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? 4000),
  publicWebUrl: process.env.PUBLIC_WEB_URL ?? "http://localhost:3000",
  apiBaseUrl: process.env.API_BASE_URL ?? `http://localhost:${process.env.API_PORT ?? 4000}`,
  appAuthSecret: process.env.APP_AUTH_SECRET ?? "",
  bootstrapOwnerName: process.env.BOOTSTRAP_OWNER_NAME ?? "PrintFlow Owner",
  bootstrapOwnerEmail: process.env.BOOTSTRAP_OWNER_EMAIL ?? "",
  bootstrapOwnerPassword: process.env.BOOTSTRAP_OWNER_PASSWORD ?? "",
  dataDir: process.env.PRINTFLOW_DATA_DIR ?? "data",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseArtworkBucket: process.env.SUPABASE_STORAGE_BUCKET_ARTWORK ?? "artwork",
  supabaseProofsBucket: process.env.SUPABASE_STORAGE_BUCKET_PROOFS ?? "proofs",
  emailProvider: process.env.EMAIL_PROVIDER ?? "local",
  smsProvider: process.env.SMS_PROVIDER ?? "local",
  payfastMerchantId: process.env.PAYFAST_MERCHANT_ID ?? "",
  payfastMerchantKey: process.env.PAYFAST_MERCHANT_KEY ?? "",
  payfastPassphrase: process.env.PAYFAST_PASSPHRASE ?? "",
  payfastReturnUrl: process.env.PAYFAST_RETURN_URL ?? "http://localhost:3000/orders/thank-you",
  payfastCancelUrl: process.env.PAYFAST_CANCEL_URL ?? "http://localhost:3000/orders/cancelled",
  payfastNotifyUrl: process.env.PAYFAST_NOTIFY_URL ?? "http://localhost:4000/webhooks/payfast",
  yocoSecretKey: process.env.YOCO_SECRET_KEY ?? "",
  yocoWebhookSecret: process.env.YOCO_WEBHOOK_SECRET ?? "",
  yocoSuccessUrl: process.env.YOCO_SUCCESS_URL ?? `${process.env.PUBLIC_WEB_URL ?? "http://localhost:3000"}/orders/thank-you`,
  yocoCancelUrl: process.env.YOCO_CANCEL_URL ?? `${process.env.PUBLIC_WEB_URL ?? "http://localhost:3000"}/orders/cancelled`,
  yocoFailureUrl: process.env.YOCO_FAILURE_URL ?? `${process.env.PUBLIC_WEB_URL ?? "http://localhost:3000"}/orders/cancelled`,
  counterEscalationMinutes: Number(process.env.COUNTER_ESCALATION_MINUTES ?? 5)
};

export function assertProductionConfig() {
  if (config.nodeEnv !== "production") return;
  const missing = [
    ["APP_AUTH_SECRET", config.appAuthSecret],
    ["SUPABASE_URL", config.supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", config.supabaseServiceRoleKey],
    ["PAYFAST_MERCHANT_ID", config.payfastMerchantId],
    ["PAYFAST_MERCHANT_KEY", config.payfastMerchantKey],
    ["PAYFAST_NOTIFY_URL", config.payfastNotifyUrl],
    ["YOCO_SECRET_KEY", config.yocoSecretKey]
  ].filter(([, value]) => !value);
  if (missing.length > 0) {
    throw new Error(`Missing production configuration: ${missing.map(([key]) => key).join(", ")}`);
  }
}
