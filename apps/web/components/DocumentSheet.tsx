import { statusLabel } from "@printflow/shared";
import type { Order } from "@printflow/shared";
import { PrintButton } from "./PrintButton";
import { ShareInvoiceButton } from "./ShareInvoiceButton";

export const SHOP = {
  name: "Finesse Fashion Design Enterprise",
  tagline: "Embroidery · Heat Press · Custom Garment Design",
  regNo: "2019/128683/07",
  branches: [
    "Shop 12, 135 Pritchard Str, Johannesburg, RSA",
    "Shop 8, 17 Siemert Str, Doornfontein, RSA"
  ],
  phones: ["078 727 3283", "072 727 1087"]
};

const QUOTE_VALID_DAYS = 14;

function money(value: number) {
  return `R${value.toFixed(2)}`;
}

function formatDate(iso: string | number | Date) {
  return new Date(iso).toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" });
}

export function DocumentSheet({ order, kind }: { order: Order; kind: "invoice" | "quotation" }) {
  const isQuote = kind === "quotation";
  const heading = isQuote ? "QUOTATION" : "INVOICE";
  const number = `${isQuote ? "QUO" : "INV"}-${order.orderNumber.replace("#", "")}`;
  const paid = order.total - order.balanceDue;
  const issued = formatDate(order.createdAt);
  const validUntil = formatDate(new Date(order.createdAt).getTime() + QUOTE_VALID_DAYS * 86400000);

  return (
    <main className="invoice-page">
      <div className="invoice-toolbar no-print">
        <a className="button secondary" href="/orders">← Back to orders</a>
        <div className="invoice-toolbar-actions">
          <ShareInvoiceButton
            label={isQuote ? "Share quotation" : "Share invoice"}
            shareText={`${heading} ${number} · ${SHOP.name} · ${order.customer.name}`}
          />
          <PrintButton label={isQuote ? "Print / Save quotation as PDF" : "Print / Save as PDF"} />
        </div>
      </div>

      <article className="invoice-sheet">
        <header className="invoice-head">
          <div className="invoice-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="invoice-logo" src="/finesse-icon.png" alt="" />
            <div>
              <strong>{SHOP.name}</strong>
              <span className="muted-note">{SHOP.tagline}</span>
              {SHOP.branches.map((branch) => <span className="muted-note" key={branch}>{branch}</span>)}
              <span className="muted-note">Tel: {SHOP.phones.join(" / ")}</span>
              <span className="muted-note">Reg No. {SHOP.regNo}</span>
            </div>
          </div>
          <div className="invoice-meta">
            <h1>{heading}</h1>
            <div><span>{isQuote ? "Quote no." : "Invoice no."}</span><strong>{number}</strong></div>
            <div><span>Order</span><strong>{order.orderNumber}</strong></div>
            <div><span>Date</span><strong>{issued}</strong></div>
            {isQuote
              ? <div><span>Valid until</span><strong>{validUntil}</strong></div>
              : <div><span>Status</span><strong>{statusLabel(order.status)}</strong></div>}
          </div>
        </header>

        <section className="invoice-billto">
          <span className="eyebrow">{isQuote ? "Prepared for" : "Bill to"}</span>
          <strong>{order.customer.name}</strong>
          <span className="muted-note">{order.customer.mobile}</span>
          {order.customer.email ? <span className="muted-note">{order.customer.email}</span> : null}
        </section>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th className="num">Qty</th>
              <th className="num">Unit price</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const options = Object.values(item.selectedOptions ?? {}).filter(Boolean).join(", ");
              return (
                <tr key={item.id}>
                  <td>
                    <strong>{item.productName}</strong>
                    {options ? <span className="muted-note"> — {options}</span> : null}
                    {item.specialInstructions ? <div className="muted-note">{item.specialInstructions}</div> : null}
                  </td>
                  <td className="num">{item.quantity}</td>
                  <td className="num">{money(item.unitPrice)}</td>
                  <td className="num">{money(item.lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="invoice-totals">
          <div><span>Subtotal</span><strong>{money(order.subtotal)}</strong></div>
          {order.discountTotal > 0 ? <div><span>Discount</span><strong>-{money(order.discountTotal)}</strong></div> : null}
          <div className="grand"><span>Total</span><strong>{money(order.total)}</strong></div>
          <div><span>{isQuote ? "Deposit to confirm" : "Deposit required"}</span><strong>{money(order.requiredDeposit)}</strong></div>
          {isQuote ? null : <div><span>Paid</span><strong>{money(paid)}</strong></div>}
          {isQuote
            ? <div className="balance"><span>Total due on order</span><strong>{money(order.total)}</strong></div>
            : <div className="balance"><span>Balance due</span><strong>{money(order.balanceDue)}</strong></div>}
        </div>

        {!isQuote && order.payments.length > 0 ? (
          <section className="invoice-payments">
            <span className="eyebrow">Payments received</span>
            {order.payments.map((payment) => (
              <div className="ov-row" key={payment.id}>
                <span>{formatDate(payment.createdAt)} · {payment.method.replaceAll("_", " ")}</span>
                <span className="pill">{money(payment.amount)}</span>
              </div>
            ))}
          </section>
        ) : null}

        <footer className="invoice-foot">
          {isQuote ? (
            <p className="muted-note">This is a quotation, not a tax invoice. Prices are valid for {QUOTE_VALID_DAYS} days from the date above. A deposit confirms the order and starts production.</p>
          ) : (
            <p className="muted-note">Thank you for your business. Balances are payable on collection unless otherwise agreed.</p>
          )}
        </footer>
      </article>
    </main>
  );
}

export function DocumentNotFound({ orderId, kind }: { orderId: string; kind: "invoice" | "quotation" }) {
  return (
    <main className="page">
      <p className="muted-note">No {kind} found for order {orderId}.</p>
      <a className="button secondary" href="/orders">Back to orders</a>
    </main>
  );
}
