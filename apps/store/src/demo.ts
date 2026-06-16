import { catalog, calculateRequiredDeposit, priceQuote, workflowColumns } from "@printflow/shared";
import type { Order } from "@printflow/shared";

const quote = priceQuote([
  {
    productId: "apparel-tshirt",
    quantity: 12,
    selectedOptions: { size: "M", color: "Black", placement: "full_front" }
  }
]);
const deposit = calculateRequiredDeposit(quote.total, quote.items);

export const storeOrder: Order = {
  id: "store-demo",
  orderNumber: "#1046",
  source: "kiosk",
  status: "new",
  paymentStatus: "deposit_due",
  customer: {
    id: "walk-in",
    name: "Walk-in Customer",
    mobile: "+27825550123",
    createdAt: new Date().toISOString()
  },
  items: quote.items,
  artwork: [],
  proofs: [{ id: "proof-store", orderId: "store-demo", status: "draft" }],
  payments: [],
  subtotal: quote.subtotal,
  discountTotal: quote.discountTotal,
  total: quote.total,
  requiredDeposit: deposit.amount,
  balanceDue: quote.total,
  queueName: "apparel_heat_press",
  rush: false,
  internalNotes: ["Call customer by order number when consultant is ready."],
  activityLog: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const storeData = {
  catalog,
  workflowColumns,
  orders: [
    storeOrder,
    { ...storeOrder, id: "awaiting-art", orderNumber: "#1047", status: "awaiting_artwork", queueName: "canvas_photo" },
    { ...storeOrder, id: "quality", orderNumber: "#1048", status: "quality_check", queueName: "document_printing" },
    { ...storeOrder, id: "ready", orderNumber: "#1049", status: "ready_for_collection", queueName: "signage_banner", balanceDue: 300 }
  ] as Order[]
};
