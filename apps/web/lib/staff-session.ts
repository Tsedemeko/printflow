"use client";

import type { AccessArea, StaffRole } from "@printflow/shared";

export const STAFF_SESSION_KEY = "printflow.staff.session";

export interface StaffSession {
  token?: string;
  id?: string;
  name: string;
  email?: string;
  role: StaffRole;
  roles: StaffRole[];
  accessAreas: AccessArea[];
  provider: "printflow" | "local-dev";
}

export function readStaffSession(): StaffSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STAFF_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StaffSession;
  } catch {
    window.localStorage.removeItem(STAFF_SESSION_KEY);
    return null;
  }
}

export function writeStaffSession(session: StaffSession) {
  window.localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(session));
}

export function clearStaffSession() {
  window.localStorage.removeItem(STAFF_SESSION_KEY);
}

export function staffAuthHeaders(fallbackRoles: StaffRole[], json = true): HeadersInit {
  const session = readStaffSession();
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  } else {
    headers["x-staff-roles"] = fallbackRoles.join(",");
    headers["x-staff-name"] = session?.name ?? "Local staff";
  }
  return headers;
}
