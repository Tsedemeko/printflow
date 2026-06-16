import type { AccessArea, StaffRole } from "./types.js";

export const roleAccess: Record<StaffRole, AccessArea[]> = {
  owner: ["dashboard", "catalog_pricing", "production", "pos", "crm", "inventory", "reports", "staff_management", "kiosk", "online_orders"],
  manager: ["dashboard", "catalog_pricing", "production", "pos", "crm", "inventory", "reports", "kiosk", "online_orders"],
  sales_assistant: ["dashboard", "pos", "crm", "kiosk", "online_orders"],
  cashier: ["pos", "crm"],
  designer: ["production", "crm", "online_orders"],
  document_operator: ["production", "inventory"],
  canvas_operator: ["production", "inventory"],
  apparel_operator: ["production", "inventory"],
  signage_operator: ["production", "inventory"]
};

export function defaultAccessForRole(role: StaffRole): AccessArea[] {
  return roleAccess[role] ?? [];
}

export function defaultAccessForRoles(roles: StaffRole[]): AccessArea[] {
  return [...new Set(roles.flatMap((role) => defaultAccessForRole(role)))];
}

export function canAccess(role: StaffRole, area: AccessArea): boolean {
  return defaultAccessForRole(role).includes(area);
}

export function canAnyRoleAccess(roles: StaffRole[], area: AccessArea): boolean {
  return defaultAccessForRoles(roles).includes(area);
}
