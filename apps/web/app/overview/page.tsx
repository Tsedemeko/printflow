import { PortalShell } from "../../components/PortalShell";
import { statusLabel } from "@printflow/shared";
import {
  getInventory,
  getOrders,
  getProductionBoard,
  getReportMetrics
} from "../../lib/api-data";

const ACTIVE_STATUSES = new Set([
  "new",
  "awaiting_artwork",
  "design_review",
  "approved",
  "in_production",
  "quality_check"
]);

export default async function OverviewPage() {
  const [metrics, orders, board, inventory] = await Promise.all([
    getReportMetrics(),
    getOrders(),
    getProductionBoard(),
    getInventory()
  ]);

  const ready = orders.filter((order) => order.status === "ready_for_collection");
  const rush = orders.filter((order) => order.rush && order.status !== "completed" && order.status !== "cancelled");
  const outstanding = orders
    .filter((order) => order.balanceDue > 0 && order.status !== "cancelled")
    .sort((a, b) => b.balanceDue - a.balanceDue)
    .slice(0, 6);
  const lowStock = inventory.filter((item) => item.quantityOnHand <= item.reorderPoint);
  const maxStage = Math.max(1, ...board.map((column) => column.orders.length));

  return (
    <PortalShell eyebrow="Live shop status" title="Owner overview">
      <p className="muted-note">A phone-friendly snapshot of the whole shop — money, jobs in motion, what needs attention.</p>

      <section className="metrics">
        <div className="metric glossy">Sales to date<strong>R{metrics.totalSales.toLocaleString()}</strong></div>
        <div className="metric glossy">Active jobs<strong>{orders.filter((order) => ACTIVE_STATUSES.has(order.status)).length}</strong></div>
        <div className="metric glossy">Outstanding<strong>R{metrics.outstandingBalances.toLocaleString()}</strong></div>
        <div className="metric glossy">Ready to collect<strong>{ready.length}</strong></div>
      </section>

      <section className="card glossy ov-section">
        <h2>Jobs by stage</h2>
        <div className="stage-strip" style={{ marginTop: 12 }}>
          {board.map((column) => (
            <div className="stage-pill" key={column.status}>
              <span className="muted-note">{column.label}</span>
              <strong>{column.orders.length}</strong>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          {board.map((column) => (
            <div className="ov-row" key={`bar-${column.status}`}>
              <span style={{ minWidth: 120 }}>{column.label}</span>
              <div className="ov-bar"><span style={{ width: `${(column.orders.length / maxStage) * 100}%` }} /></div>
              <span className="pill">{column.orders.length}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="admin-grid ov-section">
        <section className="card glossy">
          <h2>Rush jobs ({rush.length})</h2>
          {rush.length === 0 ? <p className="muted-note">No rush jobs right now.</p> : null}
          {rush.map((order) => (
            <div className="ov-row" key={order.id}>
              <span>{order.orderNumber} · {order.customer.name}</span>
              <span className="pill">{statusLabel(order.status)}</span>
            </div>
          ))}
        </section>

        <section className="card glossy">
          <h2>Ready for collection ({ready.length})</h2>
          {ready.length === 0 ? <p className="muted-note">Nothing waiting for collection.</p> : null}
          {ready.map((order) => (
            <div className="ov-row" key={order.id}>
              <span>{order.orderNumber} · {order.customer.name}</span>
              <span className="pill">{order.customer.mobile}</span>
            </div>
          ))}
        </section>

        <section className="card glossy">
          <h2>Outstanding balances</h2>
          {outstanding.length === 0 ? <p className="muted-note">All balances settled.</p> : null}
          {outstanding.map((order) => (
            <div className="ov-row" key={order.id}>
              <span>{order.orderNumber} · {order.customer.name}</span>
              <span className="pill">R{order.balanceDue.toFixed(2)}</span>
            </div>
          ))}
        </section>

        <section className="card glossy">
          <h2>Low stock ({lowStock.length})</h2>
          {lowStock.length === 0 ? <p className="muted-note">Stock levels are healthy.</p> : null}
          {lowStock.map((item) => (
            <div className="ov-row" key={item.id}>
              <span>{item.name}</span>
              <span className="pill">{item.quantityOnHand} / {item.reorderPoint}</span>
            </div>
          ))}
        </section>
      </div>
    </PortalShell>
  );
}
