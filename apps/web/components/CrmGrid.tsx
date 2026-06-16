"use client";

import type { Customer } from "@printflow/shared";
import { FormEvent, useEffect, useState } from "react";
import { staffAuthHeaders } from "../lib/staff-session";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const blankCustomer: Customer = {
  id: "",
  name: "",
  mobile: "",
  email: "",
  createdAt: ""
};

export function CrmGrid({ initialCustomers }: { initialCustomers: Customer[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const response = await fetch(`${apiUrl}/customers`);
    if (response.ok) {
      const payload = await response.json() as { customers: Customer[] };
      setCustomers(payload.customers);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      mobile: String(form.get("mobile") ?? ""),
      email: String(form.get("email") || "") || undefined
    };
    const isNew = !customers.some((customer) => customer.id === editing.id);
    const response = await fetch(`${apiUrl}/customers${isNew ? "" : `/${editing.id}`}`, {
      method: isNew ? "POST" : "PATCH",
      headers: staffAuthHeaders(["sales_assistant"]),
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      setMessage(isNew ? "Customer added." : "Customer updated.");
      setEditing(null);
      await refresh();
    } else {
      const error = await response.json() as { error?: string };
      setMessage(error.error ?? "Could not save customer.");
    }
  }

  async function remove(customer: Customer) {
    const response = await fetch(`${apiUrl}/customers/${customer.id}`, { method: "DELETE", headers: staffAuthHeaders(["sales_assistant"], false) });
    if (response.ok) {
      setMessage("Customer deleted.");
      await refresh();
    } else {
      const error = await response.json() as { error?: string };
      setMessage(error.error ?? "Could not delete customer.");
    }
  }

  return (
    <>
      <div className="section-head">
        <button type="button" onClick={() => setEditing({ ...blankCustomer, id: `customer-${Date.now()}` })}>Add customer</button>
        {message ? <span className="status">{message}</span> : null}
      </div>
      <section className="cards compact-cards">
        {customers.map((customer) => (
          <article className="card glossy compact-card" key={customer.id}>
            <h2>{customer.name}</h2>
            <p>{customer.mobile}</p>
            {customer.email ? <p>{customer.email}</p> : null}
            <div className="row">
              <button className="secondary compact" type="button" onClick={() => setEditing(customer)}>View/Edit</button>
              <button className="secondary compact" type="button" onClick={() => void remove(customer)}>Delete</button>
            </div>
          </article>
        ))}
      </section>
      {editing ? (
        <form className="edit-panel" onSubmit={(event) => void save(event)}>
          <h3>{customers.some((customer) => customer.id === editing.id) ? "Edit customer" : "Add customer"}</h3>
          <div className="form-grid">
            <label>Name<input name="name" defaultValue={editing.name} /></label>
            <label>Mobile<input name="mobile" defaultValue={editing.mobile} /></label>
            <label>Email<input name="email" type="email" defaultValue={editing.email ?? ""} /></label>
          </div>
          <div className="row">
            <button type="submit">Save customer</button>
            <button className="secondary" type="button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      ) : null}
    </>
  );
}
