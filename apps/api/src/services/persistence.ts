import {
  catalog,
  defaultAccessForRoles,
  defaultDepositRules,
  defaultDiscountRules,
  defaultKioskCategories
} from "@printflow/shared";
import type {
  ActivityEvent,
  ArtworkFile,
  CatalogProduct,
  CounterQueueTicket,
  Customer,
  DepositRule,
  KioskCategory,
  Order,
  OrderItem,
  Payment,
  Proof,
  StaffMember
} from "@printflow/shared";
import type { DiscountRule } from "@printflow/shared";
import type { AppState, InventoryItem, StaffRecord } from "../store.js";
import { hasSupabaseAdmin, supabaseRest } from "./supabase.js";

type Row = Record<string, unknown>;

export function remotePersistenceEnabled(): boolean {
  return hasSupabaseAdmin();
}

export async function loadSupabaseState(): Promise<Partial<AppState> | null> {
  if (!remotePersistenceEnabled()) return null;

  const [
    customers,
    products,
    depositRules,
    discountRules,
    orders,
    orderItems,
    artworkFiles,
    proofs,
    payments,
    inventory,
    notifications,
    staff,
    counterQueue,
    kioskCategories
  ] = await Promise.all([
    supabaseRest<Row[]>("customers?select=*"),
    supabaseRest<Row[]>("catalog_products?select=*"),
    supabaseRest<Row[]>("deposit_rules?select=*"),
    supabaseRest<Row[]>("discount_rules?select=*"),
    supabaseRest<Row[]>("orders?select=*"),
    supabaseRest<Row[]>("order_items?select=*"),
    supabaseRest<Row[]>("artwork_files?select=*"),
    supabaseRest<Row[]>("proofs?select=*"),
    supabaseRest<Row[]>("payments?select=*"),
    supabaseRest<Row[]>("inventory_items?select=*"),
    supabaseRest<Row[]>("notification_events?select=*"),
    supabaseRest<Row[]>("profiles?select=*"),
    supabaseRest<Row[]>("counter_queue_tickets?select=*"),
    supabaseRest<Row[]>("kiosk_categories?select=*&order=position").catch(() => [] as Row[])
  ]);

  const customerModels = customers.map(rowToCustomer);
  const customerById = new Map(customerModels.map((customer) => [customer.id, customer]));
  const itemsByOrder = groupBy(orderItems.map(rowToOrderItem), "orderId");
  const artworkByOrder = groupBy(artworkFiles.map(rowToArtwork), "orderId");
  const proofsByOrder = groupBy(proofs.map(rowToProof), "orderId");
  const paymentsByOrder = groupBy(payments.map(rowToPayment), "orderId");
  const orderModels = orders
    .map((row) => rowToOrder(row, customerById, itemsByOrder, artworkByOrder, proofsByOrder, paymentsByOrder))
    .filter((order): order is Order => Boolean(order))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    customers: customerModels,
    catalog: products.length ? products.map(rowToCatalogProduct) : catalog.map((product) => ({ ...product, enabled: product.enabled ?? true })),
    depositRules: depositRules.length ? depositRules.map(rowToDepositRule) : defaultDepositRules,
    discountRules: discountRules.length ? discountRules.map(rowToDiscountRule) : defaultDiscountRules,
    orders: orderModels,
    inventory: inventory.map(rowToInventoryItem),
    notifications: notifications.map(rowToNotification),
    staff: staff.map(rowToStaff),
    counterQueue: counterQueue.map(rowToCounterTicket),
    kioskCategories: kioskCategories.length ? kioskCategories.map(rowToKioskCategory) : defaultKioskCategories
  };
}

function rowToKioskCategory(row: Row): KioskCategory {
  return { id: string(row.id), label: string(row.label), description: string(row.description) };
}

export async function persistSupabaseState(state: AppState): Promise<void> {
  if (!remotePersistenceEnabled()) return;
  await Promise.all([
    syncTable("catalog_products", state.catalog.map(catalogProductToRow)),
    syncTable("deposit_rules", state.depositRules.map(depositRuleToRow)),
    syncTable("discount_rules", state.discountRules.map(discountRuleToRow)),
    syncTable("customers", state.customers.map(customerToRow)),
    syncTable("inventory_items", state.inventory.map(inventoryItemToRow)),
    syncTable("counter_queue_tickets", state.counterQueue.map(counterTicketToRow)),
    syncTable("profiles", state.staff.map(staffToRow)),
    syncTable("kiosk_categories", state.kioskCategories.map((category, index) => ({ id: category.id, label: category.label, description: category.description, position: index })))
  ]);
  await Promise.all([
    syncTable("orders", state.orders.map(orderToRow)),
    syncTable("order_items", state.orders.flatMap((order) => order.items.map((item) => orderItemToRow(order.id, item)))),
    syncTable("artwork_files", state.orders.flatMap((order) => order.artwork.map(artworkToRow))),
    syncTable("proofs", state.orders.flatMap((order) => order.proofs.map(proofToRow))),
    syncTable("payments", state.orders.flatMap((order) => order.payments.map(paymentToRow))),
    syncTable("notification_events", state.notifications.map(notificationToRow))
  ]);
}

async function syncTable(table: string, rows: Row[]) {
  const ids = rows.map((row) => String(row.id)).filter(Boolean);
  const existing = await supabaseRest<Array<{ id: string }>>(`${table}?select=id`);
  const staleIds = existing.map((row) => row.id).filter((id) => !ids.includes(id));
  if (staleIds.length) {
    await supabaseRest(`${table}?id=in.(${staleIds.map(encodeURIComponent).join(",")})`, { method: "DELETE" });
  }
  if (rows.length) {
    await supabaseRest(table, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(rows)
    });
  }
}

function customerToRow(customer: Customer): Row {
  return { id: customer.id, name: customer.name, mobile: customer.mobile, email: customer.email ?? null, created_at: customer.createdAt };
}

function rowToCustomer(row: Row): Customer {
  return { id: string(row.id), name: string(row.name), mobile: string(row.mobile), email: optionalString(row.email), createdAt: string(row.created_at) };
}

function catalogProductToRow(product: CatalogProduct): Row {
  return {
    id: product.id,
    category: product.category,
    department: product.department,
    name: product.name,
    description: product.description,
    base_price: product.basePrice,
    unit_label: product.unitLabel,
    requires_artwork: product.requiresArtwork,
    proof_recommended: product.proofRecommended,
    inventory_tags: product.inventoryTags,
    options: product.options,
    active: product.enabled ?? true
  };
}

function rowToCatalogProduct(row: Row): CatalogProduct {
  return {
    id: string(row.id),
    category: string(row.category) as CatalogProduct["category"],
    department: string(row.department) as CatalogProduct["department"],
    name: string(row.name),
    description: string(row.description),
    basePrice: number(row.base_price),
    unitLabel: string(row.unit_label),
    options: object(row.options) as CatalogProduct["options"],
    requiresArtwork: boolean(row.requires_artwork),
    proofRecommended: boolean(row.proof_recommended),
    inventoryTags: stringArray(row.inventory_tags),
    enabled: boolean(row.active)
  };
}

function depositRuleToRow(rule: DepositRule): Row {
  return { id: rule.id, label: rule.label, priority: rule.priority, category: rule.category ?? null, product_id: rule.productId ?? null, min_total: rule.minTotal ?? null, max_total: rule.maxTotal ?? null, deposit_percent: rule.depositPercent, non_refundable: rule.nonRefundable, active: true };
}

function rowToDepositRule(row: Row): DepositRule {
  return { id: string(row.id), label: string(row.label), priority: number(row.priority), category: optionalString(row.category) as DepositRule["category"], productId: optionalString(row.product_id), minTotal: optionalNumber(row.min_total), maxTotal: optionalNumber(row.max_total), depositPercent: number(row.deposit_percent), nonRefundable: boolean(row.non_refundable) };
}

function discountRuleToRow(rule: DiscountRule): Row {
  return { id: rule.id, label: rule.label, priority: rule.priority, category: rule.category ?? null, product_id: rule.productId ?? null, min_quantity: rule.minQuantity ?? null, min_total: rule.minTotal ?? null, discount_percent: rule.discountPercent, active: rule.active };
}

function rowToDiscountRule(row: Row): DiscountRule {
  return { id: string(row.id), label: string(row.label), priority: number(row.priority), category: optionalString(row.category) as DiscountRule["category"], productId: optionalString(row.product_id), minQuantity: optionalNumber(row.min_quantity), minTotal: optionalNumber(row.min_total), discountPercent: number(row.discount_percent), active: boolean(row.active) };
}

function orderToRow(order: Order): Row {
  return { id: order.id, order_number: order.orderNumber, source: order.source, status: order.status, payment_status: order.paymentStatus, customer_id: order.customer.id, subtotal: order.subtotal, discount_total: order.discountTotal, total: order.total, required_deposit: order.requiredDeposit, balance_due: order.balanceDue, queue_name: order.queueName, staff_assignee_id: order.staffAssigneeId ?? null, rush: order.rush, internal_notes: order.internalNotes, activity_log: order.activityLog, created_at: order.createdAt, updated_at: order.updatedAt };
}

function rowToOrder(row: Row, customerById: Map<string, Customer>, itemsByOrder: Map<string, OrderItem[]>, artworkByOrder: Map<string, ArtworkFile[]>, proofsByOrder: Map<string, Proof[]>, paymentsByOrder: Map<string, Payment[]>): Order | null {
  const id = string(row.id);
  const customer = customerById.get(string(row.customer_id));
  if (!customer) return null;
  return {
    id,
    orderNumber: string(row.order_number),
    source: string(row.source) as Order["source"],
    status: string(row.status) as Order["status"],
    paymentStatus: string(row.payment_status) as Order["paymentStatus"],
    customer,
    items: itemsByOrder.get(id) ?? [],
    artwork: artworkByOrder.get(id) ?? [],
    proofs: proofsByOrder.get(id) ?? [],
    payments: paymentsByOrder.get(id) ?? [],
    subtotal: number(row.subtotal),
    discountTotal: number(row.discount_total),
    total: number(row.total),
    requiredDeposit: number(row.required_deposit),
    balanceDue: number(row.balance_due),
    queueName: string(row.queue_name) as Order["queueName"],
    staffAssigneeId: optionalString(row.staff_assignee_id),
    rush: boolean(row.rush),
    internalNotes: stringArray(row.internal_notes),
    activityLog: array(row.activity_log) as ActivityEvent[],
    createdAt: string(row.created_at),
    updatedAt: string(row.updated_at)
  };
}

function orderItemToRow(orderId: string, item: OrderItem): Row {
  return { id: item.id, order_id: orderId, product_id: item.productId, product_name: item.productName, category: item.category, department: item.department, quantity: item.quantity, selected_options: item.selectedOptions, special_instructions: item.specialInstructions ?? null, unit_price: item.unitPrice, line_total: item.lineTotal, batch_key: item.batchKey };
}

function rowToOrderItem(row: Row): OrderItem & { orderId: string } {
  return { id: string(row.id), orderId: string(row.order_id), productId: string(row.product_id), productName: string(row.product_name), category: string(row.category) as OrderItem["category"], department: string(row.department) as OrderItem["department"], quantity: number(row.quantity), selectedOptions: object(row.selected_options) as Record<string, string>, specialInstructions: optionalString(row.special_instructions), unitPrice: number(row.unit_price), lineTotal: number(row.line_total), batchKey: string(row.batch_key) };
}

function artworkToRow(file: ArtworkFile): Row {
  return { id: file.id, order_id: file.orderId, file_name: file.fileName, mime_type: file.mimeType, storage_path: file.storagePath, uploaded_by: file.uploadedBy, width_px: file.widthPx ?? null, height_px: file.heightPx ?? null, dpi: file.dpi ?? null, preflight_warnings: file.preflightWarnings, created_at: file.uploadedAt };
}

function rowToArtwork(row: Row): ArtworkFile & { orderId: string } {
  return { id: string(row.id), orderId: string(row.order_id), fileName: string(row.file_name), mimeType: string(row.mime_type), storagePath: string(row.storage_path), uploadedBy: string(row.uploaded_by) as ArtworkFile["uploadedBy"], uploadedAt: string(row.created_at), widthPx: optionalNumber(row.width_px), heightPx: optionalNumber(row.height_px), dpi: optionalNumber(row.dpi), preflightWarnings: stringArray(row.preflight_warnings) };
}

function proofToRow(proof: Proof): Row {
  return { id: proof.id, order_id: proof.orderId, status: proof.status, preview_path: proof.previewUrl ?? null, customer_comments: proof.customerComments ?? null, sent_at: proof.sentAt ?? null, approved_at: proof.approvedAt ?? null };
}

function rowToProof(row: Row): Proof & { orderId: string } {
  return { id: string(row.id), orderId: string(row.order_id), status: string(row.status) as Proof["status"], previewUrl: optionalString(row.preview_path), customerComments: optionalString(row.customer_comments), sentAt: optionalString(row.sent_at), approvedAt: optionalString(row.approved_at) };
}

function paymentToRow(payment: Payment): Row {
  return { id: payment.id, order_id: payment.orderId, method: payment.method, status: payment.status, amount: payment.amount, provider_reference: payment.providerReference ?? null, raw_payload: {}, created_at: payment.createdAt };
}

function rowToPayment(row: Row): Payment & { orderId: string } {
  return { id: string(row.id), orderId: string(row.order_id), method: string(row.method) as Payment["method"], status: string(row.status) as Payment["status"], amount: number(row.amount), providerReference: optionalString(row.provider_reference), createdAt: string(row.created_at) };
}

function inventoryItemToRow(item: InventoryItem): Row {
  return { id: item.id, sku: item.sku, name: item.name, tags: item.tags, quantity_on_hand: item.quantityOnHand, reorder_point: item.reorderPoint };
}

function rowToInventoryItem(row: Row): InventoryItem {
  return { id: string(row.id), sku: string(row.sku), name: string(row.name), tags: stringArray(row.tags), quantityOnHand: number(row.quantity_on_hand), reorderPoint: number(row.reorder_point) };
}

function notificationToRow(notification: AppState["notifications"][number]): Row {
  return { id: notification.metadata?.id ?? `${notification.event}-${notification.orderId ?? "general"}-${Date.now()}-${Math.random().toString(16).slice(2)}`, order_id: notification.orderId ?? null, customer_id: notification.customerId ?? null, channel: notification.channel, event: notification.event, recipient: notification.recipient, subject: notification.subject ?? null, message: notification.message, status: "queued", metadata: notification.metadata ?? {} };
}

function rowToNotification(row: Row): AppState["notifications"][number] {
  return { event: string(row.event) as AppState["notifications"][number]["event"], orderId: optionalString(row.order_id), customerId: optionalString(row.customer_id), channel: string(row.channel) as AppState["notifications"][number]["channel"], recipient: string(row.recipient), subject: optionalString(row.subject), message: string(row.message), metadata: object(row.metadata) };
}

function staffToRow(member: StaffRecord): Row {
  return { id: member.id, full_name: member.name, email: member.email, mobile: member.mobile ?? null, role: member.role, roles: member.roles, access_areas: member.accessAreas.length ? member.accessAreas : defaultAccessForRoles(member.roles), active: member.active, password_hash: member.passwordHash ?? null, created_at: member.createdAt };
}

function rowToStaff(row: Row): StaffRecord {
  const roles = stringArray(row.roles) as StaffMember["roles"];
  const role = string(row.role) as StaffMember["role"];
  return { id: string(row.id), name: string(row.full_name), email: string(row.email), mobile: optionalString(row.mobile), role, roles: roles.length ? roles : [role], active: boolean(row.active), accessAreas: stringArray(row.access_areas) as StaffMember["accessAreas"], passwordHash: optionalString(row.password_hash), createdAt: string(row.created_at) };
}

function counterTicketToRow(ticket: CounterQueueTicket): Row {
  return { id: ticket.id, order_id: ticket.orderId, order_number: ticket.orderNumber, customer_name: ticket.customerName, customer_mobile: ticket.customerMobile, department: ticket.department, status: ticket.status, acknowledged_at: ticket.acknowledgedAt ?? null, acknowledged_by: ticket.acknowledgedBy ?? null, escalated_at: ticket.escalatedAt ?? null, resolved_at: ticket.resolvedAt ?? null, created_at: ticket.createdAt };
}

function rowToCounterTicket(row: Row): CounterQueueTicket {
  return { id: string(row.id), orderId: string(row.order_id), orderNumber: string(row.order_number), customerName: string(row.customer_name), customerMobile: string(row.customer_mobile), department: string(row.department) as CounterQueueTicket["department"], status: string(row.status) as CounterQueueTicket["status"], acknowledgedAt: optionalString(row.acknowledged_at), acknowledgedBy: optionalString(row.acknowledged_by), escalatedAt: optionalString(row.escalated_at), resolvedAt: optionalString(row.resolved_at), createdAt: string(row.created_at), position: 0 };
}

function groupBy<T extends { orderId: string }>(items: T[], key: "orderId"): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const value = item[key];
    groups.set(value, [...(groups.get(value) ?? []), item]);
  }
  return groups;
}

function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length ? value : undefined;
}

function number(value: unknown): number {
  return Number(value ?? 0);
}

function optionalNumber(value: unknown): number | undefined {
  return value === null || value === undefined ? undefined : Number(value);
}

function boolean(value: unknown): boolean {
  return Boolean(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
