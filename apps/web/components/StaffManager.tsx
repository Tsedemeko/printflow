"use client";

import { ACCESS_AREAS, STAFF_ROLES, defaultAccessForRoles, roleAccess } from "@printflow/shared";
import type { AccessArea, StaffMember, StaffRole } from "@printflow/shared";
import { FormEvent, useEffect, useState } from "react";
import { staffAuthHeaders } from "../lib/staff-session";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const blankStaff: StaffMember = {
  id: "",
  name: "",
  email: "",
  mobile: "",
  role: "sales_assistant",
  roles: ["sales_assistant"],
  active: true,
  accessAreas: defaultAccessForRoles(["sales_assistant"]),
  createdAt: ""
};

export function StaffManager() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [editing, setEditing] = useState<StaffMember | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const response = await fetch(`${apiUrl}/admin/staff`, { headers: staffAuthHeaders(["owner"], false) });
    if (response.ok) {
      const payload = await response.json() as { staff: StaffMember[] };
      setStaff(payload.staff);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const roles = STAFF_ROLES.filter((role) => form.get(`role-${role}`) === "on");
    const normalizedRoles = roles.length ? roles : [editing.role];
    const accessAreas = ACCESS_AREAS.filter((area) => form.get(`access-${area}`) === "on");
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      mobile: String(form.get("mobile") ?? ""),
      role: normalizedRoles[0],
      roles: normalizedRoles,
      active: form.get("active") === "on",
      accessAreas,
      temporaryPassword: String(form.get("temporaryPassword") ?? "") || undefined
    };
    const isNew = !staff.some((member) => member.id === editing.id);
    const response = await fetch(`${apiUrl}/admin/staff${isNew ? "" : `/${editing.id}`}`, {
      method: isNew ? "POST" : "PATCH",
      headers: staffAuthHeaders(["owner"]),
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      setEditing(null);
      await refresh();
    }
  }

  async function remove(member: StaffMember) {
    await fetch(`${apiUrl}/admin/staff/${member.id}`, { method: "DELETE", headers: staffAuthHeaders(["owner"], false) });
    await refresh();
  }

  function startAdd(role: StaffRole = "sales_assistant") {
    setEditing({ ...blankStaff, id: `staff-${Date.now()}`, role, roles: [role], accessAreas: defaultAccessForRoles([role]) });
  }

  function toggleRole(role: StaffRole) {
    if (!editing) return;
    const hasRole = editing.roles.includes(role);
    const roles = hasRole ? editing.roles.filter((item) => item !== role) : [...editing.roles, role];
    const normalizedRoles = roles.length ? roles : [role];
    setEditing({ ...editing, role: normalizedRoles[0]!, roles: normalizedRoles, accessAreas: defaultAccessForRoles(normalizedRoles) });
  }

  return (
    <>
      <section className="admin-grid">
        <article className="card glossy section-blue">
          <div className="section-head">
            <div>
              <span className="status">people controls</span>
              <h2>Staff</h2>
            </div>
            <button type="button" onClick={() => startAdd()}>Add staff</button>
          </div>
          <div className="compact-list">
            {staff.map((member) => (
              <div className="rule-row" key={member.id}>
                <div>
                  <strong>{member.name}</strong>
                  <p>{member.email} | {(member.roles?.length ? member.roles : [member.role]).map((role) => role.replaceAll("_", " ")).join(", ")} | {member.active ? "active" : "disabled"}</p>
                  <div className="catalog-subitems">
                    {member.accessAreas.map((area) => <span className="badge" key={area}>{area.replaceAll("_", " ")}</span>)}
                  </div>
                </div>
                <div className="row">
                  <button className="secondary compact" type="button" onClick={() => setEditing(member)}>View/Edit</button>
                  <button className="secondary compact" type="button" onClick={() => void remove(member)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card glossy section-teal">
          <span className="status">role access</span>
          <h2>What each role can access</h2>
          <div className="compact-list">
            {STAFF_ROLES.map((role) => (
              <div className="rule-row" key={role}>
                <div>
                  <strong>{role.replaceAll("_", " ")}</strong>
                  <div className="catalog-subitems">
                    {roleAccess[role].map((area) => <span className="badge" key={area}>{area.replaceAll("_", " ")}</span>)}
                  </div>
                </div>
                <button className="secondary compact" type="button" onClick={() => startAdd(role)}>Add</button>
              </div>
            ))}
          </div>
        </article>
      </section>

      {editing ? (
        <form className="edit-panel" onSubmit={(event) => void save(event)}>
          <h3>{staff.some((member) => member.id === editing.id) ? "Edit staff member" : "Add staff member"}</h3>
          <div className="form-grid">
            <label>Name<input name="name" defaultValue={editing.name} /></label>
            <label>Email<input name="email" type="email" defaultValue={editing.email} /></label>
            <label>Mobile<input name="mobile" defaultValue={editing.mobile ?? ""} /></label>
            {!staff.some((member) => member.id === editing.id) ? <label>Temporary password<input name="temporaryPassword" type="password" minLength={8} /></label> : null}
          </div>
          <label className="check-row"><input name="active" type="checkbox" defaultChecked={editing.active} /> Active</label>
          <h3>Roles</h3>
          <div className="access-grid" key={`roles-${editing.id}-${editing.roles.join("-")}`}>
            {STAFF_ROLES.map((role) => (
              <label className="check-row" key={role}>
                <input name={`role-${role}`} type="checkbox" defaultChecked={editing.roles.includes(role)} onChange={() => toggleRole(role)} />
                {role.replaceAll("_", " ")}
              </label>
            ))}
          </div>
          <h3>Access</h3>
          <div className="access-grid" key={`access-${editing.id}-${editing.accessAreas.join("-")}`}>
            {ACCESS_AREAS.map((area) => (
              <label className="check-row" key={area}>
                <input name={`access-${area}`} type="checkbox" defaultChecked={editing.accessAreas.includes(area as AccessArea)} />
                {area.replaceAll("_", " ")}
              </label>
            ))}
          </div>
          <div className="row">
            <button type="submit">Save staff</button>
            <button className="secondary" type="button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      ) : null}
    </>
  );
}
