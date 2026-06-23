"use client";

import { useEffect, useState } from "react";
import { staffAuthHeaders } from "../lib/staff-session";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface SmsState {
  enabled: boolean;
  baseUrl: string;
  sender: string;
  hasApiKey: boolean;
}

export function SmsSettingsManager() {
  const [state, setState] = useState<SmsState>({ enabled: false, baseUrl: "", sender: "", hasApiKey: false });
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${apiUrl}/settings/sms`, { headers: staffAuthHeaders(["manager"], false) });
        if (response.ok) setState((await response.json() as { sms: SmsState }).sms);
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const body: Record<string, unknown> = { enabled: state.enabled, baseUrl: state.baseUrl, sender: state.sender };
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      const response = await fetch(`${apiUrl}/settings/sms`, {
        method: "PUT",
        headers: staffAuthHeaders(["manager"]),
        body: JSON.stringify(body)
      });
      if (response.ok) {
        setState((await response.json() as { sms: SmsState }).sms);
        setApiKey("");
        setMessage("SMS settings saved.");
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
      <h2>SMS (customer texts via Infobip)</h2>
      <p className="muted-note">
        Texts customers their queue ticket, payment receipts, and &ldquo;ready for collection&rdquo; updates. Get your API key and
        Base URL from the Infobip dashboard (API key → it looks like <em>xxxxx.api.infobip.com</em>). The key is hidden after saving.
      </p>
      {loading ? <p className="muted-note">Loading…</p> : (
        <>
          <div className="form-grid">
            <label>
              Base URL
              <input value={state.baseUrl} placeholder="xxxxx.api.infobip.com" onChange={(event) => setState((prev) => ({ ...prev, baseUrl: event.target.value }))} />
            </label>
            <label>
              Sender ID
              <input value={state.sender} placeholder="Finesse" onChange={(event) => setState((prev) => ({ ...prev, sender: event.target.value }))} />
            </label>
            <label>
              API key {state.hasApiKey ? <span className="muted-note">(saved — leave blank to keep)</span> : null}
              <input type="password" value={apiKey} placeholder={state.hasApiKey ? "••••••••••••" : "Infobip API key"} onChange={(event) => setApiKey(event.target.value)} />
            </label>
            <label className="row" style={{ alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={state.enabled} onChange={(event) => setState((prev) => ({ ...prev, enabled: event.target.checked }))} />
              Enable sending SMS to customers
            </label>
          </div>
          <div className="row">
            <button type="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save SMS settings"}</button>
          </div>
        </>
      )}
      {message ? <p className="muted-note">{message}</p> : null}
    </article>
  );
}
