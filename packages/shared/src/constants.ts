export const PRODUCT_CATEGORIES = [
  "apparel",
  "document",
  "signage",
  "canvas_photo",
  "promotional",
  "quick_sale"
] as const;

export const ORDER_STATUSES = [
  "new",
  "awaiting_artwork",
  "design_review",
  "approved",
  "in_production",
  "quality_check",
  "ready_for_collection",
  "completed",
  "cancelled"
] as const;

export const DEPARTMENT_QUEUES = [
  "document_printing",
  "apparel_heat_press",
  "canvas_photo",
  "signage_banner",
  "promotional_items",
  "front_counter"
] as const;

export const PAYMENT_STATUSES = [
  "unpaid",
  "deposit_due",
  "deposit_paid",
  "paid",
  "refunded",
  "failed"
] as const;

export const PAYMENT_METHODS = [
  "cash",
  "card_yoco",
  "payfast",
  "eft",
  "snapscan",
  "zapper",
  "manual_external"
] as const;

export const STAFF_ROLES = [
  "owner",
  "manager",
  "sales_assistant",
  "cashier",
  "designer",
  "document_operator",
  "canvas_operator",
  "apparel_operator",
  "signage_operator"
] as const;

export const ACCESS_AREAS = [
  "dashboard",
  "catalog_pricing",
  "production",
  "pos",
  "crm",
  "inventory",
  "reports",
  "staff_management",
  "kiosk",
  "online_orders"
] as const;

export const NOTIFICATION_EVENTS = [
  "pre_order_created",
  "order_confirmed",
  "payment_received",
  "artwork_uploaded",
  "design_proof_sent",
  "design_approved",
  "status_changed",
  "ready_for_collection",
  "balance_reminder",
  "staff_alert",
  "daily_management_summary"
] as const;

export const PROOF_STATUSES = [
  "not_required",
  "draft",
  "sent",
  "changes_requested",
  "approved",
  "expired"
] as const;
