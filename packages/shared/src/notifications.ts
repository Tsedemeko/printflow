import type { NotificationPayload, Order } from "./types.js";
import { statusLabel } from "./workflow.js";

export function customerOrderCreated(order: Order, uploadUrl: string): NotificationPayload[] {
  return [
    {
      event: "pre_order_created",
      orderId: order.id,
      customerId: order.customer.id,
      channel: "sms",
      recipient: order.customer.mobile,
      message: `Your PrintFlow order ${order.orderNumber} has been created. Upload or track here: ${uploadUrl}`
    },
    ...(order.customer.email
      ? [{
          event: "pre_order_created" as const,
          orderId: order.id,
          customerId: order.customer.id,
          channel: "email" as const,
          recipient: order.customer.email,
          subject: `PrintFlow order ${order.orderNumber}`,
          message: `Your order summary is ready. Upload artwork or track progress here: ${uploadUrl}`
        }]
      : [])
  ];
}

export function statusChanged(order: Order): NotificationPayload[] {
  const label = statusLabel(order.status);
  const base = `Order ${order.orderNumber} is now ${label}. Balance due: R${order.balanceDue.toFixed(2)}.`;
  return [
    {
      event: order.status === "ready_for_collection" ? "ready_for_collection" : "status_changed",
      orderId: order.id,
      customerId: order.customer.id,
      channel: "sms",
      recipient: order.customer.mobile,
      message: base
    }
  ];
}

export function staffAlert(message: string, metadata: Record<string, unknown> = {}): NotificationPayload {
  return {
    event: "staff_alert",
    channel: "in_app",
    recipient: "front-counter",
    message,
    metadata
  };
}
