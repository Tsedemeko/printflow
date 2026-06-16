"use client";

import { statusLabel } from "@printflow/shared";
import type { Order } from "@printflow/shared";
import { useEffect, useMemo, useState } from "react";
import { staffAuthHeaders } from "../lib/staff-session";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const DONE = new Set(["completed", "cancelled"]);

interface RosterMember {
  id: string;
  name: string;
  role: string;
  roles: string[];
}

function ageLabel(iso: string): string {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function TeamBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const [ordersRes, rosterRes] = await Promise.all([
      fetch(`${apiUrl}/orders`, { cache: "no-store" }),
      fetch(`${apiUrl}/staff/roster`, { headers: staffAuthHeaders(["manager"], false), cache: "no-store" })
    ]);
    if (ordersRes.ok) setOrders(((await ordersRes.json()) as { orders: Order[] }).orders);
    if (rosterRes.ok) {
      setRoster(((await rosterRes.json()) as { roster: RosterMember[] }).roster);
      setError("");
    } else {
      setError("You need manager/production access to view the staff roster.");
    }
  }

  async function assign(orderId: string, staffId: string) {
    if (!staffId) return;
    setBusy(orderId);
    await fetch(`${apiUrl}/orders/${orderId}`, {
      method: "PATCH",
      headers: staffAuthHeaders(["manager"]),
      body: JSON.stringify({ staffAssigneeId: staffId })
    });
    await load();
    setBusy(null);
  }

  const active = useMemo(() => orders.filter((order) => !DONE.has(order.status)), [orders]);
  const unassigned = active.filter((order) => !order.staffAssigneeId);

  return (
    <>
      {error ? <p className="muted-note">{error}</p> : null}

      <section className="metrics" style={{ marginBottom: 8 }}>
        <div className="metric glossy">Team members<strong>{roster.length}</strong></div>
        <div className="metric glossy">Active jobs<strong>{active.length}</strong></div>
        <div className="metric glossy">Unassigned<strong>{unassigned.length}</strong></div>
        <div className="metric glossy">Completed<strong>{orders.filter((order) => order.status === "completed").length}</strong></div>
      </section>

      {unassigned.length > 0 ? (
        <section className="card glossy ov-section">
          <h2>Unassigned jobs ({unassigned.length})</h2>
          <p className="muted-note">Delegate these to a team member.</p>
          {unassigned.map((order) => (
            <div className="ov-row" key={order.id}>
              <span>{order.orderNumber} · {order.customer.name} {order.rush ? "· ⚡" : ""}</span>
              <span className="pill">{statusLabel(order.status)}</span>
              <select
                defaultValue=""
                disabled={busy === order.id || roster.length === 0}
                onChange={(event) => void assign(order.id, event.target.value)}
              >
                <option value="" disabled>Assign to…</option>
                {roster.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </div>
          ))}
        </section>
      ) : null}

      <div className="team-grid ov-section">
        {roster.map((member) => {
          const jobs = active.filter((order) => order.staffAssigneeId === member.id);
          const completed = orders.filter((order) => order.staffAssigneeId === member.id && order.status === "completed").length;
          const rush = jobs.filter((order) => order.rush).length;
          return (
            <article className="card glossy team-card" key={member.id}>
              <div className="job-head">
                <h3>{member.name}</h3>
                <span className="chip">{member.role.replaceAll("_", " ")}</span>
              </div>
              <div className="team-stats">
                <span><strong>{jobs.length}</strong> active</span>
                <span><strong>{rush}</strong> rush</span>
                <span><strong>{completed}</strong> done</span>
              </div>
              {jobs.length === 0 ? <p className="muted-note">No active jobs.</p> : null}
              {jobs.map((order) => {
                const last = order.activityLog[0];
                return (
                  <div className="team-job" key={order.id}>
                    <div className="ov-row">
                      <span>{order.orderNumber} · {order.customer.name}</span>
                      <span className="pill">{statusLabel(order.status)}</span>
                    </div>
                    <span className="muted-note">
                      {last ? last.message : "No activity yet"} · {ageLabel(order.updatedAt)} in stage
                    </span>
                  </div>
                );
              })}
            </article>
          );
        })}
      </div>

      {roster.length === 0 && !error ? <p className="muted-note">No active staff found.</p> : null}
    </>
  );
}
