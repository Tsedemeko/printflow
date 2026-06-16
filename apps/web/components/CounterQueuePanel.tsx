"use client";

import type { CounterQueueTicket } from "@printflow/shared";
import { useEffect, useState } from "react";
import { staffAuthHeaders } from "../lib/staff-session";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function CounterQueuePanel() {
  const [tickets, setTickets] = useState<CounterQueueTicket[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void refresh();
    const handle = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(handle);
  }, []);

  async function refresh() {
    const response = await fetch(`${apiUrl}/counter/queue`);
    if (response.ok) {
      const payload = await response.json() as { tickets: CounterQueueTicket[] };
      setTickets(payload.tickets);
    }
  }

  async function acknowledge(ticket: CounterQueueTicket) {
    await fetch(`${apiUrl}/counter/queue/${ticket.orderId}/acknowledge`, {
      method: "POST",
      headers: staffAuthHeaders(["cashier"]),
      body: JSON.stringify({ staffName: "Web counter" })
    });
    setMessage(`${ticket.orderNumber} acknowledged.`);
    await refresh();
  }

  async function resolve(ticket: CounterQueueTicket) {
    await fetch(`${apiUrl}/counter/queue/${ticket.orderId}/resolve`, { method: "POST", headers: staffAuthHeaders(["cashier"], false) });
    setMessage(`${ticket.orderNumber} removed from waiting queue.`);
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
      {tickets.length === 0 ? <p>No kiosk customers waiting.</p> : null}
      <div className="compact-list">
        {tickets.map((ticket) => (
          <div className={`rule-row queue-${ticket.status}`} key={ticket.id}>
            <div>
              <strong>{ticket.position}. {ticket.orderNumber} - {ticket.customerName}</strong>
              <p>{ticket.department.replaceAll("_", " ")} | {ticket.status} | {new Date(ticket.createdAt).toLocaleTimeString()}</p>
            </div>
            <div className="row">
              <button className="secondary compact" type="button" onClick={() => void acknowledge(ticket)}>Acknowledge</button>
              <button className="secondary compact" type="button" onClick={() => void resolve(ticket)}>Resolve</button>
            </div>
          </div>
        ))}
      </div>
      {message ? <div className="quote-result"><span>{message}</span></div> : null}
    </article>
  );
}
