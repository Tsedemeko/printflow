"use client";

import type { DiscountRule } from "@printflow/shared";
import { FormEvent, useEffect, useState } from "react";
import { staffAuthHeaders } from "../lib/staff-session";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const blankRule: DiscountRule = {
  id: "",
  label: "",
  priority: 50,
  discountPercent: 0,
  active: true
};

export function DiscountRulesManager({ initialRules }: { initialRules: DiscountRule[] }) {
  const [rules, setRules] = useState(initialRules);
  const [editing, setEditing] = useState<DiscountRule | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const response = await fetch(`${apiUrl}/catalog/discount-rules`);
    if (response.ok) {
      const data = await response.json() as { rules: DiscountRule[] };
      setRules(data.rules);
    }
  }

  async function toggle(rule: DiscountRule) {
    const response = await fetch(`${apiUrl}/catalog/discount-rules/${rule.id}`, {
      method: "PATCH",
      headers: staffAuthHeaders(["owner"]),
      body: JSON.stringify({ active: !rule.active })
    });
    const data = await response.json() as { rule: DiscountRule };
    setRules((current) => current.map((item) => item.id === rule.id ? data.rule : item));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      label: String(form.get("label") ?? ""),
      discountPercent: Number(form.get("discountPercent") ?? 0),
      minQuantity: Number(form.get("minQuantity") || 0) || null,
      minTotal: Number(form.get("minTotal") || 0) || null,
      active: form.get("active") === "on"
    };
    const isNew = !rules.some((rule) => rule.id === editing.id);
    const response = await fetch(`${apiUrl}/catalog/discount-rules${isNew ? "" : `/${editing.id}`}`, {
      method: isNew ? "POST" : "PATCH",
      headers: staffAuthHeaders(["owner"]),
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      setEditing(null);
      await refresh();
    }
  }

  async function remove(rule: DiscountRule) {
    await fetch(`${apiUrl}/catalog/discount-rules/${rule.id}`, { method: "DELETE", headers: staffAuthHeaders(["owner"], false) });
    await refresh();
  }

  return (
    <article className="card glossy">
      <div className="section-head">
        <div>
          <span className="status">pricing controls</span>
          <h2>Discount rules</h2>
        </div>
        <button className="secondary compact" type="button" onClick={() => setEditing({ ...blankRule, id: `discount-${Date.now()}` })}>Add rule</button>
      </div>
      <div className="rule-list">
        {rules.map((rule) => (
          <div className={`rule-row ${rule.active ? "rule-active" : ""}`} key={rule.id}>
            <div>
              <strong>{rule.label}</strong>
              <p>{rule.discountPercent}% off {rule.category ? `| ${rule.category.replace("_", " ")}` : ""}</p>
            </div>
            <div className="row">
              <button className="secondary compact" type="button" onClick={() => setEditing(rule)}>View/Edit</button>
              <button className="secondary compact" type="button" onClick={() => void toggle(rule)}>{rule.active ? "Disable" : "Enable"}</button>
              <button className="secondary compact" type="button" onClick={() => void remove(rule)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {editing ? (
        <form className="edit-panel" onSubmit={(event) => void save(event)}>
          <h3>{rules.some((rule) => rule.id === editing.id) ? "Edit rule" : "Add rule"}</h3>
          <label>Label<input name="label" defaultValue={editing.label} /></label>
          <label>Discount percent<input name="discountPercent" type="number" min={0} max={100} defaultValue={editing.discountPercent} /></label>
          <label>Minimum quantity<input name="minQuantity" type="number" min={0} defaultValue={editing.minQuantity ?? ""} /></label>
          <label>Minimum total<input name="minTotal" type="number" min={0} defaultValue={editing.minTotal ?? ""} /></label>
          <label className="check-row"><input name="active" type="checkbox" defaultChecked={editing.active} /> Active</label>
          <div className="row">
            <button type="submit">Save rule</button>
            <button className="secondary" type="button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      ) : null}
    </article>
  );
}
