import { ORDER_STATUSES } from "./constants.js";
import type { OrderStatus } from "./types.js";

export const workflowColumns: { status: OrderStatus; label: string; customerMessage?: string }[] = [
  { status: "new", label: "New" },
  { status: "awaiting_artwork", label: "Awaiting Artwork" },
  { status: "design_review", label: "Design Review", customerMessage: "Your artwork has been received and is being reviewed." },
  { status: "approved", label: "Approved", customerMessage: "Your design has been approved for production." },
  { status: "in_production", label: "In Production", customerMessage: "Your order is now in production." },
  { status: "quality_check", label: "Quality Check" },
  { status: "ready_for_collection", label: "Ready for Collection", customerMessage: "Great news! Your order is ready for collection." },
  { status: "completed", label: "Completed" }
];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  if (from === "cancelled") return false;
  if (to === "cancelled") return true;
  const fromIndex = ORDER_STATUSES.indexOf(from);
  const toIndex = ORDER_STATUSES.indexOf(to);
  return fromIndex >= 0 && toIndex >= 0 && toIndex >= fromIndex && to !== "new";
}

export function statusLabel(status: OrderStatus): string {
  return workflowColumns.find((column) => column.status === status)?.label ?? status;
}
