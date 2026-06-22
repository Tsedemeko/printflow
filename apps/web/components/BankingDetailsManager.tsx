"use client";

import { useState } from "react";
import { staffAuthHeaders } from "../lib/staff-session";
import type { BankingDetailsData } from "../lib/api-data";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const FIELDS: Array<{ key: keyof BankingDetailsData; label: string; placeholder: string }> = [
  { key: "bankName", label: "Bank", placeholder: "e.g. FNB" },
  { key: "accountName", label: "Account name", placeholder: "Finesse Fashion Design Enterprise" },
  { key: "accountNumber", label: "Account number", placeholder: "62XXXXXXXXX" },
  { key: "branchCode", label: "Branch code", placeholder: "250655" },
  { key: "accountType", label: "Account type", placeholder: "Cheque / Current" },
  { key: "paymentReference", label: "Payment instruction", placeholder: "Use your order number as the reference." }
];

export function BankingDetailsManager({ initialBanking }: { initialBanking: BankingDetailsData }) {
  const [form, setForm] = useState<BankingDetailsData>(initialBanking);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function update(key: keyof BankingDetailsData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`${apiUrl}/settings/banking`, {
        method: "PUT",
        headers: staffAuthHeaders(["manager"]),
        body: JSON.stringify(form)
      });
      setMessage(response.ok ? "Banking details saved — they now appear on invoices." : "Could not save (owner/manager access required).");
    } catch {
      setMessage("Could not reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="card glossy">
      <h2>Banking details (on invoices)</h2>
      <p className="muted-note">These appear on every invoice and quotation so customers can pay by EFT. Leave the account number blank to hide the banking block.</p>
      <div className="form-grid">
        {FIELDS.map((field) => (
          <label key={field.key}>
            {field.label}
            <input value={form[field.key]} placeholder={field.placeholder} onChange={(event) => update(field.key, event.target.value)} />
          </label>
        ))}
      </div>
      <div className="row">
        <button type="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save banking details"}</button>
      </div>
      {message ? <p className="muted-note">{message}</p> : null}
    </article>
  );
}
