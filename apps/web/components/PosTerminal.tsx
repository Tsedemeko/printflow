"use client";

import type { CatalogProduct, Order, PaymentMethod } from "@printflow/shared";
import { useEffect, useMemo, useState } from "react";
import { staffAuthHeaders } from "../lib/staff-session";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function PosTerminal({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrders.find((order) => order.status === "ready_for_collection")?.id ?? initialOrders[0]?.id ?? "");
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [qsSearch, setQsSearch] = useState("");
  const [qsProductId, setQsProductId] = useState("");
  const [qsQty, setQsQty] = useState("1");
  const [amountInput, setAmountInput] = useState("");
  const [message, setMessage] = useState("");
  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId) ?? orders[0], [orders, selectedOrderId]);
  const qsProduct = catalog.find((item) => item.id === qsProductId);
  const filteredCatalog = useMemo(() => catalog.filter((item) => item.name.toLowerCase().includes(qsSearch.toLowerCase())).slice(0, 6), [catalog, qsSearch]);

  useEffect(() => {
    void refresh();
    void refreshCatalog();
  }, []);

  // Default the amount to the outstanding balance whenever the selected order changes.
  useEffect(() => {
    setAmountInput(selectedOrder && selectedOrder.balanceDue > 0 ? selectedOrder.balanceDue.toFixed(2) : "");
  }, [selectedOrder?.id, selectedOrder?.balanceDue]);

  async function refresh() {
    const response = await fetch(`${apiUrl}/orders`);
    if (response.ok) {
      const payload = await response.json() as { orders: Order[] };
      setOrders(payload.orders);
      if (!selectedOrderId && payload.orders[0]) setSelectedOrderId(payload.orders[0].id);
    }
  }

  async function refreshCatalog() {
    const response = await fetch(`${apiUrl}/catalog/products`);
    if (response.ok) {
      const payload = await response.json() as { products: CatalogProduct[] };
      setCatalog(payload.products.filter((item) => item.enabled ?? true));
    }
  }

  async function record(method: PaymentMethod) {
    if (!selectedOrder) return;
    if (selectedOrder.balanceDue <= 0) {
      setMessage(`${selectedOrder.orderNumber} is already settled — nothing to pay.`);
      return;
    }
    const amount = Math.round((Number(amountInput) || 0) * 100) / 100;
    if (amount <= 0) {
      setMessage("Enter an amount greater than zero.");
      return;
    }
    if (amount > selectedOrder.balanceDue + 0.001) {
      setMessage(`Amount can't exceed the balance of R${selectedOrder.balanceDue.toFixed(2)}.`);
      return;
    }
    const response = await fetch(`${apiUrl}/payments/${selectedOrder.id}`, {
      method: "POST",
      headers: staffAuthHeaders(["cashier"]),
      body: JSON.stringify({ method, amount })
    });
    if (!response.ok) {
      setMessage("Could not record the payment. Please try again.");
      return;
    }
    await fetch(`${apiUrl}/payments/${selectedOrder.id}/receipt`, {
      method: "POST",
      headers: staffAuthHeaders(["cashier"]),
      body: JSON.stringify({ channel: selectedOrder.customer.email ? "email" : "sms" })
    });
    setMessage(`${method.replaceAll("_", " ")} payment of R${amount.toFixed(2)} recorded for ${selectedOrder.orderNumber}. Receipt sent.`);
    await refresh();
  }

  async function createQuickSale() {
    if (!qsProduct) { setMessage("Search and pick a product to sell first."); return; }
    const qty = Math.max(1, Number(qsQty) || 1);
    const selectedOptions = Object.fromEntries(Object.entries(qsProduct.options).map(([group, opts]) => [group, opts[0]?.id ?? ""]));
    const response = await fetch(`${apiUrl}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "quick_sale",
        customer: { name: "Walk-in customer", mobile: "+27000000000" },
        items: [{ productId: qsProduct.id, quantity: qty, selectedOptions }]
      })
    });
    if (!response.ok) { setMessage("Could not create the quick sale."); return; }
    const payload = await response.json() as { order: Order };
    setSelectedOrderId(payload.order.id);
    setMessage(`${payload.order.orderNumber} quick sale created: ${qty} × ${qsProduct.name}. Now settle it.`);
    setQsProductId(""); setQsSearch(""); setQsQty("1");
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
                <option key={order.id} value={order.id}>{order.orderNumber} - {order.customer.name} (R{order.balanceDue.toFixed(2)})</option>
              ))}
            </select>
          </label>
        ) : null}
        <p>{selectedOrder?.customer.name} | {selectedOrder?.queueName.replaceAll("_", " ")}</p>
        {selectedOrder ? (
          <p className="muted-note">
            Total R{selectedOrder.total.toFixed(2)}
            {selectedOrder.discountTotal > 0 ? ` · Discount −R${selectedOrder.discountTotal.toFixed(2)}` : ""}
            {selectedOrder.requiredDeposit > 0 ? ` · Deposit R${selectedOrder.requiredDeposit.toFixed(2)}` : ""}
          </p>
        ) : null}
        <strong className="amount">R{(selectedOrder?.balanceDue ?? 0).toFixed(2)}</strong>
        <label>
          Amount to charge (edit for a deposit or part-payment)
          <input value={amountInput} onChange={(event) => setAmountInput(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" />
        </label>
        {selectedOrder ? (
          <div className="row">
            <button className="secondary compact" type="button" onClick={() => setAmountInput(selectedOrder.balanceDue.toFixed(2))}>Full balance</button>
            {selectedOrder.requiredDeposit > 0 && selectedOrder.requiredDeposit < selectedOrder.balanceDue ? (
              <button className="secondary compact" type="button" onClick={() => setAmountInput(selectedOrder.requiredDeposit.toFixed(2))}>Deposit R{selectedOrder.requiredDeposit.toFixed(0)}</button>
            ) : null}
          </div>
        ) : null}
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
        <h2>Sell an item off the shelf</h2>
        <label>Search products<input value={qsSearch} onChange={(event) => { setQsSearch(event.target.value); setQsProductId(""); }} placeholder="e.g. T-shirt, cap, bucket hat" /></label>
        {!qsProduct ? (
          <div className="inventory-results">
            {filteredCatalog.map((item) => (
              <button className="secondary compact" key={item.id} onClick={() => { setQsProductId(item.id); setQsSearch(item.name); }} type="button">
                {item.name} — R{item.basePrice.toFixed(2)}
              </button>
            ))}
          </div>
        ) : (
          <label>Quantity of {qsProduct.name} (R{qsProduct.basePrice.toFixed(2)} each)
            <input type="number" min={1} value={qsQty} onChange={(event) => setQsQty(event.target.value.replace(/[^0-9]/g, ""))} />
          </label>
        )}
        <div className="row">
          <button onClick={() => void createQuickSale()} type="button">Create quick sale</button>
          <button className="secondary" type="button" onClick={() => window.print()}>Print receipt</button>
        </div>
        <div className="quote">Quick-sale orders are saved through the API and appear in reporting, payments, and reconciliation.</div>
      </article>
    </section>
  );
}
