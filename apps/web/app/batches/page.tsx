import { PortalShell } from "../../components/PortalShell";
import { getProductionBatches } from "../../lib/api-data";

export default async function BatchesPage() {
  const batches = await getProductionBatches();

  return (
    <PortalShell eyebrow="Machine optimisation" title="Production batches">
      <p className="muted-note">Similar jobs grouped by material/print type so operators can run them together (e.g. all black t-shirts, all A2 canvas).</p>
      {batches.length === 0 ? <p className="muted-note">No active batches.</p> : null}
      <section className="cards compact-cards">
        {batches.map((batch) => (
          <article className="card glossy compact-card" key={batch.batchKey}>
            <span className="status">{batch.batchKey.replaceAll("_", " ")}</span>
            <h2>{batch.totalQuantity} items</h2>
            <p className="muted-note">{batch.orderNumbers.length} order{batch.orderNumbers.length === 1 ? "" : "s"}</p>
            <p>{batch.orderNumbers.join(", ")}</p>
          </article>
        ))}
      </section>
    </PortalShell>
  );
}
