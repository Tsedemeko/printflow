import type { Metadata } from "next";
import { OrderWizard } from "./OrderWizard";

export const metadata: Metadata = {
  title: "Order Custom Apparel, Sublimation & Banners Online",
  description:
    "Order sublimation t-shirts, golf shirts, hoodies, tracksuits, sports kits, school uniforms, banners, and branding online from Finesse Fashion Design. Upload your artwork, preview pricing, and pay a deposit.",
  alternates: { canonical: "/order" }
};

export default function OrderPage() {
  return (
    <>
    <header className="public-topbar">
      <a className="brand" href="/">{/* eslint-disable-next-line @next/next/no-img-element */}<img className="brand-img" src="/finesse-logo.png" alt="Finesse Fashion Design" /></a>
      <nav className="nav">
        <a href="/kiosk">Kiosk</a>
        <a href="/login">Staff login</a>
      </nav>
    </header>
    <main className="page order-page">
      <span className="eyebrow">Online customer portal</span>
      <h1>Start your custom order</h1>
      <p>Order embroidery, heat press, and custom garments without creating an account — upload artwork, preview pricing, save a draft, and pay a deposit or full amount online.</p>
      <OrderWizard />
    </main>
    </>
  );
}
