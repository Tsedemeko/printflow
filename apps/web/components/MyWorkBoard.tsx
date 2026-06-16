"use client";

import { statusLabel, workflowColumns } from "@printflow/shared";
import type { Order } from "@printflow/shared";
import { useEffect, useState } from "react";
import { readStaffSession, staffAuthHeaders, type StaffSession } from "../lib/staff-session";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const DONE = new Set(["completed", "cancelled"]);
const CLAIMABLE = new Set(["new", "awaiting_artwork", "design_review", "approved"]);

export function MyWorkBoard() {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"mine" | "unclaimed">("mine");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setSession(readStaffSession());
    void refresh();
  }, []);

  async function refresh() {
    const response = await fetch(`${apiUrl}/orders`, { cache: "no-store" });
    if (response.ok) {
      const payload = await response.json() as { orders: Order[] };
      setOrders(payload.orders);
    }
  }

  const myId = session?.id;
  const mine = orders.filter((order) => myId && order.staffAssigneeId === myId && !DONE.has(order.status));
  const unclaimed = orders.filter((order) => !order.staffAssigneeId && CLAIMABLE.has(order.status));

  async function claim(order: Order) {
    if (!myId) return;
    setBusy(order.id);
    await fetch(`${apiUrl}/orders/${order.id}`, {
      method: "PATCH",
      headers: staffAuthHeaders(["designer"]),
      body: JSON.stringify({ staffAssigneeId: myId })
    });
    await refresh();
    setBusy(null);
    setTab("mine");
  }

  async function advance(order: Order) {
    const index = workflowColumns.findIndex((column) => column.status === order.status);
    const next = workflowColumns[index + 1]?.status;
    if (!next) return;
    setBusy(order.id);
    await fetch(`${apiUrl}/orders/${order.id}/status`, {
      method: "POST",
      headers: staffAuthHeaders(["designer"]),
      body: JSON.stringify({ status: next })
    });
    await refresh();
    setBusy(null);
  }

  function nextLabel(order: Order): string | null {
    const index = workflowColumns.findIndex((column) => column.status === order.status);
    const next = workflowColumns[index + 1]?.status;
    return next ? statusLabel(next) : null;
  }

  const list = tab === "mine" ? mine : unclaimed;

  return (
    <>
      <div className="work-tabs">
        <button className={tab === "mine" ? "" : "secondary"} onClick={() => setTab("mine")} type="button">
          My active jobs ({mine.length})
        </button>
        <button className={tab === "unclaimed" ? "" : "secondary"} onClick={() => setTab("unclaimed")} type="button">
          Unclaimed ({unclaimed.length})
        </button>
        <button className="secondary" onClick={() => void refresh()} type="button">Refresh</button>
      </div>

      {!myId && tab === "mine" ? (
        <p className="muted-note">
          You are signed in as a local-dev user without a staff profile, so no jobs are linked to you.
          Sign in with a real staff email to see jobs assigned to you, or open the Unclaimed tab.
        </p>
      ) : null}

      {list.length === 0 ? (
        <p className="muted-note">{tab === "mine" ? "No active jobs assigned to you." : "No unclaimed jobs right now."}</p>
      ) : (
        <div className="job-grid">
          {list.map((order) => {
            const next = nextLabel(order);
            return (
              <article className="card glossy job-card" key={order.id}>
                <div className="job-head">
                  <h3>{order.orderNumber}</h3>
                  <span className="chip">{statusLabel(order.status)}</span>
                </div>
                <p className="muted-note">
                  {order.customer.name} · {order.queueName.replaceAll("_", " ")}
                  {order.rush ? " · ⚡ Rush" : ""}
                </p>
                <p className="muted-note">Balance due: R{order.balanceDue.toFixed(2)}</p>

                <div className="row">
                  <a className="button secondary compact" href={`/upload/${order.id}`}>Artwork</a>
                  <a className="button secondary compact" href={`/invoice/${order.id}`}>Invoice</a>
                  {tab === "unclaimed" ? (
                    <button className="compact" disabled={busy === order.id} onClick={() => void claim(order)} type="button">
                      Claim job
                    </button>
                  ) : next ? (
                    <button className="compact" disabled={busy === order.id} onClick={() => void advance(order)} type="button">
                      Move to {next}
                    </button>
                  ) : null}
                </div>

                {order.activityLog.length > 0 ? (
                  <div className="activity-log">
                    <ul>
                      {order.activityLog.slice(0, 3).map((event) => (
                        <li key={event.id}>{event.message}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
