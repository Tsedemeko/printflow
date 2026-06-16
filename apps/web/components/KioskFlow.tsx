"use client";

import { catalog, calculateRequiredDeposit, priceQuote } from "@printflow/shared";
import type { CatalogProduct, CounterQueueTicket, ProductCategory } from "@printflow/shared";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const categories: { id: ProductCategory; label: string; description: string }[] = [
  { id: "apparel", label: "Apparel, Sublimation & Fashion", description: "T-shirts, golf, hoodies, tracksuits, kits, school uniforms, embroidery, overalls, jumpsuits, wedding & traditional dress, trousers." },
  { id: "signage", label: "Banners & Signage", description: "X-banners, flag banners, pull-ups, corex boards, gazebos, pop-up walls." },
  { id: "promotional", label: "Branding & Promo", description: "Umbrellas, table cloths, oval boards, and branded gifts." }
];

type Step = "categories" | "products" | "customize" | "customer" | "ticket" | "collect";

export function KioskFlow() {
  const [products, setProducts] = useState<CatalogProduct[]>(catalog.filter((item) => item.enabled ?? true));
  const [step, setStep] = useState<Step>("categories");
  const [category, setCategory] = useState<ProductCategory>("apparel");
  const [productId, setProductId] = useState(catalog.find((item) => item.category === "apparel")?.id ?? catalog[0]!.id);
  const [quantity, setQuantity] = useState(1);
  const [customer, setCustomer] = useState({ name: "", mobile: "", email: "" });
  const [ticket, setTicket] = useState<{ orderNumber: string; uploadUrl: string; counterTicket?: CounterQueueTicket | undefined } | null>(null);
  const [lookup, setLookup] = useState("");
  const [lookupResult, setLookupResult] = useState("");
  const product = products.find((item) => item.id === productId) ?? products[0] ?? catalog[0]!;
  const selectedOptions = useMemo(() => firstOptions(product), [product]);
  const quote = useMemo(() => priceQuote([{ productId: product.id, quantity, selectedOptions }], undefined, products), [product.id, products, quantity, selectedOptions]);
  const deposit = calculateRequiredDeposit(quote.total, quote.items);

  useEffect(() => {
    fetch(`${apiUrl}/catalog/products`)
      .then((response) => response.json())
      .then((payload: { products: CatalogProduct[] }) => {
        const enabled = payload.products.filter((item) => item.enabled ?? true);
        setProducts(enabled);
        const first = enabled.find((item) => item.category === category) ?? enabled[0];
        if (first) setProductId(first.id);
      })
      .catch(() => undefined);
  }, []);

  async function createPreOrder() {
    const response = await fetch(`${apiUrl}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "kiosk",
        customer,
        items: [{ productId: product.id, quantity, selectedOptions }]
      })
    });
    const payload = await response.json() as { order: { id: string; orderNumber: string }; counterTicket?: CounterQueueTicket };
    setTicket({ orderNumber: payload.order.orderNumber, uploadUrl: `/upload/${payload.order.id}`, counterTicket: payload.counterTicket });
    setStep("ticket");
  }

  async function lookupOrder() {
    const response = await fetch(`${apiUrl}/orders/lookup/${encodeURIComponent(lookup)}`);
    if (!response.ok) {
      setLookupResult("We could not find that order. Please check the number or ask a staff member.");
      return;
    }
    const payload = await response.json() as { order: { orderNumber: string; status: string; balanceDue: number } };
    setLookupResult(`${payload.order.orderNumber} is ${payload.order.status.replaceAll("_", " ")}. Balance due: R${payload.order.balanceDue.toFixed(2)}.`);
  }

  if (step === "products") {
    return (
      <section>
        <KioskHeader title={categories.find((item) => item.id === category)?.label ?? "Products"} action={<button className="secondary" onClick={() => setStep("categories")} type="button">Back</button>} />
        <div className="kiosk-services">
          {products.filter((item) => item.category === category).map((item, index) => (
            <button
              className={`kiosk-service as-button color-${(index % 5) + 1}`}
              key={item.id}
              onClick={() => {
                setProductId(item.id);
                setStep("customize");
              }}
              type="button"
            >
              <span className="status">product</span>
              <h2>{item.name}</h2>
              <p>{item.description}</p>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (step === "customize") {
    return (
      <section>
        <KioskHeader title={product.name} action={<button className="secondary" onClick={() => setStep("products")} type="button">Back</button>} />
        <div className="wizard glossy">
          <div className="quote-layout">
            <div className={`placement-mock ${product.category}`}>
              <div className="mock-surface"><div className="artwork-placement">ART</div></div>
              <span className="mock-caption">Customer placement preview</span>
            </div>
            <div>
              <p>{product.description}</p>
              <div className="catalog-subitems">
                {Object.entries(product.options).flatMap(([group, options]) => options.slice(0, 4).map((option) => (
                  <span className="badge" key={`${group}-${option.id}`}>{option.label}</span>
                )))}
              </div>
              <label>Quantity<input min={1} type="number" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
              <p>Total: <strong>R{quote.total.toFixed(2)}</strong> | Deposit: <strong>R{deposit.amount.toFixed(2)}</strong></p>
              <button onClick={() => setStep("customer")} type="button">Continue</button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (step === "customer") {
    return (
      <section>
        <KioskHeader title="Create your pre-order" action={<button className="secondary" onClick={() => setStep("customize")} type="button">Back</button>} />
        <div className="wizard glossy">
          <div className="form-grid">
            <label>Name<input value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} /></label>
            <label>Mobile<input value={customer.mobile} onChange={(event) => setCustomer({ ...customer, mobile: event.target.value })} /></label>
            <label>Email<input value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} /></label>
          </div>
          <button disabled={!customer.name || !customer.mobile} onClick={() => void createPreOrder()} type="button">Create queue ticket</button>
        </div>
      </section>
    );
  }

  if (step === "ticket") {
    return (
      <section>
        <KioskHeader title="Queue ticket created" />
        <div className="upload-panel glossy">
          <strong className="amount">{ticket?.orderNumber}</strong>
          <p>You are checked in and staff have been alerted. Your queue position is {ticket?.counterTicket?.position ?? 1}. If the counter is unattended, this ticket will escalate to the owner or manager automatically.</p>
          {ticket && typeof window !== "undefined" ? (
            <div className="qr-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Scan to upload your artwork" width={180} height={180}
                src={`/qr?data=${encodeURIComponent(`${window.location.origin}${ticket.uploadUrl}`)}`} />
              <span className="muted-note">Scan with your phone to upload your artwork now</span>
            </div>
          ) : null}
          <div className="row">
            <a className="button" href={ticket?.uploadUrl ?? "/order"}>Open upload link</a>
            <button className="secondary" onClick={() => setStep("categories")} type="button">Start another order</button>
          </div>
        </div>
      </section>
    );
  }

  if (step === "collect") {
    return (
      <section>
        <KioskHeader title="Collect existing order" action={<button className="secondary" onClick={() => setStep("categories")} type="button">Back</button>} />
        <div className="wizard glossy">
          <label>Order number or mobile<input value={lookup} onChange={(event) => setLookup(event.target.value)} /></label>
          <button onClick={() => void lookupOrder()} type="button">Check status</button>
          {lookupResult ? <div className="quote">{lookupResult}</div> : null}
        </div>
      </section>
    );
  }

  return (
    <section>
      <KioskHeader title="What can we help you print today?" />
      <div className="kiosk-services">
        {categories.map((item, index) => (
          <button
            className={`kiosk-service as-button color-${index + 1}`}
            key={item.id}
            onClick={() => {
              setCategory(item.id);
              setProductId(products.find((product) => product.category === item.id)?.id ?? products[0]?.id ?? catalog[0]!.id);
              setStep("products");
            }}
            type="button"
          >
            <span className="status">category</span>
            <h2>{item.label}</h2>
            <p>{item.description}</p>
          </button>
        ))}
        <button className="kiosk-service as-button collect" onClick={() => setStep("collect")} type="button">
          <span className="status">pickup</span>
          <h2>Collect Existing Order</h2>
          <p>Check whether your order is ready before going to the counter.</p>
        </button>
      </div>
    </section>
  );
}

function KioskHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <section className="kiosk-hero">
      <div>
        <span className="eyebrow">Public walk-in kiosk</span>
        <h1>{title}</h1>
      </div>
      {action ?? <a className="button secondary" href="/login">Staff login</a>}
    </section>
  );
}

function firstOptions(product: CatalogProduct): Record<string, string> {
  return Object.fromEntries(Object.entries(product.options).map(([group, options]) => [group, options[0]?.id ?? ""]));
}
