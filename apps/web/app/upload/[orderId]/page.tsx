import { UploadArtworkForm } from "../../../components/UploadArtworkForm";

export default async function UploadPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
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
      <section className="upload-panel">
        <span className="eyebrow">Secure artwork link</span>
        <h1>Upload artwork</h1>
        <p>Order token: {orderId}. The upload action attaches artwork to the order, runs preflight checks, moves the order to design review, and notifies staff.</p>
        <UploadArtworkForm orderId={orderId} />
      </section>
    </main>
    </>
  );
}
