import { PortalShell } from "../../components/PortalShell";
import { getCatalogProducts, getOrders, getReportMetrics } from "../../lib/api-data";

export default async function ReportsPage() {
  const [metrics, orders, catalog] = await Promise.all([getReportMetrics(), getOrders(), getCatalogProducts()]);

  return (
    <PortalShell eyebrow="Owner reports" title="Reports">
      <section className="metrics">
        <div className="metric glossy">Daily sales<strong>R{metrics.totalSales.toLocaleString()}</strong></div>
        <div className="metric glossy">Outstanding<strong>R{metrics.outstandingBalances.toFixed(2)}</strong></div>
        <div className="metric glossy">Jobs ready<strong>{orders.filter((order) => order.status === "ready_for_collection").length}</strong></div>
        <div className="metric glossy">Catalog items<strong>{catalog.length}</strong></div>
      </section>
      <section className="card glossy">
        <h2>Daily management summary</h2>
        <p>Sales, category mix, outstanding balances, ready-for-collection jobs, low-stock items, and staff activity are prepared from the Finesse API data store.</p>
      </section>
    </PortalShell>
  );
}
