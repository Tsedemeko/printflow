import { statusLabel } from "@printflow/shared";
import { getOrder } from "../../../lib/api-data";
import { ProofApproval } from "../../../components/ProofApproval";

export default async function ProofPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = await getOrder(orderId);

  return (
    <>
      <header className="public-topbar">
        <a className="brand" href="/">{/* eslint-disable-next-line @next/next/no-img-element */}<img className="brand-img" src="/finesse-logo.png" alt="Finesse Fashion Design" /></a>
        <nav className="nav">
          <a href="/order">Online order</a>
          <a href="/login">Staff login</a>
        </nav>
      </header>
      <main className="page">
        <section className="upload-panel glossy">
          <span className="eyebrow">Design proof approval</span>
          {!order ? (
            <p className="muted-note">We couldn&apos;t find that order. Please check your link or contact the shop.</p>
          ) : (
            <>
              <h1>Approve your design — {order.orderNumber}</h1>
              <p>Please review the details below. Production only starts once you approve.</p>
              <div className="proof-summary">
                {order.items.map((item) => (
                  <div className="ov-row" key={item.id}>
                    <span>{item.quantity} × {item.productName}{Object.values(item.selectedOptions ?? {}).filter(Boolean).length ? ` (${Object.values(item.selectedOptions).filter(Boolean).join(", ")})` : ""}</span>
                    <span className="pill">R{item.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
                {order.artwork?.[0] ? <p className="muted-note">Artwork on file: {order.artwork[0].fileName}</p> : <p className="muted-note">No artwork uploaded yet.</p>}
                <p>Total: <strong>R{order.total.toFixed(2)}</strong> · Status: {statusLabel(order.status)}</p>
              </div>
              <ProofApproval orderId={order.id} alreadyApproved={order.proofs?.some((proof) => proof.status === "approved") ?? false} />
            </>
          )}
        </section>
      </main>
    </>
  );
}
