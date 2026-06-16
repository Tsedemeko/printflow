"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { staffAuthHeaders } from "../lib/staff-session";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  tags: string[];
  quantityOnHand: number;
  reorderPoint: number;
}

interface StockMovement {
  id: string;
  itemId: string;
  sku: string;
  itemName: string;
  type: "opening" | "receive" | "issue" | "consume" | "recount";
  delta: number;
  quantityAfter: number;
  note?: string;
  orderId?: string;
  actorName: string;
  createdAt: string;
}

const MOVEMENT_LABEL: Record<StockMovement["type"], string> = {
  opening: "Opening",
  receive: "Stock in",
  issue: "Stock out",
  consume: "Used on order",
  recount: "Recount"
};

const blankItem: InventoryItem = { id: "", sku: "", name: "", tags: [], quantityOnHand: 0, reorderPoint: 0 };

export function InventoryManager({ initialItems }: { initialItems: InventoryItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [search, setSearch] = useState("");
  const [qty, setQty] = useState<Record<string, string>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [historyItem, setHistoryItem] = useState<string | null>(null);
  const filtered = useMemo(() => items.filter((item) => `${item.sku} ${item.name}`.toLowerCase().includes(search.toLowerCase())), [items, search]);

  useEffect(() => {
    void refresh();
    void refreshMovements();
  }, []);

  async function refresh() {
    const response = await fetch(`${apiUrl}/inventory`);
    if (response.ok) setItems(((await response.json()) as { items: InventoryItem[] }).items);
  }

  async function refreshMovements() {
    const response = await fetch(`${apiUrl}/inventory/movements`, { headers: staffAuthHeaders(["manager"], false) });
    if (response.ok) setMovements(((await response.json()) as { movements: StockMovement[] }).movements);
  }

  async function move(item: InventoryItem, kind: "receive" | "issue" | "recount") {
    const quantity = Number(qty[item.id]);
    if (!Number.isFinite(quantity) || (kind !== "recount" && quantity <= 0) || quantity < 0) return;
    setBusy(item.id);
    const response = await fetch(`${apiUrl}/inventory/${item.id}/${kind}`, {
      method: "POST",
      headers: staffAuthHeaders(["manager"]),
      body: JSON.stringify({ quantity, note: note[item.id] || undefined })
    });
    if (response.ok) {
      setQty((prev) => ({ ...prev, [item.id]: "" }));
      setNote((prev) => ({ ...prev, [item.id]: "" }));
      await Promise.all([refresh(), refreshMovements()]);
    }
    setBusy(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      sku: String(form.get("sku") ?? ""),
      name: String(form.get("name") ?? ""),
      quantityOnHand: Number(form.get("quantityOnHand") ?? 0),
      reorderPoint: Number(form.get("reorderPoint") ?? 0),
      tags: String(form.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean)
    };
    const isNew = !items.some((item) => item.id === editing.id);
    const response = await fetch(`${apiUrl}/inventory${isNew ? "" : `/${editing.id}`}`, {
      method: isNew ? "POST" : "PATCH",
      headers: staffAuthHeaders(["manager"]),
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      setEditing(null);
      await Promise.all([refresh(), refreshMovements()]);
    }
  }

  async function remove(item: InventoryItem) {
    await fetch(`${apiUrl}/inventory/${item.id}`, { method: "DELETE", headers: staffAuthHeaders(["manager"], false) });
    await refresh();
  }

  const shownMovements = historyItem ? movements.filter((movement) => movement.itemId === historyItem) : movements;

  return (
    <>
      <div className="section-head">
        <label className="wide-search">Search inventory<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="SKU or item name" /></label>
        <button type="button" onClick={() => setEditing({ ...blankItem, id: `inventory-${Date.now()}` })}>Add inventory</button>
      </div>

      <section className="cards compact-cards">
        {filtered.map((item) => {
          const low = item.quantityOnHand <= item.reorderPoint;
          return (
            <article className={`card glossy compact-card${low ? " inv-low" : ""}`} key={item.id}>
              <span className="status">{item.sku}</span>
              <h2>{item.name}</h2>
              <p>On hand: <strong>{item.quantityOnHand}</strong>{low ? <span className="pill" style={{ marginLeft: 8 }}>Low</span> : null}</p>
              <p>Reorder at: {item.reorderPoint}</p>

              <div className="stock-move">
                <input
                  type="number"
                  min={0}
                  placeholder="Qty"
                  value={qty[item.id] ?? ""}
                  onChange={(event) => setQty((prev) => ({ ...prev, [item.id]: event.target.value }))}
                />
                <input
                  placeholder="Note (optional)"
                  value={note[item.id] ?? ""}
                  onChange={(event) => setNote((prev) => ({ ...prev, [item.id]: event.target.value }))}
                />
                <div className="row">
                  <button className="compact" disabled={busy === item.id} type="button" onClick={() => void move(item, "receive")}>Stock in</button>
                  <button className="secondary compact" disabled={busy === item.id} type="button" onClick={() => void move(item, "issue")}>Stock out</button>
                  <button className="secondary compact" disabled={busy === item.id} type="button" onClick={() => void move(item, "recount")}>Set count</button>
                </div>
              </div>

              <div className="row">
                <button className="secondary compact" type="button" onClick={() => setHistoryItem(historyItem === item.id ? null : item.id)}>
                  {historyItem === item.id ? "Show all history" : "This item's history"}
                </button>
                <button className="secondary compact" type="button" onClick={() => setEditing(item)}>Edit</button>
                <button className="secondary compact" type="button" onClick={() => void remove(item)}>Delete</button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="card glossy" style={{ marginTop: 18 }}>
        <h2>Stock movements {historyItem ? `· ${items.find((item) => item.id === historyItem)?.name ?? ""}` : "(all items)"}</h2>
        <p className="muted-note">Every stock-in, stock-out, recount, and order consumption is logged here.</p>
        {shownMovements.length === 0 ? <p className="muted-note">No movements recorded yet.</p> : null}
        {shownMovements.map((movement) => (
          <div className="ov-row" key={movement.id}>
            <span style={{ minWidth: 150 }}>{new Date(movement.createdAt).toLocaleString("en-ZA")}</span>
            <span style={{ flex: 1 }}>{movement.itemName} · {MOVEMENT_LABEL[movement.type]}{movement.note ? ` — ${movement.note}` : ""}</span>
            <span className={movement.delta >= 0 ? "stock-in" : "stock-out"}>{movement.delta >= 0 ? "+" : ""}{movement.delta}</span>
            <span className="pill">= {movement.quantityAfter}</span>
            <span className="muted-note" style={{ minWidth: 90 }}>{movement.actorName}</span>
          </div>
        ))}
      </section>

      {editing ? (
        <form className="edit-panel" onSubmit={(event) => void save(event)}>
          <h3>{items.some((item) => item.id === editing.id) ? "Edit inventory" : "Add inventory"}</h3>
          <div className="form-grid">
            <label>SKU<input name="sku" defaultValue={editing.sku} /></label>
            <label>Name<input name="name" defaultValue={editing.name} /></label>
            <label>Quantity<input name="quantityOnHand" type="number" min={0} defaultValue={editing.quantityOnHand} /></label>
            <label>Reorder point<input name="reorderPoint" type="number" min={0} defaultValue={editing.reorderPoint} /></label>
          </div>
          <label>Tags<input name="tags" defaultValue={editing.tags.join(", ")} /></label>
          <div className="row">
            <button type="submit">Save inventory</button>
            <button className="secondary" type="button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      ) : null}
    </>
  );
}
