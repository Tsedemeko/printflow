"use client";

import { useState } from "react";
import { staffAuthHeaders } from "../lib/staff-session";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function EmailInvoiceButton({
  orderId,
  kind,
  customerEmail,
  label
}: {
  orderId: string;
  kind: "invoice" | "quotation";
  customerEmail?: string | undefined;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function send() {
    setNote("");
    const to = customerEmail || window.prompt("Send to which email address?") || "";
    if (!to) return;
    setBusy(true);
    try {
      const response = await fetch(`${apiUrl}/orders/${orderId}/send-invoice`, {
        method: "POST",
        headers: staffAuthHeaders(["cashier"]),
        body: JSON.stringify({ kind, to })
      });
      const data = await response.json().catch(() => ({})) as { to?: string; error?: string };
      if (response.ok) {
        setNote(`Sent to ${data.to ?? to}`);
      } else if (response.status === 409) {
        setNote(data.error ?? "Email is not set up. Configure it under Settings → Email.");
      } else if (response.status === 401) {
        setNote("Please sign in to send email.");
      } else {
        setNote(data.error ?? "Could not send. Please try again.");
      }
    } catch {
      setNote("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
      setTimeout(() => setNote(""), 5000);
    }
  }

  return (
    <span className="share-wrap no-print">
      <button className="secondary" type="button" disabled={busy} onClick={() => void send()}>
        {busy ? "Sending…" : label}
      </button>
      {note ? <span className="share-note">{note}</span> : null}
    </span>
  );
}
