import { PortalShell } from "../../components/PortalShell";
import { ProductionBoard } from "../../components/ProductionBoard";
import { getProductionBoard } from "../../lib/api-data";

export default async function ProductionPage() {
  const initialColumns = await getProductionBoard();

  return (
    <PortalShell eyebrow="Production workspace" title="Production board">
      <ProductionBoard initialColumns={initialColumns} />
    </PortalShell>
  );
}
