"use client";

import type { CatalogProduct } from "@printflow/shared";
import { FormEvent, useEffect, useState } from "react";
import { staffAuthHeaders } from "../lib/staff-session";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const blankProduct: CatalogProduct = {
  id: "",
  category: "document",
  department: "document_printing",
  name: "",
  description: "",
  basePrice: 0,
  unitLabel: "item",
  requiresArtwork: true,
  proofRecommended: true,
  inventoryTags: [],
  enabled: true,
  options: {
    size: [
      { id: "small", label: "Small", priceDelta: 0 },
      { id: "medium", label: "Medium", priceDelta: 20 },
      { id: "large", label: "Large", priceDelta: 40 }
    ]
  }
};

export function CatalogManager({ initialProducts }: { initialProducts: CatalogProduct[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [editing, setEditing] = useState<CatalogProduct | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const response = await fetch(`${apiUrl}/catalog/products`);
    if (response.ok) {
      const payload = await response.json() as { products: CatalogProduct[] };
      setProducts(payload.products);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const payload: CatalogProduct = {
      ...editing,
      id: String(form.get("id") || editing.id),
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""),
      category: form.get("category") as CatalogProduct["category"],
      department: form.get("department") as CatalogProduct["department"],
      unitLabel: String(form.get("unitLabel") ?? "item"),
      basePrice: Number(form.get("basePrice") ?? 0),
      enabled: form.get("enabled") === "on",
      requiresArtwork: form.get("requiresArtwork") === "on",
      proofRecommended: form.get("proofRecommended") === "on",
      inventoryTags: String(form.get("inventoryTags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean)
    };
    const isNew = !products.some((product) => product.id === editing.id);
    const response = await fetch(`${apiUrl}/catalog/products${isNew ? "" : `/${editing.id}`}`, {
      method: isNew ? "POST" : "PATCH",
      headers: staffAuthHeaders(["owner"]),
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      setEditing(null);
      await refresh();
    }
  }

  async function toggle(product: CatalogProduct) {
    await fetch(`${apiUrl}/catalog/products/${product.id}`, {
      method: "PATCH",
      headers: staffAuthHeaders(["owner"]),
      body: JSON.stringify({ enabled: !(product.enabled ?? true) })
    });
    await refresh();
  }

  async function remove(product: CatalogProduct) {
    await fetch(`${apiUrl}/catalog/products/${product.id}`, { method: "DELETE", headers: staffAuthHeaders(["owner"], false) });
    await refresh();
  }

  return (
    <article className="card glossy section-teal">
      <div className="section-head">
        <div>
          <span className="status">service configuration</span>
          <h2>Service mix</h2>
        </div>
        <button className="secondary compact" type="button" onClick={() => setEditing({ ...blankProduct, id: `custom-${Date.now()}` })}>Add service</button>
      </div>
      <div className="compact-list">
        {products.map((product) => (
          <div className="rule-row" key={product.id}>
            <div>
              <strong>{product.name}</strong>
              <p>{product.category.replace("_", " ")} | R{product.basePrice.toFixed(2)} | {(product.enabled ?? true) ? "enabled" : "disabled"}</p>
            </div>
            <div className="row">
              <button className="secondary compact" type="button" onClick={() => setEditing(product)}>View/Edit</button>
              <button className="secondary compact" type="button" onClick={() => void toggle(product)}>{(product.enabled ?? true) ? "Disable" : "Enable"}</button>
              <button className="secondary compact" type="button" onClick={() => void remove(product)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {editing ? (
        <form className="edit-panel" onSubmit={(event) => void save(event)}>
          <h3>{products.some((product) => product.id === editing.id) ? "Edit service" : "Add service"}</h3>
          <div className="form-grid">
            <label>Service ID<input name="id" defaultValue={editing.id} readOnly={products.some((product) => product.id === editing.id)} /></label>
            <label>Name<input name="name" defaultValue={editing.name} /></label>
            <label>Category<select name="category" defaultValue={editing.category}>
              <option value="apparel">Apparel</option><option value="document">Document</option><option value="signage">Signage</option><option value="canvas_photo">Canvas & Photo</option><option value="promotional">Promotional</option><option value="quick_sale">Quick Sale</option>
            </select></label>
            <label>Department<select name="department" defaultValue={editing.department}>
              <option value="front_counter">Front Counter</option><option value="document_printing">Document Printing</option><option value="apparel_heat_press">Apparel Heat Press</option><option value="canvas_photo">Canvas Photo</option><option value="signage_banner">Signage Banner</option><option value="promotional_items">Promotional Items</option>
            </select></label>
            <label>Base price<input name="basePrice" type="number" min={0} step="0.01" defaultValue={editing.basePrice} /></label>
            <label>Unit label<input name="unitLabel" defaultValue={editing.unitLabel} /></label>
          </div>
          <label>Description<textarea name="description" defaultValue={editing.description} /></label>
          <label>Inventory tags<input name="inventoryTags" defaultValue={editing.inventoryTags.join(", ")} /></label>
          <div className="row">
            <label className="check-row"><input name="enabled" type="checkbox" defaultChecked={editing.enabled ?? true} /> Enabled</label>
            <label className="check-row"><input name="requiresArtwork" type="checkbox" defaultChecked={editing.requiresArtwork} /> Requires artwork</label>
            <label className="check-row"><input name="proofRecommended" type="checkbox" defaultChecked={editing.proofRecommended} /> Proof recommended</label>
          </div>
          <div className="row">
            <button type="submit">Save service</button>
            <button className="secondary" type="button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      ) : null}
    </article>
  );
}
