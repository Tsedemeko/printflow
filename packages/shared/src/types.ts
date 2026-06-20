import type {
  DEPARTMENT_QUEUES,
  NOTIFICATION_EVENTS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PRODUCT_CATEGORIES,
  PROOF_STATUSES,
  STAFF_ROLES,
  ACCESS_AREAS
} from "./constants.js";

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type DepartmentQueue = (typeof DEPARTMENT_QUEUES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type StaffRole = (typeof STAFF_ROLES)[number];
export type AccessArea = (typeof ACCESS_AREAS)[number];
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];
export type ProofStatus = (typeof PROOF_STATUSES)[number];

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string | undefined;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  mobile?: string | undefined;
  role: StaffRole;
  roles: StaffRole[];
  active: boolean;
  accessAreas: AccessArea[];
  createdAt: string;
}

export interface CounterQueueTicket {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerMobile: string;
  department: DepartmentQueue;
  status: "waiting" | "acknowledged" | "escalated" | "resolved";
  createdAt: string;
  acknowledgedAt?: string | undefined;
  acknowledgedBy?: string | undefined;
  escalatedAt?: string | undefined;
  resolvedAt?: string | undefined;
  position: number;
}

export interface CatalogOption {
  id: string;
  label: string;
  priceDelta: number;
  metadata?: Record<string, string | number | boolean> | undefined;
}

export interface CatalogProduct {
  id: string;
  category: ProductCategory;
  department: DepartmentQueue;
  name: string;
  description: string;
  basePrice: number;
  unitLabel: string;
  options: Record<string, CatalogOption[]>;
  requiresArtwork: boolean;
  proofRecommended: boolean;
  inventoryTags: string[];
  enabled?: boolean | undefined;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  category: ProductCategory;
  department: DepartmentQueue;
  quantity: number;
  selectedOptions: Record<string, string>;
  specialInstructions?: string | undefined;
  unitPrice: number;
  lineTotal: number;
  batchKey: string;
}

export interface ArtworkFile {
  id: string;
  orderId: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  uploadedBy: "customer" | "staff";
  uploadedAt: string;
  widthPx?: number | undefined;
  heightPx?: number | undefined;
  dpi?: number | undefined;
  preflightWarnings: string[];
}

export interface Proof {
  id: string;
  orderId: string;
  status: ProofStatus;
  previewUrl?: string | undefined;
  customerComments?: string | undefined;
  sentAt?: string | undefined;
  approvedAt?: string | undefined;
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  providerReference?: string | undefined;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  source: "kiosk" | "counter" | "online" | "quick_sale";
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  customer: Customer;
  items: OrderItem[];
  artwork: ArtworkFile[];
  proofs: Proof[];
  payments: Payment[];
  subtotal: number;
  discountTotal: number;
  total: number;
  requiredDeposit: number;
  balanceDue: number;
  queueName: DepartmentQueue;
  staffAssigneeId?: string | undefined;
  rush: boolean;
  dueAt?: string | undefined;
  awaitingPayment?: boolean | undefined;
  internalNotes: string[];
  activityLog: ActivityEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEvent {
  id: string;
  actor: "system" | "customer" | "staff";
  event: string;
  message: string;
  createdAt: string;
}

export interface DepositRule {
  id: string;
  label: string;
  priority: number;
  category?: ProductCategory | undefined;
  minTotal?: number | undefined;
  maxTotal?: number | undefined;
  productId?: string | undefined;
  depositPercent: number;
  nonRefundable: boolean;
}

export interface QuoteInput {
  productId: string;
  quantity: number;
  selectedOptions: Record<string, string>;
  specialInstructions?: string | undefined;
}

export interface NotificationPayload {
  event: NotificationEvent;
  orderId?: string | undefined;
  customerId?: string | undefined;
  channel: "sms" | "email" | "whatsapp" | "in_app";
  recipient: string;
  subject?: string | undefined;
  message: string;
  metadata?: Record<string, unknown> | undefined;
}

export interface KioskCategory {
  id: string;
  label: string;
  description: string;
}
