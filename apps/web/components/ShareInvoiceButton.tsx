"use client";

import { useState } from "react";

export function ShareInvoiceButton({ label, shareText }: { label: string; shareText: string }) {
  const [note, setNote] = useState("");

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const data = { title: shareText, text: shareText, url };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
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
