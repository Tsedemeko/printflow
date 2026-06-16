"use client";

import type { Order, PaymentMethod } from "@printflow/shared";
import { useEffect, useMemo, useState } from "react";
import { staffAuthHeaders } from "../lib/staff-session";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function PosTerminal({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrders.find((order) => order.status === "ready_for_collection")?.id ?? initialOrders[0]?.id ?? "");
  const [quickSaleName, setQuickSaleName] = useState("Photo frame");
  const [inventory, setInventory] = useState<{ id: string; sku: string; name: string; quantityOnHand: number }[]>([]);
  const [message, setMessage] = useState("");
  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId) ?? orders[0], [orders, selectedOrderId]);
  const filteredInventory = useMemo(() => inventory.filter((item) => `${item.sku} ${item.name}`.toLowerCase().includes(quickSaleName.toLowerCase())), [inventory, quickSaleName]);

  useEffect(() => {
    void refresh();
    void refreshInventory();
  }, []);

  async function refresh() {
    const response = await fetch(`${apiUrl}/orders`);
    if (response.ok) {
      const payload = await response.json() as { orders: Order[] };
      setOrders(payload.orders);
      if (!selectedOrderId && payload.orders[0]) setSelectedOrderId(payload.orders[0].id);
    }
  }

  async function refreshInventory() {
    const response = await fetch(`${apiUrl}/inventory`);
    if (response.ok) {
      const payload = await response.json() as { items: { id: string; sku: string; name: string; quantityOnHand: number }[] };
      setInventory(payload.items);
    }
  }

  async function record(method: PaymentMethod) {
    if (!selectedOrder) return;
    await fetch(`${apiUrl}/payments/${selectedOrder.id}`, {
      method: "POST",
      headers: staffAuthHeaders(["cashier"]),
      body: JSON.stringify({ method, amount: selectedOrder.balanceDue || selectedOrder.requiredDeposit || selectedOrder.total })
    });
    await fetch(`${apiUrl}/payments/${selectedOrder.id}/receipt`, {
      method: "POST",
      headers: staffAuthHeaders(["cashier"]),
      body: JSON.stringify({ channel: "sms" })
    });
    setMessage(`${method.replaceAll("_", " ")} payment recorded for ${selectedOrder.orderNumber}. Receipt queued by SMS and ready to print.`);
    await refresh();
  }

  async function createQuickSale() {
    const response = await fetch(`${apiUrl}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "quick_sale",
        customer: { name: "Walk-in customer", mobile: "+27000000000" },
        items: [{ productId: "quick-photo-frame", quantity: 1, selectedOptions: { size: "a4" }, specialInstructions: quickSaleName }]
      })
    });
    const payload = await response.json() as { order: Order };
    setSelectedOrderId(payload.order.id);
    setMessage(`${payload.order.orderNumber} quick sale created.`);
    await refresh();
  }

  return (
    <section className="admin-grid">
      <article className="card glossy section-blue">
        <span className="status">settle balance</span>
        <h2>{selectedOrder?.orderNumber ?? "No orders yet"}</h2>
        {orders.length ? (
          <label>
            Select order
            <select value={selectedOrderId} onChange={(event) => setSelectedOrderId(event.target.value)}>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>{order.orderNumber} - {order.customer.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        <p>{selectedOrder?.customer.name} | {selectedOrder?.queueName.replaceAll("_", " ")}</p>
        <strong className="amount">R{(selectedOrder?.balanceDue ?? 0).toFixed(2)}</strong>
        <div className="row">
          {[
            ["card_yoco", "Yoco Card"],
            ["cash", "Cash"],
            ["eft", "EFT"],
            ["snapscan", "SnapScan"],
            ["zapper", "Zapper"]
          ].map(([method, label]) => (
            <button className="secondary" disabled={!selectedOrder} onClick={() => void record(method as PaymentMethod)} type="button" key={method}>{label}</button>
          ))}
        </div>
        {message ? <div className="quote-result"><span>{message}</span></div> : null}
      </article>
      <article className="card glossy section-teal pos-quick-sale">
        <span className="status">quick sale</span>
        <h2>Ready-made items</h2>
        <label>Search stock<input value={quickSaleName} onChange={(event) => setQuickSaleName(event.target.value)} /></label>
        <div className="inventory-results">
          {filteredInventory.slice(0, 5).map((item) => (
            <button className="secondary compact" key={item.id} onClick={() => setQuickSaleName(item.name)} type="button">
              {item.sku} | {item.name} | {item.quantityOnHand} left
            </button>
          ))}
        </div>
        <div className="row">
          <button onClick={() => void createQuickSale()} type="button">Create quick sale</button>
          <a className="button secondary" href="/inventory">View inventory</a>
          <button className="secondary" type="button" onClick={() => window.print()}>Print receipt</button>
        </div>
        <div className="quote">Quick-sale orders are saved through the API and appear in reporting, payments, and reconciliation.</div>
      </article>
    </section>
  );
}
