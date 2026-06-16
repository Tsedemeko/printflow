"use client";

import { useEffect, useState } from "react";
import type { StaffRole } from "@printflow/shared";
import { clearStaffSession, readStaffSession, writeStaffSession, type StaffSession } from "../lib/staff-session";

export function useLocalSession() {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(readStaffSession());
    setReady(true);
  }, []);

  function login(name: string, role: string) {
    const roles = [role as StaffRole];
    const next: StaffSession = { name, role: roles[0]!, roles, accessAreas: [], provider: "local-dev" };
    writeStaffSession(next);
    setSession(next);
  }

  function setAuthenticatedSession(next: StaffSession) {
    writeStaffSession(next);
    setSession(next);
  }

  function logout() {
    clearStaffSession();
    setSession(null);
  }

  return { ready, session, login, logout, setAuthenticatedSession };
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, session } = useLocalSession();

  if (!ready) {
    return <main className="portal-loading">Loading Finesse...</main>;
  }

  if (!session) {
    return (
      <main className="login-shell">
        <div className="login-panel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo login-logo" src="/finesse-logo.png" alt="Finesse Fashion Design" />
          <span className="eyebrow">Staff access required</span>
          <h1>Sign in to Finesse</h1>
          <p>Admin, production, POS, CRM, reports, and inventory are protected staff areas.</p>
          <a className="button" href="/login">Go to login</a>
          <a className="button secondary" href="/order">Public order page</a>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
