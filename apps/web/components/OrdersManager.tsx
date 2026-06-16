"use client";

import { ORDER_STATUSES } from "@printflow/shared";
import type { Order, OrderStatus } from "@printflow/shared";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { staffAuthHeaders } from "../lib/staff-session";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function OrdersManager({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [editing, setEditing] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const filtered = useMemo(() => orders.filter((order) => `${order.orderNumber} ${order.customer.name} ${order.customer.mobile}`.toLowerCase().includes(search.toLowerCase())), [orders, search]);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const response = await fetch(`${apiUrl}/orders`);
    if (response.ok) {
      const payload = await response.json() as { orders: Order[] };
      setOrders(payload.orders);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const notes = String(form.get("internalNotes") ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
    const response = await fetch(`${apiUrl}/orders/${editing.id}`, {
      method: "PATCH",
      headers: staffAuthHeaders(["manager", "designer"]),
      body: JSON.stringify({
        status: form.get("status") as OrderStatus,
        rush: form.get("rush") === "on",
        internalNotes: notes
      })
    });
    if (response.ok) {
      setMessage("Order updated.");
      setEditing(null);
      await refresh();
    }
  }

  async function remove(order: Order) {
    const response = await fetch(`${apiUrl}/orders/${order.id}`, { method: "DELETE", headers: staffAuthHeaders(["manager", "designer"], false) });
    if (response.ok) {
      setMessage("Order deleted.");
      await refresh();
    }
  }

  return (
    <>
      <div className="section-head">
        <label className="wide-search">Search orders<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order, customer, mobile" /></label>
        {message ? <span className="status">{message}</span> : null}
      </div>
      <section className="cards compact-cards">
        {filtered.map((order) => (
          <article className={`card glossy compact-card job-${order.status}`} key={order.id}>
            <span className="status">{order.status.replaceAll("_", " ")}</span>
            <h2>{order.orderNumber}</h2>
            <p>{order.customer.name} | {order.customer.mobile}</p>
            <p>Balance R{order.balanceDue.toFixed(2)} | {order.queueName.replaceAll("_", " ")}</p>
            {order.rush ? <span className="badge">Rush</span> : null}
            <div className="row">
              <button className="secondary compact" type="button" onClick={() => setEditing(order)}>View/Edit</button>
              <a className="button secondary compact" href={`/quote/${order.id}`}>Quote</a>
              <a className="button secondary compact" href={`/invoice/${order.id}`}>Invoice</a>
              <button className="secondary compact" type="button" onClick={() => void remove(order)}>Delete</button>
            </div>
          </article>
        ))}
      </section>
      {editing ? (
        <form className="edit-panel" onSubmit={(event) => void save(event)}>
          <h3>Edit {editing.orderNumber}</h3>
          <div className="form-grid">
            <label>Status<select name="status" defaultValue={editing.status}>
              {ORDER_STATUSES.map((status) => <option value={status} key={status}>{status.replaceAll("_", " ")}</option>)}
            </select></label>
            <label className="check-row"><input name="rush" type="checkbox" defaultChecked={editing.rush} /> Rush order</label>
          </div>
          <label>Internal notes<textarea name="internalNotes" defaultValue={editing.internalNotes.join("\n")} /></label>
          <div className="row">
            <button type="submit">Save order</button>
            <button className="secondary" type="button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      ) : null}
    </>
  );
}
