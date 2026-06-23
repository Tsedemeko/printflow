import { ACCESS_AREAS, ORDER_STATUSES, STAFF_ROLES, defaultAccessForRoles, roleAccess, workflowColumns } from "@printflow/shared";
import type { CatalogProduct, OrderStatus, PaymentMethod, StaffMember } from "@printflow/shared";
import { Router } from "express";
import { z } from "zod";
import {
  attachArtwork,
  acknowledgeCounterTicket,
  createCatalogProduct,
  createCustomer,
  createDepositRule,
  createDiscountRule,
  createInventoryItem,
  createStaffMember,
  deleteCatalogProduct,
  deleteCustomer,
  deleteDepositRule,
  deleteDiscountRule,
  deleteInventoryItem,
  receiveStock,
  issueStock,
  recountStock,
  listStockMovements,
  deleteStaffMember,
  deleteOrder,
  createOrder,
  findOrder,
  findCounterTicket,
  getCounterQueue,
  groupProductionBatches,
  orderMetrics,
  approveProof,
  queueNotification,
  recordPayment,
  replaceKioskCategories,
  replaceBankingDetails,
  replaceEmailSettings,
  publicEmailSettings,
  replaceSmsSettings,
  publicSmsSettings,
  sendProof,
  publicStaff,
  state,
  transitionOrder,
  updateCatalogProduct,
  updateCustomer,
  updateDepositRule,
  updateDiscountRule,
  updateInventoryItem,
  updateStaffMember,
  updateOrder,
  resolveCounterTicket
} from "./store.js";
import { requireAccess, staffFromRequest } from "./services/authz.js";
import { createPayFastCheckout, createYocoCheckout, verifyYocoWebhook } from "./services/payments.js";
import { saveArtworkObject } from "./services/storage.js";
import { hashPassword, issueStaffToken, verifyPassword } from "./services/app-auth.js";
import { EmailNotConfiguredError, emailIsConfigured, sendEmail } from "./services/email.js";
import { config } from "./config.js";

const router = Router();

const quoteItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  selectedOptions: z.record(z.string()),
  specialInstructions: z.string().optional()
});

const createOrderSchema = z.object({
  source: z.enum(["kiosk", "counter", "online", "quick_sale"]),
  customer: z.object({
    name: z.string().min(1),
    mobile: z.string().min(5),
    email: z.string().email().optional()
  }),
  items: z.array(quoteItemSchema).min(1),
  staffAssigneeId: z.string().optional(),
  rush: z.boolean().optional()
});

const categorySchema = z.enum(["apparel", "document", "signage", "canvas_photo", "promotional", "quick_sale"]);
const departmentSchema = z.enum(["front_counter", "document_printing", "apparel_heat_press", "canvas_photo", "signage_banner", "promotional_items"]);
const catalogOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  priceDelta: z.number()
});
const catalogProductSchema = z.object({
  id: z.string().min(1),
  category: categorySchema,
  department: departmentSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  basePrice: z.number().min(0),
  unitLabel: z.string().min(1),
  options: z.record(z.array(catalogOptionSchema)),
  requiresArtwork: z.boolean(),
  proofRecommended: z.boolean(),
  inventoryTags: z.array(z.string()),
  enabled: z.boolean().default(true)
});
const staffRoleSchema = z.enum(STAFF_ROLES);
const accessAreaSchema = z.enum(ACCESS_AREAS);
const staffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  mobile: z.string().optional(),
  role: staffRoleSchema,
  roles: z.array(staffRoleSchema).optional(),
  active: z.boolean().default(true),
  accessAreas: z.array(accessAreaSchema).optional(),
  temporaryPassword: z.string().min(8).optional()
});
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});
const customerSchema = z.object({
  name: z.string().min(1),
  mobile: z.string().min(5),
  email: z.string().email().optional()
});

router.get("/health", (_req, res) => res.json({ ok: true, service: "printflow-api" }));

router.get("/auth/session", async (req, res, next) => {
  try {
    const staff = await staffFromRequest(req);
    if (!staff) return res.status(401).json({ error: "Staff authentication required" });
    return res.json({ user: staff, provider: "printflow" });
  } catch (error) {
    return next(error);
  }
});

router.post("/auth/login", (req, res) => {
  const body = loginSchema.parse(req.body);
  const staff = state.staff.find((member) => member.email.toLowerCase() === body.email.toLowerCase());
  if (!staff || !staff.active || !verifyPassword(body.password, staff.passwordHash)) {
    return res.status(401).json({ error: "Invalid staff email or password" });
  }
  return res.json({ token: issueStaffToken(staff), user: publicStaff(staff) });
});

router.get("/admin/permissions", requireAccess("staff_management"), (_req, res) => {
  res.json({ roles: STAFF_ROLES, accessAreas: ACCESS_AREAS, roleAccess });
});

router.get("/admin/staff", requireAccess("staff_management"), (_req, res) => res.json({ staff: state.staff.map(publicStaff) }));
// Minimal roster for production tracking (managers/supervisors/designers), no sensitive fields.
router.get("/staff/roster", requireAccess("production"), (_req, res) => res.json({
  roster: state.staff
    .filter((member) => member.active)
    .map((member) => ({ id: member.id, name: member.name, role: member.role, roles: member.roles }))
}));
router.post("/admin/staff", requireAccess("staff_management"), async (req, res, next) => {
  try {
  const body = staffSchema.parse(req.body);
  const roles = body.roles?.length ? body.roles : [body.role];
    if (state.staff.some((member) => member.email.toLowerCase() === body.email.toLowerCase())) {
      throw Object.assign(new Error("A staff member with this email already exists."), { statusCode: 409 });
    }
    if (!body.temporaryPassword) throw Object.assign(new Error("temporaryPassword is required when creating a staff login."), { statusCode: 400 });
    const { temporaryPassword: _temporaryPassword, ...staffBody } = body;
    const staffMember = createStaffMember({ ...staffBody, roles, accessAreas: body.accessAreas ?? defaultAccessForRoles(roles), passwordHash: hashPassword(body.temporaryPassword) });
    res.status(201).json({ staffMember: publicStaff(staffMember) });
  } catch (error) {
    next(error);
  }
});
router.patch("/admin/staff/:id", requireAccess("staff_management"), (req, res) => {
  const body = staffSchema.partial().parse(req.body);
  const { temporaryPassword, ...staffBody } = body;
  const patch = compactPatch({ ...staffBody, passwordHash: temporaryPassword ? hashPassword(temporaryPassword) : undefined });
  res.json({ staffMember: publicStaff(updateStaffMember(routeParam(req, "id"), patch as Partial<StaffMember>)) });
});
router.delete("/admin/staff/:id", requireAccess("staff_management"), (req, res) => {
  deleteStaffMember(routeParam(req, "id"));
  res.status(204).send();
});

router.get("/kiosk/categories", (_req, res) => res.json({ categories: state.kioskCategories }));
router.put("/kiosk/categories", requireAccess("catalog_pricing"), (req, res) => {
  const body = z.object({
    categories: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), description: z.string().optional().default("") }))
  }).parse(req.body);
  res.json({ categories: replaceKioskCategories(body.categories) });
});

// Banking details are public so invoices/quotations can render the EFT block.
router.get("/settings/banking", (_req, res) => res.json({ banking: state.bankingDetails }));
router.put("/settings/banking", requireAccess("catalog_pricing"), (req, res) => {
  const body = z.object({
    bankName: z.string().optional(),
    accountName: z.string().optional(),
    accountNumber: z.string().optional(),
    branchCode: z.string().optional(),
    accountType: z.string().optional(),
    paymentReference: z.string().optional()
  }).parse(req.body);
  res.json({ banking: replaceBankingDetails(body) });
});

// Email settings are owner-managed; the GET never returns the stored app password.
router.get("/settings/email", requireAccess("catalog_pricing"), (_req, res) => res.json({ email: publicEmailSettings() }));
router.put("/settings/email", requireAccess("catalog_pricing"), (req, res) => {
  const body = z.object({
    enabled: z.boolean().optional(),
    fromName: z.string().optional(),
    user: z.string().email("Enter a valid Gmail address").optional().or(z.literal("")),
    password: z.string().optional()
  }).parse(req.body);
  res.json({ email: replaceEmailSettings(body) });
});

// SMS (Infobip) settings — owner-managed; the GET never returns the stored API key.
router.get("/settings/sms", requireAccess("catalog_pricing"), (_req, res) => res.json({ sms: publicSmsSettings() }));
router.put("/settings/sms", requireAccess("catalog_pricing"), (req, res) => {
  const body = z.object({
    enabled: z.boolean().optional(),
    baseUrl: z.string().optional(),
    sender: z.string().optional(),
    apiKey: z.string().optional()
  }).parse(req.body);
  res.json({ sms: replaceSmsSettings(body) });
});

router.get("/catalog/products", (_req, res) => res.json({ products: state.catalog }));
router.post("/catalog/products", requireAccess("catalog_pricing"), (req, res) => {
  const body = catalogProductSchema.parse(req.body) as CatalogProduct;
  res.status(201).json({ product: createCatalogProduct(body) });
});
router.patch("/catalog/products/:id", requireAccess("catalog_pricing"), (req, res) => {
  const body = catalogProductSchema.partial().parse(req.body);
  res.json({ product: updateCatalogProduct(routeParam(req, "id"), compactPatch(body) as Partial<CatalogProduct>) });
});
router.delete("/catalog/products/:id", requireAccess("catalog_pricing"), (req, res) => {
  deleteCatalogProduct(routeParam(req, "id"));
  res.status(204).send();
});

router.get("/catalog/deposit-rules", (_req, res) => res.json({ rules: state.depositRules }));
router.post("/catalog/deposit-rules", requireAccess("catalog_pricing"), (req, res) => {
  const body = z.object({
    label: z.string().min(1),
    priority: z.number().int().default(50),
    category: categorySchema.optional(),
    productId: z.string().optional(),
    minTotal: z.number().min(0).optional(),
    maxTotal: z.number().min(0).optional(),
    depositPercent: z.number().min(0).max(100),
    nonRefundable: z.boolean().default(false)
  }).parse(req.body);
  res.status(201).json({ rule: createDepositRule(body) });
});
router.patch("/catalog/deposit-rules/:id", requireAccess("catalog_pricing"), (req, res) => {
  const body = z.object({
    label: z.string().min(1).optional(),
    priority: z.number().int().optional(),
    category: categorySchema.nullable().optional(),
    productId: z.string().nullable().optional(),
    minTotal: z.number().min(0).nullable().optional(),
    maxTotal: z.number().min(0).nullable().optional(),
    depositPercent: z.number().min(0).max(100).optional(),
    nonRefundable: z.boolean().optional()
  }).parse(req.body);
  const normalized = Object.fromEntries(Object.entries(body).map(([key, value]) => [key, value === null ? undefined : value]));
  res.json({ rule: updateDepositRule(routeParam(req, "id"), normalized) });
});
router.delete("/catalog/deposit-rules/:id", requireAccess("catalog_pricing"), (req, res) => {
  deleteDepositRule(routeParam(req, "id"));
  res.status(204).send();
});
router.get("/catalog/discount-rules", (_req, res) => res.json({ rules: state.discountRules }));
router.post("/catalog/discount-rules", requireAccess("catalog_pricing"), (req, res) => {
  const body = z.object({
    label: z.string().min(1),
    priority: z.number().int().default(50),
    category: categorySchema.optional(),
    productId: z.string().optional(),
    minQuantity: z.number().int().positive().optional(),
    minTotal: z.number().positive().optional(),
    discountPercent: z.number().min(0).max(100),
    active: z.boolean().default(true)
  }).parse(req.body);
  res.status(201).json({ rule: createDiscountRule(body) });
});
router.patch("/catalog/discount-rules/:id", requireAccess("catalog_pricing"), (req, res) => {
  const body = z.object({
    label: z.string().min(1).optional(),
    priority: z.number().int().optional(),
    category: categorySchema.nullable().optional(),
    productId: z.string().nullable().optional(),
    minQuantity: z.number().int().positive().nullable().optional(),
    minTotal: z.number().positive().nullable().optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    active: z.boolean().optional()
  }).parse(req.body);
  const normalized = Object.fromEntries(Object.entries(body).map(([key, value]) => [key, value === null ? undefined : value]));
  res.json({ rule: updateDiscountRule(routeParam(req, "id"), normalized) });
});
router.delete("/catalog/discount-rules/:id", requireAccess("catalog_pricing"), (req, res) => {
  deleteDiscountRule(routeParam(req, "id"));
  res.status(204).send();
});

router.get("/customers", (_req, res) => res.json({ customers: state.customers }));
router.post("/customers", requireAccess("crm"), (req, res) => {
  const body = customerSchema.parse(req.body);
  res.status(201).json({ customer: createCustomer(body) });
});
router.get("/customers/:id", (req, res) => {
  const customer = state.customers.find((item) => item.id === routeParam(req, "id"));
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  return res.json({ customer, orders: state.orders.filter((order) => order.customer.id === customer.id) });
});
router.patch("/customers/:id", requireAccess("crm"), (req, res) => {
  const body = customerSchema.partial().parse(req.body);
  res.json({ customer: updateCustomer(routeParam(req, "id"), compactPatch(body) as Parameters<typeof updateCustomer>[1]) });
});
router.delete("/customers/:id", requireAccess("crm"), (req, res) => {
  deleteCustomer(routeParam(req, "id"));
  res.status(204).send();
});

router.get("/orders", (_req, res) => res.json({ orders: state.orders }));
router.post("/orders", (req, res) => {
  const parsed = createOrderSchema.parse(req.body);
  const order = createOrder(parsed);
  res.status(201).json({ order, counterTicket: findCounterTicket(order.id) });
});
router.get("/orders/:id", (req, res) => res.json({ order: findOrder(routeParam(req, "id")) }));
router.get("/orders/lookup/:reference", (req, res) => res.json({ order: findOrder(routeParam(req, "reference")) }));
router.patch("/orders/:id", requireAccess("production"), (req, res) => {
  const body = z.object({
    status: z.enum(ORDER_STATUSES).optional(),
    paymentStatus: z.enum(["unpaid", "deposit_due", "deposit_paid", "paid", "refunded", "failed"]).optional(),
    rush: z.boolean().optional(),
    staffAssigneeId: z.string().nullable().optional(),
    dueAt: z.string().optional(),
    internalNotes: z.array(z.string()).optional()
  }).parse(req.body);
  res.json({ order: updateOrder(routeParam(req, "id"), compactPatch(Object.fromEntries(Object.entries(body).map(([key, value]) => [key, value === null ? undefined : value])))) });
});
router.delete("/orders/:id", requireAccess("production"), (req, res) => {
  deleteOrder(routeParam(req, "id"));
  res.status(204).send();
});
router.post("/orders/:id/status", requireAccess("production"), (req, res) => {
  const status = z.object({ status: z.string() }).parse(req.body).status as OrderStatus;
  res.json({ order: transitionOrder(routeParam(req, "id"), status) });
});

// Email a customer their invoice (or quotation) through the owner's configured Gmail account.
router.post("/orders/:id/send-invoice", requireAccess("pos"), async (req, res, next) => {
  try {
    const body = z.object({
      kind: z.enum(["invoice", "quotation"]).default("invoice"),
      to: z.string().email().optional(),
      message: z.string().optional()
    }).parse(req.body);

    const order = findOrder(routeParam(req, "id"));
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (!emailIsConfigured(state.emailSettings)) {
      return res.status(409).json({ error: "Email is not set up yet. Add your Gmail address and app password under Settings → Email." });
    }

    const recipient = (body.to ?? order.customer.email ?? "").trim();
    if (!recipient) {
      return res.status(422).json({ error: "This customer has no email address. Add one to the customer or pass a recipient." });
    }

    const money = (value: number) => `R${value.toFixed(2)}`;
    const isQuote = body.kind === "quotation";
    const docLabel = isQuote ? "Quotation" : "Invoice";
    const docNumber = `${isQuote ? "QUO" : "INV"}-${order.orderNumber.replace("#", "")}`;
    const link = `${config.publicWebUrl}/${isQuote ? "quote" : "invoice"}/${order.id}`;
    const bank = state.bankingDetails;
    const bankLines = bank.accountNumber
      ? [
          "",
          "Banking details (EFT):",
          bank.bankName ? `  Bank: ${bank.bankName}` : "",
          bank.accountName ? `  Account name: ${bank.accountName}` : "",
          `  Account number: ${bank.accountNumber}`,
          bank.branchCode ? `  Branch code: ${bank.branchCode}` : "",
          bank.accountType ? `  Account type: ${bank.accountType}` : "",
          bank.paymentReference ? `  ${bank.paymentReference}` : ""
        ].filter(Boolean)
      : [];

    const lines = [
      `Good day ${order.customer.name},`,
      "",
      body.message?.trim() || `Please find your ${docLabel.toLowerCase()} ${docNumber} from Finesse Fashion Design Enterprise below.`,
      "",
      `${docLabel} no: ${docNumber}`,
      `Order: ${order.orderNumber}`,
      `Total: ${money(order.total)}`,
      isQuote ? `Deposit to confirm: ${money(order.requiredDeposit)}` : `Balance due: ${money(order.balanceDue)}`,
      "",
      `View / print your ${docLabel.toLowerCase()}: ${link}`,
      ...bankLines,
      "",
      "Thank you for your business.",
      state.emailSettings.fromName || "Finesse Fashion Design Enterprise"
    ];
    const text = lines.join("\n");

    const result = await sendEmail(state.emailSettings, {
      to: recipient,
      subject: `${docLabel} ${docNumber} — Finesse Fashion Design Enterprise`,
      text
    });

    queueNotification({
      event: isQuote ? "quotation_sent" : "invoice_sent",
      channel: "email",
      recipient,
      orderId: order.id,
      customerId: order.customer.id,
      subject: `${docLabel} ${docNumber}`,
      message: `${docLabel} emailed to ${recipient}`
    });

    return res.json({ ok: true, to: recipient, messageId: result.messageId });
  } catch (error) {
    if (error instanceof EmailNotConfiguredError) {
      return res.status(409).json({ error: error.message });
    }
    // A delivery failure (wrong app password, Gmail blocked, network) shouldn't 500 — give an actionable message.
    const detail = error instanceof Error ? error.message : "Unknown error";
    return res.status(502).json({ error: `Email could not be sent. Check the Gmail address and app password in Settings. (${detail})` });
  }
});

router.get("/counter/queue", (_req, res) => res.json({ tickets: getCounterQueue() }));
router.post("/counter/queue/:orderId/acknowledge", requireAccess("pos"), (req, res) => {
  const body = z.object({ staffName: z.string().min(1).default("Counter staff") }).parse(req.body);
  res.json({ ticket: acknowledgeCounterTicket(routeParam(req, "orderId"), body.staffName) });
});
router.post("/counter/queue/:orderId/resolve", requireAccess("pos"), (req, res) => {
  res.json({ ticket: resolveCounterTicket(routeParam(req, "orderId")) });
});

router.post("/artwork/:orderId", async (req, res, next) => {
  try {
    const body = z.object({
      fileName: z.string(),
      mimeType: z.string(),
      uploadedBy: z.enum(["customer", "staff"]),
      fileBase64: z.string().optional(),
      widthPx: z.number().optional(),
      heightPx: z.number().optional(),
      dpi: z.number().optional()
    }).parse(req.body);
    const order = findOrder(routeParam(req, "orderId"));
    const storagePath = `artwork/${order.orderNumber.replace("#", "")}/${Date.now()}-${body.fileName}`;
    const stored = await saveArtworkObject({ storagePath, mimeType: body.mimeType, base64: body.fileBase64 });
    const artwork = attachArtwork(routeParam(req, "orderId"), { ...body, storagePath: stored.storagePath });
    res.status(201).json({ artwork, order: findOrder(routeParam(req, "orderId")), storage: stored });
  } catch (error) {
    next(error);
  }
});

router.post("/proofs/:orderId/send", requireAccess("production"), (req, res) => {
  res.json(sendProof(routeParam(req, "orderId")));
});

router.post("/proofs/:orderId/approve", (req, res) => {
  res.json({ order: approveProof(routeParam(req, "orderId")) });
});

router.post("/payments/:orderId", requireAccess("pos"), (req, res) => {
  const body = z.object({
    method: z.string(),
    amount: z.number().positive(),
    providerReference: z.string().optional()
  }).parse(req.body);
  res.status(201).json({ payment: recordPayment(routeParam(req, "orderId"), body.method as PaymentMethod, body.amount, body.providerReference), order: findOrder(routeParam(req, "orderId")) });
});

router.post("/payments/:orderId/receipt", requireAccess("pos"), (req, res) => {
  const order = findOrder(routeParam(req, "orderId"));
  const body = z.object({ channel: z.enum(["sms", "email", "in_app"]).default("sms") }).parse(req.body);
  const recipient = body.channel === "email" ? order.customer.email ?? order.customer.mobile : order.customer.mobile;
  queueNotification({
    event: "payment_received",
    orderId: order.id,
    customerId: order.customer.id,
    channel: body.channel,
    recipient,
    subject: `Receipt for ${order.orderNumber}`,
    message: `Receipt for ${order.orderNumber}: total R${order.total.toFixed(2)}, paid R${(order.total - order.balanceDue).toFixed(2)}, balance R${order.balanceDue.toFixed(2)}.`
  });
  res.json({ sent: true, order });
});

router.post("/payments/payfast/checkout", (req, res) => {
  const body = z.object({ orderId: z.string() }).parse(req.body);
  const order = findOrder(body.orderId);
  res.json(createPayFastCheckout(order));
});

router.post("/payments/yoco/checkout", async (req, res, next) => {
  try {
    const body = z.object({ orderId: z.string() }).parse(req.body);
    const order = findOrder(body.orderId);
    res.json(await createYocoCheckout(order));
  } catch (error) {
    next(error);
  }
});
// Legacy in-store terminal helper (kept for the paired card machine flow).
router.post("/payments/yoco/intent", (req, res) => {
  const body = z.object({ orderId: z.string(), amount: z.number().positive() }).parse(req.body);
  const order = findOrder(body.orderId);
  res.json({
    provider: "yoco",
    mode: "sdk-ready",
    amount: body.amount,
    orderNumber: order.orderNumber,
    terminalInstruction: "Send this amount to the paired Yoco card machine when merchant credentials are configured."
  });
});

router.get("/production/board", (_req, res) => {
  res.json({
    columns: workflowColumns.map((column) => ({
      ...column,
      // Online orders awaiting their deposit are kept off the production floor.
      orders: state.orders.filter((order) => order.status === column.status && !order.awaitingPayment)
    }))
  });
});
router.get("/production/batches", (_req, res) => res.json({ batches: groupProductionBatches() }));

router.get("/inventory", (_req, res) => {
  res.json({
    items: state.inventory,
    lowStock: state.inventory.filter((item) => item.quantityOnHand <= item.reorderPoint)
  });
});
router.get("/inventory/movements", requireAccess("inventory"), (req, res) => {
  const itemId = typeof req.query.itemId === "string" ? req.query.itemId : undefined;
  res.json({ movements: listStockMovements(itemId) });
});
router.post("/inventory", requireAccess("inventory"), (req, res) => {
  const body = z.object({
    sku: z.string().min(1),
    name: z.string().min(1),
    tags: z.array(z.string()).default([]),
    quantityOnHand: z.number().min(0),
    reorderPoint: z.number().min(0)
  }).parse(req.body);
  res.status(201).json({ item: createInventoryItem(body, stockActor(req)) });
});
const stockMoveSchema = z.object({ quantity: z.number().positive(), note: z.string().optional() });
router.post("/inventory/:id/receive", requireAccess("inventory"), (req, res) => {
  const body = stockMoveSchema.parse(req.body);
  res.json({ item: receiveStock(routeParam(req, "id"), body.quantity, body.note, stockActor(req)) });
});
router.post("/inventory/:id/issue", requireAccess("inventory"), (req, res) => {
  const body = stockMoveSchema.parse(req.body);
  res.json({ item: issueStock(routeParam(req, "id"), body.quantity, body.note, stockActor(req)) });
});
router.post("/inventory/:id/recount", requireAccess("inventory"), (req, res) => {
  const body = z.object({ quantity: z.number().min(0), note: z.string().optional() }).parse(req.body);
  res.json({ item: recountStock(routeParam(req, "id"), body.quantity, body.note, stockActor(req)) });
});
router.patch("/inventory/:id", requireAccess("inventory"), (req, res) => {
  const body = z.object({
    sku: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
    quantityOnHand: z.number().min(0).optional(),
    reorderPoint: z.number().min(0).optional()
  }).parse(req.body);
  res.json({ item: updateInventoryItem(routeParam(req, "id"), compactPatch(body) as Parameters<typeof updateInventoryItem>[1], stockActor(req)) });
});
router.delete("/inventory/:id", requireAccess("inventory"), (req, res) => {
  deleteInventoryItem(routeParam(req, "id"));
  res.status(204).send();
});

router.get("/notifications", (_req, res) => res.json({ notifications: state.notifications }));
router.post("/notifications/test", (req, res) => {
  queueNotification(req.body);
  res.status(201).json({ queued: true, notification: req.body });
});

router.get("/reports/summary", (_req, res) => res.json({ metrics: orderMetrics() }));
router.get("/admin/dashboard", (_req, res) => {
  res.json({
    metrics: orderMetrics(),
    catalogCount: state.catalog.length,
    staffRoles: STAFF_ROLES,
    staffCount: state.staff.length
  });
});

router.post("/webhooks/payfast", (req, res) => {
  const orderReference = String(req.body.m_payment_id ?? req.body.item_name ?? "");
  const amount = Number(req.body.amount_gross ?? req.body.amount ?? 0);
  const order = findOrder(orderReference);
  recordPayment(order.id, "payfast", amount || order.requiredDeposit || order.total, req.body.pf_payment_id);
  res.status(200).send("OK");
});

router.post("/webhooks/yoco", (req, res) => {
  const rawBody = (req as typeof req & { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {});
  const headers: Record<string, string | undefined> = {
    "webhook-id": req.header("webhook-id"),
    "webhook-timestamp": req.header("webhook-timestamp"),
    "webhook-signature": req.header("webhook-signature")
  };
  if (!verifyYocoWebhook(headers, rawBody)) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }
  // Only act on successful payments; ignore other event types.
  const type = String(req.body.type ?? "");
  if (type && type !== "payment.succeeded") {
    return res.status(200).json({ received: true, ignored: type });
  }
  const payload = req.body.payload ?? req.body;
  const orderId = String(payload.metadata?.orderId ?? req.body.metadata?.orderId ?? payload.orderId ?? "");
  const amountCents = Number(payload.amount ?? req.body.amount ?? 0);
  const amount = amountCents > 0 ? amountCents / 100 : Number(payload.amountInRands ?? 0);
  if (!orderId) return res.status(400).json({ error: "Missing order reference" });
  recordPayment(orderId, "card_yoco", amount, String(payload.id ?? req.body.id ?? ""));
  return res.status(200).json({ received: true });
});

export { router };

function compactPatch<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function routeParam(req: { params: Record<string, string | undefined> }, name: string): string {
  const value = req.params[name];
  if (!value) throw Object.assign(new Error(`Missing route parameter: ${name}`), { statusCode: 400 });
  return value;
}

function stockActor(req: { staff?: StaffMember }): { id?: string | undefined; name?: string | undefined } {
  return { id: req.staff?.id, name: req.staff?.name };
}
