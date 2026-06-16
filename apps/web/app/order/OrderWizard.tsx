"use client";

import { catalog, calculateRequiredDeposit, priceQuote } from "@printflow/shared";
import type { CatalogProduct } from "@printflow/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DesignStudio } from "../../components/DesignStudio";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const DRAFT_KEY = "finesse.order.draft";

export function OrderWizard() {
  const [products, setProducts] = useState<CatalogProduct[]>(catalog.filter((item) => item.enabled ?? true));
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [lines, setLines] = useState([{ id: "line-1", quantity: 1, selectedOptions: firstOptions(products[0] ?? catalog[0]!) }]);
  const [customer, setCustomer] = useState({ name: "", mobile: "", email: "" });
  const [caption, setCaption] = useState("");
  const [result, setResult] = useState<{ id: string; orderNumber: string; message: string } | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const product = products.find((item) => item.id === productId) ?? products[0] ?? catalog[0]!;
  const quoteInputs = useMemo(() => lines.filter((line) => line.quantity > 0).map((line) => ({ productId, quantity: line.quantity, selectedOptions: line.selectedOptions })), [lines, productId]);
  const quote = useMemo(() => priceQuote(quoteInputs, undefined, products), [quoteInputs, products]);
  const deposit = calculateRequiredDeposit(quote.total, quote.items);

  useEffect(() => {
    const hasDraft = typeof window !== "undefined" && !!window.localStorage.getItem(DRAFT_KEY);
    fetch(`${apiUrl}/catalog/products`)
      .then((response) => response.json())
      .then((payload: { products: CatalogProduct[] }) => {
        const enabled = payload.products.filter((item) => item.enabled ?? true);
        setProducts(enabled);
        if (enabled[0] && !hasDraft) {
          setProductId(enabled[0].id);
          setLines([{ id: "line-1", quantity: 1, selectedOptions: firstOptions(enabled[0]) }]);
        }
      })
      .catch(() => undefined);
  }, []);

  // Restore a saved draft on first load.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as { customer?: typeof customer; productId?: string; lines?: typeof lines; caption?: string };
      if (draft.customer) setCustomer(draft.customer);
      if (draft.productId) setProductId(draft.productId);
      if (draft.lines?.length) setLines(draft.lines);
      if (draft.caption) setCaption(draft.caption);
      setDraftRestored(true);
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  function saveDraft() {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ customer, productId, lines, caption }));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2500);
  }

  function clearDraft() {
    if (typeof window !== "undefined") window.localStorage.removeItem(DRAFT_KEY);
    setDraftRestored(false);
  }

  const onCaption = useCallback((value: string) => setCaption(value), []);

  function chooseProduct(nextProductId: string) {
    const nextProduct = products.find((item) => item.id === nextProductId) ?? product;
    setProductId(nextProductId);
    setLines([{ id: "line-1", quantity: 1, selectedOptions: firstOptions(nextProduct) }]);
  }

  function addLine() {
    setLines((current) => [...current, { id: `line-${Date.now()}`, quantity: 1, selectedOptions: firstOptions(product) }]);
  }

  function updateLine(lineId: string, patch: Partial<{ quantity: number; selectedOptions: Record<string, string> }>) {
    setLines((current) => current.map((line) => line.id === lineId ? { ...line, ...patch } : line));
  }

  function updateOption(lineId: string, group: string, value: string) {
    setLines((current) => current.map((line) => line.id === lineId ? { ...line, selectedOptions: { ...line.selectedOptions, [group]: value } } : line));
  }

  async function createOrder(intent: "save" | "upload" | "payfast" | "yoco") {
    const items = quoteInputs.map((item, index) => index === 0 && caption
      ? { ...item, specialInstructions: `Design caption: ${caption}` }
      : item);
    const response = await fetch(`${apiUrl}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "online",
        customer,
        items
      })
    });
    const payload = await response.json() as { order: { id: string; orderNumber: string } };
    clearDraft();
    if (intent === "yoco") {
      const checkout = await fetch(`${apiUrl}/payments/yoco/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: payload.order.id })
      });
      if (checkout.ok) {
        const data = await checkout.json() as { redirectUrl?: string };
        if (data.redirectUrl) { window.location.href = data.redirectUrl; return; }
      }
    } else if (intent === "payfast") {
      await fetch(`${apiUrl}/payments/payfast/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: payload.order.id })
      });
    }
    setResult({
      id: payload.order.id,
      orderNumber: payload.order.orderNumber,
      message: intent === "payfast" ? "Order created and PayFast checkout prepared."
        : intent === "yoco" ? "Order created. Yoco checkout could not start — use the artwork link or try again."
        : intent === "upload" ? "Order created and secure artwork link is ready." : "Order created."
    });
  }

  return (
    <div className="wizard">
      {draftRestored ? (
        <div className="draft-banner">
          <span>We restored your saved draft.</span>
          <button className="secondary compact" type="button" onClick={clearDraft}>Start fresh</button>
        </div>
      ) : null}
      <div className="form-grid">
        <label>
          Customer name
          <input value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} placeholder="Customer name" />
        </label>
        <label>
          Mobile number
          <input value={customer.mobile} onChange={(event) => setCustomer({ ...customer, mobile: event.target.value })} placeholder="+27..." />
        </label>
        <label>
          Email
          <input value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} placeholder="customer@example.com" />
        </label>
        <label>
          Product
          <select value={productId} onChange={(event) => chooseProduct(event.target.value)}>
            {products.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
        </label>
      </div>
      <section className="order-lines">
        <div className="section-head">
          <h2>Sizes, options, and quantities</h2>
          <button className="secondary compact" onClick={addLine} type="button">Add another quantity line</button>
        </div>
        {lines.map((line, index) => (
          <div className="order-line" key={line.id}>
            <strong>Line {index + 1}</strong>
            <label>Quantity<input min={0} type="number" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Number(event.target.value) })} /></label>
            {Object.entries(product.options).map(([group, options]) => (
              <label key={group}>{group.replaceAll("_", " ")}
                <select value={line.selectedOptions[group] ?? options[0]?.id ?? ""} onChange={(event) => updateOption(line.id, group, event.target.value)}>
                  {options.map((option) => <option key={option.id} value={option.id}>{option.label}{option.priceDelta ? ` +R${option.priceDelta}` : ""}</option>)}
                </select>
              </label>
            ))}
            {lines.length > 1 ? <button className="secondary compact" type="button" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}>Remove</button> : null}
          </div>
        ))}
      </section>
      <div className="quote">
        <div className="quote-layout">
          <DesignStudio category={product?.category ?? "apparel"} onCaptionChange={onCaption} />
          <div>
            <h3>{product?.name}</h3>
            <p>{product?.description}</p>
            <p>Department queue: <strong>{product?.department.replaceAll("_", " ")}</strong></p>
            <p>Total: <strong>R{quote.total.toFixed(2)}</strong> | Required deposit: <strong>R{deposit.amount.toFixed(2)}</strong></p>
            <div className="row">
              <button disabled={!customer.name || !customer.mobile || quoteInputs.length === 0} onClick={() => void createOrder("save")} type="button">Create order</button>
              <button disabled={!customer.name || !customer.mobile || quoteInputs.length === 0} onClick={() => void createOrder("upload")} type="button" className="secondary">Create upload link</button>
              <button disabled={!customer.name || !customer.mobile || quoteInputs.length === 0} onClick={() => void createOrder("payfast")} type="button" className="secondary">Pay with PayFast</button>
              <button disabled={!customer.name || !customer.mobile || quoteInputs.length === 0} onClick={() => void createOrder("yoco")} type="button" className="secondary">Pay with Yoco</button>
              <button onClick={saveDraft} type="button" className="secondary">{draftSaved ? "Draft saved ✓" : "Save draft"}</button>
            </div>
            {result ? (
              <div className="quote-result">
                <strong>{result.orderNumber}</strong>
                <span>{result.message}</span>
                <a href={`/upload/${result.id}`}>Open artwork link</a>
                {typeof window !== "undefined" ? (
                  <div className="qr-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="Scan to upload artwork" width={140} height={140}
                      src={`/qr?data=${encodeURIComponent(`${window.location.origin}/upload/${result.id}`)}`} />
                    <span className="muted-note">Scan to upload artwork from your phone</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function firstOptions(product: CatalogProduct): Record<string, string> {
  return Object.fromEntries(Object.entries(product.options).map(([group, options]) => [group, options[0]?.id ?? ""]));
}
