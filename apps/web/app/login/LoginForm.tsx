"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useLocalSession } from "../../components/AuthGate";
import type { StaffSession } from "../../lib/staff-session";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function LoginForm() {
  const router = useRouter();
  const { login, setAuthenticatedSession } = useLocalSession();
  const [name, setName] = useState("Seth Maphosa");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("owner");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!email || !password) {
      login(name, role);
      router.push("/admin");
      return;
    }
    try {
      const authResponse = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!authResponse.ok) throw new Error("Invalid email or password.");
      const authPayload = await authResponse.json() as { token: string; user: StaffSession };
      const sessionResponse = await fetch(`${apiUrl}/auth/session`, {
        headers: { Authorization: `Bearer ${authPayload.token}` }
      });
      if (!sessionResponse.ok) throw new Error("Your account does not have an active Finesse staff profile.");
      const sessionPayload = await sessionResponse.json() as { user: StaffSession };
      setAuthenticatedSession({ ...sessionPayload.user, token: authPayload.token, provider: "printflow" });
      router.push("/admin");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Could not sign in.");
    }
  }

  return (
    <form className="login-panel" onSubmit={submit}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="brand-logo login-logo" src="/finesse-logo.png" alt="Finesse Fashion Design" />
      <span className="eyebrow">Staff access</span>
      <h1>Sign in to Finesse</h1>
      <p>Use a Finesse staff account stored in the business database. For local development only, leave email/password empty and choose a role.</p>
      <label>
        Email
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
      </label>
      <label>
        Password
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
      </label>
      <label>
        Local dev role
        <select value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="owner">Owner</option>
          <option value="manager">Manager</option>
          <option value="sales_assistant">Sales Assistant</option>
          <option value="cashier">Cashier</option>
          <option value="designer">Designer</option>
          <option value="document_operator">Production Operator</option>
        </select>
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button type="submit">Enter admin portal</button>
      <div className="row">
        <a className="button secondary" href="/order">Public online order</a>
        <a className="button secondary" href="/kiosk">Public kiosk</a>
      </div>
    </form>
  );
}
