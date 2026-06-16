"use client";

import type { DepositRule } from "@printflow/shared";
import { FormEvent, useEffect, useState } from "react";
import { staffAuthHeaders } from "../lib/staff-session";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const blankRule: DepositRule = {
  id: "",
  label: "",
  priority: 50,
  depositPercent: 50,
  nonRefundable: false
};

export function DepositRulesManager({ initialRules }: { initialRules: DepositRule[] }) {
  const [rules, setRules] = useState(initialRules);
  const [editing, setEditing] = useState<DepositRule | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const response = await fetch(`${apiUrl}/catalog/deposit-rules`);
    if (response.ok) {
      const payload = await response.json() as { rules: DepositRule[] };
      setRules(payload.rules);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      label: String(form.get("label") ?? ""),
      priority: Number(form.get("priority") ?? 50),
      category: String(form.get("category") || "") || null,
      minTotal: Number(form.get("minTotal") || 0) || null,
      maxTotal: Number(form.get("maxTotal") || 0) || null,
      depositPercent: Number(form.get("depositPercent") ?? 0),
      nonRefundable: form.get("nonRefundable") === "on"
    };
    const isNew = !rules.some((rule) => rule.id === editing.id);
    const response = await fetch(`${apiUrl}/catalog/deposit-rules${isNew ? "" : `/${editing.id}`}`, {
      method: isNew ? "POST" : "PATCH",
      headers: staffAuthHeaders(["owner"]),
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      setEditing(null);
      await refresh();
    }
  }

  async function remove(rule: DepositRule) {
    await fetch(`${apiUrl}/catalog/deposit-rules/${rule.id}`, { method: "DELETE", headers: staffAuthHeaders(["owner"], false) });
    await refresh();
  }

  return (
    <article className="card glossy section-blue">
      <div className="section-head">
        <div>
          <span className="status">deposit controls</span>
          <h2>Deposit rules</h2>
        </div>
        <button className="secondary compact" type="button" onClick={() => setEditing({ ...blankRule, id: `deposit-${Date.now()}` })}>Add rule</button>
      </div>
      <div className="compact-list">
        {rules.map((rule) => (
          <div className="rule-row" key={rule.id}>
            <div>
              <strong>{rule.depositPercent}% - {rule.label}</strong>
              <p>{rule.category?.replace("_", " ") ?? "all services"} | priority {rule.priority}</p>
            </div>
            <div className="row">
              <button className="secondary compact" type="button" onClick={() => setEditing(rule)}>View/Edit</button>
              <button className="secondary compact" type="button" onClick={() => void remove(rule)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {editing ? (
        <form className="edit-panel" onSubmit={(event) => void save(event)}>
          <h3>{rules.some((rule) => rule.id === editing.id) ? "Edit deposit rule" : "Add deposit rule"}</h3>
          <div className="form-grid">
            <label>Label<input name="label" defaultValue={editing.label} /></label>
            <label>Deposit %<input name="depositPercent" type="number" min={0} max={100} defaultValue={editing.depositPercent} /></label>
            <label>Priority<input name="priority" type="number" defaultValue={editing.priority} /></label>
            <label>Category<select name="category" defaultValue={editing.category ?? ""}>
              <option value="">All services</option><option value="apparel">Apparel</option><option value="document">Document</option><option value="signage">Signage</option><option value="canvas_photo">Canvas & Photo</option><option value="promotional">Promotional</option>
            </select></label>
            <label>Minimum total<input name="minTotal" type="number" min={0} defaultValue={editing.minTotal ?? ""} /></label>
            <label>Maximum total<input name="maxTotal" type="number" min={0} defaultValue={editing.maxTotal ?? ""} /></label>
          </div>
          <label className="check-row"><input name="nonRefundable" type="checkbox" defaultChecked={editing.nonRefundable} /> Non-refundable</label>
          <div className="row">
            <button type="submit">Save rule</button>
            <button className="secondary" type="button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      ) : null}
    </article>
  );
}
