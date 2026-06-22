"use client";

import { useEffect, useState } from "react";
import { staffAuthHeaders } from "../lib/staff-session";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface EmailState {
  enabled: boolean;
  fromName: string;
  user: string;
  hasPassword: boolean;
}

export function EmailSettingsManager() {
  const [state, setState] = useState<EmailState>({ enabled: false, fromName: "", user: "", hasPassword: false });
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${apiUrl}/settings/email`, { headers: staffAuthHeaders(["manager"], false) });
        if (response.ok) {
          const data = await response.json() as { email: EmailState };
          setState(data.email);
        }
      } catch {
        // leave defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const body: Record<string, unknown> = {
        enabled: state.enabled,
        fromName: state.fromName,
        user: state.user
      };
      if (password.trim()) body.password = password.trim();
      const response = await fetch(`${apiUrl}/settings/email`, {
        method: "PUT",
        headers: staffAuthHeaders(["manager"]),
        body: JSON.stringify(body)
      });
      if (response.ok) {
        const data = await response.json() as { email: EmailState };
        setState(data.email);
        setPassword("");
        setMessage("Email settings saved.");
      } else {
        setMessage("Could not save (owner/manager access required).");
      }
    } catch {
      setMessage("Could not reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="card glossy">
      <h2>Email (send invoices from your Gmail)</h2>
      <p className="muted-note">
        Invoices are sent from your own Gmail account — enter your Gmail address and password below. We never show the password again after saving.
      </p>
      <p className="muted-note">
        Note: if your Google account has 2-Step Verification on, Google blocks the normal password for apps — you&rsquo;ll need an App Password
        (Google Account → Security → App passwords) instead. Otherwise your normal Gmail password works.
      </p>
      {loading ? <p className="muted-note">Loading…</p> : (
        <>
          <div className="form-grid">
            <label>
              From name
              <input value={state.fromName} placeholder="Finesse Fashion Design Enterprise" onChange={(event) => setState((prev) => ({ ...prev, fromName: event.target.value }))} />
            </label>
            <label>
              Gmail address
              <input value={state.user} placeholder="finesse@gmail.com" onChange={(event) => setState((prev) => ({ ...prev, user: event.target.value }))} />
            </label>
            <label>
              Gmail password {state.hasPassword ? <span className="muted-note">(saved — leave blank to keep)</span> : null}
              <input type="password" value={password} placeholder={state.hasPassword ? "••••••••••••" : "Your Gmail password"} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <label className="row" style={{ alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={state.enabled} onChange={(event) => setState((prev) => ({ ...prev, enabled: event.target.checked }))} />
              Enable sending invoices by email
            </label>
          </div>
          <div className="row">
            <button type="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save email settings"}</button>
          </div>
        </>
      )}
      {message ? <p className="muted-note">{message}</p> : null}
    </article>
  );
}
