"use client";

import { useState } from "react";

// Turn a local SA mobile (0xx...) into wa.me's required international form (27xx...).
function toWhatsAppNumber(mobile?: string): string {
  if (!mobile) return "";
  const digits = mobile.replace(/[^\d]/g, "");
  if (digits.startsWith("27")) return digits;
  if (digits.startsWith("0")) return `27${digits.slice(1)}`;
  return digits;
}

export function ShareInvoiceButton({ label, shareText, customerMobile }: { label: string; shareText: string; customerMobile?: string | undefined }) {
  const [note, setNote] = useState("");

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const message = `${shareText}\n${url}`;

    // Prefer WhatsApp — it's how this shop reaches customers. Opens chat (to the customer if we have their number).
    const number = toWhatsAppNumber(customerMobile);
    const waUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    const opened = typeof window !== "undefined" ? window.open(waUrl, "_blank", "noopener") : null;
    if (opened) return;

    // Fallback to the native share sheet, then clipboard.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareText, text: shareText, url });
        return;
      } catch {
        // cancelled — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(message);
      setNote("Link copied");
      setTimeout(() => setNote(""), 2500);
    } catch {
      setNote(url);
    }
  }

  return (
    <span className="share-wrap no-print">
      <button className="secondary" onClick={() => void share()} type="button">{label}</button>
      {note ? <span className="share-note">{note}</span> : null}
    </span>
  );
}
