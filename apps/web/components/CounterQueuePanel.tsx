"use client";

import type { CounterQueueTicket, Order } from "@printflow/shared";
import { useEffect, useState } from "react";
import { staffAuthHeaders } from "../lib/staff-session";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function CounterQueuePanel() {
  const [tickets, setTickets] = useState<CounterQueueTicket[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void refresh();
    const handle = window.setInterval(() => void refresh(), 20000);
    return () => window.clearInterval(handle);
  }, []);

  async function refresh() {
    const [queueRes, ordersRes] = await Promise.all([
      fetch(`${apiUrl}/counter/queue`),
      fetch(`${apiUrl}/orders`)
    ]);
    if (queueRes.ok) setTickets((await queueRes.json() as { tickets: CounterQueueTicket[] }).tickets);
    if (ordersRes.ok) setOrders((await ordersRes.json() as { orders: Order[] }).orders);
  }

  async function acknowledge(ticket: CounterQueueTicket) {
    await fetch(`${apiUrl}/counter/queue/${ticket.orderId}/acknowledge`, {
      method: "POST",
      headers: staffAuthHeaders(["cashier"]),
      body: JSON.stringify({ staffName: "Web counter" })
    });
    setMessage(`${ticket.orderNumber} acknowledged — you're serving this customer.`);
    await refresh();
  }

  async function resolve(ticket: CounterQueueTicket) {
    await fetch(`${apiUrl}/counter/queue/${ticket.orderId}/resolve`, { method: "POST", headers: staffAuthHeaders(["cashier"], false) });
    setMessage(`${ticket.orderNumber} done at the counter — it continues in the production queue.`);
    await refresh();
  }

  return (
    <article className="card glossy section-gold">
      <div className="section-head">
        <div>
          <span className="status">walk-in queue</span>
          <h2>Waiting for counter</h2>
        </div>
        <button className="secondary compact" onClick={() => void refresh()} type="button">Refresh</button>
      </div>
      {tickets.length === 0 ? <p>No customers waiting.</p> : null}
      <div className="compact-list">
        {tickets.map((ticket) => {
          const order = orders.find((item) => item.id === ticket.orderId);
          const isOpen = openId === ticket.id;
          return (
            <div className={`rule-row queue-${ticket.status}`} key={ticket.id} style={{ display: "block" }}>
              <button className="counter-ticket-head" type="button" onClick={() => setOpenId(isOpen ? null : ticket.id)}>
                <div>
                  <strong>{ticket.position}. {ticket.orderNumber} — {ticket.customerName}</strong>
                  <p>{ticket.department.replaceAll("_", " ")} | {ticket.status} | {new Date(ticket.createdAt).toLocaleTimeString()}</p>
                </div>
                <span aria-hidden>{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && order ? (
                <div className="counter-ticket-detail">
                  <p className="muted-note">{order.customer.mobile}{order.customer.email ? ` · ${order.customer.email}` : ""}</p>
                  <ul className="counter-items">
                    {order.items.map((item) => (
                      <li key={item.id}>{item.quantity} × {item.productName}
                        {Object.values(item.selectedOptions ?? {}).filter(Boolean).length ? ` (${Object.values(item.selectedOptions).filter(Boolean).join(", ")})` : ""}
                        <span> — R{item.lineTotal.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  <p>
                    <strong>Total R{order.total.toFixed(2)}</strong>
                    {order.requiredDeposit > 0 ? ` · Deposit R${order.requiredDeposit.toFixed(2)}` : ""}
                    {` · Balance R${order.balanceDue.toFixed(2)}`} · {order.paymentStatus.replaceAll("_", " ")}
                  </p>
                  {order.awaitingPayment ? (
                    <p className="form-error">Deposit not paid — take the deposit to release this order to production.</p>
                  ) : null}
                  <div className="row">
                    {ticket.status === "waiting" || ticket.status === "escalated" ? (
                      <button className="secondary compact" type="button" onClick={() => void acknowledge(ticket)}>Acknowledge</button>
                    ) : null}
                    <a className="button secondary compact" href="/pos">Take payment</a>
                    <a className="button secondary compact" href={`/invoice/${order.id}`}>Invoice</a>
                    <button className="compact" type="button" onClick={() => void resolve(ticket)}>Done — resolve</button>
                  </div>
                </div>
              ) : null}

              {isOpen && !order ? <p className="muted-note">Order details unavailable (it may have been removed).</p> : null}
            </div>
          );
        })}
      </div>
      {message ? <div className="quote-result"><span>{message}</span></div> : null}
    </article>
  );
}
