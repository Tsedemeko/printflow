import { PortalShell } from "../../components/PortalShell";
import { CounterQueuePanel } from "../../components/CounterQueuePanel";
import { getAdminData } from "../../lib/api-data";

export default async function AdminPage() {
  const data = await getAdminData();

  return (
    <PortalShell eyebrow="Business command center" title="Dashboard">
      <section className="metrics">
        <div className="metric glossy">Sales today<strong>R{data.metrics.totalSales.toLocaleString()}</strong></div>
        <div className="metric glossy">Active jobs<strong>{data.metrics.activeOrders}</strong></div>
        <div className="metric glossy">Average order<strong>R{data.metrics.averageOrderValue.toFixed(2)}</strong></div>
        <div className="metric glossy">Outstanding<strong>R{data.metrics.outstandingBalances.toFixed(2)}</strong></div>
      </section>
      <section className="admin-grid">
        <CounterQueuePanel />
        <article className="card glossy section-gold">
          <h2>Staff alerts</h2>
          <p>New kiosk customer waiting, artwork uploaded, design proofs pending, low-stock warnings.</p>
        </article>
        <article className="card glossy section-green">
          <h2>Catalog, pricing &amp; deposits</h2>
          <p>Manage your service catalog, deposit rules, and bulk discounts under <a href="/settings">Settings</a>.</p>
        </article>
        <article className="card glossy">
          <h2>Owner controls</h2>
          <p>Use Orders, Staff &amp; Roles, Inventory, Reports, and production views for day-to-day operations.</p>
        </article>
      </section>
    </PortalShell>
  );
}
