import { PortalShell } from "../../components/PortalShell";
import { OrdersManager } from "../../components/OrdersManager";
import { getOrders } from "../../lib/api-data";

export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <PortalShell eyebrow="Order control" title="Orders">
      <OrdersManager initialOrders={orders} />
    </PortalShell>
  );
}
