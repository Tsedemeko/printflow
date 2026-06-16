import { PortalShell } from "../../components/PortalShell";
import { PosTerminal } from "../../components/PosTerminal";
import { getOrders } from "../../lib/api-data";

export default async function POSPage() {
  const orders = await getOrders();

  return (
    <PortalShell eyebrow="Counter station" title="Point of sale">
      <PosTerminal initialOrders={orders} />
    </PortalShell>
  );
}
