import {
  calculateRequiredDeposit,
  catalog,
  customerOrderCreated,
  defaultBankingDetails,
  defaultEmailSettings,
  defaultDepositRules,
  defaultDiscountRules,
  defaultKioskCategories,
  defaultAccessForRole,
  defaultAccessForRoles,
  preflightArtwork,
  priceQuote,
  staffAlert,
  statusChanged
} from "@printflow/shared";
import type {
  ActivityEvent,
  ArtworkFile,
  BankingDetails,
  EmailSettings,
  CatalogProduct,
  CounterQueueTicket,
  Customer,
  DepositRule,
  KioskCategory,
  NotificationPayload,
  Order,
  OrderStatus,
  Payment,
  PaymentMethod,
  QuoteInput,
  StaffMember
} from "@printflow/shared";
import type { DiscountRule } from "@printflow/shared";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { config } from "./config.js";
import { loadSupabaseState, persistSupabaseState, remotePersistenceEnabled } from "./services/persistence.js";
import { hashPassword } from "./services/app-auth.js";

export interface CreateOrderInput {
  source: Order["source"];
  customer: { name: string; mobile: string; email?: string | undefined };
  items: QuoteInput[];
  staffAssigneeId?: string | undefined;
  rush?: boolean | undefined;
}

export interface AppState {
  customers: Customer[];
  orders: Order[];
  notifications: NotificationPayload[];
  inventory: InventoryItem[];
  catalog: CatalogProduct[];
  depositRules: DepositRule[];
  discountRules: DiscountRule[];
  staff: StaffRecord[];
  counterQueue: CounterQueueTicket[];
  stockMovements: StockMovement[];
  kioskCategories: KioskCategory[];
  bankingDetails: BankingDetails;
  emailSettings: EmailCredentials;
}

// EmailSettings is the public (sanitized) shape; the server additionally keeps the
// Gmail app password, which is never sent back to any client.
export interface EmailCredentials extends EmailSettings {
  password?: string | undefined;
}

export interface StaffRecord extends StaffMember {
  passwordHash?: string | undefined;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  tags: string[];
  quantityOnHand: number;
  reorderPoint: number;
}

export type StockMovementType = "opening" | "receive" | "issue" | "consume" | "recount";

export interface StockMovement {
  id: string;
  itemId: string;
  sku: string;
  itemName: string;
  type: StockMovementType;
  delta: number; // positive = stock in, negative = stock out
  quantityAfter: number;
  note?: string | undefined;
  orderId?: string | undefined;
  actorId?: string | undefined;
  actorName: string;
  createdAt: string;
}

export interface StockActor {
  id?: string | undefined;
  name?: string | undefined;
}

const now = () => new Date().toISOString();
// Honor an absolute PRINTFLOW_DATA_DIR (e.g. a Render disk mount at /var/data); otherwise resolve from cwd.
const dataDir = isAbsolute(config.dataDir) ? config.dataDir : join(process.cwd(), config.dataDir);
const dataFile = join(dataDir, "printflow.local.json");
let remoteHydrated = false;

const initialState: AppState = {
  customers: [],
  orders: [],
  notifications: [],
  inventory: [
    { id: "inv-blank-tshirt", sku: "TSHIRT-BLANK", name: "Blank T-Shirts (assorted)", tags: ["blank-shirt"], quantityOnHand: 180, reorderPoint: 40 },
    { id: "inv-blank-golf", sku: "GOLF-BLANK", name: "Blank Golf Shirts", tags: ["blank-golf-shirt"], quantityOnHand: 90, reorderPoint: 25 },
    { id: "inv-blank-hoodie", sku: "HOODIE-BLANK", name: "Blank Hoodies / Sweaters", tags: ["blank-hoodie"], quantityOnHand: 60, reorderPoint: 15 },
    { id: "inv-blank-jacket", sku: "JACKET-BLANK", name: "Blank Jackets", tags: ["blank-jacket"], quantityOnHand: 28, reorderPoint: 10 },
    { id: "inv-blank-tracksuit", sku: "TRACKSUIT-BLANK", name: "Blank Tracksuits", tags: ["blank-tracksuit"], quantityOnHand: 22, reorderPoint: 8 },
    { id: "inv-blank-kit", sku: "KIT-BLANK", name: "Sports Kit Blanks", tags: ["blank-kit"], quantityOnHand: 40, reorderPoint: 12 },
    { id: "inv-blank-dress", sku: "DRESS-BLANK", name: "Dress Blanks", tags: ["blank-dress"], quantityOnHand: 18, reorderPoint: 6 },
    { id: "inv-blank-hat", sku: "HAT-BUCKET", name: "Bucket Hats", tags: ["blank-hat"], quantityOnHand: 70, reorderPoint: 20 },
    { id: "inv-sublimation-fabric", sku: "SUBLI-FABRIC", name: "Sublimation Fabric (rolls)", tags: ["sublimation-fabric", "fabric"], quantityOnHand: 65, reorderPoint: 20 },
    { id: "inv-chiffon", sku: "CHIFFON", name: "Chiffon Fabric", tags: ["chiffon-fabric"], quantityOnHand: 30, reorderPoint: 10 },
    { id: "inv-transfer-paper", sku: "TRANSFER-PAPER", name: "Transfer Paper", tags: ["transfer-paper"], quantityOnHand: 900, reorderPoint: 200 },
    { id: "inv-sublimation-ink", sku: "SUBLI-INK", name: "Sublimation Ink (sets)", tags: ["ink"], quantityOnHand: 14, reorderPoint: 6 },
    { id: "inv-thread", sku: "EMB-THREAD", name: "Embroidery Thread (cones)", tags: ["thread"], quantityOnHand: 120, reorderPoint: 30 },
    { id: "inv-overalls", sku: "OVERALL-BLANK", name: "Blank Overalls", tags: ["blank-overall"], quantityOnHand: 24, reorderPoint: 8 },
    { id: "inv-umbrella", sku: "UMBRELLA-BLANK", name: "Blank Umbrellas", tags: ["blank-umbrella"], quantityOnHand: 35, reorderPoint: 10 },
    { id: "inv-table-cloth", sku: "TABLECLOTH-FABRIC", name: "Table Cloth Fabric", tags: ["table-cloth-fabric"], quantityOnHand: 26, reorderPoint: 8 },
    { id: "inv-banner-material", sku: "BANNER-MAT", name: "Banner / Flag Material (rolls)", tags: ["banner-material", "flag-material", "fabric-print"], quantityOnHand: 19, reorderPoint: 6 },
    { id: "inv-pullup-cassette", sku: "PULLUP-CASSETTE", name: "Pull-Up Cassettes", tags: ["pullup-cassette"], quantityOnHand: 12, reorderPoint: 5 },
    { id: "inv-x-stand", sku: "X-STAND", name: "X-Banner Stands", tags: ["x-stand"], quantityOnHand: 9, reorderPoint: 4 },
    { id: "inv-flag-pole", sku: "FLAG-POLE", name: "Flag Poles & Bases", tags: ["flag-pole"], quantityOnHand: 7, reorderPoint: 4 },
    { id: "inv-popup-frame", sku: "POPUP-FRAME", name: "Pop-Up Wall Frames (3x3)", tags: ["popup-frame"], quantityOnHand: 1, reorderPoint: 2 },
    { id: "inv-gazebo", sku: "GAZEBO-3X3", name: "Gazebo Frames & Canopies (3x3)", tags: ["gazebo-frame", "gazebo-canopy"], quantityOnHand: 3, reorderPoint: 2 },
    { id: "inv-board-stock", sku: "BOARD-COREX", name: "Corex / Oval Board Stock", tags: ["board-stock"], quantityOnHand: 55, reorderPoint: 15 }
  ],
  catalog: catalog.map((product) => ({ ...product, enabled: product.enabled ?? true })),
  depositRules: defaultDepositRules,
  discountRules: defaultDiscountRules,
  staff: [
    {
      id: "staff-owner",
      name: "Finesse Owner",
      email: "owner@finesse.co.za",
      mobile: "+27787273283",
      role: "owner",
      roles: ["owner"],
      active: true,
      accessAreas: defaultAccessForRoles(["owner"]),
      passwordHash: hashPassword("FinesseOwner!2026"),
      createdAt: now()
    },
    {
      id: "staff-manager",
      name: "Shop Manager",
      email: "manager@finesse.co.za",
      mobile: "+27727271087",
      role: "manager",
      roles: ["manager"],
      active: true,
      accessAreas: defaultAccessForRoles(["manager"]),
      passwordHash: hashPassword("FinesseManager!2026"),
      createdAt: now()
    },
    {
      id: "staff-designer",
      name: "Lead Designer",
      email: "designer@finesse.co.za",
      mobile: "+27780000003",
      role: "designer",
      roles: ["designer"],
      active: true,
      accessAreas: defaultAccessForRoles(["designer"]),
      passwordHash: hashPassword("FinesseDesign!2026"),
      createdAt: now()
    },
    {
      id: "staff-operator",
      name: "Embroidery & Press Operator",
      email: "operator@finesse.co.za",
      mobile: "+27780000004",
      role: "apparel_operator",
      roles: ["apparel_operator"],
      active: true,
      accessAreas: defaultAccessForRoles(["apparel_operator"]),
      passwordHash: hashPassword("FinessePress!2026"),
      createdAt: now()
    },
    {
      id: "staff-cashier",
      name: "Counter Cashier",
      email: "cashier@finesse.co.za",
      mobile: "+27780000005",
      role: "cashier",
      roles: ["cashier"],
      active: true,
      accessAreas: defaultAccessForRoles(["cashier"]),
      passwordHash: hashPassword("FinesseCashier!2026"),
      createdAt: now()
    }
  ],
  counterQueue: [],
  stockMovements: [],
  kioskCategories: defaultKioskCategories,
  bankingDetails: defaultBankingDetails,
  emailSettings: { ...defaultEmailSettings }
};

export const state: AppState = loadState();
seedStarterOrder();
persistState();

export async function hydratePersistentState() {
  if (!remotePersistenceEnabled()) return;
  const remoteState = await loadSupabaseState();
  if (!remoteState) return;
  const staff = remoteState.staff?.length ? remoteState.staff : bootstrapOwnerStaff(state.staff);
  Object.assign(state, {
    ...state,
    ...remoteState,
    catalog: remoteState.catalog?.length ? remoteState.catalog : state.catalog,
    depositRules: remoteState.depositRules?.length ? remoteState.depositRules : state.depositRules,
    discountRules: remoteState.discountRules?.length ? remoteState.discountRules : state.discountRules,
    inventory: remoteState.inventory?.length ? remoteState.inventory : state.inventory,
    kioskCategories: remoteState.kioskCategories?.length ? remoteState.kioskCategories : state.kioskCategories,
    bankingDetails: remoteState.bankingDetails ?? state.bankingDetails,
    emailSettings: remoteState.emailSettings ?? state.emailSettings,
    staff
  });
  remoteHydrated = true;
  // Persist the merged state (seed reference data) back to Supabase, but never let a
  // persistence error crash startup — the API can still serve from in-memory state.
  try {
    await persistSupabaseState(state);
  } catch (error) {
    console.error("Initial Supabase persistence failed (continuing):", error);
  }
}

export function createOrder(input: CreateOrderInput): Order {
  const customer = upsertCustomer(input.customer);
  const quote = priceQuote(input.items, state.discountRules, state.catalog);
  const deposit = calculateRequiredDeposit(quote.total, quote.items, state.depositRules);
  const status: OrderStatus = quote.items.some((item) => item.category !== "quick_sale") ? "awaiting_artwork" : "new";
  // Online orders with a required deposit are held off the production floor until the deposit clears.
  const awaitingPayment = input.source === "online" && deposit.amount > 0;
  const order: Order = {
    id: randomUUID(),
    orderNumber: nextOrderNumber(),
    source: input.source,
    status,
    paymentStatus: deposit.amount > 0 ? "deposit_due" : "unpaid",
    customer,
    items: quote.items,
    artwork: [],
    proofs: quote.items.some((item) => item.category === "canvas_photo" || item.category === "signage" || item.category === "document")
      ? [{ id: randomUUID(), orderId: "pending", status: "draft" }]
      : [],
    payments: [],
    subtotal: quote.subtotal,
    discountTotal: quote.discountTotal,
    total: quote.total,
    requiredDeposit: deposit.amount,
    balanceDue: quote.total,
    queueName: quote.items[0]?.department ?? "front_counter",
    staffAssigneeId: input.staffAssigneeId,
    rush: input.rush ?? false,
    dueAt: estimateDueDate(input.rush ?? false),
    awaitingPayment,
    internalNotes: [],
    activityLog: [activity("system", "order_created", awaitingPayment
      ? `Order created from ${input.source}. Awaiting deposit before production.`
      : `Order created from ${input.source}.`)],
    createdAt: now(),
    updatedAt: now()
  };
  order.proofs = order.proofs.map((proof) => ({ ...proof, orderId: order.id }));
  state.orders.unshift(order);
  enqueue(customerOrderCreated(order, `${config.publicWebUrl}/upload/${order.id}`));
  if (input.source === "kiosk") {
    createCounterQueueTicket(order);
  } else {
    enqueue([staffAlert(`New ${order.queueName} customer waiting - ${order.orderNumber}`, { orderId: order.id })]);
  }
  persistState();
  return order;
}

export function updateOrder(orderId: string, patch: Partial<Pick<Order, "status" | "paymentStatus" | "rush" | "internalNotes" | "staffAssigneeId" | "dueAt">>): Order {
  const order = findOrder(orderId);
  if (patch.status && patch.status !== order.status) order.activityLog.unshift(activity("staff", "status_changed", `Status changed to ${patch.status}.`));
  if (patch.internalNotes) order.activityLog.unshift(activity("staff", "notes_updated", "Internal notes updated."));
  if (patch.dueAt && patch.dueAt !== order.dueAt) order.activityLog.unshift(activity("staff", "due_date_updated", `Due date set to ${new Date(patch.dueAt).toLocaleString("en-ZA")}.`));
  Object.assign(order, patch);
  order.updatedAt = now();
  persistState();
  return order;
}

// Simple turnaround estimate: rush = next day, standard = 3 working days.
function estimateDueDate(rush: boolean): string {
  const created = new Date(now());
  let added = 0;
  const target = rush ? 1 : 3;
  while (added < target) {
    created.setDate(created.getDate() + 1);
    const day = created.getDay();
    if (day !== 0 && day !== 6) added += 1; // skip weekends
  }
  created.setHours(16, 0, 0, 0); // ready by 4pm
  return created.toISOString();
}

export function deleteOrder(orderId: string) {
  const order = findOrder(orderId);
  state.orders = state.orders.filter((item) => item.id !== order.id);
  state.counterQueue = state.counterQueue.filter((ticket) => ticket.orderId !== order.id);
  persistState();
}

export function transitionOrder(orderId: string, status: OrderStatus, actor = "staff"): Order {
  const order = findOrder(orderId);
  order.status = status;
  order.updatedAt = now();
  order.activityLog.unshift(activity(actor as ActivityEvent["actor"], "status_changed", `Status changed to ${status}.`));
  if (status === "completed") decrementInventory(order);
  enqueue(statusChanged(order));
  persistState();
  return order;
}

export function attachArtwork(orderId: string, input: { fileName: string; mimeType: string; uploadedBy: "customer" | "staff"; widthPx?: number | undefined; heightPx?: number | undefined; dpi?: number | undefined; storagePath?: string | undefined }): ArtworkFile {
  const order = findOrder(orderId);
  const warnings = preflightArtwork({
    ...input,
    targetLongSideInches: longSideForOrder(order),
    category: order.items[0]?.category
  });
  const artwork: ArtworkFile = {
    id: randomUUID(),
    orderId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    storagePath: input.storagePath ?? `artwork/${order.orderNumber}/${input.fileName}`,
    uploadedBy: input.uploadedBy,
    uploadedAt: now(),
    widthPx: input.widthPx,
    heightPx: input.heightPx,
    dpi: input.dpi,
    preflightWarnings: warnings
  };
  order.artwork.unshift(artwork);
  order.status = "design_review";
  order.activityLog.unshift(activity(input.uploadedBy, "artwork_uploaded", `${input.fileName} uploaded.`));
  order.updatedAt = now();
  enqueue([
    {
      event: "artwork_uploaded",
      orderId: order.id,
      customerId: order.customer.id,
      channel: "sms",
      recipient: order.customer.mobile,
      message: `Your artwork for ${order.orderNumber} was uploaded and is now in design review.`
    },
    staffAlert(`Artwork uploaded for ${order.orderNumber}.`, { orderId })
  ]);
  persistState();
  return artwork;
}

export function recordPayment(orderId: string, method: PaymentMethod, amount: number, providerReference?: string): Payment {
  const order = findOrder(orderId);
  const payment: Payment = {
    id: randomUUID(),
    orderId,
    method,
    status: "paid",
    amount,
    providerReference,
    createdAt: now()
  };
  order.payments.unshift(payment);
  const paidTotal = order.payments.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0);
  order.balanceDue = Math.max(0, Number((order.total - paidTotal).toFixed(2)));
  order.paymentStatus = order.balanceDue === 0 ? "paid" : paidTotal >= order.requiredDeposit ? "deposit_paid" : "deposit_due";
  order.activityLog.unshift(activity("staff", "payment_recorded", `${method} payment recorded for R${amount.toFixed(2)}.`));
  // Release a gated online order onto the production floor once its deposit clears.
  if (order.awaitingPayment && paidTotal >= order.requiredDeposit) {
    order.awaitingPayment = false;
    order.activityLog.unshift(activity("system", "released_to_production", "Deposit cleared — order released to production."));
    enqueue([staffAlert(`Online order ${order.orderNumber} deposit cleared and is now in production.`, { orderId: order.id })]);
  }
  order.updatedAt = now();
  enqueue([
    {
      event: "payment_received",
      orderId: order.id,
      customerId: order.customer.id,
      channel: "sms",
      recipient: order.customer.mobile,
      message: `Payment of R${amount.toFixed(2)} received for ${order.orderNumber}. Balance due: R${order.balanceDue.toFixed(2)}.`
    }
  ]);
  persistState();
  return payment;
}

export function sendProof(orderId: string) {
  const order = findOrder(orderId);
  const proof = order.proofs[0] ?? { id: randomUUID(), orderId: order.id, status: "draft" as const };
  proof.status = "sent";
  proof.sentAt = now();
  order.proofs = [proof, ...order.proofs.filter((item) => item.id !== proof.id)];
  order.activityLog.unshift(activity("staff", "proof_sent", `Proof sent to ${order.customer.mobile}.`));
  order.updatedAt = now();
  enqueue([
    {
      event: "design_proof_sent",
      orderId: order.id,
      customerId: order.customer.id,
      channel: "sms",
      recipient: order.customer.mobile,
      message: `A design proof is ready for ${order.orderNumber}. Review and approve: ${config.publicWebUrl}/proof/${order.id}`
    }
  ]);
  persistState();
  return { proof, order };
}

export function approveProof(orderId: string): Order {
  const order = findOrder(orderId);
  const proof = order.proofs[0] ?? { id: randomUUID(), orderId: order.id, status: "draft" as const };
  proof.status = "approved";
  proof.approvedAt = now();
  order.proofs = [proof, ...order.proofs.filter((item) => item.id !== proof.id)];
  return transitionOrder(order.id, "approved");
}

export function queueNotification(payload: NotificationPayload) {
  state.notifications.unshift(payload);
  persistState();
}

export function updateDiscountRule(ruleId: string, patch: Partial<DiscountRule>): DiscountRule {
  const index = state.discountRules.findIndex((rule) => rule.id === ruleId);
  if (index === -1) throw Object.assign(new Error("Discount rule not found"), { statusCode: 404 });
  const current = state.discountRules[index]!;
  const next: DiscountRule = { ...current, ...patch, id: current.id };
  state.discountRules[index] = next;
  persistState();
  return next;
}

export function updateDepositRule(ruleId: string, patch: Partial<DepositRule>): DepositRule {
  const index = state.depositRules.findIndex((rule) => rule.id === ruleId);
  if (index === -1) throw Object.assign(new Error("Deposit rule not found"), { statusCode: 404 });
  const current = state.depositRules[index]!;
  const next: DepositRule = { ...current, ...patch, id: current.id };
  state.depositRules[index] = next;
  persistState();
  return next;
}

export function createDepositRule(input: Omit<DepositRule, "id">): DepositRule {
  const rule: DepositRule = { ...input, id: randomUUID() };
  state.depositRules.unshift(rule);
  persistState();
  return rule;
}

export function deleteDepositRule(ruleId: string) {
  state.depositRules = state.depositRules.filter((rule) => rule.id !== ruleId);
  persistState();
}

export function updateCatalogProduct(productId: string, patch: Partial<CatalogProduct>): CatalogProduct {
  const index = state.catalog.findIndex((product) => product.id === productId);
  if (index === -1) throw Object.assign(new Error("Catalog product not found"), { statusCode: 404 });
  const current = state.catalog[index]!;
  const next: CatalogProduct = { ...current, ...patch, id: current.id };
  state.catalog[index] = next;
  persistState();
  return next;
}

export function createCatalogProduct(input: CatalogProduct): CatalogProduct {
  if (state.catalog.some((product) => product.id === input.id)) throw Object.assign(new Error("Catalog product already exists"), { statusCode: 409 });
  state.catalog.unshift(input);
  persistState();
  return input;
}

export function deleteCatalogProduct(productId: string) {
  state.catalog = state.catalog.filter((product) => product.id !== productId);
  persistState();
}

function findInventoryItem(itemId: string): InventoryItem {
  const item = state.inventory.find((candidate) => candidate.id === itemId);
  if (!item) throw Object.assign(new Error("Inventory item not found"), { statusCode: 404 });
  return item;
}

function logStockMovement(item: InventoryItem, type: StockMovementType, delta: number, opts: { note?: string | undefined; orderId?: string | undefined; actor?: StockActor | undefined } = {}): StockMovement {
  const movement: StockMovement = {
    id: randomUUID(),
    itemId: item.id,
    sku: item.sku,
    itemName: item.name,
    type,
    delta,
    quantityAfter: item.quantityOnHand,
    note: opts.note,
    orderId: opts.orderId,
    actorId: opts.actor?.id,
    actorName: opts.actor?.name ?? "System",
    createdAt: now()
  };
  state.stockMovements.unshift(movement);
  return movement;
}

export function updateInventoryItem(itemId: string, patch: Partial<InventoryItem>, actor?: StockActor): InventoryItem {
  const index = state.inventory.findIndex((item) => item.id === itemId);
  if (index === -1) throw Object.assign(new Error("Inventory item not found"), { statusCode: 404 });
  const current = state.inventory[index]!;
  const next: InventoryItem = { ...current, ...patch, id: current.id };
  state.inventory[index] = next;
  // A direct quantity edit is a recount — record it so the history stays complete.
  if (typeof patch.quantityOnHand === "number" && patch.quantityOnHand !== current.quantityOnHand) {
    logStockMovement(next, "recount", patch.quantityOnHand - current.quantityOnHand, { note: "Edited via inventory form", actor });
  }
  persistState();
  return next;
}

export function createInventoryItem(input: Omit<InventoryItem, "id">, actor?: StockActor): InventoryItem {
  const item: InventoryItem = { ...input, id: randomUUID() };
  state.inventory.unshift(item);
  if (item.quantityOnHand > 0) logStockMovement(item, "opening", item.quantityOnHand, { note: "Opening stock", actor });
  persistState();
  return item;
}

export function deleteInventoryItem(itemId: string) {
  state.inventory = state.inventory.filter((item) => item.id !== itemId);
  persistState();
}

export function receiveStock(itemId: string, quantity: number, note: string | undefined, actor?: StockActor): InventoryItem {
  if (quantity <= 0) throw Object.assign(new Error("Quantity must be greater than zero"), { statusCode: 400 });
  const item = findInventoryItem(itemId);
  item.quantityOnHand += quantity;
  logStockMovement(item, "receive", quantity, { note, actor });
  persistState();
  return item;
}

export function issueStock(itemId: string, quantity: number, note: string | undefined, actor?: StockActor): InventoryItem {
  if (quantity <= 0) throw Object.assign(new Error("Quantity must be greater than zero"), { statusCode: 400 });
  const item = findInventoryItem(itemId);
  if (quantity > item.quantityOnHand) throw Object.assign(new Error("Cannot remove more than is on hand"), { statusCode: 400 });
  item.quantityOnHand -= quantity;
  logStockMovement(item, "issue", -quantity, { note, actor });
  persistState();
  return item;
}

export function recountStock(itemId: string, newQuantity: number, note: string | undefined, actor?: StockActor): InventoryItem {
  if (newQuantity < 0) throw Object.assign(new Error("Quantity cannot be negative"), { statusCode: 400 });
  const item = findInventoryItem(itemId);
  const delta = newQuantity - item.quantityOnHand;
  item.quantityOnHand = newQuantity;
  logStockMovement(item, "recount", delta, { note: note ?? "Physical recount", actor });
  persistState();
  return item;
}

export function listStockMovements(itemId?: string): StockMovement[] {
  const all = itemId ? state.stockMovements.filter((movement) => movement.itemId === itemId) : state.stockMovements;
  return all.slice(0, 200);
}

export function createCustomer(input: { name: string; mobile: string; email?: string | undefined }): Customer {
  if (state.customers.some((customer) => customer.mobile === input.mobile || (!!input.email && customer.email === input.email))) {
    throw Object.assign(new Error("Customer with this mobile or email already exists"), { statusCode: 409 });
  }
  const customer: Customer = { id: randomUUID(), name: input.name, mobile: input.mobile, email: input.email, createdAt: now() };
  state.customers.unshift(customer);
  persistState();
  return customer;
}

export function updateCustomer(customerId: string, patch: Partial<Pick<Customer, "name" | "mobile" | "email">>): Customer {
  const customer = state.customers.find((item) => item.id === customerId);
  if (!customer) throw Object.assign(new Error("Customer not found"), { statusCode: 404 });
  Object.assign(customer, patch);
  for (const order of state.orders.filter((item) => item.customer.id === customer.id)) {
    order.customer = customer;
    order.updatedAt = now();
  }
  persistState();
  return customer;
}

export function deleteCustomer(customerId: string) {
  const hasOrders = state.orders.some((order) => order.customer.id === customerId);
  if (hasOrders) throw Object.assign(new Error("Customer has orders and cannot be deleted. Archive or remove the orders first."), { statusCode: 409 });
  state.customers = state.customers.filter((customer) => customer.id !== customerId);
  persistState();
}

export function createStaffMember(input: Omit<StaffRecord, "id" | "createdAt">, idOverride?: string): StaffRecord {
  const roles = input.roles?.length ? input.roles : [input.role];
  const staffMember: StaffRecord = {
    ...input,
    role: roles[0] ?? input.role,
    roles,
    id: idOverride ?? randomUUID(),
    accessAreas: input.accessAreas.length ? input.accessAreas : defaultAccessForRoles(roles),
    createdAt: now()
  };
  state.staff.unshift(staffMember);
  persistState();
  return staffMember;
}

export function updateStaffMember(staffId: string, patch: Partial<StaffRecord>): StaffRecord {
  const index = state.staff.findIndex((staffMember) => staffMember.id === staffId);
  if (index === -1) throw Object.assign(new Error("Staff member not found"), { statusCode: 404 });
  const current = state.staff[index]!;
  const roles = patch.roles?.length ? patch.roles : patch.role ? [patch.role] : current.roles;
  const next: StaffRecord = {
    ...current,
    ...patch,
    role: roles[0] ?? current.role,
    roles,
    id: current.id,
    createdAt: current.createdAt,
    accessAreas: patch.accessAreas ?? (patch.roles || patch.role ? defaultAccessForRoles(roles) : current.accessAreas)
  };
  state.staff[index] = next;
  persistState();
  return next;
}

export function publicStaff(member: StaffRecord): StaffMember {
  const { passwordHash: _passwordHash, ...safe } = member;
  return safe;
}

export function deleteStaffMember(staffId: string) {
  state.staff = state.staff.filter((staffMember) => staffMember.id !== staffId);
  persistState();
}

export function getCounterQueue(): CounterQueueTicket[] {
  escalateWaitingTickets();
  return state.counterQueue
    .filter((ticket) => ticket.status !== "resolved")
    .map((ticket, index) => ({ ...ticket, position: index + 1 }));
}

export function findCounterTicket(orderId: string): CounterQueueTicket | undefined {
  escalateWaitingTickets();
  return state.counterQueue.find((ticket) => ticket.orderId === orderId);
}

export function acknowledgeCounterTicket(orderId: string, staffName: string): CounterQueueTicket {
  const ticket = state.counterQueue.find((item) => item.orderId === orderId);
  if (!ticket) throw Object.assign(new Error("Counter ticket not found"), { statusCode: 404 });
  ticket.status = "acknowledged";
  ticket.acknowledgedAt = now();
  ticket.acknowledgedBy = staffName;
  const order = findOrder(orderId);
  order.activityLog.unshift(activity("staff", "counter_acknowledged", `${staffName} acknowledged the waiting customer.`));
  enqueue([
    {
      event: "staff_alert",
      orderId,
      customerId: order.customer.id,
      channel: "in_app",
      recipient: "counter",
      message: `${staffName} acknowledged ${order.orderNumber}.`
    }
  ]);
  persistState();
  return ticket;
}

export function resolveCounterTicket(orderId: string): CounterQueueTicket {
  const ticket = state.counterQueue.find((item) => item.orderId === orderId);
  if (!ticket) throw Object.assign(new Error("Counter ticket not found"), { statusCode: 404 });
  ticket.status = "resolved";
  ticket.resolvedAt = now();
  persistState();
  return ticket;
}

export function createDiscountRule(input: Omit<DiscountRule, "id">): DiscountRule {
  const rule: DiscountRule = { ...input, id: randomUUID() };
  state.discountRules.unshift(rule);
  persistState();
  return rule;
}

export function deleteDiscountRule(ruleId: string) {
  state.discountRules = state.discountRules.filter((rule) => rule.id !== ruleId);
  persistState();
}

export function findOrder(orderIdOrNumber: string): Order {
  const order = state.orders.find((item) => item.id === orderIdOrNumber || item.orderNumber === orderIdOrNumber);
  if (!order) throw Object.assign(new Error("Order not found"), { statusCode: 404 });
  return order;
}

export function orderMetrics() {
  const totalSales = state.orders.reduce((sum, order) => sum + order.payments.reduce((paid, payment) => paid + payment.amount, 0), 0);
  const activeOrders = state.orders.filter((order) => !["completed", "cancelled"].includes(order.status)).length;
  const outstandingBalances = state.orders.reduce((sum, order) => sum + order.balanceDue, 0);
  const revenueByCategory = state.catalog.map((product) => ({
    category: product.category,
    revenue: state.orders.flatMap((order) => order.items).filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.lineTotal, 0)
  }));
  return {
    totalSales,
    activeOrders,
    averageOrderValue: state.orders.length ? totalSales / state.orders.length : 0,
    outstandingBalances,
    revenueByCategory
  };
}

export function groupProductionBatches() {
  const groups = new Map<string, { batchKey: string; orderNumbers: string[]; totalQuantity: number }>();
  for (const order of state.orders) {
    for (const item of order.items) {
      const current = groups.get(item.batchKey) ?? { batchKey: item.batchKey, orderNumbers: [], totalQuantity: 0 };
      current.orderNumbers.push(order.orderNumber);
      current.totalQuantity += item.quantity;
      groups.set(item.batchKey, current);
    }
  }
  return [...groups.values()];
}

export function replaceKioskCategories(categories: KioskCategory[]): KioskCategory[] {
  state.kioskCategories = categories.map((category) => ({
    id: String(category.id).trim(),
    label: String(category.label).trim(),
    description: String(category.description ?? "").trim()
  })).filter((category) => category.id && category.label);
  persistState();
  return state.kioskCategories;
}

export function replaceBankingDetails(details: { [K in keyof BankingDetails]?: string | undefined }): BankingDetails {
  const clean = (value: unknown) => String(value ?? "").trim();
  state.bankingDetails = {
    bankName: clean(details.bankName),
    accountName: clean(details.accountName),
    accountNumber: clean(details.accountNumber),
    branchCode: clean(details.branchCode),
    accountType: clean(details.accountType),
    paymentReference: clean(details.paymentReference)
  };
  persistState();
  return state.bankingDetails;
}

// Public (safe) view of the email settings — never exposes the stored app password.
export function publicEmailSettings(settings: EmailCredentials = state.emailSettings): EmailSettings {
  return {
    enabled: settings.enabled,
    provider: "gmail",
    fromName: settings.fromName,
    user: settings.user,
    hasPassword: Boolean(settings.password)
  };
}

export function replaceEmailSettings(input: {
  enabled?: boolean | undefined;
  fromName?: string | undefined;
  user?: string | undefined;
  password?: string | undefined;
}): EmailSettings {
  const current = state.emailSettings;
  // Only overwrite the password when a new non-empty value is supplied, so editing other
  // fields doesn't wipe the saved app password.
  const nextPassword = typeof input.password === "string" && input.password.trim().length > 0
    ? input.password.trim()
    : current.password;
  state.emailSettings = {
    provider: "gmail",
    enabled: input.enabled ?? current.enabled,
    fromName: input.fromName !== undefined ? String(input.fromName).trim() : current.fromName,
    user: input.user !== undefined ? String(input.user).trim() : current.user,
    hasPassword: Boolean(nextPassword),
    password: nextPassword
  };
  persistState();
  return publicEmailSettings();
}

function upsertCustomer(input: { name: string; mobile: string; email?: string | undefined }): Customer {
  const existing = state.customers.find((customer) => customer.mobile === input.mobile || (!!input.email && customer.email === input.email));
  if (existing) {
    existing.name = input.name || existing.name;
    existing.email = input.email ?? existing.email;
    return existing;
  }
  const customer: Customer = {
    id: randomUUID(),
    name: input.name,
    mobile: input.mobile,
    email: input.email,
    createdAt: now()
  };
  state.customers.unshift(customer);
  return customer;
}

function nextOrderNumber(): string {
  // Derive from the highest existing number (not the count) so deleting an order, restarts,
  // or out-of-order data never produce a duplicate. createOrder is synchronous from here to
  // the push, so two concurrent creates can't read the same max.
  const highest = state.orders.reduce((max, order) => {
    const n = Number(String(order.orderNumber).replace(/[^0-9]/g, ""));
    return Number.isFinite(n) && n > max ? n : max;
  }, 1050);
  return `#${highest + 1}`;
}

function activity(actor: ActivityEvent["actor"], event: string, message: string): ActivityEvent {
  return { id: randomUUID(), actor, event, message, createdAt: now() };
}

function enqueue(payloads: NotificationPayload[]) {
  state.notifications.unshift(...payloads);
}

function longSideForOrder(order: Order): number | undefined {
  const size = order.items[0]?.selectedOptions.size;
  if (size === "24x36") return 36;
  if (size === "a2") return 23.4;
  if (size === "a3") return 16.5;
  if (size === "a4") return 11.7;
  return undefined;
}

function decrementInventory(order: Order) {
  for (const item of order.items) {
    const product = state.catalog.find((candidate) => candidate.id === item.productId);
    for (const tag of product?.inventoryTags ?? []) {
      const inventoryItem = state.inventory.find((candidate) => candidate.tags.includes(tag));
      if (!inventoryItem) continue;
      const used = Math.min(inventoryItem.quantityOnHand, item.quantity);
      inventoryItem.quantityOnHand -= used;
      if (used > 0) {
        logStockMovement(inventoryItem, "consume", -used, {
          orderId: order.id,
          note: `Used by ${order.orderNumber} (${item.productName})`,
          actor: { name: "System" }
        });
      }
    }
  }
}

function loadState(): AppState {
  // With a database configured, never read a (possibly stale) local file — hydrate from the DB instead.
  if (remotePersistenceEnabled()) return structuredClone(initialState);
  if (!existsSync(dataFile)) return structuredClone(initialState);
  try {
    const parsed = JSON.parse(readFileSync(dataFile, "utf8")) as AppState;
    return {
      ...structuredClone(initialState),
      ...parsed,
      catalog: mergeCatalog(parsed.catalog),
      depositRules: parsed.depositRules?.length ? parsed.depositRules : defaultDepositRules,
      discountRules: parsed.discountRules?.length ? parsed.discountRules : defaultDiscountRules,
      staff: parsed.staff?.length ? parsed.staff.map((member) => ({
        ...member,
        roles: member.roles?.length ? member.roles : [member.role],
        passwordHash: (member as StaffRecord).passwordHash ?? defaultPasswordHashFor(member.role)
      })) : initialState.staff,
      counterQueue: parsed.counterQueue ?? []
    };
  } catch {
    return structuredClone(initialState);
  }
}

function persistState() {
  // When a database is configured it is the single source of truth — never keep a local copy.
  if (remotePersistenceEnabled()) {
    if (remoteHydrated) {
      void persistSupabaseState(state).catch((error) => {
        console.error("Supabase persistence failed", error);
      });
    }
    return;
  }
  // No database configured: fall back to local disk so a dev/offline setup keeps its data.
  mkdirSync(dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, JSON.stringify(state, null, 2));
}

function bootstrapOwnerStaff(staff: StaffRecord[]): StaffRecord[] {
  if (!config.bootstrapOwnerEmail || !config.bootstrapOwnerPassword) return staff;
  return staff.map((member) => member.roles.includes("owner")
    ? {
        ...member,
        name: config.bootstrapOwnerName,
        email: config.bootstrapOwnerEmail,
        passwordHash: hashPassword(config.bootstrapOwnerPassword),
        active: true
      }
    : member);
}

function defaultPasswordHashFor(role: StaffMember["role"]): string | undefined {
  if (role === "owner") return hashPassword("PrintFlowOwner!2026");
  if (role === "cashier") return hashPassword("PrintFlowCashier!2026");
  return undefined;
}

interface SeedStep {
  assignee?: string;
  deposit?: boolean;
  payFull?: boolean;
  method?: PaymentMethod;
  artwork?: string;
  rush?: boolean;
  status?: OrderStatus;
}

function seedOrder(input: CreateOrderInput, step: SeedStep = {}): Order {
  const order = createOrder({ ...input, rush: step.rush ?? input.rush });
  if (step.assignee) updateOrder(order.id, { staffAssigneeId: step.assignee });
  if (step.artwork) attachArtwork(order.id, { fileName: step.artwork, mimeType: "image/png", uploadedBy: "customer", widthPx: 3000, heightPx: 3000, dpi: 300 });
  if (step.deposit && order.requiredDeposit > 0) recordPayment(order.id, step.method ?? "cash", order.requiredDeposit);
  if (step.payFull && order.balanceDue > 0) recordPayment(order.id, step.method ?? "card_yoco", order.balanceDue);
  if (step.status) transitionOrder(order.id, step.status);
  return order;
}

// Seeds a realistic starting dataset so the platform isn't empty on first run.
function seedStarterOrder() {
  if (state.orders.length > 0) return;
  const designer = "staff-designer";
  const operator = "staff-operator";

  // New online order, awaiting artwork (magic link sent).
  seedOrder({
    source: "online",
    customer: { name: "Thabo Mokoena", mobile: "+27821112233", email: "thabo@example.co.za" },
    items: [{ productId: "apparel-tshirt", quantity: 20, selectedOptions: { neck: "round", sleeve: "short", size: "L" } }]
  });

  // School uniform bulk order, awaiting artwork.
  seedOrder({
    source: "online",
    customer: { name: "Sunrise Primary School", mobile: "+27822223344", email: "admin@sunriseprimary.co.za" },
    items: [{ productId: "apparel-school-uniform", quantity: 40, selectedOptions: { item: "shirt", size: "M" }, specialInstructions: "School crest on left chest." }]
  });

  // Golf shirts in design review, assigned to designer, artwork received.
  seedOrder({
    source: "counter",
    customer: { name: "Apex Logistics", mobile: "+27823334455", email: "orders@apexlogistics.co.za" },
    items: [{ productId: "apparel-golf-shirt", quantity: 15, selectedOptions: { sleeve: "short", size: "L" } }]
  }, { assignee: designer, artwork: "apex-logo.png", deposit: true, method: "eft", status: "design_review" });

  // Tracksuits approved for production, deposit paid.
  seedOrder({
    source: "online",
    customer: { name: "Eagles Athletics Club", mobile: "+27824445566", email: "kit@eaglesac.co.za" },
    items: [{ productId: "apparel-tracksuit", quantity: 10, selectedOptions: { size: "XL" } }]
  }, { assignee: designer, artwork: "eagles-kit.png", deposit: true, status: "approved" });

  // Sports kit in production, rush, assigned to operator.
  seedOrder({
    source: "counter",
    customer: { name: "City Rovers FC", mobile: "+27825556677", email: "manager@cityrovers.co.za" },
    items: [{ productId: "apparel-sports-kit", quantity: 18, selectedOptions: { sport: "soccer", size: "L" } }]
  }, { assignee: operator, rush: true, artwork: "rovers-jersey.png", deposit: true, status: "in_production" });

  // Hoodies in quality check.
  seedOrder({
    source: "counter",
    customer: { name: "Tech Hub Co-Work", mobile: "+27826667788", email: "hello@techhub.co.za" },
    items: [{ productId: "apparel-hoodie", quantity: 12, selectedOptions: { size: "XL" } }]
  }, { assignee: operator, artwork: "techhub-logo.png", deposit: true, status: "quality_check" });

  // Pull-up banner ready for collection, balance outstanding.
  seedOrder({
    source: "online",
    customer: { name: "Bright Dental", mobile: "+27827778899", email: "info@brightdental.co.za" },
    items: [{ productId: "signage-pull-up-banner", quantity: 2, selectedOptions: { material: "standard" } }]
  }, { assignee: designer, artwork: "bright-dental.png", deposit: true, status: "ready_for_collection" });

  // X-banner completed and fully paid.
  seedOrder({
    source: "counter",
    customer: { name: "Green Valley Market", mobile: "+27828889900", email: "market@greenvalley.co.za" },
    items: [{ productId: "signage-x-banner", quantity: 1, selectedOptions: {} }]
  }, { assignee: designer, artwork: "green-valley.png", payFull: true, status: "completed" });

  // Walk-in kiosk embroidery enquiry (priced on consultation) — sits in the counter queue.
  seedOrder({
    source: "kiosk",
    customer: { name: "Walk-in Customer", mobile: "+27829990011" },
    items: [{ productId: "apparel-embroidery", quantity: 25, selectedOptions: { placement: "left_chest" }, specialInstructions: "Company logo on golf shirts — needs a quote." }]
  });
}

function createCounterQueueTicket(order: Order): CounterQueueTicket {
  const ticket: CounterQueueTicket = {
    id: randomUUID(),
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customer.name,
    customerMobile: order.customer.mobile,
    department: order.queueName,
    status: "waiting",
    createdAt: now(),
    position: state.counterQueue.filter((item) => item.status !== "resolved").length + 1
  };
  state.counterQueue.push(ticket);
  order.activityLog.unshift(activity("system", "counter_waiting", "Customer is waiting for counter acknowledgement."));
  enqueue([
    staffAlert(`Kiosk customer waiting at counter - ${order.orderNumber}`, { orderId: order.id, queueTicketId: ticket.id }),
    {
      event: "staff_alert",
      orderId: order.id,
      customerId: order.customer.id,
      channel: "sms",
      recipient: order.customer.mobile,
      message: `You are checked in as ${order.orderNumber}. A staff member has been notified.`
    }
  ]);
  return ticket;
}

function escalateWaitingTickets() {
  const thresholdMs = Number(process.env.COUNTER_ESCALATION_MINUTES ?? 5) * 60 * 1000;
  const cutoff = Date.now() - thresholdMs;
  let changed = false;
  for (const ticket of state.counterQueue) {
    if (ticket.status === "waiting" && new Date(ticket.createdAt).getTime() <= cutoff) {
      changed = true;
      ticket.status = "escalated";
      ticket.escalatedAt = now();
      enqueue([
        staffAlert(`Escalation: ${ticket.orderNumber} has waited more than ${process.env.COUNTER_ESCALATION_MINUTES ?? 5} minutes.`, { orderId: ticket.orderId, queueTicketId: ticket.id }),
        ...state.staff
          .filter((member) => member.active && (member.roles.includes("owner") || member.roles.includes("manager")))
          .map((member) => ({
            event: "staff_alert" as const,
            orderId: ticket.orderId,
            channel: "sms" as const,
            recipient: member.mobile ?? member.email,
            message: `Counter escalation: ${ticket.orderNumber} is still waiting for acknowledgement.`
          }))
      ]);
    }
  }
  if (changed) persistState();
}

function mergeCatalog(saved: CatalogProduct[] | undefined): CatalogProduct[] {
  const savedProducts = saved?.map((product) => ({ ...product, enabled: product.enabled ?? true })) ?? [];
  const savedIds = new Set(savedProducts.map((product) => product.id));
  const addedDefaults = initialState.catalog.filter((product) => !savedIds.has(product.id));
  return [...savedProducts, ...addedDefaults];
}
