"use client";

import { workflowColumns } from "@printflow/shared";
import type { Order, OrderStatus } from "@printflow/shared";
import { useEffect, useState } from "react";
import { staffAuthHeaders } from "../lib/staff-session";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface BoardColumn {
  status: OrderStatus;
  label: string;
  orders: Order[];
}

export function ProductionBoard({ initialColumns }: { initialColumns: BoardColumn[] }) {
  const [columns, setColumns] = useState(initialColumns);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const response = await fetch(`${apiUrl}/production/board`);
    if (response.ok) {
      const payload = await response.json() as { columns: BoardColumn[] };
      setColumns(payload.columns);
    }
  }

  async function move(order: Order) {
    const currentIndex = workflowColumns.findIndex((column) => column.status === order.status);
    const nextStatus = workflowColumns[currentIndex + 1]?.status;
    if (!nextStatus) return;
    await fetch(`${apiUrl}/orders/${order.id}/status`, {
      method: "POST",
      headers: staffAuthHeaders(["designer"]),
      body: JSON.stringify({ status: nextStatus })
    });
    await refresh();
  }

  async function sendProof(order: Order) {
    await fetch(`${apiUrl}/proofs/${order.id}/send`, { method: "POST", headers: staffAuthHeaders(["designer"], false) });
    await refresh();
  }

  return (
    <div className="board">
      {columns.slice(0, 8).map((column) => (
        <section className={`board-column glossy column-${column.status}`} key={column.status}>
          <h3 className="board-column-title">{column.label} <span className="board-count">{column.orders.length}</span></h3>
          <div className="board-column-body">
            {column.orders.map((order) => (
              <article className={`job glossy job-${order.status}`} key={order.id}>
                <span className="status">{order.queueName.replaceAll("_", " ")}</span>
                <h3>{order.orderNumber}</h3>
                <p>{order.customer.name} | Balance R{order.balanceDue.toFixed(2)}</p>
                {order.dueAt ? <p className="due-line">Due {new Date(order.dueAt).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}</p> : null}
                <span className="badge">{order.items[0]?.batchKey}</span>
                <div className="row">
                  <a className="button secondary compact" href={`/upload/${order.id}`}>View</a>
                  <button className="secondary compact" onClick={() => void move(order)} type="button">Move</button>
                  <button className="secondary compact" onClick={() => void sendProof(order)} type="button">Proof</button>
                </div>
              </article>
            ))}
            {column.orders.length === 0 ? <p>No jobs in this stage.</p> : null}
          </div>
        </section>
      ))}
    </div>
  );
}
