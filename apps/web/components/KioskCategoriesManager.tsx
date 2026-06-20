"use client";

import { useState } from "react";
import { staffAuthHeaders } from "../lib/staff-session";
import type { KioskCategoryItem } from "../lib/api-data";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Product categories that actually have products, so admins know which ids show items.
const KNOWN_IDS = ["apparel", "signage", "promotional", "document", "canvas_photo"];

export function KioskCategoriesManager({ initialCategories }: { initialCategories: KioskCategoryItem[] }) {
  const [rows, setRows] = useState<KioskCategoryItem[]>(initialCategories);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function update(index: number, field: keyof KioskCategoryItem, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }
  function remove(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }
  function add() {
    setRows((prev) => [...prev, { id: "", label: "", description: "" }]);
  }
  function move(index: number, dir: -1 | 1) {
    setRows((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  async function save() {
    const categories = rows
      .map((row) => ({ id: row.id.trim(), label: row.label.trim(), description: row.description.trim() }))
      .filter((row) => row.id && row.label);
    setSaving(true);
    const response = await fetch(`${apiUrl}/kiosk/categories`, {
      method: "PUT",
      headers: staffAuthHeaders(["manager"]),
      body: JSON.stringify({ categories })
    });
    setSaving(false);
    setMessage(response.ok ? "Kiosk categories saved." : "Could not save (owner/manager access required).");
  }

  return (
    <article className="card glossy">
      <h2>Kiosk main-screen categories</h2>
      <p className="muted-note">These are the tiles customers see first on the kiosk. The <strong>id</strong> must match a product category so its products show — known ids: {KNOWN_IDS.join(", ")}.</p>

      {rows.map((row, index) => (
        <div className="kioskcat-row" key={index}>
          <select value={row.id} onChange={(event) => update(index, "id", event.target.value)}>
            <option value="" disabled>Select category…</option>
            {KNOWN_IDS.map((id) => <option key={id} value={id}>{id.replaceAll("_", " ")}</option>)}
            {row.id && !KNOWN_IDS.includes(row.id) ? <option value={row.id}>{row.id}</option> : null}
          </select>
          <input value={row.label} onChange={(event) => update(index, "label", event.target.value)} placeholder="Label" />
          <input value={row.description} onChange={(event) => update(index, "description", event.target.value)} placeholder="Description" />
          <div className="row">
            <button className="secondary compact" type="button" onClick={() => move(index, -1)}>↑</button>
            <button className="secondary compact" type="button" onClick={() => move(index, 1)}>↓</button>
            <button className="secondary compact" type="button" onClick={() => remove(index)}>Remove</button>
          </div>
        </div>
      ))}

      <div className="row">
        <button className="secondary" type="button" onClick={add}>+ Add category</button>
        <button type="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save categories"}</button>
      </div>
      {message ? <p className="muted-note">{message}</p> : null}
    </article>
  );
}
