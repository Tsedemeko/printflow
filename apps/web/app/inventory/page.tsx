import { PortalShell } from "../../components/PortalShell";
import { InventoryManager } from "../../components/InventoryManager";
import { getInventory } from "../../lib/api-data";

export default async function InventoryPage() {
  const inventory = await getInventory();

  return (
    <PortalShell eyebrow="Stock control" title="Inventory">
      <InventoryManager initialItems={inventory} />
    </PortalShell>
  );
}
